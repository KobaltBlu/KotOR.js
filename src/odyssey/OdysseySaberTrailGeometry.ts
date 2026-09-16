import * as THREE from "three";

/** Ring sample capacity. */
export const SABER_TRAIL_CAPACITY = 20;
/** Trail profile cross-section vertex count. */
export const SABER_TRAIL_PROFILE_COUNT = 4;
/** Draw trail profile base vert index. */
export const SABER_TRAIL_PROFILE_VERT = 88;

const MAX_VERTEX_COUNT = SABER_TRAIL_CAPACITY * SABER_TRAIL_PROFILE_COUNT;
const MAX_INDEX_COUNT =
  (SABER_TRAIL_CAPACITY - 1) * SABER_TRAIL_PROFILE_COUNT * 6;

const _tmpV = new THREE.Vector3();
const _samplePos = new THREE.Vector3();
const _sampleQuat = new THREE.Quaternion();
const _invMatrix = new THREE.Matrix4();

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

    for (let slot = 0; slot < SABER_TRAIL_CAPACITY; slot++) {
      const base = slot * SABER_TRAIL_PROFILE_COUNT;
      for (let i = 0; i < SABER_TRAIL_PROFILE_COUNT; i++) {
        const i2 = i * 2;
        const dst = (base + i) * 2;
        this.uvs[dst] = profileUVs[i2] ?? 0;
        this.uvs[dst + 1] = profileUVs[i2 + 1] ?? 0;
      }
    }

    let ii = 0;
    for (let slot = 0; slot < SABER_TRAIL_CAPACITY - 1; slot++) {
      // Positions are filled oldest → newest; match prior emitProfilePair
      // winding (curr = newer, prev = older).
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

  /**
   * Write ribbon positions for `sampleCount` ring samples into the position buffer.
   * Samples are read oldest → newest. Returns active index count for setDrawRange.
   * Uses matrix invert (no decompose) so the caller can own the single per-update decompose.
   */
  fillPositions(
    samplePositions: Float32Array,
    sampleOrientations: Float32Array,
    writeIndex: number,
    sampleCount: number,
    matrixWorld: THREE.Matrix4,
  ): number {
    if (sampleCount < 2) {
      this.geometry.setDrawRange(0, 0);
      return 0;
    }

    _invMatrix.copy(matrixWorld).invert();

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

      const vertBase = s * SABER_TRAIL_PROFILE_COUNT;
      for (let i = 0; i < SABER_TRAIL_PROFILE_COUNT; i++) {
        const i3 = i * 3;
        _tmpV.set(
          this.profileVerts[i3],
          this.profileVerts[i3 + 1],
          this.profileVerts[i3 + 2],
        );
        _tmpV.applyQuaternion(_sampleQuat);
        _tmpV.add(_samplePos);
        _tmpV.applyMatrix4(_invMatrix);
        const dst = (vertBase + i) * 3;
        this.positions[dst] = _tmpV.x;
        this.positions[dst + 1] = _tmpV.y;
        this.positions[dst + 2] = _tmpV.z;
      }
    }

    const activeIndexCount =
      (sampleCount - 1) * SABER_TRAIL_PROFILE_COUNT * 6;
    this.positionAttribute.needsUpdate = true;
    this.geometry.setDrawRange(0, activeIndexCount);
    return activeIndexCount;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
