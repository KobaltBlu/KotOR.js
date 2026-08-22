import { LipSyncEngine, audioBufferToInt16 } from "lip-sync-engine";
import { TimedPhoneme, TimedPhonemeResult } from "@/apps/forge/states/tabs/tab-lip-editor/PhonemeToLIPShape";

export interface AudioPhonemeExtractOptions {
  dialogText?: string;
}

export interface AudioPhonemeService {
  extractTimedPhonemes(audio: AudioBuffer, options?: AudioPhonemeExtractOptions): Promise<TimedPhonemeResult>;
}

const RHUBARB_SAMPLE_RATE = 16000;
const RHUBARB_ENGINE_ID = "rhubarb-wasm";

function resolveRhubarbWasmPaths(): { wasmPath: string; dataPath: string; jsPath: string } {
  const base = new URL("wasm/", typeof window !== "undefined" ? window.location.href : "http://localhost/forge/");
  return {
    wasmPath: new URL("lip-sync-engine.wasm", base).href,
    dataPath: new URL("lip-sync-engine.data", base).href,
    jsPath: new URL("lip-sync-engine.js", base).href,
  };
}

/**
 * Rhubarb Lip Sync via lip-sync-engine WASM (PocketSphinx).
 * Expects mono PCM at 16 kHz; returns Preston Blair mouth cues A–H / X.
 */
export class RhubarbPhonemeService implements AudioPhonemeService {
  private initPromise: Promise<LipSyncEngine> | undefined;

  private async ensureEngine(): Promise<LipSyncEngine> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const engine = LipSyncEngine.getInstance();
        await engine.init(resolveRhubarbWasmPaths());
        return engine;
      })();
    }
    try {
      return await this.initPromise;
    } catch (error) {
      this.initPromise = undefined;
      throw error;
    }
  }

  async extractTimedPhonemes(
    audio: AudioBuffer,
    options: AudioPhonemeExtractOptions = {},
  ): Promise<TimedPhonemeResult> {
    if (!(audio instanceof AudioBuffer) || audio.length < 1) {
      return { source: "auto", engine: RHUBARB_ENGINE_ID, items: [] };
    }

    const engine = await this.ensureEngine();
    const pcm16 = audioBufferToInt16(audio, RHUBARB_SAMPLE_RATE);
    const dialogText = String(options.dialogText ?? "").trim() || undefined;
    const result = await engine.analyze(pcm16, {
      dialogText,
      sampleRate: RHUBARB_SAMPLE_RATE,
    });

    const items: TimedPhoneme[] = (result.mouthCues ?? []).map((cue) => ({
      symbol: String(cue.value ?? "").trim(),
      startSec: Math.max(0, Number(cue.start) || 0),
      endSec: Math.max(0, Number(cue.end) || 0),
    }));

    return { source: "auto", engine: RHUBARB_ENGINE_ID, items };
  }
}
