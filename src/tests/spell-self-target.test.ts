/**
 * Personal / friendly force cast self-bind (retail GetSelfForcePowers).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  parseForceMenuIndex,
  resolveSpellCastTarget,
  shouldBindSpellCastToCaster,
} from '@/combat/spell-self-target';

describe('parseForceMenuIndex', () => {
  it('maps **** / empty to -1', () => {
    expect(parseForceMenuIndex('****')).toBe(-1);
    expect(parseForceMenuIndex('')).toBe(-1);
    expect(parseForceMenuIndex(undefined)).toBe(-1);
    expect(parseForceMenuIndex(null)).toBe(-1);
  });

  it('parses numeric cells', () => {
    expect(parseForceMenuIndex(2)).toBe(2);
    expect(parseForceMenuIndex('0')).toBe(0);
    expect(parseForceMenuIndex(-1)).toBe(-1);
  });
});

describe('shouldBindSpellCastToCaster', () => {
  it('always binds range P', () => {
    expect(shouldBindSpellCastToCaster({ range: 'P', forcehostile: -1, forcefriendly: 2 })).toBe(true);
    expect(shouldBindSpellCastToCaster(
      { range: 'P', forcehostile: -1, forcefriendly: 2 },
      { isUserAction: false }
    )).toBe(true);
  });

  it('binds FORCEFRIENDLY-only on user action (Heal)', () => {
    const heal = { range: 'T', forcehostile: '****', forcefriendly: 0 };
    expect(shouldBindSpellCastToCaster(heal, { isUserAction: true })).toBe(true);
    expect(shouldBindSpellCastToCaster(heal, { isUserAction: false })).toBe(false);
  });

  it('does not bind hostile powers', () => {
    const choke = { range: 'M', forcehostile: 2, forcefriendly: -1 };
    expect(shouldBindSpellCastToCaster(choke, { isUserAction: true })).toBe(false);
  });
});

describe('resolveSpellCastTarget', () => {
  const caster = { id: 1 } as any;
  const companion = { id: 2 } as any;

  it('Force Speed retargets companion → caster', () => {
    const spell = { range: 'P', forcehostile: -1, forcefriendly: 2 };
    expect(resolveSpellCastTarget(spell, companion, caster, { isUserAction: true })).toBe(caster);
  });

  it('Heal user cast retargets companion → caster', () => {
    const spell = { range: 'T', forcehostile: '****', forcefriendly: '0' };
    expect(resolveSpellCastTarget(spell, companion, caster, { isUserAction: true })).toBe(caster);
  });

  it('hostile keeps companion target', () => {
    const spell = { range: 'M', forcehostile: 2, forcefriendly: -1 };
    expect(resolveSpellCastTarget(spell, companion, caster, { isUserAction: true })).toBe(companion);
  });
});
