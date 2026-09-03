/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, jest } from '@jest/globals';
import { TLKStringFlags } from '@/enums/resource/TLKStringFlags';

jest.mock('@/GameState', () => ({
  GameState: {
    SWRuleSet: { getPriorityGroupById: () => undefined },
    module: undefined,
  },
}));

jest.mock('@/audio/AudioEngine', () => ({
  AudioEngine: class {
    audioCtx = {
      createGain: () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
      createPanner: () => ({ positionX: { value: 0 }, positionY: { value: 0 }, positionZ: { value: 0 }, connect() {} }),
      currentTime: 0,
    };
    currentAmbientScale = 1;
    musicAmbientDuckScale = 1;
  },
}));

jest.mock('@/audio/AudioLoader', () => ({
  AudioLoader: { LoadSound: jest.fn() },
}));

jest.mock('@/engine/pathfinding/get-obstruction-factor', () => ({
  OBSTRUCTION_REUSE_AGE_MS: 250,
  OBSTRUCTION_REUSE_DIST: 0.5,
  getObstructionFactor: () => 0,
  obstructionVolumeScale: (f: number) => 1 - f,
}));

import { AudioEmitter } from '@/audio/AudioEmitter';
import { TLKString } from '@/resource/TLKString';

function bareEmitter(sounds: string[]): AudioEmitter {
  const emitter = Object.create(AudioEmitter.prototype) as AudioEmitter;
  emitter.sounds = sounds;
  emitter.soundIndex = 0;
  emitter.isContinuous = true;
  emitter.isRandom = false;
  return emitter;
}

describe('AudioEmitter Continuous sequencing', () => {
  test('Continuous=true wraps after last sound', () => {
    const emitter = bareEmitter(['a', 'b']);
    emitter.isContinuous = true;
    expect(emitter.advanceToNextSound()).toBe(true);
    expect(emitter.soundIndex).toBe(1);
    expect(emitter.advanceToNextSound()).toBe(true);
    expect(emitter.soundIndex).toBe(0);
  });

  test('Continuous=false stops after last sound', () => {
    const emitter = bareEmitter(['a', 'b']);
    emitter.isContinuous = false;
    expect(emitter.advanceToNextSound()).toBe(true);
    expect(emitter.soundIndex).toBe(1);
    expect(emitter.advanceToNextSound()).toBe(false);
    expect(emitter.soundIndex).toBe(1);
  });

  test('Random always advances (shuffle-style wrap path)', () => {
    const emitter = bareEmitter(['a', 'b', 'c']);
    emitter.isRandom = true;
    emitter.isContinuous = false;
    expect(emitter.advanceToNextSound()).toBe(true);
    expect(emitter.soundIndex).toBeGreaterThanOrEqual(0);
    expect(emitter.soundIndex).toBeLessThan(3);
  });
});

describe('TLKString.getDisplaySoundLength', () => {
  test('reinterprets IEEE float bits as seconds', () => {
    const bits = 0x40200000; // 2.5f
    const tlk = new TLKString(
      TLKStringFlags.SNDLENGTH_PRESENT,
      '',
      0,
      0,
      0,
      0,
      bits,
      ''
    );
    expect(tlk.getDisplaySoundLength()).toBeCloseTo(2.5);
  });

  test('returns 0 when SNDLENGTH_PRESENT is clear', () => {
    const tlk = new TLKString(0, '', 0, 0, 0, 0, 0x40200000, '');
    expect(tlk.getDisplaySoundLength()).toBe(0);
  });
});
