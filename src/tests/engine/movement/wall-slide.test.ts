/**
 * CM-style multi-edge wall slide (perimeter vertex stuck).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/GameState", () => ({ GameState: {} }));

import {
  collectBlockingWalkEdgeNormals,
  distancePointToSegment2d,
  projectDesiredOntoNormals,
} from "@/engine/movement/wall-slide";
import type { ModuleArea } from "@/module/ModuleArea";
import type { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";

function makeWallEdge(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  transition = -1
): WalkmeshEdge {
  return {
    transition,
    line: new THREE.Line3(
      new THREE.Vector3(ax, ay, 0),
      new THREE.Vector3(bx, by, 0)
    ),
    normal: new THREE.Vector3(nx, ny, 0),
  } as WalkmeshEdge;
}

describe("distancePointToSegment2d", () => {
  it("measures distance to a horizontal wall segment", () => {
    expect(distancePointToSegment2d(111.94, 100.16, 111.7, 99.75, 120.75, 99.75)).toBeCloseTo(
      0.41,
      1
    );
  });
});

describe("projectDesiredOntoNormals", () => {
  it("keeps along-wall motion for collinear north-facing walls", () => {
    const normals = [
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0),
    ];
    const out = new THREE.Vector3();
    // East + into wall (south) — live m02ac_02c vertex case
    projectDesiredOntoNormals(0.35, -0.2, normals, out);
    expect(out.x).toBeCloseTo(0.35);
    expect(out.y).toBeCloseTo(0);
  });

  it("does not use a bad mesh corner ±X normal", () => {
    // Walk edges say [0,1]; mesh would have said [-1,0] and cancelled X.
    const out = new THREE.Vector3();
    projectDesiredOntoNormals(0.35, -0.2, [new THREE.Vector3(0, 1, 0)], out);
    expect(out.x).toBeGreaterThan(0.3);
    expect(Math.abs(out.y)).toBeLessThan(1e-6);

    const bad = new THREE.Vector3();
    projectDesiredOntoNormals(0.35, -0.2, [new THREE.Vector3(-1, 0, 0)], bad);
    expect(Math.abs(bad.x)).toBeLessThan(0.01);
    expect(bad.y).toBeCloseTo(-0.2);
  });

  it("zeros motion into an L-corner choke", () => {
    const out = new THREE.Vector3();
    // Into both walls (south + west) with outward normals +Y / +X
    projectDesiredOntoNormals(
      -1,
      -1,
      [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)],
      out
    );
    expect(Math.hypot(out.x, out.y)).toBeLessThan(1e-6);
  });
});

describe("collectBlockingWalkEdgeNormals", () => {
  it("collects collinear perimeter edges at a shared vertex and dedupes normals", () => {
    // Live-style: two walls meet at x=111.7, y=99.75, both normal +Y
    const west = makeWallEdge(104.25, 99.75, 111.7, 99.75, 0, 1);
    const east = makeWallEdge(111.7, 99.75, 120.75, 99.75, 0, 1);
    const portal = makeWallEdge(111.7, 99.75, 111.7, 95, 1, 0, 3); // transition — skip
    const area = {
      walkEdges: [west, east, portal],
    } as unknown as ModuleArea;

    const pt = new THREE.Vector3(111.7, 100.16, 0);
    const normals = collectBlockingWalkEdgeNormals(area, pt, 0.4);
    expect(normals.length).toBe(1);
    expect(normals[0].x).toBeCloseTo(0);
    expect(normals[0].y).toBeCloseTo(1);
  });

  it("ignores edges farther than radius", () => {
    const far = makeWallEdge(0, 0, 10, 0, 0, 1);
    const area = { walkEdges: [far] } as unknown as ModuleArea;
    const normals = collectBlockingWalkEdgeNormals(
      area,
      new THREE.Vector3(50, 50, 0),
      0.4
    );
    expect(normals.length).toBe(0);
  });
});
