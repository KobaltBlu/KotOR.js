/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: {
      getFormationOffsets: () => [
        { x: 0, y: 0 },
        { x: 1.5, y: -0.7 },
        { x: -1.5, y: 0.8 },
      ],
    },
    GameObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

jest.mock("@engine/pathfinding/drive-step-clear", () => ({
  probeDriveStepClear: () => ({
    clear: true,
    clearT: 1,
    clearPoint: new THREE.Vector3(),
    code: 1,
    normal: new THREE.Vector3(0, 0, 1),
  }),
  getDriveProbeCount: () => 0,
  resetDriveProbeCount: () => undefined,
}));

jest.mock("@engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: () => ({ clear: true }),
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.5,
}));

jest.mock("@engine/pathfinding/safe-walk-point", () => ({
  isSafeWalkPoint: () => true,
}));

import { PartyFollowPath } from "@engine/pathfinding/party-follow-path";
import type { Creature } from "@engine/module/Creature";

describe("ProcessPoint formation laterals", () => {
  it("stamps offset1/2 on writeHead−2 after count≥3 via formation locals", () => {
    const ring = new PartyFollowPath();
    const leader = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
    } as unknown as Creature;

    ring.processPoint(leader, undefined);
    leader.position.set(1, 0, 0);
    ring.processPoint(leader, undefined);
    leader.position.set(2, 0, 0);
    ring.processPoint(leader, undefined);

    expect(ring.count).toBeGreaterThanOrEqual(3);

    // writeHead−2 = index 1 (centers at 0,1,2; writeHead=3)
    const entry = ring.points[1];
    expect(entry.x).toBeCloseTo(1, 5);
    expect(entry.y).toBeCloseTo(0, 5);
    // bearing of writeHead−1 is 0 → identity rotation of pattern-0 locals
    expect(entry.offset1x).toBeCloseTo(1 + 1.5, 5);
    expect(entry.offset1y).toBeCloseTo(0 + -0.7, 5);
    expect(entry.offset2x).toBeCloseTo(1 + -1.5, 5);
    expect(entry.offset2y).toBeCloseTo(0 + 0.8, 5);
  });

  it("rotates formation locals by trail bearing", () => {
    const ring = new PartyFollowPath();
    const leader = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: Math.PI / 2 },
    } as unknown as Creature;

    ring.processPoint(leader, undefined);
    leader.position.set(0, 1, 0);
    ring.processPoint(leader, undefined);
    leader.position.set(0, 2, 0);
    ring.processPoint(leader, undefined);

    const entry = ring.points[1];
    const bearing = Math.PI / 2;
    const cos = Math.cos(bearing);
    const sin = Math.sin(bearing);
    const s1 = { x: 1.5, y: -0.7 };
    const r1x = s1.x * cos - s1.y * sin;
    const r1y = s1.x * sin + s1.y * cos;
    expect(entry.offset1x).toBeCloseTo(entry.x + r1x, 5);
    expect(entry.offset1y).toBeCloseTo(entry.y + r1y, 5);
  });
});

describe("advancePointOnPath", () => {
  it("advances toward the goal cursor by budget and clamps when within budget", () => {
    const ring = new PartyFollowPath();
    const leader = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
    } as unknown as Creature;

    for(let i = 0; i < 25; i++){
      leader.position.set(i * 0.6, 0, 0);
      ring.processPoint(leader, undefined);
    }
    ring.recalculateFollowPoints();

    const goal = new THREE.Vector3();
    expect(ring.getFollowGoal(1, goal)).toBe(true);
    // Point cursor at the Recalc goal ring index so we walk toward it
    ring.memberCursor[1] = ring.memberGoalIndex[1];

    const from = goal.clone();
    from.x -= 2.0;

    const out = new THREE.Vector3();
    const idx = { value: 0 };
    const left = ring.advancePointOnPath(1.0, 1, from, out, idx);

    expect(out.x).toBeGreaterThan(from.x);
    expect(out.x).toBeLessThanOrEqual(goal.x + 1e-4);
    expect(left).toBeGreaterThanOrEqual(0);

    // Large budget snaps to Recalc goal
    const snapped = new THREE.Vector3();
    const idx2 = { value: 0 };
    ring.advancePointOnPath(50, 1, from, snapped, idx2);
    expect(snapped.x).toBeCloseTo(goal.x, 4);
    expect(snapped.y).toBeCloseTo(goal.y, 4);
  });
});
