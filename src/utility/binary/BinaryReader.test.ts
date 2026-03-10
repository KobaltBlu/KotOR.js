import { Endians } from '@/enums/resource/Endians';
import { BinaryReader } from '@/utility/binary/BinaryReader';

describe('BinaryReader', () => {
  it('reads unsigned and signed integer primitives', () => {
    const data = new Uint8Array([
      0x01,
      0x02, 0x00,
      0x03, 0x00, 0x00, 0x00,
      0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xff,
      0xfe, 0xff,
      0xfd, 0xff, 0xff, 0xff,
      0xfc, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);

    const reader = new BinaryReader(data);
    expect(reader.readUInt8()).toBe(1);
    expect(reader.readUInt16()).toBe(2);
    expect(reader.readUInt32()).toBe(3);
    expect(reader.readUInt64()).toBe(BigInt(4));
    expect(reader.readInt8()).toBe(-1);
    expect(reader.readInt16()).toBe(-2);
    expect(reader.readInt32()).toBe(-3);
    expect(reader.readInt64()).toBe(BigInt(-4));
  });

  it('reads single and double precision floats', () => {
    const data = new Uint8Array([0x79, 0xe9, 0xf6, 0xc2, 0x68, 0x91, 0xed, 0x7c, 0x3f, 0xdd, 0x5e, 0x40]);
    const reader = new BinaryReader(data);

    expect(reader.readSingle()).toBeCloseTo(-123.456, 3);
    expect(reader.readDouble()).toBeCloseTo(123.457, 6);
  });

  it('supports tell, seek, skip, and length', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const reader = new BinaryReader(data);

    reader.readBytes(3);
    expect(reader.tell()).toBe(3);
    reader.skip(2);
    expect(reader.tell()).toBe(5);
    reader.seek(1);
    expect(reader.tell()).toBe(1);
    expect(reader.length()).toBe(8);
    expect(reader.readUInt8()).toBe(2);
  });

  it('supports subarray-backed buffers and preserves slice endian mode', () => {
    const backing = new Uint8Array([0xaa, 0x34, 0x12, 0xbb]);
    const reader = new BinaryReader(backing.subarray(1, 3), Endians.LITTLE);

    expect(reader.length()).toBe(2);
    expect(reader.readUInt16()).toBe(0x1234);

    const bigEndianReader = new BinaryReader(new Uint8Array([0x12, 0x34, 0x56, 0x78]), Endians.BIG);
    const sliced = bigEndianReader.slice(0, 2);
    expect(sliced.readUInt16()).toBe(0x1234);
  });

  it('reads fixed-length and null-terminated strings', () => {
    const data = new Uint8Array([...new TextEncoder().encode('helloworld'), 0x00]);
    const reader = new BinaryReader(data);
    expect(reader.readChars(10)).toBe('helloworld');

    const second = new BinaryReader(data);
    expect(second.readString()).toBe('helloworld');
  });

  it('slice returns a new reader over the requested range', () => {
    const reader = new BinaryReader(new Uint8Array([10, 20, 30, 40, 50]));
    const sliced = reader.slice(1, 4);

    expect(sliced.length()).toBe(3);
    expect(sliced.readUInt8()).toBe(20);
    expect(sliced.readUInt8()).toBe(30);
    expect(sliced.readUInt8()).toBe(40);
  });

  it('reuse resets position and swaps the buffer', () => {
    const reader = new BinaryReader(new Uint8Array([1, 2, 3]));
    reader.readUInt8();
    reader.reuse(new Uint8Array([9, 8]));

    expect(reader.tell()).toBe(0);
    expect(reader.readUInt8()).toBe(9);
    expect(reader.readUInt8()).toBe(8);
  });

  it('reads big-endian primitives when constructed with big endian mode', () => {
    const reader = new BinaryReader(
      new Uint8Array([
        0xff, 0x01,
        0xff, 0xff, 0xff, 0x02,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x03,
        0xff, 0x01,
        0xff, 0xff, 0xff, 0x02,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x03,
        0x3f, 0x80, 0x00, 0x00,
        0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]),
      Endians.BIG,
    );

    expect(reader.readUInt16()).toBe(65281);
    expect(reader.readUInt32()).toBe(4294967042);
    expect(reader.readUInt64()).toBe(BigInt('18446744073709551363'));
    expect(reader.readInt16()).toBe(-255);
    expect(reader.readInt32()).toBe(-254);
    expect(reader.readInt64()).toBe(BigInt(-253));
    expect(reader.readSingle()).toBeCloseTo(1.0, 5);
    expect(reader.readDouble()).toBeCloseTo(1.0, 5);
  });

  it('returns safe defaults when reading beyond the end of the buffer', () => {
    const reader = new BinaryReader(new Uint8Array(0));
    expect(reader.readUInt8()).toBe(0);
    expect(reader.readInt32()).toBe(0);
    expect(reader.readUInt64()).toBe(BigInt(0));
    expect(reader.readChars(4)).toBe('\0');
    expect(reader.readString()).toBe('');
    expect(reader.readBytes(4)).toEqual(new Uint8Array(0));
  });

  it('returns safe defaults for truncated multi-byte reads without throwing', () => {
    const reader = new BinaryReader(new Uint8Array([0x12]));

    expect(reader.readUInt16()).toBe(0);
    expect(reader.readUInt32()).toBe(0);
    expect(reader.readUInt64()).toBe(BigInt(0));
    expect(reader.readSingle()).toBe(0);
    expect(reader.readDouble()).toBe(0);
    expect(reader.readChars(4)).toBe('\x12');
    expect(reader.tell()).toBe(1);
  });
});
