/**
 * Shared GFF buffer → pretty JSON helper for export scripts.
 */
import { GFFObject } from '@core/resource/GFFObject';

export function bufferToGffJson(buffer: Uint8Array): string {
  if (!buffer?.length || buffer.length < 14) {
    throw new Error('buffer too small for GFF');
  }
  // Avoid DataView bugs when the Uint8Array is a view into a larger ArrayBuffer.
  const copy =
    buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength
      ? buffer
      : buffer.slice();
  const version = String.fromCharCode(copy[4], copy[5], copy[6], copy[7]);
  if (version !== 'V3.2' && version !== 'V3.3') {
    throw new Error(`Not a GFF (got version '${version}')`);
  }

  // GFFObject.parse logs RangeErrors via console.error; silence during batch export.
  const prevError = console.error;
  console.error = () => {};
  try {
    const gff = new GFFObject(copy);
    const fileType = (gff.FileType || '').replace(/\0/g, '').trim();
    if (!fileType) {
      throw new Error('GFF parse failed (empty FileType)');
    }
    return gff.toJSONString(2);
  } finally {
    console.error = prevError;
  }
}

export function bufferToGffObject(buffer: Uint8Array): GFFObject {
  const copy =
    buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength
      ? buffer
      : buffer.slice();
  return new GFFObject(copy);
}
