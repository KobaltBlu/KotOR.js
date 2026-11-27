/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false src/audio/AudioEmitter.playStreamWave.test.ts
 */
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

const loadStreamWave = jest.fn();

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    SWRuleSet: { getPriorityGroupById: () => undefined },
    module: undefined,
  },
}));

jest.mock('@engine/audio/AudioEngine', () => ({
  AudioEngine: class {
    audioCtx = {
      createGain: () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
      createPanner: () => ({ positionX: { value: 0 }, positionY: { value: 0 }, positionZ: { value: 0 }, connect() {} }),
      createBufferSource: () => {
        const node: any = {
          buffer: undefined,
          connect: jest.fn(),
          disconnect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          onended: undefined as (() => void) | undefined,
        };
        return node;
      },
      currentTime: 0,
    };
    currentAmbientScale = 1;
    musicAmbientDuckScale = 1;
    priorityManager = {
      tryAcquire: () => ({ allowed: true, voiceId: Math.floor(Math.random() * 1e6) }),
      release: jest.fn(),
      updateDistance: jest.fn(),
    };
  },
}));

jest.mock('@engine/audio/AudioLoader', () => ({
  AudioLoader: {
    LoadSound: jest.fn(),
    LoadStreamWave: (...args: any[]) => loadStreamWave(...args),
  },
}));

jest.mock('@engine/pathfinding/path-blockage-weight', () => ({
  OBSTRUCTION_REUSE_AGE_MS: 250,
  OBSTRUCTION_REUSE_DIST: 0.5,
  getPathBlockageWeight: () => 0,
  obstructionVolumeScale: (f: number) => 1 - f,
}));

import { AudioEmitter } from '@engine/audio/AudioEmitter';
import { AudioEngine } from '@engine/audio/AudioEngine';
import { AudioEngineChannel } from '@core/enums/audio/AudioEngineChannel';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('AudioEmitter.playStreamWave race', () => {
  beforeEach(() => {
    loadStreamWave.mockReset();
  });

  test('superseded async load does not leave an orphan BufferSource playing', async () => {
    const engine = new (AudioEngine as any)();
    const emitter = new AudioEmitter(engine, AudioEngineChannel.VO);
    emitter.mainNode = engine.audioCtx.createGain();
    emitter.gainNode = emitter.mainNode as GainNode;
    (emitter as any).buffers = new Map();
    (emitter as any).engine = engine;

    const first = deferred<ArrayBuffer>();
    const second = deferred<ArrayBuffer>();
    loadStreamWave
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const fakeBuffer = {} as AudioBuffer;
    jest.spyOn(emitter, 'addSound').mockResolvedValue(fakeBuffer);

    const p1 = emitter.playStreamWave('vo_a');
    const p2 = emitter.playStreamWave('vo_b');

    first.resolve(new ArrayBuffer(8));
    await Promise.resolve();
    await Promise.resolve();

    second.resolve(new ArrayBuffer(8));
    const node1 = await p1;
    const node2 = await p2;

    expect(node1).toBeUndefined();
    expect(node2).toBeTruthy();
    expect(node2.start).toHaveBeenCalledTimes(1);
    expect(emitter.currentSound).toBe(node2);
  });
});
