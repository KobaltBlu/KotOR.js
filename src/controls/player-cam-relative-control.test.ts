/**
 * @jest-environment node
 */
import { describe, expect, test, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    turboEnabled: false,
  },
}));

import {
  PLAYER_ANIM_SPEED_CUTOFF,
  PLAYER_VEL_STOP,
  createPlayerCamRelativeState,
  driveAnimPlaybackRate,
  isDriveAnimRunning,
  playerDesiredFacingRad,
  playerIntegrateRk4,
  playerKillReleasedAxisVelocity,
  playerSetSWAnimationSpeedMag,
  playerStepAlongFacing,
} from '@/controls/player-cam-relative-control';

describe('playerKillReleasedAxisVelocity', () => {
  test('full release leaves velocity for drag coast', () => {
    const state = createPlayerCamRelativeState();
    state.velX = 3;
    state.velY = 4;
    // Camera facing 0: forward = (-1, 0), right = (0, -1)
    playerKillReleasedAxisVelocity(state, 0, 0, 0);
    expect(state.velX).toBe(3);
    expect(state.velY).toBe(4);
  });

  test('partial release clears only the released camera axis', () => {
    const state = createPlayerCamRelativeState();
    // Facing 0: forward=(-1,0), right=(0,-1). Velocity along both.
    state.velX = -4; // forward component 4
    state.velY = -2; // right component 2
    // Hold forward, release right → kill right axis only
    playerKillReleasedAxisVelocity(state, 1, 0, 0);
    expect(state.velX).toBeCloseTo(-4, 5);
    expect(state.velY).toBeCloseTo(0, 5);

    state.velX = -4;
    state.velY = -2;
    // Hold right, release forward → kill forward axis only
    playerKillReleasedAxisVelocity(state, 0, 1, 0);
    expect(state.velX).toBeCloseTo(0, 5);
    expect(state.velY).toBeCloseTo(-2, 5);
  });
});

describe('playerIntegrateRk4 coast to rest', () => {
  test('full release coasts then hard-stops under PLAYER_VEL_STOP', () => {
    const state = createPlayerCamRelativeState();
    state.velX = 5;
    state.velY = 0;
    state.prevDesiredX = 1;
    state.prevDesiredY = 0;

    const start = Math.hypot(state.velX, state.velY);
    // Simulate released stick: desired 0, kill does nothing on full release
    playerKillReleasedAxisVelocity(state, 0, 0, 0);
    expect(Math.hypot(state.velX, state.velY)).toBe(start);

    let lastSpeed = start;
    let stopped = false;
    for(let i = 0; i < 120; i++){
      const step = playerIntegrateRk4(state, 0, 0, 25, 6, 1 / 30);
      expect(step.speed).toBeLessThanOrEqual(lastSpeed + 1e-6);
      lastSpeed = step.speed;
      if(step.speed === 0){
        stopped = true;
        expect(Math.abs(state.velX)).toBeLessThan(PLAYER_VEL_STOP);
        expect(Math.abs(state.velY)).toBeLessThan(PLAYER_VEL_STOP);
        break;
      }
    }
    expect(stopped).toBe(true);
    expect(lastSpeed).toBe(0);
  });
});

describe('playerSetSWAnimationSpeedMag', () => {
  test('zeros when |v| <= 1 or non-finite', () => {
    expect(playerSetSWAnimationSpeedMag(0)).toBe(0);
    expect(playerSetSWAnimationSpeedMag(PLAYER_ANIM_SPEED_CUTOFF)).toBe(0);
    expect(playerSetSWAnimationSpeedMag(0.5)).toBe(0);
    expect(playerSetSWAnimationSpeedMag(Number.NaN)).toBe(0);
    expect(playerSetSWAnimationSpeedMag(Number.POSITIVE_INFINITY)).toBe(0);
  });

  test('passes through magnitudes above cutoff', () => {
    expect(playerSetSWAnimationSpeedMag(1.01)).toBeCloseTo(1.01);
    expect(playerSetSWAnimationSpeedMag(5.4)).toBeCloseTo(5.4);
  });
});

describe('release anim speed bands (DriveAnimationUpdate)', () => {
  test('run above 0.6*Vmax, walk between cutoff and run gate, idle at |v|<=1', () => {
    const vmax = 6;
    // Running band
    expect(playerSetSWAnimationSpeedMag(5)).toBe(5);
    expect(isDriveAnimRunning(5, vmax)).toBe(true);
    // Walk band while coasting (below run gate, above anim cutoff)
    expect(playerSetSWAnimationSpeedMag(2)).toBe(2);
    expect(isDriveAnimRunning(2, vmax)).toBe(false);
    // Idle cutover while RK4 may still coast to 0.25
    expect(playerSetSWAnimationSpeedMag(1)).toBe(0);
    expect(playerSetSWAnimationSpeedMag(0.5)).toBe(0);
  });
});

describe('driveAnimPlaybackRate', () => {
  test('rate = speed / (animDist / animLenSec)', () => {
    // speed 3.6, dist 5.4, len 1s → 3.6 / 5.4 = 0.666...
    expect(driveAnimPlaybackRate(3.6, 5.4, 1)).toBeCloseTo(3.6 / 5.4);
    expect(driveAnimPlaybackRate(2, 2, 1)).toBeCloseTo(1);
    expect(driveAnimPlaybackRate(1, 0, 1)).toBe(1);
    expect(driveAnimPlaybackRate(1, 2, 0)).toBe(1);
  });
});

describe('isDriveAnimRunning', () => {
  test('run when speed > DriveMaxSpeed * 0.6', () => {
    expect(isDriveAnimRunning(3.7, 6)).toBe(true);
    expect(isDriveAnimRunning(3.5, 6)).toBe(false);
    expect(isDriveAnimRunning(3, 6)).toBe(false);
  });
});

describe('playerStepAlongFacing', () => {
  test('facing 0, mag 1 → (cos(π/2), sin(π/2))', () => {
    const step = playerStepAlongFacing(1, 0);
    expect(step.dx).toBeCloseTo(Math.cos(Math.PI / 2), 5);
    expect(step.dy).toBeCloseTo(Math.sin(Math.PI / 2), 5);
  });

  test('preserves magnitude along facing, not along velocity', () => {
    const facing = Math.PI / 4;
    const mag = 2.5;
    const step = playerStepAlongFacing(mag, facing);
    expect(Math.hypot(step.dx, step.dy)).toBeCloseTo(mag, 5);
    expect(step.dx).toBeCloseTo(Math.cos(facing + Math.PI / 2) * mag, 5);
    expect(step.dy).toBeCloseTo(Math.sin(facing + Math.PI / 2) * mag, 5);
  });

  test('zero mag yields zero step', () => {
    expect(playerStepAlongFacing(0, 1.2)).toEqual({ dx: 0, dy: 0 });
  });
});

describe('playerDesiredFacingRad', () => {
  test('matches atan2(desired) − π/2', () => {
    expect(playerDesiredFacingRad(1, 0)).toBeCloseTo(-Math.PI / 2, 5);
    expect(playerDesiredFacingRad(0, 1)).toBeCloseTo(0, 5);
    expect(playerDesiredFacingRad(-1, 0)).toBeCloseTo(Math.PI / 2, 5);
  });

  test('turn target follows stick desired, not velocity', () => {
    // Stick wants +X; residual velocity still points +Y — facing target is stick.
    const stickDesired = { x: 1, y: 0 };
    const velocity = { x: 0, y: 4 };
    const fromStick = playerDesiredFacingRad(stickDesired.x, stickDesired.y);
    const fromVel = playerDesiredFacingRad(velocity.x, velocity.y);
    expect(fromStick).toBeCloseTo(-Math.PI / 2, 5);
    expect(fromVel).toBeCloseTo(0, 5);
    expect(fromStick).not.toBeCloseTo(fromVel, 5);
  });
});
