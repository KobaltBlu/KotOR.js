/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    ModuleObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  hasClearWalkLine: () => true,
}));

import {
  densifyPathPoints,
  densifyPathPointsRestartable,
  smoothSelectionRestartable,
} from "@engine/pathfinding/smooth-select-nodes";

describe("densifyPathPointsRestartable", () => {
  function longPolyline(n: number, spacing = 3): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for(let i = 0; i < n; i++){
      pts.push(new THREE.Vector3(i * spacing, 0, 0));
    }
    return pts;
  }

  it("matches sync densifyPathPoints when uninterrupted", () => {
    const src = longPolyline(6, 6);
    const full = densifyPathPoints(src, 1.0, 5.0);
    const sliced = densifyPathPointsRestartable(src, 1.0, 5.0);
    expect(sliced.timedOut).toBe(false);
    expect(sliced.densifyStackDepth).toBe(-1);
    expect(sliced.points.length).toBe(full.length);
    for(let i = 0; i < full.length; i++){
      expect(sliced.points[i].distanceTo(full[i])).toBeLessThan(1e-6);
    }
  });

  it("mid-edge abort then resume matches full densify", () => {
    const src = longPolyline(5, 8);
    const full = densifyPathPoints(src, 1.0, 5.0);

    let calls = 0;
    const first = densifyPathPointsRestartable(src, 1.0, 5.0, {
      shouldAbort: () => {
        calls++;
        return calls > 3;
      },
    });
    expect(first.timedOut).toBe(true);
    expect(first.points.length).toBeLessThan(full.length);

    const second = densifyPathPointsRestartable(src, 1.0, 5.0, {
      working: first.points,
      srcIndex: first.srcIndex,
      densifyStack: first.densifyStack,
      densifyStackDepth: first.densifyStackDepth,
    });
    expect(second.timedOut).toBe(false);
    expect(second.points.length).toBe(full.length);
    for(let i = 0; i < full.length; i++){
      expect(second.points[i].distanceTo(full[i])).toBeLessThan(1e-6);
    }
  });
});

describe("smoothSelectionRestartable densify resume", () => {
  it("zero-budget abort then full budget completes same endpoint count", () => {
    const pts: THREE.Vector3[] = [];
    for(let i = 0; i < 8; i++){
      pts.push(new THREE.Vector3(i * 6, 0, 0));
    }
    const area = {} as any;

    const full = smoothSelectionRestartable(area, pts, undefined, {
      timeBudgetMs: 1e9,
    });
    expect(full.timedOut).toBe(false);

    const first = smoothSelectionRestartable(area, pts, undefined, {
      timeBudgetMs: 0,
    });
    expect(first.timedOut).toBe(true);
    expect(first.resume).toBeDefined();

    const second = smoothSelectionRestartable(area, pts, undefined, {
      timeBudgetMs: 1e9,
      resume: first.resume,
    });
    expect(second.timedOut).toBe(false);
    expect(second.points.length).toBe(full.points.length);
  });
});
