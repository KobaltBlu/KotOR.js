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

  it('readChars with latin1 encoding maps high bytes to Latin-1 code-points (decode-fallback parity)', () => {
    // Latin-1 bytes 0x80–0xFF map 1:1 to Unicode code-points U+0080–U+00FF.
    // 0xE9 = é, 0xF6 = ö
    const bytes = new Uint8Array([0x68, 0xe9, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0xf6, 0x72, 0x6c, 0x64]);
    const reader = new BinaryReader(bytes);
    const result = reader.readChars(bytes.length, 'latin1');
    expect(result).toBe('héllo wörld');
  });

  it('readChars with utf-8 encoding decodes multibyte sequences', () => {
    // UTF-8 encoding of "héllo wörld" (é = 0xC3 0xA9, ö = 0xC3 0xB6)
    const bytes = new Uint8Array([0x68, 0xc3, 0xa9, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0xc3, 0xb6, 0x72, 0x6c, 0x64]);
    const reader = new BinaryReader(bytes);
    const result = reader.readChars(bytes.length, 'utf-8');
    expect(result).toBe('héllo wörld');
  });

  it('readChars with utf-8 encoding strips the UTF-8 BOM (WHATWG TextDecoder ignores BOM by default)', () => {
    // The WHATWG TextDecoder spec strips the UTF-8 BOM when ignoreBOM is false (the default).
    // utf-8-sig is a Python-specific alias; in Node/browsers "utf-8" handles BOM stripping.
    const bom = [0xef, 0xbb, 0xbf];
    const text = new TextEncoder().encode('hello world');
    const bytes = new Uint8Array([...bom, ...text]);
    const reader = new BinaryReader(bytes);
    const result = reader.readChars(bytes.length, 'utf-8');
    expect(result).toBe('hello world');
  });

  it('readChars with default latin1 handles ASCII content identically to utf-8', () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    const latin1Reader = new BinaryReader(bytes);
    const utf8Reader = new BinaryReader(bytes);
    expect(latin1Reader.readChars(5)).toBe('Hello');           // default (latin1)
    expect(utf8Reader.readChars(5, 'utf-8')).toBe('Hello');   // explicit utf-8
  });

  it('readChars advances position by the number of bytes consumed (multi-byte encoding aware)', () => {
    // é in UTF-8 is 2 bytes; 5 bytes consumed for "héllo"
    const bytes = new Uint8Array([0x68, 0xc3, 0xa9, 0x6c, 0x6c, 0x6f]);
    const reader = new BinaryReader(bytes);
    reader.readChars(5, 'utf-8'); // reads 5 bytes → "héll"
    expect(reader.tell()).toBe(5);
  });

  it('slice returns a new reader over the requested range', () => {
    const reader = new BinaryReader(new Uint8Array([10, 20, 30, 40, 50]));
    const sliced = reader.slice(1, 4);

    expect(sliced.length()).toBe(3);
    expect(sliced.readUInt8()).toBe(20);
    expect(sliced.readUInt8()).toBe(30);
    expect(sliced.readUInt8()).toBe(40);
  });

  it('fromBytes supports offset and length slicing while preserving true source size', () => {
    const data = new Uint8Array([
      0x01,
      0x02, 0x00,
      0x03, 0x00, 0x00, 0x00,
      0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);

    const fromOffset = BinaryReader.fromBytes(data, 3);
    expect(fromOffset.readUInt32()).toBe(3);
    expect(fromOffset.readUInt64()).toBe(4n);
    expect(fromOffset.size()).toBe(12);
    expect(fromOffset.trueSize()).toBe(15);

    const fromOffsetAndLength = BinaryReader.fromBytes(data, 3, 4);
    expect(fromOffsetAndLength.size()).toBe(4);
    expect(fromOffsetAndLength.trueSize()).toBe(15);
    expect(fromOffsetAndLength.readUInt32()).toBe(3);
  });

  it('tracks remaining bytes independently from true source size', () => {
    const data = new Uint8Array([
      0x01,
      0x02, 0x00,
      0x03, 0x00, 0x00, 0x00,
      0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);

    const reader = BinaryReader.fromBytes(data);
    reader.readUInt32();
    reader.skip(2);
    reader.skip(1);
    expect(reader.remaining()).toBe(8);

    const offsetReader = BinaryReader.fromBytes(data, 3);
    offsetReader.readUInt32();
    expect(offsetReader.remaining()).toBe(8);

    const boundedReader = BinaryReader.fromBytes(data, 3, 4);
    boundedReader.readUInt16();
    expect(boundedReader.remaining()).toBe(2);
  });

  it('peek returns bytes from the current position without advancing', () => {
    const data = new Uint8Array([
      0x01,
      0x02, 0x00,
      0x03, 0x00, 0x00, 0x00,
      0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);

    const reader = BinaryReader.fromBytes(data);
    reader.skip(3);
    expect(reader.peek(1)).toEqual(new Uint8Array([0x03]));
    expect(reader.tell()).toBe(3);

    const offsetReader = BinaryReader.fromBytes(data, 3);
    offsetReader.skip(4);
    expect(offsetReader.peek(1)).toEqual(new Uint8Array([0x04]));
    expect(offsetReader.tell()).toBe(4);

    const boundedReader = BinaryReader.fromBytes(data, 3, 4);
    expect(boundedReader.peek(1)).toEqual(new Uint8Array([0x03]));
    expect(boundedReader.tell()).toBe(0);
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
