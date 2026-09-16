/**
 * TSL alien / foreign-language VO take variation.
 * Pseudo-random take selection for one-liner / alien dialog VO.
 */
import { hashDialogResref } from "@/managers/cutscene/dialog-camera";

/** Alien VO take weights (19 entries, values 1–3). */
export const DIALOG_ALIEN_VO_TAKES: readonly number[] = [
  1, 1, 2, 3, 1, 2, 1, 2, 2, 3, 3, 3, 1, 3, 2, 1, 3, 2, 2,
];

export interface DialogAlienVOPrngState {
  /** Index into DIALOG_ALIEN_VO_TAKES */
  mod19: number;
  /** Step size (u%5+1) */
  angleCycle: number;
  /** Direction (u&1); 0 = subtract, else add */
  parity: number;
}

/** Seed alien VO PRNG — same hash as camera PRNG. */
export function createDialogAlienVOPrngState(resref: string): DialogAlienVOPrngState {
  const h = hashDialogResref(resref);
  return {
    mod19: h.mod19,
    angleCycle: h.angleCycle,
    parity: h.parity,
  };
}

/**
 * Advance take table on every entry send.
 * Returns the table value (1–3) at the previous index.
 */
export function advanceAlienVOTake(state: DialogAlienVOPrngState): number {
  const idx = ((state.mod19 % 0x13) + 0x13) % 0x13;
  const value = DIALOG_ALIEN_VO_TAKES[idx];
  let next = state.parity === 0
    ? idx - state.angleCycle
    : idx + state.angleCycle;
  if(next > 0x12) next = 0;
  if(next < 0) next = 0x12;
  state.mod19 = next;
  return value;
}
