import { SSFObject } from '@/resource/SSFObject';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';


describe('SSFObject', () => {
  function makeSSFBuffer(soundRefs: number[] = new Array(28).fill(0xffffffff), options: { fileType?: string; fileVersion?: string } = {}): Uint8Array {
    const { fileType = 'SSF ', fileVersion = 'V1.1' } = options;
    const bw = new BinaryWriter(new Uint8Array(12 + soundRefs.length * 4));
    bw.writeChars(fileType);
    bw.writeChars(fileVersion);
    bw.writeUInt32(12);
    for (let i = 0; i < soundRefs.length; i++) bw.writeUInt32(soundRefs[i]);
    return bw.buffer;
  }

  function makeVendorLikeSoundRefs(): number[] {
    return [
      123075, 123074, 123073, 123072, 123071, 123070, 123069,
      123068, 123067, 123066, 123065, 123064, 123063, 123062,
      123061, 123060, 123059, 123058, 123057, 123056, 123055,
      123054, 123053, 123052, 123051, 123050, 123049, 123048,
    ];
  }

  it('Open parses minimal SSF and populates sound_refs', () => {
    const buf = makeSSFBuffer();
    const ssf = new SSFObject(buf);
    expect(ssf.FileType).toBe('SSF ');
    expect(ssf.FileVersion).toBe('V1.1');
    expect(ssf.sound_refs).toHaveLength(28);
    expect(ssf.sound_refs.every((r) => r === 0xffffffff || r === -1)).toBe(true);
  });

  it('Open parses vendor-like sound reference ordering', () => {
    const ssf = new SSFObject(makeSSFBuffer(makeVendorLikeSoundRefs()));

    expect(ssf.sound_refs).toHaveLength(28);
    expect(ssf.sound_refs[0]).toBe(123075);
    expect(ssf.sound_refs[5]).toBe(123070);
    expect(ssf.sound_refs[15]).toBe(123060);
    expect(ssf.sound_refs[27]).toBe(123048);
  });

  it('toBuffer round-trip preserves header and 28 entries', () => {
    const buf = makeSSFBuffer();
    const ssf = new SSFObject(buf);
    const out = ssf.toBuffer();
    expect(out.length).toBe(12 + 28 * 4);
    expect(out[0]).toBe(0x53);
    expect(out[1]).toBe(0x53);
    expect(out[2]).toBe(0x46);
    expect(out[3]).toBe(0x20);
    const ssf2 = new SSFObject(out);
    expect(ssf2.sound_refs.length).toBe(28);
  });

  it('toBuffer writes StrRefs and round-trips', () => {
    const buf = makeSSFBuffer();
    const ssf = new SSFObject(buf);
    ssf.sound_refs[0] = 100;
    ssf.sound_refs[5] = 200;
    const out = ssf.toBuffer();
    const ssf2 = new SSFObject(out);
    expect(ssf2.sound_refs[0]).toBe(100);
    expect(ssf2.sound_refs[5]).toBe(200);
  });

  it('pads to 28 slots when file has fewer entries', () => {
    const bw = new BinaryWriter(new Uint8Array(12 + 4 * 5));
    bw.writeChars('SSF ');
    bw.writeChars('V1.1');
    bw.writeUInt32(12);
    for (let i = 0; i < 5; i++) bw.writeUInt32(0);
    const ssf = new SSFObject(bw.buffer);
    expect(ssf.sound_refs).toHaveLength(28);
    expect(ssf.sound_refs[0]).toBe(0);
    expect(ssf.sound_refs[4]).toBe(0);
    expect(ssf.sound_refs[5]).toBe(-1);
    expect(ssf.sound_refs[27]).toBe(-1);
  });

  it('rejects invalid headers', () => {
    expect(() => new SSFObject(makeSSFBuffer([], { fileType: 'BAD ' }))).toThrow('Tried to save or load an unsupported or corrupted file.');
    expect(() => new SSFObject(makeSSFBuffer([], { fileVersion: 'V2.0' }))).toThrow('Tried to save or load an unsupported or corrupted file.');
    expect(() => new SSFObject(new Uint8Array(4))).toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('toBuffer round-trip preserves all 28 vendor slot values', () => {
    const refs = makeVendorLikeSoundRefs();
    const ssf = new SSFObject(makeSSFBuffer(refs));
    const out = ssf.toBuffer();
    const ssf2 = new SSFObject(out);

    expect(ssf2.sound_refs).toHaveLength(28);
    for (let i = 0; i < 28; i++) {
      expect(ssf2.sound_refs[i]).toBe(refs[i]);
    }
  });

  it('toJSON and fromJSON round-trip all slots', () => {
    const ssf = new SSFObject(makeSSFBuffer(makeVendorLikeSoundRefs()));
    const json = ssf.toJSON();
    const reloaded = new SSFObject();
    reloaded.fromJSON(json);

    expect(reloaded.sound_refs).toHaveLength(28);
    expect(reloaded.sound_refs[0]).toBe(123075);
    expect(reloaded.sound_refs[27]).toBe(123048);
  });

  it('XML round-trip preserves SSF data', () => {
    const ssf = new SSFObject(makeSSFBuffer(makeVendorLikeSoundRefs()));
    const xml = ssf.toXML();
    expect(xml.length).toBeGreaterThan(0);
    const reloaded = new SSFObject();
    reloaded.fromXML(xml);
    expect(reloaded.sound_refs).toHaveLength(28);
    expect(reloaded.sound_refs[0]).toBe(123075);
  });

  it('YAML round-trip preserves SSF data', () => {
    const ssf = new SSFObject(makeSSFBuffer(makeVendorLikeSoundRefs()));
    const yaml = ssf.toYAML();
    expect(yaml.length).toBeGreaterThan(0);
    const reloaded = new SSFObject();
    reloaded.fromYAML(yaml);
    expect(reloaded.sound_refs).toHaveLength(28);
    expect(reloaded.sound_refs[15]).toBe(123060);
  });

  it('TOML round-trip preserves SSF data', () => {
    const ssf = new SSFObject(makeSSFBuffer(makeVendorLikeSoundRefs()));
    const toml = ssf.toTOML();
    expect(toml.length).toBeGreaterThan(0);
    const reloaded = new SSFObject();
    reloaded.fromTOML(toml);
    expect(reloaded.sound_refs).toHaveLength(28);
    expect(reloaded.sound_refs[5]).toBe(123070);
  });

  it('default constructor creates valid empty SSF', () => {
    const ssf = new SSFObject();
    expect(ssf.FileType).toBe('SSF ');
    expect(ssf.FileVersion).toBe('V1.1');
    expect(ssf.sound_refs).toHaveLength(28);
    expect(ssf.sound_refs.every((r) => r === -1)).toBe(true);
  });
});
