import { ENCODING } from '@/enums/graphics/tpc/Encoding';
import { detectTPCFormat, isTPCBuffer, readTPCFromBuffer, TPCObject, writeTPCToBuffer } from '@/resource/TPCObject';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';


describe('TPCObject', () => {
  /** Minimal valid TPC: uncompressed RGBA 2x2, one mipmap, no TXI. */
  function makeMinimalTPC(): Uint8Array {
    const headerLen = 128;
    const dataSize = 2 * 2 * 4; // 16 bytes RGBA 2x2
    const total = headerLen + dataSize + 1; // +1 for null TXI
    const bw = new BinaryWriter(new Uint8Array(total));
    bw.writeUInt32(0); // uncompressed
    bw.writeSingle(1.0);
    bw.writeUInt16(2);
    bw.writeUInt16(2);
    bw.writeByte(ENCODING.RGBA);
    bw.writeByte(1);
    for (let i = 0; i < 114; i++) bw.writeByte(0);
    for (let i = 0; i < dataSize; i++) bw.writeByte(0);
    bw.writeByte(0);
    return bw.buffer;
  }

  it('readHeader parses minimal TPC', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    expect(tpc.header.width).toBe(2);
    expect(tpc.header.height).toBe(2);
    expect(tpc.header.encoding).toBe(ENCODING.RGBA);
    expect(tpc.header.mipMapCount).toBe(1);
    expect(tpc.header.compressed).toBe(false);
  });

  it('toBuffer round-trip preserves header and texture data', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    const out = tpc.toBuffer();
    expect(out.length).toBeGreaterThanOrEqual(128);
    const tpc2 = new TPCObject({ file: out, filename: 'test2', pack: 0 });
    expect(tpc2.header.width).toBe(tpc.header.width);
    expect(tpc2.header.height).toBe(tpc.header.height);
    expect(tpc2.header.encoding).toBe(tpc.header.encoding);
    expect(tpc2.header.dataSize).toBe(tpc.header.dataSize);
    expect(tpc2.getDataLength()).toBe(tpc.getDataLength());
  });

  it('getDataLength matches single mipmap size for 2x2 RGBA', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    expect(tpc.getDataLength()).toBe(2 * 2 * 4);
  });

  it('isTPCBuffer detects valid TPC and rejects short/invalid', () => {
    const buf = makeMinimalTPC();
    expect(isTPCBuffer(buf)).toBe(true);
    expect(isTPCBuffer(new Uint8Array(50))).toBe(false);
    expect(isTPCBuffer(new Uint8Array(128))).toBe(false);
    const badEnc = new Uint8Array(128);
    badEnc[8] = 2;
    badEnc[9] = 0;
    badEnc[10] = 2;
    badEnc[11] = 0;
    badEnc[12] = 99;
    expect(isTPCBuffer(badEnc)).toBe(false);
  });

  it('TPCObject.fromBuffer creates instance equal to constructor', () => {
    const buf = makeMinimalTPC();
    const tpc1 = new TPCObject({ file: buf, filename: 'a', pack: 0 });
    const tpc2 = TPCObject.fromBuffer(buf, 'a', 0);
    expect(tpc2.header.width).toBe(tpc1.header.width);
    expect(tpc2.header.height).toBe(tpc1.header.height);
    expect(tpc2.getDataLength()).toBe(tpc1.getDataLength());
  });

  it('detectTPCFormat returns tpc for valid TPC buffer', () => {
    const buf = makeMinimalTPC();
    expect(detectTPCFormat(buf)).toBe('tpc');
  });

  it('detectTPCFormat returns dds for DDS magic', () => {
    const dds = new Uint8Array(20);
    dds[0] = 0x44;
    dds[1] = 0x44;
    dds[2] = 0x53;
    dds[3] = 0x20;
    expect(detectTPCFormat(dds)).toBe('dds');
  });

  it('detectTPCFormat returns bmp for BM magic', () => {
    const bmp = new Uint8Array(54);
    bmp[0] = 0x42;
    bmp[1] = 0x4d;
    expect(detectTPCFormat(bmp)).toBe('bmp');
  });

  it('detectTPCFormat returns tga for short or unknown buffer', () => {
    expect(detectTPCFormat(new Uint8Array(2))).toBe('tga');
    expect(detectTPCFormat(new Uint8Array(0))).toBe('tga');
  });

  it('readTPCFromBuffer creates TPCObject for TPC buffer', () => {
    const buf = makeMinimalTPC();
    const tpc = readTPCFromBuffer(buf, 'test');
    expect(tpc.header.width).toBe(2);
    expect(tpc.header.height).toBe(2);
  });

  it('readTPCFromBuffer loads TGA type 2 32bpp and returns TPCObject', () => {
    const tga = new Uint8Array(18 + 2 * 2 * 4);
    tga[0] = 0;
    tga[1] = 0;
    tga[2] = 2;
    tga[12] = 2;
    tga[13] = 0;
    tga[14] = 2;
    tga[15] = 0;
    tga[16] = 32;
    tga[17] = 0x20 | 0x08;
    for (let i = 0; i < 16; i++) tga[18 + i] = 0;
    const tpc = readTPCFromBuffer(tga, 'test.tga');
    expect(tpc.header.width).toBe(2);
    expect(tpc.header.height).toBe(2);
    expect(tpc.header.encoding).toBe(ENCODING.RGBA);
    expect(tpc.header.compressed).toBe(false);
  });

  it('readTPCFromBuffer loads DDS DXT1 and returns TPCObject', () => {
    const w = 4;
    const h = 4;
    const blockW = (w + 3) >> 2;
    const blockH = (h + 3) >> 2;
    const dataSize = blockW * blockH * 8;
    const dds = new Uint8Array(128 + dataSize);
    const v = new DataView(dds.buffer);
    v.setUint32(0, 0x20534444, true);
    v.setUint32(4 + 0, 124, true);
    v.setUint32(4 + 8, h, true);
    v.setUint32(4 + 12, w, true);
    v.setUint32(4 + 72 + 8, 0x31545844, true);
    const tpc = readTPCFromBuffer(dds, 'test.dds');
    expect(tpc.header.width).toBe(4);
    expect(tpc.header.height).toBe(4);
    expect(tpc.header.compressed).toBe(true);
    expect(tpc.header.encoding).toBe(ENCODING.RGB);
  });

  it('readTPCFromBuffer loads standard DDS DXT5 with multiple mip levels', () => {
    const width = 4;
    const height = 4;
    const mip0 = new Uint8Array(16).fill(0xaa);
    const mip1 = new Uint8Array(16).fill(0x55);
    const dds = makeStandardDDSHeader(width, height, 2, {
      fourCC: 'DXT5',
      bitCount: 0,
      masks: [0, 0, 0, 0],
      pixelFormatFlags: 0x4,
    });
    const combined = new Uint8Array(dds.length + mip0.length + mip1.length);
    combined.set(dds, 0);
    combined.set(mip0, dds.length);
    combined.set(mip1, dds.length + mip0.length);

    const tpc = readTPCFromBuffer(combined, 'mips.dds');
    expect(tpc.header.width).toBe(width);
    expect(tpc.header.height).toBe(height);
    expect(tpc.header.encoding).toBe(ENCODING.RGBA);
    expect(tpc.header.compressed).toBe(true);
    expect(tpc.header.mipMapCount).toBe(2);
    expect(tpc.getDataLength()).toBe(32);
  });

  it('readTPCFromBuffer loads BioWare DDS with multiple DXT5 mip levels', () => {
    const header = new BinaryWriter();
    header.writeUInt32(4);
    header.writeUInt32(4);
    header.writeUInt32(4);
    header.writeUInt32(16);
    header.writeUInt32(0);
    const mip0 = new Uint8Array(16).fill(0xaa);
    const mip1 = new Uint8Array(16).fill(0x55);
    const biowareDDS = new Uint8Array(header.buffer.length + mip0.length + mip1.length);
    biowareDDS.set(header.buffer, 0);
    biowareDDS.set(mip0, header.buffer.length);
    biowareDDS.set(mip1, header.buffer.length + mip0.length);

    expect(detectTPCFormat(biowareDDS)).toBe('dds');
    const tpc = readTPCFromBuffer(biowareDDS, 'bioware.dds');
    expect(tpc.header.width).toBe(4);
    expect(tpc.header.height).toBe(4);
    expect(tpc.header.encoding).toBe(ENCODING.RGBA);
    expect(tpc.header.compressed).toBe(true);
    expect(tpc.header.mipMapCount).toBe(2);
    expect(tpc.getDataLength()).toBe(32);
  });

  it('readTPCFromBuffer rejects BioWare DDS with non-power-of-two dimensions', () => {
    const bad = new BinaryWriter();
    bad.writeUInt32(3);
    bad.writeUInt32(2);
    bad.writeUInt32(3);
    bad.writeUInt32(3);
    bad.writeUInt32(0);
    bad.writeBytes(new Uint8Array(8));

    expect(() => readTPCFromBuffer(bad.buffer, 'bad-bioware.dds')).toThrow('BioWare DDS requires power-of-two dimensions');
  });

  it('readTPCFromBuffer loads standard DDS BGRA payload as uncompressed BGRA', () => {
    const width = 2;
    const height = 2;
    const pixels = new Uint8Array([
      0xff, 0x00, 0x00, 0xff,
      0x00, 0xff, 0x00, 0xff,
      0x00, 0x00, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff,
    ]);
    const dds = makeStandardDDSHeader(width, height, 1, {
      fourCC: null,
      bitCount: 32,
      masks: [0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000],
      pixelFormatFlags: 0x40 | 0x1,
    });
    const combined = new Uint8Array(dds.length + pixels.length);
    combined.set(dds, 0);
    combined.set(pixels, dds.length);

    const tpc = readTPCFromBuffer(combined, 'bgra.dds');
    expect(tpc.header.width).toBe(width);
    expect(tpc.header.height).toBe(height);
    expect(tpc.header.compressed).toBe(false);
    expect(tpc.header.encoding).toBe(ENCODING.BGRA);
    expect(tpc.file.slice(128, 132)).toEqual(pixels.slice(0, 4));
  });

  it('readTPCFromBuffer loads standard DDS BGR payload and converts it to RGB ordering', () => {
    const width = 1;
    const height = 1;
    const bgrPixel = new Uint8Array([0x10, 0x20, 0x30]);
    const dds = makeStandardDDSHeader(width, height, 1, {
      fourCC: null,
      bitCount: 24,
      masks: [0x00FF0000, 0x0000FF00, 0x000000FF, 0x00000000],
      pixelFormatFlags: 0x40,
    });
    const combined = new Uint8Array(dds.length + bgrPixel.length);
    combined.set(dds, 0);
    combined.set(bgrPixel, dds.length);

    const tpc = readTPCFromBuffer(combined, 'bgr.dds');
    expect(tpc.header.width).toBe(width);
    expect(tpc.header.height).toBe(height);
    expect(tpc.header.compressed).toBe(false);
    expect(tpc.header.encoding).toBe(ENCODING.RGB);
    expect(tpc.file.slice(128, 131)).toEqual(new Uint8Array([0x30, 0x20, 0x10]));
  });

  it('readTPCFromBuffer loads BMP 24bpp and returns TPCObject', () => {
    const w = 2;
    const h = 2;
    const rowSize = ((w * 3 + 3) >> 2) << 2;
    const pixelLen = rowSize * h;
    const bmp = new Uint8Array(14 + 40 + pixelLen);
    const v = new DataView(bmp.buffer);
    bmp[0] = 0x42;
    bmp[1] = 0x4d;
    v.setUint32(2, bmp.length, true);
    v.setUint32(10, 54, true);
    v.setUint32(14, 40, true);
    v.setUint32(18, w, true);
    v.setUint32(22, h, true);
    v.setUint16(26, 1, true);
    v.setUint16(28, 24, true);
    v.setUint32(30, 0, true);
    let off = 54;
    for (let y = h - 1; y >= 0; y--) {
      for (let x = 0; x < w; x++) {
        bmp[off++] = 0;
        bmp[off++] = 0;
        bmp[off++] = 255;
      }
      while (off < 54 + pixelLen && (off - 54) % rowSize !== 0) bmp[off++] = 0;
    }
    const tpc = readTPCFromBuffer(bmp, 'test.bmp');
    expect(tpc.header.width).toBe(2);
    expect(tpc.header.height).toBe(2);
    expect(tpc.header.encoding).toBe(ENCODING.RGBA);
    expect(tpc.header.compressed).toBe(false);
  });

  it('readTPCFromBuffer throws for invalid TGA', () => {
    const shortBuf = new Uint8Array(10);
    expect(() => readTPCFromBuffer(shortBuf)).toThrow();
  });

  it('writeTPCToBuffer matches toBuffer', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    expect(writeTPCToBuffer(tpc)).toEqual(tpc.toBuffer());
  });

  it('toTGABuffer returns TGA type 2 32bpp', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    const tga = tpc.toTGABuffer();
    expect(tga.length).toBe(18 + 2 * 2 * 4);
    expect(tga[2]).toBe(2);
    expect(tga[12]).toBe(2);
    expect(tga[14]).toBe(2);
    expect(tga[16]).toBe(32);
  });

  it('toDDSBuffer returns DDS magic and valid header', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    const dds = tpc.toDDSBuffer();
    expect(dds[0]).toBe(0x44);
    expect(dds[1]).toBe(0x44);
    expect(dds[2]).toBe(0x53);
    expect(dds[3]).toBe(0x20);
    expect(dds.length).toBeGreaterThan(4 + 124);
  });

  it('toBMPBuffer returns BMP magic and 24bpp layout', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    const bmp = tpc.toBMPBuffer();
    expect(bmp[0]).toBe(0x42);
    expect(bmp[1]).toBe(0x4d);
    expect(bmp.length).toBeGreaterThanOrEqual(54);
    const v = new DataView(bmp.buffer, bmp.byteOffset, bmp.byteLength);
    expect(v.getUint32(10, true)).toBe(54);
    expect(v.getUint32(18, true)).toBe(2);
    expect(v.getUint32(22, true)).toBe(2);
    expect(v.getUint16(28, true)).toBe(24);
  });

  it('writeTPCToBuffer with bmp format returns BMP bytes', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    const out = writeTPCToBuffer(tpc, 'bmp');
    expect(out[0]).toBe(0x42);
    expect(out[1]).toBe(0x4d);
  });

  it('BMP round-trip: toBMPBuffer then readTPCFromBuffer matches dimensions', () => {
    const buf = makeMinimalTPC();
    const tpc = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    const bmp = tpc.toBMPBuffer();
    const tpc2 = readTPCFromBuffer(bmp, 'out.bmp');
    expect(tpc2.header.width).toBe(tpc.header.width);
    expect(tpc2.header.height).toBe(tpc.header.height);
  });

  // --- Vendor-derived: DXT block size and multi-mipmap ---

  it('DXT1 compressed 4x4 has correct data length (one block)', () => {
    const dxt1Block = makeDXT1Buffer(4, 4);
    const tpc = new TPCObject({ file: dxt1Block, filename: 'dxt1', pack: 0 });
    expect(tpc.header.width).toBe(4);
    expect(tpc.header.height).toBe(4);
    expect(tpc.header.compressed).toBe(true);
    // DXT1: 8 bytes per 4x4 block → 1 block = 8 bytes
    expect(tpc.getDataLength()).toBe(8);
  });

  it('DXT1 compressed 8x8 has correct data length (four blocks)', () => {
    const dxt1 = makeDXT1Buffer(8, 8);
    const tpc = new TPCObject({ file: dxt1, filename: 'dxt1_8', pack: 0 });
    expect(tpc.header.width).toBe(8);
    expect(tpc.header.height).toBe(8);
    // 8x8 → (8/4)*(8/4) = 4 blocks × 8 bytes = 32 bytes
    expect(tpc.getDataLength()).toBe(32);
  });

  it('TGA round-trip preserves dimensions and pixel byte count for uncompressed RGBA', () => {
    // Build a TPC with known non-zero pixel data
    const headerLen = 128;
    const w = 2, h = 2;
    const dataSize = w * h * 4;
    const total = headerLen + dataSize + 1;
    const bw2 = new BinaryWriter(new Uint8Array(total));
    bw2.writeUInt32(0);
    bw2.writeSingle(1.0);
    bw2.writeUInt16(w);
    bw2.writeUInt16(h);
    bw2.writeByte(ENCODING.RGBA);
    bw2.writeByte(1);
    for (let i = 0; i < 114; i++) bw2.writeByte(0);
    // Write distinct pixel bytes
    for (let i = 0; i < dataSize; i++) bw2.writeByte((i * 37) & 0xff);
    bw2.writeByte(0);

    const tpc = new TPCObject({ file: bw2.buffer, filename: 'test', pack: 0 });
    const tga = tpc.toTGABuffer();
    const tpc2 = readTPCFromBuffer(tga, 'roundtrip.tga');
    expect(tpc2.header.width).toBe(w);
    expect(tpc2.header.height).toBe(h);
    expect(tpc2.getDataLength()).toBe(dataSize);
  });

  it('readTPCFromBuffer rejects truncated TPC header', () => {
    // A buffer with the right structure hint but too short for a real TPC
    const short = new Uint8Array(64);
    // Not a DDS, BMP, or valid TGA → falls through to TGA path and should fail
    expect(() => readTPCFromBuffer(short, 'truncated.tpc')).toThrow();
  });

  it('toBuffer preserves encoding field through round-trip', () => {
    const buf = makeMinimalTPC();
    const tpc1 = new TPCObject({ file: buf, filename: 'test', pack: 0 });
    const out = tpc1.toBuffer();
    const tpc2 = new TPCObject({ file: out, filename: 'test2', pack: 0 });
    expect(tpc2.header.encoding).toBe(tpc1.header.encoding);
  });

  // --- Vendor-derived: DXT5, multi-mipmap, and RGBA uncompressed data sizes ---

  it('DXT5 compressed 4x4 has correct data length (one block = 16 bytes)', () => {
    const dxt5 = makeDXT5Buffer(4, 4);
    const tpc = new TPCObject({ file: dxt5, filename: 'dxt5_4x4', pack: 0 });
    expect(tpc.header.width).toBe(4);
    expect(tpc.header.height).toBe(4);
    expect(tpc.header.compressed).toBe(true);
    // DXT5: 16 bytes per 4x4 block
    expect(tpc.getDataLength()).toBe(16);
  });

  it('DXT5 compressed 8x8 has correct data length (four blocks = 64 bytes)', () => {
    const dxt5 = makeDXT5Buffer(8, 8);
    const tpc = new TPCObject({ file: dxt5, filename: 'dxt5_8x8', pack: 0 });
    expect(tpc.header.width).toBe(8);
    expect(tpc.header.height).toBe(8);
    // 8x8 → (8/4)*(8/4) = 4 blocks × 16 bytes = 64 bytes
    expect(tpc.getDataLength()).toBe(64);
  });

  it('multi-mipmap DXT1 8x8 with 2 mipmaps has summed data length', () => {
    // Mip 0: 8x8 → 4 blocks × 8 = 32 bytes; dataSize stored in header = 32
    // Mip 1: 4x4 → max(32>>2, 8) = max(8,8) = 8 bytes
    // Total = 40 bytes
    const dxt1 = makeDXT1BufferMipmapped(8, 8, 2);
    const tpc = new TPCObject({ file: dxt1, filename: 'dxt1_mip2', pack: 0 });
    expect(tpc.header.mipMapCount).toBe(2);
    expect(tpc.header.compressed).toBe(true);
    expect(tpc.getDataLength()).toBe(40);
  });

  it('RGBA uncompressed 4x4 has correct data length (4*4*4 = 64 bytes)', () => {
    const buf = makeUncompressedRGBA(4, 4);
    const tpc = new TPCObject({ file: buf, filename: 'rgba_4x4', pack: 0 });
    expect(tpc.header.width).toBe(4);
    expect(tpc.header.height).toBe(4);
    expect(tpc.header.compressed).toBe(false);
    expect(tpc.header.encoding).toBe(ENCODING.RGBA);
    expect(tpc.getDataLength()).toBe(64);
  });

  it('RGBA uncompressed toBuffer round-trip preserves all pixel bytes', () => {
    // Vendor parity: rgb_to_rgba adds alpha=255 to all pixels.
    // Equivalent: RGBA uncompressed TPC preserves raw pixel bytes through round-trip.
    const w = 2, h = 2;
    const headerLen = 128;
    const dataSize = w * h * 4;
    const total = headerLen + dataSize + 1;
    const bw = new BinaryWriter(new Uint8Array(total));
    bw.writeUInt32(0);
    bw.writeSingle(1.0);
    bw.writeUInt16(w);
    bw.writeUInt16(h);
    bw.writeByte(ENCODING.RGBA);
    bw.writeByte(1);
    for (let i = 0; i < 114; i++) bw.writeByte(0);
    // Distinctive pixel pattern: RGBA channels cycling 0x11..0xFF
    for (let i = 0; i < dataSize; i++) bw.writeByte(0x11 * ((i % 15) + 1));
    bw.writeByte(0); // null TXI

    const tpc1 = new TPCObject({ file: bw.buffer, filename: 'pix', pack: 0 });
    const outBuf = tpc1.toBuffer();
    const tpc2 = new TPCObject({ file: outBuf, filename: 'pix2', pack: 0 });
    expect(tpc2.getDataLength()).toBe(dataSize);
    // Verify pixel bytes are preserved (comparing raw data region)
    const data1 = tpc1.file.slice(128, 128 + dataSize);
    const data2 = tpc2.file.slice(128, 128 + dataSize);
    expect(data2).toEqual(data1);
  });
});

// --- Helper: build a minimal DXT1-compressed TPC buffer ---

function makeDXT1Buffer(w: number, h: number): Uint8Array {
  const headerLen = 128;
  const blocksX = Math.max(1, (w + 3) >> 2);
  const blocksY = Math.max(1, (h + 3) >> 2);
  const dataSize = blocksX * blocksY * 8; // DXT1: 8 bytes per block
  const total = headerLen + dataSize + 1;  // +1 null TXI
  const bw = new BinaryWriter(new Uint8Array(total));
  bw.writeUInt32(dataSize); // compressed (non-zero = compressed data size)
  bw.writeSingle(1.0);
  bw.writeUInt16(w);
  bw.writeUInt16(h);
  bw.writeByte(ENCODING.RGB); // DXT1 uses RGB encoding
  bw.writeByte(1); // 1 mipmap
  for (let i = 0; i < 114; i++) bw.writeByte(0);
  for (let i = 0; i < dataSize; i++) bw.writeByte(0);
  bw.writeByte(0);
  return bw.buffer;
}

// --- Helper: build a minimal DXT5-compressed TPC buffer ---

function makeDXT5Buffer(w: number, h: number): Uint8Array {
  const headerLen = 128;
  const blocksX = Math.max(1, (w + 3) >> 2);
  const blocksY = Math.max(1, (h + 3) >> 2);
  const dataSize = blocksX * blocksY * 16; // DXT5: 16 bytes per block
  const total = headerLen + dataSize + 1;
  const bw = new BinaryWriter(new Uint8Array(total));
  bw.writeUInt32(dataSize); // compressed
  bw.writeSingle(1.0);
  bw.writeUInt16(w);
  bw.writeUInt16(h);
  bw.writeByte(ENCODING.RGBA); // DXT5 uses RGBA encoding
  bw.writeByte(1); // 1 mipmap
  for (let i = 0; i < 114; i++) bw.writeByte(0);
  for (let i = 0; i < dataSize; i++) bw.writeByte(0);
  bw.writeByte(0);
  return bw.buffer;
}

// --- Helper: build a DXT1-compressed TPC buffer with N mipmaps ---

function makeDXT1BufferMipmapped(w: number, h: number, mipmaps: number): Uint8Array {
  const headerLen = 128;
  const blocksX = Math.max(1, (w + 3) >> 2);
  const blocksY = Math.max(1, (h + 3) >> 2);
  const mip0Size = blocksX * blocksY * 8; // DXT1: 8 bytes per block

  // Compute total data size across all mipmaps
  let total = mip0Size;
  let ds = mip0Size;
  for (let i = 1; i < mipmaps; i++) {
    ds = Math.max(ds >> 2, 8);
    total += ds;
  }

  const buf = new BinaryWriter(new Uint8Array(headerLen + total + 1));
  buf.writeUInt32(mip0Size); // dataSize = mip 0 size
  buf.writeSingle(1.0);
  buf.writeUInt16(w);
  buf.writeUInt16(h);
  buf.writeByte(ENCODING.RGB); // DXT1 uses RGB encoding
  buf.writeByte(mipmaps);
  for (let i = 0; i < 114; i++) buf.writeByte(0);
  for (let i = 0; i < total; i++) buf.writeByte(0);
  buf.writeByte(0);
  return buf.buffer;
}

// --- Helper: build an uncompressed RGBA TPC buffer ---

function makeUncompressedRGBA(w: number, h: number): Uint8Array {
  const headerLen = 128;
  const dataSize = w * h * 4;
  const total = headerLen + dataSize + 1;
  const bw = new BinaryWriter(new Uint8Array(total));
  bw.writeUInt32(0); // uncompressed
  bw.writeSingle(1.0);
  bw.writeUInt16(w);
  bw.writeUInt16(h);
  bw.writeByte(ENCODING.RGBA);
  bw.writeByte(1);
  for (let i = 0; i < 114; i++) bw.writeByte(0);
  for (let i = 0; i < dataSize; i++) bw.writeByte(0);
  bw.writeByte(0);
  return bw.buffer;
}

function makeStandardDDSHeader(
  width: number,
  height: number,
  mipMapCount: number,
  options: {
    fourCC: 'DXT1' | 'DXT5' | null;
    bitCount: number;
    masks: [number, number, number, number];
    pixelFormatFlags: number;
  },
): Uint8Array {
  const writer = new BinaryWriter();
  const hasFourCC = options.fourCC !== null;
  const headerFlags = hasFourCC ? 0x1 | 0x2 | 0x4 | 0x1000 | 0x80000 | (mipMapCount > 1 ? 0x20000 : 0) : 0x1 | 0x2 | 0x4 | 0x8 | 0x1000 | (mipMapCount > 1 ? 0x20000 : 0);
  const linearOrPitch = hasFourCC
    ? Math.max(1, Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4)) * (options.fourCC === 'DXT1' ? 8 : 16)
    : width * Math.floor(options.bitCount / 8);
  const caps1 = 0x1000 | (mipMapCount > 1 ? 0x400000 | 0x8 : 0);

  writer.writeUInt32(0x20534444);
  writer.writeUInt32(124);
  writer.writeUInt32(headerFlags);
  writer.writeUInt32(height);
  writer.writeUInt32(width);
  writer.writeUInt32(linearOrPitch);
  writer.writeUInt32(0);
  writer.writeUInt32(mipMapCount);
  for (let i = 0; i < 11; i++) writer.writeUInt32(0);
  writer.writeUInt32(32);
  writer.writeUInt32(options.pixelFormatFlags);
  writer.writeUInt32(options.fourCC === 'DXT1' ? 0x31545844 : options.fourCC === 'DXT5' ? 0x35545844 : 0);
  writer.writeUInt32(options.bitCount);
  writer.writeUInt32(options.masks[0]);
  writer.writeUInt32(options.masks[1]);
  writer.writeUInt32(options.masks[2]);
  writer.writeUInt32(options.masks[3]);
  writer.writeUInt32(caps1);
  writer.writeUInt32(0);
  writer.writeUInt32(0);
  writer.writeUInt32(0);
  writer.writeUInt32(0);
  return writer.buffer;
}

