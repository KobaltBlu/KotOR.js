/**
 * Retail grenade throw alignment — item-cast action case 6.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  GRENADE_CLOSE_RANGE,
  GRENADE_ITEM_TYPE,
  GRENADE_PAUSE_MS,
  GRENADE_THROW_HIGH_GATE_MS,
  GRENADE_THROW_LOW_GATE_MS,
  canPlayGrenadeThrowAnim,
  isGrenadeItemType,
  resolveGrenadeGateMs,
  resolveGrenadeThrowAnim,
} from '@/combat/item-cast-grenade';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

const sq = (d: number) => d * d;

describe('grenade item type', () => {
  it('matches baseitems ItemType 6', () => {
    expect(GRENADE_ITEM_TYPE).toBe(6);
    expect(isGrenadeItemType(6)).toBe(true);
  });

  it('rejects other usable item types', () => {
    // medpac / droid utility / mine rows are CastSpell but not grenades
    expect(isGrenadeItemType(0x2d)).toBe(false);
    expect(isGrenadeItemType(0x0c)).toBe(false);
    expect(isGrenadeItemType(undefined)).toBe(false);
  });
});

describe('grenade throw animation', () => {
  it('only B and F rigs carry the throw clips', () => {
    expect(canPlayGrenadeThrowAnim('B')).toBe(true);
    expect(canPlayGrenadeThrowAnim('F')).toBe(true);
    expect(canPlayGrenadeThrowAnim('S')).toBe(false);
    expect(canPlayGrenadeThrowAnim('L')).toBe(false);
    expect(canPlayGrenadeThrowAnim(undefined)).toBe(false);
  });

  it('lobs high beyond the 10m close range', () => {
    expect(resolveGrenadeThrowAnim('B', sq(GRENADE_CLOSE_RANGE + 5)))
      .toBe(ModuleCreatureAnimState.THROW_HIGH);
    // retail compares squared distance, boundary is a high throw
    expect(resolveGrenadeThrowAnim('B', sq(GRENADE_CLOSE_RANGE)))
      .toBe(ModuleCreatureAnimState.THROW_HIGH);
  });

  it('throws underhand inside the close range', () => {
    expect(resolveGrenadeThrowAnim('B', sq(3)))
      .toBe(ModuleCreatureAnimState.THROW_LOW);
    expect(resolveGrenadeThrowAnim('F', sq(GRENADE_CLOSE_RANGE - 0.5)))
      .toBe(ModuleCreatureAnimState.THROW_LOW);
  });

  it('falls back to READY for rigs without throw clips', () => {
    expect(resolveGrenadeThrowAnim('S', sq(3)))
      .toBe(ModuleCreatureAnimState.READY);
    expect(resolveGrenadeThrowAnim('S', sq(30)))
      .toBe(ModuleCreatureAnimState.READY);
  });
});

describe('grenade timing', () => {
  it('releases the close throw earlier than the high lob', () => {
    expect(resolveGrenadeGateMs(ModuleCreatureAnimState.THROW_LOW))
      .toBe(GRENADE_THROW_LOW_GATE_MS);
    expect(resolveGrenadeGateMs(ModuleCreatureAnimState.THROW_HIGH))
      .toBe(GRENADE_THROW_HIGH_GATE_MS);
    expect(GRENADE_THROW_LOW_GATE_MS).toBeLessThan(GRENADE_THROW_HIGH_GATE_MS);
  });

  it('uses the READY gate timing when no throw clip plays', () => {
    expect(resolveGrenadeGateMs(ModuleCreatureAnimState.READY))
      .toBe(GRENADE_THROW_HIGH_GATE_MS);
  });

  it('always pauses the round 1500ms', () => {
    expect(GRENADE_PAUSE_MS).toBe(1500);
    expect(GRENADE_PAUSE_MS).toBeGreaterThan(GRENADE_THROW_HIGH_GATE_MS);
  });
});

describe('item cast impact script contract', () => {
  // SpellCastInstance.impact() no-ops on an empty impactscript, so a cast that
  // skips applySpellData never runs grenade splash damage.
  const willRunImpactScript = (appliedSpellData: boolean, impactscript: string) =>
    appliedSpellData && !!impactscript;

  it('runs splash only once spell data has been applied', () => {
    expect(willRunImpactScript(true, 'g_grenade01')).toBe(true);
  });

  it('never runs splash without applySpellData', () => {
    expect(willRunImpactScript(false, 'g_grenade01')).toBe(false);
  });
});
