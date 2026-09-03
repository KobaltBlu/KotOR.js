/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

const startFn = jest.fn();
const stopFn = jest.fn();
const loadFn = jest.fn(async () => {});
const destroyFn = jest.fn();
let lastEmitter: any;

jest.mock('@/GameState', () => ({
  GameState: {
    SWRuleSet: {
      getPriorityGroupById: () => ({
        playbackvariance: 0,
        minvolumedist: 1,
        maxvolumedist: 10,
      }),
    },
  },
}));

jest.mock('@/audio/AudioEmitter', () => ({
  AudioEmitter: class {
    isActive = false;
    isLooping = false;
    isContinuous = true;
    isRandom = false;
    isRandomPosition = false;
    interval = 0;
    intervalVariation = 0;
    playbackRate = 1;
    playbackRateVariation = 0;
    fixedVariance = 1;
    volume = 127;
    volumeVariation = 0;
    sounds: string[] = [];
    position = { x: 0, y: 0, z: 0 };
    randomX = 0;
    randomY = 0;
    randomZ = 0;
    elevation = 0;
    name = '';
    type = 0;
    start = startFn;
    stop = stopFn;
    load = loadFn;
    destroy = destroyFn;
    setPriorityGroupId() {}
    setMinDistance() {}
    setMaxDistance() {}
    constructor() {
      lastEmitter = this;
    }
  },
}));

jest.mock('@/module/ModuleObject', () => ({
  ModuleObject: class {
    objectType = 0;
    template: unknown;
    commandable = 0;
    position = { x: 0, y: 0, z: 0 };
    constructor() {}
  },
}));

jest.mock('@/three/odyssey/OdysseyModel3D', () => ({
  OdysseyModel3D: class {},
}));

jest.mock('@/loaders', () => ({
  MDLLoader: {},
  ResourceLoader: {},
}));

jest.mock('@/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@/resource/GFFField', () => ({ GFFField: class {} }));
jest.mock('@/resource/GFFStruct', () => ({ GFFStruct: class {} }));
jest.mock('@/resource/ResourceTypes', () => ({ ResourceTypes: {} }));

import { ModuleSound } from '@/module/ModuleSound';

describe('ModuleSound Continuous + Play active', () => {
  beforeEach(() => {
    startFn.mockClear();
    stopFn.mockClear();
    loadFn.mockClear();
    destroyFn.mockClear();
    lastEmitter = undefined;
  });

  test('promote Continuous + 1 sound + Interval=0 + !RandomPosition → looping', async () => {
    const sound = Object.create(ModuleSound.prototype) as ModuleSound;
    sound.continuous = true;
    sound.soundResRefs = ['oneshot'];
    sound.randomPosition = false;
    sound.interval = 0;
    sound.looping = false;
    sound.active = true;
    sound.random = false;
    sound.positional = false;
    sound.priority = 0;
    sound.volume = 70;
    sound.volumeVariation = 0;
    sound.pitchVariation = 0;
    sound.fixedVariance = 1;
    sound.intervalVariation = 0;
    sound.minDistance = 0;
    sound.maxDistance = 0;
    sound.position = { x: 0, y: 0, z: 0 } as any;
    sound.randomRangeX = 0;
    sound.randomRangeY = 0;
    sound.elevation = 0;
    sound.tag = 'test';
    sound.audioEngine = {} as any;
    sound.audioEmitter = undefined;

    await sound.loadSound();

    expect(sound.looping).toBe(true);
    expect(lastEmitter.isLooping).toBe(true);
    expect(lastEmitter.isContinuous).toBe(true);
    expect(lastEmitter.sounds).toEqual(['oneshot']);
  });

  test('start reactivates after fadeAndStop', () => {
    const sound = Object.create(ModuleSound.prototype) as ModuleSound;
    sound.audioEmitter = {
      isActive: true,
      start: startFn,
      stop: stopFn,
    } as any;

    sound.fadeAndStop(0);
    expect(sound.active).toBe(false);
    expect(sound.audioEmitter.isActive).toBe(false);

    sound.start();
    expect(sound.active).toBe(true);
    expect(sound.audioEmitter.isActive).toBe(true);
    expect(startFn).toHaveBeenCalled();
  });
});
