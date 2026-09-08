import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { OdysseyMaterialBuilder } from '@/three/odyssey/OdysseyMaterialBuilder';
import { OdysseyTexture } from '@/three/odyssey/OdysseyTexture';
import { TXI } from '@/resource/TXI';

function makeShaderMaterial(defines: Record<string, string> = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    defines,
    uniforms: {
      map: { value: null },
      uvTransform: { value: new THREE.Matrix3() },
    },
  });
}

describe('OdysseyMaterialBuilder additive TXI vs SABER', () => {
  const resolveTexture = async () => null as any;

  test('SABER + additive TXI stays transparent with no depth write', async () => {
    const material = makeShaderMaterial({ SABER: '', IGNORE_LIGHTING: '' });
    material.transparent = true;
    material.depthWrite = false;

    const texture = new OdysseyTexture();
    texture.txi = new TXI('blending additive\r\n');

    await OdysseyMaterialBuilder.applyTXIToMaterial(texture, material, { resolveTexture });

    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
  });

  test('non-saber additive TXI stays opaque with no depth write', async () => {
    const material = makeShaderMaterial();
    material.transparent = true;

    const texture = new OdysseyTexture();
    texture.txi = new TXI('blending additive\r\n');

    await OdysseyMaterialBuilder.applyTXIToMaterial(texture, material, { resolveTexture });

    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(false);
  });
});
