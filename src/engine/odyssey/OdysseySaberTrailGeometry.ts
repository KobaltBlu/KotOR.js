import * as THREE from "three";

/** Ring sample capacity. */
export const SABER_TRAIL_CAPACITY = 20;
/** Trail profile cross-section vertex count. */
export const SABER_TRAIL_PROFILE_COUNT = 4;
/** Draw trail profile base vert index. */
export const SABER_TRAIL_PROFILE_VERT = 88;

/** History slots + one live tip profile. */
const MAX_VERTEX_COUNT = (SABER_TRAIL_CAPACITY + 1) * SABER_TRAIL_PROFILE_COUNT;
const MAX_INDEX_COUNT = SABER_TRAIL_CAPACITY * SABER_TRAIL_PROFILE_COUNT * 6;

const _tmpV = new THREE.Vector3();
const _samplePos = new THREE.Vector3();
const _sampleQuat = new THREE.Quaternion();
const _refPos = new THREE.Vector3();
const _refQuat = new THREE.Quaternion();
const _refScale = new THREE.Vector3();
const _invRefQuat = new THREE.Quaternion();

/**
 * Static ribbon topology + dynamic position fill for CPU saber trails.
 * Indices and UVs are built once; only positions are rewritten.
 */
export class OdysseySaberTrailGeometry {
  readonly geometry: THREE.BufferGeometry;
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint16Array;
  private readonly positionAttribute: THREE.BufferAttribute;
  private readonly profileVerts: Float32Array;

  constructor(profileVerts: Float32Array, profileUVs: Float32Array) {
    this.profileVerts = profileVerts;

    this.positions = new Float32Array(MAX_VERTEX_COUNT * 3);
    this.uvs = new Float32Array(MAX_VERTEX_COUNT * 2);
    this.indices = new Uint16Array(MAX_INDEX_COUNT);

    for (let slot = 0; slot < SABER_TRAIL_CAPACITY + 1; slot++) {
      const base = slot * SABER_TRAIL_PROFILE_COUNT;
      for (let i = 0; i < SABER_TRAIL_PROFILE_COUNT; i++) {
        const i2 = i * 2;
        const dst = (base + i) * 2;
        this.uvs[dst] = profileUVs[i2] ?? 0;
        this.uvs[dst + 1] = profileUVs[i2 + 1] ?? 0;
      }
    }

    let ii = 0;
    // Capacity segments between history slots, plus one to the live tip.
    for (let slot = 0; slot < SABER_TRAIL_CAPACITY; slot++) {
      const currBase = (slot + 1) * SABER_TRAIL_PROFILE_COUNT;
      const prevBase = slot * SABER_TRAIL_PROFILE_COUNT;
      for (let i = 0; i < SABER_TRAIL_PROFILE_COUNT; i++) {
        const j = (i + 1) % SABER_TRAIL_PROFILE_COUNT;
        const c0 = currBase + i;
        const c1 = currBase + j;
        const p0 = prevBase + i;
        const p1 = prevBase + j;
        this.indices[ii++] = c0;
        this.indices[ii++] = c1;
        this.indices[ii++] = p0;
        this.indices[ii++] = c1;
        this.indices[ii++] = p1;
        this.indices[ii++] = p0;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const uvAttribute = new THREE.BufferAttribute(this.uvs, 2);
    uvAttribute.setUsage(THREE.StaticDrawUsage);
    const indexAttribute = new THREE.BufferAttribute(this.indices, 1);
    indexAttribute.setUsage(THREE.StaticDrawUsage);

    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("uv", uvAttribute);
    this.geometry.setIndex(indexAttribute);
    this.geometry.setDrawRange(0, 0);
  }

  private writeProfile(
    vertBase: number,
    pos: THREE.Vector3,
    quat: THREE.Quaternion,
  ): void {
    for (let i = 0; i < SABER_TRAIL_PROFILE_COUNT; i++) {
      const i3 = i * 3;
      _tmpV.set(
        this.profileVerts[i3],
        this.profileVerts[i3 + 1],
        this.profileVerts[i3 + 2],
      );
      _tmpV.applyQuaternion(quat);
      _tmpV.add(pos);
      // Match pre-refactor local transform (ignore scale).
      _tmpV.sub(_refPos);
      _tmpV.applyQuaternion(_invRefQuat);
      const dst = (vertBase + i) * 3;
      this.positions[dst] = _tmpV.x;
      this.positions[dst + 1] = _tmpV.y;
      this.positions[dst + 2] = _tmpV.z;
    }
  }

  /**
   * Write ribbon positions: history samples oldest → newest, then live tip.
   * Live tip keeps the ribbon anchored to the current blade pose.
   */
  fillPositions(
    samplePositions: Float32Array,
    sampleOrientations: Float32Array,
    writeIndex: number,
    sampleCount: number,
    matrixWorld: THREE.Matrix4,
    livePosition: THREE.Vector3,
    liveOrientation: THREE.Quaternion,
  ): number {
    if (sampleCount < 1) {
      this.geometry.setDrawRange(0, 0);
      return 0;
    }

    matrixWorld.decompose(_refPos, _refQuat, _refScale);
    _invRefQuat.copy(_refQuat).invert();

    const oldest =
      (writeIndex - sampleCount + SABER_TRAIL_CAPACITY) % SABER_TRAIL_CAPACITY;

    for (let s = 0; s < sampleCount; s++) {
      const slot = (oldest + s) % SABER_TRAIL_CAPACITY;
      const p = slot * 3;
      const q = slot * 4;
      _samplePos.set(
        samplePositions[p],
        samplePositions[p + 1],
        samplePositions[p + 2],
      );
      _sampleQuat.set(
        sampleOrientations[q],
        sampleOrientations[q + 1],
        sampleOrientations[q + 2],
        sampleOrientations[q + 3],
      );
      this.writeProfile(s * SABER_TRAIL_PROFILE_COUNT, _samplePos, _sampleQuat);
    }

    // Live tip = current blade pose (fixes hilt lag from interval sampling).
    this.writeProfile(
      sampleCount * SABER_TRAIL_PROFILE_COUNT,
      livePosition,
      liveOrientation,
    );

    // sampleCount history segments to live tip → sampleCount quads strips
    const activeIndexCount = sampleCount * SABER_TRAIL_PROFILE_COUNT * 6;
    this.positionAttribute.needsUpdate = true;
    this.geometry.setDrawRange(0, activeIndexCount);
    return activeIndexCount;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
