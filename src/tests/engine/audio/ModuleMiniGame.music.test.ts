/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

const play = jest.fn(async () => {});
const stop = jest.fn();
const setData = jest.fn();
const setPriorityGroupId = jest.fn().mockReturnThis();
const setDestination = jest.fn().mockReturnThis();
const LoadMusic = jest.fn(async () => ({ buffer: new ArrayBuffer(8) }));
const musicGain = {};

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    TwoDAManager: {
      datatables: new Map([
        ['ambientmusic', {
          rows: {
            3: { resource: 'mus_swoop' },
            0: { resource: '****' },
          },
        }],
      ]),
    },
    Module: {
      ModuleArea: {
        ModuleMGPlayer: class {
          constructor() {}
        },
      },
    },
  },
}));

jest.mock('@engine/audio/AudioEngine', () => ({
  AudioEngine: {
    musicChannel: { getGainNode: () => musicGain },
    GetAudioEngine: () => ({
      areaMusicDayAudioEmitter: { stop },
      areaMusicNightAudioEmitter: { stop },
    }),
  },
}));

jest.mock('@engine/audio/AmbientAudioEmitter', () => ({
  AmbientAudioEmitter: class {
    playing = false;
    data: ArrayBuffer | undefined;
    name = '';
    setData = setData.mockImplementation((d: ArrayBuffer) => {
      this.data = d;
      return this;
    });
    setPriorityGroupId = setPriorityGroupId;
    setDestination = setDestination;
    play = play.mockImplementation(async () => {
      this.playing = true;
    });
    stop = stop;
  },
}));

jest.mock('@engine/audio/AudioLoader', () => ({
  AudioLoader: { LoadMusic },
}));

jest.mock('@engine/module/ModuleMGEnemy', () => ({
  ModuleMGEnemy: class {
    constructor() {}
  },
}));

jest.mock('@engine/module/ModuleMGTrack', () => ({
  ModuleMGTrack: class {
    constructor() {}
  },
}));

jest.mock('three', () => ({
  Vector3: class {
    x = 0; y = 0; z = 0;
    set() { return this; }
    copy() { return this; }
  },
}));

import { ModuleMiniGame } from '@engine/module/ModuleMiniGame';

function musicStruct(value: unknown) {
  return {
    hasField: (n: string) => n === 'Music',
    getFieldByLabel: (n: string) => ({
      getValue: () => (n === 'Music' ? value : undefined),
      getChildStructs: () => [],
    }),
  } as any;
}

describe('ModuleMiniGame music', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parseMusicResRef reads streammusic ResRef', () => {
    expect(ModuleMiniGame.parseMusicResRef(musicStruct('Mus_Swoop\0xxx'))).toBe('mus_swoop');
    expect(ModuleMiniGame.parseMusicResRef(musicStruct('****'))).toBe('');
    expect(ModuleMiniGame.parseMusicResRef(musicStruct(''))).toBe('');
  });

  test('parseMusicResRef resolves legacy DWORD ambientmusic index', () => {
    expect(ModuleMiniGame.parseMusicResRef(musicStruct(3))).toBe('mus_swoop');
    expect(ModuleMiniGame.parseMusicResRef(musicStruct(0))).toBe('');
  });

  test('loadMusic + playMusic uses dedicated MiniGame emitter', async () => {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    mg.music = 'mus_swoop';
    mg.musicLoaded = false;
    mg.musicEmitter = null;
    mg.player = { go: jest.fn() } as any;
    mg.enemies = [];

    await mg.loadMusic();
    expect(LoadMusic).toHaveBeenCalledWith('mus_swoop');
    expect(setData).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(setPriorityGroupId).toHaveBeenCalled();
    expect(setDestination).toHaveBeenCalledWith(musicGain);
    expect(mg.musicLoaded).toBe(true);
    expect(mg.musicEmitter).toBeTruthy();

    mg.go();
    expect(stop).toHaveBeenCalled();
    expect(play).toHaveBeenCalledWith(true);
  });

  test('playMusic no-ops without loaded buffer', () => {
    const mg = Object.create(ModuleMiniGame.prototype) as ModuleMiniGame;
    mg.music = 'mus_swoop';
    mg.musicLoaded = false;
    mg.musicEmitter = null;
    mg.playMusic();
    expect(play).not.toHaveBeenCalled();
  });
});
