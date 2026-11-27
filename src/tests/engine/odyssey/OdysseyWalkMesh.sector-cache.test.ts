/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";
import { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import { OdysseyFace3 } from "@engine/render/three/odyssey/OdysseyFace3";
import { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";

function makeFace(wok: OdysseyWalkMesh, a: number, b: number, c: number): OdysseyFace3 {
  const face = new OdysseyFace3(a, b, c);
  face.walkmesh = wok;
  face.walkIndex = 0;
  face.triangle = new THREE.Triangle(wok.vertices[a], wok.vertices[b], wok.vertices[c]);
  face.normal = new THREE.Vector3(0, 0, 1);
  face.computeBoundingBox?.();
  // Ensure faceOverlapsBox has a usable box via triangle verts
  (face as any).box = new THREE.Box3().setFromPoints([
    wok.vertices[a], wok.vertices[b], wok.vertices[c],
  ]);
  return face;
}

function makeEdge(
  wok: OdysseyWalkMesh,
  index: number,
  start: THREE.Vector3,
  end: THREE.Vector3
): WalkmeshEdge {
  const edge = new WalkmeshEdge(-1);
  edge.setWalkmesh(wok);
  edge.index = index;
  edge.line.start.copy(start);
  edge.line.end.copy(end);
  edge.box.makeEmpty();
  edge.box.expandByPoint(start);
  edge.box.expandByPoint(end);
  edge.line.at(0.5, edge.center_point);
  wok.edges.set(index, edge);
  return edge;
}

describe("OdysseyWalkMesh sector cache", () => {
  it("nested boxes in the same 1m sector reuse one AABB descent", () => {
    const wok = new OdysseyWalkMesh();
    wok.vertices = [
      new THREE.Vector3(0.1, 0.1, 0),
      new THREE.Vector3(0.9, 0.1, 0),
      new THREE.Vector3(0.5, 0.9, 0),
    ];
    const face = makeFace(wok, 0, 1, 2);
    wok.faces = [face];

    const collectSpy = jest.spyOn(wok as any, "collectAABBFaces");
    // Force linear path so we can count faceOverlapsBox on sector miss vs hit
    wok.aabbRoot = undefined as any;
    const overlapSpy = jest.spyOn(wok as any, "faceOverlapsBox");

    const outer = new THREE.Box3(
      new THREE.Vector3(0.05, 0.05, -0.1),
      new THREE.Vector3(0.95, 0.95, 0.1)
    );
    const inner = new THREE.Box3(
      new THREE.Vector3(0.2, 0.2, -0.05),
      new THREE.Vector3(0.8, 0.8, 0.05)
    );

    const first = wok.getFacesInBox(outer);
    expect(first).toContain(face);
    const sectorOverlaps = overlapSpy.mock.calls.length;

    overlapSpy.mockClear();
    const second = wok.getFacesInBox(inner);
    expect(second).toContain(face);
    // Hit path only filters the sector superset against the exact box —
    // no second full-mesh sector scan (1 face vs faces+sector).
    expect(overlapSpy.mock.calls.length).toBeLessThan(sectorOverlaps);
    expect(collectSpy).not.toHaveBeenCalled();
  });

  it("boxes outside a cached sector miss and do not return foreign faces", () => {
    const wok = new OdysseyWalkMesh();
    wok.vertices = [
      new THREE.Vector3(0.1, 0.1, 0),
      new THREE.Vector3(0.9, 0.1, 0),
      new THREE.Vector3(0.5, 0.9, 0),
      new THREE.Vector3(5.1, 0.1, 0),
      new THREE.Vector3(5.9, 0.1, 0),
      new THREE.Vector3(5.5, 0.9, 0),
    ];
    const nearFace = makeFace(wok, 0, 1, 2);
    const farFace = makeFace(wok, 3, 4, 5);
    wok.faces = [nearFace, farFace];
    wok.aabbRoot = undefined as any;

    const nearQuery = new THREE.Box3(
      new THREE.Vector3(0, 0, -0.1),
      new THREE.Vector3(1, 1, 0.1)
    );
    const farQuery = new THREE.Box3(
      new THREE.Vector3(5, 0, -0.1),
      new THREE.Vector3(6, 1, 0.1)
    );

    expect(wok.getFacesInBox(nearQuery)).toEqual([nearFace]);
    expect(wok.getFacesInBox(farQuery)).toEqual([farFace]);
    expect(wok.getFacesInBox(nearQuery)).toEqual([nearFace]);
  });

  it("exact filtering keeps sector supersets from introducing false hits", () => {
    const wok = new OdysseyWalkMesh();
    wok.vertices = [
      new THREE.Vector3(0.1, 0.1, 0),
      new THREE.Vector3(0.4, 0.1, 0),
      new THREE.Vector3(0.25, 0.4, 0),
      new THREE.Vector3(0.6, 0.6, 0),
      new THREE.Vector3(0.9, 0.6, 0),
      new THREE.Vector3(0.75, 0.9, 0),
    ];
    const a = makeFace(wok, 0, 1, 2);
    const b = makeFace(wok, 3, 4, 5);
    wok.faces = [a, b];
    wok.aabbRoot = undefined as any;

    // Both faces live in sector [0,1]^3; exact box only covers face a.
    const warm = new THREE.Box3(
      new THREE.Vector3(0.05, 0.05, -0.1),
      new THREE.Vector3(0.95, 0.95, 0.1)
    );
    const tight = new THREE.Box3(
      new THREE.Vector3(0.05, 0.05, -0.1),
      new THREE.Vector3(0.45, 0.45, 0.1)
    );

    expect(wok.getFacesInBox(warm)).toEqual(expect.arrayContaining([a, b]));
    expect(wok.getFacesInBox(tight)).toEqual([a]);
  });

  it("updateMatrix invalidates sector caches", () => {
    const wok = new OdysseyWalkMesh();
    wok.vertices = [
      new THREE.Vector3(0.1, 0.1, 0),
      new THREE.Vector3(0.9, 0.1, 0),
      new THREE.Vector3(0.5, 0.9, 0),
    ];
    wok._vertices = wok.vertices.map((v) => v.clone());
    wok.normals = [new THREE.Vector3(0, 0, 1)];
    wok._normals = [new THREE.Vector3(0, 0, 1)];
    const face = makeFace(wok, 0, 1, 2);
    face.centroid = new THREE.Vector3();
    wok.faces = [face];
    wok.mat4 = new THREE.Matrix4();
    wok.aabbRoot = undefined as any;
    wok.edges = new Map();

    const query = new THREE.Box3(
      new THREE.Vector3(0, 0, -0.1),
      new THREE.Vector3(1, 1, 0.1)
    );
    expect(wok.getFacesInBox(query)).toContain(face);

    const cache = (wok as any)._faceSectorCache as Map<number, unknown>;
    expect(cache.size).toBeGreaterThan(0);

    wok.updateMatrix();
    expect((wok as any)._faceSectorCache.size).toBe(0);
  });

  it("edge sector cache reuses nested queries", () => {
    const wok = new OdysseyWalkMesh();
    makeEdge(wok, 0, new THREE.Vector3(0.2, 0, 0), new THREE.Vector3(0.8, 0, 0));
    makeEdge(wok, 1, new THREE.Vector3(10, 0, 0), new THREE.Vector3(11, 0, 0));
    wok.buildEdgeAABBTree();

    const outer = new THREE.Box3(
      new THREE.Vector3(0, -0.5, -0.5),
      new THREE.Vector3(1, 0.5, 0.5)
    );
    const inner = new THREE.Box3(
      new THREE.Vector3(0.1, -0.2, -0.2),
      new THREE.Vector3(0.9, 0.2, 0.2)
    );

    const first = wok.getEdgesInBox(outer);
    expect(first.map((e) => e.index)).toEqual([0]);
    const cache = (wok as any)._edgeSectorCache as Map<number, unknown>;
    expect(cache.size).toBe(1);

    const second = wok.getEdgesInBox(inner);
    expect(second.map((e) => e.index)).toEqual([0]);
    expect(cache.size).toBe(1);
  });
});
