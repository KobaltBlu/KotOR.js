/**
 * Lightweight performance timing helpers for module-editor baselines.
 *
 * @file PerformanceBaseline.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type BaselineMetricName =
  | "module.open"
  | "viewport.frame"
  | "selection.latency"
  | "undo.apply"
  | "module.save"
  | "module.export"
  | "preview.start"
  | "validation.run"
  | "index.build";

export interface BaselineSample {
  name: BaselineMetricName | string;
  ms: number;
  at: number;
  detail?: string;
}

export interface BaselineReport {
  samples: BaselineSample[];
  byName: Record<string, { count: number; totalMs: number; avgMs: number; maxMs: number; minMs: number }>;
  capturedAt: number;
}

const MAX_SAMPLES = 500;
const samples: BaselineSample[] = [];

export class PerformanceBaseline {
  static mark(name: BaselineMetricName | string, ms: number, detail?: string): BaselineSample {
    const sample: BaselineSample = {
      name,
      ms: Math.max(0, ms),
      at: Date.now(),
      detail,
    };
    samples.push(sample);
    if (samples.length > MAX_SAMPLES) {
      samples.shift();
    }
    return sample;
  }

  static async measure<T>(
    name: BaselineMetricName | string,
    work: () => Promise<T> | T,
    detail?: string,
  ): Promise<T> {
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      return await work();
    } finally {
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      PerformanceBaseline.mark(name, end - start, detail);
    }
  }

  static clear(): void {
    samples.length = 0;
  }

  static getSamples(): BaselineSample[] {
    return samples.slice();
  }

  static report(): BaselineReport {
    const byName: BaselineReport["byName"] = {};
    for (const sample of samples) {
      const bucket = byName[sample.name] || {
        count: 0,
        totalMs: 0,
        avgMs: 0,
        maxMs: 0,
        minMs: Number.POSITIVE_INFINITY,
      };
      bucket.count += 1;
      bucket.totalMs += sample.ms;
      bucket.maxMs = Math.max(bucket.maxMs, sample.ms);
      bucket.minMs = Math.min(bucket.minMs, sample.ms);
      bucket.avgMs = bucket.totalMs / bucket.count;
      byName[sample.name] = bucket;
    }
    for (const key of Object.keys(byName)) {
      if (!Number.isFinite(byName[key].minMs)) {
        byName[key].minMs = 0;
      }
    }
    return {
      samples: samples.slice(),
      byName,
      capturedAt: Date.now(),
    };
  }

  /** Export a local diagnostics blob (no network). */
  static exportJson(): string {
    return JSON.stringify(PerformanceBaseline.report(), null, 2);
  }
}
