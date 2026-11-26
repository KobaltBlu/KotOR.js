/**
 * @jest-environment node
 *
 * Browser-mode GameFileSystem read caches: small archives are read once as a
 * whole file and served from memory, case-insensitive opens use one directory
 * scan (misses included), writes invalidate, and nothing is cached when
 * browserReadCaching is off (Forge).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

class FakeFile {
  slices = 0;
  whole = 0;
  constructor(public name: string, public bytes: Uint8Array) {}
  get size(){ return this.bytes.length; }
  slice(start: number, end: number){
    this.slices++;
    const part = this.bytes.slice(start, end);
    return { arrayBuffer: async () => part.buffer };
  }
  async arrayBuffer(){
    this.whole++;
    return this.bytes.slice().buffer;
  }
}

class FakeFileHandle {
  kind = 'file' as const;
  constructor(public name: string, public file: FakeFile) {}
  async getFile(){ return this.file; }
}

class FakeDirHandle {
  kind = 'directory' as const;
  scans = 0;
  files = new Map<string, FakeFileHandle>();
  dirs = new Map<string, FakeDirHandle>();
  constructor(public name: string) {}
  async getFileHandle(name: string){
    const h = this.files.get(name);
    if(!h) throw new Error('NotFoundError');
    return h;
  }
  async getDirectoryHandle(name: string){
    const d = this.dirs.get(name);
    if(!d) throw new Error('NotFoundError');
    return d;
  }
  async *values(){
    this.scans++;
    yield* this.dirs.values();
    yield* this.files.values();
  }
}

let GameFileSystem: typeof import('@core/filesystem/GameFileSystem').GameFileSystem;
let ApplicationProfile: typeof import('@core/utility/ApplicationProfile').ApplicationProfile;
let root: FakeDirHandle;
let modules: FakeDirHandle;
let rim: FakeFile;

beforeAll(async () => {
  (globalThis as any).FileSystemFileHandle = FakeFileHandle;
  ({ GameFileSystem } = await import('@core/filesystem/GameFileSystem'));
  ({ ApplicationProfile } = await import('@core/utility/ApplicationProfile'));
});

beforeEach(() => {
  root = new FakeDirHandle('');
  modules = new FakeDirHandle('modules');
  root.dirs.set('modules', modules);
  rim = new FakeFile('Tar_M02ac.rim', Uint8Array.from({ length: 64 }, (_, i) => i));
  modules.files.set('Tar_M02ac.rim', new FakeFileHandle('Tar_M02ac.rim', rim));
  const big = new FakeFile('data.bif', new Uint8Array(32));
  modules.files.set('data.bif', new FakeFileHandle('data.bif', big));
  (ApplicationProfile as any).ENV = 'BROWSER';
  (ApplicationProfile as any).directoryHandle = root;
  GameFileSystem.directoryCache.clear();
  GameFileSystem.directoryInflight.clear();
  GameFileSystem.invalidateReadCaches();
  GameFileSystem.browserReadCaching = true;
});

afterEach(() => {
  GameFileSystem.browserReadCaching = false;
  GameFileSystem.invalidateReadCaches();
  jest.restoreAllMocks();
});

async function readAt(handle: any, position: number, length: number){
  const out = new Uint8Array(length + 2);
  await GameFileSystem.read(handle, out, 2, length, position);
  return Array.from(out.subarray(2));
}

describe('GameFileSystem browser read caches', () => {
  test('archives are read whole once and served from memory', async () => {
    const h = await GameFileSystem.open('modules/Tar_M02ac.rim');
    expect(await readAt(h, 10, 4)).toEqual([10, 11, 12, 13]);
    expect(await readAt(h, 60, 8)).toEqual([60, 61, 62, 63, 0, 0, 0, 0]);
    expect(rim.whole).toBe(1);
    expect(rim.slices).toBe(0);
  });

  test('non-archive files keep ranged reads', async () => {
    const h = await GameFileSystem.open('modules/data.bif');
    await readAt(h, 0, 4);
    await readAt(h, 4, 4);
    expect((h as any).file.slices).toBe(2);
    expect((h as any).file.whole).toBe(0);
  });

  test('case-insensitive opens scan a directory once, misses included', async () => {
    const a = await GameFileSystem.open('modules/tar_m02ac.rim');
    expect(a.name).toBe('Tar_M02ac.rim');
    await expect(GameFileSystem.open('modules/tar_m02ac.mod')).rejects.toThrow();
    await expect(GameFileSystem.open('modules/TAR_M02AC.MOD')).rejects.toThrow();
    await GameFileSystem.open('modules/TAR_M02AC.RIM');
    expect(modules.scans).toBe(1);
  });

  test('invalidation picks up new files and new bytes', async () => {
    await expect(GameFileSystem.open('modules/new.mod')).rejects.toThrow();
    const h = await GameFileSystem.open('modules/Tar_M02ac.rim');
    await readAt(h, 0, 1);
    modules.files.set('NEW.mod', new FakeFileHandle('NEW.mod', new FakeFile('NEW.mod', new Uint8Array(4))));
    GameFileSystem.invalidateReadCaches();
    expect((await GameFileSystem.open('modules/new.mod')).name).toBe('NEW.mod');
    await readAt(h, 0, 1);
    expect(rim.whole).toBe(2);
  });

  test('the budget evicts least recently used archives', async () => {
    const prev = GameFileSystem.archiveCacheBudgetBytes;
    GameFileSystem.archiveCacheBudgetBytes = 100;
    try{
      const other = new FakeFile('b.erf', new Uint8Array(64));
      modules.files.set('b.erf', new FakeFileHandle('b.erf', other));
      const a = await GameFileSystem.open('modules/Tar_M02ac.rim');
      const b = await GameFileSystem.open('modules/b.erf');
      await readAt(a, 0, 1);
      await readAt(b, 0, 1); // evicts a
      await readAt(b, 1, 1);
      await readAt(a, 0, 1);
      expect(other.whole).toBe(1);
      expect(rim.whole).toBe(2);
    }finally{
      GameFileSystem.archiveCacheBudgetBytes = prev;
    }
  });

  test('disabled (Forge): ranged reads and a scan per miss', async () => {
    GameFileSystem.browserReadCaching = false;
    const h = await GameFileSystem.open('modules/tar_m02ac.rim');
    await readAt(h, 0, 4);
    await readAt(h, 4, 4);
    expect(rim.slices).toBe(2);
    expect(rim.whole).toBe(0);
    await expect(GameFileSystem.open('modules/x.mod')).rejects.toThrow();
    await expect(GameFileSystem.open('modules/x.mod')).rejects.toThrow();
    expect(modules.scans).toBe(3);
  });
});
