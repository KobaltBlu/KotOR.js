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
      Area: {
        MiniGamePlayer: class {
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

jest.mock('@engine/module/minigame/MiniGameEnemy', () => ({
  MiniGameEnemy: class {
    constructor() {}
  },
}));

jest.mock('@engine/module/minigame/MiniGameTrack', () => ({
  MiniGameTrack: class {
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

import { MiniGame } from '@engine/module/minigame/MiniGame';

function musicStruct(value: unknown) {
  return {
    hasField: (n: string) => n === 'Music',
    getFieldByLabel: (n: string) => ({
      getValue: () => (n === 'Music' ? value : undefined),
      getChildStructs: () => [],
    }),
  } as any;
}

describe('MiniGame music', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parseMusicResRef reads streammusic ResRef', () => {
    expect(MiniGame.parseMusicResRef(musicStruct('Mus_Swoop\0xxx'))).toBe('mus_swoop');
    expect(MiniGame.parseMusicResRef(musicStruct('****'))).toBe('');
    expect(MiniGame.parseMusicResRef(musicStruct(''))).toBe('');
  });

  test('parseMusicResRef resolves legacy DWORD ambientmusic index', () => {
    expect(MiniGame.parseMusicResRef(musicStruct(3))).toBe('mus_swoop');
    expect(MiniGame.parseMusicResRef(musicStruct(0))).toBe('');
  });

  test('loadMusic + playMusic uses dedicated MiniGame emitter', async () => {
    const mg = Object.create(MiniGame.prototype) as MiniGame;
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
    const mg = Object.create(MiniGame.prototype) as MiniGame;
    mg.music = 'mus_swoop';
    mg.musicLoaded = false;
    mg.musicEmitter = null;
    mg.playMusic();
    expect(play).not.toHaveBeenCalled();
  });
});
