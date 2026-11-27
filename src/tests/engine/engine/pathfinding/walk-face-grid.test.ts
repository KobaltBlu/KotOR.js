/**
 * WalkFaceGrid must return exactly what a front-to-back pointInFace2d scan returns.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as THREE from 'three';
import {
  WalkFaceGrid,
  getWalkFaceGrid,
  noteWalkmeshGeometryChanged,
} from '@engine/pathfinding/walk-face-grid';

type Vtx = { x: number; y: number };

class Mesh {
  geometryVersion = 0;
  constructor(public vertices: Vtx[]) {}
}

class Face {
  constructor(public walkmesh: Mesh, public a: number, public b: number, public c: number) {}
  pointInFace2d(pt: THREE.Vector3): boolean {
    const v1 = this.walkmesh.vertices[this.a];
    const v2 = this.walkmesh.vertices[this.b];
    const v3 = this.walkmesh.vertices[this.c];
    const sign = (p1: Vtx, p2: Vtx, p3: Vtx) =>
      (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign(pt, v1, v2);
    const d2 = sign(pt, v2, v3);
    const d3 = sign(pt, v3, v1);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }
}

/** Deterministic PRNG so failures reproduce. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function linearFirst(faces: Face[], p: THREE.Vector3): number {
  for (let i = 0; i < faces.length; i++) {
    if (faces[i]?.pointInFace2d(p)) return i;
  }
  return -1;
}

function linearAll(faces: Face[], p: THREE.Vector3): number[] {
  const out: number[] = [];
  for (let i = 0; i < faces.length; i++) if (faces[i]?.pointInFace2d(p)) out.push(i);
  return out;
}

function gridAll(grid: WalkFaceGrid, p: THREE.Vector3): number[] {
  const out: number[] = [];
  for (let i = grid.nextFaceIndexAt(p); i >= 0; i = grid.nextFaceIndexAt(p, i)) out.push(i);
  return out;
}

/** Overlapping random triangles across two meshes (multi-room seams / stacked floors). */
function randomFaces(seed: number, count: number): Face[] {
  const r = rng(seed);
  const meshes = [new Mesh([]), new Mesh([])];
  const faces: Face[] = [];
  for (let i = 0; i < count; i++) {
    const m = meshes[i % 2];
    const cx = r() * 60 - 30, cy = r() * 60 - 30, s = 0.2 + r() * 5;
    const base = m.vertices.length;
    m.vertices.push(
      { x: cx + (r() - 0.5) * s, y: cy + (r() - 0.5) * s },
      { x: cx + (r() - 0.5) * s, y: cy + (r() - 0.5) * s },
      { x: cx + (r() - 0.5) * s, y: cy + (r() - 0.5) * s },
    );
    faces.push(new Face(m, base, base + 1, base + 2));
  }
  return faces;
}

describe('WalkFaceGrid', () => {
  it('matches the linear scan for first and all matches on random overlapping faces', () => {
    const faces = randomFaces(7, 400);
    const grid = new WalkFaceGrid(faces);
    const r = rng(99);
    const p = new THREE.Vector3();
    for (let n = 0; n < 5000; n++) {
      p.set(r() * 80 - 40, r() * 80 - 40, 0);
      expect(grid.nextFaceIndexAt(p)).toBe(linearFirst(faces, p));
      expect(gridAll(grid, p)).toEqual(linearAll(faces, p));
    }
  });

  it('matches points exactly on vertices and cell boundaries', () => {
    const faces = randomFaces(3, 200);
    const grid = new WalkFaceGrid(faces);
    const p = new THREE.Vector3();
    for (const f of faces) {
      for (const v of [f.walkmesh.vertices[f.a], f.walkmesh.vertices[f.b], f.walkmesh.vertices[f.c]]) {
        p.set(v.x, v.y, 0);
        expect(gridAll(grid, p)).toEqual(linearAll(faces, p));
      }
    }
    for (let x = -30; x <= 30; x += 2) {
      for (let y = -30; y <= 30; y += 2) {
        p.set(x, y, 0);
        expect(gridAll(grid, p)).toEqual(linearAll(faces, p));
      }
    }
  });

  it('keeps NaN-vertex faces matching everywhere, in source order', () => {
    const faces = randomFaces(11, 50);
    const poisoned = new Face(new Mesh([{ x: NaN, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]), 0, 1, 2);
    faces.splice(20, 0, poisoned);
    const grid = new WalkFaceGrid(faces);
    const p = new THREE.Vector3(1000, -1000, 0); // far outside every real face
    expect(linearFirst(faces, p)).toBe(20);
    expect(grid.nextFaceIndexAt(p)).toBe(20);
    const r = rng(5);
    for (let n = 0; n < 1000; n++) {
      p.set(r() * 80 - 40, r() * 80 - 40, 0);
      expect(gridAll(grid, p)).toEqual(linearAll(faces, p));
    }
  });

  it('treats a NaN query point like the linear scan', () => {
    const faces = randomFaces(13, 30);
    const grid = new WalkFaceGrid(faces);
    const p = new THREE.Vector3(NaN, 2, 0);
    expect(grid.nextFaceIndexAt(p)).toBe(linearFirst(faces, p));
  });

  it('skips null holes', () => {
    const faces = randomFaces(17, 30) as (Face | undefined)[];
    faces[4] = undefined;
    const grid = new WalkFaceGrid(faces as Face[]);
    const r = rng(1);
    const p = new THREE.Vector3();
    for (let n = 0; n < 500; n++) {
      p.set(r() * 80 - 40, r() * 80 - 40, 0);
      expect(gridAll(grid, p)).toEqual(linearAll(faces as Face[], p));
    }
  });

  it('returns nothing for an empty list', () => {
    const grid = new WalkFaceGrid([]);
    expect(grid.findFace(new THREE.Vector3(0, 0, 0))).toBeUndefined();
  });

  describe('getWalkFaceGrid cache', () => {
    it('reuses the grid until the array or its walkmesh geometry changes', () => {
      const owner = {};
      const faces = randomFaces(21, 20);
      const g1 = getWalkFaceGrid(owner, faces);
      expect(getWalkFaceGrid(owner, faces)).toBe(g1);

      // Unrelated walkmesh moved: keep the grid.
      noteWalkmeshGeometryChanged();
      expect(getWalkFaceGrid(owner, faces)).toBe(g1);

      // One of this grid's walkmeshes moved: rebuild.
      faces[0].walkmesh.geometryVersion++;
      noteWalkmeshGeometryChanged();
      const g2 = getWalkFaceGrid(owner, faces);
      expect(g2).not.toBe(g1);

      // Array replaced: rebuild.
      const g3 = getWalkFaceGrid(owner, [...faces]);
      expect(g3).not.toBe(g2);

      // Array grown in place: rebuild.
      const live = [...faces];
      const g4 = getWalkFaceGrid(owner, live);
      live.push(randomFaces(22, 1)[0]);
      expect(getWalkFaceGrid(owner, live)).not.toBe(g4);
    });

    it('sees moved vertices after a rebuild', () => {
      const owner = {};
      const mesh = new Mesh([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]);
      const faces = [new Face(mesh, 0, 1, 2)];
      const p = new THREE.Vector3(10.2, 10.2, 0);
      expect(getWalkFaceGrid(owner, faces).findFace(p)).toBeUndefined();
      mesh.vertices = [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 11 }];
      mesh.geometryVersion++;
      noteWalkmeshGeometryChanged();
      expect(getWalkFaceGrid(owner, faces).findFace(p)).toBe(faces[0]);
    });
  });
});
