/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import {
  binarySearchFrameCursor,
  isPlaybackDiscontinuity,
  resolveFrameCursor,
} from '@/odyssey/resolveFrameCursor';
import type { IOdysseyControllerFrameGeneric } from '@/interface/odyssey/controller/IOdysseyControllerFrameGeneric';

function frames(...times: number[]): IOdysseyControllerFrameGeneric[] {
  return times.map((time) => ({ time } as IOdysseyControllerFrameGeneric));
}

describe('binarySearchFrameCursor', () => {
  test('empty / single frame → 0', () => {
    expect(binarySearchFrameCursor([], 1)).toBe(0);
    expect(binarySearchFrameCursor(frames(0), 5)).toBe(0);
  });

  test('exact timestamps and between keys', () => {
    const f = frames(0, 0.25, 0.5, 1);
    expect(binarySearchFrameCursor(f, 0)).toBe(0);
    expect(binarySearchFrameCursor(f, 0.25)).toBe(1);
    expect(binarySearchFrameCursor(f, 0.3)).toBe(1);
    expect(binarySearchFrameCursor(f, 0.5)).toBe(2);
    expect(binarySearchFrameCursor(f, 1)).toBe(3);
    expect(binarySearchFrameCursor(f, 2)).toBe(3);
  });

  test('before first key stays at 0', () => {
    expect(binarySearchFrameCursor(frames(0.1, 0.2), 0)).toBe(0);
  });
});

describe('resolveFrameCursor', () => {
  const f = frames(0, 0.25, 0.5, 0.75, 1);

  test('one-key returns 0', () => {
    expect(resolveFrameCursor(frames(0), 0.5, 99)).toBe(0);
  });

  test('O(1) path keeps cursor when elapsed still in window', () => {
    expect(resolveFrameCursor(f, 0.3, 1)).toBe(1);
    expect(resolveFrameCursor(f, 0.49, 1)).toBe(1);
    expect(resolveFrameCursor(f, 0.5, 2)).toBe(2);
  });

  test('walks forward as elapsed advances', () => {
    let c = 0;
    c = resolveFrameCursor(f, 0.1, c);
    expect(c).toBe(0);
    c = resolveFrameCursor(f, 0.25, c);
    expect(c).toBe(1);
    c = resolveFrameCursor(f, 0.6, c);
    expect(c).toBe(2);
    c = resolveFrameCursor(f, 1, c);
    expect(c).toBe(4);
  });

  test('walks backward for reverse playback', () => {
    let c = 4;
    c = resolveFrameCursor(f, 0.8, c);
    expect(c).toBe(3);
    c = resolveFrameCursor(f, 0.2, c);
    expect(c).toBe(0);
  });

  test('exact key timestamps select that key', () => {
    expect(resolveFrameCursor(f, 0.75, 0)).toBe(3);
  });

  test('last key when past end', () => {
    expect(resolveFrameCursor(f, 1.5, 2)).toBe(4);
  });

  test('invalid cursor clamps then resolves', () => {
    expect(resolveFrameCursor(f, 0.3, -1)).toBe(1);
    expect(resolveFrameCursor(f, 0.3, 99)).toBe(1);
  });
});

describe('isPlaybackDiscontinuity', () => {
  test('forward wrap when elapsed < lastTime', () => {
    expect(isPlaybackDiscontinuity(0.05, 0.95, 1)).toBe(true);
    expect(isPlaybackDiscontinuity(0.5, 0.4, 1)).toBe(false);
  });

  test('reverse wrap when elapsed > lastTime', () => {
    expect(isPlaybackDiscontinuity(0.95, 0.05, -1)).toBe(true);
    expect(isPlaybackDiscontinuity(0.4, 0.5, -1)).toBe(false);
  });
});
