import { describe, expect, it } from '@jest/globals';

import { loadFromCapsuleBuffer } from '@/apps/forge/helpers/LoadFromCapsule';
import { buildRimBuffer } from '@/apps/forge/helpers/SaveToRim';
import { ERFObject } from '@/resource/ERFObject';
import { ResourceTypes } from '@/resource/ResourceTypes';

function buildErfLikeBuffer(fileType: 'ERF ' | 'MOD ' | 'SAV '): Uint8Array {
  const erf = new ERFObject();
  erf.header.fileType = fileType;
  erf.addResource('alpha', ResourceTypes.utc, Uint8Array.from([0x55, 0x54, 0x43, 0x20]));
  erf.addResource('beta', ResourceTypes.uti, Uint8Array.from([0x55, 0x54, 0x49, 0x20]));
  return erf.getExportBuffer();
}

describe('loadFromCapsuleBuffer', () => {
  it('lists ERF resources and returns buffers by resref and type', async () => {
    const capsule = await loadFromCapsuleBuffer(buildErfLikeBuffer('ERF '));

    expect(capsule).not.toBeNull();
    expect(capsule?.type).toBe('erf');
    expect(capsule?.entries).toHaveLength(2);
    expect(capsule?.entries.map((entry) => entry.resref)).toEqual(['alpha', 'beta']);
    await expect(capsule?.getResourceBuffer('alpha', ResourceTypes.utc)).resolves.toEqual(
      Uint8Array.from([0x55, 0x54, 0x43, 0x20]),
    );
  });

  it('accepts MOD and SAV signatures through the ERF-backed code path', async () => {
    const modCapsule = await loadFromCapsuleBuffer(buildErfLikeBuffer('MOD '));
    const savCapsule = await loadFromCapsuleBuffer(buildErfLikeBuffer('SAV '));

    expect(modCapsule?.type).toBe('erf');
    expect(savCapsule?.type).toBe('erf');
    expect(modCapsule?.entries[0].ext).toBe('utc');
    expect(savCapsule?.entries[1].ext).toBe('uti'); // ResourceTypes.uti → type 2025
  });

  it('filters returned entries when supported types are provided', async () => {
    const capsule = await loadFromCapsuleBuffer(buildErfLikeBuffer('ERF '), [ResourceTypes.uti]);

    expect(capsule?.entries).toHaveLength(1);
    expect(capsule?.entries[0]).toMatchObject({
      resref: 'beta',
      resType: ResourceTypes.uti,
      ext: 'uti',
    });
  });

  it('loads RIM buffers built from the production helper', async () => {
    const rimBuffer = buildRimBuffer({
      resref: 'module',
      resType: ResourceTypes.ifo,
      data: Uint8Array.from([0x49, 0x46, 0x4f, 0x20]),
    });

    const capsule = await loadFromCapsuleBuffer(rimBuffer);

    expect(capsule?.type).toBe('rim');
    expect(capsule?.entries).toHaveLength(1);
    expect(capsule?.entries[0]).toMatchObject({
      resref: 'module',
      resType: ResourceTypes.ifo,
      ext: 'ifo',
    });
    await expect(capsule?.getResourceBuffer('module', ResourceTypes.ifo)).resolves.toEqual(
      Uint8Array.from([0x49, 0x46, 0x4f, 0x20]),
    );
  });

  it('returns null for non-capsule signatures and undersized buffers', async () => {
    await expect(loadFromCapsuleBuffer(new Uint8Array([0x52, 0x49, 0x4d]))).resolves.toBeNull();
    await expect(loadFromCapsuleBuffer(Uint8Array.from([0x54, 0x58, 0x49, 0x20]))).resolves.toBeNull();
  });
});
