/**
 * Client combat mode (UI / combat camera) vs ExcitedDuration / SetCombatState timers.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/render/FollowerCamera', () => ({
  FollowerCamera: {
    setCombatCameraActive: jest.fn(),
  },
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    PartyManager: {
      getCurrentPlayer: jest.fn(),
    },
    TwoDAManager: { datatables: new Map() },
  },
}));

import { CombatData } from '@engine/combat/CombatData';
import {
  getClientCombatMode,
  hasLivingCombatTarget,
  setClientCombatMode,
  updateClientCombatMode,
} from '@engine/combat/combat-engagement';
import { FollowerCamera } from '@engine/render/FollowerCamera';
import { GameState } from '@engine/runtime/GameState';

function makeCreature(id: number, opts: { dead?: boolean } = {}){
  const c: any = {
    id,
    clientCombatMode: false,
    combatState: false,
    excitedDuration: 0,
    isDead: () => !!opts.dead,
    combatRound: { newAttackTarget: undefined },
  };
  c.combatData = new CombatData(c);
  return c;
}

describe('client combat mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(undefined);
  });

  it('hasLivingCombatTarget is true for a living attack target', () => {
    const self = makeCreature(1);
    const foe = makeCreature(2);
    self.combatData.lastAttackTarget = foe;
    expect(hasLivingCombatTarget(self)).toBe(true);
  });

  it('hasLivingCombatTarget is false when attack target is dead', () => {
    const self = makeCreature(1);
    const foe = makeCreature(2, { dead: true });
    self.combatData.lastAttackTarget = foe;
    self.combatData.lastAttemptedAttackTarget = foe;
    self.excitedDuration = 10000;
    self.combatData.combatState = true;
    expect(hasLivingCombatTarget(self)).toBe(false);
  });

  it('updateClientCombatMode turns on for living target and off after KO', () => {
    const pc = makeCreature(1);
    const foe = makeCreature(2);
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(pc);
    pc.combatData.lastAttemptedAttackTarget = foe;
    pc.excitedDuration = 10000;
    pc.combatData.combatState = true;

    updateClientCombatMode(pc);
    expect(pc.clientCombatMode).toBe(true);
    expect(getClientCombatMode()).toBe(true);
    expect(FollowerCamera.setCombatCameraActive).toHaveBeenCalledWith(true);

    foe.isDead = () => true;
    updateClientCombatMode(pc);
    expect(pc.clientCombatMode).toBe(false);
    expect(getClientCombatMode()).toBe(false);
    expect(FollowerCamera.setCombatCameraActive).toHaveBeenCalledWith(false);
  });

  it('excitedDuration alone does not keep client combat mode on', () => {
    const pc = makeCreature(1);
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(pc);
    pc.excitedDuration = 10000;
    pc.combatData.combatState = true;
    pc.clientCombatMode = true;

    updateClientCombatMode(pc);
    expect(pc.clientCombatMode).toBe(false);
    expect(getClientCombatMode()).toBe(false);
  });

  it('setClientCombatMode(false) clears mode for clear-all / cancelCombat', () => {
    const pc = makeCreature(1);
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(pc);
    pc.clientCombatMode = true;
    setClientCombatMode(pc, false);
    expect(pc.clientCombatMode).toBe(false);
    expect(FollowerCamera.setCombatCameraActive).toHaveBeenCalledWith(false);
  });

  it('does not drive camera for non-controlled party members', () => {
    const pc = makeCreature(1);
    const companion = makeCreature(3);
    const foe = makeCreature(2);
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(pc);
    companion.combatData.lastAttackTarget = foe;
    setClientCombatMode(companion, true);
    expect(companion.clientCombatMode).toBe(true);
    expect(FollowerCamera.setCombatCameraActive).not.toHaveBeenCalled();
  });
});
