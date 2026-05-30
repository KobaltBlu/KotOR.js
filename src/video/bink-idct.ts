/**
 * BinkIDCT class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file BinkIDCT.ts
 * @see https://github.com/FFmpeg/FFmpeg/blob/release/3.4/libavcodec/binkdsp.c
 * @autthor Lachjames <https://github.com/Lachjames> (Ported from FFmpeg)
 * @author KobaltBlu <https://github.com/KobaltBlu> (Modified for KotOR JS)
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
// Note: Arithmetic and constants follow the C reference closely to preserve behavior.

// IDCT constants - pre-computed for better performance
const A1 = 2896; // (1/sqrt(2))<<12
const A2 = 2217;
const A3 = 3784;
const A4 = -5352;

// Inline: ((unsigned)X * Y) >> 11 — no function call
function idct_col(dest: Int32Array, src: Int32Array, dOff: number, sOff: number): void {
  // Check if AC terms in this column are zero
  if ((src[sOff + 8] | src[sOff + 16] | src[sOff + 24] | src[sOff + 32] | src[sOff + 40] | src[sOff + 56] | src[sOff + 48]) === 0) {
    const v = src[sOff + 0];
    dest[dOff + 0] = v;
    dest[dOff + 8] = v;
    dest[dOff + 16] = v;
    dest[dOff + 24] = v;
    dest[dOff + 32] = v;
    dest[dOff + 40] = v;
    dest[dOff + 48] = v;
    dest[dOff + 56] = v;
    return;
  }

  const s0 = src[sOff + 0];
  const s1 = src[sOff + 8];
  const s2 = src[sOff + 16];
  const s3 = src[sOff + 24];
  const s4 = src[sOff + 32];
  const s5 = src[sOff + 40];
  const s6 = src[sOff + 48];
  const s7 = src[sOff + 56];

  const a0 = s0 + s4;
  const a1 = s0 - s4;
  const a2 = s2 + s6;
  const a3 = ((Math.imul(A1 >>> 0, (s2 - s6) | 0) >> 11) | 0);
  const a4 = s5 + s3;
  const a5 = s5 - s3;
  const a6 = s1 + s7;
  const a7 = s1 - s7;
  const b0 = a4 + a6;
  const b1 = ((Math.imul(A3 >>> 0, (a5 + a7) | 0) >> 11) | 0);
  const b2 = ((Math.imul(A4 >>> 0, a5 | 0) >> 11) | 0) - b0 + b1;
  const b3 = ((Math.imul(A1 >>> 0, (a6 - a4) | 0) >> 11) | 0) - b2;
  const b4 = ((Math.imul(A2 >>> 0, a7 | 0) >> 11) | 0) + b3 - b1;

  dest[dOff + 0]  = a0 + a2 + b0;
  dest[dOff + 8]  = a1 + a3 - a2 + b2;
  dest[dOff + 16] = a1 - a3 + a2 + b3;
  dest[dOff + 24] = a0 - a2 - b4;
  dest[dOff + 32] = a0 - a2 + b4;
  dest[dOff + 40] = a1 - a3 + a2 - b3;
  dest[dOff + 48] = a1 + a3 - a2 - b2;
  dest[dOff + 56] = a0 + a2 - b0;
}

function idct_row_put(dest: Uint8Array, destStride: number, src: Int32Array, sOff: number, row: number): void {
  // Compute 8 outputs for a row and clamp to 0..255; munge inlined: (x + 0x7F) >> 8
  const s0 = src[sOff + 0];
  const s1 = src[sOff + 1];
  const s2 = src[sOff + 2];
  const s3 = src[sOff + 3];
  const s4 = src[sOff + 4];
  const s5 = src[sOff + 5];
  const s6 = src[sOff + 6];
  const s7 = src[sOff + 7];

  const a0 = s0 + s4;
  const a1 = s0 - s4;
  const a2 = s2 + s6;
  const a3 = ((Math.imul(A1 >>> 0, (s2 - s6) | 0) >> 11) | 0);
  const a4 = s5 + s3;
  const a5 = s5 - s3;
  const a6 = s1 + s7;
  const a7 = s1 - s7;
  const b0 = a4 + a6;
  const b1 = ((Math.imul(A3 >>> 0, (a5 + a7) | 0) >> 11) | 0);
  const b2 = ((Math.imul(A4 >>> 0, a5 | 0) >> 11) | 0) - b0 + b1;
  const b3 = ((Math.imul(A1 >>> 0, (a6 - a4) | 0) >> 11) | 0) - b2;
  const b4 = ((Math.imul(A2 >>> 0, a7 | 0) >> 11) | 0) + b3 - b1;

  const base = row * destStride;
  dest[base + 0] = ((a0 + a2 + b0 + 0x7F) >> 8) & 0xFF;
  dest[base + 1] = ((a1 + a3 - a2 + b2 + 0x7F) >> 8) & 0xFF;
  dest[base + 2] = ((a1 - a3 + a2 + b3 + 0x7F) >> 8) & 0xFF;
  dest[base + 3] = ((a0 - a2 - b4 + 0x7F) >> 8) & 0xFF;
  dest[base + 4] = ((a0 - a2 + b4 + 0x7F) >> 8) & 0xFF;
  dest[base + 5] = ((a1 - a3 + a2 - b3 + 0x7F) >> 8) & 0xFF;
  dest[base + 6] = ((a1 + a3 - a2 - b2 + 0x7F) >> 8) & 0xFF;
  dest[base + 7] = ((a0 + a2 - b0 + 0x7F) >> 8) & 0xFF;
}

function clamp8(x: number): number { return x < 0 ? 0 : x > 255 ? 255 : x; }

// Reusable buffers for IDCT operations to avoid allocations
class IDCTBuffers {
  private static temp = new Int32Array(64);
  private static out = new Int32Array(8);

  static getTemp(): Int32Array { return this.temp; }
  static getOut(): Int32Array { return this.out; }
}

// Public API mirroring FFmpeg's BinkDSPContext
export function idctPut(dest: Uint8Array, destStride: number, block: Int32Array): void {
  const temp = IDCTBuffers.getTemp();
  // Column-wise
  for (let i = 0; i < 8; i++) {
    idct_col(temp, block, i, i);
  }
  // Row-wise with store
  for (let r = 0; r < 8; r++) {
    idct_row_put(dest, destStride, temp, r * 8, r);
  }
}

export function idctAdd(dest: Uint8Array, destStride: number, block: Int32Array): void {
  // Full IDCT then add to dest
  const temp = IDCTBuffers.getTemp();
  const out = IDCTBuffers.getOut();

  for (let i = 0; i < 8; i++) idct_col(temp, block, i, i);

  for (let r = 0; r < 8; r++) {
    const base = r * destStride;
    const sOff = r * 8;
    const s0 = temp[sOff + 0];
    const s1 = temp[sOff + 1];
    const s2 = temp[sOff + 2];
    const s3 = temp[sOff + 3];
    const s4 = temp[sOff + 4];
    const s5 = temp[sOff + 5];
    const s6 = temp[sOff + 6];
    const s7 = temp[sOff + 7];
    const a0 = s0 + s4;
    const a1 = s0 - s4;
    const a2 = s2 + s6;
    const a3 = ((Math.imul(A1 >>> 0, (s2 - s6) | 0) >> 11) | 0);
    const a4 = s5 + s3;
    const a5 = s5 - s3;
    const a6 = s1 + s7;
    const a7 = s1 - s7;
    const b0 = a4 + a6;
    const b1 = ((Math.imul(A3 >>> 0, (a5 + a7) | 0) >> 11) | 0);
    const b2 = ((Math.imul(A4 >>> 0, a5 | 0) >> 11) | 0) - b0 + b1;
    const b3 = ((Math.imul(A1 >>> 0, (a6 - a4) | 0) >> 11) | 0) - b2;
    const b4 = ((Math.imul(A2 >>> 0, a7 | 0) >> 11) | 0) + b3 - b1;
    out[0] = (a0 + a2 + b0 + 0x7F) >> 8;
    out[1] = (a1 + a3 - a2 + b2 + 0x7F) >> 8;
    out[2] = (a1 - a3 + a2 + b3 + 0x7F) >> 8;
    out[3] = (a0 - a2 - b4 + 0x7F) >> 8;
    out[4] = (a0 - a2 + b4 + 0x7F) >> 8;
    out[5] = (a1 - a3 + a2 - b3 + 0x7F) >> 8;
    out[6] = (a1 + a3 - a2 - b2 + 0x7F) >> 8;
    out[7] = (a0 + a2 - b0 + 0x7F) >> 8;
    for (let c = 0; c < 8; c++) {
      const v = (dest[base + c] + out[c]) | 0;
      dest[base + c] = Math.max(0, Math.min(255, v));
    }
  }
}

export function scaleBlock(src: Uint8Array, dst: Uint8Array, dstStride: number): void {
  // Expand 8x8 into 16x16 with pixel replication (each pixel -> 2x2); no subarray
  for (let j = 0; j < 8; j++) {
    const srcOff = j * 8;
    for (let repRow = 0; repRow < 2; repRow++) {
      const base = (j * 2 + repRow) * dstStride;
      for (let i = 0; i < 8; i++) {
        const v = src[srcOff + i];
        dst[base + i * 2 + 0] = v;
        dst[base + i * 2 + 1] = v;
      }
    }
  }
}

export function addPixels8(pixels: Uint8Array, block: Int16Array, lineSize: number): void {
  let p = 0; let b = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const idx = p + j;
      const v = (pixels[idx] + block[b++]) | 0;
      pixels[idx] = Math.max(0, Math.min(255, v));
    }
    p += lineSize;
  }
}
