/**
 * CM-style multi-edge wall slide (perimeter vertex stuck).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));

import {
  collectBlockingWalkEdgeNormals,
  distancePointToSegment2d,
  mostOpposingNormal,
  projectDesiredOntoNormals,
} from "@engine/movement/wall-slide";
import type { Area } from "@engine/module/Area";
import type { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";

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

describe("projectDesiredOntoNormals (exact)", () => {
  it("projects onto the single binding wall in an obtuse corner", () => {
    // Walls with outward normals +Y and (−0.5, 0.866) (120° apart).
    const n1 = new THREE.Vector3(0, 1, 0);
    const n2 = new THREE.Vector3(-0.5, Math.sqrt(3) / 2, 0);
    const out = new THREE.Vector3();
    // Desired east + slightly down: violates +Y only.
    projectDesiredOntoNormals(1, -0.1, [n1, n2], out);
    // Projection onto y=0 is (1,0), but it violates n2 → must be zero or
    // satisfy both constraints exactly.
    expect(out.x * n1.x + out.y * n1.y).toBeGreaterThanOrEqual(-1e-9);
    expect(out.x * n2.x + out.y * n2.y).toBeGreaterThanOrEqual(-1e-9);
  });

  it("leaves no residual into-wall motion at an acute (60°) wedge", () => {
    const n1 = new THREE.Vector3(0, 1, 0);
    const n2 = new THREE.Vector3(Math.sqrt(3) / 2, -0.5, 0);
    const out = new THREE.Vector3();
    projectDesiredOntoNormals(-1, -0.2, [n1, n2], out);
    expect(out.x * n1.x + out.y * n1.y).toBeGreaterThanOrEqual(-1e-9);
    expect(out.x * n2.x + out.y * n2.y).toBeGreaterThanOrEqual(-1e-9);
  });

  it("keeps the longest feasible slide in a corridor (opposing normals)", () => {
    const out = new THREE.Vector3();
    projectDesiredOntoNormals(
      0.4,
      0.3,
      [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0)],
      out
    );
    expect(out.x).toBeCloseTo(0.4);
    expect(out.y).toBeCloseTo(0);
  });

  it("returns desired untouched when it already satisfies every wall", () => {
    const out = new THREE.Vector3();
    projectDesiredOntoNormals(0.2, 0.5, [new THREE.Vector3(0, 1, 0)], out);
    expect(out.x).toBeCloseTo(0.2);
    expect(out.y).toBeCloseTo(0.5);
  });
});

describe("mostOpposingNormal", () => {
  it("picks the wall pushed into hardest", () => {
    const out = new THREE.Vector3();
    const ok = mostOpposingNormal(
      1,
      -0.1,
      [new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)],
      out
    );
    expect(ok).toBe(true);
    expect(out.x).toBeCloseTo(-1);
  });
});

describe("collectBlockingWalkEdgeNormals contact normals", () => {
  it("ignores a wall whose line the point is behind (reflex/pillar corner)", () => {
    // Pillar occupies x<0,y<0. Horizontal wall along y=0 for x∈[-5,0] (+Y),
    // vertical wall along x=0 for y∈[-5,0] (+X).
    const top = makeWallEdge(-5, 0, 0, 0, 0, 1);
    const side = makeWallEdge(0, 0, 0, -5, 1, 0);
    const area = { walkEdges: [top, side] } as unknown as Area;
    // Beside the vertical wall, below the top wall's line.
    const normals = collectBlockingWalkEdgeNormals(
      area,
      new THREE.Vector3(0.2, -0.3, 0),
      0.4
    );
    expect(normals.length).toBe(1);
    expect(normals[0].x).toBeCloseTo(1);
    expect(normals[0].y).toBeCloseTo(0);
  });

  it("uses vertex→point normal past a wall endpoint (round corners)", () => {
    const wall = makeWallEdge(-5, 0, 0, 0, 0, 1);
    const area = { walkEdges: [wall] } as unknown as Area;
    const normals = collectBlockingWalkEdgeNormals(
      area,
      new THREE.Vector3(0.2, 0.2, 0),
      0.4
    );
    expect(normals.length).toBe(1);
    expect(normals[0].x).toBeCloseTo(Math.SQRT1_2);
    expect(normals[0].y).toBeCloseTo(Math.SQRT1_2);
  });

  it("keeps the nearer contact's normal when near-parallel contacts merge", () => {
    // Live end_m01ab: Nonwalk sliver edge A (78.88,76.28)→(79.06,75.60) at
    // 0.349, plus the neighbouring edge's end vertex (78.88,76.28) at 0.3497
    // whose vertex normal is ~2.3° off. Keeping the vertex normal made the
    // slide tangent drift into edge A, so every probe blocked (player stuck).
    const vertexEdge = makeWallEdge(78.22, 76.64, 78.88, 76.28, 0.48, 0.88);
    const edgeA = makeWallEdge(78.88, 76.28, 79.06, 75.6, 0.967, 0.256);
    const pt = new THREE.Vector3(79.222, 76.353, 0);
    for(const order of [[vertexEdge, edgeA], [edgeA, vertexEdge]]){
      const dists: number[] = [];
      const normals = collectBlockingWalkEdgeNormals(
        { walkEdges: order } as unknown as Area,
        pt,
        0.41,
        undefined,
        dists
      );
      expect(normals.length).toBe(1);
      expect(normals[0].x).toBeCloseTo(0.967, 2);
      expect(normals[0].y).toBeCloseTo(0.256, 2);
      expect(dists[0]).toBeCloseTo(
        distancePointToSegment2d(pt.x, pt.y, 78.88, 76.28, 79.06, 75.6),
        6
      );
    }
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
    } as unknown as Area;

    const pt = new THREE.Vector3(111.7, 100.16, 0);
    const normals = collectBlockingWalkEdgeNormals(area, pt, 0.4);
    expect(normals.length).toBe(1);
    expect(normals[0].x).toBeCloseTo(0);
    expect(normals[0].y).toBeCloseTo(1);
  });

  it("ignores edges farther than radius", () => {
    const far = makeWallEdge(0, 0, 10, 0, 0, 1);
    const area = { walkEdges: [far] } as unknown as Area;
    const normals = collectBlockingWalkEdgeNormals(
      area,
      new THREE.Vector3(50, 50, 0),
      0.4
    );
    expect(normals.length).toBe(0);
  });
});

describe("projectDesiredOntoNormals with clearance gaps", () => {
  it("allows motion toward a wall up to its gap", () => {
    const out = new THREE.Vector3();
    // Wall 0.03 away (normal +Y); want to move 0.02 into it → fully allowed.
    projectDesiredOntoNormals(0, -0.02, [new THREE.Vector3(0, 1, 0)], out, [0.03]);
    expect(out.y).toBeCloseTo(-0.02);
  });

  it("clamps motion at the gap boundary", () => {
    const out = new THREE.Vector3();
    projectDesiredOntoNormals(0.1, -0.1, [new THREE.Vector3(0, 1, 0)], out, [0.03]);
    expect(out.x).toBeCloseTo(0.1);
    expect(out.y).toBeCloseTo(-0.03);
  });

  it("lands on the vertex of two gapped walls", () => {
    const out = new THREE.Vector3();
    projectDesiredOntoNormals(
      -1,
      -1,
      [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)],
      out,
      [0.02, 0.05]
    );
    expect(out.x).toBeCloseTo(-0.05);
    expect(out.y).toBeCloseTo(-0.02);
  });

  it("returns contact distances in parallel with normals", () => {
    const wall = makeWallEdge(0, 0, 10, 0, 0, 1);
    const area = { walkEdges: [wall] } as unknown as Area;
    const dists: number[] = [];
    const normals = collectBlockingWalkEdgeNormals(
      area,
      new THREE.Vector3(5, 0.43, 0),
      0.4,
      [],
      dists
    );
    expect(normals.length).toBe(1);
    expect(dists[0]).toBeCloseTo(0.43);
  });
});
