/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as THREE from 'three';
import {
  createOdysseyMaterialBaseUniforms,
  enableOdysseyLightmapDefines,
  syncOdysseyMapTransforms,
} from '@engine/render/shaders/chunks/OdysseyLighting';

describe('Odyssey material UV transforms (r186)', () => {
  it('declares all *MapTransform uniforms required by uv_vertex', () => {
    const u = createOdysseyMaterialBaseUniforms();
    for (const key of [
      'mapTransform',
      'alphaMapTransform',
      'lightMapTransform',
      'aoMapTransform',
      'bumpMapTransform',
      'normalMapTransform',
      'displacementMapTransform',
      'emissiveMapTransform',
      'specularMapTransform',
    ]) {
      expect(u[key]?.value).toBeInstanceOf(THREE.Matrix3);
    }
  });

  it('syncOdysseyMapTransforms copies texture.matrix into uv and slot transforms', () => {
    const uniforms = createOdysseyMaterialBaseUniforms();
    const tex = new THREE.Texture();
    tex.offset.set(0.25, 0.5);
    tex.repeat.set(2, 3);
    tex.updateMatrix();

    syncOdysseyMapTransforms(uniforms, 'bumpMap', tex);

    expect(uniforms.uvTransform.value).toBe(tex.matrix);
    expect(uniforms.bumpMapTransform.value).toBe(tex.matrix);
    expect(uniforms.mapTransform.value).not.toBe(tex.matrix);
  });

  it('enableOdysseyLightmapDefines toggles USE_LIGHTMAP and USE_UV1 together', () => {
    const material = { defines: {} as Record<string, unknown>, needsUpdate: false };
    enableOdysseyLightmapDefines(material, true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_UV1')).toBe(true);
    expect(material.needsUpdate).toBe(true);

    material.needsUpdate = false;
    enableOdysseyLightmapDefines(material, false);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_UV1')).toBe(false);
    expect(material.needsUpdate).toBe(true);
  });
});
