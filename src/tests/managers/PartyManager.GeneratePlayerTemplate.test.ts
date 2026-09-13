/**
 * GeneratePlayerTemplate — combat-test PC UTC shape.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { GameEngineType } from '@/enums/engine';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { CombatFeatType } from '@/enums/combat/CombatFeatType';

jest.mock('@/GameState', () => {
  const appearances: any[] = [];
  appearances[177] = { normalhead: 5 };
  appearances[134] = { normalhead: 5 };
  return {
    GameState: {
      GameKey: 'KOTOR',
      ModuleObjectManager: { GetNextPlayerId: () => 0x7fffffff },
      SWRuleSet: {
        creatureAppearances: appearances,
        spells: [
          { id: 4, label: 'FORCE_PUSH' },
          { id: 9, label: 'FORCE_LIGHTNING' },
          { id: 21, label: 'FORCE_HEAL' },
        ],
        expTable: {
          expList: Array.from({ length: 21 }, (_: unknown, i: number) => i * 10000),
        },
      },
    },
  };
});

jest.mock('@/module/ModuleCreature', () => ({
  ModuleCreature: class {},
  createDefaultPartyFollowInfo: () => ({}),
}));
jest.mock('@/module/ModulePlayer', () => ({ ModulePlayer: class {} }));
jest.mock('@/module/guards/isCreature', () => ({ isCreature: () => false }));
jest.mock('@/loaders', () => ({ ResourceLoader: {} }));
jest.mock('@/utility/GameFileSystem', () => ({ GameFileSystem: {} }));
jest.mock('@/engine/CurrentGame', () => ({ CurrentGame: {} }));
jest.mock('@/engine/pathfinding/party-follow-path', () => ({ partyFollowPath: () => {} }));
jest.mock('@/engine/pathfinding/find-safe-location', () => ({ findSafeLocation: () => null }));
jest.mock('@/combat/attack-range', () => ({ getPathPersonalSpace: () => 0.5 }));

import { GameState } from '@/GameState';
import { PartyManager } from '@/managers/PartyManager';

describe('PartyManager.GeneratePlayerTemplate', () => {
  beforeEach(() => {
    (GameState as any).GameKey = GameEngineType.KOTOR;
    PartyManager.PlayerTemplate = undefined as any;
  });

  test('builds a Guardian L20 combat-test UTC with fixed types and feats', () => {
    const tpl = PartyManager.GeneratePlayerTemplate();
    const root = tpl.RootNode;

    expect(root.getFieldByLabel('Race').getType()).toBe(GFFDataType.BYTE);
    expect(root.getFieldByLabel('Race').getValue()).toBe(6);
    expect(root.getFieldByLabel('IsPC').getType()).toBe(GFFDataType.BYTE);
    expect(root.getFieldByLabel('HitPoints').getType()).toBe(GFFDataType.SHORT);
    expect(root.getFieldByLabel('HitPoints').getValue()).toBe(280);
    expect(root.getFieldByLabel('CurrentHitPoints').getValue()).toBe(280);
    expect(root.getFieldByLabel('MaxHitPoints').getValue()).toBe(280);
    expect(root.getFieldByLabel('ForcePoints').getValue()).toBe(200);
    expect(root.getFieldByLabel('CurrentForce').getValue()).toBe(200);
    expect(root.getFieldByLabel('Str').getValue()).toBe(18);
    expect(root.getFieldByLabel('Dex').getValue()).toBe(18);
    expect(root.getFieldByLabel('NaturalAC').getValue()).toBe(5);
    expect(root.getFieldByLabel('Gender').getValue()).toBe(0);
    expect(root.getFieldByLabel('Appearance_Head').getValue()).toBe(5);
    expect(root.getFieldByLabel('Appearance_Type').getValue()).toBe(177);
    expect(root.getFieldByLabel('Experience').getValue()).toBe(190000);

    const classStructs = root.getFieldByLabel('ClassList').getChildStructs();
    expect(classStructs).toHaveLength(1);
    expect(classStructs[0].getFieldByLabel('Class').getValue()).toBe(3);
    expect(classStructs[0].getFieldByLabel('ClassLevel').getValue()).toBe(20);
    expect(classStructs[0].hasField('SpellsPerDayList')).toBe(true);
    const known = classStructs[0].getFieldByLabel('KnownList0').getChildStructs();
    const knownIds = known.map((s) => s.getFieldByLabel('Spell').getValue());
    expect(knownIds).toEqual(expect.arrayContaining([4, 9, 21]));

    const feats = root.getFieldByLabel('FeatList').getChildStructs();
    expect(feats.length).toBeGreaterThan(0);
    const featIds = feats.map((s) => s.getFieldByLabel('Feat').getValue());
    expect(featIds).toContain(CombatFeatType.WEAPON_PROF_LIGHTSABER);
    expect(featIds).toContain(CombatFeatType.MASTER_FLURRY);
    expect(featIds).toContain(CombatFeatType.FORCE_JUMP_MASTERY);

    const skills = root.getFieldByLabel('SkillList').getChildStructs();
    expect(skills).toHaveLength(8);
    expect(skills[0].getFieldByLabel('Rank').getType()).toBe(GFFDataType.BYTE);
    expect(skills[0].getFieldByLabel('Rank').getValue()).toBe(20);
    expect(skills[3].getFieldByLabel('Rank').getValue()).toBe(20);
    expect(skills[7].getFieldByLabel('Rank').getValue()).toBe(20);

    const equip = root.getFieldByLabel('Equip_ItemList').getChildStructs();
    expect(equip).toHaveLength(2);
  });

  test('uses TSL appearance and name when GameKey is TSL', () => {
    (GameState as any).GameKey = GameEngineType.TSL;
    const tpl = PartyManager.GeneratePlayerTemplate();
    expect(tpl.RootNode.getFieldByLabel('Appearance_Type').getValue()).toBe(134);
    expect(tpl.RootNode.getFieldByLabel('PortraitId').getValue()).toBe(10);
  });
});
