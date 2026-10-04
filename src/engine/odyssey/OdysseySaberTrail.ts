import * as THREE from "three";
import type { OdysseyModelNodeSaber } from "@engine/odyssey/OdysseyModelNodeSaber";
import {
  OdysseySaberTrailGeometry,
  SABER_TRAIL_CAPACITY,
  SABER_TRAIL_PROFILE_COUNT,
  SABER_TRAIL_PROFILE_VERT,
} from "@engine/odyssey/OdysseySaberTrailGeometry";

export const SABER_TRAIL_SAMPLE_INTERVAL = 0.012;
/** Keep a few intervals of history so the ribbon is visible without a solid fan. */
export const SABER_TRAIL_MAX_AGE = SABER_TRAIL_SAMPLE_INTERVAL * 4;

const MAX_CATCH_UP_SAMPLES = 4;
const MAX_TRAIL_DELTA = 0.1;
/** Hilt translation gate (~0.3 mm). */
const POSITION_EPSILON_SQ = 1e-7;
/** Relative quaternion change (1 - |dot|); catches small breathing twists. */
const ROTATION_EPSILON = 1e-6;
/**
 * Blade-tip displacement gate (~0.5 mm). Tip motion is the best idle/breathing
 * metric — hilt may barely move while the tip sways.
 */
const TIP_EPSILON_SQ = 2.5e-7;
/** Local tip used for motion detection (near profile tip along blade Z). */
const TIP_LOCAL = new THREE.Vector3(0, 0, 0.9);
/** History samples before showing overlay (live tip always anchors the head). */
const MIN_ACTIVE_SAMPLES = 2;

const enum SaberTrailDirty {
  None = 0,
  History = 1 << 0,
  Transform = 1 << 1,
  Visibility = 1 << 2,
}

function readVert3(
  src: number[],
  index: number,
  out: Float32Array,
  dst: number,
): void {
  const i3 = index * 3;
  out[dst] = src[i3] ?? 0;
  out[dst + 1] = src[i3 + 1] ?? 0;
  out[dst + 2] = src[i3 + 2] ?? 0;
}

function readUV2(
  src: number[],
  index: number,
  out: Float32Array,
  dst: number,
): void {
  const i2 = index * 2;
  out[dst] = src[i2] ?? 0;
  out[dst + 1] = src[i2 + 1] ?? 0;
}

/**
 * CPU saber trail — fixed-step history + dirty-only ribbon rebuild.
 * Owned by the runtime OdysseyObject3D; does not call updateWorldMatrix.
 */
export class OdysseySaberTrail {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;

  private readonly bladeMesh: THREE.Mesh;
  private readonly geometryHelper: OdysseySaberTrailGeometry;
  private readonly samplePositions = new Float32Array(SABER_TRAIL_CAPACITY * 3);
  private readonly sampleOrientations = new Float32Array(SABER_TRAIL_CAPACITY * 4);
  private readonly sampleTimes = new Float32Array(SABER_TRAIL_CAPACITY);

  private writeIndex = 0;
  private sampleCount = 0;
  private time = 0;
  private sampleAccumulator = 0;
  private dirty: SaberTrailDirty = SaberTrailDirty.Visibility;
  private disposed = false;

  private readonly previousPosition = new THREE.Vector3();
  private readonly previousOrientation = new THREE.Quaternion();
  private readonly currentPosition = new THREE.Vector3();
  private readonly currentOrientation = new THREE.Quaternion();
  private readonly currentScale = new THREE.Vector3();
  private readonly samplePosition = new THREE.Vector3();
  private readonly sampleOrientation = new THREE.Quaternion();
  private readonly previousTip = new THREE.Vector3();
  private readonly currentTip = new THREE.Vector3();
  private initialized = false;

  constructor(
    bladeMesh: THREE.Mesh,
    node: OdysseyModelNodeSaber,
    parentNode?: THREE.Object3D,
  ) {
    this.bladeMesh = bladeMesh;

    const profileVerts = new Float32Array(SABER_TRAIL_PROFILE_COUNT * 3);
    const profileUVs = new Float32Array(SABER_TRAIL_PROFILE_COUNT * 2);
    const verts = node.vertices;
    const uvs = node.tvectors[0] ?? [];
    const vertCount = (verts.length / 3) | 0;
    const profileBase = Math.min(
      SABER_TRAIL_PROFILE_VERT,
      Math.max(0, vertCount - SABER_TRAIL_PROFILE_COUNT),
    );
    for (let i = 0; i < SABER_TRAIL_PROFILE_COUNT; i++) {
      readVert3(verts, profileBase + i, profileVerts, i * 3);
      readUV2(uvs, profileBase + i, profileUVs, i * 2);
    }

    this.geometryHelper = new OdysseySaberTrailGeometry(profileVerts, profileUVs);

    const material = bladeMesh.material as THREE.Material;
    this.mesh = new THREE.Mesh(this.geometryHelper.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = bladeMesh.renderOrder;
    this.mesh.visible = false;
    this.mesh.userData.saberTrailMesh = true;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    // Child of the blade so trail-local space matches blade.matrixWorld.
    bladeMesh.add(this.mesh);
    void parentNode;
  }

  update(delta: number, matrixWorld: THREE.Matrix4): void {
    if (this.disposed) return;

    if (delta > MAX_TRAIL_DELTA) {
      this.reset(matrixWorld);
      return;
    }

    let dt = delta;
    if (dt < 0) dt = 0;

    this.time += dt;

    // Expire samples older than max age (always keep ≥ 1).
    while (this.sampleCount > 1) {
      const oldest = this.getOldestIndex();
      if (this.time - this.sampleTimes[oldest] <= SABER_TRAIL_MAX_AGE) {
        break;
      }
      this.sampleCount--;
      this.dirty |= SaberTrailDirty.History;
    }

    matrixWorld.decompose(
      this.currentPosition,
      this.currentOrientation,
      this.currentScale,
    );
    this.currentTip
      .copy(TIP_LOCAL)
      .applyQuaternion(this.currentOrientation)
      .add(this.currentPosition);

    if (!this.initialized) {
      this.initialized = true;
      this.previousPosition.copy(this.currentPosition);
      this.previousOrientation.copy(this.currentOrientation);
      this.previousTip.copy(this.currentTip);
      this.pushSample(
        this.currentPosition,
        this.currentOrientation,
        this.time,
      );
      this.dirty |= SaberTrailDirty.History | SaberTrailDirty.Visibility;
      this.rebuildIfDirty(matrixWorld);
      return;
    }

    const tipChanged =
      this.currentTip.distanceToSquared(this.previousTip) > TIP_EPSILON_SQ;
    const positionChanged =
      this.currentPosition.distanceToSquared(this.previousPosition) >
      POSITION_EPSILON_SQ;
    const rotationChanged =
      1 -
        Math.abs(
          this.currentOrientation.dot(this.previousOrientation),
        ) >
      ROTATION_EPSILON;

    const moved = tipChanged || positionChanged || rotationChanged;

    if (moved) {
      this.dirty |= SaberTrailDirty.Transform;
    }

    const previousAccumulator = this.sampleAccumulator;
    this.sampleAccumulator += dt;

    if (moved) {
      let offset = SABER_TRAIL_SAMPLE_INTERVAL - previousAccumulator;
      let catchUp = 0;

      while (
        offset <= dt &&
        catchUp < MAX_CATCH_UP_SAMPLES
      ) {
        const alpha = dt > 0 ? offset / dt : 1;
        this.samplePosition.lerpVectors(
          this.previousPosition,
          this.currentPosition,
          alpha,
        );
        this.sampleOrientation.slerpQuaternions(
          this.previousOrientation,
          this.currentOrientation,
          alpha,
        );
        this.pushSample(
          this.samplePosition,
          this.sampleOrientation,
          this.time - dt + offset,
        );
        offset += SABER_TRAIL_SAMPLE_INTERVAL;
        catchUp++;
        this.dirty |= SaberTrailDirty.History;
      }
    }

    this.sampleAccumulator %= SABER_TRAIL_SAMPLE_INTERVAL;

    this.previousPosition.copy(this.currentPosition);
    this.previousOrientation.copy(this.currentOrientation);
    this.previousTip.copy(this.currentTip);

    this.rebuildIfDirty(matrixWorld);
  }

  reset(matrixWorld?: THREE.Matrix4): void {
    if (this.disposed) return;

    this.writeIndex = 0;
    this.sampleCount = 0;
    this.sampleAccumulator = 0;
    this.dirty |= SaberTrailDirty.History | SaberTrailDirty.Visibility;

    if (matrixWorld) {
      matrixWorld.decompose(
        this.currentPosition,
        this.currentOrientation,
        this.currentScale,
      );
      this.previousPosition.copy(this.currentPosition);
      this.previousOrientation.copy(this.currentOrientation);
      this.previousTip
        .copy(TIP_LOCAL)
        .applyQuaternion(this.currentOrientation)
        .add(this.currentPosition);
      this.initialized = true;
      this.pushSample(
        this.currentPosition,
        this.currentOrientation,
        this.time,
      );
      this.rebuildIfDirty(matrixWorld);
    } else {
      this.initialized = false;
      this.mesh.visible = false;
      this.bladeMesh.visible = true;
      this.geometryHelper.geometry.setDrawRange(0, 0);
      this.dirty = SaberTrailDirty.None;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.bladeMesh.visible = true;
    this.mesh.removeFromParent();
    this.geometryHelper.dispose();
    // Shared blade material — do not dispose.
  }

  private pushSample(
    position: THREE.Vector3,
    orientation: THREE.Quaternion,
    time: number,
  ): void {
    const slot = this.writeIndex;
    const p = slot * 3;
    const q = slot * 4;

    this.samplePositions[p] = position.x;
    this.samplePositions[p + 1] = position.y;
    this.samplePositions[p + 2] = position.z;

    this.sampleOrientations[q] = orientation.x;
    this.sampleOrientations[q + 1] = orientation.y;
    this.sampleOrientations[q + 2] = orientation.z;
    this.sampleOrientations[q + 3] = orientation.w;

    this.sampleTimes[slot] = time;

    this.writeIndex = (slot + 1) % SABER_TRAIL_CAPACITY;
    this.sampleCount = Math.min(this.sampleCount + 1, SABER_TRAIL_CAPACITY);
  }

  private getOldestIndex(): number {
    return (
      (this.writeIndex - this.sampleCount + SABER_TRAIL_CAPACITY) %
      SABER_TRAIL_CAPACITY
    );
  }

  private rebuildIfDirty(matrixWorld: THREE.Matrix4): void {
    if (this.dirty === SaberTrailDirty.None) {
      return;
    }

    // Keep the ordinary blade always visible to avoid thin-ribbon pop-in.
    // Trail is an additive overlay anchored to the live tip.
    this.bladeMesh.visible = true;

    const active = this.sampleCount >= MIN_ACTIVE_SAMPLES;
    if (active) {
      this.geometryHelper.fillPositions(
        this.samplePositions,
        this.sampleOrientations,
        this.writeIndex,
        this.sampleCount,
        matrixWorld,
        this.currentPosition,
        this.currentOrientation,
      );
      this.mesh.visible = true;
    } else {
      this.geometryHelper.geometry.setDrawRange(0, 0);
      this.mesh.visible = false;
    }

    this.dirty = SaberTrailDirty.None;
  }
}
