/**
 * CalculateLastSpellProjectileTime
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  SPELL_PROJECTILE_PATH6_EXTRA_MS,
  calculateLastSpellProjectileTimeMs,
  calculateSpellProjectileImpactDelayMs,
  resolveSpellProjectilePathType,
} from '@engine/combat/spell-projectile-time';

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

describe('calculateSpellProjectileImpactDelayMs', () => {
  it('returns 0 when spell.proj is explicitly 0', () => {
    expect(calculateSpellProjectileImpactDelayMs({ proj: 0 }, 20, 6)).toBe(0);
  });

  it('uses path type for flight when proj is set', () => {
    const distance = 12;
    expect(calculateSpellProjectileImpactDelayMs({ proj: 1, projtype: '6' }, distance))
      .toBe(calculateLastSpellProjectileTimeMs(distance, 6));
  });

  it('honors path override over spell projtype', () => {
    const distance = 10;
    expect(calculateSpellProjectileImpactDelayMs({ proj: 1, projtype: '1' }, distance, 6))
      .toBe(calculateLastSpellProjectileTimeMs(distance, 6));
  });
});

describe('resolveSpellProjectilePathType', () => {
  it('parses numeric strings and numbers', () => {
    expect(resolveSpellProjectilePathType('6')).toBe(6);
    expect(resolveSpellProjectilePathType(6)).toBe(6);
    expect(resolveSpellProjectilePathType('****')).toBe(0);
    expect(resolveSpellProjectilePathType(undefined)).toBe(0);
  });

  it('maps named projtype strings used by spells.2da', () => {
    expect(resolveSpellProjectilePathType('grenade')).toBe(11);
    expect(resolveSpellProjectilePathType('spiral')).toBe(6);
    expect(resolveSpellProjectilePathType('bounce')).toBe(8);
    expect(resolveSpellProjectilePathType('homing')).toBe(1);
    expect(resolveSpellProjectilePathType('linked')).toBe(7);
  });

  it('does not treat throw spawn-point as a projtype', () => {
    expect(resolveSpellProjectilePathType('throw')).toBe(0);
  });

  it('does not add spiral hang time for grenade path 11', () => {
    const distance = 12;
    const base = calculateLastSpellProjectileTimeMs(distance, 2);
    expect(calculateLastSpellProjectileTimeMs(distance, 11)).toBe(base);
  });
});
