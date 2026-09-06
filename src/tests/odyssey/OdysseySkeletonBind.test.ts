/**
 * Regression: skin bind resolves bone_parts as GatherBones DFS indices
 * (retail PostProcess / ExecuteSkinTransforms), keeps MDL inverses, and updates
 * bone matrices in skin-local space.
 * p_bastilabb-style nameIndex≠DFS slots must bind dfsNodes[parts], not names[parts].
 */
import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import {
  buildGatherBonesDfsOrder,
  installOdysseySkeletonUpdate,
  ODYSSEY_IDENTITY_BIND_MATRIX,
  resolveSkinBoneSlot,
} from '@/three/odyssey/OdysseySkeletonBind';

function maxBoneMatrixTranslation(skeleton: THREE.Skeleton): number {
  skeleton.update();
  const bm = skeleton.boneMatrices;
  let maxT = 0;
  for (let i = 0; i < skeleton.bones.length; i++) {
    if (!skeleton.bones[i]) continue;
    const o = i * 16;
    maxT = Math.max(maxT, Math.hypot(bm[o + 12], bm[o + 13], bm[o + 14]));
  }
  return maxT;
}

function bindPoseError(
  bone: THREE.Object3D,
  inv: THREE.Matrix4,
  skinWorld: THREE.Matrix4,
): number {
  const skinInverse = new THREE.Matrix4().copy(skinWorld).invert();
  const boneLocal = new THREE.Matrix4().multiplyMatrices(skinInverse, bone.matrixWorld);
  const product = new THREE.Matrix4().multiplyMatrices(boneLocal, inv);
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  let err = 0;
  for (let i = 0; i < 16; i++) {
    err += Math.abs(product.elements[i] - I[i]);
  }
  return err;
}

function makeSkinLocalInverse(bone: THREE.Object3D, skinWorld: THREE.Matrix4): THREE.Matrix4 {
  const skinInverse = new THREE.Matrix4().copy(skinWorld).invert();
  return new THREE.Matrix4().multiplyMatrices(skinInverse, bone.matrixWorld).invert();
}

/** Mirrors OdysseyModel3D.buildSkeleton: bone_parts → dfsNodes[dfs] + inv[dfs]. */
function bindByDfsParts(
  skin: THREE.SkinnedMesh,
  dfsNodes: THREE.Object3D[],
  boneParts: number[],
  inverseMats: THREE.Matrix4[],
): void {
  const bones: (THREE.Object3D | undefined)[] = [];
  const inverses: THREE.Matrix4[] = [];
  for (let j = 0; j < boneParts.length; j++) {
    const { bone, inverse } = resolveSkinBoneSlot(
      boneParts[j],
      dfsNodes,
      inverseMats,
      dfsNodes.length,
      j,
    );
    bones[j] = bone;
    inverses[j] = inverse;
  }
  const skeleton = new THREE.Skeleton(bones as THREE.Bone[], inverses);
  skin.bindMode = 'detached';
  skin.bind(skeleton, ODYSSEY_IDENTITY_BIND_MATRIX);
  installOdysseySkeletonUpdate(skeleton, skin);
  skeleton.update();
}

describe('OdysseySkeletonBind DFS bone_parts', () => {
  test('bone_parts DFS resolves geometry bone when Map has a same-named impostor', () => {
    const pelvis = new THREE.Object3D();
    pelvis.name = 'pelvis_g';
    (pelvis as any).odysseyModelNode = { nameIndex: 1, nodeNumber: 10 };
    pelvis.position.set(0, 0, 1);

    const impostor = new THREE.Object3D();
    impostor.name = 'pelvis_g';
    (impostor as any).odysseyModelNode = { nameIndex: 99, nodeNumber: 99 };
    impostor.position.set(50, 50, 50);

    const lfoot = new THREE.Object3D();
    lfoot.name = 'lfoot_g';
    (lfoot as any).odysseyModelNode = { nameIndex: 2, nodeNumber: 11 };
    lfoot.position.set(0.1, 0, -0.8);

    const root = new THREE.Object3D();
    root.name = 'root';
    (root as any).odysseyModelNode = { nameIndex: 0, nodeNumber: 0 };

    const torsoNode = new THREE.Object3D();
    torsoNode.name = 'torso';

    const model = new THREE.Object3D();
    model.add(root);
    root.add(impostor);
    root.add(pelvis);
    pelvis.add(lfoot);
    pelvis.add(torsoNode);

    const nodesByName = new Map<string, THREE.Object3D>();
    nodesByName.set('pelvis_g', impostor);
    nodesByName.set('lfoot_g', lfoot);
    nodesByName.set('root', root);

    const names = ['root', 'pelvis_g', 'lfoot_g'];
    const { dfsNodes } = buildGatherBonesDfsOrder(root, names);
    // Impostor nameIndex 99 outside names → skipped; DFS: root, pelvis, lfoot
    expect(dfsNodes.map((n) => n.name)).toEqual(['root', 'pelvis_g', 'lfoot_g']);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0.05, 0, 0.1], 3));
    geometry.setAttribute('skinIndex', new THREE.Float32BufferAttribute([0, 1, 0, 0], 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([0.5, 0.5, 0, 0], 4));
    const skin = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    torsoNode.add(skin);

    const container = new THREE.Object3D();
    container.position.set(404, 144, 9);
    container.add(model);
    container.updateMatrixWorld(true);

    const inverseMats = [
      makeSkinLocalInverse(root, torsoNode.matrixWorld),
      makeSkinLocalInverse(pelvis, torsoNode.matrixWorld),
      makeSkinLocalInverse(lfoot, torsoNode.matrixWorld),
    ];
    // bone_parts: DFS indices (pelvis=1, lfoot=2)
    bindByDfsParts(skin, dfsNodes, [1, 2, 0xffff], inverseMats);

    expect(skin.skeleton.bones[0]).toBe(pelvis);
    expect(skin.skeleton.bones[0]).not.toBe(impostor);
    expect(nodesByName.get('pelvis_g')).toBe(impostor);
    expect(maxBoneMatrixTranslation(skin.skeleton)).toBeLessThan(5);

    lfoot.rotation.x = 0.4;
    container.updateMatrixWorld(true);
    skin.updateMatrixWorld(true);
    skin.skeleton.update();
    expect(maxBoneMatrixTranslation(skin.skeleton)).toBeLessThan(5);

    const target = new THREE.Vector3(0.05, 0, 0.1);
    skin.boneTransform(0, target);
    expect(target.length()).toBeLessThan(3);
  });

  test('p_bastilabb-style: bone_parts is DFS index when nameIndex ≠ DFS', () => {
    // DFS: root(0), a(1), b(2). names[0]=root, names[1]=b, names[2]=a
    // nameIndex of a is 2, of b is 1 — like BB legs.
    const root = new THREE.Object3D();
    root.name = 'root';
    (root as any).odysseyModelNode = { nameIndex: 0 };

    const a = new THREE.Object3D();
    a.name = 'a';
    (a as any).odysseyModelNode = { nameIndex: 2 };
    a.position.set(0, 0, 1);

    const b = new THREE.Object3D();
    b.name = 'b';
    (b as any).odysseyModelNode = { nameIndex: 1 };
    b.position.set(0.2, 0, -0.5);

    const torso = new THREE.Object3D();
    torso.name = 'torso';

    root.add(a);
    a.add(b);
    a.add(torso);

    const names = ['root', 'b', 'a'];
    const { dfsIndexByNameIndex, dfsNodes } = buildGatherBonesDfsOrder(root, names);
    expect(dfsNodes.map((n) => n.name)).toEqual(['root', 'a', 'b']);
    expect(dfsIndexByNameIndex[2]).toBe(1); // a
    expect(dfsIndexByNameIndex[1]).toBe(2); // b
    expect(dfsIndexByNameIndex[1]).not.toBe(1);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    geometry.setAttribute('skinIndex', new THREE.Float32BufferAttribute([0, 0, 0, 0], 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0], 4));
    const skin = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    torso.add(skin);

    const container = new THREE.Object3D();
    container.position.set(100, 50, 20);
    container.add(root);
    container.updateMatrixWorld(true);

    const invRoot = makeSkinLocalInverse(root, torso.matrixWorld);
    const invA = makeSkinLocalInverse(a, torso.matrixWorld);
    const invB = makeSkinLocalInverse(b, torso.matrixWorld);
    const inverseMats = [invRoot, invA, invB];

    // Old bug: treat bone_parts as nameIndex → slot gets b when DFS says a
    expect(names[2]).toBe('a');
    expect(dfsNodes[1]).toBe(a);
    expect(dfsNodes[2]).toBe(b);

    // Retail bone_parts store DFS: slot0 → dfs 1 (a), slot1 → dfs 2 (b)
    bindByDfsParts(skin, dfsNodes, [1, 2], inverseMats);

    expect(skin.skeleton.bones[0]).toBe(a);
    expect(skin.skeleton.bones[1]).toBe(b);
    // Must NOT be nameIndex lookup (names[1]=b, names[2]=a would swap)
    expect(skin.skeleton.bones[0]).not.toBe(b);
    expect(skin.skeleton.boneInverses[0]).toBe(invA);
    expect(skin.skeleton.boneInverses[1]).toBe(invB);

    expect(bindPoseError(a, skin.skeleton.boneInverses[0], torso.matrixWorld)).toBeLessThan(1e-6);
    expect(bindPoseError(b, skin.skeleton.boneInverses[1], torso.matrixWorld)).toBeLessThan(1e-6);
    expect(maxBoneMatrixTranslation(skin.skeleton)).toBeLessThan(1e-4);

    // Contrast: nameIndex-as-parts would bind wrongly
    const wrongBone = resolveSkinBoneSlot(2, dfsNodes, inverseMats, dfsNodes.length);
    expect(wrongBone.bone).toBe(b); // dfsNodes[2]=b, whereas names[2]=a
  });
});
