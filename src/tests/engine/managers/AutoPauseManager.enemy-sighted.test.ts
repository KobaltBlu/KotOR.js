/**
 * Enemy/Mine Sighted auto-pause gates on client combat mode (not combatState).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

let gameState = 0;
let engineMode = 1;
let clientCombatMode = false;
let combatState = false;
const mockSetPauseReason = jest.fn();

jest.mock('@engine/audio/AudioEngine', () => ({
  AudioEngine: {
    SetSoundMode: jest.fn(),
    GetSoundMode: jest.fn(() => 0),
  },
}));

jest.mock('@engine/combat/combat-engagement', () => ({
  getClientCombatMode: () => clientCombatMode,
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    get State(){ return gameState; },
    set State(v: number){ gameState = v; },
    get Mode(){ return engineMode; },
    set Mode(v: number){ engineMode = v; },
    PartyManager: {
      getCurrentPlayer: () => ({
        combatData: { combatState },
        clientCombatMode,
      }),
    },
    MenuManager: {
      InGamePause: {
        setPauseReason: (...args: unknown[]) => mockSetPauseReason(...args),
      },
    },
  },
}));

import { AutoPauseManager } from '@engine/managers/AutoPauseManager';
import { AutoPauseState } from '@engine/enums/engine/AutoPauseState';
import { EngineMode } from '@engine/enums/engine/EngineMode';
import { EngineState } from '@engine/enums/engine/EngineState';

describe('AutoPauseManager EnemySighted combat gate', () => {
  beforeEach(() => {
    gameState = EngineState.RUNNING;
    engineMode = EngineMode.INGAME;
    clientCombatMode = false;
    combatState = false;
    mockSetPauseReason.mockClear();
    AutoPauseManager.AutoPauseEnabled.EnemySighted = true;
    AutoPauseManager.AutoPauseEnabled.MineSighted = true;
    AutoPauseManager.enemySightedLatchUntil = 0;
    AutoPauseManager.AutoPaused = false;
    AutoPauseManager.CurrentReason = AutoPauseState.Generic;
  });

  it('allows EnemySighted when combatState is true but client combat mode is false', () => {
    combatState = true;
    clientCombatMode = false;

    const ok = AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.EnemySighted);

    expect(ok).toBe(true);
    expect(mockSetPauseReason).not.toHaveBeenCalled();
    expect(gameState).toBe(EngineState.PAUSED);
  });

  it('blocks EnemySighted when client combat mode is true', () => {
    combatState = true;
    clientCombatMode = true;

    const ok = AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.EnemySighted);

    expect(ok).toBe(false);
    expect(mockSetPauseReason).not.toHaveBeenCalled();
    expect(gameState).toBe(EngineState.RUNNING);
  });

  it('blocks MineSighted when client combat mode is true', () => {
    combatState = false;
    clientCombatMode = true;

    const ok = AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.MineSighted);

    expect(ok).toBe(false);
    expect(mockSetPauseReason).not.toHaveBeenCalled();
  });
});
