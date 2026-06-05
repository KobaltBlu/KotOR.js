import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  clearDevBrowserDirectoryHandle,
  DevGameFileHandle,
  devGameExists,
  devGameRead,
  devGameReadFile,
  devGameVirtualWrite,
  isDevGameFileBackendActive,
  probeDevGameFileBackend,
  resetDevGameFileBackendProbeForTests,
} from '@/dev/DevGameFileBackend';
import { ApplicationProfile } from '@/utility/ApplicationProfile';

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

  it('reads a small file via stat + ranged read and caches repeat reads', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('action=stat')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ exists: true, isFile: true, size: 3 }),
        };
      }
      return okBytes([1, 2, 3]);
    });
    setFetch(fetchMock);

    const first = await devGameReadFile('data/small-once.gff');
    expect(Array.from(first)).toEqual([1, 2, 3]);

    const second = await devGameReadFile('data/small-once.gff');
    expect(Array.from(second)).toEqual([1, 2, 3]);

    // stat + one ranged read; second read is served from fileByteCache.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reads large files via multiple ranged chunks (no whole-file fetch)', async () => {
    const chunkSize = 4 * 1024 * 1024;
    const totalSize = chunkSize + 100;
    const fetchMock = jest.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('action=stat')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ exists: true, isFile: true, size: totalSize }),
        };
      }
      const offset = Number(new URL(u, 'http://localhost').searchParams.get('offset'));
      const length = Number(new URL(u, 'http://localhost').searchParams.get('length'));
      return okBytes(Array.from({ length }, (_, i) => (offset + i) & 0xff));
    });
    setFetch(fetchMock);

    const bytes = await devGameReadFile('data/large.bif');
    expect(bytes.length).toBe(totalSize);
    expect(bytes[0]).toBe(0);
    expect(bytes[chunkSize]).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
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

  it('rejects read when stat reports file missing', async () => {
    setFetch(jest.fn(async (url: string) => {
      if (String(url).includes('action=stat')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ exists: false, isFile: false }),
        };
      }
      return {
        ok: false,
        status: 404,
        text: async () => 'Not found',
      };
    }));

    await expect(devGameReadFile('data/missing.gff')).rejects.toThrow(/404/);
  });

  it('clearDevBrowserDirectoryHandle drops persisted FS Access handle', () => {
    ApplicationProfile.directoryHandle = { name: 'swkotor' } as FileSystemDirectoryHandle;
    ApplicationProfile.profile = { directory_handle: ApplicationProfile.directoryHandle };

    clearDevBrowserDirectoryHandle();

    expect(ApplicationProfile.directoryHandle).toBeUndefined();
    expect(ApplicationProfile.profile.directory_handle).toBeUndefined();
  });
});
