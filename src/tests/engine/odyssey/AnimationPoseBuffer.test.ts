/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import { AnimationPoseBuffer } from '@engine/odyssey/AnimationPoseBuffer';

describe('AnimationPoseBuffer', () => {
  test('generation clears channel masks without realloc', () => {
    const buf = new AnimationPoseBuffer(4);
    buf.beginGeneration();
    buf.writePosition(1, 1, 2, 3);
    buf.writeRotation(1, 0, 0, 0, 1);
    expect(buf.hasPosition(1)).toBe(true);
    expect(buf.hasRotation(1)).toBe(true);
    expect(buf.activeCount).toBe(1);

    buf.beginGeneration();
    expect(buf.hasPosition(1)).toBe(false);
    expect(buf.activeCount).toBe(0);
  });

  test('ensureCapacity grows storage', () => {
    const buf = new AnimationPoseBuffer(2);
    buf.ensureCapacity(8);
    buf.beginGeneration();
    buf.writeScale(7, 2, 2, 2);
    expect(buf.hasScale(7)).toBe(true);
  });
});
