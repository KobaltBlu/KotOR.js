/**
 * resolve spell range / spell-range helpers.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    SWRuleSet: undefined,
  },
}));

import {
  isWithinSpellCastRange,
  normalizeSpellRangeLetter,
  resolveSpellCastRange,
} from '@/combat/spell-range';

describe('resolve spell range personal remap', () => {
  it('engine: P remaps to T before primary lookup', () => {
    expect(normalizeSpellRangeLetter('P')).toBe('T');
    expect(normalizeSpellRangeLetter('p')).toBe('T');
    expect(normalizeSpellRangeLetter('T')).toBe('T');
    expect(normalizeSpellRangeLetter('M')).toBe('M');
  });

  it('P and T share Touch primary fallback (2.25)', () => {
    expect(resolveSpellCastRange('P')).toBe(2.25);
    expect(resolveSpellCastRange('T')).toBe(2.25);
  });

  it('same-object is always in range; P uses Touch distance for others', () => {
    expect(isWithinSpellCastRange('P', 99, true)).toBe(true);
    expect(isWithinSpellCastRange('P', 1.0, false)).toBe(true);
    expect(isWithinSpellCastRange('P', 3.0, false)).toBe(false);
  });
});
