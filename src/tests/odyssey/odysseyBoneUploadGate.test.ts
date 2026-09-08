import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import {
  fingerprintBoneMatrices,
  installOdysseySkeletonUpdate,
  ODYSSEY_BONE_MATRICES_FP,
  ODYSSEY_IDENTITY_BIND_MATRIX,
  getOdysseyBoneMatricesFingerprint,
  markOdysseySkeletonDirty,
} from '@/three/odyssey/OdysseySkeletonBind';
import { RenderPerfStats } from '@/utility/RenderPerfStats';

describe('boneMatrices fingerprint / upload gate', () => {
  test('fingerprintBoneMatrices is stable for identical arrays', () => {
    const a = new Float32Array(64);
    a[0] = 1; a[4] = 2; a[8] = 3;
    expect(fingerprintBoneMatrices(a)).toBe(fingerprintBoneMatrices(a.slice()));
  });

  test('skeleton.update skips boneTexture upload when pose content unchanged', () => {
    RenderPerfStats.enabled = true;
    RenderPerfStats.boneTextureUploads = 0;

    const bone = new THREE.Bone();
    bone.position.set(0, 1, 0);
    bone.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
    const skeleton = new THREE.Skeleton([bone], [inv]);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const n = geo.getAttribute('position').count;
    const skinIndex = new Float32Array(n * 4);
    const skinWeight = new Float32Array(n * 4);
    for(let i = 0; i < n; i++){
      skinWeight[i * 4] = 1;
    }
    geo.setAttribute('skinIndex', new THREE.Float32BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
    const skin = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial());
    skin.bind(skeleton, ODYSSEY_IDENTITY_BIND_MATRIX);
    installOdysseySkeletonUpdate(skeleton, skin);

    skeleton.boneTexture = new THREE.DataTexture(
      new Float32Array(16 * 16 * 4), 16, 16, THREE.RGBAFormat, THREE.FloatType
    );

    skeleton.update();
    const firstUploads = RenderPerfStats.boneTextureUploads;
    expect(firstUploads).toBeGreaterThanOrEqual(1);
    const fp = getOdysseyBoneMatricesFingerprint(skeleton);
    expect(fp).not.toBe(0);
    const versionAfterFirst = skeleton.boneTexture.version;

    // Dirty again with identical pose — should refill CPU but skip GPU upload.
    markOdysseySkeletonDirty(skeleton);
    skeleton.update();
    expect(RenderPerfStats.boneTextureUploads).toBe(firstUploads);
    expect(skeleton.boneTexture.version).toBe(versionAfterFirst);
    expect((skeleton as any)[ODYSSEY_BONE_MATRICES_FP]).toBe(fp);

    // Change bone — must upload.
    bone.position.set(0, 2, 0);
    bone.updateMatrixWorld(true);
    markOdysseySkeletonDirty(skeleton);
    skeleton.update();
    expect(RenderPerfStats.boneTextureUploads).toBeGreaterThan(firstUploads);
    expect(skeleton.boneTexture.version).toBeGreaterThan(versionAfterFirst);

    // New DataTexture (as computeBoneTexture replaces) must upload even if pose matches.
    const prevUploads = RenderPerfStats.boneTextureUploads;
    skeleton.boneTexture = new THREE.DataTexture(
      new Float32Array(16 * 16 * 4), 16, 16, THREE.RGBAFormat, THREE.FloatType
    );
    markOdysseySkeletonDirty(skeleton);
    skeleton.update();
    expect(RenderPerfStats.boneTextureUploads).toBeGreaterThan(prevUploads);

    RenderPerfStats.enabled = false;
  });
});
