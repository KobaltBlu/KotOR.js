/**
 * trySetAnimatedCamera play-mode flags (IsLoopingDialogStuntAnimation parity).
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { AuroraAnimationFlag } from '@core/enums/animation/AuroraAnimationFlag';
import { CameraMode } from '@core/enums/dialog/CameraMode';

const playAnimation = jest.fn();
const animMap = new Map<string, { name: string }>();

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    currentCamera: null,
    camera_animated: {
      near: 0,
      far: 0,
      fov: 55,
      updateProjectionMatrix() {},
    },
    TwoDAManager: { datatables: new Map() },
    PartyManager: { party: [], ControlledNPC: -1 },
    MenuManager: {},
    VideoEffectManager: { SetVideoEffect: jest.fn() },
    FadeOverlayManager: {},
    CutsceneManager: {},
    Mode: 0,
    Flags: { EnableOverride: false },
    GameKey: 0,
    module: { area: { id: 1, cameras: [], doors: [] } },
    camera_dialog: {
      position: { copy() {} },
      quaternion: { copy() {} },
      up: { set() {} },
      rotation: { setFromQuaternion() {} },
      updateProjectionMatrix() {},
      fov: 55,
    },
  },
}));

jest.mock('@engine/runtime/EngineModeController', () => ({
  EngineModeController: {
    SetEngineMode: jest.fn(),
    RestoreEnginePlayMode: jest.fn(),
  },
}));

jest.mock('@engine/debug/GameDebuggerBridge', () => ({
  GameDebuggerBridge: {
    sendInspectorSnapshot: jest.fn(),
    attach: jest.fn(),
  },
}));

jest.mock('@engine/render/OdysseyRenderPipeline', () => ({
  OdysseyRenderPipeline: {
    renderFrame: jest.fn(),
  },
}));



jest.mock('@engine/audio/AudioLoader', () => ({ AudioLoader: {} }));
jest.mock('@engine/audio/AudioEngine', () => ({
  AudioEngine: {
    GetAudioEngine: () => null,
    GetSoundMode: () => 0,
    SetSoundMode: jest.fn(),
    ensureGameBusesAudible: jest.fn(),
  },
}));
jest.mock('@engine/audio/AudioEmitter', () => ({
  AudioEmitter: class {
    setVolume() { return this; }
    setMaxDistance() {}
  },
}));
jest.mock('@core/filesystem/ConfigClient', () => ({ ConfigClient: { get: jest.fn() } }));
jest.mock('@engine/controls/Mouse', () => ({ Mouse: {} }));
jest.mock('@engine/managers/ResolutionManager', () => ({
  ResolutionManager: { addResolution: () => {} },
}));
jest.mock('@engine/render/aurora-camera-orientation', () => ({
  auroraCameraLookOrientation: jest.fn(),
}));
jest.mock('@engine/render/three/odyssey/OdysseyModel3D', () => {
  return {
    OdysseyModel3D: class OdysseyModel3D {
      odysseyAnimationMap = animMap;
      animationManager = { playAnimation };
    },
  };
});
jest.mock('@engine/dialog/DLGObject', () => ({ DLGObject: class {} }));
jest.mock('@engine/dialog/DLGNode', () => ({
  DLGNode: class {
    static WAIT_CAMERA = 0x01;
    static WAIT_VOICE = 0x02;
    static WAIT_ANIM = 0x04;
    static WAIT_FADE = 0x08;
    static WAIT_EXPLICIT_DELAY = 0x10;
  },
}));

import { CutsceneManager } from '@engine/managers/CutsceneManager';
import { OdysseyModel3D } from '@engine/render/three/odyssey/OdysseyModel3D';
import { GameState } from '@engine/runtime/GameState';

describe('CutsceneManager.trySetAnimatedCamera play flags', () => {
  beforeEach(() => {
    playAnimation.mockClear();
    animMap.clear();
    CutsceneManager.dialog = {
      animatedCamera: new OdysseyModel3D(),
    } as any;
    CutsceneManager.currentEntry = {
      checkList: { cameraAnimationComplete: true },
    } as any;
    CutsceneManager.cameraState = {
      mode: CameraMode.DIALOG,
      cameraAnimation: -1,
      currentCameraAnimation: undefined,
      currentCameraAnimationElapsed: 0,
      camFieldOfView: -1,
      listener: { participant: undefined },
      speaker: { participant: undefined },
    } as any;
    jest.spyOn(CutsceneManager, 'bindCameraParticipantsFromActiveNode').mockImplementation(() => {});
  });

  test('base CUT id 1000 plays FIRE_FORGET (one-shot)', () => {
    const anim = { name: 'cut001' };
    animMap.set('cut001', anim);
    expect(CutsceneManager.trySetAnimatedCamera(1000)).toBe(true);
    expect(playAnimation).toHaveBeenCalledWith(
      anim,
      AuroraAnimationFlag.FIRE_FORGET,
      expect.objectContaining({ loop: false })
    );
    expect(CutsceneManager.cameraState.mode).toBe(CameraMode.ANIMATED);
  });

  test('l-band CUT id 1401 plays LOOPING', () => {
    const anim = { name: 'cut002l' };
    animMap.set('cut002l', anim);
    expect(CutsceneManager.trySetAnimatedCamera(1401)).toBe(true);
    expect(playAnimation).toHaveBeenCalledWith(
      anim,
      AuroraAnimationFlag.LOOPING,
      expect.objectContaining({ loop: true })
    );
  });
});
