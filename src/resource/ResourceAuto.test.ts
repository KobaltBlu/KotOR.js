import { readResourceFromBuffer, resourceToBytes } from '@/resource/ResourceAuto';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { TPCObject } from '@/resource/TPCObject';
import { TwoDAObject } from '@/resource/TwoDAObject';
import { TXI } from '@/resource/TXI';
import { VISObject } from '@/resource/VISObject';
import { WAVObject } from '@/resource/WAVObject';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

describe('ResourceAuto', () => {
  function makeMinimal2DABuffer(): Uint8Array {
    const bw = new BinaryWriter();
    bw.writeChars('2DA ');
    bw.writeChars('V2.b');
    bw.writeByte(0x0a);
    bw.writeChars('col1\t');
    bw.writeByte(0x00);
    bw.writeUInt32(2);
    bw.writeChars('0\t');
    bw.writeChars('1\t');
    bw.writeUInt16(0);
    bw.writeUInt16(2);
    bw.writeUInt16(4);
    bw.writeChars('a');
    bw.writeByte(0);
    bw.writeChars('b');
    bw.writeByte(0);
    return bw.buffer;
  }

  it('readResourceFromBuffer with resType 2da returns TwoDAObject', () => {
    const buf = makeMinimal2DABuffer();
    const R = ResourceTypes as Record<string, number>;
    const res = readResourceFromBuffer(buf, R['2da']);
    expect(res).toBeInstanceOf(TwoDAObject);
    expect((res as TwoDAObject).RowCount).toBe(2);
  });

  it('readResourceFromBuffer auto-detects 2da', () => {
    const buf = makeMinimal2DABuffer();
    const res = readResourceFromBuffer(buf);
    expect(res).toBeInstanceOf(TwoDAObject);
    expect((res as TwoDAObject).getColumn('col1')).toEqual(['a', 'b']);
  });

  it('readResourceFromBuffer with resType txi returns TXI', () => {
    const buf = new TextEncoder().encode('compresstexture 0\nmipmap 1');
    const R = ResourceTypes as Record<string, number>;
    const res = readResourceFromBuffer(buf, R['txi']);
    expect(res).toBeInstanceOf(TXI);
  });

  it('readResourceFromBuffer with resType vis returns VISObject', () => {
    const buf = new TextEncoder().encode('room1 1\n  room2');
    const R = ResourceTypes as Record<string, number>;
    const res = readResourceFromBuffer(buf, R['vis']);
    expect(res).toBeInstanceOf(VISObject);
    expect((res as VISObject).rooms.size).toBeGreaterThanOrEqual(1);
  });

  it('readResourceFromBuffer with resType bmp returns TPCObject', () => {
    const bmp = new Uint8Array(70);
    const v = new DataView(bmp.buffer);
    bmp[0] = 0x42;
    bmp[1] = 0x4d;
    v.setUint32(2, 70, true);
    v.setUint32(10, 54, true);
    v.setUint32(14, 40, true);
    v.setUint32(18, 2, true);
    v.setUint32(22, 2, true);
    v.setUint16(26, 1, true);
    v.setUint16(28, 24, true);
    v.setUint32(30, 0, true);
    const R = ResourceTypes as Record<string, number>;
    const res = readResourceFromBuffer(bmp, R['bmp']);
    expect(res).toBeInstanceOf(TPCObject);
    expect((res as TPCObject).header.width).toBe(2);
    expect((res as TPCObject).header.height).toBe(2);
  });

  it('readResourceFromBuffer with resType wav returns WAVObject', () => {
    const riff = new Uint8Array(64);
    const enc = new TextEncoder();
    enc.encodeInto('RIFF', riff);
    new DataView(riff.buffer).setUint32(4, 56, true);
    enc.encodeInto('WAVE', riff.subarray(8));
    enc.encodeInto('fmt ', riff.subarray(12));
    new DataView(riff.buffer).setUint32(16, 16, true);
    enc.encodeInto('data', riff.subarray(36));
    new DataView(riff.buffer).setUint32(40, 0, true);
    const R = ResourceTypes as Record<string, number>;
    const res = readResourceFromBuffer(riff, R['wav']);
    expect(res).toBeInstanceOf(WAVObject);
  });

  it('resourceToBytes serializes TwoDAObject', () => {
    const buf = makeMinimal2DABuffer();
    const two = readResourceFromBuffer(buf) as TwoDAObject;
    const out = resourceToBytes(two);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).toBe(0x32); // '2'
    expect(out[1]).toBe(0x44); // 'D'
    expect(out[2]).toBe(0x41); // 'A'
  });

  it('resourceToBytes serializes TXI', () => {
    const txi = new TXI('mipmap 1');
    const out = resourceToBytes(txi);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(out)).toContain('mipmap');
  });

  it('resourceToBytes serializes VISObject', () => {
    const vis = new VISObject(new TextEncoder().encode('r1 1\n  r2'));
    const out = resourceToBytes(vis);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);
  });

  it('resourceToBytes serializes WAVObject', () => {
    const wav = new WAVObject();
    wav.data = new Uint8Array(0);
    const out = resourceToBytes(wav);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);
  });

  it('resourceToBytes serializes TPCObject as bmp when format bmp', () => {
    const bmp = new Uint8Array(70);
    const v = new DataView(bmp.buffer);
    bmp[0] = 0x42;
    bmp[1] = 0x4d;
    v.setUint32(2, 70, true);
    v.setUint32(10, 54, true);
    v.setUint32(14, 40, true);
    v.setUint32(18, 2, true);
    v.setUint32(22, 2, true);
    v.setUint16(26, 1, true);
    v.setUint16(28, 24, true);
    v.setUint32(30, 0, true);
    const tpc = readResourceFromBuffer(bmp, (ResourceTypes as Record<string, number>)['bmp']) as TPCObject;
    const out = resourceToBytes(tpc, { format: 'bmp' });
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out[0]).toBe(0x42);
    expect(out[1]).toBe(0x4d);
  });

  it('readResourceFromBuffer throws for buffer too short', () => {
    expect(() => readResourceFromBuffer(new Uint8Array(2))).toThrow(/short|not recognized/);
  });
});
