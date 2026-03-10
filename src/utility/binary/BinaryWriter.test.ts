import { Endians } from '@/enums/resource/Endians';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

describe('BinaryWriter', () => {
  it('writes integer and floating point primitives that round-trip through BinaryReader', () => {
    const writer = new BinaryWriter();
    writer.writeUInt8(1);
    writer.writeUInt16(2);
    writer.writeUInt32(3);
    writer.writeSingle(-123.456);
    writer.writeDouble(123.457);

    const reader = new BinaryReader(writer.buffer);
    expect(reader.readUInt8()).toBe(1);
    expect(reader.readUInt16()).toBe(2);
    expect(reader.readUInt32()).toBe(3);
    expect(reader.readSingle()).toBeCloseTo(-123.456, 3);
    expect(reader.readDouble()).toBeCloseTo(123.457, 6);
  });

  it('writeStringNullTerminated writes a null terminator to an empty buffer', () => {
    const writer = new BinaryWriter();
    writer.writeStringNullTerminated('hello');

    expect(writer.buffer).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00]));
    expect(writer.tell()).toBe(6);
  });

  it('preserves existing buffer size when the null-terminated write already fits', () => {
    const writer = new BinaryWriter(new Uint8Array(10));
    writer.seek(3);
    writer.writeStringNullTerminated('hi');

    expect(writer.buffer.length).toBe(10);
    expect(writer.buffer.slice(3, 6)).toEqual(new Uint8Array([0x68, 0x69, 0x00]));
    expect(writer.tell()).toBe(6);
  });

  it('extends the buffer when writing past the current size', () => {
    const writer = new BinaryWriter(new Uint8Array(5));
    writer.seek(10);
    writer.writeStringNullTerminated('test');

    expect(writer.buffer.length).toBeGreaterThanOrEqual(15);
    expect(writer.buffer.slice(10, 15)).toEqual(new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00]));
    expect(writer.tell()).toBe(15);
  });

  it('supports multiple null-terminated string writes', () => {
    const writer = new BinaryWriter();
    writer.writeStringNullTerminated('first');
    writer.writeStringNullTerminated('second');

    expect(new TextDecoder().decode(writer.buffer)).toBe('first\0second\0');
    expect(writer.tell()).toBe(13);
  });

  it('writes empty null-terminated strings as only the terminator', () => {
    const writer = new BinaryWriter();
    writer.writeStringNullTerminated('');

    expect(writer.buffer).toEqual(new Uint8Array([0x00]));
    expect(writer.tell()).toBe(1);
  });

  it('writeBytes and writeChars append raw data sequentially', () => {
    const writer = new BinaryWriter();
    writer.writeChars('AB');
    writer.writeBytes(new Uint8Array([0x43, 0x44]));

    expect(writer.buffer).toEqual(new Uint8Array([0x41, 0x42, 0x43, 0x44]));
  });

  it('supports skip and seek before later writes', () => {
    const writer = new BinaryWriter();
    writer.writeUInt8(1);
    writer.skip(2);
    writer.writeUInt8(4);
    writer.seek(1);
    writer.writeUInt8(2);
    writer.writeUInt8(3);

    expect(writer.buffer).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('writes big-endian primitives when configured for big endian mode', () => {
    const writer = new BinaryWriter(new Uint8Array(0), Endians.BIG);
    writer.writeUInt8(0x40);
    writer.writeString('A', 'ascii');
    writer.writeUInt16(1);
    writer.writeUInt32(2);
    writer.writeInt16(-3);
    writer.writeInt32(-4);
    writer.writeInt64(-5n);
    writer.writeSingle(1.0);

    expect(writer.buffer).toEqual(
      new Uint8Array([
        0x40,
        0x41,
        0x00, 0x01,
        0x00, 0x00, 0x00, 0x02,
        0xff, 0xfd,
        0xff, 0xff, 0xff, 0xfc,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfb,
        0x3f, 0x80, 0x00, 0x00,
      ]),
    );
  });

  it('writes 64-bit values that round-trip through BinaryReader', () => {
    const writer = new BinaryWriter();
    writer.writeUInt64(0x0102030405060708n);
    writer.writeInt64(-5n);

    const reader = new BinaryReader(writer.buffer);
    expect(reader.readUInt64()).toBe(0x0102030405060708n);
    expect(reader.readInt64()).toBe(-5n);
  });
});
