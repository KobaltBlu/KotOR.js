/**
 * Conversation gap alignment — post-dialog switch, computer setDialogMode.
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
    MenuManager: {},
    VideoEffectManager: { SetVideoEffect: jest.fn() },
    FadeOverlayManager: {
      FadeOut: jest.fn(),
      FadeIn: jest.fn(),
      isFading: jest.fn(() => false),
      PARTY_DIALOG_SWITCH_FADE_OUT_LENGTH: 0.75,
      HOLD_WORLD_FADE_IN_LENGTH: 1.0,
      HOLD_WORLD_FADE_IN_WAIT: 0,
    },
    CutsceneManager: {},
    SetEngineMode: jest.fn(),
    Mode: 0,
    holdWorldFadeInForDialog: false,
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
    raycaster: { set() {}, far: 0 },
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
  isLoopingDialogStuntAnimation: jest.fn((id: number) => (id | 0) > 0x577 && (id | 0) < 0x6c0),
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
    static estimateSpokenTimeSeconds(text: string) {
      const cleaned = (text || '').trim();
      if (!cleaned.length) return 0;
      return cleaned.length * 0.11 + 1.0;
    }
    getVoiceResRef() {
      if ((this.soundExists >>> 0) === 0) return '';
      if (this.sound) return this.sound;
      return this.vo_resref || '';
    }
    getCompiledString() {
      return this.text || '';
    }
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
    backgroundMaterial: any;
    bVisible = false;
    tGuiPanel: any;
    manager: any = { Add() {}, Remove() {} };
    show() { this.bVisible = true; }
    hide() { this.bVisible = false; }
    close() { this.hide(); }
    async menuControlInitializer() {}
    getControlByName() { return undefined; }
  },
}));

import { CutsceneManager } from '@/managers/CutsceneManager';
import { ConversationState } from '@/enums/dialog/ConversationState';
import { InGameComputer } from '@/game/kotor/menu/InGameComputer';
import { DLGNode } from '@/resource/DLGNode';
import { GameState } from '@/GameState';

describe('CutsceneManager post-dialog character switch', () => {
  beforeEach(() => {
    CutsceneManager.postDialogRestoreNpcId = undefined;
  });

  test('schedule then cancel clears pending restore', () => {
    CutsceneManager.schedulePostDialogCharacterSwitch(-1);
    expect(CutsceneManager.postDialogRestoreNpcId).toBe(-1);
    CutsceneManager.cancelPostDialogCharacterSwitch();
    expect(CutsceneManager.postDialogRestoreNpcId).toBeUndefined();
  });

  test('schedule keeps the first restore id', () => {
    CutsceneManager.schedulePostDialogCharacterSwitch(-1);
    CutsceneManager.schedulePostDialogCharacterSwitch(3);
    expect(CutsceneManager.postDialogRestoreNpcId).toBe(-1);
  });
});

describe('CutsceneManager party-dialog leader switch fade', () => {
  const npc = { id: 10, isPlayer: false, isPM: false, partyInteract: 0 };
  const cnpcLeader = { id: 2, isPlayer: false, isPM: true, npcId: 0 };
  const pc = { id: 1, isPlayer: true, isPM: true, npcId: -1 };

  beforeEach(() => {
    CutsceneManager.pendingPartyDialogSwitch = undefined;
    CutsceneManager.active = false;
    GameState.holdWorldFadeInForDialog = false;
    (GameState.FadeOverlayManager.FadeOut as jest.Mock).mockClear();
    (GameState.FadeOverlayManager.isFading as jest.Mock).mockReturnValue(false);
    (GameState.PartyManager.MakePlayerLeader as jest.Mock).mockClear();
    (GameState.PartyManager.IsPlayerPartyLeader as jest.Mock).mockReturnValue(false);
    GameState.PartyManager.party = [cnpcLeader as any, pc as any];
    GameState.PartyManager.Player = pc as any;
  });

  test('needs switch when CNPC leads and target PartyInteract is clear', () => {
    expect(CutsceneManager.needsPartyDialogLeaderSwitch(npc as any, cnpcLeader as any)).toBe(true);
  });

  test('skips switch when PartyInteract is set (engine gate)', () => {
    expect(CutsceneManager.needsPartyDialogLeaderSwitch(
      { ...npc, partyInteract: 1 } as any,
      cnpcLeader as any,
    )).toBe(false);
  });

  test('skips switch when PC is already party leader', () => {
    (GameState.PartyManager.IsPlayerPartyLeader as jest.Mock).mockReturnValue(true);
    expect(CutsceneManager.needsPartyDialogLeaderSwitch(npc as any, pc as any)).toBe(false);
  });

  test('startConversation fades out and defers while CNPC is leader', () => {
    const dialog = { resref: 'test' } as any;
    CutsceneManager.startConversation(dialog, npc as any, cnpcLeader as any);
    expect(CutsceneManager.active).toBe(false);
    expect(CutsceneManager.pendingPartyDialogSwitch).toBeDefined();
    expect(GameState.holdWorldFadeInForDialog).toBe(true);
    expect(GameState.FadeOverlayManager.FadeOut).toHaveBeenCalledWith(0.75, 0, 0, 0, 0);
  });

  test('tickPendingPartyDialogSwitch waits while fading then swaps and resumes', () => {
    CutsceneManager.pendingPartyDialogSwitch = {
      dialog: { resref: 'test' } as any,
      owner: npc as any,
      listener: cnpcLeader as any,
      privateConversation: false,
      ignoreObjectNames: [],
      barkScreenX: -1,
      barkScreenY: -1,
    };
    (GameState.FadeOverlayManager.isFading as jest.Mock).mockReturnValue(true);
    CutsceneManager.tickPendingPartyDialogSwitch();
    expect(GameState.PartyManager.MakePlayerLeader).not.toHaveBeenCalled();
    expect(CutsceneManager.pendingPartyDialogSwitch).toBeDefined();

    (GameState.FadeOverlayManager.isFading as jest.Mock).mockReturnValue(false);
    GameState.PartyManager.party = [pc as any, cnpcLeader as any];
    const resume = jest.spyOn(CutsceneManager, 'startConversation').mockImplementation(() => {});
    CutsceneManager.tickPendingPartyDialogSwitch();
    expect(GameState.PartyManager.MakePlayerLeader).toHaveBeenCalled();
    expect(CutsceneManager.pendingPartyDialogSwitch).toBeUndefined();
    expect(resume).toHaveBeenCalled();
    resume.mockRestore();
  });
});

describe('InGameComputer setDialogMode', () => {
  test('listening hides replies; choice shows them', () => {
    const menu = new InGameComputer();
    const hide = jest.fn();
    const show = jest.fn();
    menu.LB_REPLIES = { hide, show } as any;
    menu.LB_MESSAGE = { show: jest.fn() } as any;
    menu.LBL_COMP_SKILL_VAL = { setText: jest.fn() } as any;
    menu.LBL_REP_SKILL_VAL = { setText: jest.fn() } as any;
    menu.LBL_COMP_SPIKES_VAL = { setText: jest.fn() } as any;
    menu.LBL_REP_UNITS_VAL = { setText: jest.fn() } as any;

    menu.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    expect(hide).toHaveBeenCalled();

    menu.setDialogMode(ConversationState.WAITING_FOR_PC_CHOICE);
    expect(show).toHaveBeenCalled();
  });
});

describe('soundExists gates getVoiceResRef', () => {
  test('SoundExists 0 clears voice resref', () => {
    const node = new DLGNode();
    node.sound = 'n_bastila_001';
    node.soundExists = 0;
    expect(node.getVoiceResRef()).toBe('');
    node.soundExists = 0x80;
    expect(node.getVoiceResRef()).toBe('n_bastila_001');
  });
});
