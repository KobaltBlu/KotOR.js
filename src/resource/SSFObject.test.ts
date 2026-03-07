import { SSFObject } from '@/resource/SSFObject';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';


describe('SSFObject', () => {
  function makeMinimalSSF(): Uint8Array {
    const bw = new BinaryWriter(new Uint8Array(12 + 28 * 4));
    bw.writeChars('SSF ');
    bw.writeChars('V1.1');
    bw.writeUInt32(12);
    for (let i = 0; i < 28; i++) bw.writeUInt32(0xffffffff);
    return bw.buffer;
  }

  it('Open parses minimal SSF and populates sound_refs', () => {
    const buf = makeMinimalSSF();
    const ssf = new SSFObject(buf);
    expect(ssf.FileType).toBe('SSF ');
    expect(ssf.FileVersion).toBe('V1.1');
    expect(ssf.sound_refs).toHaveLength(28);
    expect(ssf.sound_refs.every((r) => r === 0xffffffff || r === -1)).toBe(true);
  });

  it('toBuffer round-trip preserves header and 28 entries', () => {
    const buf = makeMinimalSSF();
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
    const buf = makeMinimalSSF();
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
});
