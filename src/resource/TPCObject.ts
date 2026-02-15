import * as dxtJs from "dxt-js";
import * as THREE from 'three';

import { ENCODING } from '@/enums/graphics/tpc/Encoding';
import { PixelFormat } from '@/enums/graphics/tpc/PixelFormat';
import { ITPCHeader } from '@/interface/resource/ITPCHeader';
import { ITPCObjectOptions } from '@/interface/resource/ITPCObjectOptions';
import { TXI } from '@/resource/TXI';
import { OdysseyCompressedTexture } from '@/three/odyssey/OdysseyCompressedTexture';
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Resource);

const TPCHeaderLength = 128;

/** Single mipmap level: pixel data and dimensions. */
export interface TPCMipmap {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

/** Result of getDDS(): mipmaps, dimensions, format, and cubemap flag. */
export interface TPCDDSResult {
  mipmaps: TPCMipmap[];
  width: number;
  height: number;
  format: number | null;
  mipmapCount: number;
  isCubemap: boolean;
}


/** Valid TPC encoding bytes (GRAY=1, RGB=2, RGBA=4, BGRA=12). */
const TPC_ENCODINGS = new Set([1, 2, 4, 12]);

/** DDS magic "DDS ". */
const DDS_MAGIC = new Uint8Array([0x44, 0x44, 0x53, 0x20]);

/** BMP magic "BM". */
const BMP_MAGIC = new Uint8Array([0x42, 0x4d]);

/**
 * Detected texture format for auto-detection (PyKotor tpc_auto style).
 * - 'tpc': KotOR binary TPC
 * - 'dds': DDS texture
 * - 'bmp': Windows Bitmap
 * - 'tga': TGA (or unknown; TGA has no magic, so fallback)
 */
export type TPCDetectedFormat = 'tpc' | 'tga' | 'dds' | 'bmp';

/**
 * Detect texture format from buffer (PyKotor detect_tpc style).
 * Order: DDS magic "DDS " → BMP "BM" → TPC header heuristic → fallback 'tga'.
 * Does not guarantee data integrity.
 */
export function detectTPCFormat(buffer: Uint8Array): TPCDetectedFormat {
  if (!buffer || buffer.length < 4) return 'tga';
  if (buffer.length >= 4 && buffer[0] === DDS_MAGIC[0] && buffer[1] === DDS_MAGIC[1] && buffer[2] === DDS_MAGIC[2] && buffer[3] === DDS_MAGIC[3]) {
    return 'dds';
  }
  if (buffer.length >= 2 && buffer[0] === BMP_MAGIC[0] && buffer[1] === BMP_MAGIC[1]) {
    return 'bmp';
  }
  if (buffer.length >= 20) {
    const w = buffer[8] | (buffer[9] << 8);
    const h = buffer[10] | (buffer[11] << 8);
    const bpp = buffer[12];
    const dataSize = buffer[0] | (buffer[1] << 8) | (buffer[2] << 16) | (buffer[3] << 24);
    if (w > 0 && w < 0x8000 && h > 0 && h < 0x8000 && (bpp === 3 || bpp === 4)) {
      const expected = bpp === 3 ? (w * h) >> 1 : w * h;
      if (dataSize === expected) return 'dds';
    }
  }
  if (isTPCBuffer(buffer)) return 'tpc';
  return 'tga';
}

/**
 * Heuristic check: returns true if the buffer looks like a TPC (128-byte header, valid encoding, sane dimensions).
 * Does not guarantee integrity. Use when auto-detecting format (e.g. PyKotor tpc_auto style).
 */
export function isTPCBuffer(buffer: Uint8Array): boolean {
  if (!buffer || buffer.length < TPCHeaderLength) return false;
  const enc = buffer[12];
  if (!TPC_ENCODINGS.has(enc)) return false;
  const w = buffer[8] | (buffer[9] << 8);
  const h = buffer[10] | (buffer[11] << 8);
  if (w === 0 || h === 0 || w > 4096 || h > 4096) return false;
  return true;
}

/**
 * Build a TPC binary buffer from raw RGBA pixel data (uncompressed). Used by TGA/DDS loaders.
 */
function buildTPCBufferFromRGBA(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const dataSize = 0;
  const encoding = ENCODING.RGBA;
  const mipMapCount = 1;
  const totalLen = TPCHeaderLength + width * height * 4;
  const bw = new BinaryWriter(new Uint8Array(totalLen));
  bw.writeUInt32(dataSize);
  bw.writeSingle(1.0);
  bw.writeUInt16(width);
  bw.writeUInt16(height);
  bw.writeByte(encoding);
  bw.writeByte(mipMapCount);
  for (let i = 0; i < 114; i++) bw.writeByte(0);
  bw.writeBytes(rgba);
  return bw.buffer;
}

/**
 * Parse TGA (type 2 uncompressed truecolor) and return TPC binary buffer. PyKotor TPCTGAReader parity.
 */
function loadTGAToTPCBuffer(buffer: Uint8Array): Uint8Array {
  if (buffer.length < 18) throw new Error('TGA buffer too short for header.');
  const idLen = buffer[0];
  const type = buffer[2];
  const width = buffer[12] | (buffer[13] << 8);
  const height = buffer[14] | (buffer[15] << 8);
  const bpp = buffer[16];
  const pixelOffset = 18 + idLen;
  if (type !== 2) throw new Error(`Unsupported TGA image type: ${type}. Only type 2 (uncompressed truecolor) is supported.`);
  if (width <= 0 || height <= 0 || width > 4096 || height > 4096) throw new Error(`Invalid TGA dimensions: ${width}x${height}`);
  const pixelSize = width * height * (bpp >> 3);
  if (pixelOffset + pixelSize > buffer.length) throw new Error('TGA buffer too short for pixel data.');
  const raw = buffer.subarray(pixelOffset, pixelOffset + pixelSize);
  const rgba = new Uint8Array(width * height * 4);
  if (bpp === 32) {
    for (let i = 0; i < width * height; i++) {
      const b = raw[i * 4], g = raw[i * 4 + 1], r = raw[i * 4 + 2], a = raw[i * 4 + 3];
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = a;
    }
  } else if (bpp === 24) {
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = raw[i * 3 + 2];
      rgba[i * 4 + 1] = raw[i * 3 + 1];
      rgba[i * 4 + 2] = raw[i * 3];
      rgba[i * 4 + 3] = 255;
    }
  } else {
    throw new Error(`Unsupported TGA bit depth: ${bpp}. Only 24 or 32 supported.`);
  }
  const topToBottom = (buffer[17] & 0x20) !== 0;
  if (!topToBottom) {
    const tmp = new Uint8Array(rgba.length);
    tmp.set(rgba);
    for (let y = 0; y < height; y++) {
      const srcRow = height - 1 - y;
      rgba.set(tmp.subarray(srcRow * width * 4, (srcRow + 1) * width * 4), y * width * 4);
    }
  }
  return buildTPCBufferFromRGBA(width, height, rgba);
}

const DDS_MAGIC_DDS = 0x20534444;
const DDS_HEADER_SIZE = 124;
const DDS_FOURCC_DXT1 = 0x31545844;
const DDS_FOURCC_DXT3 = 0x33545844;
const DDS_FOURCC_DXT5 = 0x35545844;

/**
 * Parse DDS (DXT1/DXT5 or raw) and return TPC binary buffer. PyKotor TPCDDSReader parity.
 */
function loadDDSToTPCBuffer(buffer: Uint8Array): Uint8Array {
  if (buffer.length < 4) throw new Error('DDS buffer too short.');
  const magic = buffer[0] | (buffer[1] << 8) | (buffer[2] << 16) | (buffer[3] << 24);
  if (magic !== DDS_MAGIC_DDS) throw new Error('Invalid DDS magic.');
  if (buffer.length < 4 + DDS_HEADER_SIZE) throw new Error('DDS buffer too short for header.');
  const h = 4;
  const _size = buffer[h + 0] | (buffer[h + 1] << 8) | (buffer[h + 2] << 16) | (buffer[h + 3] << 24);
  const height = buffer[h + 8] | (buffer[h + 9] << 8) | (buffer[h + 10] << 16) | (buffer[h + 11] << 24);
  const width = buffer[h + 12] | (buffer[h + 13] << 8) | (buffer[h + 14] << 16) | (buffer[h + 15] << 24);
  const _pitchOrLinear = buffer[h + 16] | (buffer[h + 17] << 8) | (buffer[h + 18] << 16) | (buffer[h + 19] << 24);
  const pixelFormatOffset = h + 72;
  const fourCC = buffer[pixelFormatOffset + 8] | (buffer[pixelFormatOffset + 9] << 8) | (buffer[pixelFormatOffset + 10] << 16) | (buffer[pixelFormatOffset + 11] << 24);
  const dataOffset = 4 + DDS_HEADER_SIZE;
  let encoding: number;
  let blockData: Uint8Array;
  let dataSize: number;
  if (fourCC === DDS_FOURCC_DXT1) {
    encoding = ENCODING.RGB;
    const blockW = (width + 3) >> 2;
    const blockH = (height + 3) >> 2;
    dataSize = blockW * blockH * 8;
    if (dataOffset + dataSize > buffer.length) throw new Error('DDS buffer too short for DXT1 data.');
    blockData = buffer.subarray(dataOffset, dataOffset + dataSize);
  } else if (fourCC === DDS_FOURCC_DXT3 || fourCC === DDS_FOURCC_DXT5) {
    encoding = ENCODING.RGBA;
    const blockW = (width + 3) >> 2;
    const blockH = (height + 3) >> 2;
    dataSize = blockW * blockH * 16;
    if (dataOffset + dataSize > buffer.length) throw new Error('DDS buffer too short for DXT5 data.');
    blockData = buffer.subarray(dataOffset, dataOffset + dataSize);
  } else {
    throw new Error(`Unsupported DDS fourCC: ${fourCC}. Only DXT1/DXT3/DXT5 supported.`);
  }
  const totalLen = TPCHeaderLength + blockData.length;
  const bw = new BinaryWriter(new Uint8Array(totalLen));
  bw.writeUInt32(dataSize);
  bw.writeSingle(1.0);
  bw.writeUInt16(width);
  bw.writeUInt16(height);
  bw.writeByte(encoding);
  bw.writeByte(1);
  for (let i = 0; i < 114; i++) bw.writeByte(0);
  bw.writeBytes(blockData);
  return bw.buffer;
}

/** BMP file header size; pixel data often starts at 54 for 40-byte DIB. */
const BMP_FILE_HEADER_SIZE = 14;
const BMP_DIB_SIZE = 40;

/**
 * Parse BMP (Windows Bitmap, 24bpp uncompressed) and return TPC binary buffer (PyKotor io_bmp parity).
 * Only supports 24-bit RGB; writes first layer as RGBA (alpha 255).
 */
function loadBMPToTPCBuffer(buffer: Uint8Array): Uint8Array {
  if (buffer.length < BMP_FILE_HEADER_SIZE + BMP_DIB_SIZE) {
    throw new Error('BMP buffer too short for header.');
  }
  const v = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pixelOffset = v.getUint32(10, true);
  const width = v.getUint32(18, true);
  const height = Math.abs(v.getInt32(22, true)); // negative = top-down
  const topDown = (v.getInt32(22, true) < 0);
  const planes = v.getUint16(26, true);
  const bitCount = v.getUint16(28, true);
  const compression = v.getUint32(30, true);

  if (planes !== 1 || bitCount !== 24 || compression !== 0) {
    throw new Error(`Unsupported BMP format: planes=${planes} bitCount=${bitCount} compression=${compression}. Only 24bpp uncompressed supported.`);
  }
  if (width <= 0 || height <= 0 || width > 4096 || height > 4096) {
    throw new Error(`Invalid BMP dimensions: ${width}x${height}`);
  }

  const rowSize = ((width * 3 + 3) >> 2) << 2;
  const pixelDataLen = rowSize * height;
  if (pixelOffset + pixelDataLen > buffer.length) {
    throw new Error('BMP buffer too short for pixel data.');
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcY = topDown ? y : height - 1 - y;
    const srcRow = pixelOffset + srcY * rowSize;
    for (let x = 0; x < width; x++) {
      const src = srcRow + x * 3;
      const b = buffer[src];
      const g = buffer[src + 1];
      const r = buffer[src + 2];
      const dst = (y * width + x) * 4;
      rgba[dst] = r;
      rgba[dst + 1] = g;
      rgba[dst + 2] = b;
      rgba[dst + 3] = 255;
    }
  }
  return buildTPCBufferFromRGBA(width, height, rgba);
}

/**
 * Create a TPCObject from a buffer. Supports TPC binary, TGA, DDS, and BMP (PyKotor read_tpc full parity).
 */
export function readTPCFromBuffer(buffer: Uint8Array, filename = ''): TPCObject {
  const format = detectTPCFormat(buffer);
  if (format === 'tpc') {
    return new TPCObject({ file: buffer, filename, pack: 0 });
  }
  if (format === 'tga') {
    const tpcBuffer = loadTGAToTPCBuffer(buffer);
    return new TPCObject({ file: tpcBuffer, filename, pack: 0 });
  }
  if (format === 'dds') {
    const tpcBuffer = loadDDSToTPCBuffer(buffer);
    return new TPCObject({ file: tpcBuffer, filename, pack: 0 });
  }
  if (format === 'bmp') {
    const tpcBuffer = loadBMPToTPCBuffer(buffer);
    return new TPCObject({ file: tpcBuffer, filename, pack: 0 });
  }
  throw new Error(`Unsupported texture format for readTPCFromBuffer: ${format}.`);
}

/** Output format for writeTPCToBuffer (PyKotor write_tpc / bytes_tpc). */
export type WriteTPCFormat = 'tpc' | 'tga' | 'dds' | 'bmp';

/**
 * Serialize a TPCObject to buffer in the given format (PyKotor write_tpc / bytes_tpc).
 * @param tpc - The TPC instance
 * @param format - 'tpc' (default), 'tga', 'dds', or 'bmp'
 */
export function writeTPCToBuffer(tpc: TPCObject, format: WriteTPCFormat = 'tpc'): Uint8Array {
  if (format === 'tpc') return tpc.toBuffer();
  if (format === 'tga') return tpc.toTGABuffer();
  if (format === 'dds') return tpc.toDDSBuffer();
  if (format === 'bmp') return tpc.toBMPBuffer();
  return tpc.toBuffer();
}

/**
 * TPCObject class.
 *
 * Class representing a TPC compressed texture file in memory.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file TPCObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TPCObject {
  static worker: Worker;

  header: ITPCHeader;
  txi: TXI = new TXI('');
  file: Uint8Array;
  filename: string;
  pack: number;

  canvas: OffscreenCanvas[] = [];

  constructor(args = {} as ITPCObjectOptions) {

    const _default: ITPCObjectOptions = {} as ITPCObjectOptions;

    const options = { ..._default, ...args };

    this.file = options.file;
    this.filename = options.filename;
    this.pack = options.pack;
    this.header = this.readHeader();
    this.txi = new TXI(this.getTXIData());

  }

  /** Create a TPCObject from a TPC binary buffer (convenience factory). */
  static fromBuffer(buffer: Uint8Array, filename = '', pack = 0): TPCObject {
    return new TPCObject({ file: buffer, filename, pack });
  }

  getTXIData(): string {

    try {
      const _txiOffset = this.getDataLength() + TPCHeaderLength;
      const _txiDataLength = this.file.length - _txiOffset;

      if (_txiDataLength > 0) {
        const txiReader = new BinaryReader(this.file.slice(_txiOffset, _txiOffset + _txiDataLength));
        let txiData = '';
        let ch;

        while ((ch = txiReader.readChar() || '\0').charCodeAt(0) != 0)
          txiData = txiData + ch;

        return txiData;
      } else {
        return '';
      }
    } catch (e) {
      log.error('getTXIData', e);
      return '';
    }

  }

  getMIPMaps() {

  }

  getDDS(compressMipMaps: boolean = true): TPCDDSResult {

    const dds: TPCDDSResult = { mipmaps: [], width: 0, height: 0, format: null, mipmapCount: 1, isCubemap: false };

    // Parse header
    if (this.header === null)
      this.header = this.readHeader();

    if (!this.header.compressed) {
      // Uncompressed
      switch (this.header.encoding) {
        case ENCODING.GRAY:
          // 8bpp grayscale
          break;
        case ENCODING.RGB:
          dds.format = 1023;//THREE.RGBAFormat
          break;
        case ENCODING.RGBA:
          dds.format = 1023;//THREE.RGBAFormat;
          break;
        case ENCODING.BGRA:
          dds.format = 1023;//THREE.RGBAFormat;
          break;
      }
    } else {
      switch (this.header.encoding) {
        case ENCODING.RGB:
          // S3TC DXT1
          dds.format = 33776;//THREE.RGB_S3TC_DXT1_Format;
          break;
        case ENCODING.RGBA:
          // S3TC DXT5
          dds.format = 33779;//THREE.RGBA_S3TC_DXT5_Format;
          break;
      }
    }

    dds.mipmapCount = this.header.mipMapCount;
    dds.isCubemap = this.header.isCubemap;
    dds.width = this.header.width;
    dds.height = this.header.height;

    let dataOffset = TPCHeaderLength;

    //Detect Animated Textures
    if (this.txi.procedureType == 1) {
      this.header.faces = this.txi.numx * this.txi.numy;
      dds.width = this.header.width / this.txi.numx;
      dds.height = this.header.height / this.txi.numy;
      dds.mipmapCount = this.generateMipMapCount(dds.width, dds.height);
    }

    for (let face = 0; face < this.header.faces; face++) {

      let width = dds.width;
      let height = dds.height;
      let dataSize = this.header.dataSize;
      let dataLength = 0;
      let byteArray = new Uint8Array(0);

      for (let i = 0; i < dds.mipmapCount; i++) {

        if (!this.header.compressed) {
          dataLength = width * height * this.header.minDataSize;
          const rawBuffer = this.file.slice(dataOffset, dataOffset + dataLength);
          if (this.header.encoding == ENCODING.RGB) {
            byteArray = new Uint8Array((rawBuffer.length / 3) * 4);
            const n = 4 * width * height;
            let s = 0, d = 0;
            while (d < n) {
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = 255;
            }
          } else {
            byteArray = rawBuffer;
          }
        } else {
          if (this.header.encoding == ENCODING.RGB) {
            dataLength = Math.max(this.header.minDataSize, width * height * 0.5);
            dataLength = Math.max(this.header.minDataSize, Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * this.header.minDataSize);
          } else if (this.header.encoding == ENCODING.RGBA) {
            dataLength = Math.max(this.header.minDataSize, Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * this.header.minDataSize);
          }
          byteArray = this.file.slice(dataOffset, dataOffset + dataLength);
          if (!compressMipMaps) {
            byteArray = dxtJs.decompress(byteArray, width, height, this.header.encoding == ENCODING.RGB ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5);
          }
        }

        dds.mipmaps.push({
          data: byteArray,
          width: width,
          height: height
        });

        dataOffset += dataLength;

        width = Math.max(width >> 1, 1);
        height = Math.max(height >> 1, 1);
        dataSize = Math.max(dataSize >> 2, this.header.minDataSize);

      }

    }

    ///////////////////////////////////
    // REBUILD ANIMATED FRAMES
    ///////////////////////////////////

    //Combine Extracted mipMaps into a single mipmap if this texture is a procedureType = cycle texture
    if (this.txi.procedureType == 1) {
      try {
        //log.info('TPCObject: Rebuilding Frames', this.filename);
        const encoding = (this.header.encoding == ENCODING.RGB) ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5;
        const mipmaps = [];

        dds.width = this.header.width;
        dds.height = this.header.height;

        let imageWidth = this.header.width;
        let imageHeight = this.header.height;
        let frameWidth = (imageWidth / this.txi.numx);
        let frameHeight = (imageHeight / this.txi.numy);
        const frameCount = (this.txi.numx * this.txi.numy);

        for (let m = 0; m < dds.mipmapCount; m++) {
          const frames = [];

          //Create an OffsreenCanvas so we can stitch the frames back together
          this.canvas[m] = new OffscreenCanvas(imageWidth, imageHeight);
          const ctx = this.canvas[m].getContext('2d');

          //Get the proper frames from the old mipmaps list
          for (let i = 0; i < frameCount; i++) {
            const mipmap = dds.mipmaps[m + (i * dds.mipmapCount)];
            //log.info(m + (i * dds.mipmapCount), mipmap);
            const rawData = mipmap.data instanceof Uint8Array ? mipmap.data : new Uint8Array(mipmap.data);
            const uint8 = Uint8ClampedArray.from(
              compressMipMaps ? dxtJs.decompress(rawData, frameWidth, frameHeight, encoding) : rawData
            );
            //log.info(uint8, frameWidth, frameHeight);
            frames.push(
              new ImageData(uint8, frameWidth, frameHeight)
            );
          }

          //Merge the frames onto the canvas
          for (let y = 0; y < this.txi.numy; y++) {
            const frameY = (y * this.txi.numx);
            for (let x = 0; x < this.txi.numx; x++) {
              //log.info(frameY + x, x * frameWidth2, y * frameHeight2);
              ctx.putImageData(frames[frameY + x], x * frameWidth, y * frameHeight);
            }
          }
          //log.info(imageWidth, imageHeight, frameWidth, frameHeight);
          //Extract the merged image
          const mergedImageData = ctx.getImageData(0, 0, imageWidth, imageHeight);

          //Compress it with the proper DXT encoding
          const mipmap_data = compressMipMaps ? dxtJs.compress(mergedImageData.data, imageWidth, imageHeight, encoding) : mergedImageData.data;

          //Add it the the new mipmaps list
          mipmaps.push({
            data: mipmap_data,
            width: imageWidth,
            height: imageHeight
          });

          //Resize Next Frame
          frameWidth = Math.max(frameWidth >> 1, 1);
          frameHeight = Math.max(frameHeight >> 1, 1);
          //Resize Next Image
          imageWidth = Math.max(imageWidth >> 1, 1);
          imageHeight = Math.max(imageHeight >> 1, 1);
        }
        dds.mipmaps = mipmaps;
        return dds;
      } catch (e) {
        log.error(e);
      }
    }

    return dds;

  }

  generateMipMapCount(width = 0, height = 0) {
    let nWidth = width;
    let nHeight = height;
    let _dataSize = 0;
    let running = true;
    let mips = 0;

    const multiplier = (this.header.encoding == ENCODING.RGB) ? 0.5 : 1;

    while (running) {
      const mipMapSize = Math.max((nWidth * nHeight) * multiplier, this.header.minDataSize);
      //log.info(nWidth, nHeight, mipMapSize);
      _dataSize += mipMapSize;//Math.max( dataSize >> 2, this.header.minDataSize );
      if (nWidth == 1 && nHeight == 1) {
        running = false;
      }
      nWidth = Math.max(nWidth >> 1, 1);
      nHeight = Math.max(nHeight >> 1, 1);
      mips += 1;
    }
    return mips;
  }

  readHeader(): ITPCHeader {

    // Parse header
    const Header: ITPCHeader = {} as ITPCHeader;
    const Reader = new BinaryReader(this.file.slice(0, TPCHeaderLength));
    Reader.seek(0);
    Header.dataSize = Reader.readUInt32();
    Header.alphaTest = Reader.readSingle();

    // Image dimensions
    Header.width = Reader.readUInt16();
    Header.height = Reader.readUInt16();

    // How's the pixel data encoded?
    Header.encoding = Reader.readByte();

    // Number of mip maps in the image
    Header.mipMapCount = Math.max(1, Reader.readByte());

    Header.bytesPerPixel = 4;
    Header.bitsPerPixel = (Header.bytesPerPixel * 8);

    Header.minDataSize = 0;
    Header.compressed = false;
    Header.hasAlpha = false;

    if (Header.dataSize == 0) {
      // Uncompressed
      Header.compressed = false;
      switch (Header.encoding) {
        case ENCODING.GRAY:
          Header.hasAlpha = false;
          Header.format = PixelFormat.R8G8B8;
          Header.minDataSize = 1;
          Header.dataSize = Header.width * Header.height;
          break;
        case ENCODING.RGB:
          Header.hasAlpha = false;
          Header.format = PixelFormat.R8G8B8;
          Header.minDataSize = 3;
          Header.dataSize = Header.width * Header.height * 3;
          break;
        case ENCODING.RGBA:
          Header.hasAlpha = true;
          Header.format = PixelFormat.R8G8B8A8;
          Header.minDataSize = 4;
          Header.dataSize = Header.width * Header.height * 4;
          break;
        case ENCODING.BGRA:
          Header.hasAlpha = true;
          Header.format = PixelFormat.B8G8R8A8;
          Header.minDataSize = 4;
          Header.dataSize = Header.width * Header.height * 4;
          break;
        default:
          log.error('TPCObject', Header);
          throw 'Unknown';
      }
    } else {
      switch (Header.encoding) {
        case ENCODING.RGB:
          // S3TC DXT1
          Header.compressed = true;
          Header.hasAlpha = false;
          Header.format = PixelFormat.DXT1;
          Header.minDataSize = 8;
          break;
        case ENCODING.RGBA:
          // S3TC DXT5
          Header.compressed = true;
          Header.hasAlpha = true;
          Header.format = PixelFormat.DXT5;
          Header.minDataSize = 16;
          break;
        default:
          log.error('TPCObject', Header);
      }
    }

    // Extract mipmaps buffers
    Header.isCubemap = false;
    if ((Header.height / Header.width) == 6) {
      Header.isCubemap = true;
      Header.height = Header.width;
    }

    Header.faces = Header.isCubemap ? 6 : 1;

    return Header;

  }

  getDataLength() {

    let dataLength = 0;

    for (let face = 0; face < this.header.faces; face++) {

      let width = this.header.width;
      let height = this.header.height;
      let dataSize = this.header.dataSize;

      for (let i = 0; i < this.header.mipMapCount; i++) {
        if (!this.header.compressed) {
          dataLength += width * height * this.header.minDataSize;
        } else {
          dataLength += dataSize;
        }

        width = Math.max(width >> 1, 1);
        height = Math.max(height >> 1, 1);
        dataSize = Math.max(dataSize >> 2, this.header.minDataSize);
      }

    }

    return dataLength;

  }

  /**
   * Export first mipmap as TGA type 2 uncompressed 32bpp (PyKotor write_tpc_tga parity).
   * Uses decompressed RGBA; top-to-bottom row order.
   */
  toTGABuffer(): Uint8Array {
    if (this.header === null) this.header = this.readHeader();
    const dds = this.getDDS(false) as { mipmaps: { data: Uint8Array; width: number; height: number }[]; width: number; height: number };
    const m0 = dds.mipmaps[0];
    if (!m0 || !m0.data) throw new Error('TPCObject: no mipmap data for TGA export.');
    const w = m0.width;
    const h = m0.height;
    const rgba = m0.data.length === w * h * 4 ? m0.data : new Uint8Array(w * h * 4);
    const tgaHeader = new Uint8Array(18);
    tgaHeader[0] = 0;
    tgaHeader[1] = 0;
    tgaHeader[2] = 2;
    tgaHeader[12] = w & 0xff;
    tgaHeader[13] = (w >> 8) & 0xff;
    tgaHeader[14] = h & 0xff;
    tgaHeader[15] = (h >> 8) & 0xff;
    tgaHeader[16] = 32;
    tgaHeader[17] = 0x20;
    const pixels = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      pixels[i * 4] = rgba[i * 4 + 2];
      pixels[i * 4 + 1] = rgba[i * 4 + 1];
      pixels[i * 4 + 2] = rgba[i * 4];
      pixels[i * 4 + 3] = rgba[i * 4 + 3];
    }
    const out = new Uint8Array(18 + pixels.length);
    out.set(tgaHeader);
    out.set(pixels, 18);
    return out;
  }

  /**
   * Export first mipmap as DDS (PyKotor write_tpc_dds parity).
   * Compressed TPC: writes DXT1/DXT3/DXT5 block data; uncompressed: writes RGBA as A8R8G8B8 linear.
   */
  toDDSBuffer(): Uint8Array {
    if (this.header === null) this.header = this.readHeader();
    const w = this.header.width;
    const h = this.header.height;
    const DDS_HEADER_SIZE = 124;
    const magic = new Uint8Array([0x44, 0x44, 0x53, 0x20]);
    const header = new Uint8Array(4 + DDS_HEADER_SIZE);
    const v = new DataView(header.buffer, header.byteOffset, header.byteLength);
    header.set(magic, 0);
    v.setUint32(4, 124, true);
    v.setUint32(8, 0x00001007, true);
    v.setUint32(12, h, true);
    v.setUint32(16, w, true);
    v.setUint32(80, 32, true);
    v.setUint32(84, 0x04, true);
    const pfOffset = 72;
    if (this.header.compressed) {
      const blockW = (w + 3) >> 2;
      const blockH = (h + 3) >> 2;
      const dataSize = this.header.encoding === ENCODING.RGB ? blockW * blockH * 8 : blockW * blockH * 16;
      const dataOffset = TPCHeaderLength;
      const blockData = this.file.slice(dataOffset, dataOffset + dataSize);
      v.setUint32(20, dataSize, true);
      v.setUint32(24, 0, true);
      header[pfOffset + 0] = 0;
      header[pfOffset + 1] = 0;
      header[pfOffset + 2] = 0;
      header[pfOffset + 3] = 0;
      v.setUint32(pfOffset + 4, dataSize, true);
      const fourCC = this.header.encoding === ENCODING.RGB ? 0x31545844 : 0x35545844;
      header[pfOffset + 8] = fourCC & 0xff;
      header[pfOffset + 9] = (fourCC >> 8) & 0xff;
      header[pfOffset + 10] = (fourCC >> 16) & 0xff;
      header[pfOffset + 11] = (fourCC >> 24) & 0xff;
      const out = new Uint8Array(4 + DDS_HEADER_SIZE + blockData.length);
      out.set(header);
      out.set(blockData, 4 + DDS_HEADER_SIZE);
      return out;
    }
    v.setUint32(20, w * h * 4, true);
    v.setUint32(24, w * 4, true);
    header[pfOffset + 0] = 32;
    header[pfOffset + 1] = 0;
    v.setUint32(pfOffset + 4, 0x41, true);
    header[pfOffset + 8] = 0;
    header[pfOffset + 9] = 0;
    header[pfOffset + 10] = 0;
    header[pfOffset + 11] = 0;
    header[pfOffset + 12] = 0x20;
    header[pfOffset + 13] = 0;
    header[pfOffset + 14] = 0;
    header[pfOffset + 15] = 0;
    header[pfOffset + 16] = 0xff;
    header[pfOffset + 17] = 0;
    header[pfOffset + 18] = 0;
    header[pfOffset + 19] = 0;
    header[pfOffset + 20] = 0xff;
    header[pfOffset + 21] = 0;
    header[pfOffset + 22] = 0;
    header[pfOffset + 23] = 0;
    header[pfOffset + 24] = 0xff;
    header[pfOffset + 25] = 0;
    header[pfOffset + 26] = 0;
    header[pfOffset + 27] = 0;
    header[pfOffset + 28] = 0;
    header[pfOffset + 29] = 0;
    header[pfOffset + 30] = 0;
    header[pfOffset + 31] = 0xff;
    const dds = this.getDDS(false) as { mipmaps: { data: Uint8Array }[] };
    const rgba = dds.mipmaps[0].data;
    const bgra = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      bgra[i * 4] = rgba[i * 4 + 2];
      bgra[i * 4 + 1] = rgba[i * 4 + 1];
      bgra[i * 4 + 2] = rgba[i * 4];
      bgra[i * 4 + 3] = rgba[i * 4 + 3];
    }
    const out = new Uint8Array(4 + DDS_HEADER_SIZE + bgra.length);
    out.set(header);
    out.set(bgra, 4 + DDS_HEADER_SIZE);
    return out;
  }

  /**
   * Export first mipmap as BMP 24bpp (PyKotor io_bmp parity).
   * No alpha channel; RGB only. Rows stored bottom-up.
   */
  toBMPBuffer(): Uint8Array {
    if (this.header === null) this.header = this.readHeader();
    const dds = this.getDDS(false) as { mipmaps: { data: Uint8Array; width: number; height: number }[] };
    const m0 = dds.mipmaps[0];
    if (!m0 || !m0.data) throw new Error('TPCObject: no mipmap data for BMP export.');
    const w = m0.width;
    const h = m0.height;
    const rgba = m0.data.length === w * h * 4 ? m0.data : new Uint8Array(w * h * 4);
    const rowSize = ((w * 3 + 3) >> 2) << 2;
    const pixelDataLen = rowSize * h;
    const fileSize = 14 + 40 + pixelDataLen;
    const out = new Uint8Array(fileSize);
    const v = new DataView(out.buffer, out.byteOffset, out.byteLength);
    out[0] = 0x42;
    out[1] = 0x4d;
    v.setUint32(2, fileSize, true);
    v.setUint32(6, 0, true);
    v.setUint32(10, 54, true);
    v.setUint32(14, 40, true);
    v.setUint32(18, w, true);
    v.setUint32(22, h, true);
    v.setUint16(26, 1, true);
    v.setUint16(28, 24, true);
    v.setUint32(30, 0, true);
    v.setUint32(34, pixelDataLen, true);
    v.setUint32(38, 0, true);
    v.setUint32(42, 0, true);
    v.setUint32(46, 0, true);
    v.setUint32(50, 0, true);
    let dst = 54;
    for (let y = h - 1; y >= 0; y--) {
      const rowStart = y * w * 4;
      for (let x = 0; x < w; x++) {
        const src = rowStart + x * 4;
        out[dst++] = rgba[src + 2];
        out[dst++] = rgba[src + 1];
        out[dst++] = rgba[src];
      }
      const pad = rowSize - w * 3;
      for (let i = 0; i < pad; i++) out[dst++] = 0;
    }
    return out;
  }

  /**
   * Serialize TPC to binary (header + texture data + optional TXI).
   * Uses existing texture payload from this.file; TXI is taken from this.txi.
   * Matches PyKotor TPC binary layout (128-byte header, then mipmap data, then ASCII TXI + null).
   */
  toBuffer(): Uint8Array {
    const dataLen = this.getDataLength();
    const texturePayload = this.file.slice(TPCHeaderLength, TPCHeaderLength + dataLen);
    const txiStr = (this.txi.toString() || '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const txiLines = txiStr ? txiStr.split('\n') : [];
    const txiNormalized = txiLines.length ? txiLines.join('\r\n') + '\r\n' : '';
    const txiBytes = new TextEncoder().encode(txiNormalized + '\0');

    const totalLen = TPCHeaderLength + texturePayload.length + txiBytes.length;
    const bw = new BinaryWriter(new Uint8Array(totalLen));
    bw.writeUInt32(this.header.dataSize);
    bw.writeSingle(this.header.alphaTest);
    bw.writeUInt16(this.header.width);
    bw.writeUInt16(this.header.height);
    bw.writeByte(this.header.encoding);
    bw.writeByte(Math.max(1, this.header.mipMapCount));
    for (let i = 0; i < 114; i++) bw.writeByte(0);
    bw.writeBytes(texturePayload);
    bw.writeBytes(txiBytes);
    return bw.buffer;
  }

  FlipY(pixelData: Uint8Array): Uint8Array {
    const stride = this.header.width * 4;
    if (pixelData == null) throw new Error('Missing pixelData');
    const unFlipped = Uint8Array.from(pixelData);
    let offset = 0;
    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }
    return pixelData;
  }

  //Convert the TPC into a THREE.CompressedTexture for use in the engine
  toCompressedTexture(): OdysseyCompressedTexture {
    const images: { mipmaps: TPCMipmap[]; format?: number; width?: number; height?: number }[] = [];
    const texDatas = this.getDDS(true);
    const _texture: OdysseyCompressedTexture | THREE.CanvasTexture = new OdysseyCompressedTexture(
      texDatas.mipmaps as unknown as ImageData[],
      texDatas.width,
      texDatas.height
    );
    const tex = _texture as OdysseyCompressedTexture | (THREE.CanvasTexture & Record<string, unknown>);

    if (texDatas.isCubemap) {
      const faces = texDatas.mipmaps.length / texDatas.mipmapCount;
      for (let f = 0; f < faces; f++) {
        images[f] = { mipmaps: [] };
        for (let i = 0; i < texDatas.mipmapCount; i++) {
          images[f].mipmaps.push(texDatas.mipmaps[f * texDatas.mipmapCount + i]);
          images[f].format = THREE.CubeReflectionMapping;
          images[f].width = texDatas.width;
          images[f].height = texDatas.height;
          tex.mipmaps = images[f].mipmaps;
        }
      }
      tex.image = images;
      (tex.image as { width: number; height: number }).width = texDatas.width;
      (tex.image as { width: number; height: number }).height = texDatas.height;
    } else {
      (tex as { image?: { width: number; height: number } }).image = (tex as { image?: { width: number; height: number } }).image ?? { width: 0, height: 0 };
      (tex.image as { width: number; height: number }).width = texDatas.width;
      (tex.image as { width: number; height: number }).height = texDatas.height;
      tex.mipmaps = texDatas.mipmaps;
    }

    _texture.name = this.filename;

    if (texDatas.mipmapCount === 1) {
      _texture.minFilter = THREE.LinearFilter;
    }

    (tex as Record<string, unknown>).format = texDatas.format;
    _texture.needsUpdate = true;
    (tex as Record<string, unknown>).bumpMapType = 'NORMAL';
    (tex as Record<string, unknown>).header = this.header;
    (tex as Record<string, unknown>).pack = this.pack;
    (tex as Record<string, unknown>).txi = this.txi;

    (tex as unknown as Record<string, unknown>).clone = function (this: unknown) {
      const self = this as THREE.Texture & Record<string, unknown>;
      const cloned = (new (self.constructor as new (...args: unknown[]) => THREE.Texture)().copy(self as unknown as THREE.Texture)) as THREE.Texture & Record<string, unknown>;
      cloned.format = self.format;
      cloned.needsUpdate = true;
      cloned.bumpMapType = self.bumpMapType;
      cloned.header = self.header;
      cloned.txi = self.txi;
      return self;
    };

    return _texture as OdysseyCompressedTexture;
  }

}

