import { LIPShape } from "@/enums/resource/LIPShape";
import type { TimedPhoneme } from "@/apps/forge/states/tabs/tab-lip-editor/PhonemeToLIPShape";

const PHN_INVALID = -1;
const PHN_EE = LIPShape.EE;
const PHN_EH = LIPShape.EH;
const PHN_AH = LIPShape.AH;
const PHN_OH = LIPShape.OH;
const PHN_OOH = LIPShape.OOH;
const PHN_Y = LIPShape.Y;
const PHN_S = LIPShape.S;
const PHN_FV = LIPShape.FV;
const PHN_NNG = LIPShape.NNG;
const PHN_TH = LIPShape.TH;
const PHN_MPB = LIPShape.MBP;
const PHN_TD = LIPShape.TD;
const PHN_JSH = LIPShape.SH;
const PHN_L = LIPShape.LR;
const PHN_KG = LIPShape.KG;

export interface SpeechIsland {
  startSec: number;
  endSec: number;
  cues: TimedPhoneme[];
}

export interface ShapedCue {
  startSec: number;
  endSec: number;
  shape: number;
}

const CLUSTERS: Array<[string, number]> = [
  ["ng", PHN_NNG],
  ["th", PHN_TH],
  ["sh", PHN_JSH],
  ["ch", PHN_JSH],
  ["wh", PHN_OOH],
  ["qu", PHN_KG],
  ["ee", PHN_EE],
  ["ea", PHN_EE],
  ["oo", PHN_OOH],
  ["ou", PHN_AH],
  ["ow", PHN_OH],
  ["ai", PHN_EH],
  ["ay", PHN_EH],
  ["oy", PHN_OH],
  ["oi", PHN_OH],
  ["aw", PHN_AH],
  ["ph", PHN_FV],
];

const LETTER_SHAPE: Record<string, number> = {
  a: PHN_AH,
  e: PHN_EH,
  i: PHN_EE,
  o: PHN_OH,
  u: PHN_OOH,
  p: PHN_MPB,
  b: PHN_MPB,
  m: PHN_MPB,
  f: PHN_FV,
  v: PHN_FV,
  t: PHN_TD,
  d: PHN_TD,
  n: PHN_NNG,
  s: PHN_S,
  z: PHN_S,
  c: PHN_KG,
  k: PHN_KG,
  g: PHN_KG,
  q: PHN_KG,
  x: PHN_KG,
  j: PHN_JSH,
  l: PHN_L,
  r: PHN_L,
  y: PHN_Y,
  w: PHN_OOH,
};

export function tokenizeDialogWords(text: string): string[] {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/'/g, ""))
    .filter(Boolean);
}

/** Expand English spelling into Odyssey viseme indices (consecutive duplicates collapsed). */
export function expandEnglishToVisemes(word: string): number[] {
  const src = String(word ?? "").toLowerCase();
  const shapes: number[] = [];
  let i = 0;
  while (i < src.length) {
    let shape = PHN_INVALID;
    let consumed = 1;
    for (const [cluster, mapped] of CLUSTERS) {
      if (src.startsWith(cluster, i)) {
        shape = mapped;
        consumed = cluster.length;
        break;
      }
    }
    if (shape === PHN_INVALID) {
      const ch = src[i];
      if (ch === "h") {
        i += 1;
        continue;
      }
      if (ch === "c" && (src[i + 1] === "e" || src[i + 1] === "i" || src[i + 1] === "y")) {
        shape = PHN_S;
      } else {
        shape = LETTER_SHAPE[ch] ?? PHN_INVALID;
      }
    }
    if (shape !== PHN_INVALID && shapes[shapes.length - 1] !== shape) {
      shapes.push(shape);
    }
    i += consumed;
  }
  return shapes;
}

export function buildSpeechIslands(items: TimedPhoneme[]): SpeechIsland[] {
  const islands: SpeechIsland[] = [];
  let current: SpeechIsland | undefined;
  for (const item of items) {
    const symbol = String(item.symbol ?? "").trim().toUpperCase();
    if (symbol === "X") {
      current = undefined;
      continue;
    }
    if (!current) {
      current = { startSec: item.startSec, endSec: item.endSec, cues: [item] };
      islands.push(current);
      continue;
    }
    current.cues.push(item);
    current.endSec = Math.max(current.endSec, item.endSec);
  }
  return islands;
}

/** Assign words to islands 1:1; leftover islands get no words (keep Rhubarb). Extra words pack onto later islands. */
export function assignWordsToIslands(words: string[], islandCount: number): string[][] {
  const assigned: string[][] = Array.from({ length: islandCount }, () => []);
  if (!islandCount || !words.length) return assigned;
  if (words.length <= islandCount) {
    for (let i = 0; i < words.length; i++) assigned[i].push(words[i]);
    return assigned;
  }
  const base = Math.floor(words.length / islandCount);
  let extra = words.length % islandCount;
  let w = 0;
  for (let i = 0; i < islandCount; i++) {
    const take = base + (i >= islandCount - extra ? 1 : 0);
    assigned[i] = words.slice(w, w + take);
    w += take;
  }
  return assigned;
}

export function distributeShapesAcrossSpan(
  shapes: number[],
  startSec: number,
  endSec: number,
): ShapedCue[] {
  if (!shapes.length) return [];
  const span = Math.max(0.001, endSec - startSec);
  const slot = span / shapes.length;
  return shapes.map((shape, i) => ({
    startSec: startSec + i * slot,
    endSec: startSec + (i + 1) * slot,
    shape,
  }));
}

export function mixdownMono(audio: AudioBuffer): [Float32Array, number] {
  const channels = Math.max(1, audio.numberOfChannels);
  const mixed = new Float32Array(audio.length);
  for (let c = 0; c < channels; c++) {
    const data = audio.getChannelData(c);
    for (let i = 0; i < audio.length; i++) mixed[i] += data[i] / channels;
  }
  return [mixed, audio.sampleRate];
}

function frameRmsZcr(samples: Float32Array, start: number, len: number): { rms: number; zcr: number } {
  let sum = 0;
  let zc = 0;
  const end = Math.min(start + len, samples.length);
  let prev = samples[start] ?? 0;
  for (let i = start; i < end; i++) {
    const s = samples[i];
    sum += s * s;
    if ((prev >= 0 && s < 0) || (prev < 0 && s >= 0)) zc += 1;
    prev = s;
  }
  const n = Math.max(1, end - start);
  return { rms: Math.sqrt(sum / n), zcr: zc / n };
}

function classifyConsonantFrame(rms: number, zcr: number, maxRms: number): number {
  const n = rms / Math.max(maxRms, 1e-8);
  if (zcr > 0.18 && n > 0.12) return PHN_S;
  if (zcr > 0.10 && n > 0.22) return PHN_TD;
  if (n < 0.28 && zcr < 0.08) return PHN_NNG;
  if (zcr < 0.12 && n > 0.18) return PHN_KG;
  return PHN_EE;
}

const MIN_SPLIT_SEC = 0.08;
const FRAME_SEC = 0.02;

/** Split long Rhubarb B cues using RMS/ZCR onsets into S/TD/KG/NNG/EE. */
export function splitConsonantBCues(items: TimedPhoneme[], audio?: AudioBuffer): TimedPhoneme[] {
  if (!audio || audio.length < 1) return items;
  const [mono, sampleRate] = mixdownMono(audio);
  const frameLen = Math.max(8, Math.round(sampleRate * FRAME_SEC));
  const out: TimedPhoneme[] = [];

  for (const item of items) {
    const symbol = String(item.symbol ?? "").trim().toUpperCase();
    const dur = item.endSec - item.startSec;
    if (symbol !== "B" || dur < MIN_SPLIT_SEC) {
      out.push(item);
      continue;
    }
    const startSample = Math.max(0, Math.floor(item.startSec * sampleRate));
    const endSample = Math.min(mono.length, Math.ceil(item.endSec * sampleRate));
    const rmsValues: number[] = [];
    const zcrValues: number[] = [];
    const times: number[] = [];
    for (let s = startSample; s + frameLen <= endSample; s += frameLen) {
      const feat = frameRmsZcr(mono, s, frameLen);
      rmsValues.push(feat.rms);
      zcrValues.push(feat.zcr);
      times.push(s / sampleRate);
    }
    if (rmsValues.length < 2) {
      out.push(item);
      continue;
    }
    const maxRms = Math.max(...rmsValues, 1e-8);
    const labels: number[] = rmsValues.map((rms, i) => classifyConsonantFrame(rms, zcrValues[i], maxRms));
    let runShape = labels[0];
    let runStart = times[0];
    for (let i = 1; i <= labels.length; i++) {
      const next = labels[i];
      const onset = i < rmsValues.length && rmsValues[i] > rmsValues[i - 1] * 1.35 && rmsValues[i] > maxRms * 0.2;
      const changed = i === labels.length || next !== runShape || onset;
      if (!changed) continue;
      const runEnd = i < times.length ? times[i] : item.endSec;
      out.push({
        symbol: visemeSymbolForSplit(runShape),
        startSec: runStart,
        endSec: Math.max(runStart, runEnd),
      });
      if (i < labels.length) {
        runShape = labels[i];
        runStart = times[i];
      }
    }
  }
  return out;
}

function visemeSymbolForSplit(shape: number): string {
  switch (shape) {
    case PHN_S: return "s";
    case PHN_TD: return "d";
    case PHN_KG: return "g";
    case PHN_NNG: return "n";
    default: return "B";
  }
}

export function expandDialogOntoIslands(
  items: TimedPhoneme[],
  dialogText: string,
): { expanded: ShapedCue[]; leftoverCues: TimedPhoneme[] } {
  const islands = buildSpeechIslands(items);
  const words = tokenizeDialogWords(dialogText);
  const assigned = assignWordsToIslands(words, islands.length);
  const expanded: ShapedCue[] = [];
  const leftoverCues: TimedPhoneme[] = [];

  for (let i = 0; i < islands.length; i++) {
    const island = islands[i];
    const shapes = assigned[i].flatMap((word) => expandEnglishToVisemes(word));
    if (shapes.length) {
      expanded.push(...distributeShapesAcrossSpan(shapes, island.startSec, island.endSec));
    } else {
      leftoverCues.push(...island.cues);
    }
  }
  return { expanded, leftoverCues };
}

export function rhubarbCuesToShaped(items: TimedPhoneme[], mapShape: (symbol: string, prev: number) => number): ShapedCue[] {
  const cues: ShapedCue[] = [];
  let prev = PHN_INVALID;
  for (const item of items) {
    const shape = mapShape(item.symbol, prev);
    if (shape === PHN_INVALID) continue;
    cues.push({ startSec: item.startSec, endSec: item.endSec, shape });
    prev = shape;
  }
  return cues;
}
