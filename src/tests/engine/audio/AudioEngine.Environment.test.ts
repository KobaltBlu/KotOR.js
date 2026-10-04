/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    module: undefined,
    SWRuleSet: { getPriorityGroupById: () => undefined },
  },
}));

jest.mock('@engine/pathfinding/path-blockage-weight', () => ({
  OBSTRUCTION_REUSE_AGE_MS: 250,
  OBSTRUCTION_REUSE_DIST: 0.5,
  getPathBlockageWeight: () => 0,
  obstructionVolumeScale: (f: number) => 1 - f,
}));

const loadPreset = jest.fn();
jest.mock('@engine/audio/ReverbEngine', () => ({
  ReverbEngine: class {
    connectSource() {}
    loadPreset = loadPreset;
    updateListener() {}
  },
}));

jest.mock('@engine/audio/AmbientAudioEmitter', () => ({
  AmbientAudioEmitter: class {
    dispose() {}
    setVolume() {}
  },
}));

jest.mock('@engine/audio/AudioPriorityManager', () => ({
  AudioPriorityManager: class {
    clear() {}
  },
}));

jest.mock('@engine/audio/EAXPresets', () => ({
  EAXPresets: {
    PresetFromIndex: () => ({ gain: 0.3, lateReverbGain: 1, decayTime: 1 }),
  },
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

import { AudioEngine } from '@engine/audio/AudioEngine';

describe('AudioEngine environment (EAX)', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    loadPreset.mockClear();
    // Avoid constructing full AudioEngine (needs AudioContext). Use prototype methods on a stub.
    engine = Object.create(AudioEngine.prototype) as AudioEngine;
    engine.desiredEnvironment = 0;
    engine.currentEnvironment = -1;
    engine.reverbEnabled = false;
    engine.reverbEngine = {
      loadPreset,
      connectSource: jest.fn(),
    } as any;
    const gainNode = { disconnect: jest.fn(), connect: jest.fn() };
    (AudioEngine as any).sfxChannel = { getGainNode: () => gainNode };
    (AudioEngine as any).voChannel = { getGainNode: () => gainNode };
    engine.audioCtx = { destination: {} } as any;
  });

  test('setDesiredEnvironment does not apply until applyDesiredEnvironment', () => {
    engine.setDesiredEnvironment(5);
    expect(engine.desiredEnvironment).toBe(5);
    expect(engine.currentEnvironment).toBe(-1);
    expect(loadPreset).not.toHaveBeenCalled();

    engine.applyDesiredEnvironment();
    expect(engine.currentEnvironment).toBe(5);
    expect(loadPreset).toHaveBeenCalledWith(5);
    expect(engine.reverbEnabled).toBe(true);
  });

  test('applyDesiredEnvironment is a no-op when already current', () => {
    engine.setDesiredEnvironment(3);
    engine.applyDesiredEnvironment();
    loadPreset.mockClear();
    engine.applyDesiredEnvironment();
    expect(loadPreset).not.toHaveBeenCalled();
  });

  test('setReverbProfile applies immediately (tools path)', () => {
    engine.setReverbProfile(7);
    expect(engine.desiredEnvironment).toBe(7);
    expect(engine.currentEnvironment).toBe(7);
    expect(loadPreset).toHaveBeenCalledWith(7);
  });

  test('setReverbProfile(-1) disables reverb', () => {
    engine.setReverbProfile(2);
    engine.setReverbProfile(-1);
    expect(engine.desiredEnvironment).toBe(-1);
    expect(engine.currentEnvironment).toBe(-1);
    expect(engine.reverbEnabled).toBe(false);
  });
});
