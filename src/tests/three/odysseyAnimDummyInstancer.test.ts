import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import {
  buildAnimDummyInstanceBatches,
  updateAnimDummyInstances,
} from '@/three/odyssey/OdysseyAnimDummyInstancer';

function makeAnimDummyLeaf(
  parent: THREE.Object3D,
  material: THREE.Material,
  geometry: THREE.BufferGeometry,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.userData.odysseyModelNode = { isAnimDummyNode: true };
  (mesh as any).odysseyNode = { isAnimDummyNode: true };
  parent.add(mesh);
  return mesh;
}

describe('OdysseyAnimDummyInstancer', () => {
  test('batches anim-dummy leaves that share material + geometry', () => {
    const root = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial();
    (mat as any).userData = { odysseyMaterialCacheId: 'lts_bwall06|share' };
    const geo = new THREE.BoxGeometry(1, 1, 1);

    for(let i = 0; i < 4; i++){
      const node = new THREE.Object3D();
      node.position.set(i * 2, 0, 0);
      root.add(node);
      makeAnimDummyLeaf(node, mat, geo, `ship_${i}`);
    }

    const batches = buildAnimDummyInstanceBatches(root);
    expect(batches.length).toBe(1);
    expect(batches[0].sources.length).toBe(4);
    expect(batches[0].instanced.count).toBe(4);
    expect(root.children.some((c) => c.name === 'animDummyInstances')).toBe(true);

    for(const src of batches[0].sources){
      expect(src.visible).toBe(false);
    }
  });

  test('skips non-anim-dummy and singleton groups', () => {
    const root = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial();
    const geo = new THREE.BoxGeometry(1, 1, 1);

    const staticMesh = new THREE.Mesh(geo, mat);
    root.add(staticMesh);

    const node = new THREE.Object3D();
    root.add(node);
    makeAnimDummyLeaf(node, mat, geo, 'alone');

    const batches = buildAnimDummyInstanceBatches(root);
    expect(batches.length).toBe(0);
    expect(staticMesh.visible).toBe(true);
  });

  test('updateAnimDummyInstances writes relative matrices', () => {
    const root = new THREE.Group();
    root.position.set(10, 0, 0);
    const mat = new THREE.MeshBasicMaterial();
    (mat as any).userData = { odysseyMaterialCacheId: 'shared' };
    const geo = new THREE.BoxGeometry(1, 1, 1);

    const nodeA = new THREE.Object3D();
    nodeA.position.set(1, 0, 0);
    root.add(nodeA);
    makeAnimDummyLeaf(nodeA, mat, geo, 'a');

    const nodeB = new THREE.Object3D();
    nodeB.position.set(3, 0, 0);
    root.add(nodeB);
    makeAnimDummyLeaf(nodeB, mat, geo, 'b');

    buildAnimDummyInstanceBatches(root);
    root.updateMatrixWorld(true);
    updateAnimDummyInstances(root as any);

    const batches = (root as any).animDummyInstanceBatches as {
      instanced: THREE.InstancedMesh;
    }[];
    expect(batches.length).toBe(1);

    const m = new THREE.Matrix4();
    batches[0].instanced.getMatrixAt(0, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(1, 4);
  });
});
