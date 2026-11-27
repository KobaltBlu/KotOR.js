import { describe, expect, test } from '@jest/globals';
import { addPixels8, idctAdd } from '@engine/video/bink-idct';

// Bink residual adds are modulo 256 (FFmpeg binkdsp / RAD reference). The encoder
// relies on the wrap, so clamping instead produces black/white blocks that then
// spread through motion compensation (e.g. KotOR 01f.bik frame 30).
describe('bink residual add wraps modulo 256', () => {
  test('idctAdd: negative DC on dark reference wraps instead of clamping to 0', () => {
    const stride = 8;
    const dest = new Uint8Array(64).fill(44);
    const block = new Int32Array(64);
    block[0] = -29952; // DC-only residual of roughly -117 per pixel
    idctAdd(dest, stride, block);
    const residual = (-29952 + 0x7f) >> 8;
    const expected = (44 + residual) & 0xff;
    expect(expected).toBeGreaterThan(128); // sanity: wrapped, not clamped
    for (let i = 0; i < 64; i++) expect(dest[i]).toBe(expected);
  });

  test('idctAdd: positive overflow wraps', () => {
    const dest = new Uint8Array(64).fill(250);
    const block = new Int32Array(64);
    block[0] = 10 << 8; // +10 per pixel
    idctAdd(dest, 8, block);
    for (let i = 0; i < 64; i++) expect(dest[i]).toBe((250 + 10) & 0xff);
  });

  test('addPixels8 wraps in both directions and respects stride', () => {
    const stride = 16;
    const pixels = new Uint8Array(stride * 8).fill(7);
    const block = new Int16Array(64);
    block[0] = -10;
    block[1] = 255;
    addPixels8(pixels, block, stride);
    expect(pixels[0]).toBe((7 - 10) & 0xff);
    expect(pixels[1]).toBe((7 + 255) & 0xff);
    expect(pixels[2]).toBe(7);
    expect(pixels[8]).toBe(7); // outside the 8-wide block
  });
});
