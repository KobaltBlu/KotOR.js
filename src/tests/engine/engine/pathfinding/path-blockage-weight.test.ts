/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    ModuleObjectManager: { GetObjectById: () => undefined },
    raycaster: { ray: { origin: { copy() {} }, direction: { copy() {} } }, far: 0 },
    module: undefined,
  },
}));

import {
  OBSTRUCTION_DOOR,
  OBSTRUCTION_PLACEABLE,
  OBSTRUCTION_WALL,
  obstructionVolumeScale,
  getPathBlockageWeight,
} from '@engine/pathfinding/path-blockage-weight';

describe('obstructionVolumeScale', () => {
  test('maps engine factor to Miles-like gain multiplier', () => {
    expect(obstructionVolumeScale(0)).toBe(1);
    expect(obstructionVolumeScale(-1)).toBe(1);
    expect(obstructionVolumeScale(0.4)).toBeCloseTo(0.6);
    expect(obstructionVolumeScale(OBSTRUCTION_WALL)).toBeCloseTo(0.6);
    expect(obstructionVolumeScale(OBSTRUCTION_DOOR)).toBeCloseTo(0.45);
    expect(obstructionVolumeScale(OBSTRUCTION_PLACEABLE)).toBeCloseTo(0.6);
    expect(obstructionVolumeScale(1)).toBe(0);
    expect(obstructionVolumeScale(2)).toBe(0);
  });
});

describe('getPathBlockageWeight', () => {
  test('returns 0 without area', () => {
    expect(getPathBlockageWeight(undefined, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(0);
  });
});
