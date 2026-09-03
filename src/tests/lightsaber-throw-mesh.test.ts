/**
 * LightsaberThrow mesh timing + CounterSpell HUD gate.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import { shouldShowCounterSpellAction } from '@/combat/spell-cast-gates';

/** Segment arrive times matching EffectLightsaberThrow / throw mesh. */
function buildThrowArriveTimesMs(
  distances: number[],
  throwRate: number
): number[] {
  const arrives = [0];
  let elapsed = 0;
  for(let i = 0; i < distances.length; i++){
    const segMs = throwRate > 0 ? (distances[i] / throwRate) * 2000.0 : 0;
    elapsed += segMs;
    arrives.push(elapsed);
  }
  return arrives;
}

describe('shouldShowCounterSpellAction', () => {
  it('shows only while target is mid-cast', () => {
    expect(shouldShowCounterSpellAction({ hasActiveSpellCast: true })).toBe(true);
    expect(shouldShowCounterSpellAction({ spellCastRound: true })).toBe(true);
    expect(shouldShowCounterSpellAction({})).toBe(false);
    expect(shouldShowCounterSpellAction({
      hasActiveSpellCast: true,
      isSelf: true,
    })).toBe(false);
    expect(shouldShowCounterSpellAction({
      hasActiveSpellCast: true,
      restricted: true,
    })).toBe(false);
  });
});

describe('buildThrowArriveTimesMs', () => {
  it('scales segments by throwRate like EffectLightsaberThrow', () => {
    const arrives = buildThrowArriveTimesMs([10, 10], 37);
    expect(arrives[0]).toBe(0);
    expect(arrives[1]).toBeCloseTo((10 / 37) * 2000, 5);
    expect(arrives[2]).toBeCloseTo((20 / 37) * 2000, 5);
  });
});
