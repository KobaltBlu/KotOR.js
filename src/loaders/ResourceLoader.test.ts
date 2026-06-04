import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as path from 'path';

jest.mock('@/managers/KEYManager', () => ({
  KEYManager: {
    Key: {
      keys: [] as unknown[],
      getFileKey: jest.fn(),
      getFileBuffer: jest.fn(),
    },
  },
}));

jest.mock('@/managers/RIMManager', () => ({
  RIMManager: {
    RIMs: new Map(),
  },
}));

jest.mock('@/utility/GameFileSystem', () => ({
  GameFileSystem: {
    exists: jest.fn(),
    readFile: jest.fn(),
    open: jest.fn(),
    read: jest.fn(),
    close: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn(),
  },
}));

import { CacheScope } from '@/enums/resource/CacheScope';
import { KEYManager } from '@/managers/KEYManager';
import { ResourceLoader } from '@/loaders/ResourceLoader';
import { ERFObject } from '@/resource/ERFObject';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { GameFileSystem } from '@/utility/GameFileSystem';

function makeErfArchive(fileType: 'ERF ' | 'MOD ' | 'SAV ' = 'ERF '): ERFObject {
  const erf = new ERFObject();
  erf.header.fileType = fileType;
  erf.addResource('shared', ResourceTypes.utc, Uint8Array.from([1, 2, 3]));
  return new ERFObject(erf.getExportBuffer());
}

describe('ResourceLoader', () => {
  beforeEach(() => {
    ResourceLoader.Resources = {};
    ResourceLoader.cache = {};
    ResourceLoader.ModuleArchives = [];
    ResourceLoader.CacheScopes = {
      override: new Map(),
      global: new Map(),
      module: new Map(),
      project: new Map(),
    } as any;
    ResourceLoader.InitCache();

    (KEYManager.Key.getFileKey as jest.Mock).mockReset();
    (KEYManager.Key.getFileBuffer as jest.Mock).mockReset();
    (GameFileSystem.exists as jest.Mock).mockReset();
    (GameFileSystem.readFile as jest.Mock).mockReset();
  });

  it('prefers override over module, global, and fallback caches', () => {
    const resType = ResourceTypes.utc;
    const resRef = 'shared';
    const override = Uint8Array.from([1]);
    const module = Uint8Array.from([2]);
    const global = Uint8Array.from([3]);
    const fallback = Uint8Array.from([4]);

    ResourceLoader.CacheScopes[CacheScope.OVERRIDE].get(resType).set(resRef, override);
    ResourceLoader.CacheScopes[CacheScope.MODULE].get(resType).set(resRef, module);
    ResourceLoader.CacheScopes[CacheScope.GLOBAL].get(resType).set(resRef, global);
    ResourceLoader.cache[resType] = { [resRef]: fallback };

    expect(ResourceLoader.getCache(resType, resRef)).toBe(override);

    ResourceLoader.CacheScopes[CacheScope.OVERRIDE].get(resType).delete(resRef);
    expect(ResourceLoader.getCache(resType, resRef)).toBe(module);

    ResourceLoader.CacheScopes[CacheScope.MODULE].get(resType).delete(resRef);
    expect(ResourceLoader.getCache(resType, resRef)).toBe(global);

    ResourceLoader.CacheScopes[CacheScope.GLOBAL].get(resType).delete(resRef);
    expect(ResourceLoader.getCache(resType, resRef)).toBe(fallback);
  });

  it('searchOverride derives the extension from ResourceTypes and lowercases the resref', async () => {
    const data = Uint8Array.from([0xaa, 0xbb]);
    (GameFileSystem.exists as jest.Mock<() => Promise<boolean>>).mockResolvedValue(true);
    (GameFileSystem.readFile as jest.Mock<() => Promise<Uint8Array>>).mockResolvedValue(data);

    const result = await ResourceLoader.searchOverride(ResourceTypes.utc, 'MiXeDRef');

    expect(GameFileSystem.exists).toHaveBeenCalledWith(path.join('Override', 'mixedref.utc'));
    expect(GameFileSystem.readFile).toHaveBeenCalledWith(path.join('Override', 'mixedref.utc'));
    expect(result).toBe(data);
  });

  it('searchModuleArchives resolves resources from in-memory ERF archives', async () => {
    const erf = makeErfArchive('SAV ');
    await erf.load();
    ResourceLoader.ModuleArchives = [erf];

    const result = await ResourceLoader.searchModuleArchives(ResourceTypes.utc, 'shared');

    expect(result).toBeTruthy();
    expect(erf.hasResource('shared', ResourceTypes.utc)).toBe(true);
  });

  it('loadCachedResource returns undefined when cache is empty or zero-length', () => {
    expect(ResourceLoader.loadCachedResource(ResourceTypes.utc, 'missing')).toBeUndefined();
    ResourceLoader.cache[ResourceTypes.utc] = { empty: new Uint8Array(0) };
    expect(ResourceLoader.loadCachedResource(ResourceTypes.utc, 'empty')).toBeUndefined();
  });

  it('loadResource falls through to the KEY table and stores the result in fallback cache', async () => {
    const data = Uint8Array.from([0x10, 0x20]);
    const keyEntry = { resRef: 'shared', resType: ResourceTypes.utc, resId: 1 };
    (KEYManager.Key.getFileKey as jest.Mock).mockReturnValue(keyEntry);
    (KEYManager.Key.getFileBuffer as jest.Mock<() => Promise<Uint8Array>>).mockResolvedValue(data);

    const result = await ResourceLoader.loadResource(ResourceTypes.utc, 'shared');

    expect(result).toBe(data);
    expect(KEYManager.Key.getFileKey).toHaveBeenCalledWith('shared', ResourceTypes.utc);
    expect(KEYManager.Key.getFileBuffer).toHaveBeenCalledWith(keyEntry);
    expect(ResourceLoader.loadCachedResource(ResourceTypes.utc, 'SHARED')).toBe(data);
  });

  it('loadResource throws when no source can resolve the resource', async () => {
    (KEYManager.Key.getFileKey as jest.Mock).mockReturnValue(undefined);
    ResourceLoader.ModuleArchives = [];

    await expect(ResourceLoader.loadResource(ResourceTypes.utc, 'missing')).rejects.toThrow(
      'Resource not found: ResRef: missing ResId: 2027'
    );
  });

  it('getResource resolves registry entries case-insensitively', () => {
    ResourceLoader.setResource(ResourceTypes.wav, 'trask01', { file: 'streamwaves/trask01.wav' });

    expect(ResourceLoader.getResource(ResourceTypes.wav, 'TrAsK01')).toEqual({
      file: 'streamwaves/trask01.wav',
    });
  });
});
