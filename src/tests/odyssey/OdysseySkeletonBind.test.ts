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
  collectHeadhookAncestorNames,
  installOdysseySkeletonUpdate,
  ODYSSEY_IDENTITY_BIND_MATRIX,
  preferHeadBonesForNameCollisions,
  reparentBodyUniqueChildrenOntoHead,
  resolveSkinBoneSlot,
} from '@/three/odyssey/OdysseySkeletonBind';
import { OdysseyObject3D } from '@/three/odyssey/OdysseyObject3D';

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

describe('preferHeadBonesForNameCollisions (p_bastilabb head merge)', () => {
  function makeBone(name: string, nodeNumber: number, nameIndex: number): OdysseyObject3D {
    const obj = new OdysseyObject3D();
    obj.name = name;
    (obj as any).odysseyModelNode = { name, nodeNumber, nameIndex };
    return obj;
  }

  test('collectHeadhookAncestorNames includes path to root', () => {
    const torso = new THREE.Object3D();
    torso.name = 'torsoupr_g';
    const headhook = new THREE.Object3D();
    headhook.name = 'headhook';
    torso.add(headhook);
    expect([...collectHeadhookAncestorNames(headhook)]).toEqual(
      expect.arrayContaining(['headhook', 'torsoupr_g']),
    );
  });

  test('BB-style: head wins neck/head_g; headhook ancestors stay body', () => {
    // Body: torsoupr → headhook + necklwr → neck → hturn → head_g
    const bodyTorso = makeBone('torsoupr_g', 4, 17);
    const bodyHeadhook = makeBone('headhook', 41, 54);
    const bodyNecklwr = makeBone('necklwr_g', 43, 55);
    const bodyNeck = makeBone('neck_g', 44, 56);
    const bodyHturn = makeBone('hturn_g', 45, 57);
    const bodyHeadG = makeBone('head_g', 46, 58);
    bodyTorso.add(bodyHeadhook);
    bodyTorso.add(bodyNecklwr);
    bodyNecklwr.add(bodyNeck);
    bodyNeck.add(bodyHturn);
    bodyHturn.add(bodyHeadG);

    // Head: same neck/head names + nodeNumbers, different nameIndex
    const headNecklwr = makeBone('necklwr_g', 43, 5);
    const headNeck = makeBone('neck_g', 44, 6);
    const headHturn = makeBone('hturn_g', 45, 7);
    const headHeadG = makeBone('head_g', 46, 8);
    headNecklwr.add(headNeck);
    headNeck.add(headHturn);
    headHturn.add(headHeadG);

    const nodes = new Map<string, THREE.Object3D>([
      ['torsoupr_g', bodyTorso],
      ['headhook', bodyHeadhook],
      ['necklwr_g', bodyNecklwr],
      ['neck_g', bodyNeck],
      ['hturn_g', bodyHturn],
      ['head_g', bodyHeadG],
    ]);
    const nodesById: (THREE.Object3D | undefined)[] = [];
    nodesById[4] = bodyTorso;
    nodesById[41] = bodyHeadhook;
    nodesById[43] = bodyNecklwr;
    nodesById[44] = bodyNeck;
    nodesById[45] = bodyHturn;
    nodesById[46] = bodyHeadG;
    // Body DFS includes torso (ancestor) + neck stack — like BB torso weighting neck_g
    const dfsNodes: THREE.Object3D[] = [
      bodyTorso,
      bodyNecklwr,
      bodyNeck,
      bodyHturn,
      bodyHeadG,
    ];
    const headDfsNodes: THREE.Object3D[] = [
      headNecklwr,
      headNeck,
      headHturn,
      headHeadG,
    ];

    preferHeadBonesForNameCollisions(
      { nodes, nodesById, dfsNodes },
      headDfsNodes,
      collectHeadhookAncestorNames(bodyHeadhook),
    );

    // Anim maps + body DFS neck/head slots prefer head Object3Ds
    expect(nodes.get('head_g')).toBe(headHeadG);
    expect(nodes.get('neck_g')).toBe(headNeck);
    expect(nodesById[46]).toBe(headHeadG);
    expect(nodesById[44]).toBe(headNeck);
    expect(dfsNodes[2]).toBe(headNeck); // was bodyNeck
    expect(dfsNodes[4]).toBe(headHeadG);

    // headhook ancestors stay body
    expect(nodes.get('torsoupr_g')).toBe(bodyTorso);
    expect(nodes.get('headhook')).toBe(bodyHeadhook);
    expect(nodesById[4]).toBe(bodyTorso);
    expect(dfsNodes[0]).toBe(bodyTorso);

    // Head skin bone === anim map (skelIsNodes)
    expect(headDfsNodes[3]).toBe(nodes.get('head_g'));
  });

  test('reparents body-unique hair onto preferred head_g; skips duplicate names', () => {
    const bodyHeadhook = makeBone('headhook', 41, 54);
    const bodyHeadG = makeBone('head_g', 46, 58);
    const bodyFace = makeBone('f_rns_g', 50, 60);
    const hair = makeBone('hair', 103, 12);
    hair.position.set(0, 0.01, 0.05);
    bodyHeadG.add(bodyFace);
    bodyHeadG.add(hair);

    const headHeadG = makeBone('head_g', 46, 8);
    const headFace = makeBone('f_rns_g', 50, 18);
    headHeadG.add(headFace);

    const nodes = new Map<string, THREE.Object3D>([
      ['headhook', bodyHeadhook],
      ['head_g', bodyHeadG],
      ['hair', hair],
      ['f_rns_g', bodyFace],
    ]);
    const nodesById: (THREE.Object3D | undefined)[] = [];
    nodesById[46] = bodyHeadG;
    const dfsNodes: THREE.Object3D[] = [bodyHeadG];
    const headDfsNodes: THREE.Object3D[] = [headHeadG];

    preferHeadBonesForNameCollisions(
      { nodes, nodesById, dfsNodes },
      headDfsNodes,
      collectHeadhookAncestorNames(bodyHeadhook),
    );

    expect(nodes.get('head_g')).toBe(headHeadG);
    expect(hair.parent).toBe(headHeadG);
    expect(hair.position.z).toBeCloseTo(0.05);
    // Duplicate-named face bone stays on body head_g (not double-added)
    expect(headHeadG.children.filter((c) => c.name === 'f_rns_g')).toHaveLength(1);
    expect(headFace.parent).toBe(headHeadG);
    expect(bodyFace.parent).toBe(bodyHeadG);
  });

  test('replaces empty head eyera/teethu placeholders with meshed body nodes', () => {
    const bodyHeadhook = makeBone('headhook', 41, 54);
    const bodyHeadG = makeBone('head_g', 46, 58);
    const bodyEyera = makeBone('eyera', 90, 30);
    const eyeMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial(),
    );
    bodyEyera.add(eyeMesh);
    const bodyTalk = makeBone('talkdummy', 91, 31);
    const bodyJaw = makeBone('f_jaw_g', 92, 32);
    const bodyTeethl = makeBone('teethl', 93, 33);
    const teethMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial(),
    );
    bodyTeethl.add(teethMesh);
    bodyJaw.add(bodyTeethl);
    bodyTalk.add(bodyJaw);
    bodyHeadG.add(bodyEyera);
    bodyHeadG.add(bodyTalk);

    const headHeadG = makeBone('head_g', 46, 8);
    const headEyera = makeBone('eyera', 90, 20); // empty placeholder
    const headTalk = makeBone('talkdummy', 91, 21);
    const headJaw = makeBone('f_jaw_g', 92, 22);
    const headTeethl = makeBone('teethl', 93, 23); // empty
    headJaw.add(headTeethl);
    headTalk.add(headJaw);
    headHeadG.add(headEyera);
    headHeadG.add(headTalk);

    const nodes = new Map<string, THREE.Object3D>([
      ['headhook', bodyHeadhook],
      ['head_g', bodyHeadG],
      ['eyera', headEyera],
      ['teethl', headTeethl],
    ]);
    const nodesById: (THREE.Object3D | undefined)[] = [];
    nodesById[46] = bodyHeadG;
    nodesById[90] = headEyera;

    preferHeadBonesForNameCollisions(
      { nodes, nodesById, dfsNodes: [bodyHeadG] },
      [headHeadG],
      collectHeadhookAncestorNames(bodyHeadhook),
    );

    expect(bodyEyera.parent).toBe(headHeadG);
    expect(headEyera.parent).toBeNull();
    expect(nodes.get('eyera')).toBe(bodyEyera);
    expect(nodesById[90]).toBe(bodyEyera);
    expect(bodyTeethl.parent).toBe(headJaw);
    expect(headTeethl.parent).toBeNull();
    expect(eyeMesh.parent).toBe(bodyEyera);
    expect(teethMesh.parent).toBe(bodyTeethl);
  });
});
