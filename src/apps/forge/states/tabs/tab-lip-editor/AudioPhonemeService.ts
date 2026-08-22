import { WorkerPool } from "lip-sync-engine";
import {
  TimedPhoneme,
  TimedPhonemeResult,
  applyExtendedShapesFilter,
  filterTimedPhonemesByDuration,
} from "@/apps/forge/states/tabs/tab-lip-editor/PhonemeToLIPShape";

export interface RhubarbPhonemeConfig {
  dialogText?: string;
  /** Enabled extended shapes, e.g. "GHX". */
  extendedShapes?: string;
  includeRestKeys?: boolean;
  /** Minimum cue length in seconds before mapping. */
  minCueDurationSec?: number;
  /** WorkerPool size (1+). */
  workerCount?: number;
}

export interface AudioPhonemeExtractOptions extends RhubarbPhonemeConfig {
  onProgress?: (progress: PhonemeGenerationProgress) => void;
}

export interface PhonemeGenerationProgress {
  /** 0–100 */
  percent: number;
  phase: "load" | "convert" | "analyze" | "apply" | "done";
  message: string;
}

export interface AudioPhonemeService {
  extractTimedPhonemes(audio: AudioBuffer, options?: AudioPhonemeExtractOptions): Promise<TimedPhonemeResult>;
}

const RHUBARB_SAMPLE_RATE = 16000;
const RHUBARB_ENGINE_ID = "rhubarb-wasm";

function resolveRhubarbAssetPaths(): {
  wasmPath: string;
  dataPath: string;
  jsPath: string;
  workerScriptUrl: string;
} {
  const base = new URL("wasm/", typeof window !== "undefined" ? window.location.href : "http://localhost/forge/");
  return {
    wasmPath: new URL("lip-sync-engine.wasm", base).href,
    dataPath: new URL("lip-sync-engine.data", base).href,
    jsPath: new URL("lip-sync-engine.js", base).href,
    workerScriptUrl: new URL("worker.js", base).href,
  };
}

function report(
  onProgress: AudioPhonemeExtractOptions["onProgress"] | undefined,
  percent: number,
  phase: PhonemeGenerationProgress["phase"],
  message: string,
): void {
  onProgress?.({
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    phase,
    message,
  });
}

/** Linear resample Float32 mono → target rate. */
export function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || input.length === 0) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = src - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

export function float32ToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return out;
}

/** Mixdown + linear resample to mono Int16 PCM @ 16 kHz. */
export function audioBufferToPcm16Linear(audio: AudioBuffer, targetSampleRate: number = RHUBARB_SAMPLE_RATE): Int16Array {
  const channels = Math.max(1, audio.numberOfChannels);
  const length = audio.length;
  const mixed = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = audio.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mixed[i] += data[i] / channels;
    }
  }
  const resampled = resampleLinear(mixed, audio.sampleRate, targetSampleRate);
  return float32ToInt16(resampled);
}

/**
 * Rhubarb Lip Sync via lip-sync-engine WASM in a Web Worker (non-blocking).
 */
export class RhubarbPhonemeService implements AudioPhonemeService {
  private pool: WorkerPool | undefined;
  private poolInitPromise: Promise<WorkerPool> | undefined;
  private poolWorkerCount: number = 1;

  private async ensurePool(workerCount: number): Promise<WorkerPool> {
    const count = Math.max(1, Math.min(16, Math.floor(workerCount) || 1));
    if (this.pool && this.poolWorkerCount === count) {
      return this.pool;
    }
    if (this.pool) {
      try {
        this.pool.destroy();
      } catch {
        /* ignore */
      }
      this.pool = undefined;
      this.poolInitPromise = undefined;
    }
    if (!this.poolInitPromise) {
      this.poolWorkerCount = count;
      this.poolInitPromise = (async () => {
        const paths = resolveRhubarbAssetPaths();
        const pool = WorkerPool.getInstance(count, paths.workerScriptUrl);
        await pool.init({
          wasmPath: paths.wasmPath,
          dataPath: paths.dataPath,
          jsPath: paths.jsPath,
          workerScriptUrl: paths.workerScriptUrl,
        });
        this.pool = pool;
        return pool;
      })();
    }
    try {
      return await this.poolInitPromise;
    } catch (error) {
      this.poolInitPromise = undefined;
      this.pool = undefined;
      throw error;
    }
  }

  async extractTimedPhonemes(
    audio: AudioBuffer,
    options: AudioPhonemeExtractOptions = {},
  ): Promise<TimedPhonemeResult> {
    const onProgress = options.onProgress;
    if (!(audio instanceof AudioBuffer) || audio.length < 1) {
      report(onProgress, 100, "done", "No audio");
      return { source: "auto", engine: RHUBARB_ENGINE_ID, items: [] };
    }

    report(onProgress, 5, "load", "Loading Rhubarb WASM…");
    const pool = await this.ensurePool(options.workerCount ?? 1);
    report(onProgress, 15, "load", "Rhubarb ready");

    report(onProgress, 18, "convert", "Converting audio to 16 kHz PCM…");
    const pcm16 = audioBufferToPcm16Linear(audio, RHUBARB_SAMPLE_RATE);
    report(onProgress, 25, "convert", "Audio converted");

    const dialogText = String(options.dialogText ?? "").trim() || undefined;
    const durationSec = audio.duration || pcm16.length / RHUBARB_SAMPLE_RATE;
    // Estimate analyze wall time (~0.4–1.2× realtime for PocketSphinx WASM); clamp for UI.
    const estimateMs = Math.max(800, Math.min(120000, durationSec * 700));
    const analyzeStart = performance.now();
    let analyzeDone = false;
    const tick = window.setInterval(() => {
      if (analyzeDone) return;
      const elapsed = performance.now() - analyzeStart;
      const t = Math.min(1, elapsed / estimateMs);
      // Ease toward 90% while waiting on the worker.
      const percent = 25 + t * 65;
      report(onProgress, percent, "analyze", "Analyzing speech…");
    }, 100);

    try {
      report(onProgress, 28, "analyze", "Analyzing speech…");
      const result = await pool.analyze(pcm16, {
        dialogText,
        sampleRate: RHUBARB_SAMPLE_RATE,
      });
      analyzeDone = true;
      window.clearInterval(tick);
      report(onProgress, 92, "analyze", "Analysis complete");

      let items: TimedPhoneme[] = (result.mouthCues ?? []).map((cue) => ({
        symbol: String(cue.value ?? "").trim(),
        startSec: Math.max(0, Number(cue.start) || 0),
        endSec: Math.max(0, Number(cue.end) || 0),
      }));

      // Fold disabled extended shapes; keep X for optional rest-key conversion later.
      items = applyExtendedShapesFilter(items, options.extendedShapes ?? "GHX");
      items = filterTimedPhonemesByDuration(items, Math.max(0, Number(options.minCueDurationSec) || 0));

      report(onProgress, 100, "done", "Done");
      return { source: "auto", engine: RHUBARB_ENGINE_ID, items };
    } catch (error) {
      analyzeDone = true;
      window.clearInterval(tick);
      throw error;
    }
  }
}
