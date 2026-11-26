/**
 * @jest-environment node
 *
 * MDLLoader: concurrent loads share one read + parse, failures are not cached,
 * and source-byte preservation follows MDLLoader.preserveSourceBinary.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { MDLLoader } from '@engine/loaders/MDLLoader';
import { ResourceLoader } from '@core/loaders/ResourceLoader';
import { OdysseyModel } from '@engine/odyssey/OdysseyModel';

describe('MDLLoader', () => {
  beforeEach(() => {
    MDLLoader.loader.reset();
    MDLLoader.preserveSourceBinary = false;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    MDLLoader.loader.reset();
    MDLLoader.preserveSourceBinary = false;
  });

  test('concurrent loads of one resref read and parse once', async () => {
    const read = jest.spyOn(ResourceLoader, 'loadResource').mockResolvedValue(new Uint8Array(4));
    const fake = {} as OdysseyModel;
    const parse = jest.spyOn(OdysseyModel, 'FromBuffers').mockReturnValue(fake);

    const [a, b, c] = await Promise.all([
      MDLLoader.loader.load('P_BastilaBB'),
      MDLLoader.loader.load('p_bastilabb'),
      MDLLoader.loader.load('p_bastilabb'),
    ]);
    expect(a).toBe(fake);
    expect(b).toBe(fake);
    expect(c).toBe(fake);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(2); // one MDL + one MDX

    // Cached afterwards.
    await MDLLoader.loader.load('p_bastilabb');
    expect(parse).toHaveBeenCalledTimes(1);
  });

  test('prefetch warms the cache for later loads', async () => {
    jest.spyOn(ResourceLoader, 'loadResource').mockResolvedValue(new Uint8Array(4));
    const parse = jest.spyOn(OdysseyModel, 'FromBuffers').mockImplementation(() => ({}) as OdysseyModel);
    await MDLLoader.loader.prefetch(['m01aa_01a', 'm01aa_02a', '', 'm01aa_01a']);
    expect(parse).toHaveBeenCalledTimes(2);
    await MDLLoader.loader.load('m01aa_02a');
    expect(parse).toHaveBeenCalledTimes(2);
  });

  test('a failed load is not cached and can be retried', async () => {
    const read = jest.spyOn(ResourceLoader, 'loadResource')
      .mockRejectedValueOnce(new Error('missing'))
      .mockResolvedValue(new Uint8Array(4));
    const fake = {} as OdysseyModel;
    jest.spyOn(OdysseyModel, 'FromBuffers').mockReturnValue(fake);

    expect(await MDLLoader.loader.load('missing')).toBeUndefined();
    expect(await MDLLoader.loader.load('missing')).toBe(fake);
    expect(read.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  test('a resource-not-found miss is remembered until the module archives change', async () => {
    const read = jest.spyOn(ResourceLoader, 'loadResource')
      .mockRejectedValue(new Error('Resource not found: ResRef: fx_shadow_m ResId: 2002'));
    const prevArchives = ResourceLoader.ModuleArchives;
    try{
      ResourceLoader.ModuleArchives = [];
      expect(await MDLLoader.loader.load('fx_shadow_m')).toBeUndefined();
      const calls = read.mock.calls.length;
      expect(await MDLLoader.loader.load('FX_SHADOW_M')).toBeUndefined();
      expect(read.mock.calls.length).toBe(calls);

      // A new module's archives may contain it.
      const fake = {} as OdysseyModel;
      read.mockResolvedValue(new Uint8Array(4));
      jest.spyOn(OdysseyModel, 'FromBuffers').mockReturnValue(fake);
      ResourceLoader.ModuleArchives = [];
      expect(await MDLLoader.loader.load('fx_shadow_m')).toBe(fake);
    }finally{
      ResourceLoader.ModuleArchives = prevArchives;
    }
  });

  test('preserveSourceBinary is off for runtime loads and opt-in for tools', async () => {
    jest.spyOn(ResourceLoader, 'loadResource').mockResolvedValue(new Uint8Array(4));
    const parse = jest.spyOn(OdysseyModel, 'FromBuffers').mockImplementation(() => ({}) as OdysseyModel);

    await MDLLoader.loader.load('a');
    expect(parse.mock.calls[0][2]).toEqual({ preserveSourceBinary: false });

    MDLLoader.preserveSourceBinary = true;
    await MDLLoader.loader.load('b');
    expect(parse.mock.calls[1][2]).toEqual({ preserveSourceBinary: true });
  });
});
