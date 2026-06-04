import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  DevGameFileHandle,
  devGameExists,
  devGameRead,
  devGameReadFile,
  devGameVirtualWrite,
  isDevGameFileBackendActive,
  probeDevGameFileBackend,
  resetDevGameFileBackendProbeForTests,
} from '@/dev/DevGameFileBackend';

const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;

function setFetch(mock: unknown): void {
  (globalThis as unknown as { fetch: unknown }).fetch = mock;
}

function okBytes(bytes: number[]) {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  };
}

describe('DevGameFileBackend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setFetch(originalFetch);
    resetDevGameFileBackendProbeForTests();
  });

  it('activates dev backend via runtime probe when middleware serves chitin.key', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDir = process.env.KOTOR_DEV_GAME_DIR;
    process.env.NODE_ENV = 'development';
    process.env.KOTOR_DEV_GAME_DIR = '';

    const fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes('chitin.key')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ exists: true, isFile: true }),
        };
      }
      return { ok: false, status: 404, json: async () => ({ exists: false }) };
    });
    setFetch(fetchMock);

    expect(isDevGameFileBackendActive()).toBe(false);
    await expect(probeDevGameFileBackend()).resolves.toBe(true);
    expect(isDevGameFileBackendActive()).toBe(true);

    process.env.NODE_ENV = prevEnv;
    process.env.KOTOR_DEV_GAME_DIR = prevDir;
  });

  it('leaves dev backend inactive when probe finds no chitin.key', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDir = process.env.KOTOR_DEV_GAME_DIR;
    process.env.NODE_ENV = 'development';
    process.env.KOTOR_DEV_GAME_DIR = '';

    setFetch(jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ exists: false }),
    })));

    await expect(probeDevGameFileBackend()).resolves.toBe(false);
    expect(isDevGameFileBackendActive()).toBe(false);

    process.env.NODE_ENV = prevEnv;
    process.env.KOTOR_DEV_GAME_DIR = prevDir;
  });

  it('serves virtual-written files from memory without any fetch', async () => {
    const fetchMock = jest.fn();
    setFetch(fetchMock);

    devGameVirtualWrite('saves/game1/save.sav', new Uint8Array([5, 5]));

    expect(await devGameExists('saves/game1/save.sav')).toBe(true);
    const back = await devGameReadFile('saves/game1/save.sav');
    expect(Array.from(back)).toEqual([5, 5]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads a small file whole and serves repeat reads from cache', async () => {
    const fetchMock = jest.fn(async () => okBytes([1, 2, 3]));
    setFetch(fetchMock);

    const first = await devGameReadFile('data/small-once.gff');
    expect(Array.from(first)).toEqual([1, 2, 3]);

    const second = await devGameReadFile('data/small-once.gff');
    expect(Array.from(second)).toEqual([1, 2, 3]);

    // Second read is served from fileByteCache — no second network request.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('issues a ranged fetch and writes bytes at the destination offset', async () => {
    const fetchMock = jest.fn(async () => okBytes([9, 8, 7, 6]));
    setFetch(fetchMock);

    const handle = new DevGameFileHandle('data/range-only.bif', 'r');
    const out = new Uint8Array(6);
    await devGameRead(handle, out, 1, 4, 100);

    expect(Array.from(out)).toEqual([0, 9, 8, 7, 6, 0]);

    const requestedUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(requestedUrl).toContain('action=read');
    expect(requestedUrl).toContain('offset=100');
    expect(requestedUrl).toContain('length=4');
  });

  it('slices two non-overlapping ranges of a cached/virtual file correctly', async () => {
    const fetchMock = jest.fn();
    setFetch(fetchMock);

    devGameVirtualWrite('saves/g/data.bin', new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    const handle = new DevGameFileHandle('saves/g/data.bin', 'r');

    const head = new Uint8Array(3);
    await devGameRead(handle, head, 0, 3, 0);
    expect(Array.from(head)).toEqual([0, 1, 2]);

    const tail = new Uint8Array(3);
    await devGameRead(handle, tail, 0, 3, 5);
    expect(Array.from(tail)).toEqual([5, 6, 7]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a whole-file read with a descriptive error when the server refuses (413)', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 413,
      text: async () => 'File too large for whole-file read: 999999999 bytes exceeds 67108864. Use a ranged read (offset/length).',
    }));
    setFetch(fetchMock);

    await expect(devGameReadFile('data/huge-413.bif')).rejects.toThrow(/413/);
    await expect(devGameReadFile('data/huge-413.bif')).rejects.toThrow(/too large/i);
  });
});
