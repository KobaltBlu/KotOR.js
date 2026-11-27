/**
 * @jest-environment node
 *
 * The most-damaging weapon picker (GN_EquipAppropriateWeapon) must skip
 * weapons the creature lacks the proficiency feats for, like retail
 * CanEquipItem → CheckProficiencies.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));

import { CreatureEquipmentService } from '@engine/module/creature/CreatureEquipmentService';
import { checkProficienciesPure } from '@engine/menu/action-menu-usable-pure';
import { createTestRuntimeContext } from '@engine/runtime/context';
import { getItemEquipCanUse } from '@engine/games/equipment-menu-utils';
import { ActionEquipItem } from '@engine/actions/ActionEquipItem';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { ActionStatus } from '@core/enums/actions/ActionStatus';
import { GameObjectType } from '@core/enums/module/GameObjectType';
import { ModuleCreatureArmorSlot } from '@core/enums/module/ModuleCreatureArmorSlot';
import { GameState } from '@engine/runtime/GameState';

const FEAT_PROFICIENCY_ALL = 93;
const FEAT_LIGHTSABER = 43;
const FEAT_MELEE = 44;
const SLOT_HANDS = 0x30;

function weapon(tag: string, wield: number, dice: number, die: number, reqFeat: number){
  return {
    tag,
    properties: [] as any[],
    baseItem: {
      weaponWield: wield,
      numDice: dice,
      dieToRoll: die,
      equipableSlots: SLOT_HANDS,
      itemType: 0,
      droidOrHuman: 0,
      denySubrace: 0,
      requiredFeat0: reqFeat,
      requiredFeat1: -1,
      requiredFeat2: -1,
      requiredFeat3: -1,
      requiredFeat4: -1,
    },
  };
}

function makeHost(feats: number[], inventory: any[]){
  return {
    equipment: { RIGHTHAND: undefined as any, LEFTHAND: undefined as any },
    classes: [] as any[],
    race: 6,
    subraceIndex: 0,
    goodEvil: 50,
    getInventory: () => inventory,
    getHasFeat: (id: number) => feats.includes(id),
  };
}

describe('checkProficienciesPure', () => {
  const has = (owned: number[]) => (id: number) => owned.includes(id);

  it('requires every listed feat', () => {
    expect(checkProficienciesPure(SLOT_HANDS, [4, 5, 6, -1, -1], has([4, 5]), false)).toBe(false);
    expect(checkProficienciesPure(SLOT_HANDS, [4, 5, 6, -1, -1], has([4, 5, 6]), false)).toBe(true);
  });

  it('passes with no required feats and fails with no equipable slots', () => {
    expect(checkProficienciesPure(SLOT_HANDS, [-1, -1, -1, -1, -1], has([]), false)).toBe(true);
    expect(checkProficienciesPure(0, [-1, -1, -1, -1, -1], has([]), true)).toBe(false);
  });

  it('Proficiency All bypasses the feat list', () => {
    expect(checkProficienciesPure(SLOT_HANDS, [FEAT_LIGHTSABER], has([]), true)).toBe(true);
  });
});

describe('CreatureEquipmentService most damaging melee', () => {
  const saber = weapon('g_w_dblsbr004', 3, 2, 8, FEAT_LIGHTSABER);
  const vibro = weapon('g_w_vbroshort01', 2, 1, 6, FEAT_MELEE);

  it('skips a lightsaber the creature is not proficient with', () => {
    const host = makeHost([FEAT_MELEE], [saber, vibro]);
    const service = new CreatureEquipmentService(host as any, createTestRuntimeContext());
    expect(service.findMostDamagingMelee()).toBe(vibro);
  });

  it('picks the lightsaber once the creature has the feat', () => {
    const host = makeHost([FEAT_MELEE, FEAT_LIGHTSABER], [saber, vibro]);
    const service = new CreatureEquipmentService(host as any, createTestRuntimeContext());
    expect(service.findMostDamagingMelee()).toBe(saber);
  });

  it('picks the lightsaber with Proficiency All', () => {
    const host = makeHost([FEAT_PROFICIENCY_ALL], [saber, vibro]);
    const service = new CreatureEquipmentService(host as any, createTestRuntimeContext());
    expect(service.findMostDamagingMelee()).toBe(saber);
  });
});

describe('equipment menu canUse', () => {
  const saber = weapon('g_w_lghtsbr01', 2, 2, 8, FEAT_LIGHTSABER);

  it('flags a weapon the creature lacks proficiency for as 2 (cannot equip)', () => {
    const host = makeHost([FEAT_MELEE], []);
    expect(getItemEquipCanUse(saber as any, ModuleCreatureArmorSlot.RIGHTHAND, undefined, undefined, host as any)).toBe(2);
  });

  it('allows it once the creature has the feat', () => {
    const host = makeHost([FEAT_MELEE, FEAT_LIGHTSABER], []);
    expect(getItemEquipCanUse(saber as any, ModuleCreatureArmorSlot.RIGHTHAND, undefined, undefined, host as any)).toBe(1);
  });
});

describe('ActionEquipItem proficiency gate', () => {
  function run(feats: number[]){
    const saber = { ...weapon('g_w_lghtsbr01', 2, 2, 8, FEAT_LIGHTSABER), id: 501, objectType: GameObjectType.Item };
    const equipItem = jest.fn(async () => {});
    const owner = { ...makeHost(feats, [saber]), objectType: GameObjectType.Creature, equipItem, playDrawAnimation: jest.fn() };
    (GameState as any).GameObjectManager = { GetObjectById: (id: number) => (id === 501 ? saber : undefined) };
    const action = new ActionEquipItem();
    action.setParameter(0, ActionParameterType.DWORD, 501);
    action.setParameter(1, ActionParameterType.INT, ModuleCreatureArmorSlot.RIGHTHAND);
    action.setParameter(2, ActionParameterType.INT, 1);
    action.owner = owner as any;
    return { status: action.update(0), equipItem };
  }

  it('refuses to equip without the proficiency feat', () => {
    const { status, equipItem } = run([FEAT_MELEE]);
    expect(status).toBe(ActionStatus.FAILED);
    expect(equipItem).not.toHaveBeenCalled();
  });

  it('equips with the proficiency feat', () => {
    const { status, equipItem } = run([FEAT_LIGHTSABER]);
    expect(status).toBe(ActionStatus.COMPLETE);
    expect(equipItem).toHaveBeenCalledTimes(1);
  });
});
