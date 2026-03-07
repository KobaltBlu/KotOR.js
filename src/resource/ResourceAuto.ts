/**
 * Resource auto-detection and serialization (PyKotor resource_auto parity).
 * Single entry point to read resource from buffer (with optional type hint) and serialize back to bytes.
 *
 * @file ResourceAuto.ts
 */

import { bytesMDL, readMDL } from '@/resource/MDLAuto';
import { MDL } from '@/resource/MDLData';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { TPCObject, detectTPCFormat, readTPCFromBuffer, writeTPCToBuffer, type WriteTPCFormat } from '@/resource/TPCObject';
import {
  TwoDAObject,
  detectTwoDAFormat,
  readTwoDAFromBuffer,
  writeTwoDAToBuffer,
  type WriteTwoDAFormat,
} from '@/resource/TwoDAObject';
import { TXI } from '@/resource/TXI';
import { VISObject } from '@/resource/VISObject';
import { WAVObject } from '@/resource/WAVObject';

export type ReadResourceResult =
  | MDL
  | TPCObject
  | TwoDAObject
  | TXI
  | VISObject
  | WAVObject;

/**
 * Read a resource from buffer. If resType is provided, use it to select parser; otherwise auto-detect.
 * Supports: MDL (2002), TPC/TGA/DDS/BMP (texture), 2DA (2017), TXI (2022), VIS (3001), WAV (4).
 * Throws if format is unknown or detection fails.
 */
export function readResourceFromBuffer(
  buffer: Uint8Array,
  resType?: number
): ReadResourceResult {
  if (resType !== undefined) {
    const R = ResourceTypes as Record<string, number>;
    if (resType === R['mdl']) return readMDL(buffer);
    if (resType === R['2da']) return readTwoDAFromBuffer(buffer);
    if (resType === R['tga'] || resType === R['tpc'] || resType === R['dds'] || resType === R['bmp']) return readTPCFromBuffer(buffer);
    if (resType === R['txi']) return TXI.fromBuffer(buffer);
    if (resType === R['vis']) return new VISObject(buffer);
    if (resType === R['wav']) return new WAVObject(buffer);
    throw new Error(`Unsupported resource type for read: ${resType}`);
  }

  if (buffer.length < 4) throw new Error('Buffer too short to detect resource format.');

  const twoDAFormat = detectTwoDAFormat(buffer);
  if (twoDAFormat !== 'invalid') return readTwoDAFromBuffer(buffer, twoDAFormat);

  const tpcFormat = detectTPCFormat(buffer);
  if (tpcFormat !== 'tga' || buffer.length >= 18) {
    try {
      if (tpcFormat === 'tpc' || tpcFormat === 'dds' || tpcFormat === 'bmp') return readTPCFromBuffer(buffer);
      if (tpcFormat === 'tga') return readTPCFromBuffer(buffer);
    } catch {
      // fall through to next detector
    }
  }

  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, Math.min(200, buffer.length)));
  const lower = decoded.toLowerCase();
  if (lower.includes('room') && (/\d+\s*\n\s*\w+/.test(decoded) || /^\s*[\w.]+\s+\d+/.test(decoded))) {
    try {
      return new VISObject(buffer);
    } catch {
      // not valid VIS
    }
  }

  if (buffer.length >= 4 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return new WAVObject(buffer);
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xf3) {
    return new WAVObject(buffer);
  }

  try {
    return TXI.fromBuffer(buffer);
  } catch {
    // not valid TXI
  }

  throw new Error('Source buffer not recognized as any supported KotOR resource format.');
}

export type ResourceToBytesFormat =
  | { format?: WriteTPCFormat }
  | { format?: WriteTwoDAFormat }
  | { format?: 'mdl' | 'mdl_ascii' }
  | undefined;

/**
 * Serialize a resource instance to bytes (PyKotor resource_to_bytes).
 * Format option is used for TwoDA (e.g. '2da'|'csv'|'json') and TPC (e.g. 'tpc'|'tga'|'dds').
 */
export function resourceToBytes(
  resource: ReadResourceResult,
  options?: ResourceToBytesFormat
): Uint8Array {
  if (resource instanceof TPCObject) {
    const format = (options as { format?: WriteTPCFormat } | undefined)?.format ?? 'tpc';
    return writeTPCToBuffer(resource, format);
  }
  if (resource instanceof TwoDAObject) {
    const format = (options as { format?: WriteTwoDAFormat } | undefined)?.format ?? '2da';
    return writeTwoDAToBuffer(resource, format);
  }
  if (resource instanceof TXI) return resource.toBuffer();
  if (resource instanceof VISObject) return resource.toBuffer();
  if (resource instanceof WAVObject) return resource.toBuffer();
  if (resource instanceof MDL) {
    const format = (options as { format?: 'mdl' | 'mdl_ascii' } | undefined)?.format ?? 'mdl';
    return bytesMDL(resource, format);
  }
  throw new Error(`Unsupported resource type for serialization: ${(resource as object).constructor?.name ?? typeof resource}`);
}
