/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { Endians } from '@core/enums/resource/Endians';
import { BinaryReader } from '@core/binary/BinaryReader';
import { BinaryWriter } from '@core/binary/BinaryWriter';

describe('BinaryReader', () => {
  it('reads LE integers and advances tell()', () => {
    const buf = new Uint8Array([0x78, 0x56, 0x34, 0x12, 0xFF, 0xFE]);
    const br = new BinaryReader(buf, Endians.LITTLE);
    expect(br.readUInt32()).toBe(0x12345678);
    expect(br.tell()).toBe(4);
    expect(br.readInt16()).toBe(-257);
    expect(br.tell()).toBe(6);
  });

  it('reads BE integers when Endians.BIG', () => {
    const buf = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const br = new BinaryReader(buf, Endians.BIG);
    expect(br.readUInt32()).toBe(0x12345678);
  });

  it('seek and skip reposition the cursor', () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5]);
    const br = new BinaryReader(buf);
    br.skip(2);
    expect(br.readUInt8()).toBe(3);
    br.seek(0);
    expect(br.readUInt8()).toBe(1);
  });

  it('reads fixed chars and null-terminated strings', () => {
    const w = new BinaryWriter();
    w.writeChars('KEY ');
    w.writeStringNullTerminated('hello');
    const br = new BinaryReader(w.buffer);
    expect(br.readChars(4)).toBe('KEY ');
    expect(br.readString()).toBe('hello');
  });

  it('returns safe defaults past EOF', () => {
    const br = new BinaryReader(new Uint8Array(0));
    expect(br.readUInt8()).toBe(0);
    expect(br.readString()).toBe('');
    expect(br.readBytes(4).length).toBe(0);
  });

  it('round-trips floats with BinaryWriter', () => {
    const w = new BinaryWriter();
    w.writeSingle(1.5);
    w.writeDouble(Math.PI);
    const br = new BinaryReader(w.buffer);
    expect(br.readSingle()).toBeCloseTo(1.5, 5);
    expect(br.readDouble()).toBeCloseTo(Math.PI, 10);
  });
});
