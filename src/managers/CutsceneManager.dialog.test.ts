/**
 * CutsceneManager dialog delay helpers.
 * @jest-environment node
 */
import { describe, expect, test, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    TwoDAManager: { datatables: new Map() },
    PartyManager: { party: [] },
    MenuManager: {},
    VideoEffectManager: { SetVideoEffect: jest.fn() },
    FadeOverlayManager: {},
    SetEngineMode: jest.fn(),
    Mode: 0,
    holdWorldFadeInForDialog: false,
  },
}));

jest.mock('@/audio/AudioLoader', () => ({ AudioLoader: {} }));
jest.mock('@/audio/AudioEngine', () => ({
  AudioEngine: {
    GetAudioEngine: () => ({
      startDuckingMusicAndAmbientSounds: jest.fn(),
      stopDuckingMusicAndAmbientSounds: jest.fn(),
    }),
    GetSoundMode: () => 0,
    SetSoundMode: jest.fn(),
    ensureGameBusesAudible: jest.fn(),
  },
}));
jest.mock('@/utility/ConfigClient', () => ({ ConfigClient: { get: jest.fn() } }));
jest.mock('@/managers/dialog-camera', () => ({
  computeDialogCameraShot: jest.fn(),
  dlgAngleToShotType: jest.fn(),
  DIALOG_CAMERA_FOV: 55,
  ANIMATED_CAMERA_NEAR: 0.1,
  ANIMATED_CAMERA_FAR: 10000,
  getCameraAnimationName: jest.fn(() => 'none'),
  createDialogPseudoRandomState: jest.fn(),
  resolveEntryCameraAngle: jest.fn((a: number) => a),
  resolveReplyCameraAngle: jest.fn((a: number) => a),
  lookupDialogCloseUpExtra: jest.fn(),
  resolveAspyrAppearanceCameraOverrides: jest.fn(),
  isDialogGameModded: jest.fn(() => false),
  applyAspyrPlaceableCameraHack: jest.fn(),
}));
jest.mock('@/utility/aurora-camera-orientation', () => ({
  auroraCameraLookOrientation: jest.fn(),
}));
jest.mock('@/three/odyssey/OdysseyModel3D', () => ({ OdysseyModel3D: class {} }));
jest.mock('@/resource/DLGObject', () => ({ DLGObject: class {} }));
jest.mock('@/resource/DLGNode', () => {
  class DLGNode {
    delay = 0xFFFFFFFF >>> 0;
    waitFlags = 0;
    text = '';
    sound = '';
    vo_resref = '';
    static DELAY_UNSET = 0xFFFFFFFF >>> 0;
    static WAIT_EXPLICIT_DELAY = 0x10;
    static estimateSpokenTimeSeconds(text: string) {
      const cleaned = (text || '').trim();
      if (!cleaned.length) return 0;
      return cleaned.length * 0.11 + 1.0;
    }
    getVoiceResRef() {
      if (this.sound) return this.sound;
      if (this.vo_resref) return this.vo_resref;
      return '';
    }
    getCompiledString() {
      return this.text || '';
    }
  }
  return { DLGNode };
});

import { CutsceneManager } from '@/managers/CutsceneManager';
import { DLGNode } from '@/resource/DLGNode';
import { CutsceneMode } from '@/enums/dialog/CutsceneMode';

describe('CutsceneManager.computeEntryDelaySeconds', () => {
  test('floors spoken estimate to at least 0.01', () => {
    CutsceneManager.cutsceneMode = CutsceneMode.DIALOG;
    const entry = new DLGNode() as any;
    entry.delay = DLGNode.DELAY_UNSET;
    entry.waitFlags = 0;
    entry.text = '';
    entry.sound = '';
    entry.vo_resref = '';
    // empty text → estimate 0 → floor 0.01
    expect(CutsceneManager.computeEntryDelaySeconds(entry)).toBe(0.01);
  });

  test('uses spoken estimate for non-empty text when Delay unset', () => {
    CutsceneManager.cutsceneMode = CutsceneMode.DIALOG;
    const entry = new DLGNode() as any;
    entry.delay = DLGNode.DELAY_UNSET;
    entry.waitFlags = 0;
    entry.text = 'Hi';
    entry.sound = '';
    entry.vo_resref = '';
    const expected = Math.max(0.01, 'Hi'.length * 0.11 + 1.0);
    expect(CutsceneManager.computeEntryDelaySeconds(entry)).toBeCloseTo(expected, 5);
  });
});
