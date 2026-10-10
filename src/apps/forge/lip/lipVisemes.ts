/**
 * Pure LIP viseme helpers for the Forge lip editor.
 *
 * @file lipVisemes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { LIPShapeLabels } from "@apps/forge/data/LIPShapeLabels";

/** Default snap grid for lip keyframe times (10 ms). */
export const LIP_SNAP_GRID_SEC = 0.01;

export type LipViseme = {
  shape: number;
  token: string;
  label: string;
};

const VISEME_TOKENS = [
  "EE",
  "EH",
  "SCHWA",
  "AH",
  "OH",
  "OO",
  "Y",
  "S",
  "F",
  "N",
  "TH",
  "MBP",
  "TD",
  "JSH",
  "LR",
  "KG",
] as const;

export const LIP_VISEMES: LipViseme[] = VISEME_TOKENS.map((token, shape) => ({
  shape,
  token,
  label: (LIPShapeLabels[shape] ?? "").trim(),
}));

export type LipKeyFrameLike = {
  uuid?: string;
  time: number;
  shape: number;
};

export type LipVisemeSpan = {
  uuid?: string;
  shape: number;
  start: number;
  end: number;
};

export type LipSnapMode = "off" | "grid" | "phoneme";

export type LipSnapOptions = {
  mode: LipSnapMode;
  duration: number;
  grid?: number;
  phonemeStarts?: number[];
};

export function clampLipShape(shape: number): number {
  if (!Number.isFinite(shape)) return 0;
  return Math.max(0, Math.min(15, Math.trunc(shape)));
}

export function formatLipClock(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = t % 60;
  const sec = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
  return `${m}:${sec}`;
}

export function visemeSpansFromKeys(
  keys: LipKeyFrameLike[],
  duration: number,
): LipVisemeSpan[] {
  if (!keys.length) return [];
  const sorted = [...keys].sort((a, b) => a.time - b.time);
  const end = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  return sorted.map((key, i) => ({
    uuid: key.uuid,
    shape: clampLipShape(key.shape),
    start: key.time,
    end: i + 1 < sorted.length ? sorted[i + 1].time : end,
  }));
}

function clampTime(t: number, duration: number): number {
  const max = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(max, t));
}

export function snapLipTime(t: number, options: LipSnapOptions): number {
  const clamped = clampTime(t, options.duration);
  if (options.mode === "off") {
    return clamped;
  }
  if (options.mode === "grid") {
    const grid = options.grid ?? LIP_SNAP_GRID_SEC;
    if (!(grid > 0)) return clamped;
    return clampTime(Math.round(clamped / grid) * grid, options.duration);
  }
  const starts = options.phonemeStarts ?? [];
  if (!starts.length) return clamped;
  let best = starts[0];
  let bestDist = Math.abs(clamped - best);
  for (let i = 1; i < starts.length; i++) {
    const dist = Math.abs(clamped - starts[i]);
    if (dist < bestDist) {
      best = starts[i];
      bestDist = dist;
    }
  }
  return clampTime(best, options.duration);
}

export function mergeLipKeyframes(
  existing: LipKeyFrameLike[],
  incoming: LipKeyFrameLike[],
  collisionTolerance = LIP_SNAP_GRID_SEC,
): LipKeyFrameLike[] {
  const tol = Number.isFinite(collisionTolerance) ? Math.max(0, collisionTolerance) : 0;
  const merged: LipKeyFrameLike[] = existing.map((k) => ({ ...k }));
  for (const next of incoming) {
    const collides = merged.some((k) => Math.abs(k.time - next.time) <= tol);
    if (!collides) {
      merged.push({ ...next });
    }
  }
  merged.sort((a, b) => a.time - b.time);
  return merged;
}
