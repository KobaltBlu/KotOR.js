import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { testDirectLine, TestDirectLineCode } from "@/engine/pathfinding/test-direct-line";
import { testSafeLocationPoint } from "@/engine/pathfinding/test-safe-location-point";
import { GameState } from "@/GameState";

/**
 * Approximate party follow ring — leader trail points
 * used by QuickWalk_FollowLeader / TeleportForward / RecaulateFollowPoint.
 *
 * : ProcessPoint, GetPointBackFromStart,
 * RecaulateFollowPoint (center trail @ range±stagger),
 * TeleportForward (center trail + TestSafeLocationPoint).
 *
 * ProcessPoint follow_data entry:
 * center Vector3
 * bearing float — stores **degrees** (consumers DegToRad);
 * KotOR.js stores **radians** (`leader.rotation.z`) and uses cos/sin directly
 * lateral slot1 Vector3 — stamped at writeHead−2 via
 * ZQuat(bearing writeHead−1) * party formation offsets
 * lateral slot2 Vector3
 * Recalc/Teleport use center; WaitingForPath/approach goals apply
 * formation laterals on the trail back-point.
 *
 * @file party-follow-path.ts
 */

export const FOLLOW_RING_SIZE = 100;
/** : skip new point when sqdist to previous < 0.25 and LOS clear. */
const MIN_POINT_DIST_SQ = 0.25;
/** Default PrimaryRange from ranges.2da when table missing (GetFollowRange). */
const DEFAULT_FOLLOW_RANGE = 5.0;
/** Stagger between party slots (approx). */
const SLOT_STAGGER = 0.35;
/** Fallback formation locals when PartyManager unavailable (pattern 0). */
const DEFAULT_FORMATION_SLOT1 = { x: 1.5, y: -0.7 };
const DEFAULT_FORMATION_SLOT2 = { x: -1.5, y: 0.8 };

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
  /** Write head — next slot to write. */
  writeHead = 0;
  /** Valid point count capped at 100. */
  count = 0;
  /** Last clear LOS sample when a wall break inserts an intermediate point. */
  private lastClear = new THREE.Vector3();
  private hasLastClear = false;

  /** Per party-slot ring cursor for TeleportForward. */
  memberCursor: number[] = [0, 0, 0];
  /** Cached goal index from Recalculate. */
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
   * GetFollowRange
   * PT_FOLLOWSTATE 0 → ranges.2da row 14 (close), 1 → row 15 (far).
   * Default PrimaryRange 5.0 when table missing.
   */
  getFollowRange(): number {
    const ranges = GameState.SWRuleSet?.ranges;
    const followState = (GameState.PartyManager?.FollowState ?? 0) | 0;
    const rowIndex = followState === 1 ? 15 : 14;
    const row = ranges?.[rowIndex] ?? ranges?.[14] ?? ranges?.[15];
    const n = row?.primaryRange;
    return typeof n === 'number' && n > 0 ? n : DEFAULT_FOLLOW_RANGE;
  }

  /** Slot follow distance for GetPointBackFromStart (Recalc / WaitingForPath). */
  getSlotFollowDistance(partyIndex: number): number {
    const range = this.getFollowRange();
    if(partyIndex === 2) return range + SLOT_STAGGER;
    return range - SLOT_STAGGER;
  }

  private prevIndex(i: number): number {
    return i > 0 ? i - 1 : FOLLOW_RING_SIZE - 1;
  }

  private pushPoint(x: number, y: number, z: number, bearing: number){
    const p = this.points[this.writeHead];
    p.x = x; p.y = y; p.z = z; p.bearing = bearing;
    // Laterals stamped after count≥3 on writeHead−2 (ProcessPoint)
    p.offset1x = x; p.offset1y = y; p.offset1z = z;
    p.offset2x = x; p.offset2y = y; p.offset2z = z;

    this.writeHead = this.writeHead < FOLLOW_RING_SIZE - 1 ? this.writeHead + 1 : 0;
    if(this.count < FOLLOW_RING_SIZE) this.count++;

    if(this.count >= 3){
      this.stampProcessPointLaterals();
    }
  }

  /**
   * ProcessPoint lateral stamp: center(writeHead−2) +
   * ZQuat(bearing writeHead−1) * formation offsets for slots 1–2.
   */
  private stampProcessPointLaterals(){
    const i1 = this.prevIndex(this.writeHead); // writeHead−1
    const i2 = this.prevIndex(i1);             // writeHead−2
    const entry = this.points[i2];
    const bearing = this.points[i1].bearing;
    const cos = Math.cos(bearing);
    const sin = Math.sin(bearing);

    const offs = GameState.PartyManager?.getFormationOffsets?.();
    const slot1 = offs?.[1] ?? DEFAULT_FORMATION_SLOT1;
    const slot2 = offs?.[2] ?? DEFAULT_FORMATION_SLOT2;

    // Local (+X right, +Y forward) → world via Z rotation of trail bearing
    const r1x = slot1.x * cos - slot1.y * sin;
    const r1y = slot1.x * sin + slot1.y * cos;
    entry.offset1x = entry.x + r1x;
    entry.offset1y = entry.y + r1y;
    entry.offset1z = entry.z;

    const r2x = slot2.x * cos - slot2.y * sin;
    const r2y = slot2.x * sin + slot2.y * cos;
    entry.offset2x = entry.x + r2x;
    entry.offset2y = entry.y + r2y;
    entry.offset2z = entry.z;
  }

  /**
   * ProcessPoint — record leader position when moved enough / LOS broken.
   * Bearing is stored in radians (JS); is degrees.
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
    // ProcessPoint: clear (1) OR creature-block (-3) if party member
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
      // Insert last clear sample before continuing (wall-break branch)
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
      // ProcessPoint → SmoothFollowPath when party_count > 1
      const partyCount = GameState.PartyManager?.party?.length ?? 0;
      if(partyCount > 1 && this.count > 4 && this.needsSmoothDensify()){
        this.smoothFollowPath(area, leader);
      }
    }
  }

  /** True when any consecutive trail segment is longer than 1.0 (densify trigger). */
  private needsSmoothDensify(): boolean {
    if(this.count < 2) return false;
    let i = this.prevIndex(this.writeHead);
    for(let n = 0; n < this.count - 1; n++){
      const cur = this.points[i];
      const prev = this.points[this.prevIndex(i)];
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const dz = cur.z - prev.z;
      if(dx * dx + dy * dy + dz * dz > 1.0){
        return true;
      }
      i = this.prevIndex(i);
    }
    return false;
  }

  /**
   * Walk back along the center trail by `distance` (GetPointBackFromStart).
   * Uses leader path points (state), not lateral offsets.
   * `stopAtCursor` — stop if ring index hits member cursor.
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

    // Exhausted trail before covering `distance` — still return oldest point
    // (GetPointBackFromStart succeeds with the far end of the ring).
    out.set(x, y, z);
    return true;
  }

  /**
   * RecaulateFollowPoint
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
   * Recalc/Teleport use **center trail** points.
   */
  getFollowGoal(partyIndex: number, out: THREE.Vector3): boolean {
    if(partyIndex < 1 || partyIndex > 2) return false;
    if(this.count < 3) return false;
    out.copy(this.memberGoal[partyIndex]);
    return true;
  }

  /**
   * AdvancePointOnPath — walk center trail forward by
   * `budget` from `from` / member cursor toward Recalc goal / write head−1.
   * @returns remaining unused budget (≥0).
   */
  advancePointOnPath(
    budget: number,
    partyIndex: number,
    from: THREE.Vector3,
    outAdvanced: THREE.Vector3,
    outIndex: { value: number }
  ): number {
    outAdvanced.copy(from);
    const startCursor = this.memberCursor[partyIndex] ?? this.prevIndex(this.writeHead);
    outIndex.value = startCursor;
    if(partyIndex < 1 || partyIndex > 2 || this.count < 3 || budget <= 0){
      return Math.max(0, budget);
    }

    const goal = this.memberGoal[partyIndex];
    const goalIdx = this.memberGoalIndex[partyIndex] ?? this.prevIndex(this.writeHead);
    const budgetSq = budget * budget;
    const startX = from.x;
    const startY = from.y;
    const startZ = from.z;

    // : if Recalc goal is within original budget of start, snap
    const gdx = goal.x - startX;
    const gdy = goal.y - startY;
    const gdz = goal.z - startZ;
    if(gdx * gdx + gdy * gdy + gdz * gdz <= budgetSq){
      outAdvanced.copy(goal);
      outIndex.value = goalIdx;
      this.memberCursor[partyIndex] = goalIdx;
      return 0;
    }

    let remaining = budget;
    let x = startX;
    let y = startY;
    let z = startZ;
    let i = startCursor;
    if(i < 0 || i >= FOLLOW_RING_SIZE) i = this.prevIndex(this.writeHead);
    const writeLimit = this.prevIndex(this.writeHead);
    let steps = 0;

    while(remaining > 0 && steps < FOLLOW_RING_SIZE){
      steps++;
      const p = this.points[i];
      const sx = p.x - x;
      const sy = p.y - y;
      const sz = p.z - z;
      const segLen = Math.sqrt(sx * sx + sy * sy + sz * sz) || 0;
      const step = segLen <= remaining ? segLen : remaining;

      if(segLen > 1e-6){
        const t = step / segLen;
        x += sx * t;
        y += sy * t;
        z += sz * t;
      }
      outAdvanced.set(x, y, z);
      outIndex.value = i;

      // re-checks goal vs original start each iteration
      const ogx = goal.x - startX;
      const ogy = goal.y - startY;
      const ogz = goal.z - startZ;
      if(ogx * ogx + ogy * ogy + ogz * ogz <= budgetSq){
        outAdvanced.copy(goal);
        outIndex.value = goalIdx;
        this.memberCursor[partyIndex] = goalIdx;
        return Math.max(0, remaining - step);
      }

      if(segLen <= remaining + 1e-6){
        // Consumed full segment — advance cursor toward write head
        x = p.x; y = p.y; z = p.z;
        const next = i < FOLLOW_RING_SIZE - 1 ? i + 1 : 0;
        if(next === this.writeHead || i === writeLimit){
          this.memberCursor[partyIndex] = i;
          return Math.max(0, remaining - step);
        }
        i = next;
      }

      remaining -= step;
      if(remaining <= 0){
        this.memberCursor[partyIndex] = i;
        return 0;
      }
    }

    this.memberCursor[partyIndex] = i;
    return Math.max(0, remaining);
  }

  /**
   * Formation lateral at a ring center + bearing (Offset).
   */
  applyFormationLateral(
    partyIndex: number,
    centerX: number,
    centerY: number,
    centerZ: number,
    bearing: number,
    out: THREE.Vector3
  ): void {
    const cos = Math.cos(bearing);
    const sin = Math.sin(bearing);
    const offs = GameState.PartyManager?.getFormationOffsets?.();
    const slot = partyIndex === 2
      ? (offs?.[2] ?? DEFAULT_FORMATION_SLOT2)
      : (offs?.[1] ?? DEFAULT_FORMATION_SLOT1);
    const lx = Math.abs(slot.x) > 1e-4 || Math.abs(slot.y) > 1e-4
      ? slot
      : (partyIndex === 2 ? DEFAULT_FORMATION_SLOT2 : DEFAULT_FORMATION_SLOT1);
    out.set(
      centerX + (lx.x * cos - lx.y * sin),
      centerY + (lx.x * sin + lx.y * cos),
      centerZ
    );
  }

  /**
   * WaitingForPath / Offset approach goal — Recalc center + formation lateral
   * rotated by trail bearing (applies formation offsets).
   */
  getApproachGoal(partyIndex: number, out: THREE.Vector3): boolean {
    if(!this.getFollowGoal(partyIndex, out)) return false;
    const goalIdx = this.memberGoalIndex[partyIndex] ?? 0;
    const bearing = this.points[goalIdx]?.bearing ?? 0;
    this.applyFormationLateral(partyIndex, out.x, out.y, out.z, bearing, out);
    return true;
  }

  /**
   * Pick a WaitingForPath trail back-point into member goals.
   * @returns false if ring too cold or GetPointBack fails.
   */
  pickWaitingForPathGoal(partyIndex: number, outCenter: THREE.Vector3): boolean {
    if(partyIndex < 1 || partyIndex > 2) return false;
    if(this.count <= 4) return false;
    const idxBox = { value: 0 };
    const dist = this.getSlotFollowDistance(partyIndex);
    if(!this.getPointBackFromStart(dist, outCenter, idxBox)){
      return false;
    }
    this.memberGoal[partyIndex].copy(outCenter);
    this.memberGoalIndex[partyIndex] = idxBox.value;
    this.memberCursor[partyIndex] = idxBox.value;
    return true;
  }

  /**
   * SmoothFollowPath — string-pull densify (≥1m steps) then Recalc.
   * Called from ProcessPoint when party_count > 1 and ring is warm enough.
   */
  smoothFollowPath(area?: ModuleArea, leader?: ModuleCreature): void {
    if(this.count < 3) return;

    const endIdx = this.prevIndex(this.writeHead);
    let startIdx = this.memberGoalIndex[1] || this.memberGoalIndex[2] || 0;
    // Walk back to oldest valid sample when cursors unset
    if(this.count < FOLLOW_RING_SIZE){
      startIdx = 0;
    }

    const ordered: FollowPathPoint[] = [];
    let i = startIdx;
    for(let n = 0; n < this.count; n++){
      ordered.push(this.points[i]);
      if(i === endIdx) break;
      i = i < FOLLOW_RING_SIZE - 1 ? i + 1 : 0;
    }
    if(ordered.length < 2) return;

    // String-pull: keep points where LOS to previous kept point breaks
    const kept: { x: number; y: number; z: number; bearing: number }[] = [
      {
        x: ordered[0].x,
        y: ordered[0].y,
        z: ordered[0].z,
        bearing: ordered[0].bearing,
      },
    ];
    let lastKept = 0;
    for(let n = 1; n < ordered.length; n++){
      const from = ordered[lastKept];
      const to = ordered[n];
      this._tmp.set(from.x, from.y, from.z);
      this._tmp2.set(to.x, to.y, to.z);
      let los = true;
      if(area && leader){
        const hit = testDirectLine(area, this._tmp, this._tmp2, {
          owner: leader,
          allowPartyCreatures: true,
        });
        los =
          hit.ok ||
          hit.code === TestDirectLineCode.Ok ||
          (hit.code === TestDirectLineCode.Creature &&
            hit.blockingCreatureId != null &&
            isPartyId(hit.blockingCreatureId));
      }
      if(!los){
        // Commit previous string-pull tip (n-1) then continue from there
        if(n - 1 > lastKept){
          const tip = ordered[n - 1];
          this.appendDensified(
            kept,
            kept[kept.length - 1].x,
            kept[kept.length - 1].y,
            kept[kept.length - 1].z,
            tip.x, tip.y, tip.z,
            tip.bearing
          );
          lastKept = n - 1;
        }
        this.appendDensified(
          kept,
          kept[kept.length - 1].x,
          kept[kept.length - 1].y,
          kept[kept.length - 1].z,
          to.x, to.y, to.z,
          to.bearing
        );
        lastKept = n;
      }else if(n === ordered.length - 1){
        this.appendDensified(
          kept,
          kept[kept.length - 1].x,
          kept[kept.length - 1].y,
          kept[kept.length - 1].z,
          to.x, to.y, to.z,
          to.bearing
        );
      }
    }

    if(kept.length < 2) return;

    // Rewrite ring from densified trail
    this.writeHead = 0;
    this.count = 0;
    this.hasLastClear = false;
    this.memberCursor = [0, 0, 0];
    for(let n = 0; n < kept.length && n < FOLLOW_RING_SIZE; n++){
      const pt = kept[n];
      this.pushPoint(pt.x, pt.y, pt.z, pt.bearing);
    }
    const last = kept[kept.length - 1];
    this.lastClear.set(last.x, last.y, last.z);
    this.hasLastClear = true;
    this.recalculateFollowPoints();
  }

  /** Densify so consecutive points advance ≤1.0 (SmoothFollowPath unit steps). */
  private appendDensified(
    out: { x: number; y: number; z: number; bearing: number }[],
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    bearing: number
  ){
    let x = ax;
    let y = ay;
    let z = az;
    for(;;){
      const dx = bx - x;
      const dy = by - y;
      const dz = bz - z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if(dist <= 1e-5){
        return;
      }
      if(dist <= 1.0){
        out.push({ x: bx, y: by, z: bz, bearing });
        return;
      }
      const inv = 1 / dist;
      x += dx * inv;
      y += dy * inv;
      z += dz * inv;
      out.push({ x, y, z, bearing });
    }
  }

  /**
   * TeleportForward — advance center-trail ring until TestSafeLocationPoint.
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
      // uses center trail, not lateral offsets
      this._tmp.set(p.x, p.y, p.z);

      // Party trail probes allow overlapping party (follow TeleportForward).
      if(!testSafeLocationPoint(area, this._tmp, undefined, {
        allowPartyCreatures: true,
      })){
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
