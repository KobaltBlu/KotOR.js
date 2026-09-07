/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

const dayVolumes: number[] = [];
const nightVolumes: number[] = [];

jest.mock('@/GameState', () => ({
  GameState: {
    module: undefined,
    SWRuleSet: { getPriorityGroupById: () => undefined },
  },
}));

jest.mock('@/engine/pathfinding/get-obstruction-factor', () => ({
  OBSTRUCTION_REUSE_AGE_MS: 0xaf,
  OBSTRUCTION_REUSE_DIST: 0.5,
  getObstructionFactor: () => 0,
  obstructionVolumeScale: (f: number) => 1 - f,
}));

jest.mock('@/audio/ReverbEngine', () => ({
  ReverbEngine: class {
    connectSource() {}
  },
}));

jest.mock('@/audio/AmbientAudioEmitter', () => ({
  AmbientAudioEmitter: class {
    dispose() {}
    setVolume(v: number) {
      return this;
    }
    setDestination() { return this; }
  },
}));

jest.mock('@/audio/AudioPriorityManager', () => ({
  AudioPriorityManager: class {
    clear() {}
  },
}));

jest.mock('@/audio/EAXPresets', () => ({
  EAXPresets: {},
}));

jest.mock('three', () => ({
  Vector3: class {
    x = 0; y = 0; z = 0;
    set() { return this; }
    copy() { return this; }
  },
  Quaternion: class {},
  MathUtils: { clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)) },
}));

import { AudioEngine } from '@/audio/AudioEngine';

describe('AudioEngine ambient volume compose', () => {
  beforeEach(() => {
    dayVolumes.length = 0;
    nightVolumes.length = 0;
    const engine = {
      ambientDayVolume: 1,
      ambientNightVolume: 1,
      currentAmbientScale: 1,
      ambientAudioDayEmitter: {
        setVolume: (v: number) => { dayVolumes.push(v); },
      },
      ambientAudioNightEmitter: {
        setVolume: (v: number) => { nightVolumes.push(v); },
      },
      refreshAmbientEmitterVolumes: AudioEngine.prototype.refreshAmbientEmitterVolumes,
      setAmbientDayVolume: AudioEngine.prototype.setAmbientDayVolume,
      setAmbientNightVolume: AudioEngine.prototype.setAmbientNightVolume,
    };
    // Bind prototype methods to plain object
    engine.refreshAmbientEmitterVolumes = AudioEngine.prototype.refreshAmbientEmitterVolumes.bind(engine);
    engine.setAmbientDayVolume = AudioEngine.prototype.setAmbientDayVolume.bind(engine);
    engine.setAmbientNightVolume = AudioEngine.prototype.setAmbientNightVolume.bind(engine);
    (AudioEngine as any)._testEngine = engine;
  });

  test('day/night volumes compose with AmbientScale', () => {
    const engine = (AudioEngine as any)._testEngine;
    engine.currentAmbientScale = 0.5;
    engine.setAmbientDayVolume(0.8);
    engine.setAmbientNightVolume(0.4);
    expect(dayVolumes[dayVolumes.length - 1]).toBeCloseTo(0.4);
    expect(nightVolumes[nightVolumes.length - 1]).toBeCloseTo(0.2);
  });

  test('refresh after scale change keeps script volumes', () => {
    const engine = (AudioEngine as any)._testEngine;
    engine.setAmbientDayVolume(0.5);
    engine.currentAmbientScale = 0.25;
    engine.refreshAmbientEmitterVolumes();
    expect(dayVolumes[dayVolumes.length - 1]).toBeCloseTo(0.125);
  });
});

describe('AudioEngine occlusion budget', () => {
  test('OCCLUSION_BUDGET_MS defaults to engine 3ms', () => {
    expect(AudioEngine.OCCLUSION_BUDGET_MS).toBe(3);
  });
});
