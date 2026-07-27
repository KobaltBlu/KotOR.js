/**
 * Retail CalculateLastSpellProjectileTime @ 004cb9e0.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  SPELL_PROJECTILE_PATH6_EXTRA_MS,
  calculateLastSpellProjectileTimeMs,
  resolveSpellProjectilePathType,
} from '@/combat/spell-projectile-time';

describe('calculateLastSpellProjectileTimeMs', () => {
  it('returns 1 for zero distance', () => {
    expect(calculateLastSpellProjectileTimeMs(0, 6)).toBe(1);
  });

  it('uses ln(distance)*3+2 as speed for default paths', () => {
    const distance = 10;
    const speed = Math.log(distance) * 3 + 2;
    const expected = Math.floor((distance / speed) * 1000);
    expect(calculateLastSpellProjectileTimeMs(distance, 2)).toBe(expected);
  });

  it('adds 2500 ms when path type is 6', () => {
    const distance = 12;
    const base = calculateLastSpellProjectileTimeMs(distance, 2);
    expect(calculateLastSpellProjectileTimeMs(distance, 6)).toBe(
      base + SPELL_PROJECTILE_PATH6_EXTRA_MS
    );
  });

  it('returns fixed 2000 for path type 3', () => {
    expect(calculateLastSpellProjectileTimeMs(100, 3)).toBe(2000);
  });

  it('doubles speed for path type 1', () => {
    const distance = 10;
    const speed = (Math.log(distance) * 3 + 2) * 2;
    const expected = Math.floor((distance / speed) * 1000);
    expect(calculateLastSpellProjectileTimeMs(distance, 1)).toBe(expected);
  });
});

describe('resolveSpellProjectilePathType', () => {
  it('parses numeric strings and numbers', () => {
    expect(resolveSpellProjectilePathType('6')).toBe(6);
    expect(resolveSpellProjectilePathType(6)).toBe(6);
    expect(resolveSpellProjectilePathType('****')).toBe(0);
    expect(resolveSpellProjectilePathType(undefined)).toBe(0);
  });
});
