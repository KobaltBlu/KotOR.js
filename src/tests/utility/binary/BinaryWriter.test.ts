/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { Endians } from '@/enums/resource/Endians';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

describe('BinaryWriter', () => {
  it('enlarges buffer as data is appended', () => {
    const w = new BinaryWriter(new Uint8Array(0));
    expect(w.buffer.length).toBe(0);
    w.writeUInt32(1);
    expect(w.buffer.length).toBe(4);
    w.writeUInt16(2);
    expect(w.buffer.length).toBe(6);
    expect(w.tell()).toBe(6);
  });

  it('writes BE integers when Endians.BIG', () => {
    const w = new BinaryWriter(new Uint8Array(0), Endians.BIG);
    w.writeUInt16(0x1234);
    expect(Array.from(w.buffer)).toEqual([0x12, 0x34]);
  });

  it('round-trips core integer types with BinaryReader', () => {
    const w = new BinaryWriter();
    w.writeInt8(-5);
    w.writeUInt8(200);
    w.writeInt16(-300);
    w.writeUInt16(40000);
    w.writeInt32(-70000);
    w.writeUInt32(0xABCDEF01);
    const br = new BinaryReader(w.buffer);
    expect(br.readInt8()).toBe(-5);
    expect(br.readUInt8()).toBe(200);
    expect(br.readInt16()).toBe(-300);
    expect(br.readUInt16()).toBe(40000);
    expect(br.readInt32()).toBe(-70000);
    expect(br.readUInt32()).toBe(0xABCDEF01);
  });
});
