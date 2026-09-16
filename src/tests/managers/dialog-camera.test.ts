/**
 * TSL dialog-camera appearance / placeable override gating.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as THREE from 'three';
import {
  isAspyrCarthDialogCameraHack,
  applyAspyrPlaceableCameraHack,
  resolveAspyrAppearanceCameraOverrides,
  isLoopingDialogStuntAnimation,
} from '@/managers/cutscene/dialog-camera';

describe('isLoopingDialogStuntAnimation', () => {
  it('is false for base and w CUT bands', () => {
    expect(isLoopingDialogStuntAnimation(1000)).toBe(false);
    expect(isLoopingDialogStuntAnimation(1200)).toBe(false);
    expect(isLoopingDialogStuntAnimation(0x577)).toBe(false);
  });

  it('is true for l and wl CUT bands (1401..1727)', () => {
    expect(isLoopingDialogStuntAnimation(1401)).toBe(true);
    expect(isLoopingDialogStuntAnimation(0x578)).toBe(true);
    expect(isLoopingDialogStuntAnimation(1600)).toBe(true);
    expect(isLoopingDialogStuntAnimation(0x6bf - 1)).toBe(true);
  });

  it('is false outside the valid looping window', () => {
    expect(isLoopingDialogStuntAnimation(0)).toBe(false);
    expect(isLoopingDialogStuntAnimation(999)).toBe(false);
    expect(isLoopingDialogStuntAnimation(0x6c0)).toBe(false);
    expect(isLoopingDialogStuntAnimation(0x2772)).toBe(false);
  });
});

describe('isAspyrCarthDialogCameraHack', () => {
  it('matches the engine "carth" conversation (case-insensitive)', () => {
    expect(isAspyrCarthDialogCameraHack('carth')).toBe(true);
    expect(isAspyrCarthDialogCameraHack('Carth')).toBe(true);
    expect(isAspyrCarthDialogCameraHack('CARTH')).toBe(true);
  });

  it('does not match any other dialog resref', () => {
    expect(isAspyrCarthDialogCameraHack('')).toBe(false);
    expect(isAspyrCarthDialogCameraHack(undefined)).toBe(false);
    expect(isAspyrCarthDialogCameraHack('carth_end')).toBe(false);
    expect(isAspyrCarthDialogCameraHack('end_m01aa')).toBe(false);
  });
});

describe('applyAspyrPlaceableCameraHack', () => {
  const basePos = () => new THREE.Vector3(1, 2, 3);
  const baseQuat = () => new THREE.Quaternion(0, 0, 0.6343932151794434, 0.7730104327201843);

  it('is a no-op when vanilla hacks are disabled (non-carth dialog)', () => {
    const pos = basePos();
    const quat = baseQuat();
    const { position, quaternion } = applyAspyrPlaceableCameraHack(
      pos, quat, false, false, pos, quat
    );
    expect(position.x).toBeCloseTo(1, 6);
    expect(position.y).toBeCloseTo(2, 6);
    expect(position.z).toBeCloseTo(3, 6);
    expect(quaternion.z).toBeCloseTo(0.6343932151794434, 6);
    expect(quaternion.w).toBeCloseTo(0.7730104327201843, 6);
  });

  it('is a no-op when the game is modded even if vanilla flag is set', () => {
    const pos = basePos();
    const quat = baseQuat();
    const { position } = applyAspyrPlaceableCameraHack(
      pos, quat, true, true, pos, quat
    );
    expect(position.x).toBeCloseTo(1, 6);
    expect(position.y).toBeCloseTo(2, 6);
    expect(position.z).toBeCloseTo(3, 6);
  });

  it('applies the +2/-6/+0.5 offset and +110 pitch only for the carth hack', () => {
    const pos = basePos();
    const quat = baseQuat();
    const { position } = applyAspyrPlaceableCameraHack(
      pos, quat, false, true, pos, quat
    );
    expect(position.x).toBeCloseTo(3, 6);
    expect(position.y).toBeCloseTo(-4, 6);
    expect(position.z).toBeCloseTo(3.5, 6);
  });
});

describe('resolveAspyrAppearanceCameraOverrides', () => {
  it('returns empty overrides when vanilla hacks are disabled', () => {
    // 0x121 speaker / 0x122 listener / type 3 would otherwise override.
    const overrides = resolveAspyrAppearanceCameraOverrides(0x121, 0x122, 3, false, false);
    expect(overrides).toEqual({ distance: 0, height: 0, angleDeg: 0 });
  });

  it('applies the appearance-pair override when enabled', () => {
    const overrides = resolveAspyrAppearanceCameraOverrides(0x121, 0x122, 3, false, true);
    expect(overrides).toEqual({ distance: 0, height: 1, angleDeg: 70 });
  });
});
