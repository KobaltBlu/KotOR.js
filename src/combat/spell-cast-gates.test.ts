/**
 * Retail spell prerequisite / CastSpell gates.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  canTargetSpellCastByPerception,
  passesSpellKnownGate,
  passesSpellPrerequisiteGate,
  shouldShowCounterSpellAction,
} from '@/combat/spell-cast-gates';
import {
  resolveSpellProjectilePathType,
  shouldDelaySpellImpactToLanding,
} from '@/combat/spell-projectile-time';
import { ProjectilePath } from '@/enums/combat/ProjectilePath';

describe('passesSpellPrerequisiteGate', () => {
  it('passes when prerequisites are empty', () => {
    expect(passesSpellPrerequisiteGate(
      { getHasSpell: () => false, getHasFeat: () => false },
      { prerequisites: [] }
    )).toBe(true);
  });

  it('requires known spell or owned feat for each id', () => {
    const caster = {
      getHasSpell: (id: number) => id === 49,
      getHasFeat: () => false,
    };
    // Advanced Saber Throw prereq = base throw spell 49
    expect(passesSpellPrerequisiteGate(caster, { prerequisites: [49] })).toBe(true);
    expect(passesSpellPrerequisiteGate(caster, { prerequisites: [49, 12] })).toBe(false);
  });

  it('accepts feat ownership as an alternate gate', () => {
    const caster = {
      getHasSpell: () => false,
      getHasFeat: (id: number) => id === 21,
    };
    expect(passesSpellPrerequisiteGate(caster, { prerequisites: [21] })).toBe(true);
  });
});

describe('passesSpellKnownGate', () => {
  it('requires getHasSpell for the cast id', () => {
    const caster = { getHasSpell: (id: number) => id === 9 };
    expect(passesSpellKnownGate(caster, 9)).toBe(true);
    expect(passesSpellKnownGate(caster, 10)).toBe(false);
  });
});

describe('canTargetSpellCastByPerception', () => {
  it('mirrors ItemCastSpell visibility rules', () => {
    expect(canTargetSpellCastByPerception(undefined, { isPartyOrPlayerUI: true })).toBe(true);
    expect(canTargetSpellCastByPerception(undefined, {})).toBe(false);
    expect(canTargetSpellCastByPerception(0x1, {})).toBe(true); // SEEN
    expect(canTargetSpellCastByPerception(0x4, {})).toBe(false); // HEARD-only
  });
});

describe('shouldShowCounterSpellAction', () => {
  it('requires mid-cast and rejects self/restricted', () => {
    expect(shouldShowCounterSpellAction({ spellCastRound: true })).toBe(true);
    expect(shouldShowCounterSpellAction({ isSelf: true, spellCastRound: true })).toBe(false);
  });
});

describe('resolveSpellProjectilePathType names', () => {
  it('maps grenade/throw/linked/homing strings', () => {
    expect(resolveSpellProjectilePathType('grenade')).toBe(ProjectilePath.GRENADE);
    expect(resolveSpellProjectilePathType('throw')).toBe(ProjectilePath.GRENADE);
    expect(resolveSpellProjectilePathType('homing')).toBe(ProjectilePath.HOMING);
    expect(resolveSpellProjectilePathType('linked')).toBe(ProjectilePath.HOMING);
    expect(resolveSpellProjectilePathType('****')).toBe(ProjectilePath.DEFAULT);
  });
});

describe('shouldDelaySpellImpactToLanding', () => {
  it('delays L / W / grenade / proj flag', () => {
    expect(shouldDelaySpellImpactToLanding({ range: 'L' })).toBe(true);
    expect(shouldDelaySpellImpactToLanding({ range: 'W' })).toBe(true);
    expect(shouldDelaySpellImpactToLanding({ range: 'M', projtype: 'grenade' })).toBe(true);
    expect(shouldDelaySpellImpactToLanding({ range: 'M', proj: 1 })).toBe(true);
    expect(shouldDelaySpellImpactToLanding({ range: 'M' })).toBe(false);
  });
});
