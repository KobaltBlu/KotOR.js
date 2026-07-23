import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { testDirectLine, TestDirectLineCode } from "@/engine/pathfinding/test-direct-line";
import { testSafeLocationPoint } from "@/engine/pathfinding/test-safe-location-point";
import { GameState } from "@/GameState";

/**
 * Approximate CSWPartyFollowDataArray — retail ring of leader trail points
 * used by QuickWalk_FollowLeader / TeleportForward / RecaulateFollowPoint.
 *
 * Retail: ProcessPoint @ 00636a30, GetPointBackFromStart @ 006350f0,
 * RecaulateFollowPoint @ 006359c0 (center trail @ range±stagger),
 * TeleportForward @ 00512de0 (center trail + TestSafeLocationPoint).
 *
 * ProcessPoint follow_data stride (~0x28):
 *   field0_0x0  Vector3 center
 *   field1_0xc  float bearing — retail stores **degrees** (consumers DegToRad);
 *               KotOR.js stores **radians** (`leader.rotation.z`) and uses cos/sin directly
 *   field2_0x10 Vector3 lateral slot1
 *   field3_0x1c Vector3 lateral slot2
 * Recalc/Teleport use center (field0); cold GetFollowPosition uses ±1.5 along (cos,sin) of radians.
 *
 * @file party-follow-path.ts
 */

export const FOLLOW_RING_SIZE = 100;
/** Retail: skip new point when sqdist to previous < 0.25 and LOS clear. */
const MIN_POINT_DIST_SQ = 0.25;
/** Default PrimaryRange from ranges.2da when table missing (GetFollowRange). */
const DEFAULT_FOLLOW_RANGE = 5.0;
/** Stagger between party slots (retail field11_0x1c0 approx). */
const SLOT_STAGGER = 0.35;
/** Lateral offset left/right of trail bearing (±1.5 matches GetFollowPositionAtIndex). */
const LATERAL_OFFSET = 1.5;

export type FollowPathPoint = {
  x: number;
  y: number;
  z: number;
  bearing: number;
  /** Precomputed lateral goal for party slot 1 (idx==1). */
  offset1x: number;
  offset1y: number;
  offset1z: number;
  /** Precomputed lateral goal for party slot 2. */
  offset2x: number;
  offset2y: number;
  offset2z: number;
};

function emptyPoint(): FollowPathPoint {
  return {
    x: 0, y: 0, z: 0, bearing: 0,
    offset1x: 0, offset1y: 0, offset1z: 0,
    offset2x: 0, offset2y: 0, offset2z: 0,
  };
}

/**
 * Party leader trail ring (100 slots).
 */
export class PartyFollowPath {
  readonly points: FollowPathPoint[] = Array.from({ length: FOLLOW_RING_SIZE }, emptyPoint);
  /** Write head — next slot to write (retail field2_0xfa4). */
  writeHead = 0;
  /** Valid point count capped at 100 (retail field3_0xfa8). */
  count = 0;
  /** Last clear LOS sample when a wall break inserts an intermediate point. */
  private lastClear = new THREE.Vector3();
  private hasLastClear = false;

  /** Per party-slot ring cursor for TeleportForward (retail field9_0x24). */
  memberCursor: number[] = [0, 0, 0];
  /** Cached goal index from Recalculate (retail field11_0x34). */
  memberGoalIndex: number[] = [0, 0, 0];
  private memberGoal = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  private readonly _tmp = new THREE.Vector3();
  private readonly _tmp2 = new THREE.Vector3();

  reset(leaderPos?: THREE.Vector3, bearing: number = 0){
    this.writeHead = 0;
    this.count = 0;
    this.hasLastClear = false;
    this.memberCursor = [0, 0, 0];
    this.memberGoalIndex = [0, 0, 0];
    if(leaderPos){
      this.pushPoint(leaderPos.x, leaderPos.y, leaderPos.z, bearing);
      this.lastClear.copy(leaderPos);
      this.hasLastClear = true;
    }
  }

  /**
   * Retail ranges.2da PrimaryRange — row 14 (close) / 15 (far) by follow state.
   * JS: prefer row 14; fall back to 5.0.
   */
  getFollowRange(): number {
    const ranges = GameState.SWRuleSet?.ranges;
    const row = ranges?.[14] ?? ranges?.[15];
    const n = row?.primaryRange;
    return typeof n === 'number' && n > 0 ? n : DEFAULT_FOLLOW_RANGE;
  }

  private prevIndex(i: number): number {
    return i > 0 ? i - 1 : FOLLOW_RING_SIZE - 1;
  }

  private pushPoint(x: number, y: number, z: number, bearing: number){
    const p = this.points[this.writeHead];
    p.x = x; p.y = y; p.z = z; p.bearing = bearing;
    // Lateral offsets in leader facing frame (ProcessPoint quaternion approx)
    const cos = Math.cos(bearing);
    const sin = Math.sin(bearing);
    // Slot 1 = +lateral (right of facing), slot 2 = -lateral
    p.offset1x = x - LATERAL_OFFSET * cos;
    p.offset1y = y - LATERAL_OFFSET * sin;
    p.offset1z = z;
    p.offset2x = x + LATERAL_OFFSET * cos;
    p.offset2y = y + LATERAL_OFFSET * sin;
    p.offset2z = z;

    this.writeHead = this.writeHead < FOLLOW_RING_SIZE - 1 ? this.writeHead + 1 : 0;
    if(this.count < FOLLOW_RING_SIZE) this.count++;
  }

  /**
   * Retail ProcessPoint — record leader position when moved enough / LOS broken.
   * Bearing is stored in radians (JS); retail field1_0xc is degrees.
   */
  processPoint(
    leader: ModuleCreature,
    area: ModuleArea | undefined
  ): void {
    if(!leader) return;
    const point = leader.position;
    // ModuleCreature.rotation.z is radians — keep ring bearing in radians throughout JS
    const bearing = leader.rotation?.z ?? 0;

    if(!this.hasLastClear){
      this.lastClear.copy(point);
      this.hasLastClear = true;
    }

    if(this.count === 0){
      this.pushPoint(point.x, point.y, point.z, bearing);
      this.lastClear.copy(point);
      this.recalculateFollowPoints();
      return;
    }

    const lastIdx = this.prevIndex(this.writeHead);
    const last = this.points[lastIdx];
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    const dz = point.z - last.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    this._tmp.set(last.x, last.y, last.z);
    // Retail ProcessPoint: clear (1) OR creature-block (-3) if party member
    const hit = area
      ? testDirectLine(area, this._tmp, point, {
          owner: leader,
          allowPartyCreatures: true,
          collectHitInfo: true,
        })
      : {
          ok: true,
          code: TestDirectLineCode.Ok,
          clearPoint: point.clone(),
          clearT: 1,
          blockingCreatureId: undefined as number | undefined,
        };
    const los =
      hit.ok ||
      hit.code === TestDirectLineCode.Ok ||
      (hit.code === TestDirectLineCode.Creature &&
        hit.blockingCreatureId != null &&
        isPartyId(hit.blockingCreatureId));

    if(los){
      this.lastClear.copy(point);
    }else{
      // Insert last clear sample before continuing (retail wall-break branch)
      this.pushPoint(this.lastClear.x, this.lastClear.y, this.lastClear.z, bearing);
      this.lastClear.copy(point);
    }

    // Skip dense samples when close and LOS clear
    if(distSq < MIN_POINT_DIST_SQ && los){
      return;
    }

    this.pushPoint(point.x, point.y, point.z, bearing);
    if(this.count >= 3){
      this.recalculateFollowPoints();
    }
  }

  /**
   * Walk back along the center trail by `distance` (retail GetPointBackFromStart @ 006350f0).
   * Uses leader path points (field0), not lateral offsets.
   * `stopAtCursor` — stop if ring index hits member cursor (retail field9_0x24).
   */
  getPointBackFromStart(
    distance: number,
    out: THREE.Vector3,
    outIndex: { value: number },
    stopAtCursor?: number
  ): boolean {
    if(this.count < 3){
      out.set(0, 0, 0);
      outIndex.value = 0;
      return false;
    }

    let i = this.prevIndex(this.writeHead);
    let remaining = distance;
    let x = this.points[i].x;
    let y = this.points[i].y;
    let z = this.points[i].z;
    let left = this.count;
    outIndex.value = i;

    while(left >= 0 && remaining > 0){
      if(stopAtCursor != null && i === stopAtCursor){
        out.set(x, y, z);
        outIndex.value = i;
        return true;
      }
      const prev = this.prevIndex(i);
      left--;
      const p = this.points[prev];
      const sx = p.x - x;
      const sy = p.y - y;
      const sz = p.z - z;
      const segSq = sx * sx + sy * sy + sz * sz;
      if(remaining * remaining <= segSq){
        const len = Math.sqrt(segSq) || 1;
        out.set(
          x + (sx / len) * remaining,
          y + (sy / len) * remaining,
          z + (sz / len) * remaining
        );
        outIndex.value = i;
        return true;
      }
      remaining -= Math.sqrt(segSq);
      x = p.x; y = p.y; z = p.z;
      i = prev;
      outIndex.value = i;
    }

    out.set(x, y, z);
    return left >= 0;
  }

  /**
   * Retail RecaulateFollowPoint @ 006359c0 —
   * slot1 = GetPointBackFromStart(range - stagger),
   * slot2 = GetPointBackFromStart(range + stagger).
   * Goals are **center trail** points (not lateral offsets).
   */
  recalculateFollowPoints(): void {
    const range = this.getFollowRange();
    const idxBox = { value: 0 };

    if(this.getPointBackFromStart(
      range - SLOT_STAGGER, this._tmp, idxBox, this.memberCursor[1]
    )){
      this.memberGoal[1].copy(this._tmp);
      this.memberGoalIndex[1] = idxBox.value;
    }
    if(this.getPointBackFromStart(
      range + SLOT_STAGGER, this._tmp, idxBox, this.memberCursor[2]
    )){
      this.memberGoal[2].copy(this._tmp);
      this.memberGoalIndex[2] = idxBox.value;
    }
  }

  /**
   * Goal for party member at party index (1 or 2). Falls back to undefined if ring cold.
   */
  getFollowGoal(partyIndex: number, out: THREE.Vector3): boolean {
    if(partyIndex < 1 || partyIndex > 2) return false;
    if(this.count < 3) return false;
    out.copy(this.memberGoal[partyIndex]);
    return true;
  }

  /**
   * Retail TeleportForward @ 00512de0 — advance center-trail ring until TestSafeLocationPoint.
   */
  teleportForward(
    partyIndex: number,
    area: ModuleArea | undefined,
    out: THREE.Vector3
  ): boolean {
    if(partyIndex < 1 || partyIndex > 2 || this.count < 3) return false;

    let i = this.memberCursor[partyIndex] ?? this.memberGoalIndex[partyIndex] ?? this.prevIndex(this.writeHead);
    const writeLimit = this.writeHead;
    let steps = 0;

    while(steps < FOLLOW_RING_SIZE){
      i = i < FOLLOW_RING_SIZE - 1 ? i + 1 : 0;
      steps++;
      if(i === writeLimit) break;

      const p = this.points[i];
      // Retail uses field0_0x0 (center trail), not lateral offsets
      this._tmp.set(p.x, p.y, p.z);

      if(!testSafeLocationPoint(area, this._tmp)){
        continue;
      }

      out.copy(this._tmp);
      this.memberCursor[partyIndex] = i;
      this.memberGoal[partyIndex].copy(out);
      this.memberGoalIndex[partyIndex] = i;
      return true;
    }
    return false;
  }
}

/** Shared singleton used by PartyManager / FollowLeader. */
export const partyFollowPath = new PartyFollowPath();

function isPartyId(id: number): boolean {
  const party = GameState.PartyManager?.party;
  if(!party?.length) return false;
  for(let i = 0; i < party.length; i++){
    if(party[i]?.id === id) return true;
  }
  return false;
}
