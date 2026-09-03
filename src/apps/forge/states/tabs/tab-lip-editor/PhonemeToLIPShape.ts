import { ILIPKeyFrame } from "@/interface/resource/ILIPKeyFrame";
import {
  ShapedCue,
  expandDialogOntoIslands,
  rhubarbCuesToShaped,
  splitConsonantBCues,
} from "@/apps/forge/states/tabs/tab-lip-editor/OdysseyVisemeExpand";

export const PHN_INVALID = -1;
export const PHN_EE = 0;
export const PHN_EH = 1;
export const PHN_SCHWA = 2;
export const PHN_AH = 3;
export const PHN_OH = 4;
export const PHN_OOH = 5;
export const PHN_Y = 6;
export const PHN_S = 7;
export const PHN_FV = 8;
export const PHN_NNG = 9;
export const PHN_TH = 0xA;
export const PHN_MPB = 0xB;
export const PHN_TD = 0xC;
export const PHN_JSH = 0xD;
export const PHN_L = 0xE;
export const PHN_KG = 0xF;

const PHN_USE_NEXT = 0x10;

/** Official Rhubarb Preston Blair letters → Odyssey LIP shapes (DanielSWolf docs, not npm README). */
const RHUBARB_TO_SHAPE = new Map<string, number>([
  ["A", PHN_MPB], // P/B/M closed
  ["B", PHN_EE],  // consonants / EE (teeth)
  ["C", PHN_EH],  // EH / AE
  ["D", PHN_AH],  // AA wide open
  ["E", PHN_OH],  // AO / ER
  ["F", PHN_OOH], // UW / OW / W
  ["G", PHN_FV],  // F/V extended
  ["H", PHN_L],   // L extended
  ["X", PHN_MPB], // idle rest (often omitted from keyframes)
]);

/** When an extended shape is disabled, fold onto the nearest basic shape. */
const EXTENDED_FALLBACK: Record<string, string> = {
  G: "B", // F/V → teeth/consonant workhorse
  H: "C", // L → open mid
  X: "A", // rest → closed
};

const PHONEME_TO_SHAPE = new Map<string, number>([
  ...RHUBARB_TO_SHAPE,
  // Festival / PHN-style symbols
  ["i:", PHN_EE], ["I", PHN_EH], ["I_x", PHN_EH], ["@", PHN_AH],
  ["^", PHN_AH], [">", PHN_SCHWA], ["U", PHN_OH], ["u", PHN_OOH], ["u_x", PHN_OOH], ["&", PHN_OH],
  ["&_0", PHN_OH], ["3r", PHN_SCHWA], ["&r", PHN_SCHWA], ["5", PHN_OH], ["ei", PHN_EH], [">i", PHN_OH],
  ["aI", PHN_AH], ["aU", PHN_AH], ["oU", PHN_OH], ["iU", PHN_EE], ["i&", PHN_EE], ["u&", PHN_OOH],
  ["e&", PHN_EH], ["ah", PHN_AH], ["eh", PHN_EH], ["oh", PHN_OH], ["oo", PHN_OOH],
  ["ph", PHN_MPB], ["pc", PHN_MPB], ["b", PHN_MPB], ["bc", PHN_MPB], ["th", PHN_TD],
  ["tc", PHN_TD], ["d", PHN_TD], ["dc", PHN_TD], ["kh", PHN_KG], ["kc", PHN_KG], ["g", PHN_KG],
  ["gc", PHN_KG], ["f", PHN_FV], ["v", PHN_FV], ["T", PHN_TH], ["s", PHN_S],
  ["z", PHN_S], ["S", PHN_JSH], ["Z", PHN_JSH], ["h", PHN_USE_NEXT], ["h_v", PHN_USE_NEXT], ["tS", PHN_JSH],
  ["tSc", PHN_JSH], ["dZ", PHN_JSH], ["dZc", PHN_JSH], ["m", PHN_MPB], ["n", PHN_NNG], ["N", PHN_NNG],
  ["d_(", PHN_TD], ["th_(", PHN_TD], ["n_(", PHN_NNG], ["l=", PHN_L], ["m=", PHN_MPB], ["n=", PHN_NNG],
  ["l", PHN_L], ["9r", PHN_L], ["j", PHN_Y], ["w", PHN_OOH], ["+", PHN_MPB],
]);

export interface TimedPhoneme {
  symbol: string;
  startSec: number;
  endSec: number;
  confidence?: number;
}

export interface TimedPhonemeResult {
  source: "auto";
  engine: string;
  items: TimedPhoneme[];
}

export interface RhubarbCueConvertOptions {
  /** Include idle rest (X) as keyframes. Default false. */
  includeRestKeys?: boolean;
  /** Enabled extended shapes string, e.g. "GHX". Empty = basic A–F only. */
  extendedShapes?: string;
  /** Drop/merge cues shorter than this (seconds). 0 = keep all. */
  minCueDurationSec?: number;
  dialogText?: string;
  expandFromDialog?: boolean;
  splitConsonants?: boolean;
  phraseOnsetKeys?: boolean;
  /** Seconds added to each key (negative = mouth leads audio). */
  timeOffsetSec?: number;
  /** Re-emit the same Odyssey shape after this much silence. */
  rekeyAfterGapSec?: number;
  audio?: AudioBuffer;
  durationSec?: number;
}

export function mapPhonemeToShape(phoneme: string, prevShape: number = PHN_INVALID): number {
  const shape = PHONEME_TO_SHAPE.get(String(phoneme ?? "").trim());
  if (shape === undefined) return PHN_INVALID;
  if (shape === PHN_USE_NEXT) return prevShape;
  return shape;
}

/**
 * Apply --extendedShapes-style filtering: disabled G/H/X fold onto basic shapes.
 */
export function applyExtendedShapesFilter(
  items: TimedPhoneme[],
  extendedShapes: string = "GHX",
): TimedPhoneme[] {
  const enabled = new Set(
    String(extendedShapes ?? "GHX")
      .toUpperCase()
      .split("")
      .filter((c) => c === "G" || c === "H" || c === "X"),
  );
  return items.map((item) => {
    const symbol = String(item.symbol ?? "").trim().toUpperCase();
    if ((symbol === "G" || symbol === "H" || symbol === "X") && !enabled.has(symbol)) {
      return { ...item, symbol: EXTENDED_FALLBACK[symbol] ?? "B" };
    }
    return { ...item, symbol };
  });
}

/**
 * Merge consecutive same-symbol cues and drop cues shorter than min duration
 * (unless they are the only cue in a run after merge).
 */
export function filterTimedPhonemesByDuration(
  items: TimedPhoneme[],
  minCueDurationSec: number = 0,
): TimedPhoneme[] {
  if (!items.length) return [];
  const merged: TimedPhoneme[] = [];
  for (const item of items) {
    const symbol = String(item.symbol ?? "").trim();
    const startSec = Math.max(0, Number(item.startSec) || 0);
    const endSec = Math.max(startSec, Number(item.endSec) || startSec);
    const last = merged[merged.length - 1];
    const abuts = last && last.symbol === symbol && startSec <= last.endSec + 1e-4;
    if (abuts) {
      last.endSec = Math.max(last.endSec, endSec);
      continue;
    }
    merged.push({ symbol, startSec, endSec, confidence: item.confidence });
  }
  if (!(minCueDurationSec > 0)) return merged;
  return merged.filter((item, index) => {
    const dur = item.endSec - item.startSec;
    if (dur >= minCueDurationSec) return true;
    // Keep very short first/last only if nothing else would remain nearby — drop otherwise.
    return index === 0 || index === merged.length - 1 ? dur > 0 : false;
  });
}

function emitShapedCues(
  cues: ShapedCue[],
  rekeyAfterGapSec: number,
): Array<Pick<ILIPKeyFrame, "time" | "shape">> {
  const frames: Array<Pick<ILIPKeyFrame, "time" | "shape">> = [];
  let prevShape = PHN_INVALID;
  let prevTime = -Infinity;
  const sorted = [...cues].sort((a, b) => a.startSec - b.startSec);
  for (const cue of sorted) {
    if (cue.shape === PHN_INVALID) continue;
    const time = Math.max(0, cue.startSec);
    const gap = time - prevTime;
    if (cue.shape === prevShape && gap < rekeyAfterGapSec) continue;
    frames.push({ time, shape: cue.shape });
    prevShape = cue.shape;
    prevTime = time;
  }
  return frames;
}

function applyTimeOffset(
  frames: Array<Pick<ILIPKeyFrame, "time" | "shape">>,
  offsetSec: number,
  durationSec: number,
): Array<Pick<ILIPKeyFrame, "time" | "shape">> {
  if (!offsetSec) return frames;
  const maxT = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : Infinity;
  return frames
    .map((frame) => ({
      ...frame,
      time: Math.max(0, Math.min(maxT, frame.time + offsetSec)),
    }))
    .sort((a, b) => a.time - b.time);
}

function insertPhraseOnsets(cues: ShapedCue[]): ShapedCue[] {
  if (!cues.length) return cues;
  const sorted = [...cues].sort((a, b) => a.startSec - b.startSec);
  const out: ShapedCue[] = [];
  let islandStart = sorted[0].startSec;
  let prevEnd = sorted[0].endSec;
  for (let i = 0; i < sorted.length; i++) {
    const cue = sorted[i];
    const gap = cue.startSec - prevEnd;
    const newIsland = i === 0 || gap > 0.06;
    if (newIsland) {
      islandStart = cue.startSec;
      if (cue.shape !== PHN_MPB) {
        out.push({ startSec: islandStart, endSec: cue.startSec, shape: PHN_MPB });
        if (Math.abs(cue.startSec - islandStart) < 1e-4) {
          out.push({ ...cue, startSec: islandStart + 0.001 });
        } else {
          out.push(cue);
        }
      } else {
        out.push(cue);
      }
    } else {
      out.push(cue);
    }
    prevEnd = Math.max(prevEnd, cue.endSec);
  }
  return out;
}

export function convertTimedPhonemesToKeyframes(
  items: TimedPhoneme[],
  options: RhubarbCueConvertOptions = {},
): Array<Pick<ILIPKeyFrame, "time" | "shape">> {
  const includeRestKeys = options.includeRestKeys === true;
  const extended = options.extendedShapes ?? "GHX";
  const minDur = Math.max(0, Number(options.minCueDurationSec) || 0);
  const expandFromDialog = options.expandFromDialog !== false;
  const splitConsonants = options.splitConsonants !== false;
  const phraseOnsetKeys = options.phraseOnsetKeys !== false;
  const timeOffsetSec = Number(options.timeOffsetSec) || 0;
  const rekeyAfterGapSec = Math.max(0, Number(options.rekeyAfterGapSec) || 0);
  const dialogText = String(options.dialogText ?? "").trim();

  let prepared = applyExtendedShapesFilter(items, extended);
  prepared = filterTimedPhonemesByDuration(prepared, minDur);

  const restCues = includeRestKeys
    ? prepared.filter((item) => String(item.symbol).toUpperCase() === "X")
    : [];
  const speech = prepared.filter((item) => String(item.symbol).toUpperCase() !== "X");

  let shaped: ShapedCue[] = [];
  if (expandFromDialog && dialogText) {
    const { expanded, leftoverCues } = expandDialogOntoIslands(speech, dialogText);
    shaped.push(...expanded);
    let leftover = leftoverCues;
    if (splitConsonants) leftover = splitConsonantBCues(leftover, options.audio);
    shaped.push(...rhubarbCuesToShaped(leftover, mapPhonemeToShape));
  } else {
    let speechCues = speech;
    if (splitConsonants) speechCues = splitConsonantBCues(speechCues, options.audio);
    shaped = rhubarbCuesToShaped(speechCues, mapPhonemeToShape);
  }

  if (includeRestKeys) {
    shaped.push(...rhubarbCuesToShaped(restCues, mapPhonemeToShape));
  }
  if (phraseOnsetKeys) {
    shaped = insertPhraseOnsets(shaped);
  }

  let frames = emitShapedCues(shaped, rekeyAfterGapSec);
  const durationSec = options.durationSec
    ?? Math.max(0, ...items.map((item) => item.endSec), ...frames.map((f) => f.time));
  frames = applyTimeOffset(frames, timeOffsetSec, durationSec);
  return frames;
}
