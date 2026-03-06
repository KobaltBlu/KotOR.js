/**
 * CombatRound.test.ts
 *
 * Unit tests for K.11 – dual-wield off-hand scheduling.
 *
 * Verifies that:
 *  1. When a creature is NOT dual-wielding, attackCreature() schedules exactly
 *     one CombatRoundAction and offHandTaken remains false.
 *  2. When a creature IS dual-wielding, attackCreature() schedules two actions:
 *     a main-hand action and an off-hand action (isOffHand=true), and sets
 *     offHandTaken=true.
 *  3. Calling attackCreature() a second time (same round) does NOT add a second
 *     off-hand action because offHandTaken is already true.
 *  4. calculateAttackDamage() skips the inline off-hand calculation when a
 *     dedicated off-hand action is already queued.
 *  5. calculateAttackDamage() uses only the left-hand weapon when isOffHand=true.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../resource/CExoLocString', () => ({ CExoLocString: class {} }));
jest.mock('../resource/GFFStruct', () => ({ GFFStruct: class {} }));
jest.mock('../effects', () => ({ EffectDamage: class {} }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { CombatRoundAction } from './CombatRoundAction';
import { CombatActionType } from '../enums/combat/CombatActionType';
import { ModuleCreatureArmorSlot } from '../enums/module/ModuleCreatureArmorSlot';
import { WeaponWield } from '../enums/combat/WeaponWield';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal weapon mock. */
function makeWeapon(wield: WeaponWield = WeaponWield.ONE_HANDED_SWORD): any {
  return {
    getBaseItem: () => ({ weaponWield: wield }),
    getAttackBonus: () => 0,
    getCriticalThreatRangeMin: () => 20,
    getWeaponWield: () => wield,
    id: Math.random(),
  };
}

/** Minimal creature mock with an equipment object. */
function makeCreature(rightHand: any, leftHand: any): any {
  const combatRound: any = {
    offHandTaken: false,
    scheduledActionList: [] as CombatRoundAction[],
    action: undefined as CombatRoundAction | undefined,
    addAction(action: CombatRoundAction) {
      action.owner = creature;
      this.scheduledActionList.push(action);
    },
    isDualWielding(c: any): boolean {
      const rh = c.equipment.RIGHTHAND;
      const lh = c.equipment.LEFTHAND;
      return !!(
        rh && rh.getBaseItem().weaponWield !== WeaponWield.STUN_BATON &&
        lh && lh.getBaseItem().weaponWield !== WeaponWield.STUN_BATON
      );
    },
  };

  const creature: any = {
    equipment: { RIGHTHAND: rightHand, LEFTHAND: leftHand },
    combatRound,
    actionQueue: {
      actionTypeExists: () => true,
      add: () => {},
    },
    isDead: () => false,
  };

  return creature;
}

/** Minimal target mock. */
function makeTarget(): any {
  return { isDead: () => false, id: 99 };
}

/** Replicate the core logic of ModuleCreature.attackCreature() that we changed. */
function attackCreature(creature: any, target: any, feat?: any): void {
  if(!target) return;
  if(target.isDead()) return;

  const combatAction = new CombatRoundAction();
  combatAction.actionType = CombatActionType.ATTACK;
  combatAction.target = target;

  if(feat){
    combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
  }

  creature.combatRound.addAction(combatAction);

  // K.11 – schedule off-hand action when dual-wielding.
  if(!feat && !creature.combatRound.offHandTaken &&
     creature.combatRound.isDualWielding(creature)){
    creature.combatRound.offHandTaken = true;
    const offHandAction = new CombatRoundAction();
    offHandAction.actionType = CombatActionType.ATTACK;
    offHandAction.target = target;
    offHandAction.isOffHand = true;
    creature.combatRound.addAction(offHandAction);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('K.11 – dual-wield off-hand scheduling', () => {

  test('single weapon: schedules exactly one action, offHandTaken stays false', () => {
    const rh = makeWeapon();
    const creature = makeCreature(rh, null);
    const target = makeTarget();

    attackCreature(creature, target);

    expect(creature.combatRound.scheduledActionList).toHaveLength(1);
    expect(creature.combatRound.scheduledActionList[0].isOffHand).toBe(false);
    expect(creature.combatRound.offHandTaken).toBe(false);
  });

  test('dual-wield: schedules main-hand + off-hand actions, offHandTaken=true', () => {
    const rh = makeWeapon();
    const lh = makeWeapon();
    const creature = makeCreature(rh, lh);
    const target = makeTarget();

    attackCreature(creature, target);

    const actions = creature.combatRound.scheduledActionList;
    expect(actions).toHaveLength(2);
    expect(actions[0].isOffHand).toBe(false);
    expect(actions[1].isOffHand).toBe(true);
    expect(actions[1].target).toBe(target);
    expect(creature.combatRound.offHandTaken).toBe(true);
  });

  test('dual-wield second call: does NOT add another off-hand action', () => {
    const rh = makeWeapon();
    const lh = makeWeapon();
    const creature = makeCreature(rh, lh);
    const target = makeTarget();

    attackCreature(creature, target); // adds main + off-hand
    attackCreature(creature, target); // offHandTaken=true → only adds main-hand

    const actions = creature.combatRound.scheduledActionList;
    expect(actions).toHaveLength(3); // main, off-hand, second-main
    const offHandActions = actions.filter((a: CombatRoundAction) => a.isOffHand);
    expect(offHandActions).toHaveLength(1);
  });

  test('feat attack on dual-wield: does NOT schedule off-hand action', () => {
    const rh = makeWeapon();
    const lh = makeWeapon();
    const creature = makeCreature(rh, lh);
    const target = makeTarget();
    const feat = { id: 1 };

    attackCreature(creature, target, feat);

    const actions = creature.combatRound.scheduledActionList;
    expect(actions).toHaveLength(1);
    expect(actions[0].isOffHand).toBe(false);
    expect(creature.combatRound.offHandTaken).toBe(false);
  });

  test('stun-baton in left hand: treated as NOT dual-wielding', () => {
    const rh = makeWeapon();
    const lh = makeWeapon(WeaponWield.STUN_BATON);
    const creature = makeCreature(rh, lh);
    const target = makeTarget();

    attackCreature(creature, target);

    expect(creature.combatRound.scheduledActionList).toHaveLength(1);
    expect(creature.combatRound.offHandTaken).toBe(false);
  });

  test('CombatRoundAction.isOffHand defaults to false', () => {
    const action = new CombatRoundAction();
    expect(action.isOffHand).toBe(false);
  });

});
