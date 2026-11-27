import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';

import {
  applyOdysseyMergedShadowCasterDepthMaterial,
  applyOdysseyShadowCasterDepthMaterials,
  isOdysseyShadowCasterMaterial,
  shouldExcludeOdysseyShadowCasterMesh,
} from '@engine/render/three/odyssey/OdysseyShadowCasterMaterial';

describe('Odyssey shadow casters', () => {
  test('isOdysseyShadowCasterMaterial rejects additive, beaming, and saber materials', () => {
    const additive = new THREE.ShaderMaterial();
    additive.blending = THREE.AdditiveBlending;
    expect(isOdysseyShadowCasterMaterial(additive)).toBe(false);

    const beaming = new THREE.ShaderMaterial();
    beaming.defines = { USE_ODYSSEY_BEAMING: '' };
    expect(isOdysseyShadowCasterMaterial(beaming)).toBe(false);

    const saber = new THREE.ShaderMaterial();
    saber.defines = { SABER: '' };
    expect(isOdysseyShadowCasterMaterial(saber)).toBe(false);

    const normal = new THREE.ShaderMaterial();
    expect(isOdysseyShadowCasterMaterial(normal)).toBe(true);
  });

  test('applyOdysseyShadowCasterDepthMaterials assigns RGBA-packed depth to rigid and skinned meshes', () => {
    // Receivers decode RGBA-packed depth; Three's default shadow material writes basic packing.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.ShaderMaterial());
    applyOdysseyShadowCasterDepthMaterials(mesh);
    const rigidDepth = mesh.customDepthMaterial as THREE.MeshDepthMaterial;
    expect(rigidDepth).toBeTruthy();
    expect(rigidDepth.depthPacking).toBe(THREE.RGBADepthPacking);
    expect(mesh.customDistanceMaterial).toBeTruthy();

    const skin = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.ShaderMaterial());
    applyOdysseyShadowCasterDepthMaterials(skin);
    const skinDepth = skin.customDepthMaterial as THREE.MeshDepthMaterial;
    expect(skinDepth).toBeTruthy();
    expect(skinDepth.depthPacking).toBe(THREE.RGBADepthPacking);
    expect(skinDepth).not.toBe(rigidDepth);
  });

  test('applyOdysseyMergedShadowCasterDepthMaterial assigns RGBA-packed depth without alpha test', () => {
    const merged = new THREE.Mesh(new THREE.BoxGeometry(), [new THREE.ShaderMaterial(), new THREE.ShaderMaterial()]);
    applyOdysseyMergedShadowCasterDepthMaterial(merged);
    const depth = merged.customDepthMaterial as THREE.MeshDepthMaterial;
    expect(depth.depthPacking).toBe(THREE.RGBADepthPacking);
    expect(depth.alphaTest).toBe(0);
    expect(merged.customDistanceMaterial).toBe(depth);
  });

  test('shouldExcludeOdysseyShadowCasterMesh skips force shields and saber meshes', () => {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.ShaderMaterial());
    shield.userData.isForceShield = true;
    expect(shouldExcludeOdysseyShadowCasterMesh(shield)).toBe(true);

    const saber = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.ShaderMaterial());
    (saber.material as THREE.ShaderMaterial).defines = { SABER: '' };
    expect(shouldExcludeOdysseyShadowCasterMesh(saber)).toBe(true);
  });
});
