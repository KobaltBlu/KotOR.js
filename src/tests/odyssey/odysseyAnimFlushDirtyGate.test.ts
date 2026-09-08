import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { OdysseyModelAnimationManager } from '@/odyssey/OdysseyModelAnimationManager';

describe('OdysseyModelAnimationManager flushTouchedNodeMatrices', () => {
  test('does not mark skeletons dirty when no nodes were touched', () => {
    const bone = new THREE.Bone();
    const skeleton = new THREE.Skeleton([bone], [new THREE.Matrix4()]);
    (skeleton as any).odysseyBonesDirty = false;

    const skin = new THREE.SkinnedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    skin.skeleton = skeleton;

    const model: any = {
      skins: [skin],
      animateFrame: true,
      animationManager: null as any,
    };
    const mgr = new OdysseyModelAnimationManager(model);
    model.animationManager = mgr;

    // Empty flush — must not dirty.
    (mgr as any).flushTouchedNodeMatrices();
    expect((skeleton as any).odysseyBonesDirty).toBe(false);

    // Touched flush — must dirty.
    (mgr as any)._touchedTransformNodes.push(bone);
    (mgr as any)._touchedTransformNodeSet.add(bone);
    (mgr as any).flushTouchedNodeMatrices();
    expect((skeleton as any).odysseyBonesDirty).toBe(true);
  });
});
