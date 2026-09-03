import { describe, expect, test } from '@jest/globals';
import {
  binkChromaVisibleWidth,
  binkRefMaxOffset,
  clearYUVFrame,
  computeBinkFrameLayout,
  writeScaledBlockClamped,
  YUVFrame,
} from '@/video/binkvideo';

function makeFrame(width: number, height: number, fill = 0xab): YUVFrame {
  const { yStride, cStride, yBh, cBh } = computeBinkFrameLayout(width, height);
  const frame: YUVFrame = {
    width,
    height,
    y: new Uint8Array(yStride * yBh),
    u: new Uint8Array(cStride * cBh),
    v: new Uint8Array(cStride * cBh),
    linesizeY: yStride,
    linesizeU: cStride,
    linesizeV: cStride,
  };
  frame.y.fill(fill);
  frame.u.fill(fill);
  frame.v.fill(fill);
  return frame;
}

describe('binkvideo edge layout', () => {
  test('floor-half chroma visible width matches FFmpeg', () => {
    expect(binkChromaVisibleWidth(640)).toBe(320);
    expect(binkChromaVisibleWidth(641)).toBe(320);
    expect(binkChromaVisibleWidth(1)).toBe(0);
  });

  test('odd width: chroma stride pads beyond floor visible width', () => {
    const layout = computeBinkFrameLayout(641, 480);
    expect(layout.chromaVisibleW).toBe(320);
    // Block-grid chroma coverage: ((641+15)>>4)<<3 = 41*8 = 328
    expect(layout.cStride).toBe(328);
    expect(layout.cStride).toBeGreaterThan(layout.chromaVisibleW);
    // Odd-width ceil-half would be 321; padding column(s) exist beyond floor.
    expect(layout.cStride).toBeGreaterThanOrEqual((641 + 1) >> 1);
  });

  test('luma stride is 16-aligned for SCALED_BLOCK writes', () => {
    expect(computeBinkFrameLayout(640, 480).yStride).toBe(640);
    expect(computeBinkFrameLayout(636, 480).yStride).toBe(640);
    expect(computeBinkFrameLayout(641, 480).yStride).toBe(656);
  });

  test('even KotOR-sized frame needs no horizontal luma padding', () => {
    const layout = computeBinkFrameLayout(640, 480);
    expect(layout.yStride).toBe(640);
    expect(layout.cStride).toBe(320);
    expect(layout.chromaVisibleW).toBe(320);
  });
});

describe('clearYUVFrame', () => {
  test('zeros luma and neutralizes chroma (pool checkout)', () => {
    const frame = makeFrame(641, 32, 0xcd);
    expect(frame.y[0]).toBe(0xcd);
    expect(frame.u[0]).toBe(0xcd);
    clearYUVFrame(frame);
    expect(frame.y.every((b) => b === 0)).toBe(true);
    expect(frame.u.every((b) => b === 128)).toBe(true);
    expect(frame.v.every((b) => b === 128)).toBe(true);
  });

  test('visible chroma is neutralized after clear on odd width', () => {
    const frame = makeFrame(641, 16, 0xff);
    clearYUVFrame(frame);
    const { chromaVisibleW, cStride } = computeBinkFrameLayout(641, 16);
    // Visible chroma is neutralized; horizontal padding beyond floor width is 0 from layout size only if we zeroed whole buffer — clear fills entire U/V with 128 including padding.
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < chromaVisibleW; col++) {
        expect(frame.u[row * cStride + col]).toBe(128);
      }
    }
  });
});

describe('binkRefMaxOffset', () => {
  test('matches FFmpeg block-grid ref_end (not visible width-8)', () => {
    // width 636 → bw=80; last block starts at 632, which visible width-8 (=628) would reject
    const stride = 640;
    const bw = 80;
    const bh = 60;
    expect(binkRefMaxOffset(bw, bh, stride)).toBe((bw - 1 + stride * (bh - 1)) * 8);
    expect(binkRefMaxOffset(bw, bh, stride)).toBeGreaterThan(636 - 8);
  });

  test('odd-width chroma allows last block column', () => {
    // floor chroma w=320, bw=41 → last start 320; width-8 would only allow 312
    const cStride = 328;
    const bw = 41;
    const bh = 30;
    const maxOff = binkRefMaxOffset(bw, bh, cStride);
    expect(maxOff).toBeGreaterThanOrEqual((bw - 1) * 8);
    expect((bw - 1) * 8).toBe(320);
    expect(320).toBeGreaterThan(320 - 8);
  });
});

describe('writeScaledBlockClamped', () => {
  test('clamps columns at right edge so next row is untouched', () => {
    // Stride 20: a 16-wide write at x=8 would need cols 8..23; clamp to 12.
    const stride = 20;
    const height = 32;
    const dst = new Uint8Array(stride * height);
    dst.fill(0x11);
    const tmp = new Uint8Array(256);
    tmp.fill(0xee);

    const dstOff = 8; // last partial columns on row 0
    writeScaledBlockClamped(dst, dstOff, stride, tmp, 0, height);

    // Written cells on row 0: cols 8..19
    for (let col = 8; col < 20; col++) {
      expect(dst[col]).toBe(0xee);
    }
    // Next row must not receive spill from an unclamped 16-wide set()
    for (let col = 0; col < 8; col++) {
      expect(dst[stride + col]).toBe(0x11);
    }
    // Columns written on row 1 start at dstOff+stride = 28 → cols 8..19 of row 1
    for (let col = 8; col < 20; col++) {
      expect(dst[stride + col]).toBe(0xee);
    }
  });

  test('full 16-wide write when space remains in stride', () => {
    const stride = 32;
    const dst = new Uint8Array(stride * 24);
    dst.fill(0);
    const tmp = new Uint8Array(256);
    for (let i = 0; i < 256; i++) tmp[i] = (i & 0xff);

    writeScaledBlockClamped(dst, 0, stride, tmp, 0, 24);
    for (let j = 0; j < 16; j++) {
      for (let i = 0; i < 16; i++) {
        expect(dst[j * stride + i]).toBe(tmp[j * 16 + i]);
      }
      // Padding beyond the block stays zero
      for (let i = 16; i < stride; i++) {
        expect(dst[j * stride + i]).toBe(0);
      }
    }
  });

  test('row clamp at plane bottom does not write past planeHeight', () => {
    const stride = 32;
    const planeHeight = 10; // only 10 visible rows; block at row 0 can write 10 of 16
    const dst = new Uint8Array(stride * 16);
    dst.fill(0x22);
    const tmp = new Uint8Array(256);
    tmp.fill(0xaa);

    writeScaledBlockClamped(dst, 0, stride, tmp, 0, planeHeight);
    for (let j = 0; j < 10; j++) {
      expect(dst[j * stride]).toBe(0xaa);
    }
    for (let j = 10; j < 16; j++) {
      expect(dst[j * stride]).toBe(0x22);
    }
  });
});
