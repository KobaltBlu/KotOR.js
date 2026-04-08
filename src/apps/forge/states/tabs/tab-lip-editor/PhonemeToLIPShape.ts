import { ILIPKeyFrame } from "@/interface/resource/ILIPKeyFrame";

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

const PHONEME_TO_SHAPE = new Map<string, number>([
  ["i:", PHN_EE], ["I", PHN_EH], ["I_x", PHN_EH], ["E", PHN_EH], ["@", PHN_AH], ["A", PHN_AH],
  ["^", PHN_AH], [">", PHN_SCHWA], ["U", PHN_OH], ["u", PHN_OOH], ["u_x", PHN_OOH], ["&", PHN_OH],
  ["&_0", PHN_OH], ["3r", PHN_SCHWA], ["&r", PHN_SCHWA], ["5", PHN_OH], ["ei", PHN_EH], [">i", PHN_OH],
  ["aI", PHN_AH], ["aU", PHN_AH], ["oU", PHN_OH], ["iU", PHN_EE], ["i&", PHN_EE], ["u&", PHN_OOH],
  ["e&", PHN_EH], ["ah", PHN_AH], ["eh", PHN_EH], ["oh", PHN_OH], ["oo", PHN_OOH],
  ["ph", PHN_MPB], ["pc", PHN_MPB], ["b", PHN_MPB], ["bc", PHN_MPB], ["th", PHN_TD],
  ["tc", PHN_TD], ["d", PHN_TD], ["dc", PHN_TD], ["kh", PHN_KG], ["kc", PHN_KG], ["g", PHN_KG],
  ["gc", PHN_KG], ["f", PHN_FV], ["v", PHN_FV], ["T", PHN_TH], ["D", PHN_TH], ["s", PHN_S],
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

export function mapPhonemeToShape(phoneme: string, prevShape: number = PHN_INVALID): number {
  const shape = PHONEME_TO_SHAPE.get(String(phoneme ?? "").trim());
  if (shape === undefined) return PHN_INVALID;
  if (shape === PHN_USE_NEXT) return prevShape;
  return shape;
}

export function convertTimedPhonemesToKeyframes(items: TimedPhoneme[]): Array<Pick<ILIPKeyFrame, "time" | "shape">> {
  const frames: Array<Pick<ILIPKeyFrame, "time" | "shape">> = [];
  let prevShape = PHN_INVALID;
  for (const item of items) {
    const shape = mapPhonemeToShape(item.symbol, prevShape);
    if (shape === PHN_INVALID || shape === prevShape) continue;
    frames.push({ time: Math.max(0, item.startSec), shape });
    prevShape = shape;
  }
  return frames.sort((a, b) => a.time - b.time);
}
