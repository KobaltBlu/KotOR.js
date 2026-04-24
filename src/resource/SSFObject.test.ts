import { SSFObject } from '@/resource/SSFObject';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

describe('SSFObject', () => {
  function makeSSFBuffer(
    soundRefs: number[] = new Array(28).fill(0xffffffff),
    options: { fileType?: string; fileVersion?: string } = {}
  ): Uint8Array {
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
      123075, 123074, 123073, 123072, 123071, 123070, 123069, 123068, 123067, 123066, 123065, 123064, 123063, 123062,
      123061, 123060, 123059, 123058, 123057, 123056, 123055, 123054, 123053, 123052, 123051, 123050, 123049, 123048,
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
    expect(() => new SSFObject(makeSSFBuffer([], { fileType: 'BAD ' }))).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );
    expect(() => new SSFObject(makeSSFBuffer([], { fileVersion: 'V2.0' }))).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );
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

  // --- Vendor-derived: parse exact 40-entry binary from test_ssf.py ---

  it('parses exact 40-entry vendor binary and truncates to 28 named slots', () => {
    // Inlined BINARY_TEST_DATA from test_ssf.py
    // b"SSF V1.1\x0c\x00\x00\x00" + 28 StrRefs (123075..123048) + 12 × 0xFFFFFFFF
    const bytes: number[] = [
      // Header: "SSF " + "V1.1"
      0x53, 0x53, 0x46, 0x20, 0x56, 0x31, 0x2e, 0x31,
      // Offset: 12 (little-endian)
      0x0c, 0x00, 0x00, 0x00,
    ];
    // 28 named StrRefs: 123075 = 0x1E0C3, 123074 = 0x1E0C2, ... 123048 = 0x1E0A8
    for (let i = 0; i < 28; i++) {
      const val = 123075 - i; // 123075 down to 123048
      bytes.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff);
    }
    // 12 null entries: 0xFFFFFFFF
    for (let i = 0; i < 12; i++) {
      bytes.push(0xff, 0xff, 0xff, 0xff);
    }
    const buf = new Uint8Array(bytes);
    expect(buf.byteLength).toBe(172); // 8+4 + 40*4 = 172

    const ssf = new SSFObject(buf);

    expect(ssf.sound_refs).toHaveLength(28);
    // Validate all 28 named slots (vendor validate_io)
    expect(ssf.sound_refs[0]).toBe(123075); // BATTLE_CRY_1
    expect(ssf.sound_refs[1]).toBe(123074); // BATTLE_CRY_2
    expect(ssf.sound_refs[2]).toBe(123073); // BATTLE_CRY_3
    expect(ssf.sound_refs[3]).toBe(123072); // BATTLE_CRY_4
    expect(ssf.sound_refs[4]).toBe(123071); // BATTLE_CRY_5
    expect(ssf.sound_refs[5]).toBe(123070); // BATTLE_CRY_6
    expect(ssf.sound_refs[6]).toBe(123069); // SELECT_1
    expect(ssf.sound_refs[7]).toBe(123068); // SELECT_2
    expect(ssf.sound_refs[8]).toBe(123067); // SELECT_3
    expect(ssf.sound_refs[9]).toBe(123066); // ATTACK_GRUNT_1
    expect(ssf.sound_refs[10]).toBe(123065); // ATTACK_GRUNT_2
    expect(ssf.sound_refs[11]).toBe(123064); // ATTACK_GRUNT_3
    expect(ssf.sound_refs[12]).toBe(123063); // PAIN_GRUNT_1
    expect(ssf.sound_refs[13]).toBe(123062); // PAIN_GRUNT_2
    expect(ssf.sound_refs[14]).toBe(123061); // LOW_HEALTH
    expect(ssf.sound_refs[15]).toBe(123060); // DEAD
    expect(ssf.sound_refs[16]).toBe(123059); // CRITICAL_HIT
    expect(ssf.sound_refs[17]).toBe(123058); // TARGET_IMMUNE
    expect(ssf.sound_refs[18]).toBe(123057); // LAY_MINE
    expect(ssf.sound_refs[19]).toBe(123056); // DISARM_MINE
    expect(ssf.sound_refs[20]).toBe(123055); // BEGIN_STEALTH
    expect(ssf.sound_refs[21]).toBe(123054); // BEGIN_SEARCH
    expect(ssf.sound_refs[22]).toBe(123053); // BEGIN_UNLOCK
    expect(ssf.sound_refs[23]).toBe(123052); // UNLOCK_FAILED
    expect(ssf.sound_refs[24]).toBe(123051); // UNLOCK_SUCCESS
    expect(ssf.sound_refs[25]).toBe(123050); // SEPARATED_FROM_PARTY
    expect(ssf.sound_refs[26]).toBe(123049); // REJOINED_PARTY
    expect(ssf.sound_refs[27]).toBe(123048); // POISONED
  });

  it('toBuffer re-serializes parsed 40-entry binary to 28-slot canonical form', () => {
    // Same binary as above; toBuffer() must produce exactly 12+28*4 = 124 bytes
    const bytes: number[] = [0x53, 0x53, 0x46, 0x20, 0x56, 0x31, 0x2e, 0x31, 0x0c, 0x00, 0x00, 0x00];
    for (let i = 0; i < 28; i++) {
      const val = 123075 - i;
      bytes.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff);
    }
    for (let i = 0; i < 12; i++) bytes.push(0xff, 0xff, 0xff, 0xff);

    const ssf = new SSFObject(new Uint8Array(bytes));
    const out = ssf.toBuffer();
    expect(out.byteLength).toBe(12 + 28 * 4); // canonical 124-byte form
    const ssf2 = new SSFObject(out);
    expect(ssf2.sound_refs[0]).toBe(123075);
    expect(ssf2.sound_refs[27]).toBe(123048);
  });
});
