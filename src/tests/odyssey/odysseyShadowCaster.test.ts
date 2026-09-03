import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';

import {
  applyOdysseyShadowCasterDepthMaterials,
  isOdysseyShadowCasterMaterial,
  shouldExcludeOdysseyShadowCasterMesh,
} from '@/three/odyssey/OdysseyShadowCasterMaterial';

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

  test('applyOdysseyShadowCasterDepthMaterials assigns depth materials for rigid meshes only', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.ShaderMaterial());
    applyOdysseyShadowCasterDepthMaterials(mesh);
    expect(mesh.customDepthMaterial).toBeTruthy();
    expect(mesh.customDistanceMaterial).toBeTruthy();

    const skin = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.ShaderMaterial());
    applyOdysseyShadowCasterDepthMaterials(skin);
    expect(skin.customDepthMaterial).toBeUndefined();
    expect(skin.customDistanceMaterial).toBeUndefined();
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
