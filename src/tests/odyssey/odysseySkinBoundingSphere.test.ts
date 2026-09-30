import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import {
  installOdysseySkeletonUpdate,
  markOdysseySkeletonDirty,
  ODYSSEY_IDENTITY_BIND_MATRIX,
  registerOdysseySkinBounds,
} from '@/three/odyssey/OdysseySkeletonBind';

function makeSkinnedWithBone(boneLocalY = 1): {
  skeleton: THREE.Skeleton;
  skin: THREE.SkinnedMesh;
  bone: THREE.Bone;
} {
  const bone = new THREE.Bone();
  bone.position.set(0, boneLocalY, 0);
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
  skin.add(bone);
  skin.updateMatrixWorld(true);
  // Inverse at bind pose (skin-local bone world after first updateMatrixWorld).
  const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
  // For detached identity bind, MDL inverses are skin-local; rebuild inverse
  // relative to skin so boneMatrices stay mesh-local when the skin translates.
  const skinInv = new THREE.Matrix4().copy(skin.matrixWorld).invert();
  const boneLocal = new THREE.Matrix4().multiplyMatrices(skinInv, bone.matrixWorld);
  const boneInverse = new THREE.Matrix4().copy(boneLocal).invert();
  const skeleton = new THREE.Skeleton([bone], [boneInverse]);
  skin.bindMode = 'detached';
  skin.bind(skeleton, ODYSSEY_IDENTITY_BIND_MATRIX);
  return { skeleton, skin, bone };
}

describe('Odyssey skinned boundingSphere refresh', () => {
  test('skeleton.update after install fills a finite mesh-local sphere', () => {
    const { skeleton, skin } = makeSkinnedWithBone();
    // Translate the whole skin+bone hierarchy — local sphere must not follow world pos.
    skin.position.set(100, 200, 50);
    skin.updateMatrixWorld(true);
    installOdysseySkeletonUpdate(skeleton, skin);

    expect(skin.boundingSphere).toBeNull();
    skeleton.update();
    expect(skin.boundingSphere).not.toBeNull();
    expect(Number.isFinite(skin.boundingSphere!.radius)).toBe(true);
    expect(skin.boundingSphere!.radius).toBeGreaterThan(0);
    expect(Math.abs(skin.boundingSphere!.center.x)).toBeLessThan(10);
    expect(Math.abs(skin.boundingSphere!.center.y)).toBeLessThan(10);
  });

  test('applyBoneTransform matches boneTransform (mesh-local)', () => {
    const { skeleton, skin } = makeSkinnedWithBone();
    skin.position.set(40, 50, 60);
    skin.updateMatrixWorld(true);
    installOdysseySkeletonUpdate(skeleton, skin);
    skeleton.update();

    const a = new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position, 0);
    const b = a.clone();
    skin.applyBoneTransform(0, a);
    skin.boneTransform(0, b);
    expect(a.distanceTo(b)).toBeLessThan(1e-6);
    expect(Math.abs(a.x)).toBeLessThan(5);
  });

  test('pose change refreshes sphere; identical pose skips recompute', () => {
    const { skeleton, skin, bone } = makeSkinnedWithBone();
    installOdysseySkeletonUpdate(skeleton, skin);

    skeleton.update();
    const firstCenter = skin.boundingSphere!.center.clone();
    const firstRadius = skin.boundingSphere!.radius;

    bone.position.set(0, 3, 0);
    bone.updateMatrixWorld(true);
    markOdysseySkeletonDirty(skeleton);
    skeleton.update();
    const moved =
      !skin.boundingSphere!.center.equals(firstCenter) ||
      skin.boundingSphere!.radius !== firstRadius;
    expect(moved).toBe(true);

    const afterMoveCenter = skin.boundingSphere!.center.clone();
    const afterMoveRadius = skin.boundingSphere!.radius;
    skeleton.update();
    expect(skin.boundingSphere!.center.equals(afterMoveCenter)).toBe(true);
    expect(skin.boundingSphere!.radius).toBe(afterMoveRadius);
  });

  test('shared skeleton refreshes all registered skins', () => {
    const { skeleton, skin: skinA, bone } = makeSkinnedWithBone();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const n = geo.getAttribute('position').count;
    const skinIndex = new Float32Array(n * 4);
    const skinWeight = new Float32Array(n * 4);
    for(let i = 0; i < n; i++){
      skinWeight[i * 4] = 1;
    }
    geo.setAttribute('skinIndex', new THREE.Float32BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
    const skinB = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial());
    skinB.bindMode = 'detached';
    skinB.bind(skeleton, ODYSSEY_IDENTITY_BIND_MATRIX);

    installOdysseySkeletonUpdate(skeleton, skinA);
    registerOdysseySkinBounds(skeleton, skinB);

    skeleton.update();
    expect(skinA.boundingSphere).not.toBeNull();
    expect(skinB.boundingSphere).not.toBeNull();

    bone.position.set(2, 1, 0);
    bone.updateMatrixWorld(true);
    markOdysseySkeletonDirty(skeleton);
    const aBefore = skinA.boundingSphere!.center.clone();
    const bBefore = skinB.boundingSphere!.center.clone();
    skeleton.update();
    expect(
      !skinA.boundingSphere!.center.equals(aBefore) ||
      !skinB.boundingSphere!.center.equals(bBefore)
    ).toBe(true);
  });

  test('per-bone sphere contains exact CPU-skinned sphere for a posed rig', () => {
    const { skeleton, skin, bone } = makeSkinnedWithBone(2);
    installOdysseySkeletonUpdate(skeleton, skin);

    bone.position.set(0, 2, 1);
    bone.rotation.z = 0.4;
    bone.updateMatrixWorld(true);
    markOdysseySkeletonDirty(skeleton);
    skeleton.update();

    const approx = skin.boundingSphere!.clone();
    // Exact reference via three.js per-vertex path (uses patched applyBoneTransform).
    skin.computeBoundingSphere();
    const exact = skin.boundingSphere!;

    expect(approx.radius).toBeGreaterThanOrEqual(exact.radius - 1e-4);
    // exact sphere ⊆ approx when |c_a - c_e| + r_e <= r_a (+eps).
    const centerDist = approx.center.distanceTo(exact.center);
    expect(centerDist + exact.radius).toBeLessThanOrEqual(approx.radius + 0.05);
  });
});
