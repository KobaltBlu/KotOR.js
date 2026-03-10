import { ERFObject } from '@/resource/ERFObject';
import { ResourceTypes } from '@/resource/ResourceTypes';

describe('ERFObject', () => {
  function makeErfObject(): ERFObject {
    const erf = new ERFObject();
    erf.header.fileType = 'ERF ';
    erf.header.fileVersion = 'V1.0';
    erf.type = 'erf';
    erf.group = 'erf';
    erf.addResource('1', ResourceTypes.txt, new TextEncoder().encode('abc'));
    erf.addResource('2', ResourceTypes.txt, new TextEncoder().encode('def'));
    erf.addResource('3', ResourceTypes.txt, new TextEncoder().encode('ghi'));
    return erf;
  }

  function makeErfBuffer(): Uint8Array {
    return makeErfObject().getExportBuffer();
  }

  it('loads a synthetic ERF buffer and resolves resources by resref', async () => {
    const erf = new ERFObject(makeErfBuffer());
    await erf.load();

    expect(erf.header.fileType).toBe('ERF ');
    expect(erf.header.fileVersion).toBe('V1.0');
    expect(erf.keyList).toHaveLength(3);
    expect(erf.resources).toHaveLength(3);

    expect(new TextDecoder().decode(await erf.getResourceBufferByResRef('1', ResourceTypes.txt))).toBe('abc');
    expect(new TextDecoder().decode(await erf.getResourceBufferByResRef('2', ResourceTypes.txt))).toBe('def');
    expect(new TextDecoder().decode(await erf.getResourceBufferByResRef('3', ResourceTypes.txt))).toBe('ghi');
  });

  it('getResourcesByType returns all matching entries', async () => {
    const erf = new ERFObject(makeErfBuffer());
    await erf.load();

    expect(erf.getResourcesByType(ResourceTypes.txt)).toHaveLength(3);
  });

  it('toJSON and fromJSON round-trip archive metadata', async () => {
    const erf = makeErfObject();

    const reloaded = new ERFObject();
    reloaded.fromJSON(erf.toJSON());

    expect(reloaded.header.fileType).toBe('ERF ');
    expect(reloaded.header.fileVersion).toBe('V1.0');
    expect(reloaded.keyList).toHaveLength(3);
    expect(reloaded.resources[0].data).toEqual(new TextEncoder().encode('abc'));
  });

  it('returns empty buffers for missing resources', async () => {
    const erf = new ERFObject(makeErfBuffer());
    await erf.load();

    expect(await erf.getResourceBufferByResRef('missing', ResourceTypes.txt)).toEqual(new Uint8Array(0));
  });

  it('rejects invalid type and version headers', async () => {
    const badType = new Uint8Array(makeErfBuffer());
    badType.set(new TextEncoder().encode('BAD '), 0);
    await expect(new ERFObject(badType).load()).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');

    const badVersion = new Uint8Array(makeErfBuffer());
    badVersion.set(new TextEncoder().encode('V2.0'), 4);
    await expect(new ERFObject(badVersion).load()).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('write/export round-trip preserves resource data (vendor binary_io pattern)', async () => {
    const exported = makeErfBuffer();
    const reloaded = new ERFObject(exported);
    await reloaded.load();

    expect(reloaded.keyList).toHaveLength(3);
    expect(reloaded.resources).toHaveLength(3);
    expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('1', ResourceTypes.txt))).toBe('abc');
    expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('2', ResourceTypes.txt))).toBe('def');
    expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('3', ResourceTypes.txt))).toBe('ghi');
  });

  it('accepts MOD and SAV file types', async () => {
    const modErf = new ERFObject();
    modErf.header.fileType = 'MOD ';
    modErf.header.fileVersion = 'V1.0';
    modErf.addResource('m', ResourceTypes.txt, new TextEncoder().encode('mod'));
    const modReloaded = new ERFObject(modErf.getExportBuffer());
    await modReloaded.load();
    expect(modReloaded.header.fileType).toBe('MOD ');
    expect(modReloaded.keyList).toHaveLength(1);
    expect(new TextDecoder().decode(await modReloaded.getResourceBufferByResRef('m', ResourceTypes.txt))).toBe('mod');

    const savErf = new ERFObject();
    savErf.header.fileType = 'SAV ';
    savErf.header.fileVersion = 'V1.0';
    savErf.addResource('test', ResourceTypes.txt, new TextEncoder().encode('save'));
    const savReloaded = new ERFObject(savErf.getExportBuffer());
    await savReloaded.load();
    expect(savReloaded.header.fileType).toBe('SAV ');
    expect(new TextDecoder().decode(await savReloaded.getResourceBufferByResRef('test', ResourceTypes.txt))).toBe('save');
  });

  it('XML round-trip preserves archive structure', () => {
    const erf = makeErfObject();

    const xml = erf.toXML();
    expect(xml.length).toBeGreaterThan(0);
    const reloaded = new ERFObject();
    reloaded.fromXML(xml);
    expect(reloaded.keyList).toHaveLength(3);
    expect(reloaded.resources[0].data).toEqual(new TextEncoder().encode('abc'));
  });

  it('YAML round-trip preserves archive structure', () => {
    const erf = makeErfObject();

    const yaml = erf.toYAML();
    expect(yaml.length).toBeGreaterThan(0);
    const reloaded = new ERFObject();
    reloaded.fromYAML(yaml);
    expect(reloaded.keyList).toHaveLength(3);
    expect(reloaded.resources[1].data).toEqual(new TextEncoder().encode('def'));
  });

  it('TOML round-trip preserves archive structure', () => {
    const erf = makeErfObject();

    const toml = erf.toTOML();
    expect(toml.length).toBeGreaterThan(0);
    const reloaded = new ERFObject();
    reloaded.fromTOML(toml);
    expect(reloaded.keyList).toHaveLength(3);
    expect(reloaded.resources[2].data).toEqual(new TextEncoder().encode('ghi'));
  });

  it('addResource increments keyList and resources in lockstep', () => {
    const erf = new ERFObject();
    erf.header.fileType = 'ERF ';
    erf.header.fileVersion = 'V1.0';

    expect(erf.keyList).toHaveLength(0);
    expect(erf.resources).toHaveLength(0);

    erf.addResource('a', ResourceTypes.txt, new TextEncoder().encode('x'));
    erf.addResource('b', ResourceTypes.txt, new TextEncoder().encode('yy'));

    expect(erf.keyList).toHaveLength(2);
    expect(erf.resources).toHaveLength(2);
    expect(erf.keyList[0].resRef).toBe('a');
    expect(erf.keyList[1].resRef).toBe('b');
    expect(erf.resources[0].size).toBe(1);
    expect(erf.resources[1].size).toBe(2);
  });
});
