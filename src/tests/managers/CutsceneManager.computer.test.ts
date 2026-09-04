/**
 * Computer dialog parity — ComputerType, setType, updateSkills, CamVidEffect.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

const comptypesRows: Record<number, any> = {
  0: { __rowlabel: 0, ComputerBackground: '1600x1200comp0' },
  1: { __rowlabel: 1, ComputerBackground: '1600x1200comp1' },
};

jest.mock('@/GameState', () => ({
  GameState: {
    TwoDAManager: {
      datatables: new Map([
        ['comptypes', {
          RowCount: 2,
          getByID: (id: number) => comptypesRows[id],
          rows: comptypesRows,
        }],
      ]),
    },
    PartyManager: { party: [] },
    InventoryManager: { getInventory: () => [] },
    getCurrentPlayer: jest.fn(() => null),
    MenuManager: {},
    VideoEffectManager: { SetVideoEffect: jest.fn() },
    FadeOverlayManager: {},
    CutsceneManager: {},
    SetEngineMode: jest.fn(),
    Mode: 0,
    holdWorldFadeInForDialog: false,
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
  resolveAspyrAppearanceCameraOverrides: jest.fn(),
  isDialogGameModded: jest.fn(() => false),
  applyAspyrPlaceableCameraHack: jest.fn(),
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
      return '';
    }
    getCompiledString() {
      return this.text || '';
    }
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

import { InGameComputer } from '@/game/kotor/menu/InGameComputer';
import { CutsceneManager } from '@/managers/CutsceneManager';
import { DLGCameraAngle } from '@/enums/dialog/DLGCameraAngle';
import { GameState } from '@/GameState';

describe('InGameComputer.setType (K1 SetType)', () => {
  let menu: InGameComputer;

  beforeEach(() => {
    menu = new InGameComputer();
    menu.LBL_COMP_SKILL_VAL = { setText: jest.fn() } as any;
    menu.LBL_REP_SKILL_VAL = { setText: jest.fn() } as any;
    menu.LBL_COMP_SPIKES_VAL = { setText: jest.fn() } as any;
    menu.LBL_REP_UNITS_VAL = { setText: jest.fn() } as any;
  });

  test('picks ComputerBackground from comptypes row', () => {
    menu.setType(1);
    expect(menu.background).toBe('1600x1200comp1');
    expect(menu.computerType).toBe(1);
  });

  test('out-of-range ComputerType clamps to row 0', () => {
    menu.setType(99);
    expect(menu.background).toBe('1600x1200comp0');
  });
});

describe('InGameComputer.updateSkills (UpdateSkills)', () => {
  test('writes skill ranks and spike/part stack totals', () => {
    const menu = new InGameComputer();
    const setComp = jest.fn();
    const setRep = jest.fn();
    const setSpikes = jest.fn();
    const setParts = jest.fn();
    menu.LBL_COMP_SKILL_VAL = { setText: setComp } as any;
    menu.LBL_REP_SKILL_VAL = { setText: setRep } as any;
    menu.LBL_COMP_SPIKES_VAL = { setText: setSpikes } as any;
    menu.LBL_REP_UNITS_VAL = { setText: setParts } as any;

    (GameState as any).PartyManager.party = [{
      getSkillRank: (skill: number) => (skill === 0 ? 12 : skill === 5 ? 7 : 0),
    }];
    (GameState as any).InventoryManager.getInventory = () => [
      { getTag: () => 'k_computer_spike', getStackSize: () => 3 },
      { getTag: () => 'k_repair_part', getStackSize: () => 5 },
      { getTag: () => 'k_computer_spike', getStackSize: () => 2 },
    ];

    menu.updateSkills();
    expect(setComp).toHaveBeenCalledWith('12');
    expect(setRep).toHaveBeenCalledWith('7');
    expect(setSpikes).toHaveBeenCalledWith('5');
    expect(setParts).toHaveBeenCalledWith('5');
  });
});

describe('CutsceneManager computer CamVidEffect helpers', () => {
  test('resolveComputerCamVidEffect maps -1→0 and -2→disable', () => {
    const placeable = {
      cameraAngle: DLGCameraAngle.ANGLE_PLACEABLE_CAMERA,
      camVidEffect: -1,
    } as any;
    expect(CutsceneManager.resolveComputerCamVidEffect(placeable)).toBe(0);

    placeable.camVidEffect = -2;
    expect(CutsceneManager.resolveComputerCamVidEffect(placeable)).toBe(-1);

    placeable.camVidEffect = 3;
    expect(CutsceneManager.resolveComputerCamVidEffect(placeable)).toBe(3);
  });

  test('isComputerLiveFeedVisible hides for -2 and 10', () => {
    expect(CutsceneManager.isComputerLiveFeedVisible(-1)).toBe(true);
    expect(CutsceneManager.isComputerLiveFeedVisible(0)).toBe(true);
    expect(CutsceneManager.isComputerLiveFeedVisible(-2)).toBe(false);
    expect(CutsceneManager.isComputerLiveFeedVisible(10)).toBe(false);
  });
});

describe('DLGObject ComputerType field', () => {
  test('defaults to 0', async () => {
    const { DLGObject } = await import('@/resource/DLGObject');
    const dlg = new DLGObject();
    expect(dlg.computerType).toBe(0);
  });
});
