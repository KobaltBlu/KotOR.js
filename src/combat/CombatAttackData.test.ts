/**
 * CombatAttackData.test.ts
 *
 * Unit tests for CombatAttackData.calculateDamage() focusing on:
 *  1. Sneak attack bonus dice are applied when sneakAttack=true and attacker has the feat.
 *  2. Sneak attack dice scale with feat tier (1d6 → 10d6).
 *  3. Sneak attack dice are NOT applied when sneakAttack=false.
 *  4. Sneak attack dice are NOT applied for simple creatures.
 *  5. getSneakAttackDiceCount() returns the correct tier.
 *
 * Heavy engine modules are mocked so no real game state is needed.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

// ---------------------------------------------------------------------------
// Module mocks – must come before any import of modules under test.
// ---------------------------------------------------------------------------

jest.mock('../effects', () => ({ EffectDamage: class {} }));
jest.mock('../resource/CExoLocString', () => ({ CExoLocString: class {} }));
jest.mock('../resource/GFFStruct', () => ({ GFFStruct: class {} }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { CombatAttackData } from './CombatAttackData';
import { CombatFeatType } from '../enums/combat/CombatFeatType';
import { DamageType } from '../enums/combat/DamageType';
import { AttackResult } from '../enums/combat/AttackResult';
import { WeaponType } from '../enums/combat/WeaponType';
import { WeaponWield } from '../enums/combat/WeaponWield';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Initial value of a CombatAttackDamage slot that has never had damage applied.
 * Sentinel meaning "no damage yet".
 */
const NO_DAMAGE_APPLIED = -1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal creature mock that has exactly the given feats. */
function makeCreature(featIds: CombatFeatType[], isSimple = false): any {
  return {
    getHasFeat: (id: CombatFeatType) => featIds.includes(id),
    isSimpleCreature: () => isSimple,
    getSTR: () => 10,
  };
}

/** Build a minimal weapon mock. */
function makeWeapon(baseDamage = 6, weaponType = WeaponType.SLASHING, weaponWield = WeaponWield.ONE_HANDED_SWORD): any {
  return {
    getBaseDamage:      () => baseDamage,
    getBaseDamageType:  () => DamageType.SLASHING,
    hasDamageBonus:     () => false,
    getDamageBonusType: () => DamageType.BASE,
    getDamageBonus:     () => 0,
    getWeaponType:      () => weaponType,
    getWeaponWield:     () => weaponWield,
    getMonsterDamage:   () => baseDamage,
    baseItem:           { criticalHitMultiplier: 2.0 },
  };
}

/** Build a minimal target mock. */
function makeTarget(hp = 100): any {
  return { getHP: () => hp };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CombatAttackData – sneak attack damage', () => {

  // -------------------------------------------------------------------------
  it('adds no sneak attack damage when sneakAttack is false', () => {
    const data = new CombatAttackData();
    data.attackResult = AttackResult.HIT_SUCCESSFUL;
    data.reactObject  = makeTarget();
    data.attackWeapon = makeWeapon(4);
    data.sneakAttack  = false;

    const creature = makeCreature([CombatFeatType.SNEAK_ATTACK_3D6]);
    data.calculateDamage(creature, false);

    // PHYSICAL slot should still be untouched (no STR bonus, no sneak)
    expect(data.damageList[DamageType.PHYSICAL].damageValue).toBe(NO_DAMAGE_APPLIED);
  });

  // -------------------------------------------------------------------------
  it('adds no sneak attack damage for simple creatures even when sneakAttack=true', () => {
    const data = new CombatAttackData();
    data.attackResult = AttackResult.HIT_SUCCESSFUL;
    data.reactObject  = makeTarget();
    data.attackWeapon = makeWeapon(4);
    data.sneakAttack  = true;

    const creature = makeCreature([CombatFeatType.SNEAK_ATTACK_3D6], /* isSimple */ true);
    data.calculateDamage(creature, false);

    // Simple creatures use getMonsterDamage() path which skips sneak attack
    expect(data.damageList[DamageType.PHYSICAL].damageValue).toBe(NO_DAMAGE_APPLIED);
  });

  // -------------------------------------------------------------------------
  it('adds sneak attack damage when sneakAttack=true and creature has SNEAK_ATTACK_1D6', () => {
    const data = new CombatAttackData();
    data.attackResult = AttackResult.HIT_SUCCESSFUL;
    data.reactObject  = makeTarget(1000); // very high HP so no killingBlow interference
    data.attackWeapon = makeWeapon(4);
    data.sneakAttack  = true;

    const creature = makeCreature([CombatFeatType.SNEAK_ATTACK_1D6]);
    data.calculateDamage(creature, false);

    // With 1d6 sneak attack, PHYSICAL damage must be between 1 and 6 (inclusive).
    const physDmg = data.damageList[DamageType.PHYSICAL].damageValue;
    expect(physDmg).toBeGreaterThanOrEqual(1);
    expect(physDmg).toBeLessThanOrEqual(6);
  });

  // -------------------------------------------------------------------------
  it('uses the highest sneak attack feat tier when multiple tiers are present', () => {
    // Give the creature both 1d6 and 3d6 feats – should roll 3d6.
    const data = new CombatAttackData();
    data.attackResult = AttackResult.HIT_SUCCESSFUL;
    data.reactObject  = makeTarget(1000);
    data.attackWeapon = makeWeapon(4);
    data.sneakAttack  = true;

    const creature = makeCreature([
      CombatFeatType.SNEAK_ATTACK_1D6,
      CombatFeatType.SNEAK_ATTACK_3D6,
    ]);
    data.calculateDamage(creature, false);

    // 3d6 sneak damage: minimum 3, maximum 18.
    const physDmg = data.damageList[DamageType.PHYSICAL].damageValue;
    expect(physDmg).toBeGreaterThanOrEqual(3);
    expect(physDmg).toBeLessThanOrEqual(18);
  });

  // -------------------------------------------------------------------------
  it('adds no sneak attack damage when creature has no sneak feat', () => {
    const data = new CombatAttackData();
    data.attackResult = AttackResult.HIT_SUCCESSFUL;
    data.reactObject  = makeTarget(1000);
    data.attackWeapon = makeWeapon(4);
    data.sneakAttack  = true;

    // Creature with no sneak feats at all
    const creature = makeCreature([]);
    data.calculateDamage(creature, false);

    expect(data.damageList[DamageType.PHYSICAL].damageValue).toBe(NO_DAMAGE_APPLIED);
  });

});

describe('CombatAttackData.getSneakAttackDiceCount', () => {

  it('returns 0 when no sneak feat is present', () => {
    const creature = makeCreature([]);
    expect(CombatAttackData.getSneakAttackDiceCount(creature)).toBe(0);
  });

  it('returns 1 for SNEAK_ATTACK_1D6', () => {
    const creature = makeCreature([CombatFeatType.SNEAK_ATTACK_1D6]);
    expect(CombatAttackData.getSneakAttackDiceCount(creature)).toBe(1);
  });

  it('returns 10 for SNEAK_ATTACK_10D6', () => {
    const creature = makeCreature([CombatFeatType.SNEAK_ATTACK_10D6]);
    expect(CombatAttackData.getSneakAttackDiceCount(creature)).toBe(10);
  });

  it('returns the highest tier when multiple tiers coexist', () => {
    // 5d6 and 2d6 present → should return 5
    const creature = makeCreature([
      CombatFeatType.SNEAK_ATTACK_2D6,
      CombatFeatType.SNEAK_ATTACK_5D6,
    ]);
    expect(CombatAttackData.getSneakAttackDiceCount(creature)).toBe(5);
  });

});
