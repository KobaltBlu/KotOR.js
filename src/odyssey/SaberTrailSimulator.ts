import * as THREE from "three";
import type { OdysseyModelNodeSaber } from "@/odyssey/OdysseyModelNodeSaber";
import type { OdysseyModel3D } from "@/three/odyssey/OdysseyModel3D";

/**
 * Retail PartLightsaber trail — Animate / Draw.
 *
 * Ring capacity 0x14 (20); min Δt ≈ 0.01; segment interval ≈ 0.012.
 * Trail profile cross-section starts at MDL vert 0x58 (88); idle blade uses verts 0..7.
 */

/** Retail ring size. */
export const SABER_TRAIL_RING = 20;
/** Retail lightsaberDelta. */
export const SABER_TRAIL_MIN_DELTA = 0.01;
/** Retail lightsaberSegmentInterval. */
export const SABER_TRAIL_SEGMENT_INTERVAL = 0.012;
/** Retail teleport clear threshold in Animate */
export const SABER_TRAIL_TELEPORT_MAG = 1.0;
/** Retail Draw trail profile base vert index (float bits 0x58) */
export const SABER_TRAIL_PROFILE_VERT = 88;
/** Idle blade: two cross-sections (verts 0..7) */
export const SABER_IDLE_VERT_COUNT = 8;

const PROFILE_COUNT = 4;

/** Max ribbon verts: ring * subdivisions * 2 profiles * 4 */
const MAX_RIBBON_VERTS = SABER_TRAIL_RING * 8 * PROFILE_COUNT * 2;
const MAX_RIBBON_INDICES = SABER_TRAIL_RING * 8 * PROFILE_COUNT * 6;

export interface SaberTrailState {
  ages: Float32Array;
  positions: THREE.Vector3[];
  orientations: THREE.Quaternion[];
  writeIndex: number;
  readIndex: number;
  segmentCount: number;
  lastWorldPos: THREE.Vector3;
  initialized: boolean;
  /** Local-space profile (4 verts) for trail ribbon */
  profileVerts: Float32Array;
  profileUVs: Float32Array;
  /** Idle blade rest verts/UVs (8 verts = two profiles) */
  idleVerts: Float32Array;
  idleUVs: Float32Array;
  positionsBuf: Float32Array;
  uvsBuf: Float32Array;
  indicesBuf: Uint32Array;
}

const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _invWorldQuat = new THREE.Quaternion();
const _delta = new THREE.Vector3();
const _tmpV = new THREE.Vector3();
const _prevPos = new THREE.Vector3();
const _prevQuat = new THREE.Quaternion();
const _currPos = new THREE.Vector3();
const _currQuat = new THREE.Quaternion();

function readVert3(src: number[], index: number, out: Float32Array, dst: number): void {
  const i3 = index * 3;
  out[dst] = src[i3] ?? 0;
  out[dst + 1] = src[i3 + 1] ?? 0;
  out[dst + 2] = src[i3 + 2] ?? 0;
}

function readUV2(src: number[], index: number, out: Float32Array, dst: number): void {
  const i2 = index * 2;
  out[dst] = src[i2] ?? 0;
  out[dst + 1] = src[i2 + 1] ?? 0;
}

function createEmptyState(): SaberTrailState {
  const positions: THREE.Vector3[] = [];
  const orientations: THREE.Quaternion[] = [];
  for (let i = 0; i < SABER_TRAIL_RING; i++) {
    positions.push(new THREE.Vector3());
    orientations.push(new THREE.Quaternion());
  }
  return {
    ages: new Float32Array(SABER_TRAIL_RING),
    positions,
    orientations,
    writeIndex: 0,
    readIndex: 0,
    segmentCount: 0,
    lastWorldPos: new THREE.Vector3(),
    initialized: false,
    profileVerts: new Float32Array(PROFILE_COUNT * 3),
    profileUVs: new Float32Array(PROFILE_COUNT * 2),
    idleVerts: new Float32Array(SABER_IDLE_VERT_COUNT * 3),
    idleUVs: new Float32Array(SABER_IDLE_VERT_COUNT * 2),
    positionsBuf: new Float32Array(MAX_RIBBON_VERTS * 3),
    uvsBuf: new Float32Array(MAX_RIBBON_VERTS * 2),
    indicesBuf: new Uint32Array(MAX_RIBBON_INDICES),
  };
}

function clearTrail(sim: SaberTrailState): void {
  sim.writeIndex = 0;
  sim.readIndex = 0;
  sim.segmentCount = 0;
  sim.ages.fill(0);
}

/**
 * Retail Animate — age ring samples and push world pose when the blade moves.
 */
export function animateSaberTrail(mesh: THREE.Mesh, delta: number): void {
  const sim = mesh.userData.saberTrail as SaberTrailState | undefined;
  if (!sim) return;

  let dt = delta;
  if (dt <= SABER_TRAIL_MIN_DELTA) {
    dt = SABER_TRAIL_MIN_DELTA;
  }

  // Age / expire samples while scene would be animating (always true during model update).
  let expired = 0;
  let idx = sim.readIndex;
  if (sim.segmentCount > 0) {
    for (let n = 0; n < sim.segmentCount; n++) {
      sim.ages[idx] += dt;
      if (
        sim.ages[idx] > SABER_TRAIL_SEGMENT_INTERVAL &&
        sim.segmentCount - expired > 1
      ) {
        expired++;
        sim.readIndex = (sim.readIndex + 1) % SABER_TRAIL_RING;
      }
      idx = (idx + 1) % SABER_TRAIL_RING;
    }
    sim.segmentCount -= expired;
  }

  mesh.updateWorldMatrix(true, false);
  mesh.getWorldPosition(_worldPos);
  mesh.getWorldQuaternion(_worldQuat);

  if (!sim.initialized) {
    sim.initialized = true;
    sim.lastWorldPos.copy(_worldPos);
    // Seed one sample so idle blade can draw immediately.
    sim.ages[0] = 0;
    sim.positions[0].copy(_worldPos);
    sim.orientations[0].copy(_worldQuat);
    sim.writeIndex = 1;
    sim.readIndex = 0;
    sim.segmentCount = 1;
    return;
  }

  if (_worldPos.equals(sim.lastWorldPos)) {
    return;
  }

  _delta.copy(_worldPos).sub(sim.lastWorldPos);
  if (_delta.length() > SABER_TRAIL_TELEPORT_MAG) {
    clearTrail(sim);
  }

  sim.lastWorldPos.copy(_worldPos);
  const w = sim.writeIndex;
  sim.ages[w] = 0;
  sim.positions[w].copy(_worldPos);
  sim.orientations[w].copy(_worldQuat);

  // Retail: when ring is full, overwrite current write slot and do not advance.
  if (sim.segmentCount === SABER_TRAIL_RING) {
    return;
  }

  sim.writeIndex = (sim.writeIndex + 1) % SABER_TRAIL_RING;
  sim.segmentCount++;
}

function transformProfileToLocal(
  profileVerts: Float32Array,
  samplePos: THREE.Vector3,
  sampleQuat: THREE.Quaternion,
  meshWorldPos: THREE.Vector3,
  invMeshWorldQuat: THREE.Quaternion,
  out: Float32Array,
  outOffset: number
): void {
  for (let i = 0; i < PROFILE_COUNT; i++) {
    const i3 = i * 3;
    _tmpV.set(profileVerts[i3], profileVerts[i3 + 1], profileVerts[i3 + 2]);
    _tmpV.applyQuaternion(sampleQuat);
    _tmpV.add(samplePos);
    _tmpV.sub(meshWorldPos);
    _tmpV.applyQuaternion(invMeshWorldQuat);
    out[outOffset + i3] = _tmpV.x;
    out[outOffset + i3 + 1] = _tmpV.y;
    out[outOffset + i3 + 2] = _tmpV.z;
  }
}

function emitProfilePair(
  sim: SaberTrailState,
  currLocal: Float32Array,
  prevLocal: Float32Array,
  currUV: Float32Array,
  prevUV: Float32Array,
  vertCount: { n: number },
  indexCount: { n: number }
): void {
  const base = vertCount.n;
  if (base + PROFILE_COUNT * 2 > MAX_RIBBON_VERTS) return;
  if (indexCount.n + PROFILE_COUNT * 6 > MAX_RIBBON_INDICES) return;

  // curr profile then prev profile
  for (let i = 0; i < PROFILE_COUNT; i++) {
    const i3 = i * 3;
    const i2 = i * 2;
    const dst = (base + i) * 3;
    sim.positionsBuf[dst] = currLocal[i3];
    sim.positionsBuf[dst + 1] = currLocal[i3 + 1];
    sim.positionsBuf[dst + 2] = currLocal[i3 + 2];
    sim.uvsBuf[(base + i) * 2] = currUV[i2];
    sim.uvsBuf[(base + i) * 2 + 1] = currUV[i2 + 1];
  }
  for (let i = 0; i < PROFILE_COUNT; i++) {
    const i3 = i * 3;
    const i2 = i * 2;
    const dst = (base + PROFILE_COUNT + i) * 3;
    sim.positionsBuf[dst] = prevLocal[i3];
    sim.positionsBuf[dst + 1] = prevLocal[i3 + 1];
    sim.positionsBuf[dst + 2] = prevLocal[i3 + 2];
    sim.uvsBuf[(base + PROFILE_COUNT + i) * 2] = prevUV[i2];
    sim.uvsBuf[(base + PROFILE_COUNT + i) * 2 + 1] = prevUV[i2 + 1];
  }

  // Quad strip between the two 4-vert profiles
  for (let i = 0; i < PROFILE_COUNT; i++) {
    const j = (i + 1) % PROFILE_COUNT;
    const c0 = base + i;
    const c1 = base + j;
    const p0 = base + PROFILE_COUNT + i;
    const p1 = base + PROFILE_COUNT + j;
    const ii = indexCount.n;
    sim.indicesBuf[ii] = c0;
    sim.indicesBuf[ii + 1] = c1;
    sim.indicesBuf[ii + 2] = p0;
    sim.indicesBuf[ii + 3] = c1;
    sim.indicesBuf[ii + 4] = p1;
    sim.indicesBuf[ii + 5] = p0;
    indexCount.n += 6;
  }
  vertCount.n += PROFILE_COUNT * 2;
}

const _currLocal = new Float32Array(PROFILE_COUNT * 3);
const _prevLocal = new Float32Array(PROFILE_COUNT * 3);
const _idleA = new Float32Array(PROFILE_COUNT * 3);
const _idleB = new Float32Array(PROFILE_COUNT * 3);
const _idleUVa = new Float32Array(PROFILE_COUNT * 2);
const _idleUVb = new Float32Array(PROFILE_COUNT * 2);

function rebuildIdleBlade(sim: SaberTrailState, vertCount: { n: number }, indexCount: { n: number }): void {
  for (let i = 0; i < PROFILE_COUNT; i++) {
    const i3 = i * 3;
    const i2 = i * 2;
    _idleA[i3] = sim.idleVerts[i3];
    _idleA[i3 + 1] = sim.idleVerts[i3 + 1];
    _idleA[i3 + 2] = sim.idleVerts[i3 + 2];
    _idleB[i3] = sim.idleVerts[PROFILE_COUNT * 3 + i3];
    _idleB[i3 + 1] = sim.idleVerts[PROFILE_COUNT * 3 + i3 + 1];
    _idleB[i3 + 2] = sim.idleVerts[PROFILE_COUNT * 3 + i3 + 2];
    _idleUVa[i2] = sim.idleUVs[i2];
    _idleUVa[i2 + 1] = sim.idleUVs[i2 + 1];
    _idleUVb[i2] = sim.idleUVs[PROFILE_COUNT * 2 + i2];
    _idleUVb[i2 + 1] = sim.idleUVs[PROFILE_COUNT * 2 + i2 + 1];
  }
  emitProfilePair(sim, _idleA, _idleB, _idleUVa, _idleUVb, vertCount, indexCount);
}

/**
 * Retail Draw — rebuild ribbon from history × MDL profile, or idle blade.
 */
export function rebuildSaberRibbon(mesh: THREE.Mesh): void {
  const sim = mesh.userData.saberTrail as SaberTrailState | undefined;
  if (!sim) return;

  mesh.updateWorldMatrix(true, false);
  mesh.getWorldPosition(_worldPos);
  mesh.getWorldQuaternion(_worldQuat);
  _invWorldQuat.copy(_worldQuat).invert();

  const vertCount = { n: 0 };
  const indexCount = { n: 0 };

  if (sim.segmentCount <= 1) {
    rebuildIdleBlade(sim, vertCount, indexCount);
  } else {
    // Newest sample is writeIndex - 1
    let newer = sim.writeIndex - 1;
    if (newer < 0) newer += SABER_TRAIL_RING;

    _prevPos.copy(sim.positions[newer]);
    _prevQuat.copy(sim.orientations[newer]);
    transformProfileToLocal(
      sim.profileVerts,
      _prevPos,
      _prevQuat,
      _worldPos,
      _invWorldQuat,
      _prevLocal,
      0
    );

    for (let s = 1; s < sim.segmentCount; s++) {
      let older = newer - 1;
      if (older < 0) older += SABER_TRAIL_RING;

      const ageNewer = sim.ages[newer];
      const ageOlder = sim.ages[older];
      const ageDiff = ageOlder - ageNewer;
      if (ageDiff <= 1e-8) {
        newer = older;
        continue;
      }

      let t = SABER_TRAIL_SEGMENT_INTERVAL / ageDiff;
      // At least one segment between adjacent samples; subdivide when age span covers multiple intervals.
      while (t < 1.0) {
        _currPos.copy(sim.positions[newer]).lerp(sim.positions[older], t);
        _currQuat.copy(sim.orientations[newer]).slerp(sim.orientations[older], t);

        transformProfileToLocal(
          sim.profileVerts,
          _currPos,
          _currQuat,
          _worldPos,
          _invWorldQuat,
          _currLocal,
          0
        );

        emitProfilePair(
          sim,
          _currLocal,
          _prevLocal,
          sim.profileUVs,
          sim.profileUVs,
          vertCount,
          indexCount
        );

        _prevLocal.set(_currLocal);
        _prevPos.copy(_currPos);
        _prevQuat.copy(_currQuat);

        t += SABER_TRAIL_SEGMENT_INTERVAL / ageDiff;
      }

      // Cap at the older sample itself
      transformProfileToLocal(
        sim.profileVerts,
        sim.positions[older],
        sim.orientations[older],
        _worldPos,
        _invWorldQuat,
        _currLocal,
        0
      );
      emitProfilePair(
        sim,
        _currLocal,
        _prevLocal,
        sim.profileUVs,
        sim.profileUVs,
        vertCount,
        indexCount
      );
      _prevLocal.set(_currLocal);
      newer = older;
    }

    // Keep a visible blade tip at the newest pose
    rebuildIdleBlade(sim, vertCount, indexCount);
  }

  const geo = mesh.geometry;
  let posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
  let uvAttr = geo.getAttribute("uv") as THREE.BufferAttribute;
  let indexAttr = geo.getIndex() as THREE.BufferAttribute | null;

  if (!posAttr || posAttr.array !== sim.positionsBuf) {
    posAttr = new THREE.BufferAttribute(sim.positionsBuf, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
  }
  if (!uvAttr || uvAttr.array !== sim.uvsBuf) {
    uvAttr = new THREE.BufferAttribute(sim.uvsBuf, 2);
    uvAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("uv", uvAttr);
  }
  if (!indexAttr || indexAttr.array !== sim.indicesBuf) {
    indexAttr = new THREE.BufferAttribute(sim.indicesBuf, 1);
    indexAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setIndex(indexAttr);
  }

  posAttr.needsUpdate = true;
  uvAttr.needsUpdate = true;
  indexAttr.needsUpdate = true;
  geo.setDrawRange(0, indexCount.n);
  geo.computeBoundingSphere();
}

export function initSaberTrailMesh(mesh: THREE.Mesh, node: OdysseyModelNodeSaber): void {
  const sim = createEmptyState();
  const verts = node.vertices;
  const uvs = node.tvectors[0] ?? [];

  const profileBase = Math.min(SABER_TRAIL_PROFILE_VERT, Math.max(0, (verts.length / 3 | 0) - PROFILE_COUNT));
  for (let i = 0; i < PROFILE_COUNT; i++) {
    readVert3(verts, profileBase + i, sim.profileVerts, i * 3);
    readUV2(uvs, profileBase + i, sim.profileUVs, i * 2);
  }

  for (let i = 0; i < SABER_IDLE_VERT_COUNT; i++) {
    readVert3(verts, i, sim.idleVerts, i * 3);
    readUV2(uvs, i, sim.idleUVs, i * 2);
  }

  // Dynamic ribbon buffers backed by sim state arrays
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(sim.positionsBuf, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const uvAttr = new THREE.BufferAttribute(sim.uvsBuf, 2);
  uvAttr.setUsage(THREE.DynamicDrawUsage);
  const indexAttr = new THREE.BufferAttribute(sim.indicesBuf, 1);
  indexAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("uv", uvAttr);
  geo.setIndex(indexAttr);
  geo.setDrawRange(0, 0);

  if (mesh.geometry && mesh.geometry !== geo) {
    mesh.geometry.dispose();
  }
  mesh.geometry = geo;
  mesh.frustumCulled = false;

  mesh.userData.saberTrail = sim;
  rebuildSaberRibbon(mesh);
}

export function updateModelSaberTrails(model: OdysseyModel3D, delta: number): void {
  const meshes = model.saberMeshes;
  if (!meshes || !meshes.length) return;
  for (let i = 0, len = meshes.length; i < len; i++) {
    const mesh = meshes[i] as THREE.Mesh;
    if (!mesh || !mesh.userData.saberTrail) continue;
    animateSaberTrail(mesh, delta);
    rebuildSaberRibbon(mesh);
  }
}
