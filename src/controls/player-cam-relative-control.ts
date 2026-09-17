/**
 * Camera-relative player locomotion — cam-relative control.
 *
 * Accel: A*input - (A/Vmax)*v; if Vmax < 1.8 then A *= Vmax/1.8.
 * Walk scales desired input by 0.5. RK4 integration. Stop when |vx|,|vy| < 0.25.
 * Stealth (activity_ bit 0): Vmax=DriveAnimWalk, A=15
 * (GetMaxSpeed / GetDriveAcceleration). Detect is activity bit 1 and does not
 * change Vmax. Walk key only scales desired — it does not change Vmax.
 * Partial stick release kills velocity on the released camera axis; full release
 * leaves velocity for drag coast. SetSWAnimationSpeed mag = |v| (0 when |v|<=1).
 * Turn toward stick world desired (not velocity); only while stick non-zero.
 * Rate lerps MinTurnRate→MaxTurnRate (faster when slow); gated on
 * |facingError|>0.1 and |last SetSWAnimationSpeed|>0.1. Position step is
 * facing × |RK4 delta| (no sideways slide). DriveAnimationUpdate: run when
 * speed > DriveMaxSpeed * 0.6.
 *
 * @file player-cam-relative-control.ts
 */

import {
  coalesceDriveAccl,
  coalesceDriveAnimWalk,
  coalesceDriveMaxSpeed,
  DEFAULT_DRIVE_ACCL,
  DEFAULT_DRIVE_MAX_SPEED,
} from "@/engine/pathfinding/movement-rate";
import { GameState } from "@/GameState";

/** turbo GetMaxSpeed when turbo is enabled. */
export const PLAYER_TURBO_MAX_SPEED = 15;

/** stop threshold for cam-relative velocity (world units/sec). */
export const PLAYER_VEL_STOP = 0.25;

/** Vmax below which accel is scaled (1.8). */
export const PLAYER_ACCL_SCALE_VMAX = 1.8;

/** DriveAnimationUpdate run threshold factor (0.6). */
export const DRIVE_ANIM_RUN_FACTOR = 0.6;

/**
 * Control zeros SetSWAnimationSpeed when velocity magnitude <= this
 * (still coasts via RK4 until PLAYER_VEL_STOP).
 */
export const PLAYER_ANIM_SPEED_CUTOFF = 1.0;

/** Walk modifier on desired input axes. */
export const PLAYER_WALK_INPUT_SCALE = 0.5;

/**
 * GetDriveAcceleration when activity_ stealth bit (0x1) is set.
 */
export const PLAYER_STEALTH_DRIVE_ACCL = 15;

/** @deprecated use PLAYER_STEALTH_DRIVE_ACCL */
export const PLAYER_DETECT_DRIVE_ACCL = PLAYER_STEALTH_DRIVE_ACCL;

/** Control turn gate — |facingError| and |lastAnimMoveSpeed| must both exceed this. */
export const PLAYER_TURN_GATE_DEG = 0.1;

/** Combat camera mode 6 idle face rate (deg/sec). */
export const PLAYER_COMBAT_FACE_RATE_DEG = 900;

export interface PlayerCamRelativeState {
  /** Camera-relative desired axes: +forward / +right (up_down / left_right). */
  axisForward: number;
  axisRight: number;
  walking: boolean;
  /** Persistent world velocity (x,y). */
  velX: number;
  velY: number;
  /** Last integrated world acceleration (controller state). */
  accelX: number;
  accelY: number;
  /** Previous desired world direction (for accel helper). */
  prevDesiredX: number;
  prevDesiredY: number;
  /** Facing error sign / degrees leftover. */
  facingErrorDeg: number;
  /**
   * Previous frame SetSWAnimationSpeed magnitude.
   * Turn is gated on |this| > 0.1.
   */
  lastAnimMoveSpeed: number;
  /** Discrete server replication bits derived independently from float axes. */
  driveFlags: number;
  active: boolean;
}

export function createPlayerCamRelativeState(): PlayerCamRelativeState {
  return {
    axisForward: 0,
    axisRight: 0,
    walking: false,
    velX: 0,
    velY: 0,
    accelX: 0,
    accelY: 0,
    prevDesiredX: 0,
    prevDesiredY: 0,
    facingErrorDeg: 0,
    lastAnimMoveSpeed: 0,
    driveFlags: 0,
    active: false,
  };
}

/**
 * GetMaxSpeed / GetDriveAcceleration — activity_ bit 0 (stealth) uses
 * DriveAnimWalk + fixed accel 15; otherwise appearance DriveMaxSpeed / DRIVEACCl.
 * Client activity mirrors server activity_ (UpdateLastUpdateObject flags 0x40).
 */
export function resolvePlayerDriveLimits(
  stealthMode: boolean,
  driveAccl: number,
  driveMaxSpeed: number,
  driveAnimWalk: number
): { driveAccl: number; maxSpeed: number } {
  if(stealthMode){
    return {
      driveAccl: PLAYER_STEALTH_DRIVE_ACCL,
      maxSpeed: coalesceDriveAnimWalk(driveAnimWalk),
    };
  }
  // turbo_enabled → GetMaxSpeed returns 15.0
  if(GameState.turboEnabled){
    return {
      driveAccl: coalesceDriveAccl(driveAccl),
      maxSpeed: PLAYER_TURBO_MAX_SPEED,
    };
  }
  return {
    driveAccl: coalesceDriveAccl(driveAccl),
    maxSpeed: coalesceDriveMaxSpeed(driveMaxSpeed),
  };
}

/** Control turn gate before Min/MaxTurnRate step. */
export function playerShouldApplyTurn(
  facingErrorDeg: number,
  lastAnimMoveSpeed: number
): boolean {
  return (
    Math.abs(facingErrorDeg) > PLAYER_TURN_GATE_DEG &&
    Math.abs(lastAnimMoveSpeed) > PLAYER_TURN_GATE_DEG
  );
}

/**
 * Combat camera mode 6 idle facing — clamp yaw error to ±rate*dt (deg).
 */
export function playerCombatFaceStep(
  facingRad: number,
  targetYawRad: number,
  delta: number,
  rateDeg: number = PLAYER_COMBAT_FACE_RATE_DEG
): number {
  let err = ((targetYawRad - facingRad) * 180) / Math.PI;
  while(err > 180) err -= 360;
  while(err < -180) err += 360;
  const maxStep = Math.abs(rateDeg) * Math.max(0, delta);
  const step = Math.sign(err) * Math.min(Math.abs(err), maxStep);
  return facingRad + (step * Math.PI) / 180;
}

export function setPlayerAxes(
  state: PlayerCamRelativeState,
  forward: number,
  right: number,
  walking: boolean
): void {
  state.axisForward = clampAxis(forward);
  state.axisRight = clampAxis(right);
  state.walking = !!walking;
  state.driveFlags = packDriveFlagsFromAxes(
    state.axisForward,
    state.axisRight,
    state.walking,
    false,
    false
  );
  state.active = Math.abs(state.axisForward) > 1e-4 || Math.abs(state.axisRight) > 1e-4;
}

function clampAxis(v: number): number {
  if(!Number.isFinite(v)) return 0;
  if(v > 1) return 1;
  if(v < -1) return -1;
  return v;
}

/**
 * GetAcceleration: a = A*desired - (A/Vmax)*v
 */
export function playerGetAcceleration(
  velX: number,
  velY: number,
  desiredX: number,
  desiredY: number,
  driveAccl: number,
  maxSpeed: number
): { ax: number; ay: number } {
  let A = coalesceDriveAccl(driveAccl);
  const Vmax = coalesceDriveMaxSpeed(maxSpeed);
  if(Vmax < PLAYER_ACCL_SCALE_VMAX){
    A *= Vmax / PLAYER_ACCL_SCALE_VMAX;
  }
  const drag = A / Vmax;
  return {
    ax: A * desiredX - drag * velX,
    ay: A * desiredY - drag * velY,
  };
}

/**
 * Classic RK4 on 2D velocity with accel = f(v, desired).
 * averages current desired with the previous frame before integrating.
 * Position step = integrated velocity * dt (caller applies).
 */
export function playerIntegrateRk4(
  state: PlayerCamRelativeState,
  desiredX: number,
  desiredY: number,
  driveAccl: number,
  maxSpeed: number,
  delta: number
): { dx: number; dy: number; speed: number } {
  const dt = Math.max(0, Math.min(1, delta));
  if(dt <= 1e-8){
    return { dx: 0, dy: 0, speed: Math.hypot(state.velX, state.velY) };
  }

  const noInput = Math.abs(desiredX) < 1e-6 && Math.abs(desiredY) < 1e-6;
  if(
    noInput &&
    Math.abs(state.velX) < PLAYER_VEL_STOP &&
    Math.abs(state.velY) < PLAYER_VEL_STOP
  ){
    state.velX = 0;
    state.velY = 0;
    state.accelX = 0;
    state.accelY = 0;
    state.prevDesiredX = 0;
    state.prevDesiredY = 0;
    return { dx: 0, dy: 0, speed: 0 };
  }

  // Retail SetPrecalculatedPosition staging:
  // k1 = previous desired, k2/k3 = midpoint(previous, current), k4 = current.
  const prevX = state.prevDesiredX;
  const prevY = state.prevDesiredY;
  const midX = (desiredX + prevX) * 0.5;
  const midY = (desiredY + prevY) * 0.5;

  const accelAt = (vx: number, vy: number, dx: number, dy: number) =>
    playerGetAcceleration(vx, vy, dx, dy, driveAccl, maxSpeed);

  // Classic RK4 on velocity; position uses trapezoid of v
  const v0x = state.velX;
  const v0y = state.velY;

  const k1 = accelAt(v0x, v0y, prevX, prevY);
  const k2 = accelAt(v0x + k1.ax * dt * 0.5, v0y + k1.ay * dt * 0.5, midX, midY);
  const k3 = accelAt(v0x + k2.ax * dt * 0.5, v0y + k2.ay * dt * 0.5, midX, midY);
  const k4 = accelAt(v0x + k3.ax * dt, v0y + k3.ay * dt, desiredX, desiredY);

  const ax = (k1.ax + 2 * k2.ax + 2 * k3.ax + k4.ax) / 6;
  const ay = (k1.ay + 2 * k2.ay + 2 * k3.ay + k4.ay) / 6;
  state.accelX = ax;
  state.accelY = ay;

  const v1x = v0x + ax * dt;
  const v1y = v0y + ay * dt;

  state.velX = v1x;
  state.velY = v1y;
  state.prevDesiredX = desiredX;
  state.prevDesiredY = desiredY;

  if(
    noInput &&
    Math.abs(state.velX) < PLAYER_VEL_STOP &&
    Math.abs(state.velY) < PLAYER_VEL_STOP
  ){
    state.velX = 0;
    state.velY = 0;
    state.accelX = 0;
    state.accelY = 0;
    return { dx: 0, dy: 0, speed: 0 };
  }

  const dx = ((v0x + state.velX) * 0.5) * dt;
  const dy = ((v0y + state.velY) * 0.5) * dt;
  return { dx, dy, speed: Math.hypot(state.velX, state.velY) };
}

/**
 * Control: when exactly one stick axis is held, kill velocity along the
 * released camera axis immediately (strafe stops when A/D is released while W
 * is held). When both axes are released, do nothing — drag coasts until
 * |vx|,|vy| < 0.25.
 */
export function playerKillReleasedAxisVelocity(
  state: PlayerCamRelativeState,
  axisForward: number,
  axisRight: number,
  cameraFacing: number
): void {
  const fwdReleased = Math.abs(axisForward) < 1e-4;
  const rightReleased = Math.abs(axisRight) < 1e-4;
  // Full release: leave velocity for GetAcceleration drag (Control).
  if(fwdReleased && rightReleased) return;

  const forwardX = -Math.cos(cameraFacing);
  const forwardY = -Math.sin(cameraFacing);
  const rightX = Math.sin(cameraFacing);
  const rightY = -Math.cos(cameraFacing);

  if(fwdReleased){
    const along = state.velX * forwardX + state.velY * forwardY;
    state.velX -= along * forwardX;
    state.velY -= along * forwardY;
  }
  if(rightReleased){
    const along = state.velX * rightX + state.velY * rightY;
    state.velX -= along * rightX;
    state.velY -= along * rightY;
  }
}

/**
 * Control → SetSWAnimationSpeed magnitude: total |v|; 0 when
 * !finite or |v| <= 1.0 (idle cutover while RK4 may still coast to 0.25).
 */
export function playerSetSWAnimationSpeedMag(speedMag: number): number {
  if(!Number.isFinite(speedMag) || speedMag <= PLAYER_ANIM_SPEED_CUTOFF) return 0;
  return speedMag;
}

/**
 * Camera yaw (radians, KotOR FollowerCamera.facing) → world desired move dir.
 *
 * Chase camera sits at player + (cos(facing), sin(facing)); "into the screen"
 * (W) is the opposite: (-cos, -sin). Matches legacy WASD
 * setFacing(cam+π/2) + force along facing+π/2.
 */
export function cameraRelativeDesired(
  axisForward: number,
  axisRight: number,
  cameraFacing: number,
  walking: boolean
): { x: number; y: number } {
  // stick compose: (-left_right, up_down). Normalize only when both
  // axes are active (diagonal). Axis-aligned partial sticks keep magnitude.
  let ix = -axisRight;
  let iy = axisForward;
  if(Math.abs(ix) > 1e-6 && Math.abs(iy) > 1e-6){
    const len = Math.hypot(ix, iy);
    if(len > 1e-6){
      ix /= len;
      iy /= len;
    }
  }else{
    ix = clampAxis(ix);
    iy = clampAxis(iy);
  }
  if(walking){
    ix *= PLAYER_WALK_INPUT_SCALE;
    iy *= PLAYER_WALK_INPUT_SCALE;
  }
  // Into screen (away from camera behind the player)
  const forwardX = -Math.cos(cameraFacing);
  const forwardY = -Math.sin(cameraFacing);
  // Camera right when looking toward player from behind
  const rightX = Math.sin(cameraFacing);
  const rightY = -Math.cos(cameraFacing);
  return {
    x: forwardX * iy + rightX * ix,
    y: forwardY * iy + rightY * ix,
  };
}

/**
 * Control turn target: yaw of stick world desired (atan2 − π/2),
 * not velocity. Returns 0 when desired is ~zero.
 */
export function playerDesiredFacingRad(desiredX: number, desiredY: number): number {
  if(Math.abs(desiredX) < 1e-8 && Math.abs(desiredY) < 1e-8) return 0;
  return Math.atan2(desiredY, desiredX) - Math.PI / 2;
}

/**
 * SetPrecalculatedPosition step: normalize(orientation) * |delta|.
 * Forward = (cos(z+π/2), sin(z+π/2)) — same as legacy force-mover.
 */
export function playerStepAlongFacing(
  stepMag: number,
  facingRad: number
): { dx: number; dy: number } {
  const mag = Math.max(0, stepMag);
  if(mag < 1e-12) return { dx: 0, dy: 0 };
  return {
    dx: Math.cos(facingRad + Math.PI / 2) * mag,
    dy: Math.sin(facingRad + Math.PI / 2) * mag,
  };
}

/**
 * turn: rate = lerp(max, min, |v|/Vmax) * sign * dt (degrees).
 * Faster when slow (MaxTurnRate), slower at Vmax (MinTurnRate).
 * Returns new facing radians.
 */
export function playerApplyTurn(
  facingRad: number,
  desiredYawRad: number,
  speed: number,
  maxSpeed: number,
  minTurnRateDeg: number,
  maxTurnRateDeg: number,
  delta: number
): number {
  const Vmax = coalesceDriveMaxSpeed(maxSpeed);
  const spd = Math.max(0, speed);
  const t = Vmax > 1e-6 ? Math.min(1, spd / Vmax) : 0;
  // : (Max-Min)*(1 - |v|/Vmax) + Min → Max at rest, Min at Vmax
  const rateDeg =
    (maxTurnRateDeg - minTurnRateDeg) * (1 - t) + minTurnRateDeg;
  let err = ((desiredYawRad - facingRad) * 180) / Math.PI;
  while(err > 180) err -= 360;
  while(err < -180) err += 360;
  if(Math.abs(err) < 0.1) return desiredYawRad;
  const step = Math.sign(err) * Math.min(Math.abs(err), Math.abs(rateDeg) * Math.max(0, delta));
  return facingRad + (step * Math.PI) / 180;
}

/** DriveAnimationUpdate forward-speed run gate. */
export function isDriveAnimRunning(forwardSpeed: number, driveMaxSpeed: number): boolean {
  const Vmax = coalesceDriveMaxSpeed(driveMaxSpeed);
  return forwardSpeed > Vmax * DRIVE_ANIM_RUN_FACTOR;
}

/**
 * Playback rate ≈ speed * animLen / animDist (DriveAnimationUpdate).
 * animLenSec from model; animDist from appearance driveanimwalk/run.
 */
export function driveAnimPlaybackRate(
  speed: number,
  animDist: number,
  animLenSec: number
): number {
  if(!(animDist > 0) || !(animLenSec > 0)) return 1;
  return speed / (animDist / animLenSec);
}

/** Pack discrete ActionDrive flags from float axes (for server replication). */
export function packDriveFlagsFromAxes(
  axisForward: number,
  axisRight: number,
  walking: boolean,
  yawLeft: boolean,
  yawRight: boolean
): number {
  let flags = 0;
  const dead = 0.2;
  const runGate = 0.7;
  if(axisForward > dead){
    flags |= walking || axisForward < runGate ? 0x01 : 0x03;
  }else if(axisForward < -dead){
    flags |= 0x02;
  }
  if(axisRight < -dead) flags |= 0x04;
  else if(axisRight > dead) flags |= 0x08;
  if(yawLeft) flags |= 0x10;
  if(yawRight) flags |= 0x20;
  return flags;
}

export const PLAYER_DEFAULT_DRIVE_ACCL = DEFAULT_DRIVE_ACCL;
export const PLAYER_DEFAULT_DRIVE_MAX = DEFAULT_DRIVE_MAX_SPEED;
