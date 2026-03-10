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

  it('returns safe defaults when reading beyond the end of the buffer', () => {
    const reader = new BinaryReader(new Uint8Array(0));
    expect(reader.readUInt8()).toBe(0);
    expect(reader.readInt32()).toBe(0);
    expect(reader.readUInt64()).toBe(BigInt(0));
    expect(reader.readChars(4)).toBe('\0');
    expect(reader.readString()).toBe('');
    expect(reader.readBytes(4)).toEqual(new Uint8Array(0));
  });
});
