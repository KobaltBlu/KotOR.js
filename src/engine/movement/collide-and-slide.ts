import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { MovementHit } from "@engine/movement/types";
import {
  collectBlockingWalkEdgeNormals,
  projectDesiredOntoNormals,
} from "@engine/movement/wall-slide";

/**
 * Bounded iterative collide-and-slide (XY plane).
 *
 *   pos = origin, rem = desired, planes = {}
 *   repeat maxIterations:
 *     probe pos → pos + rem
 *     clear → take it, done
 *     advance to contact (minus skin)
 *     planes ∪= hit normal ∪ walk/placeable edge normals near contact
 *     rem = exact projection of the *leftover* displacement onto planes
 *
 * Properties:
 * - total travel never exceeds |desired| (only the leftover is projected);
 * - planes accumulate across iterations, so inside corners resolve to the
 *   crease (or zero) instead of ping-ponging between walls;
 * - never moves against the original intent (no backward jitter).
 *
 * The probe is caller-supplied so player control and external force can use
 * their own static/creature query options. Probe results must be plain
 * values: the solver copies them immediately (shared probe singletons are
 * safe to return).
 */

export type CollideAndSlideProbe = {
  clear: boolean;
  /** Fraction 0..1 of from→to that is clear. */
  clearT: number;
  /** Contact normal (XY used). Only trusted when `normalUsable`. */
  normalX?: number;
  normalY?: number;
  normalUsable?: boolean;
  hit?: MovementHit;
};

export type CollideAndSlideOptions = {
  area: Area | undefined;
  /** Radius for gathering nearby wall edge normals at each contact. */
  radius: number;
  probe: (from: THREE.Vector3, to: THREE.Vector3) => CollideAndSlideProbe;
  /**
   * Optional extra per-leg acceptance (e.g. creature capsule test). A
   * rejected leg ends the solve at that leg's start.
   */
  validateLeg?: (from: THREE.Vector3, to: THREE.Vector3) => boolean;
  /** Slide (contact + projection) iterations. Default 3. */
  maxIterations?: number;
  /**
   * Halvings allowed when a probe blocks with no usable contact and nothing
   * known opposes the motion. Default 3.
   */
  maxShrinks?: number;
  /** Back-off from the contact so follow-up probes do not start on the wall. */
  skin?: number;
};

export type CollideAndSlideResult = {
  /** Final XY position (z copied from origin). New vector. */
  position: THREE.Vector3;
  /** XY distance from origin to `position`. */
  moved: number;
  /** First blocking hit encountered (undefined when the full step was clear). */
  hit?: MovementHit;
  /** clearT of the first probe (1 when clear). */
  firstClearT: number;
  /** True when the full desired displacement was taken without contact. */
  unobstructed: boolean;
  /** Probes issued (for instrumentation / tests). */
  iterations: number;
};

const MIN_STEP = 1e-6;
/**
 * Extra gather reach at a contact: bisection stops up to ~travel/64 short of
 * the true contact, plus the skin back-off, so the touching wall can sit a
 * few cm beyond `radius`.
 */
const CONTACT_SLOP = 0.05;
/**
 * Clearance withheld from gathered planes: live static probes treat contacts
 * within ~radius + 1cm as overlapping, so never spend the last 2cm of a gap.
 */
const GAP_MARGIN = 0.02;
const PLANE_DEDUPE_DOT = 0.98;
/**
 * Most of a slide leg that may be spent easing off a wall the mover is
 * already pressed against (see `_pushes`).
 */
const PUSH_OFF_FRACTION = 0.25;

const _pos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _rem = new THREE.Vector3();
const _gathered: THREE.Vector3[] = [];
const _gatheredDist: number[] = [];
const _planes: THREE.Vector3[] = [];
/** Clearance to each plane (parallel to `_planes`); 0 = in contact. */
const _gaps: number[] = [];
/**
 * Separation still owed to each plane (parallel to `_planes`). A mover left
 * inside the probe's contact pad cannot take an exactly-tangent slide (the
 * destination circle still touches), so slides lean away by up to this much.
 */
const _pushes: number[] = [];
const _planePool: THREE.Vector3[] = [];

function addPlane(x: number, y: number, gap = 0, push = 0): void {
  const len = Math.hypot(x, y);
  if(len < 1e-8) return;
  const nx = x / len;
  const ny = y / len;
  const g = Math.max(0, gap);
  for(let i = 0; i < _planes.length; i++){
    if(_planes[i].x * nx + _planes[i].y * ny > PLANE_DEDUPE_DOT){
      // Keep the nearer contact's normal: a farther near-parallel feature's
      // tangent drifts into the nearer wall and stalls the slide.
      if(g < _gaps[i]){
        _gaps[i] = g;
        _planes[i].set(nx, ny, 0);
      }
      if(push > _pushes[i]) _pushes[i] = push;
      return;
    }
  }
  const idx = _planes.length;
  let v = _planePool[idx];
  if(!v){
    v = new THREE.Vector3();
    _planePool[idx] = v;
  }
  _planes.push(v.set(nx, ny, 0));
  _gaps.push(g);
  _pushes.push(Math.max(0, push));
}

/** Shift accumulated plane clearances after moving by (dx, dy). */
function advancePlanes(dx: number, dy: number): void {
  for(let i = 0; i < _planes.length; i++){
    const along = _planes[i].x * dx + _planes[i].y * dy;
    _gaps[i] = Math.max(0, _gaps[i] + along);
    _pushes[i] = Math.max(0, _pushes[i] - along);
  }
}

/** True when plane i cuts motion (vx, vy) — i.e. it would exceed the gap. */
function planeCuts(i: number, vx: number, vy: number, len: number): boolean {
  return _planes[i].x * vx + _planes[i].y * vy < -_gaps[i] - 1e-6 * len;
}

/**
 * Lean a blocked tangent slide off walls still owed separation, capped to a
 * fraction of the slide so the step stays mostly along the wall. Skipped when
 * leaning would cut another plane (inside corners keep the exact crease).
 * @returns true when `v` was changed.
 */
function leanOffContacts(v: THREE.Vector3): boolean {
  const len = Math.hypot(v.x, v.y);
  if(len < MIN_STEP) return false;
  const cap = len * PUSH_OFF_FRACTION;
  let px = 0;
  let py = 0;
  for(let i = 0; i < _planes.length; i++){
    const want = Math.min(_pushes[i], cap);
    if(want <= 0) continue;
    const along = _planes[i].x * v.x + _planes[i].y * v.y;
    if(along >= want) continue;
    px += _planes[i].x * (want - along);
    py += _planes[i].y * (want - along);
  }
  if(px === 0 && py === 0) return false;
  const lx = v.x + px;
  const ly = v.y + py;
  const lLen = Math.hypot(lx, ly);
  for(let i = 0; i < _planes.length; i++){
    if(planeCuts(i, lx, ly, lLen)) return false;
  }
  v.set(lx, ly, 0);
  return true;
}

const _legTo = new THREE.Vector3();
const _legFrom = new THREE.Vector3();
/** Bisection steps when a probe's clearT hint is wrong (≈ travel / 64). */
const BISECT_STEPS = 6;

function legClear(
  options: CollideAndSlideOptions,
  from: THREE.Vector3,
  dirX: number,
  dirY: number,
  dist: number,
  z: number
): boolean {
  _legFrom.copy(from);
  _legTo.set(from.x + dirX * dist, from.y + dirY * dist, z);
  return options.probe(_legFrom, _legTo).clear;
}

/** Farthest distance in [0, maxDist] along dir whose leg probes clear. */
function bisectClearTravel(
  options: CollideAndSlideOptions,
  from: THREE.Vector3,
  dirX: number,
  dirY: number,
  maxDist: number,
  z: number
): number {
  let lo = 0;
  let hi = maxDist;
  for(let i = 0; i < BISECT_STEPS; i++){
    const mid = (lo + hi) * 0.5;
    if(legClear(options, from, dirX, dirY, mid, z)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Current accumulated planes from the most recent solve (read-only view). */
export function getLastCollideAndSlidePlanes(): ReadonlyArray<THREE.Vector3> {
  return _planes;
}

export function solveCollideAndSlide(
  origin: THREE.Vector3,
  desired: THREE.Vector3,
  options: CollideAndSlideOptions
): CollideAndSlideResult {
  const maxIterations = Math.max(1, options.maxIterations ?? 3);
  const skin = Math.max(0, options.skin ?? 0.01);
  const intentX = desired.x;
  const intentY = desired.y;

  _pos.copy(origin);
  _rem.set(desired.x, desired.y, 0);
  _planes.length = 0;
  _gaps.length = 0;
  _pushes.length = 0;

  let hit: MovementHit | undefined;
  let firstClearT = 1;
  let unobstructed = false;
  let iterations = 0;
  let slides = 0;
  let shrinks = 0;
  let leaned = false;
  const maxShrinks = Math.max(0, options.maxShrinks ?? 3);

  while(slides < maxIterations && iterations < maxIterations + maxShrinks){
    const remLen = Math.hypot(_rem.x, _rem.y);
    if(remLen < MIN_STEP) break;

    _target.set(_pos.x + _rem.x, _pos.y + _rem.y, origin.z);
    const p = options.probe(_pos, _target);
    iterations++;
    // Copy everything out before any further query can clobber it.
    const clear = p.clear;
    const clearT = Math.max(0, Math.min(1, p.clearT));
    const usable = !!p.normalUsable;
    const hnx = p.normalX ?? 0;
    const hny = p.normalY ?? 0;
    const pHit = p.hit;
    if(iterations === 1) firstClearT = clear ? 1 : clearT;

    if(clear){
      if(options.validateLeg && !options.validateLeg(_pos, _target)) break;
      advancePlanes(_target.x - _pos.x, _target.y - _pos.y);
      _pos.copy(_target);
      if(iterations === 1) unobstructed = true;
      break;
    }
    if(!hit) hit = pHit;

    // Advance to contact, backing off by skin. Probe clearT is only a hint:
    // stadium/mesh (DetailedBlock) hits project the hit point and often
    // report clearT ≈ 1 even when the capsule is blocked far earlier, so the
    // contact leg is verified and bisected when the hint is wrong.
    const dirX = _rem.x / remLen;
    const dirY = _rem.y / remLen;
    let travel = Math.max(0, clearT * remLen - skin);
    if(travel > MIN_STEP && !legClear(options, _pos, dirX, dirY, travel, origin.z)){
      travel = bisectClearTravel(options, _pos, dirX, dirY, travel, origin.z);
      travel = Math.max(0, travel - skin);
    }
    // A slide leg that cannot start at all while still inside a wall's
    // contact pad: lean it off that wall once and retry.
    if(slides > 0 && travel <= MIN_STEP && !leaned && leanOffContacts(_rem)){
      leaned = true;
      continue;
    }
    if(travel > MIN_STEP){
      _target.set(_pos.x + dirX * travel, _pos.y + dirY * travel, origin.z);
      if(options.validateLeg && !options.validateLeg(_pos, _target)) break;
      advancePlanes(_target.x - _pos.x, _target.y - _pos.y);
      _pos.copy(_target);
    }

    // Constraint planes at the contact. Real walk/placeable geometry wins:
    // the probe normal is only added when no gathered edge already opposes
    // the approach (mesh corner normals are often wrong, e.g. ±X at a
    // collinear perimeter vertex).
    collectBlockingWalkEdgeNormals(
      options.area,
      _pos,
      options.radius + skin + CONTACT_SLOP,
      _gathered,
      _gatheredDist
    );
    let geomOpposed = false;
    for(let i = 0; i < _gathered.length; i++){
      const gn = _gathered[i];
      const clearance = (_gatheredDist[i] ?? 0) - options.radius - skin - GAP_MARGIN;
      const gap = Math.max(0, clearance);
      addPlane(gn.x, gn.y, gap, Math.max(0, -clearance));
      if(gn.x * _rem.x + gn.y * _rem.y < -gap - 1e-6 * remLen) geomOpposed = true;
    }
    // The probe normal is a contact (gap 0).
    if(usable && !geomOpposed) addPlane(hnx, hny, 0);

    let opposed = false;
    for(let i = 0; i < _planes.length; i++){
      if(planeCuts(i, _rem.x, _rem.y, remLen)){
        opposed = true;
        break;
      }
    }
    if(!opposed){
      // Blocked, but nothing known opposes the approach: thin probes report
      // clearT 0 for start-overlap / unrefined static hits. Try a shorter
      // step before concluding there is a head-on wall.
      if(travel <= MIN_STEP && shrinks < maxShrinks){
        shrinks++;
        _rem.multiplyScalar(0.5);
        continue;
      }
      addPlane(-_rem.x, -_rem.y, 0);
    }

    // Project only what is left of this leg.
    slides++;
    const leftover = Math.max(0, remLen - travel) / remLen;
    projectDesiredOntoNormals(
      _rem.x * leftover,
      _rem.y * leftover,
      _planes,
      _rem,
      _gaps
    );

    // Never slide backward relative to the original intent.
    if(_rem.x * intentX + _rem.y * intentY <= 0){
      break;
    }
  }

  const position = new THREE.Vector3(_pos.x, _pos.y, origin.z);
  return {
    position,
    moved: Math.hypot(position.x - origin.x, position.y - origin.y),
    hit,
    firstClearT,
    unobstructed,
    iterations,
  };
}
