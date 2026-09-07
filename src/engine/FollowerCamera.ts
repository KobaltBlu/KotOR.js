import * as THREE from "three";
import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ClientCameraMode } from "@/enums/engine/ClientCameraMode";
import { Utility } from "@/utility/Utility";
import type { ModuleArea, ModuleMGPlayer, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ResolutionManager } from "@/managers/ResolutionManager";
import { Mouse } from "@/controls/Mouse";

const HALF_PI = Math.PI / 2;
const EASE_THRESHOLD = Math.PI / 2;
const FOCUS_DEAD_ZONE = 0.16;

/** ChangeLocation flags — SendServerToPlayerCamera_ChangeLocation */
export const CAMERA_LOC_FLAG_FACING = 0x01;
export const CAMERA_LOC_FLAG_PITCH = 0x02;
export const CAMERA_LOC_FLAG_DISTANCE = 0x04;
export const CAMERA_LOC_FLAG_TRANSITION = 0x08;

/**
 * FollowerCamera class.
 *
 * Client chase camera — OnAStick chase (Control, SetCameraStyle,
 * HitCheckCamera) plus death-camera blends.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file FollowerCamera.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FollowerCamera {

  static DEBUG_OFFSET = 0;

  static DEFAULT_FOV = 55;

  /** SetCameraStyle fallbacks when camerastyle.2da is missing */
  static readonly DEFAULT_STYLE_DISTANCE = 6.25;
  static readonly DEFAULT_STYLE_SPEED = 20.0;
  static readonly DEFAULT_STYLE_PITCH_DEG = 80.0;
  static readonly DEFAULT_STYLE_HEIGHT = 3.5;

  /** cameraPersonalSpace global */
  static readonly DEFAULT_CAMERA_PERSONAL_SPACE = 0.35;
  /** HitCheckCamera pad (cameraPersonalSpace + 0.15) */
  static readonly CAMERA_HIT_PAD = 0.15;
  /**
   * cameraInterpDistAmt — new camera position
   * blends current XY cam distance toward style dist each tick.
   */
  static readonly CAMERA_INTERP_DIST_AMT = 0.5;
  /**
   * Control_AccelerateInterp — rate clamp / accelerate when
   * desired↔current position sep² crosses 1.0 (used for soft yaw catch-up).
   */
  static readonly CAMERA_INTERP_AMT_MIN = 2.5;
  static readonly CAMERA_INTERP_AMT_MAX = 7.5;
  static readonly CAMERA_INTERP_ACCEL = 3.0;
  static readonly CAMERA_INTERP_DECEL = 5.0;

  /**
   * UpdateCameraModeChaseCam / BG / EQ defaults (UpdateCameraFollow).
   * Applied when SetCameraMode switches away from OnAStick.
   */
  static readonly CHASE_MIN_DIST = 5.0;
  static readonly CHASE_MAX_DIST = 20.0;
  static readonly CHASE_MAX_PITCH_DEG = 50.0;
  static readonly STIFF_DIST = 6.0;
  static readonly STIFF_MAX_PITCH_DEG = 62.0;
  static readonly CHASE_YAW_SOFT = 2.0;
  static readonly STIFF_YAW_MULT = 5.0;
  /** camerastyle.2da row used by combat camera ctor */
  static readonly COMBAT_STYLE_ROW = 8;
  /** Navigate default move rates (Message turn/tilt/speed/strafe consumed per frame) */
  static readonly NAVIGATE_MOVE_SPEED = 8.0;
  static readonly NAVIGATE_TURN_SPEED = 1.5;
  static readonly NAVIGATE_TILT_SPEED = 1.2;

  /** Ini defaults matching swkotor.ini Game Options */
  static readonly DEFAULT_KEYBOARD_DPS = 200.0;
  static readonly DEFAULT_KEYBOARD_ACCEL = 500.0;
  static readonly DEFAULT_KEYBOARD_DECEL = 2000.0;

  /** camerastyle.2da DEFAULT MinTurnRate / MaxTurnRate (deg/sec) */
  static readonly DEFAULT_MIN_TURN_RATE_DEG = 150;
  static readonly DEFAULT_MAX_TURN_RATE_DEG = 1500;

  static camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera( 55, ResolutionManager.getViewportWidth() / ResolutionManager.getViewportHeight(), 0.01, 15000 );
  static box: THREE.Box3 = new THREE.Box3();

  static turning: boolean = false;

  static facing: number = 0;
  static dir: number = 0;
  static maxDistance: number = FollowerCamera.DEFAULT_STYLE_DISTANCE;
  static distance: number = FollowerCamera.DEFAULT_STYLE_DISTANCE;

  // camerastyle.2da
  static pitch: number = 0;
  /** Style pitch at last SetCameraStyle — mouse tilt clamps around this. */
  static stylePitch: number = 0;
  static height: number = FollowerCamera.DEFAULT_STYLE_HEIGHT;
  static fov: number = 55;
  static styleSpeed: number = FollowerCamera.DEFAULT_STYLE_SPEED;
  static tiltUp: number = 30;
  static tiltDown: number = 30;
  static tiltSpeed: number = 0;
  static rotation: number = 90;
  /**
   * Browser pixels ≈ full DirectInput unit for UpdateCamera mouse deltas
   * (GetMouseDelta clamps raw DI to [-1,1] before × GetMouseSenSetting).
   */
  static readonly MOUSE_DELTA_NORMALIZE_PX = 25;
  /** Cached from camerastyle MinTurnRate / MaxTurnRate for CamRelative Control */
  static minTurnRateDeg: number = FollowerCamera.DEFAULT_MIN_TURN_RATE_DEG;
  static maxTurnRateDeg: number = FollowerCamera.DEFAULT_MAX_TURN_RATE_DEG;

  /**
   * freelook camera style columns (UpdateCamraStyle).
   * Defaults when 2DA missing: rotate/tilt 60°.
   */
  static flTiltSpeed: number = 60;
  static flRotateSpeed: number = 60;
  static flLookUp: number = 60;
  static flLookDown: number = 60;
  static freeLookPitchDeg: number = 0;
  static freeLookYawDeg: number = 0;
  /** Axis inputs (−1…1) consumed each FreeLook frame */
  static freeLookPitchAxis: number = 0;
  static freeLookYawAxis: number = 0;
  static freeLookActive: boolean = false;

  /** Keyboard turn rate state — RK4 acceleration / Keyboard Camera DPS path */
  static speed: number = 0;
  static maxSpeed: number = THREE.MathUtils.degToRad(FollowerCamera.DEFAULT_KEYBOARD_DPS);
  static minSpeed: number = 0;
  static accelRad: number = THREE.MathUtils.degToRad(FollowerCamera.DEFAULT_KEYBOARD_ACCEL);
  static decelRad: number = THREE.MathUtils.degToRad(FollowerCamera.DEFAULT_KEYBOARD_DECEL);

  static cameraStyle: any = {};

  static focusObject: ModuleObject | undefined = undefined;
  static focusTurnSpeed: number = 6.0;

  /**
   * SendServerToPlayerCamera_ChangeLocation client transition.
   * Flags select facing/pitch/distance; transitionType 0 = SNAP; else CAMERA_TRANSITION_TYPE_* (2…100).
   */
  static locationTransitionActive = false;
  static locationTransitionSpeed = 0;
  static locationTargetFacing = 0;
  static locationTargetPitch = 0;
  static locationTargetDistance = 0;
  static locationHasFacing = false;
  static locationHasPitch = false;
  static locationHasDistance = false;

  /**
   * death camera — set when party wipe starts.
   * ctor: speed_yaw 30°/s, desired_pitch 90°, distance 3,
   * height 0.75→0, log_pitch/height 0.01, log_distance 0.5, log_yaw 0.5.
   */
  static deathCamActive = false;
  static deathYaw = 0;
  static deathPitch = 0;
  static deathDistance = 3;
  static deathHeight = 0.75;
  static readonly DEATH_SPEED_YAW_DEG = 30.0;
  static readonly DEATH_DESIRED_PITCH_DEG = 90.0;
  static readonly DEATH_DESIRED_DISTANCE = 3.0;
  static readonly DEATH_DESIRED_HEIGHT = 0.0;
  static readonly DEATH_LOG_YAW = 0.5;
  static readonly DEATH_LOG_PITCH = 0.01;
  static readonly DEATH_LOG_DISTANCE = 0.5;
  static readonly DEATH_LOG_HEIGHT = 0.01;

  static raycaster: THREE.Raycaster = new THREE.Raycaster();
  static tmpOrigin: THREE.Vector3 = new THREE.Vector3();
  static tmpDesiredCam: THREE.Vector3 = new THREE.Vector3();
  static tmpSafeCam: THREE.Vector3 = new THREE.Vector3();
  static tmpHookPos: THREE.Vector3 = new THREE.Vector3();
  static tmpHookQuat: THREE.Quaternion = new THREE.Quaternion();
  static tmpEuler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YZX');
  static tmpForward: THREE.Vector3 = new THREE.Vector3();

  /**
   * Soft yaw catch-up rate — Control_AccelerateInterp.
   * Clamped [CAMERA_INTERP_AMT_MIN, CAMERA_INTERP_AMT_MAX].
   */
  static positionInterpRate = 2.5;

  /** Last mode seen — triggers ChaseCam/BG/EQ param apply on change */
  static lastAppliedCameraMode = -1;

  /**
   * SetCombatCamera / RestoreCamera — enter mode 6 from party combat,
   * restore prior mode when combat clears (client SetCombatMode).
   */
  static combatCameraActive = false;
  static preCombatCameraMode = ClientCameraMode.ON_A_STICK;
  static savedAreaCameraStyle: any = undefined;
  /**
   * Player orbit offset around the combat look axis
   * (CalculateDesiredLocation keyboard RK4).
   */
  static combatOrbitOffset = 0;
  /** Last combat look-target id — reset orbit when the lock changes. */
  static combatLookTargetId: number = -1;

  /**
   * navigate camera — free-fly state (Control).
   * Axes are set by controls and consumed each navigate frame.
   * navigateHoverMode maps to hsMode != 0 (ship-style flight).
   */
  static navigateActive = false;
  static navigateHoverMode = false;
  static navigateTurn = 0;
  static navigateTilt = 0;
  static navigateSpeed = 0;
  static navigateStrafe = 0;
  static navigateRaise = 0;
  static navigateRoll = 0;
  static navigateLastRoll = 0;

  private static parseStyleFloat(value: any, fallback: number): number {
    if(value === undefined || value === null || value === '****') return fallback;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * SetCameraStyle — load camerastyle.2da row columns.
   * DISTANCE, SPEED, PITCH, HEIGHT, TILTUP, TILTDOWN, TILTSPEED, ROTATION, VIEWANGLE.
   */
  static setCameraStyle(cameraStyle: any = {}){
    FollowerCamera.cameraStyle = cameraStyle || {};

    const dist = FollowerCamera.parseStyleFloat(cameraStyle?.distance, FollowerCamera.DEFAULT_STYLE_DISTANCE);
    const speed = FollowerCamera.parseStyleFloat(cameraStyle?.speed, FollowerCamera.DEFAULT_STYLE_SPEED);
    const pitchDeg = FollowerCamera.parseStyleFloat(cameraStyle?.pitch, FollowerCamera.DEFAULT_STYLE_PITCH_DEG);
    const height = FollowerCamera.parseStyleFloat(cameraStyle?.height, FollowerCamera.DEFAULT_STYLE_HEIGHT);
    const tiltUp = FollowerCamera.parseStyleFloat(cameraStyle?.tiltup, 30);
    const tiltDown = FollowerCamera.parseStyleFloat(cameraStyle?.tiltdown, 30);
    const tiltSpeed = FollowerCamera.parseStyleFloat(cameraStyle?.tiltspeed, 0);
    const rotation = FollowerCamera.parseStyleFloat(cameraStyle?.rotation, 90);
    let viewAngle = FollowerCamera.parseStyleFloat(cameraStyle?.viewangle, 0);
    if(viewAngle === 0) viewAngle = FollowerCamera.DEFAULT_FOV;

    // FreeLook columns (FL_TiltSpeed / FL_RotateSpeed / FL_LOOKUP / FL_LOOKDOWN)
    const flTilt = FollowerCamera.parseStyleFloat(
      cameraStyle?.fl_tiltspeed ?? cameraStyle?.FL_TiltSpeed,
      60
    );
    const flRotate = FollowerCamera.parseStyleFloat(
      cameraStyle?.fl_rotatespeed ?? cameraStyle?.FL_RotateSpeed,
      60
    );
    const flLookUp = FollowerCamera.parseStyleFloat(
      cameraStyle?.fl_lookup ?? cameraStyle?.FL_LOOKUP,
      60
    );
    const flLookDown = FollowerCamera.parseStyleFloat(
      cameraStyle?.fl_lookdown ?? cameraStyle?.FL_LOOKDOWN,
      60
    );

    FollowerCamera.distance = FollowerCamera.maxDistance = dist;
    FollowerCamera.styleSpeed = speed;
    FollowerCamera.pitch = THREE.MathUtils.degToRad(pitchDeg);
    FollowerCamera.stylePitch = FollowerCamera.pitch;
    FollowerCamera.height = height;
    FollowerCamera.tiltUp = tiltUp;
    FollowerCamera.tiltDown = tiltDown;
    FollowerCamera.tiltSpeed = tiltSpeed;
    FollowerCamera.rotation = rotation;
    FollowerCamera.flTiltSpeed = flTilt;
    FollowerCamera.flRotateSpeed = flRotate;
    FollowerCamera.flLookUp = flLookUp;
    FollowerCamera.flLookDown = flLookDown;

    // CamRelative Control caches Min/MaxTurnRate (controller Init / SetCameraStyle)
    FollowerCamera.minTurnRateDeg = FollowerCamera.parseStyleFloat(
      cameraStyle?.minturnrate ?? cameraStyle?.MinTurnRate,
      FollowerCamera.DEFAULT_MIN_TURN_RATE_DEG
    );
    FollowerCamera.maxTurnRateDeg = FollowerCamera.parseStyleFloat(
      cameraStyle?.maxturnrate ?? cameraStyle?.MaxTurnRate,
      FollowerCamera.DEFAULT_MAX_TURN_RATE_DEG
    );

    FollowerCamera.refreshKeyboardTurnOptions();
    FollowerCamera.setCameraFOV(viewAngle);
  }

  /**
   * Refresh Keyboard Camera DPS / Acceleration / Deceleration from ini
   * (Control_CheckAndUpdateCameraStyle).
   */
  static refreshKeyboardTurnOptions(){
    const ini = GameState.iniConfig;
    const dps = FollowerCamera.parseStyleFloat(
      ini?.getProperty?.('Game Options.Keyboard Camera DPS'),
      FollowerCamera.DEFAULT_KEYBOARD_DPS
    );
    const accel = FollowerCamera.parseStyleFloat(
      ini?.getProperty?.('Game Options.Keyboard Camera Acceleration'),
      FollowerCamera.DEFAULT_KEYBOARD_ACCEL
    );
    const decel = FollowerCamera.parseStyleFloat(
      ini?.getProperty?.('Game Options.Keyboard Camera Deceleration'),
      FollowerCamera.DEFAULT_KEYBOARD_DECEL
    );

    FollowerCamera.maxSpeed = THREE.MathUtils.degToRad(Math.max(1, dps));
    FollowerCamera.accelRad = THREE.MathUtils.degToRad(Math.max(1, accel));
    FollowerCamera.decelRad = THREE.MathUtils.degToRad(Math.max(1, decel));
  }

  static setCameraFOV(fov: number = 55){
    FollowerCamera.fov = FollowerCamera.camera.fov = fov;
    FollowerCamera.resize();
  }

  /** Enter FreeLook — freelook camera ctor resets look offsets. */
  static beginFreeLook(){
    FollowerCamera.freeLookActive = true;
    FollowerCamera.freeLookPitchDeg = 0;
    FollowerCamera.freeLookYawDeg = 0;
    FollowerCamera.freeLookPitchAxis = 0;
    FollowerCamera.freeLookYawAxis = 0;
    FollowerCamera.clearFocusObject();
  }

  static endFreeLook(){
    FollowerCamera.freeLookActive = false;
    FollowerCamera.freeLookPitchAxis = 0;
    FollowerCamera.freeLookYawAxis = 0;
    // Carry freelook yaw back into chase facing when possible
    FollowerCamera.facing = Utility.NormalizeRadian(
      FollowerCamera.facing + THREE.MathUtils.degToRad(FollowerCamera.freeLookYawDeg)
    );
    FollowerCamera.freeLookYawDeg = 0;
    FollowerCamera.freeLookPitchDeg = 0;
  }

  /**
   * SetCamera — BehaviorAttach live camera to camerahook.
   * Identity local transform; world pose follows the hook (no per-frame copy).
   */
  static mgCameraHookAttached = false;

  static attachMinigameCamera(hook: THREE.Object3D){
    if(!hook){ return; }
    if(FollowerCamera.mgCameraHookAttached && FollowerCamera.camera.parent === hook){
      return;
    }
    FollowerCamera.detachMinigameCamera();
    hook.add(FollowerCamera.camera);
    FollowerCamera.camera.position.set(0, 0, 0);
    FollowerCamera.camera.quaternion.identity();
    FollowerCamera.camera.scale.set(1, 1, 1);
    FollowerCamera.mgCameraHookAttached = true;
  }

  /** Leave MINIGAME / dispose follower — restore free camera in world space. */
  static detachMinigameCamera(){
    const cam = FollowerCamera.camera;
    if(!FollowerCamera.mgCameraHookAttached && !cam.parent){ return; }
    if(cam.parent){
      cam.getWorldPosition(FollowerCamera.tmpHookPos);
      cam.getWorldQuaternion(FollowerCamera.tmpHookQuat);
      cam.removeFromParent();
      cam.position.copy(FollowerCamera.tmpHookPos);
      cam.quaternion.copy(FollowerCamera.tmpHookQuat);
      cam.scale.set(1, 1, 1);
    }
    FollowerCamera.mgCameraHookAttached = false;
  }

  /** Set FreeLook look axes (−1…1) for this frame; consumed in updateFreeLook. */
  static setFreeLookAxes(yawAxis: number = 0, pitchAxis: number = 0){
    if(Math.abs(yawAxis) > Math.abs(FollowerCamera.freeLookYawAxis)){
      FollowerCamera.freeLookYawAxis = yawAxis;
    }
    if(Math.abs(pitchAxis) > Math.abs(FollowerCamera.freeLookPitchAxis)){
      FollowerCamera.freeLookPitchAxis = pitchAxis;
    }
  }

  /**
   * UpdateCamera mouse path while rightClickHeld (or Mouse Look):
   * TurnCamera(dx * GetMouseSenSetting), TiltCamera(dy * GetMouseSenSetting).
   * dx/dy are pixel movement this frame (browser); normalized like DI [-1,1].
   */
  static applyMouseLookDelta(dx: number, dy: number, sensitivityDeg?: number){
    if(!dx && !dy) return;

    const sens = typeof sensitivityDeg === 'number'
      ? sensitivityDeg
      : Mouse.getSensitivityDegrees();
    const norm = FollowerCamera.MOUSE_DELTA_NORMALIZE_PX;
    let nx = dx / norm;
    let ny = dy / norm;
    if(nx > 1) nx = 1;
    else if(nx < -1) nx = -1;
    if(ny > 1) ny = 1;
    else if(ny < -1) ny = -1;

    // Default cameraHorizAxisFlip / cameraVertAxisFlip off → negate for natural look
    FollowerCamera.facing = Utility.NormalizeRadian(
      FollowerCamera.facing + THREE.MathUtils.degToRad(-nx * sens)
    );

    const pitchMin = FollowerCamera.stylePitch
      - THREE.MathUtils.degToRad(Math.max(0, FollowerCamera.tiltDown));
    const pitchMax = FollowerCamera.stylePitch
      + THREE.MathUtils.degToRad(Math.max(0, FollowerCamera.tiltUp));
    let nextPitch = FollowerCamera.pitch + THREE.MathUtils.degToRad(-ny * sens);
    if(nextPitch < pitchMin) nextPitch = pitchMin;
    if(nextPitch > pitchMax) nextPitch = pitchMax;
    // Keep within chase-safe band
    if(nextPitch < 0) nextPitch = 0;
    if(nextPitch > HALF_PI) nextPitch = HALF_PI;
    FollowerCamera.pitch = nextPitch;

    FollowerCamera.clearFocusObject();
  }

  /**
   * Resolve FreeLookHook → CameraHook → root+2 (Control).
   */
  static resolveFreeLookHook(followee: ModuleObject): boolean {
    const model = (followee as any).model;
    if(model?.freelookhook){
      model.freelookhook.getWorldPosition(FollowerCamera.tmpHookPos);
      model.freelookhook.getWorldQuaternion(FollowerCamera.tmpHookQuat);
      return true;
    }
    if(model?.camerahook){
      model.camerahook.getWorldPosition(FollowerCamera.tmpHookPos);
      model.camerahook.getWorldQuaternion(FollowerCamera.tmpHookQuat);
      return true;
    }
    FollowerCamera.tmpHookPos.copy(followee.position);
    FollowerCamera.tmpHookPos.z += 2.0;
    FollowerCamera.tmpHookQuat.identity();
    return false;
  }

  /**
   * Control — attach to FreeLookHook, apply yaw/pitch look limits.
   */
  static updateFreeLook(delta: number = 0){
    const followee = GameState.getCurrentPlayer();
    if(!followee) return;

    const dt = Math.max(0, delta);

    // Axis look (keyboard / stick) — FL_RotateSpeed / FL_TiltSpeed deg/s
    FollowerCamera.freeLookYawDeg +=
      FollowerCamera.freeLookYawAxis * FollowerCamera.flRotateSpeed * dt;
    FollowerCamera.freeLookPitchDeg +=
      FollowerCamera.freeLookPitchAxis * FollowerCamera.flTiltSpeed * dt;

    // Mouse look when cursor is hidden / pointer-driven (HideMouse)
    // Scale by GetMouseSenSetting vs default (~29.8) — was hard-coded 0.15
    const mx = Mouse.MouseX - Mouse.OldMouseX;
    const my = Mouse.MouseY - Mouse.OldMouseY;
    if(mx || my){
      const sensScale = Mouse.getSensitivityDegrees() / 29.8;
      const lookScale = 0.15 * sensScale;
      FollowerCamera.freeLookYawDeg -= mx * lookScale;
      FollowerCamera.freeLookPitchDeg -= my * lookScale;
    }

    // Clamp pitch to FL_LOOKUP / FL_LOOKDOWN
    if(FollowerCamera.freeLookPitchDeg < -FollowerCamera.flLookDown){
      FollowerCamera.freeLookPitchDeg = -FollowerCamera.flLookDown;
    }
    if(FollowerCamera.freeLookPitchDeg > FollowerCamera.flLookUp){
      FollowerCamera.freeLookPitchDeg = FollowerCamera.flLookUp;
    }

    FollowerCamera.resolveFreeLookHook(followee);
    FollowerCamera.camera.position.copy(FollowerCamera.tmpHookPos);

    FollowerCamera.tmpEuler.setFromQuaternion(FollowerCamera.tmpHookQuat, 'YZX');
    FollowerCamera.tmpEuler.x += THREE.MathUtils.degToRad(FollowerCamera.freeLookPitchDeg);
    FollowerCamera.tmpEuler.z += THREE.MathUtils.degToRad(FollowerCamera.freeLookYawDeg);
    FollowerCamera.camera.rotation.order = 'YZX';
    FollowerCamera.camera.rotation.copy(FollowerCamera.tmpEuler);

    // Keep chase facing in sync for exit / movement relative to look
    FollowerCamera.tmpForward.set(0, 1, 0).applyQuaternion(FollowerCamera.camera.quaternion);
    FollowerCamera.facing = Utility.NormalizeRadian(
      Math.atan2(FollowerCamera.tmpForward.y, FollowerCamera.tmpForward.x)
    );

    FollowerCamera.freeLookPitchAxis = 0;
    FollowerCamera.freeLookYawAxis = 0;
    FollowerCamera.camera.updateProjectionMatrix();
  }

  /** Begin death camera aimed at the fallen party member. */
  static beginDeathCamera(target?: ModuleObject){
    FollowerCamera.deathCamActive = true;
    FollowerCamera.focusObject = target;
    FollowerCamera.deathYaw = THREE.MathUtils.radToDeg(FollowerCamera.facing);
    FollowerCamera.deathPitch = THREE.MathUtils.radToDeg(FollowerCamera.pitch);
    FollowerCamera.deathDistance = Math.max(FollowerCamera.distance, 1.5);
    FollowerCamera.deathHeight = 0.75;
  }

  static endDeathCamera(){
    FollowerCamera.deathCamActive = false;
    FollowerCamera.focusObject = undefined;
  }

  /**
   * Apply camera ChangeLocation (CAMERA msg subtype 1).
   * Payload: flags + up to 3 floats (facing/pitch/distance) + optional transition byte.
   * Floats of -1 mean "keep current".
   * @param transitionType 0 = snap; else lerp speed (CAMERA_TRANSITION_TYPE_*)
   */
  static changeLocation(options: {
    facingDeg?: number;
    pitchDeg?: number;
    distance?: number;
    transitionType?: number;
    flags?: number;
  } = {}){
    const transitionType = options.transitionType ?? 0;
    const flags = options.flags ?? (
      (typeof options.facingDeg === 'number' && options.facingDeg !== -1 ? CAMERA_LOC_FLAG_FACING : 0) |
      (typeof options.pitchDeg === 'number' && options.pitchDeg !== -1 ? CAMERA_LOC_FLAG_PITCH : 0) |
      (typeof options.distance === 'number' && options.distance !== -1 && options.distance > 0 ? CAMERA_LOC_FLAG_DISTANCE : 0) |
      (transitionType > 0 ? CAMERA_LOC_FLAG_TRANSITION : 0)
    );

    const applyFacing = (flags & CAMERA_LOC_FLAG_FACING) !== 0 &&
      typeof options.facingDeg === 'number' && options.facingDeg !== -1;
    const applyPitch = (flags & CAMERA_LOC_FLAG_PITCH) !== 0 &&
      typeof options.pitchDeg === 'number' && options.pitchDeg !== -1;
    const applyDistance = (flags & CAMERA_LOC_FLAG_DISTANCE) !== 0 &&
      typeof options.distance === 'number' && options.distance !== -1 && options.distance > 0;

    const targetFacing = applyFacing
      ? THREE.MathUtils.degToRad(options.facingDeg as number)
      : FollowerCamera.facing;
    const targetPitch = applyPitch
      ? THREE.MathUtils.degToRad(options.pitchDeg as number)
      : FollowerCamera.pitch;
    const targetDistance = applyDistance
      ? (options.distance as number)
      : FollowerCamera.maxDistance;

    const useTransition = (flags & CAMERA_LOC_FLAG_TRANSITION) !== 0 && transitionType > 0;

    if(!useTransition){
      FollowerCamera.locationTransitionActive = false;
      if(applyFacing) FollowerCamera.facing = Utility.NormalizeRadian(targetFacing);
      if(applyPitch) FollowerCamera.pitch = targetPitch;
      if(applyDistance){
        FollowerCamera.distance = targetDistance;
        FollowerCamera.maxDistance = targetDistance;
      }
      return;
    }

    FollowerCamera.locationHasFacing = applyFacing;
    FollowerCamera.locationHasPitch = applyPitch;
    FollowerCamera.locationHasDistance = applyDistance;
    FollowerCamera.locationTargetFacing = Utility.NormalizeRadian(targetFacing);
    FollowerCamera.locationTargetPitch = targetPitch;
    FollowerCamera.locationTargetDistance = targetDistance;
    // speeds: CRAWL=2 … VERY_FAST=100 — approach rate scale
    FollowerCamera.locationTransitionSpeed = Math.max(1, transitionType);
    FollowerCamera.locationTransitionActive = true;
  }

  static updateLocationTransition(delta: number = 0){
    if(!FollowerCamera.locationTransitionActive) return;

    const dt = Math.max(0, delta);
    // Map transition speed → exponential rate (100 ≈ ~3/s settle, 2 ≈ crawl)
    const rate = (FollowerCamera.locationTransitionSpeed / 100) * 3.0;
    const t = 1 - Math.exp(-rate * dt);
    let settled = true;

    if(FollowerCamera.locationHasFacing){
      let diff = FollowerCamera.locationTargetFacing - FollowerCamera.facing;
      diff = ((diff + Math.PI) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
      if(Math.abs(diff) > 0.001){
        FollowerCamera.facing = Utility.NormalizeRadian(FollowerCamera.facing + diff * t);
        settled = false;
      }else{
        FollowerCamera.facing = FollowerCamera.locationTargetFacing;
      }
    }

    if(FollowerCamera.locationHasPitch){
      const d = FollowerCamera.locationTargetPitch - FollowerCamera.pitch;
      if(Math.abs(d) > 0.001){
        FollowerCamera.pitch += d * t;
        settled = false;
      }else{
        FollowerCamera.pitch = FollowerCamera.locationTargetPitch;
      }
    }

    if(FollowerCamera.locationHasDistance){
      const d = FollowerCamera.locationTargetDistance - FollowerCamera.maxDistance;
      if(Math.abs(d) > 0.01){
        FollowerCamera.maxDistance += d * t;
        FollowerCamera.distance = FollowerCamera.maxDistance;
        settled = false;
      }else{
        FollowerCamera.maxDistance = FollowerCamera.locationTargetDistance;
        FollowerCamera.distance = FollowerCamera.locationTargetDistance;
      }
    }

    if(settled){
      FollowerCamera.locationTransitionActive = false;
    }
  }

  /**
   * Control — per-frame multiplicative blends + yaw orbit.
   */
  static updateDeathCamera(delta: number = 0){
    const target = FollowerCamera.focusObject;
    if(!target || target.destroyed){
      FollowerCamera.endDeathCamera();
      return;
    }

    const dt = Math.max(0, delta);

    // height = (desired - height) * log_height + height (per-frame, no delta)
    FollowerCamera.deathHeight =
      (FollowerCamera.DEATH_DESIRED_HEIGHT - FollowerCamera.deathHeight) * FollowerCamera.DEATH_LOG_HEIGHT +
      FollowerCamera.deathHeight;

    // yaw orbit in degrees (speed_yaw * deltaT)
    let yawDeg = FollowerCamera.deathYaw + FollowerCamera.DEATH_SPEED_YAW_DEG * dt;
    if(yawDeg < 0) yawDeg += 360;
    else if(yawDeg >= 360) yawDeg -= 360;
    FollowerCamera.deathYaw = yawDeg;

    // pitch blend toward desired (uses 90 - desired_pitch offset; desired=90 → level)
    const desiredPitchDeg = 90.0 - FollowerCamera.DEATH_DESIRED_PITCH_DEG;
    FollowerCamera.deathPitch =
      (desiredPitchDeg - FollowerCamera.deathPitch) * FollowerCamera.DEATH_LOG_PITCH +
      FollowerCamera.deathPitch;

    const headZ = (typeof (target as any).getCameraHeight === 'function')
      ? (target as any).getCameraHeight()
      : 1.5;
    const targetPos = target.position;

    // Distance blend from current camera-to-target magnitude toward desired_distance
    const curDx = FollowerCamera.camera.position.x - targetPos.x;
    const curDy = FollowerCamera.camera.position.y - targetPos.y;
    const curDz = FollowerCamera.camera.position.z - (targetPos.z + headZ);
    const curMag = Math.sqrt(curDx * curDx + curDy * curDy + curDz * curDz) || FollowerCamera.deathDistance;
    FollowerCamera.deathDistance =
      (FollowerCamera.DEATH_DESIRED_DISTANCE - curMag) * FollowerCamera.DEATH_LOG_DISTANCE + curMag;

    const yawRad = THREE.MathUtils.degToRad(FollowerCamera.deathYaw);
    const pitchRad = THREE.MathUtils.degToRad(FollowerCamera.deathPitch);
    const distance = FollowerCamera.deathDistance;
    const camZ = targetPos.z + headZ + FollowerCamera.deathHeight;

    FollowerCamera.camera.position.set(
      targetPos.x + distance * Math.cos(yawRad),
      targetPos.y + distance * Math.sin(yawRad),
      camZ
    );

    FollowerCamera.facing = yawRad;
    FollowerCamera.pitch = pitchRad;
    FollowerCamera.distance = distance;

    FollowerCamera.camera.rotation.order = 'YZX';
    FollowerCamera.camera.rotation.set(pitchRad, 0, yawRad + HALF_PI);
    FollowerCamera.camera.updateProjectionMatrix();
  }

  /** GetTargetHeadPosition — model camerahook / 1.5 fallback + appearance offset. */
  static getFolloweeHeadHeight(followee: ModuleObject): number {
    let head = 1.5 + FollowerCamera.DEBUG_OFFSET;
    if(typeof (followee as any).getCameraHeight === 'function'){
      head = (followee as any).getCameraHeight() + FollowerCamera.DEBUG_OFFSET;
    }

    if(GameState.Mode == EngineMode.MINIGAME){
      return head;
    }

    const appearance = (followee as any).creatureAppearance;
    if(appearance && (appearance.cameraheightoffset > 0 || appearance.cameraheightoffset < 0)){
      head -= appearance.cameraheightoffset;
    }
    return head;
  }

  static getCameraPersonalSpace(followee: ModuleObject): number {
    const appearance = (followee as any).creatureAppearance;
    if(appearance && typeof appearance.cameraspace === 'number' && appearance.cameraspace > 0){
      return appearance.cameraspace;
    }
    return FollowerCamera.DEFAULT_CAMERA_PERSONAL_SPACE;
  }

  /** Camera yaw that places the chase cam behind the creature (ModuleArea spawn). */
  static behindFacing(followee: ModuleObject): number {
    const facing = typeof (followee as any).getFacing === 'function'
      ? (followee as any).getFacing()
      : (followee as any).rotation?.z ?? 0;
    return Utility.NormalizeRadian(facing - HALF_PI);
  }

  static shortestAngleDiff(from: number, to: number): number {
    let diff = to - from;
    diff = ((diff + Math.PI) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
    return diff;
  }

  /**
   * UpdateCameraModeChaseCam / BG / EQ / Combat — apply distance/pitch when mode changes.
   */
  static applyCameraModeStyle(mode: number){
    if(mode === FollowerCamera.lastAppliedCameraMode) return;
    FollowerCamera.lastAppliedCameraMode = mode;

    if(mode === ClientCameraMode.CHASE || mode === ClientCameraMode.TOP_DOWN){
      FollowerCamera.maxDistance = Math.max(
        FollowerCamera.CHASE_MIN_DIST,
        Math.min(FollowerCamera.CHASE_MAX_DIST, FollowerCamera.maxDistance)
      );
      FollowerCamera.distance = Math.min(FollowerCamera.distance, FollowerCamera.maxDistance);
      const pitchCap = THREE.MathUtils.degToRad(FollowerCamera.CHASE_MAX_PITCH_DEG);
      if(FollowerCamera.pitch > pitchCap) FollowerCamera.pitch = pitchCap;
      if(mode === ClientCameraMode.TOP_DOWN){
        FollowerCamera.pitch = pitchCap;
      }
    }else if(mode === ClientCameraMode.STIFF_CHASE){
      FollowerCamera.maxDistance = FollowerCamera.STIFF_DIST;
      FollowerCamera.distance = FollowerCamera.STIFF_DIST;
      const pitchCap = THREE.MathUtils.degToRad(FollowerCamera.STIFF_MAX_PITCH_DEG);
      if(FollowerCamera.pitch > pitchCap) FollowerCamera.pitch = pitchCap;
    }else if(mode === ClientCameraMode.COMBAT){
      FollowerCamera.applyCombatStyleRow();
    }else if(mode === ClientCameraMode.ON_A_STICK){
      const dist = FollowerCamera.parseStyleFloat(
        FollowerCamera.cameraStyle?.distance,
        FollowerCamera.DEFAULT_STYLE_DISTANCE
      );
      FollowerCamera.maxDistance = dist;
    }else if(mode === ClientCameraMode.NAVIGATE){
      FollowerCamera.beginNavigate(FollowerCamera.navigateHoverMode);
    }

    if(mode !== ClientCameraMode.NAVIGATE && FollowerCamera.navigateActive){
      FollowerCamera.navigateActive = false;
      FollowerCamera.navigateHoverMode = false;
    }
  }

  /** Load camerastyle.2da row 8 — combat camera ctor. */
  static applyCombatStyleRow(){
    const table = GameState.TwoDAManager?.datatables?.get('camerastyle');
    const row = table?.rows?.[FollowerCamera.COMBAT_STYLE_ROW]
      ?? table?.rows?.[8]
      ?? FollowerCamera.cameraStyle
      ?? {};
    FollowerCamera.savedAreaCameraStyle = FollowerCamera.cameraStyle;
    FollowerCamera.setCameraStyle(row);
  }

  /**
   * Client SetCombatMode → SetCombatCamera / RestoreCamera.
   * Only auto-switches from OnAStick so scripted FreeLook/Navigate stay intact.
   */
  static setCombatCameraActive(active: boolean){
    if(active){
      if(FollowerCamera.combatCameraActive) return;
      const mode = GameState.clientCameraMode | 0;
      // SetCombatCamera only swaps when already OnAStick (mode 3).
      if(mode !== ClientCameraMode.ON_A_STICK){
        return;
      }
      FollowerCamera.preCombatCameraMode = mode;
      FollowerCamera.combatCameraActive = true;
      FollowerCamera.combatOrbitOffset = 0;
      FollowerCamera.combatLookTargetId = -1;
      // Keep current facing — updateCombatCameraYaw soft-approaches the combat axis
      // (follow→combat lerp). AccelerateInterp will ramp rate from position sep.
      GameState.clientCameraMode = ClientCameraMode.COMBAT;
      FollowerCamera.lastAppliedCameraMode = -1;
      FollowerCamera.applyCameraModeStyle(ClientCameraMode.COMBAT);
      return;
    }

    if(!FollowerCamera.combatCameraActive) return;
    FollowerCamera.combatCameraActive = false;
    FollowerCamera.combatOrbitOffset = 0;
    FollowerCamera.combatLookTargetId = -1;
    if((GameState.clientCameraMode | 0) === ClientCameraMode.COMBAT){
      GameState.clientCameraMode = FollowerCamera.preCombatCameraMode;
      FollowerCamera.lastAppliedCameraMode = -1;
      if(FollowerCamera.savedAreaCameraStyle){
        FollowerCamera.setCameraStyle(FollowerCamera.savedAreaCameraStyle);
        FollowerCamera.savedAreaCameraStyle = undefined;
      }
      FollowerCamera.applyCameraModeStyle(GameState.clientCameraMode | 0);
    }
  }

  /**
   * Combat look target — Control uses GetLastTarget only.
   * Cursor hover must not steal the lock (that blocked free orbit).
   */
  static getCombatLookTarget(followee: ModuleObject): ModuleObject | undefined {
    if(FollowerCamera.focusObject && !FollowerCamera.focusObject.destroyed){
      return FollowerCamera.focusObject;
    }
    const attack = (followee as any).combatData?.lastAttackTarget
      ?? (followee as any).combatData?.lastAttemptedAttackTarget;
    if(attack && attack !== followee && !attack.destroyed){
      return attack;
    }
    return undefined;
  }

  /**
   * Control
   * desired yaw from PC↔target axis, player keyboard orbit via RK4 accel
   * (CalculateDesiredLocation).
   *
   * GetNextYaw returns desired yaw; GetNextPosition only
   * soft-steps when duration > 0, but shipped GetNextYaw always writes 0 — so
   * snaps position every tick. Soft-approach yaw with AccelerateInterp
   * rate (ChaseCam-style) for follow→combat / retarget; keep position snapped.
   */
  static updateCombatCameraYaw(followee: ModuleObject, delta: number){
    const target = FollowerCamera.getCombatLookTarget(followee);
    if(!target || target === followee){
      // No GetLastTarget — leave facing to player input (Control falls back to PC
      // but still processes keyboard orbit; do not force behindFacing).
      FollowerCamera.combatLookTargetId = -1;
      return;
    }

    const targetId = (target as any).id ?? -1;
    if(targetId !== FollowerCamera.combatLookTargetId){
      FollowerCamera.combatLookTargetId = targetId;
      FollowerCamera.combatOrbitOffset = 0;
    }

    const dx = target.position.x - followee.position.x;
    const dy = target.position.y - followee.position.y;
    // PutAtDesiredLocation / CalculateDesiredLocation axis behind PC
    const axisYaw = Utility.NormalizeRadian(Math.atan2(dy, dx) + Math.PI);

    // Player keyboard/stick yaw this frame was already applied to facing.
    // Fold that motion into the combat orbit offset, then re-anchor on the axis.
    if(FollowerCamera.speed > 0){
      FollowerCamera.combatOrbitOffset = FollowerCamera.shortestAngleDiff(
        axisYaw,
        FollowerCamera.facing
      );
      FollowerCamera.facing = Utility.NormalizeRadian(
        axisYaw + FollowerCamera.combatOrbitOffset
      );
      return;
    }

    const desired = Utility.NormalizeRadian(
      axisYaw + FollowerCamera.combatOrbitOffset
    );
    let diff = FollowerCamera.shortestAngleDiff(FollowerCamera.facing, desired);
    if(Math.abs(diff) <= THREE.MathUtils.degToRad(1)){
      FollowerCamera.facing = desired;
      return;
    }

    const rate = FollowerCamera.positionInterpRate;
    const step = diff * rate * delta;
    if(Math.abs(step) >= Math.abs(diff)){
      FollowerCamera.facing = desired;
    }else{
      FollowerCamera.facing = Utility.NormalizeRadian(FollowerCamera.facing + step);
    }
  }

  /**
   * Combat desired camera distance along PutAtDesiredLocation axis.
   * DetermineSafePosition ≈ hitCheckDistance from head+height origin.
   */
  static getCombatDesiredDistance(
    area: ModuleArea,
    followee: ModuleObject,
    origin: THREE.Vector3
  ): number {
    let distance = FollowerCamera.maxDistance * GameState.CameraDebugZoom;
    return FollowerCamera.hitCheckDistance(area, followee, origin, distance);
  }

  static beginNavigate(hoverMode = false){
    if(FollowerCamera.navigateActive){
      if(hoverMode) FollowerCamera.navigateHoverMode = true;
      return;
    }
    FollowerCamera.navigateActive = true;
    FollowerCamera.navigateHoverMode = hoverMode;
    FollowerCamera.navigateTurn = 0;
    FollowerCamera.navigateTilt = 0;
    FollowerCamera.navigateSpeed = 0;
    FollowerCamera.navigateStrafe = 0;
    FollowerCamera.navigateRaise = 0;
    FollowerCamera.navigateRoll = 0;
    FollowerCamera.navigateLastRoll = 0;
  }

  /** Enter Navigate with hsMode!=0 ship flight (freelook cheat path). */
  static beginNavigateHover(){
    GameState.clientCameraMode = ClientCameraMode.NAVIGATE;
    FollowerCamera.lastAppliedCameraMode = -1;
    FollowerCamera.beginNavigate(true);
  }

  /** Axis inputs for Navigate Message turn/tilt/speed/strafe/raise (held keys overwrite). */
  static setNavigateAxes(turn?: number, tilt?: number, speed?: number, strafe?: number, raise?: number){
    if(turn !== undefined) FollowerCamera.navigateTurn = turn;
    if(tilt !== undefined) FollowerCamera.navigateTilt = tilt;
    if(speed !== undefined) FollowerCamera.navigateSpeed = speed;
    if(strafe !== undefined) FollowerCamera.navigateStrafe = strafe;
    if(raise !== undefined) FollowerCamera.navigateRaise = raise;
  }

  /**
   * Control.
   * hsMode==0: simple yaw/pitch + move. hsMode!=0: scaled ship flight + roll blend.
   */
  static updateNavigate(delta: number){
    FollowerCamera.beginNavigate(FollowerCamera.navigateHoverMode);

    if(FollowerCamera.navigateHoverMode){
      FollowerCamera.updateNavigateHover(delta);
      return;
    }

    const turn = FollowerCamera.navigateTurn * FollowerCamera.NAVIGATE_TURN_SPEED;
    const tilt = FollowerCamera.navigateTilt * FollowerCamera.NAVIGATE_TILT_SPEED;
    FollowerCamera.facing = Utility.NormalizeRadian(FollowerCamera.facing + turn * delta);
    FollowerCamera.pitch = Math.max(
      0,
      Math.min(HALF_PI, FollowerCamera.pitch + tilt * delta)
    );

    const move = FollowerCamera.NAVIGATE_MOVE_SPEED * delta;
    const yaw = FollowerCamera.facing + HALF_PI;
    const forwardX = Math.cos(yaw);
    const forwardY = Math.sin(yaw);
    const rightX = Math.cos(yaw - HALF_PI);
    const rightY = Math.sin(yaw - HALF_PI);

    FollowerCamera.camera.position.x +=
      forwardX * FollowerCamera.navigateSpeed * move
      + rightX * FollowerCamera.navigateStrafe * move;
    FollowerCamera.camera.position.y +=
      forwardY * FollowerCamera.navigateSpeed * move
      + rightY * FollowerCamera.navigateStrafe * move;
    FollowerCamera.camera.position.z += FollowerCamera.navigateRaise * move;

    FollowerCamera.camera.rotation.order = 'YZX';
    FollowerCamera.camera.rotation.set(FollowerCamera.pitch, 0, FollowerCamera.facing + HALF_PI);
    FollowerCamera.camera.updateProjectionMatrix();

    FollowerCamera.clearNavigateAxes();
  }

  /**
   * Navigate Control hsMode!=0 — input scales 5/3/3.33/2.67, roll blend, −speed forward.
   */
  static updateNavigateHover(delta: number){
    let turn = FollowerCamera.navigateTurn * 2.67;
    let tilt = FollowerCamera.navigateTilt * 3.33;
    let speed = FollowerCamera.navigateSpeed * 5.0;
    let strafe = FollowerCamera.navigateStrafe * 3.0;
    const raise = FollowerCamera.navigateRaise;

    FollowerCamera.facing = Utility.NormalizeRadian(
      FollowerCamera.facing + turn * FollowerCamera.NAVIGATE_TURN_SPEED * delta
    );

    // Roll blend: (2Δ+0.033)*roll + (0.967−2Δ)*lastRoll — use strafe as roll input
    const rollIn = strafe * 0.35;
    const roll = (delta + delta + 0.033) * rollIn
      + (0.967 - (delta + delta)) * FollowerCamera.navigateLastRoll;
    FollowerCamera.navigateRoll = roll;
    FollowerCamera.navigateLastRoll = roll;

    const pitchDelta = tilt * FollowerCamera.NAVIGATE_TILT_SPEED * delta;
    let nextPitch = FollowerCamera.pitch - pitchDelta;
    if(nextPitch > -HALF_PI && nextPitch < HALF_PI){
      FollowerCamera.pitch = nextPitch;
    }

    const move = FollowerCamera.NAVIGATE_MOVE_SPEED * delta;
    const yaw = FollowerCamera.facing + HALF_PI;
    const pitch = FollowerCamera.pitch;
    // Local forward includes pitch (look direction); −speed on local Y after −90° pitch trick
    const forwardX = Math.cos(yaw) * Math.cos(pitch);
    const forwardY = Math.sin(yaw) * Math.cos(pitch);
    const forwardZ = Math.sin(pitch);
    const rightX = Math.cos(yaw - HALF_PI);
    const rightY = Math.sin(yaw - HALF_PI);

    FollowerCamera.camera.position.x +=
      forwardX * (-speed) * move + rightX * strafe * move;
    FollowerCamera.camera.position.y +=
      forwardY * (-speed) * move + rightY * strafe * move;
    FollowerCamera.camera.position.z +=
      forwardZ * (-speed) * move + raise * move;

    FollowerCamera.camera.rotation.order = 'YZX';
    FollowerCamera.camera.rotation.set(
      FollowerCamera.pitch,
      roll,
      FollowerCamera.facing + HALF_PI
    );
    FollowerCamera.camera.updateProjectionMatrix();

    FollowerCamera.clearNavigateAxes();
  }

  static clearNavigateAxes(){
    FollowerCamera.navigateTurn = 0;
    FollowerCamera.navigateTilt = 0;
    FollowerCamera.navigateSpeed = 0;
    FollowerCamera.navigateStrafe = 0;
    FollowerCamera.navigateRaise = 0;
  }

  /**
   * Mode 0/2 yaw follow (ChaseCam soft / EQ stiff).
   * Modes 1/3 leave yaw to player; mode 6 uses updateCombatCameraYaw.
   */
  static updateCameraModeYaw(followee: ModuleObject, delta: number){
    const mode = GameState.clientCameraMode | 0;
    FollowerCamera.applyCameraModeStyle(mode);

    if(mode === ClientCameraMode.TOP_DOWN || mode === ClientCameraMode.ON_A_STICK
      || mode === ClientCameraMode.COMBAT || mode === ClientCameraMode.NAVIGATE){
      return;
    }

    if(mode === ClientCameraMode.CHASE || mode === ClientCameraMode.STIFF_CHASE){
      const desired = FollowerCamera.behindFacing(followee);
      let diff = FollowerCamera.shortestAngleDiff(FollowerCamera.facing, desired);
      if(mode === ClientCameraMode.CHASE){
        if(diff > HALF_PI) diff = HALF_PI;
        if(diff < -HALF_PI) diff = -HALF_PI;
      }
      if(Math.abs(diff) <= THREE.MathUtils.degToRad(1)) return;

      const rate = mode === ClientCameraMode.STIFF_CHASE
        ? FollowerCamera.STIFF_YAW_MULT
        : FollowerCamera.positionInterpRate;
      const step = diff * rate * delta;
      if(Math.abs(step) >= Math.abs(diff)){
        FollowerCamera.facing = desired;
      }else{
        FollowerCamera.facing = Utility.NormalizeRadian(FollowerCamera.facing + step);
      }
    }
  }

  /**
   * Creature forward in XY for HitCheckCamera post-hit nudge.
   * Model yaw uses rotation.z; behindFacing is yaw−π/2, so forward is yaw+π/2.
   */
  static getCreatureForwardXY(followee: ModuleObject, out: THREE.Vector3): THREE.Vector3 {
    const yaw = typeof (followee as any).getFacing === 'function'
      ? (followee as any).getFacing()
      : (followee as any).rotation?.z ?? 0;
    out.set(-Math.sin(yaw), Math.cos(yaw), 0);
    const len = Math.hypot(out.x, out.y);
    if(len > 1e-8){
      out.x /= len;
      out.y /= len;
    }
    return out;
  }

  /**
   * Control_AccelerateInterp — bump soft rate from desired↔current sep².
   */
  static updatePositionInterpRate(
    current: THREE.Vector3,
    desired: THREE.Vector3,
    delta: number
  ){
    const dx = desired.x - current.x;
    const dy = desired.y - current.y;
    const dz = desired.z - current.z;
    const sep2 = dx * dx + dy * dy + dz * dz;
    let rate = FollowerCamera.positionInterpRate;
    if(sep2 > 1.0){
      rate += FollowerCamera.CAMERA_INTERP_ACCEL * delta;
    }
    if(sep2 < 1.0){
      rate -= FollowerCamera.CAMERA_INTERP_DECEL * delta;
    }
    if(rate < FollowerCamera.CAMERA_INTERP_AMT_MIN) rate = FollowerCamera.CAMERA_INTERP_AMT_MIN;
    if(rate > FollowerCamera.CAMERA_INTERP_AMT_MAX) rate = FollowerCamera.CAMERA_INTERP_AMT_MAX;
    FollowerCamera.positionInterpRate = rate;
  }

  /**
   * new camera position distance blend:
   * styleDist + (1 − cameraInterpDistAmt) * (currentDist − styleDist).
   */
  static blendStyleDistance(styleDist: number, currentDist: number): number {
    const amt = FollowerCamera.CAMERA_INTERP_DIST_AMT;
    return styleDist + (1 - amt) * (currentDist - styleDist);
  }

  /**
   * ShrinkLineByCreatures — pull camera end in if it sits
   * inside another creature's personal-space circle (2D).
   */
  static shrinkDistanceByCreatures(
    area: ModuleArea,
    followee: ModuleObject,
    origin: THREE.Vector3,
    maxDist: number
  ): number {
    if(!area?.creatures?.length || maxDist <= 0) return maxDist;

    const dirX = Math.cos(FollowerCamera.facing);
    const dirY = Math.sin(FollowerCamera.facing);
    let distance = maxDist;
    let camX = origin.x + distance * dirX;
    let camY = origin.y + distance * dirY;
    let changed = true;
    let guard = 0;

    while(changed && guard++ < 16){
      changed = false;
      for(let i = 0, n = area.creatures.length; i < n; i++){
        const c = area.creatures[i];
        if(!c || c === followee || c.destroyed || c.willDestroy) continue;
        const radius = typeof (c as any).getPathPersonalSpace === 'function'
          ? (c as any).getPathPersonalSpace()
          : (typeof (c as any).getPersonalSpace === 'function'
            ? (c as any).getPersonalSpace()
            : 0.5);
        if(!(radius > 0)) continue;

        const dx = camX - c.position.x;
        const dy = camY - c.position.y;
        const r2 = radius * radius;
        if(dx * dx + dy * dy >= r2) continue;

        // Pull end point just outside the circle along the ray from origin
        const ox = origin.x;
        const oy = origin.y;
        const vx = camX - ox;
        const vy = camY - oy;
        const len2 = vx * vx + vy * vy;
        if(len2 < 1e-8) continue;

        const cx = c.position.x - ox;
        const cy = c.position.y - oy;
        const a = len2;
        const b = -2 * (vx * cx + vy * cy);
        const cc = cx * cx + cy * cy - r2;
        const disc = b * b - 4 * a * cc;
        if(disc < 0) continue;

        const sqrtD = Math.sqrt(disc);
        // Prefer nearer intersection toward origin (smaller t in [0,1])
        let t0 = (-b - sqrtD) / (2 * a);
        let t1 = (-b + sqrtD) / (2 * a);
        let t = -1;
        if(t0 >= 0 && t0 <= 1) t = t0;
        else if(t1 >= 0 && t1 <= 1) t = t1;
        if(t < 0) continue;

        // Nudge slightly toward origin (0.001 along ray)
        t = Math.max(0, t - 0.001);
        camX = ox + vx * t;
        camY = oy + vy * t;
        const newDist = Math.hypot(camX - ox, camY - oy);
        if(newDist < distance){
          distance = Math.max(0.35, newDist);
          changed = true;
        }
      }
    }

    return distance;
  }

  /**
   * Control_HitCheckCamera / DetermineSafePosition
   * ShrinkLineByCreatures, multi-pass center+side HitChecks, pull along ray,
   * then post-hit nudge (ps+0.15)*(hitLen/fullLen) along creature forward.
   * Writes safe camera position into `out`.
   */
  static hitCheckCamera(
    area: ModuleArea,
    followee: ModuleObject,
    origin: THREE.Vector3,
    desired: THREE.Vector3,
    out: THREE.Vector3
  ): THREE.Vector3 {
    out.copy(desired);

    const dx0 = out.x - origin.x;
    const dy0 = out.y - origin.y;
    let maxDist = Math.hypot(dx0, dy0);
    if(maxDist < 1e-6) return out;

    let distance = FollowerCamera.shrinkDistanceByCreatures(area, followee, origin, maxDist);
    const personalSpace = FollowerCamera.getCameraPersonalSpace(followee);
    const pad = personalSpace + FollowerCamera.CAMERA_HIT_PAD;

    const dirX = Math.cos(FollowerCamera.facing);
    const dirY = Math.sin(FollowerCamera.facing);
    const sideX = -dirY * personalSpace;
    const sideY = dirX * personalSpace;

    const offsets: [number, number][] = [
      [0, 0],
      [sideX, sideY],
      [-sideX, -sideY],
    ];

    out.set(
      origin.x + distance * dirX,
      origin.y + distance * dirY,
      origin.z
    );

    FollowerCamera.box.min.copy(origin);
    FollowerCamera.box.max.copy(origin);
    FollowerCamera.box.expandByScalar(Math.max(distance, maxDist) * 1.5);

    const aabbFaces: { object: any; faces: any }[] = [];

    if(followee.room && followee.room.collisionManager.walkmesh && followee.room.collisionManager.walkmesh.aabbNodes.length){
      aabbFaces.push({
        object: followee.room,
        faces: followee.room.collisionManager.walkmesh.getAABBCollisionFaces(FollowerCamera.box)
      });
    }

    for(let j = 0, jl = area.doors.length; j < jl; j++){
      const door = area.doors[j];
      if(door && door.collisionManager.walkmesh && !door.isOpen()){
        if(door.box.intersectsBox(FollowerCamera.box) || door.box.containsBox(FollowerCamera.box)){
          aabbFaces.push({
            object: door,
            faces: door.collisionManager.walkmesh.faces
          });
        }
      }
    }

    const fullRayLen = Math.max(distance, 1e-6);

    // while-hits loop: shrink and re-test until clear or stable
    for(let pass = 0; pass < 8; pass++){
      let hitThisPass = false;
      let best = distance;

      for(let o = 0; o < offsets.length; o++){
        const ox = offsets[o][0];
        const oy = offsets[o][1];
        FollowerCamera.raycaster.far = Math.max(maxDist + 1, 10);
        FollowerCamera.raycaster.ray.direction.set(dirX, dirY, 0).normalize();
        FollowerCamera.raycaster.ray.origin.set(origin.x + ox, origin.y + oy, origin.z);

        for(let k = 0, kl = aabbFaces.length; k < kl; k++){
          const castableFaces = aabbFaces[k];
          const intersects = castableFaces.object.collisionManager.walkmesh.raycast(
            FollowerCamera.raycaster,
            castableFaces.faces
          ) || [];
          for(let i = 0; i < intersects.length; i++){
            const hitDist = intersects[i].distance - pad;
            if(hitDist < best){
              best = Math.max(0.35, hitDist);
              hitThisPass = true;
            }
          }
        }
      }

      if(!hitThisPass || best >= distance - 0.001){
        distance = best;
        out.set(
          origin.x + distance * dirX,
          origin.y + distance * dirY,
          origin.z
        );
        break;
      }

      // Pull along ray (operator-= normalized * hitLen), then creature-forward nudge
      const pullLen = distance - best;
      distance = best;
      out.set(
        origin.x + distance * dirX,
        origin.y + distance * dirY,
        origin.z
      );

      if(pullLen > 0){
        const nudgeAmt = pad * (pullLen / fullRayLen);
        FollowerCamera.getCreatureForwardXY(followee, FollowerCamera.tmpForward);
        out.x += FollowerCamera.tmpForward.x * nudgeAmt;
        out.y += FollowerCamera.tmpForward.y * nudgeAmt;
        // Re-measure distance after lateral nudge for next pass
        distance = Math.hypot(out.x - origin.x, out.y - origin.y);
      }
    }

    FollowerCamera.raycaster.far = Infinity;
    return out;
  }

  /**
   * Control_HitCheckCamera — ShrinkLineByCreatures then multi-pass
   * center + side rays; returns safe distance along chase yaw (nudge baked into
   * last hitCheckCamera out when used via update).
   */
  static hitCheckDistance(
    area: ModuleArea,
    followee: ModuleObject,
    origin: THREE.Vector3,
    maxDist: number
  ): number {
    const dirX = Math.cos(FollowerCamera.facing);
    const dirY = Math.sin(FollowerCamera.facing);
    FollowerCamera.tmpDesiredCam.set(
      origin.x + maxDist * dirX,
      origin.y + maxDist * dirY,
      origin.z
    );
    FollowerCamera.hitCheckCamera(
      area, followee, origin, FollowerCamera.tmpDesiredCam, FollowerCamera.tmpSafeCam
    );
    return Math.hypot(
      FollowerCamera.tmpSafeCam.x - origin.x,
      FollowerCamera.tmpSafeCam.y - origin.y
    );
  }

  static update(delta: number = 0, area: ModuleArea){
    if(FollowerCamera.deathCamActive){
      FollowerCamera.updateDeathCamera(delta);
      return;
    }

    // Mode 4 — UpdateCameraFollow early-out (no follow tick)
    if((GameState.clientCameraMode | 0) === ClientCameraMode.RESERVED_4){
      return;
    }

    if(GameState.Mode == EngineMode.FREELOOK || FollowerCamera.freeLookActive){
      FollowerCamera.updateFreeLook(delta);
      return;
    }

    // Mode 7 — navigate camera free-fly
    if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
      FollowerCamera.applyCameraModeStyle(ClientCameraMode.NAVIGATE);
      FollowerCamera.updateNavigate(delta);
      return;
    }

    FollowerCamera.updateLocationTransition(delta);
    FollowerCamera.refreshKeyboardTurnOptions();

    const mode = GameState.clientCameraMode | 0;
    const allowPlayerYaw =
      mode === ClientCameraMode.ON_A_STICK
      || mode === ClientCameraMode.TOP_DOWN
      || mode === ClientCameraMode.CHASE
      || mode === ClientCameraMode.DRIVE
      || mode === ClientCameraMode.COMBAT;

    // Keyboard / stick yaw ramp — Keyboard Camera DPS / Accel / Decel
    if(allowPlayerYaw){
      if(FollowerCamera.turning && FollowerCamera.speed < FollowerCamera.maxSpeed){
        FollowerCamera.speed += FollowerCamera.accelRad * delta;
        if(FollowerCamera.speed > FollowerCamera.maxSpeed){
          FollowerCamera.speed = FollowerCamera.maxSpeed;
        }
      }else if(FollowerCamera.speed > FollowerCamera.minSpeed){
        FollowerCamera.speed -= FollowerCamera.decelRad * delta;
        if(FollowerCamera.speed < 0){
          FollowerCamera.speed = 0;
        }
      }

      if(FollowerCamera.speed > 0){
        FollowerCamera.facing = Utility.NormalizeRadian(
          FollowerCamera.facing + (FollowerCamera.speed * FollowerCamera.dir) * delta
        );
      }
    }else{
      FollowerCamera.speed = 0;
    }

    FollowerCamera.turning = false;

    const followee = GameState.getCurrentPlayer();
    if(!followee) return;

    FollowerCamera.updateCameraModeYaw(followee, delta);

    if(mode === ClientCameraMode.COMBAT){
      FollowerCamera.updateCombatCameraYaw(followee, delta);
    }

    // SetLookAtTarget-style focus yaw (SelectNext / SelectPrev)
    if(mode !== ClientCameraMode.COMBAT && FollowerCamera.focusObject){
      if(FollowerCamera.focusObject.destroyed || FollowerCamera.focusObject.willDestroy){
        FollowerCamera.focusObject = undefined;
      }else{
        const dx = FollowerCamera.focusObject.position.x - followee.position.x;
        const dy = FollowerCamera.focusObject.position.y - followee.position.y;
        const targetFacing = Utility.NormalizeRadian(Math.atan2(dy, dx) + Math.PI);
        let angleDiff = targetFacing - FollowerCamera.facing;
        angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
        const absDiff = Math.abs(angleDiff);
        if(absDiff > FOCUS_DEAD_ZONE){
          const easeFactor = Math.min(1, absDiff / EASE_THRESHOLD);
          const speed = FollowerCamera.focusTurnSpeed * easeFactor;
          const step = speed * delta;
          if(absDiff > step){
            FollowerCamera.facing = Utility.NormalizeRadian(
              FollowerCamera.facing + Math.sign(angleDiff) * step
            );
          }else{
            FollowerCamera.facing = targetFacing;
          }
        }
      }
    }

    const headHeight = FollowerCamera.getFolloweeHeadHeight(followee);
    const camHeight = headHeight + FollowerCamera.height;
    const styleDist = (mode === ClientCameraMode.STIFF_CHASE
      ? FollowerCamera.STIFF_DIST
      : FollowerCamera.maxDistance) * GameState.CameraDebugZoom;

    // new camera position — soft blend toward style distance.
    // Combat CalculateDesiredLocation uses this->distance directly.
    let distance = mode === ClientCameraMode.COMBAT
      ? styleDist
      : FollowerCamera.blendStyleDistance(styleDist, FollowerCamera.distance);

    FollowerCamera.tmpOrigin.set(
      followee.position.x,
      followee.position.y,
      followee.position.z + camHeight
    );

    const dirX = Math.cos(FollowerCamera.facing);
    const dirY = Math.sin(FollowerCamera.facing);
    FollowerCamera.tmpDesiredCam.set(
      FollowerCamera.tmpOrigin.x + distance * dirX,
      FollowerCamera.tmpOrigin.y + distance * dirY,
      FollowerCamera.tmpOrigin.z
    );

    // Combat / chase: PutAtDesiredLocation + HitCheckCamera / DetermineSafePosition
    FollowerCamera.hitCheckCamera(
      area,
      followee,
      FollowerCamera.tmpOrigin,
      FollowerCamera.tmpDesiredCam,
      FollowerCamera.tmpSafeCam
    );

    if(GameState.Mode == EngineMode.MINIGAME){
      if(BitWise.InstanceOf(followee?.objectType, ModuleObjectType.ModuleMGPlayer)){
        ( (mgPlayer: ModuleMGPlayer) => {
          const hook = mgPlayer.camera?.camerahook;
          if(hook){
            // SetCamera — attach to camerahook (no world-pose copy).
            FollowerCamera.attachMinigameCamera(hook);
          }else{
            FollowerCamera.detachMinigameCamera();
          }
          FollowerCamera.camera.fov = area.miniGame.cameraViewAngle;
          // clip_start/clip_end (Near_Clip / Far_Clip)
          if(area.miniGame.nearClip > 0){
            FollowerCamera.camera.near = area.miniGame.nearClip;
          }
          if(area.miniGame.farClip > 0){
            FollowerCamera.camera.far = area.miniGame.farClip;
          }
          FollowerCamera.camera.updateProjectionMatrix();
        })(followee as any);
      }
    }else{
      if(FollowerCamera.mgCameraHookAttached){
        FollowerCamera.detachMinigameCamera();
      }
      FollowerCamera.updatePositionInterpRate(
        FollowerCamera.camera.position,
        FollowerCamera.tmpSafeCam,
        delta
      );

      // HitCheckCamera / DetermineSafePosition result (GetNextPosition
      // duration is 0 from GetNextYaw — snap every tick).
      FollowerCamera.camera.position.copy(FollowerCamera.tmpSafeCam);

      distance = Math.hypot(
        FollowerCamera.camera.position.x - FollowerCamera.tmpOrigin.x,
        FollowerCamera.camera.position.y - FollowerCamera.tmpOrigin.y
      );

      if(distance > styleDist){
        distance = styleDist;
      }

      FollowerCamera.distance = distance;

      FollowerCamera.camera.rotation.order = 'YZX';
      FollowerCamera.camera.rotation.set(FollowerCamera.pitch, 0, FollowerCamera.facing + HALF_PI);
    }

    FollowerCamera.camera.updateProjectionMatrix();
  }

  static setFocusObject(object: ModuleObject | undefined){
    FollowerCamera.focusObject = object;
  }

  static clearFocusObject(){
    FollowerCamera.focusObject = undefined;
  }

  static resize(){
    const width = ResolutionManager.getViewportWidth();
    const height = ResolutionManager.getViewportHeight();
    FollowerCamera.camera.fov = FollowerCamera.fov;
    FollowerCamera.camera.aspect = width / height;
    FollowerCamera.camera.updateProjectionMatrix();
  }

}
