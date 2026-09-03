/**
 * WalkHitInfo AABB fill (G11).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import {
  createWalkHitInfo,
  setHitInfoForAabb,
  WalkHitKind,
} from "@/engine/pathfinding/walk-hit-info";

describe("setHitInfoForAabb (G11)", () => {
  it("fills Edge hit with objectId when segment crosses box", () => {
    const box = {
      min: new THREE.Vector3(1, -1, 0),
      max: new THREE.Vector3(2, 1, 2),
    };
    const hit = createWalkHitInfo();
    const ok = setHitInfoForAabb(
      box,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3, 0, 0),
      hit,
      42
    );
    expect(ok).toBe(true);
    expect(hit.kind).toBe(WalkHitKind.Edge);
    expect(hit.objectId).toBe(42);
    expect(hit.hitPoint.x).toBeGreaterThanOrEqual(1);
    expect(hit.hitPoint.x).toBeLessThanOrEqual(2);
  });
});
