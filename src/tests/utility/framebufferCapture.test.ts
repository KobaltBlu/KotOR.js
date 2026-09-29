import { describe, expect, test } from '@jest/globals';
import { flipYForceOpaque } from '@/utility/framebufferCapture';

describe('flipYForceOpaque', () => {
  test('flips rows top↔bottom and forces opaque alpha', () => {
    // 2x2 RGBA: top row red/green, bottom row blue/white (alpha 0)
    const pixels = new Uint8Array([
      255, 0, 0, 0,
      0, 255, 0, 128,
      0, 0, 255, 0,
      255, 255, 255, 64,
    ]);

    const flipped = flipYForceOpaque(pixels, 2, 2);

    expect(Array.from(flipped.subarray(0, 4))).toEqual([0, 0, 255, 255]);
    expect(Array.from(flipped.subarray(4, 8))).toEqual([255, 255, 255, 255]);
    expect(Array.from(flipped.subarray(8, 12))).toEqual([255, 0, 0, 255]);
    expect(Array.from(flipped.subarray(12, 16))).toEqual([0, 255, 0, 255]);
  });
});
