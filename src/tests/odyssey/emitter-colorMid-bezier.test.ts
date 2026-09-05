/**
 * @jest-environment node
 *
 * Regression: emitter ColorMid bezier keys must use stride 9 (like Position),
 * not the bogus header columnCount (e.g. 19 on m05ab_11a animloop). Wrong
 * stride bleeds into PercentMid/AlphaMid and rainbow-cycles particle color.
 */
import { describe, expect, test } from '@jest/globals';
import { parseEmitterColorFrames } from '@/odyssey/parseEmitterColorFrames';

describe('parseEmitterColorFrames bezier stride', () => {
  test('columnCount≠3 ColorMid uses stride 9 and does not read PercentMid/AlphaMid floats', () => {
    // Layout matches m05ab_11a omenemitter14 animloop1:
    // ColorMid @12: times[12..14] values[15..41] as 3×9 bezier
    // PercentMid @42 / AlphaMid @48 with sentinel values
    const floats = new Float32Array(54);

    floats[12] = 0; floats[13] = 1; floats[14] = 2;
    // Key 0 bezier: A=(1, 0.96, 0.91)
    floats[15] = 1; floats[16] = 0.96; floats[17] = 0.91;
    floats[18] = 0; floats[19] = 0; floats[20] = 0;
    floats[21] = 0; floats[22] = 0; floats[23] = 0;
    // Key 1 bezier: A=(0.95, 0.90, 0.85)
    floats[24] = 0.95; floats[25] = 0.90; floats[26] = 0.85;
    floats[27] = 0; floats[28] = 0; floats[29] = 0;
    floats[30] = 0; floats[31] = 0; floats[32] = 0;
    // Key 2 bezier: A=(0.90, 0.88, 0.80)
    floats[33] = 0.90; floats[34] = 0.88; floats[35] = 0.80;
    floats[36] = 0; floats[37] = 0; floats[38] = 0;
    floats[39] = 0; floats[40] = 0; floats[41] = 0;

    floats[42] = 0; floats[43] = 1; floats[44] = 2;
    floats[45] = 0.111; floats[46] = 0.222; floats[47] = 0.333;
    floats[48] = 0; floats[49] = 1; floats[50] = 2;
    floats[51] = 0.7; floats[52] = 0.7; floats[53] = 0.7;

    // Bogus header columnCount 19 (as on m05ab_11a) — must still use stride 9
    const frames = parseEmitterColorFrames(3, 19, 12, 15, floats);

    expect(frames.length).toBe(3);
    expect(frames[0].x).toBeCloseTo(1, 5);
    expect(frames[0].y).toBeCloseTo(0.96, 5);
    expect(frames[0].z).toBeCloseTo(0.91, 5);
    expect(frames[1].x).toBeCloseTo(0.95, 5);
    expect(frames[1].y).toBeCloseTo(0.90, 5);
    expect(frames[1].z).toBeCloseTo(0.85, 5);
    expect(frames[2].x).toBeCloseTo(0.90, 5);
    expect(frames[2].y).toBeCloseTo(0.88, 5);
    expect(frames[2].z).toBeCloseTo(0.80, 5);

    // Old bug: stride 19 → key2 into AlphaMid (0.7) / PercentMid sentinels
    expect(frames[1].z).not.toBeCloseTo(0.7, 5);
    expect(frames[2].x).not.toBeCloseTo(0.7, 5);
    expect(frames[2].x).not.toBeCloseTo(0.111, 5);

    expect(frames[0].isBezier).toBe(true);
    expect(frames[1].isBezier).toBe(true);
    expect(frames[2].isBezier).toBe(true);
  });

  test('columnCount 3 keeps linear RGB stride', () => {
    const floats = new Float32Array([0, 1, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);
    const frames = parseEmitterColorFrames(2, 3, 0, 2, floats);
    expect(frames[0].isBezier).toBe(false);
    expect(frames[0].x).toBeCloseTo(0.5, 5);
    expect(frames[0].y).toBeCloseTo(0.6, 5);
    expect(frames[0].z).toBeCloseTo(0.7, 5);
    expect(frames[1].x).toBeCloseTo(0.8, 5);
    expect(frames[1].y).toBeCloseTo(0.9, 5);
    expect(frames[1].z).toBeCloseTo(1.0, 5);
  });
});
