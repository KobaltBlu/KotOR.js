/**
 * CutsceneManager dialog delay helpers.
 * @jest-environment node
 */
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    GameKey: 'KOTOR',
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
  resolveAspyrAppearanceCameraOverrides: jest.fn(),
  isDialogGameModded: jest.fn(() => false),
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
jest.mock('@/resource/DLGObject', () => ({ DLGObject: class {} }));
jest.mock('@/resource/DLGNode', () => {
  class DLGNode {
    delay = 0xFFFFFFFF >>> 0;
    waitFlags = 0;
    text = '';
    sound = '';
    vo_resref = '';
    soundExists = 0x80;
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
    applyAlienVOTake() {}
  }
  return { DLGNode };
});

import { CutsceneManager } from '@/managers/CutsceneManager';
import { DLGNode } from '@/resource/DLGNode';
import { CutsceneMode } from '@/enums/dialog/CutsceneMode';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

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

describe('CutsceneManager dialog talk/listen defaults (SetDialogAnimations)', () => {
  test('healthy speaker/listener → TALK_NORMAL / LISTEN', () => {
    const actor = { isInjured: () => false } as any;
    expect(CutsceneManager.getDialogTalkAnimation(actor)).toBe(ModuleCreatureAnimState.TALK_NORMAL);
    expect(CutsceneManager.getDialogListenAnimation(actor)).toBe(ModuleCreatureAnimState.LISTEN);
  });

  test('injured speaker/listener → TALK_INJURED / LISTEN_INJURED', () => {
    const actor = { isInjured: () => true } as any;
    expect(CutsceneManager.getDialogTalkAnimation(actor)).toBe(ModuleCreatureAnimState.TALK_INJURED);
    expect(CutsceneManager.getDialogListenAnimation(actor)).toBe(ModuleCreatureAnimState.LISTEN_INJURED);
  });

  test('undefined actor defaults to healthy talk/listen', () => {
    expect(CutsceneManager.getDialogTalkAnimation(undefined)).toBe(ModuleCreatureAnimState.TALK_NORMAL);
    expect(CutsceneManager.getDialogListenAnimation(undefined)).toBe(ModuleCreatureAnimState.LISTEN);
  });

  test('canPlayDialogAnimations gates dead/debilitated (CanPlayDialogAnimations)', () => {
    expect(CutsceneManager.canPlayDialogAnimations(undefined)).toBe(false);
    expect(CutsceneManager.canPlayDialogAnimations({
      isDead: () => true,
      isDebilitated: () => false,
    } as any)).toBe(false);
    expect(CutsceneManager.canPlayDialogAnimations({
      isDead: () => false,
      isDebilitated: () => true,
    } as any)).toBe(false);
    expect(CutsceneManager.canPlayDialogAnimations({
      isDead: () => false,
      isDebilitated: () => false,
    } as any)).toBe(true);
  });
});

describe('CutsceneManager pause/resume pending (UpdateDialog)', () => {
  beforeEach(() => {
    CutsceneManager.active = true;
    CutsceneManager.dialog = { stuntActors: new Map() } as any;
    CutsceneManager.paused = false;
    CutsceneManager.clearPendingDialog();
    CutsceneManager.currentEntry = null as any;
    CutsceneManager.owner = undefined as any;
  });

  afterEach(() => {
    CutsceneManager.clearPendingDialog();
    CutsceneManager.paused = false;
    CutsceneManager.active = false;
    CutsceneManager.dialog = undefined as any;
    CutsceneManager.currentEntry = null as any;
  });

  test('resume clears pause without flushing pending', () => {
    CutsceneManager.pauseConversation();
    CutsceneManager.pendingAdvance = true;
    CutsceneManager.resumeConversation();
    expect(CutsceneManager.paused).toBe(false);
    expect(CutsceneManager.pendingAdvance).toBe(true);
  });

  test('showEntry while paused stashes entry (SendDialogEntry field14)', () => {
    CutsceneManager.paused = true;
    const entry = { repliesShown: false } as any;
    CutsceneManager.showEntry(entry);
    expect(CutsceneManager.pendingAdvance).toBe(true);
    expect(CutsceneManager.pendingEntry).toBe(entry);
    expect(CutsceneManager.currentEntry).toBeFalsy();
  });

  test('flushPendingDialog shows stashed entry when unpaused', () => {
    const entry = { repliesShown: false } as any;
    CutsceneManager.pendingAdvance = true;
    CutsceneManager.pendingEntry = entry;
    const spy = jest.spyOn(CutsceneManager, 'showEntry').mockImplementation(() => {});
    CutsceneManager.flushPendingDialog();
    expect(spy).toHaveBeenCalledWith(entry);
    expect(CutsceneManager.pendingAdvance).toBe(false);
    expect(CutsceneManager.pendingEntry).toBeUndefined();
    spy.mockRestore();
  });

  test('entry-complete pending replies flush via showReplies (field14 == 0xFFFFFFFF)', () => {
    const current = { repliesShown: false } as any;
    CutsceneManager.currentEntry = current;
    CutsceneManager.pendingAdvance = true;
    CutsceneManager.pendingEntry = undefined;
    const spy = jest.spyOn(CutsceneManager, 'showReplies').mockImplementation(() => {});
    CutsceneManager.flushPendingDialog();
    expect(spy).toHaveBeenCalledWith(current);
    expect(current.repliesShown).toBe(true);
    expect(CutsceneManager.pendingAdvance).toBe(false);
    spy.mockRestore();
  });

  test('flushPendingDialog is a no-op while paused', () => {
    CutsceneManager.paused = true;
    CutsceneManager.pendingAdvance = true;
    const entry = { repliesShown: false } as any;
    CutsceneManager.pendingEntry = entry;
    const showEntrySpy = jest.spyOn(CutsceneManager, 'showEntry').mockImplementation(() => {});
    const showRepliesSpy = jest.spyOn(CutsceneManager, 'showReplies').mockImplementation(() => {});
    CutsceneManager.flushPendingDialog();
    expect(showEntrySpy).not.toHaveBeenCalled();
    expect(showRepliesSpy).not.toHaveBeenCalled();
    expect(CutsceneManager.pendingAdvance).toBe(true);
    showEntrySpy.mockRestore();
    showRepliesSpy.mockRestore();
  });

  test('near-zero-delay entry while paused defers replies until resume+update', () => {
    const current = {
      repliesShown: false,
      update: () => true,
      checkList: {},
    } as any;
    CutsceneManager.currentEntry = current;
    CutsceneManager.paused = true;
    jest.spyOn(CutsceneManager, 'updateCamera').mockImplementation(() => {});
    jest.spyOn(CutsceneManager, 'pollParticipantAnimationWait').mockImplementation(() => {});
    const showRepliesSpy = jest.spyOn(CutsceneManager, 'showReplies').mockImplementation(() => {});

    CutsceneManager.update(0.016);
    expect(CutsceneManager.pendingAdvance).toBe(true);
    expect(CutsceneManager.pendingEntry).toBeUndefined();
    expect(showRepliesSpy).not.toHaveBeenCalled();

    CutsceneManager.resumeConversation();
    expect(showRepliesSpy).not.toHaveBeenCalled();

    CutsceneManager.update(0.016);
    expect(showRepliesSpy).toHaveBeenCalledWith(current);
    expect(CutsceneManager.pendingAdvance).toBe(false);

    showRepliesSpy.mockRestore();
    (CutsceneManager.updateCamera as any).mockRestore?.();
    (CutsceneManager.pollParticipantAnimationWait as any).mockRestore?.();
  });
});
