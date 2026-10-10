/**
 * Creature serializer owns nested hydration DTOs and savegame-only records.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: { PartyManager: { ControlledNPC: -1 } },
}));

import * as THREE from 'three';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import { creatureSerializer } from '@engine/module/serialization/CreatureSerializer';
import { createDefaultPartyFollowInfoDto } from '@engine/module/serialization/PartyFollowInfoSerializer';
import { createEmptyLevelStatRecord } from '@engine/rules/level-up';

function addListEntry(gff: GFFObject, label: string, entry: GFFStruct): void {
  gff.RootNode.addField(new GFFField(GFFDataType.LIST, label)).addChildStruct(entry);
}

function makeTarget(): any {
  return {
    initialized: false,
    scriptResRefs: {},
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    listeningPatterns: [],
    levelStats: [],
    skills: [],
    perceptionList: [],
    scriptVarTable: { loadFromListField: (): void => undefined },
    combatInformation: { fromStruct: () => false, arcaneSpellFail: 0 },
    combatRound: { fromStruct: () => false },
    setListening(value: number) { this.isListening = value; },
    setCommadable(value: number) { this.commandable = value; },
    setLocalBoolean: (): void => undefined,
    setLocalNumber: (): void => undefined,
  };
}

describe('CreatureSerializer', () => {
  it('deserializes nested lists, animation, and creature scalars into runtime DTO fields', () => {
    const gff = new GFFObject();
    const expression = new GFFStruct(5);
    expression.addField(new GFFField(GFFDataType.CEXOSTRING, 'ExpressionString'))
      .setValue('listen_test');
    expression.addField(new GFFField(GFFDataType.INT, 'ExpressionId')).setValue(9);
    addListEntry(gff, 'ExpressionList', expression);

    const follow = new GFFStruct(0);
    follow.addField(new GFFField(GFFDataType.DWORD, 'FollowObject')).setValue(0x1111);
    gff.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'FollowInfo'))
      .addChildStruct(follow);

    const level = new GFFStruct(0);
    level.addField(new GFFField(GFFDataType.BYTE, 'LvlStatClass')).setValue(2);
    level.addField(new GFFField(GFFDataType.BYTE, 'LvlStatHitDie')).setValue(8);
    addListEntry(gff, 'LvlStatList', level);

    const equipped = new GFFStruct(0x08);
    equipped.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x2222);
    addListEntry(gff, 'Equip_ItemList', equipped);
    const carried = new GFFStruct(0);
    carried.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x3333);
    addListEntry(gff, 'ItemList', carried);

    gff.RootNode.addField(new GFFField(GFFDataType.INT, 'Animation')).setValue(42);
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Deity')).setValue('The Force');
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description'));
    gff.RootNode.addField(new GFFField(GFFDataType.INT, 'JoiningXP')).setValue(1200);
    gff.RootNode.addField(new GFFField(GFFDataType.INT, 'PlayerCreated')).setValue(1);

    const target = makeTarget();
    creatureSerializer.deserialize(target, gff);

    expect(target._pendingListeningPatterns).toEqual([
      { pattern: 'listen_test', number: 9 },
    ]);
    expect(target.partyFollowInfo.followObject).toBe(0x1111);
    expect(target.levelStats[0]).toMatchObject({ classId: 2, hpChange: 8 });
    expect(target._pendingEquipmentEntries[0]).toMatchObject({
      slotType: 0x08,
      objectId: 0x2222,
    });
    expect(target._pendingInventoryEntries[0].objectId).toBe(0x3333);
    expect(target._pendingAnimation).toBe(42);
    expect(target.deity).toBe('The Force');
    expect(target.joiningXP).toBe(1200);
    expect(target.playerCreated).toBe(true);
  });

  it('round-trips FollowInfo and LvlStatList through creature serialization', () => {
    const follow = createDefaultPartyFollowInfoDto();
    follow.followObject = 0x4444;
    follow.followLocation.set(1, 2, 3);
    follow.maxSpeed = 4.5;
    const level = createEmptyLevelStatRecord();
    level.classId = 3;
    level.hpChange = 7;
    level.fpChange = 5;
    level.feats.push(12);

    const skills = Array.from({ length: 8 }, () => ({
      save: () => new GFFStruct(0),
    }));
    const values: Record<string, any> = {
      id: 1,
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      animationState: { index: 10000 },
      classes: [],
      feats: [],
      skills,
      inventory: [],
      effects: [],
      specialAbilities: [],
      perceptionList: [],
      scripts: {},
      scriptResRefs: {},
      scriptVarTable: { writeToListField: (): void => undefined },
      combatInformation: { toStruct: (type: number) => new GFFStruct(type) },
      combatRound: { roundStarted: false },
      listeningPatterns: [],
      partyFollowInfo: follow,
      levelStats: [level],
      isPM: true,
      isPC: 1,
      playerCreated: true,
      GetItemInSlot: (): undefined => undefined,
    };
    const source = new Proxy(values, {
      get(target, property: string | symbol) {
        if (property in target) return target[property as string];
        if (typeof property === 'symbol') return undefined;
        if (/^(get|is|has|sync)/.test(property)) return () => 0;
        return 0;
      },
    });

    const omitted = creatureSerializer.serialize(source as any, {
      controlledNpcIndex: 0,
    });
    expect(omitted.RootNode.hasField('LvlStatList')).toBe(false);

    const explicitlyIncluded = creatureSerializer.serialize(source as any, {
      controlledNpcIndex: 0,
      includePcLevelStats: true,
    });
    expect(explicitlyIncluded.RootNode.hasField('LvlStatList')).toBe(true);

    const saved = creatureSerializer.serialize(source as any);
    const hydrated = makeTarget();
    creatureSerializer.deserialize(hydrated, saved);

    expect(hydrated.partyFollowInfo.followObject).toBe(0x4444);
    expect(hydrated.partyFollowInfo.followLocation.toArray()).toEqual([1, 2, 3]);
    expect(hydrated.partyFollowInfo.maxSpeed).toBeCloseTo(4.5);
    expect(hydrated.levelStats[0]).toMatchObject({
      classId: 3,
      hpChange: 7,
      fpChange: 5,
      feats: [12],
    });
  });
});
