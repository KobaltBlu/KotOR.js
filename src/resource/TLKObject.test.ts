import { TLKObject } from '@/resource/TLKObject';
import { TLKString } from '@/resource/TLKString';

describe('TLKObject', () => {
  function makeTLK(): TLKObject {
    const tlk = new TLKObject(new Uint8Array(0));
    tlk.FileType = 'TLK ';
    tlk.FileVersion = 'V3.0';
    tlk.LanguageID = 0;
    tlk.TLKStrings = [
      new TLKString(0, 'resref01', 0, 0, 0, 6, 0, 'abcdef'),
      new TLKString(0, 'resref02', 0, 0, 0, 10, 0, 'ghijklmnop'),
      new TLKString(0, '', 0, 0, 0, 10, 0, 'qrstuvwxyz'),
    ];
    tlk.StringCount = tlk.TLKStrings.length;
    tlk.StringEntriesOffset = 20 + (tlk.StringCount * 40);
    return tlk;
  }

  async function parseTLK(buffer: Uint8Array): Promise<TLKObject> {
    const tlk = new TLKObject(new Uint8Array(0));
    await tlk.LoadFromBuffer(buffer);
    return tlk;
  }

  it('parses vendor-like binary talk table data', async () => {
    const tlk = await parseTLK(makeTLK().toBuffer());

    expect(tlk.FileType).toBe('TLK ');
    expect(tlk.FileVersion).toBe('V3.0');
    expect(tlk.StringCount).toBe(3);
    expect(tlk.TLKStrings[0].Value).toBe('abcdef');
    expect(tlk.TLKStrings[0].SoundResRef).toBe('resref01');
    expect(tlk.TLKStrings[1].Value).toBe('ghijklmnop');
    expect(tlk.TLKStrings[1].SoundResRef).toBe('resref02');
    expect(tlk.TLKStrings[2].Value).toBe('qrstuvwxyz');
    expect(tlk.TLKStrings[2].SoundResRef).toBe('');
  });

  it('toBuffer round-trips binary TLK data', async () => {
    const source = makeTLK();
    const reloaded = await parseTLK(source.toBuffer());

    expect(reloaded.StringCount).toBe(source.TLKStrings.length);
    expect(reloaded.GetStringById(0)).toBe('abcdef');
    expect(reloaded.GetStringById(1)).toBe('ghijklmnop');
    expect(reloaded.GetStringById(2)).toBe('qrstuvwxyz');
  });

  it('Search finds matching entries and preserves indexes', () => {
    const tlk = makeTLK();
    const matches = tlk.Search('ghi');

    expect(matches).toHaveLength(1);
    expect(matches[0].index).toBe(1);
    expect(matches[0].value).toBe('ghijklmnop');
  });

  it('toJSON and fromJSON round-trip talk table metadata', () => {
    const source = makeTLK();
    const reloaded = TLKObject.fromJSON(source.toJSON());

    expect(reloaded.FileType).toBe('TLK ');
    expect(reloaded.FileVersion).toBe('V3.0');
    expect(reloaded.StringCount).toBe(3);
    expect(reloaded.TLKStrings[0].Value).toBe('abcdef');
    expect(reloaded.TLKStrings[1].SoundResRef).toBe('resref02');
  });

  it('GetStringById returns vendor-like empty strings for invalid ids', () => {
    const tlk = makeTLK();

    expect(tlk.GetStringById(-1)).toBe('');
    expect(tlk.GetStringById(3)).toBe('');
  });

  it('GetStringById invokes the callback for cached strings', () => {
    const tlk = makeTLK();
    const onReturn = jest.fn();

    expect(tlk.GetStringById(1, onReturn)).toBe('ghijklmnop');
    expect(onReturn).toHaveBeenCalledWith('ghijklmnop');
  });

  it('XML round-trips talk table entries', () => {
    const source = makeTLK();
    const reloaded = TLKObject.fromXML(source.toXML());

    expect(reloaded.LanguageID).toBe(0);
    expect(reloaded.StringCount).toBe(3);
    expect(reloaded.TLKStrings[0].SoundResRef).toBe('resref01');
    expect(reloaded.TLKStrings[2].Value).toBe('qrstuvwxyz');
  });

  it('YAML and TOML round-trip talk table entries', () => {
    const source = makeTLK();
    const yamlReloaded = TLKObject.fromYAML(source.toYAML());
    const tomlReloaded = TLKObject.fromTOML(source.toTOML());

    expect(yamlReloaded.StringCount).toBe(3);
    expect(yamlReloaded.TLKStrings[1].Value).toBe('ghijklmnop');
    expect(tomlReloaded.StringCount).toBe(3);
    expect(tomlReloaded.TLKStrings[2].SoundResRef).toBe('');
  });

  it('constructs empty instances without trying to read an empty path', () => {
    const tlk = new TLKObject();
    expect(tlk.TLKStrings).toEqual([]);
    expect(tlk.StringCount).toBe(0);
    expect(tlk.FileType).toBe('TLK ');
    expect(tlk.FileVersion).toBe('V3.0');
  });

  it('rejects invalid headers and truncated string data', async () => {
    const badType = makeTLK().toBuffer();
    badType[0] = 0x42;
    await expect(parseTLK(badType)).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');

    const badVersion = makeTLK().toBuffer();
    badVersion[4] = 0x56;
    badVersion[5] = 0x34;
    badVersion[6] = 0x2e;
    badVersion[7] = 0x30;
    await expect(parseTLK(badVersion)).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');

    const truncated = new Uint8Array(makeTLK().toBuffer().slice(0, -2));
    await expect(parseTLK(truncated)).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');
  });
});
