import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/loaders', () => ({ ResourceLoader: {} }));
jest.mock('@/three/odyssey', () => ({ OdysseyModel3D: class {} }));
jest.mock('@/engine/CurrentGame', () => ({ CurrentGame: {} }));
jest.mock('@/utility/GameFileSystem', () => ({ GameFileSystem: {} }));
jest.mock('@/managers/TLKManager', () => ({ TLKManager: { GetStringById: (): undefined => undefined } }));
jest.mock('@/module/ModuleCreature', () => ({
  ModuleCreature: class {
    npcId = -1;
    isPlayer = false;
    constructor(public template: unknown) {}
    save() { return this.template; }
    getPortraitResRef() { return 'duplicate_portrait'; }
  },
}));
jest.mock('@/module/ModulePlayer', () => {
  const { ModuleCreature } = require('@/module/ModuleCreature');
  return { ModulePlayer: class extends ModuleCreature {} };
});

import { PartyManager } from '@/managers/PartyManager';
import { InventoryManager } from '@/managers/InventoryManager';
import { GameState } from '@/GameState';
import { GFFObject } from '@/resource/GFFObject';
import { ModuleCreature } from '@/module/ModuleCreature';
import { ModulePlayer } from '@/module/ModulePlayer';
import { BaseItemType } from '@/enums/combat/BaseItemType';

const state = GameState as any;

class SyntheticItem {
  baseItem = { itemClass: 'ordinary', droidOrHuman: 0, equipableSlots: 0 };
  plot = false;
  constructor(public tag = 'item', public count = 1, public baseId = 10000, public variant = 'plain') {}
  initProperties() {}
  load() {}
  getStackSize() { return this.count; }
  setStackSize(count: number) { this.count = count; }
  getBaseItemId() { return this.baseId; }
  getTag() { return this.tag; }
  getModelVariation() { return 0; }
  canStackWith(other: SyntheticItem) { return this.tag === other.tag && this.variant === other.variant; }
}

beforeEach(() => {
  PartyManager.party = [];
  PartyManager.CurrentMembers = [];
  PartyManager.Player = undefined;
  PartyManager.PlayerTemplate = undefined;
  PartyManager.ActualPlayerTemplate = undefined;
  PartyManager.PortraitOrder = [];
  InventoryManager.inventory = [];
  state.PartyManager = PartyManager;
  state.Module = { ModuleArea: { ModuleItem: SyntheticItem } };
  state.UINotificationManager = { EnableUINotificationIconType: jest.fn() };
});

afterEach(() => jest.restoreAllMocks());

describe('party-state port', () => {
  test('retains the actual player template when a companion temporarily controls the player slot', () => {
    const actualTemplate = new GFFObject();
    const temporaryTemplate = new GFFObject();
    const companion = new ModuleCreature(temporaryTemplate);
    companion.npcId = 2;
    PartyManager.ActualPlayerTemplate = actualTemplate;
    PartyManager.Player = companion;
    PartyManager.SyncPlayerStateTemplates();
    expect(PartyManager.PlayerTemplate).toBe(temporaryTemplate);
    expect(PartyManager.ActualPlayerTemplate).toBe(actualTemplate);
  });

  test('saves live protagonist state and removes stale current members', () => {
    const player = new ModulePlayer(new GFFObject());
    const companion = new ModuleCreature(new GFFObject());
    player.npcId = -1;
    companion.npcId = 2;
    PartyManager.Player = player;
    PartyManager.party = [companion, player];
    PartyManager.CurrentMembers = [{ memberID: 7, isLeader: false }, { memberID: 9, isLeader: true }];
    jest.spyOn(PartyManager, 'SavePartyMember').mockImplementation(() => undefined);
    PartyManager.Save();
    expect(PartyManager.CurrentMembers).toEqual([{ memberID: 2, isLeader: true }]);
    expect(PartyManager.PlayerTemplate).toBe(player.template);
    expect(PartyManager.ActualPlayerTemplate).toBe(player.template);
  });

  test('reconstructs party order using member identity instead of duplicate portraits', () => {
    PartyManager.CurrentMembers = [{ memberID: 2, isLeader: false }, { memberID: 4, isLeader: true }];
    const follower = new ModuleCreature(new GFFObject());
    follower.npcId = 2;
    const leader = new ModuleCreature(new GFFObject());
    leader.npcId = 4;
    expect(PartyManager.GetPlayerStartingPartyIndex()).toBe(1);
    expect(PartyManager.GetCreatureStartingPartyIndex(leader)).toBe(0);
    expect(PartyManager.GetCreatureStartingPartyIndex(follower)).toBe(2);
  });
});

describe('inventory-state port', () => {
  test('merges compatible stacks and keeps distinct variants separate', () => {
    const first = new SyntheticItem('medpack', 2);
    expect(InventoryManager.addItem(first as any)).toBe(first);
    expect(InventoryManager.addItem(new SyntheticItem('medpack', 3) as any)).toBe(first);
    expect(first.count).toBe(5);
    InventoryManager.addItem(new SyntheticItem('medpack', 1, 10000, 'modified') as any);
    expect(InventoryManager.inventory).toHaveLength(2);
    InventoryManager.removeItem(first as any, 2);
    expect(first.count).toBe(3);
    InventoryManager.removeItem(first as any, 3);
    expect(InventoryManager.inventory).toHaveLength(1);
  });

  test('classifies plot-use items as quest items even without the plot flag', () => {
    const questItem = new SyntheticItem('quest');
    questItem.baseItem.itemClass = 'P_PLTUSEITM';
    const normalItem = new SyntheticItem('ordinary');
    InventoryManager.inventory = [questItem, normalItem] as any;
    expect(InventoryManager.getQuestInventory()).toEqual([questItem]);
    expect(InventoryManager.getSellableInventory()).toEqual([normalItem]);
  });

  test('routes credits into party gold rather than a physical inventory stack', () => {
    const addGold = jest.spyOn(PartyManager, 'AddGold').mockImplementation(() => undefined);
    InventoryManager.addItem(new SyntheticItem('credits', 37, BaseItemType.CREDITS) as any);
    expect(addGold).toHaveBeenCalledWith(37);
    expect(InventoryManager.inventory).toHaveLength(0);
  });
});
