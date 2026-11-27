jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    module: undefined as any,
    CutsceneManager: undefined as any,
    Mode: 0,
  },
}));
jest.mock('@engine/audio', () => ({ AudioEngine: {} }));
jest.mock('@engine/render/FollowerCamera', () => ({ FollowerCamera: {} }));
jest.mock('@engine/render/MotionBlurController', () => ({ MotionBlurController: {} }));

import { EngineModeController } from '@engine/runtime/EngineModeController';
import { GameState } from '@engine/runtime/GameState';
import { EngineMode } from '@engine/enums/engine';
import { CutsceneMode } from '@core/enums/dialog/CutsceneMode';

describe('EngineModeController.RestoreEnginePlayMode', () => {
  let setMode: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    setMode = jest.spyOn(EngineModeController, 'SetEngineMode').mockImplementation(() => {});
    (GameState as any).module = { area: { miniGame: undefined } };
    (GameState as any).CutsceneManager = { active: false, dialog: undefined, cutsceneMode: CutsceneMode.DIALOG };
  });

  afterEach(() => jest.restoreAllMocks());

  test('active conversation (e.g. module OnEnter stunt) resumes DIALOG', () => {
    (GameState as any).CutsceneManager = { active: true, dialog: {}, cutsceneMode: CutsceneMode.DIALOG };
    EngineModeController.RestoreEnginePlayMode();
    expect(setMode).toHaveBeenCalledWith(EngineMode.DIALOG);
  });

  test('animated cutscene also resumes DIALOG', () => {
    (GameState as any).CutsceneManager = { active: true, dialog: {}, cutsceneMode: CutsceneMode.ANIMATED };
    EngineModeController.RestoreEnginePlayMode();
    expect(setMode).toHaveBeenCalledWith(EngineMode.DIALOG);
  });

  test('bark does not hold DIALOG', () => {
    (GameState as any).CutsceneManager = { active: true, dialog: {}, cutsceneMode: CutsceneMode.BARK };
    EngineModeController.RestoreEnginePlayMode();
    expect(setMode).toHaveBeenCalledWith(EngineMode.INGAME);
  });

  test('no conversation restores INGAME', () => {
    EngineModeController.RestoreEnginePlayMode();
    expect(setMode).toHaveBeenCalledWith(EngineMode.INGAME);
  });

  test('minigame area without conversation restores MINIGAME', () => {
    (GameState as any).module = { area: { miniGame: {} } };
    EngineModeController.RestoreEnginePlayMode();
    expect(setMode).toHaveBeenCalledWith(EngineMode.MINIGAME);
  });

  test('no module restores GUI even if a stale dialog flag is set', () => {
    (GameState as any).module = undefined;
    (GameState as any).CutsceneManager = { active: true, dialog: {}, cutsceneMode: CutsceneMode.DIALOG };
    EngineModeController.RestoreEnginePlayMode();
    expect(setMode).toHaveBeenCalledWith(EngineMode.GUI);
  });
});
