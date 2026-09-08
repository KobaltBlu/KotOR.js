/**
 * CutsceneManager fires creature ScriptEndDialogu on conversation end.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    TwoDAManager: { datatables: new Map() },
    PartyManager: {
      party: [{ id: 1, isPlayer: true, npcId: -1, isPM: true }],
      Player: { id: 1, isPlayer: true, npcId: -1, isPM: true },
      ControlledNPC: -1,
      SwitchPlayerCharacter: jest.fn(),
      MakePlayerLeader: jest.fn(),
      IsPlayerPartyLeader: jest.fn(() => true),
      getInventory: () => [],
    },
    InventoryManager: { getInventory: () => [] },
    getCurrentPlayer: jest.fn(() => null),
    MenuManager: {
      InGameDialog: { close: jest.fn() },
      InGameComputer: { close: jest.fn() },
      InGameComputerCam: { hide: jest.fn() },
    },
    VideoEffectManager: { SetVideoEffect: jest.fn() },
    FadeOverlayManager: {
      FadeOut: jest.fn(),
      FadeIn: jest.fn(),
      FadeInFromCutscene: jest.fn(),
      isFading: jest.fn(() => false),
      PARTY_DIALOG_SWITCH_FADE_OUT_LENGTH: 0.75,
      HOLD_WORLD_FADE_IN_LENGTH: 1.0,
      HOLD_WORLD_FADE_IN_WAIT: 0,
    },
    CutsceneManager: {},
    SetEngineMode: jest.fn(),
    RestoreEnginePlayMode: jest.fn(),
    Mode: 0,
    holdWorldFadeInForDialog: false,
    Flags: { EnableOverride: false },
    GameKey: 0,
    module: { area: { id: 1, cameras: [], doors: [] } },
    camera: {},
    currentCamera: {},
    camera_dialog: {
      position: { copy() {} },
      quaternion: { copy() {} },
      up: { set() {} },
      rotation: { setFromQuaternion() {} },
      updateProjectionMatrix() {},
      fov: 55,
    },
    raycaster: { set() {}, far: 0 },
  },
}));

jest.mock('@/audio/AudioLoader', () => ({ AudioLoader: {} }));
jest.mock('@/audio/AudioEngine', () => ({
  AudioEngine: {
    GetAudioEngine: () => ({
      bgmTimer: 0,
      stopDuckingMusicAndAmbientSounds: jest.fn(),
    }),
    GetSoundMode: () => 0,
    SetSoundMode: jest.fn(),
    ensureGameBusesAudible: jest.fn(),
  },
}));
jest.mock('@/audio/AudioEmitter', () => ({
  AudioEmitter: class {
    isLooping = false;
    setVolume() { return this; }
    setMaxDistance() {}
    load() { return Promise.resolve(); }
    playSound() { return Promise.resolve(); }
    stop() {}
  },
}));
jest.mock('@/utility/ConfigClient', () => ({ ConfigClient: { get: jest.fn() } }));
jest.mock('@/managers/cutscene/dialog-camera', () => ({
  computeDialogCameraShot: jest.fn(),
  dlgAngleToShotType: jest.fn(),
  DIALOG_CAMERA_FOV: 55,
  ANIMATED_CAMERA_NEAR: 0.1,
  ANIMATED_CAMERA_FAR: 10000,
  getCameraAnimationName: jest.fn(() => 'none'),
  isLoopingDialogStuntAnimation: jest.fn(() => false),
  createDialogPseudoRandomState: jest.fn(),
  resolveEntryCameraAngle: jest.fn((a: number) => a),
  resolveReplyCameraAngle: jest.fn((a: number) => a),
  lookupDialogCloseUpExtra: jest.fn(),
  resolveAspyrAppearanceCameraOverrides: jest.fn(() => ({})),
  isDialogGameModded: jest.fn(() => false),
  isAspyrCarthDialogCameraHack: jest.fn(() => false),
  applyAspyrPlaceableCameraHack: jest.fn(),
}));
jest.mock('@/managers/cutscene/dialog-alien-vo', () => ({
  createDialogAlienVOPrngState: jest.fn(),
  advanceAlienVOTake: jest.fn(() => 1),
  DIALOG_ALIEN_VO_TAKES: [1, 1, 2, 3, 1, 2, 1, 2, 2, 3, 3, 3, 1, 3, 2, 1, 3, 2, 2],
}));
jest.mock('@/utility/aurora-camera-orientation', () => ({
  auroraCameraLookOrientation: jest.fn(),
}));
jest.mock('@/three/odyssey/OdysseyModel3D', () => ({ OdysseyModel3D: class {} }));
jest.mock('@/resource/DLGObject', () => ({
  DLGObject: class {
    conversationType = 0;
    computerType = 0;
    scripts: any = {};
    stuntActors = new Map();
    releaseStuntActors() {}
    getConversationType() { return 0; }
  },
}));
jest.mock('@/resource/DLGNode', () => {
  class DLGNode {
    delay = 0xFFFFFFFF >>> 0;
    waitFlags = 0;
    text = '';
    sound = '';
    vo_resref = '';
    soundExists = 0x80;
    cameraAngle = 0;
    camVidEffect = -1;
    static DELAY_UNSET = 0xFFFFFFFF >>> 0;
    static WAIT_EXPLICIT_DELAY = 0x10;
    static estimateSpokenTimeSeconds() { return 0; }
    getVoiceResRef() { return ''; }
    getCompiledString() { return ''; }
    applyAlienVOTake() {}
  }
  return { DLGNode };
});
jest.mock('@/loaders', () => ({
  TextureLoader: { tpcLoader: { fetch: jest.fn(() => Promise.resolve(null)) } },
}));
jest.mock('@/gui', () => ({
  GameMenu: class {
    background = '';
    bVisible = false;
    manager: any = { Add() {}, Remove() {} };
    show() { this.bVisible = true; }
    hide() { this.bVisible = false; }
    close() { this.hide(); }
    async menuControlInitializer() {}
    getControlByName() { return undefined; }
  },
}));

import { CutsceneManager } from '@/managers/CutsceneManager';
import { CutsceneMode } from '@/enums/dialog/CutsceneMode';
import { ConversationState } from '@/enums/dialog/ConversationState';

describe('CutsceneManager ScriptEndDialogu', () => {
  beforeEach(() => {
    CutsceneManager.active = true;
    CutsceneManager.paused = false;
    CutsceneManager.ended = false;
    CutsceneManager.cutsceneMode = CutsceneMode.DIALOG;
    CutsceneManager.dialogAnimParticipants = [];
    CutsceneManager.postDialogRestoreNpcId = undefined;
    CutsceneManager.pendingPartyDialogSwitch = undefined;
    CutsceneManager.state = ConversationState.ENTRY_LIST;
    (CutsceneManager as any).audioEmitter = { stop: jest.fn() };
    CutsceneManager.clearPendingDialog = jest.fn();
    CutsceneManager.clearParticipantRetry = jest.fn();
    CutsceneManager.showEquippedItemsAfterDialog = jest.fn();
  });

  test('endConversation runs onEndDialog on owner and listener', () => {
    const ownerEnd = jest.fn();
    const listenerEnd = jest.fn();
    const owner = { id: 10, onEndDialog: ownerEnd };
    const listener = { id: 1, onEndDialog: listenerEnd };
    CutsceneManager.owner = owner as any;
    CutsceneManager.listener = listener as any;
    CutsceneManager.dialog = {
      conversationType: 0,
      scripts: {},
      stuntActors: new Map(),
      releaseStuntActors: jest.fn(),
      getConversationType: () => 0,
      animatedCamera: undefined,
    } as any;

    CutsceneManager.endConversation(false);

    expect(ownerEnd).toHaveBeenCalled();
    expect(listenerEnd).toHaveBeenCalled();
    expect(CutsceneManager.ended).toBe(true);
    expect(CutsceneManager.active).toBe(false);
  });

  test('endConversation runs onEndDialog for dialogAnimParticipants', () => {
    const participantEnd = jest.fn();
    const owner = { id: 10, onEndDialog: jest.fn() };
    const participant = { id: 20, onEndDialog: participantEnd };
    CutsceneManager.owner = owner as any;
    CutsceneManager.listener = owner as any;
    CutsceneManager.dialogAnimParticipants = [participant as any];
    CutsceneManager.dialog = {
      conversationType: 0,
      scripts: {},
      stuntActors: new Map(),
      releaseStuntActors: jest.fn(),
      getConversationType: () => 0,
    } as any;

    CutsceneManager.endConversation(false);

    expect(participantEnd).toHaveBeenCalled();
  });
});
