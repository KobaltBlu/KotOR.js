import * as THREE from "three";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import type { OdysseyModelNodeAABB } from "@engine/odyssey/OdysseyModelNodeAABB";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";

/**
 * Distance LOD. Instead of fading whole bins (which pops and thins to bald
 * patches), each blade carries a random rank; blades whose rank exceeds the
 * keep-fraction at their distance shrink into the ground, and survivors widen
 * to keep coverage. Bins draw only the instance prefix that can be visible.
 */
export const GRASS_LOD_FULL_DIST = 22;
export const GRASS_LOD_MID_DIST = 55;
export const GRASS_LOD_FAR_DIST = 110;
/** Fraction of blades kept at GRASS_LOD_MID_DIST. */
export const GRASS_LOD_MID_FRACTION = 0.3;
/** Rank band over which a blade shrinks away (keeps LOD changes smooth). */
export const GRASS_LOD_TRANSITION = 0.12;

/** Instances per retail density unit — each instance is a 3-card clump. */
export const GRASS_DENSITY_SCALE = 2.5;

/** K1 grassAlphaTest static default (~0.4). */
export const GRASS_ALPHA_TEST_DEFAULT = 0.4;

/** World-space bin cell size for spatial partitioning. */
export const GRASS_BIN_CELL_SIZE = 12;

/** Vertical segments per card — enough for a smooth bend curve. */
export const GRASS_BLADE_SEGMENTS = 4;
/** Crossed cards per clump. */
export const GRASS_CLUMP_CARDS = 3;

export type GrassFaceSource = "wok" | "aabb" | "none";

export interface GrassFaceResolveResult {
  faces: OdysseyFace3[];
  source: GrassFaceSource;
  /** Flat xyz vertex buffer for AABB faces; undefined for WOK (use Vector3[]). */
  aabbVertices?: number[];
  walkmesh?: OdysseyWalkMesh;
}

/**
 * Prefer walkmesh grass faces; fall back to AABB grass faces.
 */
export function resolveGrassFaces(
  walkmesh: OdysseyWalkMesh | undefined | null,
  aabb: OdysseyModelNodeAABB | undefined | null
): GrassFaceResolveResult {
  if(walkmesh?.grassFaces?.length){
    return { faces: walkmesh.grassFaces, source: "wok", walkmesh };
  }
  if(aabb?.grassFaces?.length){
    return {
      faces: aabb.grassFaces,
      source: "aabb",
      aabbVertices: aabb.vertices,
    };
  }
  return { faces: [], source: "none" };
}

/**
 * Blades for a face: area * density * scale, stochastically rounded so small
 * triangles still get their share on average (plain rounding leaves bald
 * patches wherever the mesh is finely tessellated).
 */
export function computeFaceGrassCount(
  area: number,
  density: number,
  scale: number = GRASS_DENSITY_SCALE,
  random: () => number = Math.random
): number {
  if(!(area > 0) || !(density > 0) || !(scale > 0)){
    return 0;
  }
  const exact = area * density * scale;
  const whole = Math.floor(exact);
  return whole + (random() < exact - whole ? 1 : 0);
}

/**
 * Low-discrepancy point i of n on a triangle as barycentric (wa, wb, wc).
 * R2 sequence folded into the triangle — even coverage, no clumps or holes.
 */
export function triangleR2Barycentric(i: number, offsetU: number, offsetV: number, out: THREE.Vector3): THREE.Vector3 {
  const g = 1.32471795724474602596;
  let u = (offsetU + (i + 1) / g) % 1;
  let v = (offsetV + (i + 1) / (g * g)) % 1;
  if(u + v > 1){
    u = 1 - u;
    v = 1 - v;
  }
  return out.set(1 - u - v, u, v);
}

/** Smooth 2D value noise in [0, 1] — used for meadow height patches. */
export function grassValueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const a = h(ix, iy);
  const b = h(ix + 1, iy);
  const c = h(ix, iy + 1);
  const d = h(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * Keep-fraction of blades at a camera distance (piecewise linear; the grass
 * shader mirrors this exactly).
 */
export function computeGrassLodFraction(distance: number): number {
  if(distance <= GRASS_LOD_FULL_DIST) return 1;
  if(distance <= GRASS_LOD_MID_DIST){
    const t = (distance - GRASS_LOD_FULL_DIST) / (GRASS_LOD_MID_DIST - GRASS_LOD_FULL_DIST);
    return 1 + (GRASS_LOD_MID_FRACTION - 1) * t;
  }
  if(distance < GRASS_LOD_FAR_DIST){
    const t = (distance - GRASS_LOD_MID_DIST) / (GRASS_LOD_FAR_DIST - GRASS_LOD_MID_DIST);
    return GRASS_LOD_MID_FRACTION * (1 - t);
  }
  return 0;
}

/** Rank for instance i of n, packed so rank + transition <= 1. */
export function grassInstanceRank(i: number, n: number): number {
  return n > 0 ? (i / n) * (1 - GRASS_LOD_TRANSITION) : 0;
}

/** Instances (prefix of a rank-sorted bin) that can be visible at a keep-fraction. */
export function grassVisibleInstanceCount(total: number, keepFraction: number): number {
  if(!(keepFraction > 0) || total <= 0) return 0;
  return Math.min(total, Math.ceil((keepFraction / (1 - GRASS_LOD_TRANSITION)) * total));
}

/** In-place Fisher–Yates shuffle. */
export function shuffleInPlace<T>(list: T[], random: () => number = Math.random): T[] {
  for(let i = list.length - 1; i > 0; i--){
    const j = Math.floor(random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

function vertexKey(v: THREE.Vector3): string {
  return `${Math.round(v.x * 100)},${Math.round(v.y * 100)},${Math.round(v.z * 100)}`;
}

function edgeKey(a: THREE.Vector3, b: THREE.Vector3): string {
  const ka = vertexKey(a);
  const kb = vertexKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/**
 * Per grass face, which edges border non-grass (path, wall, mesh boundary).
 * Built from shared vertex positions so it works for WOK and AABB alike.
 * Returns flags per face: bit0 = AB, bit1 = BC, bit2 = CA.
 */
export function computeGrassBoundaryEdges(
  faces: OdysseyFace3[],
  source: GrassFaceSource,
  aabbVertices: number[] | undefined,
  walkmesh: OdysseyWalkMesh | undefined
): Uint8Array {
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const C = new THREE.Vector3();
  const counts = new Map<string, number>();
  const keys: string[] = new Array(faces.length * 3);
  for(let i = 0; i < faces.length; i++){
    faceVertexPositions(faces[i], source, aabbVertices, walkmesh, A, B, C);
    keys[i * 3] = edgeKey(A, B);
    keys[i * 3 + 1] = edgeKey(B, C);
    keys[i * 3 + 2] = edgeKey(C, A);
    for(let e = 0; e < 3; e++){
      const k = keys[i * 3 + e];
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const flags = new Uint8Array(faces.length);
  for(let i = 0; i < faces.length; i++){
    let f = 0;
    for(let e = 0; e < 3; e++){
      if((counts.get(keys[i * 3 + e]) || 0) < 2) f |= 1 << e;
    }
    flags[i] = f;
  }
  return flags;
}

/**
 * Supports both [0..1] and percentage-style [0..100] probability values.
 * Mutates and returns the vector.
 */
export function normalizeGrassProbability(probability: THREE.Vector4): THREE.Vector4 {
  probability.x = Math.max(0, probability.x);
  probability.y = Math.max(0, probability.y);
  probability.z = Math.max(0, probability.z);
  probability.w = Math.max(0, probability.w);

  const total = probability.x + probability.y + probability.z + probability.w;
  if(total <= 0){
    probability.set(0.25, 0.25, 0.25, 0.25);
    return probability;
  }

  probability.divideScalar(total);
  return probability;
}

/** Weighted random pick from a 2×2 grass texture atlas (LL, LR, UL, UR). */
export function pickGrassTextureQuad(probability: THREE.Vector4, random: () => number = Math.random): number {
  const r = random();
  const t0 = probability.x;
  const t1 = t0 + probability.y;
  const t2 = t1 + probability.z;
  if(r < t0) return 0;
  if(r < t1) return 1;
  if(r < t2) return 2;
  return 3;
}

/** Pack ARE DWORD color (0xAARRGGBB or 0x00RRGGBB) into a THREE.Color. */
export function colorFromAreDword(value: number): THREE.Color {
  const rgb = (value >>> 0) & 0xffffff;
  return new THREE.Color().setHex(rgb);
}

export function faceVertexPositions(
  face: OdysseyFace3,
  source: GrassFaceSource,
  aabbVertices: number[] | undefined,
  walkmesh: OdysseyWalkMesh | undefined,
  outA: THREE.Vector3,
  outB: THREE.Vector3,
  outC: THREE.Vector3
): void {
  if(source === "wok" && walkmesh){
    outA.copy(walkmesh.vertices[face.a]);
    outB.copy(walkmesh.vertices[face.b]);
    outC.copy(walkmesh.vertices[face.c]);
    return;
  }
  if(aabbVertices){
    outA.set(aabbVertices[face.a * 3], aabbVertices[face.a * 3 + 1], aabbVertices[face.a * 3 + 2]);
    outB.set(aabbVertices[face.b * 3], aabbVertices[face.b * 3 + 1], aabbVertices[face.b * 3 + 2]);
    outC.set(aabbVertices[face.c * 3], aabbVertices[face.c * 3 + 1], aabbVertices[face.c * 3 + 2]);
    return;
  }
  outA.set(0, 0, 0);
  outB.set(0, 0, 0);
  outC.set(0, 0, 0);
}

export function binCellKey(x: number, y: number, cellSize: number = GRASS_BIN_CELL_SIZE): string {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  return `${cx},${cy}`;
}

/**
 * Mesh/world offset for grass instances.
 * WOK verts are already world-space; AABB verts are local to room + aabb node.
 */
export function grassMeshOffset(
  source: GrassFaceSource,
  roomPosition: THREE.Vector3,
  aabbPosition?: THREE.Vector3 | null
): THREE.Vector3 {
  const offset = new THREE.Vector3();
  if(source === "aabb"){
    offset.copy(roomPosition);
    if(aabbPosition){
      offset.add(aabbPosition);
    }
  }
  return offset;
}
