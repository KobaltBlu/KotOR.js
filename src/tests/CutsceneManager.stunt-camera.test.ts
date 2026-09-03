/**
 * trySetAnimatedCamera play-mode flags (IsLoopingDialogStuntAnimation parity).
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { AuroraAnimationFlag } from '@/enums/animation/AuroraAnimationFlag';
import { CameraMode } from '@/enums/dialog/CameraMode';

const playAnimation = jest.fn();
const animMap = new Map<string, { name: string }>();

jest.mock('@/GameState', () => ({
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
    SetEngineMode: jest.fn(),
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

jest.mock('@/audio/AudioLoader', () => ({ AudioLoader: {} }));
jest.mock('@/audio/AudioEngine', () => ({
  AudioEngine: {
    GetAudioEngine: () => null,
    GetSoundMode: () => 0,
    SetSoundMode: jest.fn(),
    ensureGameBusesAudible: jest.fn(),
  },
}));
jest.mock('@/audio/AudioEmitter', () => ({
  AudioEmitter: class {
    setVolume() { return this; }
    setMaxDistance() {}
  },
}));
jest.mock('@/utility/ConfigClient', () => ({ ConfigClient: { get: jest.fn() } }));
jest.mock('@/utility/aurora-camera-orientation', () => ({
  auroraCameraLookOrientation: jest.fn(),
}));
jest.mock('@/three/odyssey/OdysseyModel3D', () => {
  return {
    OdysseyModel3D: class OdysseyModel3D {
      odysseyAnimationMap = animMap;
      animationManager = { playAnimation };
    },
  };
});
jest.mock('@/resource/DLGObject', () => ({ DLGObject: class {} }));
jest.mock('@/resource/DLGNode', () => ({
  DLGNode: class {
    static WAIT_CAMERA = 0x01;
    static WAIT_VOICE = 0x02;
    static WAIT_ANIM = 0x04;
    static WAIT_FADE = 0x08;
    static WAIT_EXPLICIT_DELAY = 0x10;
  },
}));

import { CutsceneManager } from '@/managers/CutsceneManager';
import { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';
import { GameState } from '@/GameState';

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
