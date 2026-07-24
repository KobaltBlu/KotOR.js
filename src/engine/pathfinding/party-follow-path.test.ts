/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: {
      getFormationOffsets: () => [
        { x: 0, y: 0 },
        { x: 1.5, y: -0.7 },
        { x: -1.5, y: 0.8 },
      ],
    },
    ModuleObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  testDirectLine: () => ({
    ok: true,
    code: 1,
    clearPoint: new THREE.Vector3(),
    clearT: 1,
  }),
  TestDirectLineCode: { Ok: 1, NonWalk: 2, Creature: -3 },
  hasDirectLine: () => true,
}));

jest.mock("@/engine/pathfinding/test-safe-location-point", () => ({
  testSafeLocationPoint: () => true,
}));

import { PartyFollowPath } from "@/engine/pathfinding/party-follow-path";
import type { ModuleCreature } from "@/module/ModuleCreature";

describe("ProcessPoint formation laterals", () => {
  it("stamps offset1/2 on writeHead−2 after count≥3 via formation locals", () => {
    const ring = new PartyFollowPath();
    const leader = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
    } as unknown as ModuleCreature;

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
    } as unknown as ModuleCreature;

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
