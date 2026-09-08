import * as THREE from "three";
import type { OdysseyFace3 } from "@/three/odyssey";
import type { OdysseyModelNodeAABB } from "@/odyssey/OdysseyModelNodeAABB";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";

/**
 * Bin distance fade (squared).
 * Retail CAurTriangleBin used near²=225 (15u) / far²=900 (30u).
 * KotOR.js deliberately extends this — modern GPUs can keep grass in view longer.
 */
export const GRASS_NEAR_RADIUS_SQ = 60 * 60; // full opacity inside 60 units
export const GRASS_FAR_RADIUS_SQ = 120 * 120; // fade out by 120 units

/** K1 grassAlphaTest static default (~0.4). */
export const GRASS_ALPHA_TEST_DEFAULT = 0.4;

/** World-space bin cell size for spatial partitioning. */
export const GRASS_BIN_CELL_SIZE = 12;

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

/** Retail: RoundToInt(area * density); zero skips the face. */
export function computeFaceGrassCount(area: number, density: number): number {
  if(!(area > 0) || !(density > 0)){
    return 0;
  }
  return Math.round(area * density);
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

/**
 * Retail RenderGrassPolys distance fade from bin min-distance-squared.
 * Returns 0..1 (0 = culled).
 */
export function computeBinFade(minDistanceSquared: number, nearSq = GRASS_NEAR_RADIUS_SQ, farSq = GRASS_FAR_RADIUS_SQ): number {
  if(minDistanceSquared < nearSq){
    return 1;
  }
  if(minDistanceSquared < farSq && farSq > nearSq){
    return 1 - ((minDistanceSquared - nearSq) / (farSq - nearSq));
  }
  return 0;
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
