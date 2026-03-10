/**
 * MDL format auto-detection and I/O.
 * Single entry point to detect format, read MDL (binary or ASCII), and serialize.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file MDLAuto.ts
 * @license GPL-3.0
 */

import { readMDLFromAsciiBuffer, writeMDLToAsciiBuffer } from '@/resource/MDLAsciiIO';
import { readMDLFromBinaryBuffer, type MDLBinaryReaderOptions } from '@/resource/MDLBinaryReader';
import type { MDL } from '@/resource/MDLData';
import type { MDLFormat } from '@/resource/MDLTypes';

/** First 4 bytes of binary MDL (zero = binary, otherwise treated as ASCII). */
const BINARY_MDL_MAGIC = new Uint8Array([0, 0, 0, 0]);

/**
 * Detects MDL data format from the first bytes of the buffer.
 * Binary MDL starts with four zero bytes; anything else is treated as ASCII (MDLOps-style).
 *
 * @param buffer - Source data (at least 4 bytes used).
 * @param offset - Byte offset into buffer (default 0).
 * @returns Detected format: 'mdl' (binary), 'mdl_ascii', or 'invalid'.
 */
export function detectMDLFormat(buffer: Uint8Array, offset = 0): MDLFormat {
  if (buffer.length < offset + 4) return 'invalid';
  const first4 = buffer.subarray(offset, offset + 4);
  if (
    first4[0] === BINARY_MDL_MAGIC[0] &&
    first4[1] === BINARY_MDL_MAGIC[1] &&
    first4[2] === BINARY_MDL_MAGIC[2] &&
    first4[3] === BINARY_MDL_MAGIC[3]
  ) {
    return 'mdl';
  }
  return 'mdl_ascii';
}

export interface ReadMDLOptions {
  /** Byte offset into the MDL source buffer. */
  offset?: number;
  /** Number of bytes to read from MDL source (0 = use rest of buffer). */
  size?: number;
  /** Optional MDX buffer (geometry); used only for binary format. */
  mdxBuffer?: Uint8Array;
  /** Byte offset into the MDX buffer. */
  mdxOffset?: number;
  /** Number of bytes to read from MDX (0 = use rest of mdxBuffer). */
  mdxSize?: number;
  /** Force format; if not set, format is auto-detected. */
  format?: MDLFormat;
}

/**
 * Reads an MDL from a buffer. Format is auto-detected unless options.format is set.
 * Binary format can be paired with optional MDX buffer.
 *
 * @param buffer - MDL file/data.
 * @param options - Offset, size, optional MDX, and optional format override.
 * @returns Parsed MDL instance.
 * @throws Error if format is invalid or parsing fails.
 */
export function readMDL(buffer: Uint8Array, options: ReadMDLOptions = {}): MDL {
  const {
    offset = 0,
    size = 0,
    mdxBuffer,
    mdxOffset = 0,
    mdxSize = 0,
    format: formatOverride
  } = options;

  const format = formatOverride ?? detectMDLFormat(buffer, offset);
  const sizeToUse = size > 0 ? size : buffer.length - offset;
  const mdlSlice = sizeToUse > 0 ? buffer.subarray(offset, offset + sizeToUse) : buffer.subarray(offset);

  if (format === 'mdl') {
    const mdxOpt: MDLBinaryReaderOptions['mdxBuffer'] = mdxBuffer
      ? mdxSize > 0
        ? mdxBuffer.subarray(mdxOffset, mdxOffset + mdxSize)
        : mdxBuffer.subarray(mdxOffset)
      : undefined;
    return readMDLFromBinaryBuffer(mdlSlice, { mdxBuffer: mdxOpt });
  }

  if (format === 'mdl_ascii') {
    return readMDLFromAsciiBuffer(mdlSlice);
  }

  throw new Error('Failed to determine the format of the MDL file.');
}

/**
 * Reads an MDL with fast-load (binary only): skips controllers and animations for rendering.
 * If data is ASCII, falls back to full read.
 *
 * @param buffer - MDL file/data.
 * @param options - Same as readMDL (offset, size, mdxBuffer, format).
 * @returns Parsed MDL instance with minimal data for rendering.
 */
export function readMDLFast(buffer: Uint8Array, options: ReadMDLOptions = {}): MDL {
  const {
    offset = 0,
    size = 0,
    mdxBuffer,
    mdxOffset = 0,
    mdxSize = 0,
    format: formatOverride
  } = options;

  const format = formatOverride ?? detectMDLFormat(buffer, offset);
  const sizeToUse = size > 0 ? size : buffer.length - offset;
  const mdlSlice = sizeToUse > 0 ? buffer.subarray(offset, offset + sizeToUse) : buffer.subarray(offset);

  if (format === 'mdl') {
    const mdxOpt: MDLBinaryReaderOptions['mdxBuffer'] = mdxBuffer
      ? mdxSize > 0
        ? mdxBuffer.subarray(mdxOffset, mdxOffset + mdxSize)
        : mdxBuffer.subarray(mdxOffset)
      : undefined;
    return readMDLFromBinaryBuffer(mdlSlice, { fastLoad: true, mdxBuffer: mdxOpt });
  }

  if (format === 'mdl_ascii') {
    return readMDLFromAsciiBuffer(mdlSlice);
  }

  throw new Error('Failed to determine the format of the MDL file.');
}

// Re-export for callers that need direct ASCII I/O
export { readMDLFromAsciiBuffer, writeMDLToAsciiBuffer } from '@/resource/MDLAsciiIO';

export interface WriteMDLOptions {
  /** Output format: 'mdl' (binary) or 'mdl_ascii'. */
  format?: MDLFormat;
  /** If format is 'mdl', optional separate buffer target for MDX (not used when writing to Uint8Array). */
  mdxTarget?: Uint8Array;
}

/**
 * Writes an MDL to a buffer. ASCII format is supported; binary write is not implemented.
 *
 * @param mdl - MDL instance to serialize.
 * @param target - Buffer to write into (must be large enough for ASCII output).
 * @param options - Format and optional MDX target.
 * @throws Error if format is unsupported or target too small (ASCII).
 */
export function writeMDL(mdl: MDL, target: Uint8Array, options: WriteMDLOptions = {}): void {
  const format = options.format ?? 'mdl';
  if (format === 'mdl_ascii') {
    const out = writeMDLToAsciiBuffer(mdl);
    if (target.length < out.length) {
      throw new Error(`MDL ASCII write: target buffer too small (need ${out.length}, got ${target.length}).`);
    }
    target.set(out);
    return;
  }
  if (format === 'mdl') {
    throw new Error('MDL binary write is not yet implemented. Use read-only MDL support.');
  }
  throw new Error('Unsupported MDL format specified; use "mdl" or "mdl_ascii".');
}

/**
 * Serializes an MDL to a new Uint8Array. ASCII format is supported.
 *
 * @param mdl - MDL instance.
 * @param format - 'mdl' or 'mdl_ascii'.
 * @returns Serialized bytes.
 */
export function bytesMDL(mdl: MDL, format: MDLFormat = 'mdl'): Uint8Array {
  if (format === 'mdl_ascii') {
    return writeMDLToAsciiBuffer(mdl);
  }
  if (format === 'mdl') {
    throw new Error('MDL binary write is not yet implemented.');
  }
  throw new Error('Unsupported MDL format specified; use "mdl" or "mdl_ascii".');
}
