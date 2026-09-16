/**
 * getActivePlayer / getPCIteratorList — living PC over orphaned Player.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    GameKey: 'KOTOR',
    ModuleObjectManager: { GetNextPlayerId: () => 0x7fffffff },
    SWRuleSet: { creatureAppearances: [], spells: [], expTable: { expList: [] } },
    module: undefined,
  },
}));

jest.mock('@/module/ModuleCreature', () => ({
  ModuleCreature: class {},
  createDefaultPartyFollowInfo: () => ({}),
}));
jest.mock('@/module/ModulePlayer', () => ({ ModulePlayer: class {} }));
jest.mock('@/module/guards/isCreature', () => ({ isCreature: () => false }));
jest.mock('@/loaders', () => ({ ResourceLoader: {} }));
jest.mock('@/utility/GameFileSystem', () => ({ GameFileSystem: {} }));
jest.mock('@/engine/CurrentGame', () => ({ CurrentGame: {} }));
jest.mock('@/engine/pathfinding/party-follow-path', () => ({
  partyFollowPath: Object.assign(() => {}, { reset: jest.fn() }),
}));
jest.mock('@/engine/pathfinding/open-walk-location', () => ({ findOpenWalkLocation: () => null }));
jest.mock('@/combat/attack-range', () => ({ getPathPersonalSpace: () => 0.5 }));

import { PartyManager } from '@/managers/PartyManager';

function makeCreature(opts: {
  id: number;
  isPlayer?: boolean;
  npcId?: number;
  dead?: boolean;
  destroyed?: boolean;
}) {
  return {
    id: opts.id,
    isPlayer: !!opts.isPlayer,
    npcId: opts.npcId ?? (opts.isPlayer ? -1 : 0),
    isPM: true,
    destroyed: !!opts.destroyed,
    isDead: () => !!opts.dead,
    getPortraitResRef: () => '',
    portrait: undefined,
  } as any;
}

describe('PartyManager.getActivePlayer', () => {
  beforeEach(() => {
    PartyManager.party = [];
    PartyManager.Player = undefined as any;
  });

  test('prefers living party[0] PC over orphaned dead Player', () => {
    const living = makeCreature({ id: 647, isPlayer: true });
    const stale = makeCreature({ id: 645, isPlayer: true, dead: true });
    PartyManager.party = [living];
    PartyManager.Player = stale;
    expect(PartyManager.getActivePlayer()).toBe(living);
  });

  test('falls back to living Player in party when leader is CNPC', () => {
    const carth = makeCreature({ id: 224, isPlayer: false, npcId: 2 });
    const pc = makeCreature({ id: 1, isPlayer: true });
    PartyManager.party = [carth, pc];
    PartyManager.Player = pc;
    expect(PartyManager.getActivePlayer()).toBe(pc);
  });

  test('getPCIteratorList returns living party[0] when Player is orphaned/dead', () => {
    const living = makeCreature({ id: 647, isPlayer: true });
    const stale = makeCreature({ id: 645, isPlayer: true, dead: true });
    PartyManager.party = [living];
    PartyManager.Player = stale;
    expect(PartyManager.getPCIteratorList()).toEqual([living]);
  });

  test('syncPlayerToActivePartyPC heals orphaned dead Player to party[0]', () => {
    const living = makeCreature({ id: 647, isPlayer: true });
    const stale = makeCreature({ id: 645, isPlayer: true, dead: true });
    PartyManager.party = [living];
    PartyManager.Player = stale;
    PartyManager.syncPlayerToActivePartyPC();
    expect(PartyManager.Player).toBe(living);
  });

  test('syncPlayerToActivePartyPC no-ops when CNPC is party leader', () => {
    const carth = makeCreature({ id: 224, isPlayer: false, npcId: 2 });
    const pc = makeCreature({ id: 1, isPlayer: true });
    PartyManager.party = [carth, pc];
    PartyManager.Player = pc;
    PartyManager.syncPlayerToActivePartyPC();
    expect(PartyManager.Player).toBe(pc);
  });

  test('MakePlayerLeader rebinds orphaned Player then promotes PC over CNPC', () => {
    const carth = makeCreature({ id: 224, isPlayer: false, npcId: 2 });
    carth.position = { x: 10, y: 20, z: 0, clone() { return { ...this }; } };
    carth.setPosition = jest.fn((p: any) => { Object.assign(carth.position, p); });
    const pc = makeCreature({ id: 647, isPlayer: true });
    pc.position = { x: 100, y: 200, z: 0, clone() { return { ...this }; } };
    pc.setPosition = jest.fn((p: any) => { Object.assign(pc.position, p); });
    const stale = makeCreature({ id: 645, isPlayer: true, dead: true });
    stale.position = { x: 0, y: 0, z: 0, clone() { return { ...this }; } };

    PartyManager.party = [carth, pc];
    PartyManager.Player = stale; // not in party
    PartyManager.CurrentMembers = [
      { isLeader: true, memberID: 2 },
    ];
    PartyManager.MakePlayerLeader(true);

    expect(PartyManager.Player).toBe(pc);
    expect(PartyManager.party[0]).toBe(pc);
    expect(PartyManager.party[1]).toBe(carth);
    expect(pc.setPosition).toHaveBeenCalled();
    expect(carth.setPosition).toHaveBeenCalled();
  });
});

/**
 * k_ptar_alertzelk InitConversation gate:
 * JumpToObject runs only when GetFirstPC() != GetPartyMemberByIndex(0).
 */
describe('PartyManager alertzelk GetFirstPC vs party[0] gate', () => {
  beforeEach(() => {
    PartyManager.party = [];
    PartyManager.Player = undefined as any;
  });

  test('PC party leader: GetFirstPC === party[0] (no JumpToObject branch)', () => {
    const pc = makeCreature({ id: 1, isPlayer: true, npcId: -1 });
    const carth = makeCreature({ id: 2, isPlayer: false, npcId: 2 });
    PartyManager.party = [pc, carth];
    PartyManager.Player = pc;
    expect(PartyManager.getFirstPC()).toBe(pc);
    expect(PartyManager.getFirstPC()).toBe(PartyManager.party[0]);
  });

  test('Carth party leader: GetFirstPC !== party[0] (JumpToObject branch)', () => {
    const carth = makeCreature({ id: 2, isPlayer: false, npcId: 2 });
    const pc = makeCreature({ id: 1, isPlayer: true, npcId: -1 });
    PartyManager.party = [carth, pc];
    PartyManager.Player = pc;
    expect(PartyManager.party[0]).toBe(carth);
    expect(PartyManager.getFirstPC()).toBe(pc);
    expect(PartyManager.getFirstPC()).not.toBe(PartyManager.party[0]);
  });
});

