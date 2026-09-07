/**
 * item-cast item-type timing table.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  ITEM_CAST_DEFAULT_ANIM,
  ITEM_CAST_FOREARM_GATE_MS,
  ITEM_CAST_FOREARM_PAUSE_MS,
  ITEM_CAST_MEDICAL_GATE_MS,
  ITEM_CAST_MEDICAL_PAUSE_MS,
  itemCastAnimPlaysOnTarget,
  resolveActivateItemAnim,
  resolveItemCastTiming,
  resolveMedicalInjectAnim,
} from '@/combat/item-cast-timing';
import { ItemTypeCategory } from '@/engine/menu/action-menu-usable-pure';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

describe('resolveMedicalInjectAnim', () => {
  it('uses INJECT for B/F rigs', () => {
    expect(resolveMedicalInjectAnim('B')).toBe(ModuleCreatureAnimState.INJECT);
    expect(resolveMedicalInjectAnim('F')).toBe(ModuleCreatureAnimState.INJECT);
  });

  it('falls back to READY otherwise', () => {
    expect(resolveMedicalInjectAnim('S')).toBe(ModuleCreatureAnimState.READY);
  });
});

describe('resolveActivateItemAnim', () => {
  it('uses ACTIVATE_ITEM2 for B/F rigs', () => {
    expect(resolveActivateItemAnim('B')).toBe(ModuleCreatureAnimState.ACTIVATE_ITEM2);
  });
});

describe('itemCastAnimPlaysOnTarget', () => {
  it('matches engine types 0x19 / 0x2d / 0x2f only', () => {
    expect(itemCastAnimPlaysOnTarget(ItemTypeCategory.OTHER)).toBe(true);
    expect(itemCastAnimPlaysOnTarget(ItemTypeCategory.MEDICAL_A)).toBe(true);
    expect(itemCastAnimPlaysOnTarget(ItemTypeCategory.MEDICAL_B)).toBe(true);
    expect(itemCastAnimPlaysOnTarget(ItemTypeCategory.MEDICAL_C)).toBe(false);
    expect(itemCastAnimPlaysOnTarget(ItemTypeCategory.GRENADE)).toBe(false);
    expect(itemCastAnimPlaysOnTarget(ItemTypeCategory.FOREARM_BANDS)).toBe(false);
  });
});

describe('resolveItemCastTiming', () => {
  it('keeps grenade throw timing', () => {
    const t = resolveItemCastTiming(6, 'B', 25, 1330);
    expect(t.grenade).toBe(true);
    expect(t.animation).toBe(ModuleCreatureAnimState.THROW_LOW);
    expect(t.animOnTarget).toBe(false);
    expect(t.pauseMs).toBe(1500);
  });

  it('uses INJECT + 750/1500 for medpac ItemType 0x2d', () => {
    const t = resolveItemCastTiming(ItemTypeCategory.MEDICAL_A, 'B', 0, 1330);
    expect(t.grenade).toBe(false);
    expect(t.animation).toBe(ModuleCreatureAnimState.INJECT);
    expect(t.animOnTarget).toBe(true);
    expect(t.gateMs).toBe(ITEM_CAST_MEDICAL_GATE_MS);
    expect(t.pauseMs).toBe(ITEM_CAST_MEDICAL_PAUSE_MS);
  });

  it('uses ACTIVATE_ITEM2 + 600/1000 for forearm bands', () => {
    const t = resolveItemCastTiming(ItemTypeCategory.FOREARM_BANDS, 'B', 0, 1330);
    expect(t.animation).toBe(ModuleCreatureAnimState.ACTIVATE_ITEM2);
    expect(t.gateMs).toBe(ITEM_CAST_FOREARM_GATE_MS);
    expect(t.pauseMs).toBe(ITEM_CAST_FOREARM_PAUSE_MS);
    expect(t.animOnTarget).toBe(false);
  });

  it('defaults to CASTOUT1_LP with casttime+1 pause', () => {
    const t = resolveItemCastTiming(999, 'B', 0, 1330);
    expect(t.animation).toBe(ITEM_CAST_DEFAULT_ANIM);
    expect(t.gateMs).toBe(1);
    expect(t.pauseMs).toBe(1331);
  });

  it('droid utility uses 0x2AF9/0x2AFA and exposes post-impact hold', () => {
    const t = resolveItemCastTiming(ItemTypeCategory.DROID_UTILITY, 'S', 0, 1330);
    expect(t.animation).toBe(ModuleCreatureAnimState.DROID_UTILITY_USE);
    expect(t.postImpactAnim).toBe(ModuleCreatureAnimState.DROID_UTILITY_USE_LP);
    expect(t.gateMs).toBe(300);
    expect(t.pauseMs).toBe(1500);
  });

  it('MEDICAL_C injects on caster, not target', () => {
    const t = resolveItemCastTiming(ItemTypeCategory.MEDICAL_C, 'B', 0, 1330);
    expect(t.animation).toBe(ModuleCreatureAnimState.INJECT);
    expect(t.animOnTarget).toBe(false);
  });
});
