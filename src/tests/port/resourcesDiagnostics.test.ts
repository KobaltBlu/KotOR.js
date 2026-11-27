import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RuntimeFaultManager } from '@/utility/RuntimeFaultManager';

// Diagnostics should be testable without an installed game or a renderer.
jest.mock('@/utility/ApplicationProfile', () => ({ ApplicationProfile: {} }));
jest.mock('@/utility/GameFileSystem', () => ({ GameFileSystem: {} }));
jest.mock('@/managers/KEYManager', () => ({ KEYManager: {} }));
jest.mock('@/managers/TLKManager', () => ({ TLKManager: {} }));
jest.mock('@/resource/BIFObject', () => ({ BIFObject: jest.fn() }));
jest.mock('@/resource/ERFObject', () => ({ ERFObject: jest.fn() }));
jest.mock('@/resource/GFFObject', () => ({ GFFObject: jest.fn() }));
jest.mock('@/resource/KEYObject', () => ({ KEYObject: jest.fn() }));
jest.mock('@/resource/LIPObject', () => ({ LIPObject: jest.fn() }));
jest.mock('@/resource/LTRObject', () => ({ LTRObject: jest.fn() }));
jest.mock('@/resource/LYTObject', () => ({ LYTObject: jest.fn() }));
jest.mock('@/resource/RIMObject', () => ({ RIMObject: jest.fn() }));
jest.mock('@/resource/SSFObject', () => ({ SSFObject: jest.fn() }));
jest.mock('@/resource/TLKObject', () => ({ TLKObject: jest.fn() }));
jest.mock('@/resource/TPCObject', () => ({ TPCObject: jest.fn() }));
jest.mock('@/resource/TwoDAObject', () => ({ TwoDAObject: jest.fn() }));
jest.mock('@/resource/VISObject', () => ({ VISObject: jest.fn() }));
jest.mock('@/nwscript/NWScript', () => ({ NWScript: jest.fn() }));

import { BIFObject } from '@/resource/BIFObject';
import { GameResourceDumper } from '@/utility/GameResourceDumper';

const dumpInternals = GameResourceDumper as unknown as {
  normalizeOutputPath(value: string): string;
  forEachConcurrent<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>): Promise<void>;
  dumpBIFArchive(target: unknown, path: string, excluded: Set<string>): Promise<number>;
};

describe('RuntimeFaultManager', () => {
  beforeEach(() => {
    RuntimeFaultManager.reset('diagnostic-test');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs the first failure even during the throttle interval after startup', () => {
    jest.spyOn(performance, 'now').mockReturnValue(20);
    expect(RuntimeFaultManager.run('diagnostic-test', () => { throw new Error('failure'); }, { fallback: 7 })).toBe(7);
    expect(console.error).toHaveBeenCalledTimes(1);
    RuntimeFaultManager.report('diagnostic-test', new Error('failure'));
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(RuntimeFaultManager.getState('diagnostic-test').repeatCount).toBe(2);
  });

  it('suppresses only until cooldown expiry and resets the consecutive count on success', () => {
    let now = 10;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    const fail = jest.fn(() => { throw new Error('failure'); });
    const options = { fallback: 5, suppressAfterFailures: 2, cooldownMs: 100 };
    RuntimeFaultManager.run('diagnostic-test', fail, options);
    RuntimeFaultManager.run('diagnostic-test', fail, options);
    expect(RuntimeFaultManager.isSuppressed('diagnostic-test')).toBe(true);
    expect(RuntimeFaultManager.run('diagnostic-test', fail, options)).toBe(5);
    expect(fail).toHaveBeenCalledTimes(2);
    now = 111;
    expect(RuntimeFaultManager.run('diagnostic-test', () => 9, options)).toBe(9);
    expect(RuntimeFaultManager.getState('diagnostic-test').consecutiveFailures).toBe(0);
    expect(RuntimeFaultManager.getState('diagnostic-test').totalFailures).toBe(2);
  });

  it('contains errors in diagnostic context and callbacks', () => {
    expect(() => RuntimeFaultManager.report('diagnostic-test', new Error('original'), {
      context: () => { throw new Error('context'); },
      onError: () => { throw new Error('callback'); },
    })).not.toThrow();
    expect(RuntimeFaultManager.getState('diagnostic-test').totalFailures).toBe(1);
  });
});

describe('GameResourceDumper', () => {
  it('retains nested relative names and normalizes Windows separators', () => {
    expect(dumpInternals.normalizeOutputPath('modules\\example.rim\\resource.utc.json'))
      .toBe('modules/example.rim/resource.utc.json');
  });

  it.each(['../outside.json', 'module/../../outside.json', '/absolute.json', 'C:\\outside.json', 'stream:payload', 'bad\0name', '', './file.json'])
    ('rejects unsafe output path %p', (value) => {
      expect(() => dumpInternals.normalizeOutputPath(value)).toThrow('Unsafe resource export path');
    });

  it('drains pending workers before rejecting so archive disposal cannot race a read', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const completed: number[] = [];
    const result = dumpInternals.forEachConcurrent([0, 1], 2, async (value) => {
      if (value === 0) throw new Error('bad entry');
      await gate;
      completed.push(value);
    });
    const settled = jest.fn();
    void result.then(settled, settled);
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    release();
    await expect(result).rejects.toThrow('bad entry');
    expect(completed).toEqual([1]);
  });

  it('disposes an archive even when loading fails', async () => {
    const dispose = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const mockBIF = BIFObject as unknown as { mockImplementation(factory: () => unknown): void };
    mockBIF.mockImplementation(() => ({
      load: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('invalid archive')),
      dispose,
    }));
    await expect(dumpInternals.dumpBIFArchive({}, 'example.bif', new Set())).rejects.toThrow('invalid archive');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
