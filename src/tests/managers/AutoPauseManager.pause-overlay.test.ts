/**
 * syncPauseOverlay applies pause reason then show/hide.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AutoPauseState } from '@/enums/engine/AutoPauseState';
import { EngineState } from '@/enums/engine/EngineState';

let gameState = EngineState.RUNNING;
let timeStopActive = false;
let overlayVisible = true;
let pauseVisible = false;

const callOrder: string[] = [];
const mockSetPauseReason = jest.fn(() => callOrder.push('setPauseReason'));
const mockShow = jest.fn(() => {
  pauseVisible = true;
  callOrder.push('show');
});
const mockHide = jest.fn(() => {
  pauseVisible = false;
  callOrder.push('hide');
});

jest.mock('@/audio/AudioEngine', () => ({
  AudioEngine: {
    SetSoundMode: jest.fn(),
    GetSoundMode: jest.fn(() => 0),
  },
}));

jest.mock('@/combat/combat-engagement', () => ({
  getClientCombatMode: () => false,
}));

jest.mock('@/GameState', () => ({
  GameState: {
    get State(){ return gameState; },
    set State(v: number){ gameState = v; },
    get timeStopActive(){ return timeStopActive; },
    MenuManager: {
      InGameOverlay: {
        isVisible: () => overlayVisible,
      },
      InGamePause: {
        isVisible: () => pauseVisible,
        setPauseReason: (...args: unknown[]) => mockSetPauseReason(...args),
        show: () => mockShow(),
        hide: () => mockHide(),
      },
    },
  },
}));

import { AutoPauseManager } from '@/managers/AutoPauseManager';

describe('AutoPauseManager.syncPauseOverlay', () => {
  beforeEach(() => {
    gameState = EngineState.RUNNING;
    timeStopActive = false;
    overlayVisible = true;
    pauseVisible = false;
    callOrder.length = 0;
    mockSetPauseReason.mockClear();
    mockShow.mockClear();
    mockHide.mockClear();
    AutoPauseManager.INIConfig = { getProperty: () => 0 } as never;
    AutoPauseManager.Init();
  });

  it('calls setPauseReason before show on first display', () => {
    gameState = EngineState.PAUSED;
    AutoPauseManager.CurrentReason = AutoPauseState.EnemySighted;

    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: true });

    expect(mockSetPauseReason).toHaveBeenCalledWith(AutoPauseState.EnemySighted);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['setPauseReason', 'show']);
  });

  it('refreshes setPauseReason when panel is already visible and reason changes', () => {
    gameState = EngineState.PAUSED;
    pauseVisible = true;
    AutoPauseManager.CurrentReason = AutoPauseState.EnemySighted;

    AutoPauseManager.syncPauseOverlay();
    expect(mockSetPauseReason).toHaveBeenCalledTimes(1);
    expect(mockShow).not.toHaveBeenCalled();

    mockSetPauseReason.mockClear();
    AutoPauseManager.CurrentReason = AutoPauseState.CombatRoundEnd;

    AutoPauseManager.syncPauseOverlay();
    expect(mockSetPauseReason).toHaveBeenCalledWith(AutoPauseState.CombatRoundEnd);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('does not call setPauseReason again while visible if reason is unchanged', () => {
    gameState = EngineState.PAUSED;
    AutoPauseManager.CurrentReason = AutoPauseState.EnemySighted;

    AutoPauseManager.syncPauseOverlay();
    mockSetPauseReason.mockClear();
    mockShow.mockClear();

    AutoPauseManager.syncPauseOverlay();
    expect(mockSetPauseReason).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('hides panel and clears reason latch when unpaused', () => {
    gameState = EngineState.PAUSED;
    AutoPauseManager.CurrentReason = AutoPauseState.EnemySighted;
    AutoPauseManager.syncPauseOverlay();
    pauseVisible = true;

    gameState = EngineState.RUNNING;
    AutoPauseManager.Unpause();
    AutoPauseManager.syncPauseOverlay();

    expect(mockHide).toHaveBeenCalled();
    mockSetPauseReason.mockClear();

    gameState = EngineState.PAUSED;
    AutoPauseManager.CurrentReason = AutoPauseState.EnemySighted;
    AutoPauseManager.syncPauseOverlay();

    expect(mockSetPauseReason).toHaveBeenCalledWith(AutoPauseState.EnemySighted);
  });

  it('requires InGameOverlay when requireInGameOverlay is true', () => {
    gameState = EngineState.PAUSED;
    overlayVisible = false;
    AutoPauseManager.CurrentReason = AutoPauseState.EnemySighted;

    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: true });

    expect(mockSetPauseReason).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('shows pause banner without InGameOverlay when requireInGameOverlay is false', () => {
    gameState = EngineState.PAUSED;
    overlayVisible = false;
    AutoPauseManager.CurrentReason = AutoPauseState.EnemySighted;

    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: false });

    expect(mockSetPauseReason).toHaveBeenCalledWith(AutoPauseState.EnemySighted);
    expect(mockShow).toHaveBeenCalledTimes(1);
  });
});
