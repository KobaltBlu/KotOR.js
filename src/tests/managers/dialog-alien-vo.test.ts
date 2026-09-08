/**
 * TSL alien VO take PRNG (GetStartEntryOneLiner table).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  DIALOG_ALIEN_VO_TAKES,
  advanceAlienVOTake,
  createDialogAlienVOPrngState,
} from '@/managers/cutscene/dialog-alien-vo';
import { hashDialogResref } from '@/managers/cutscene/dialog-camera';

describe('DIALOG_ALIEN_VO_TAKES', () => {
  it('matches CSWSDialog ctor table (19 takes, values 1–3)', () => {
    expect(DIALOG_ALIEN_VO_TAKES).toEqual([
      1, 1, 2, 3, 1, 2, 1, 2, 2, 3, 3, 3, 1, 3, 2, 1, 3, 2, 2,
    ]);
    expect(DIALOG_ALIEN_VO_TAKES).toHaveLength(19);
    for(const t of DIALOG_ALIEN_VO_TAKES){
      expect(t).toBeGreaterThanOrEqual(1);
      expect(t).toBeLessThanOrEqual(3);
    }
  });
});

describe('createDialogAlienVOPrngState', () => {
  it('seeds from the same hash as the camera PRNG', () => {
    const h = hashDialogResref('n_hanharr');
    const state = createDialogAlienVOPrngState('n_hanharr');
    expect(state.mod19).toBe(h.mod19);
    expect(state.angleCycle).toBe(h.angleCycle);
    expect(state.parity).toBe(h.parity);
  });
});

describe('advanceAlienVOTake (GetStartEntryOneLiner)', () => {
  it('returns the table value then advances the index', () => {
    const state = { mod19: 0, angleCycle: 1, parity: 1 };
    expect(advanceAlienVOTake(state)).toBe(1);
    expect(state.mod19).toBe(1);
    expect(advanceAlienVOTake(state)).toBe(1);
    expect(state.mod19).toBe(2);
    expect(advanceAlienVOTake(state)).toBe(2);
  });

  it('wraps past 0x12 back to 0 when adding', () => {
    const state = { mod19: 0x12, angleCycle: 1, parity: 1 };
    expect(advanceAlienVOTake(state)).toBe(2);
    expect(state.mod19).toBe(0);
  });

  it('wraps below 0 to 0x12 when subtracting', () => {
    const state = { mod19: 0, angleCycle: 1, parity: 0 };
    expect(advanceAlienVOTake(state)).toBe(1);
    expect(state.mod19).toBe(0x12);
  });
});
