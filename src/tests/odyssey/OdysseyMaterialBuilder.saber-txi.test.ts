import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { OdysseyMaterialBuilder } from '@/three/odyssey/OdysseyMaterialBuilder';
import { OdysseyTexture } from '@/three/odyssey/OdysseyTexture';
import { TXI } from '@/resource/TXI';
import { TXIPROCEDURETYPE } from '@/enums/graphics/txi/TXIPROCEDURETYPE';

function makeShaderMaterial(defines: Record<string, string> = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    defines,
    uniforms: {
      map: { value: null },
      uvTransform: { value: new THREE.Matrix3() },
      opacity: { value: 1 },
      waterAlpha: { value: 1 },
    },
  });
}

describe('OdysseyMaterialBuilder additive TXI vs SABER / FORCE_SHIELD', () => {
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

  test('FORCE_SHIELD + additive TXI stays transparent with no depth write', async () => {
    const material = makeShaderMaterial({ FORCE_SHIELD: '', IGNORE_LIGHTING: '' });
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

  test('additive + proceduretype water does not enable WATER define or DoubleSide', async () => {
    const material = makeShaderMaterial();
    material.side = THREE.FrontSide;

    const texture = new OdysseyTexture();
    texture.txi = new TXI('blending additive\r\nproceduretype water\r\n');
    expect(texture.txi.procedureType).toBe(TXIPROCEDURETYPE.WATER);
    expect(texture.txi.blending).toBe(1);

    await OdysseyMaterialBuilder.applyTXIToMaterial(texture, material, { resolveTexture });

    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(THREE.FrontSide);
    expect(material.defines).not.toHaveProperty('WATER');
    expect(material.defines).not.toHaveProperty('IGNORE_LIGHTING');
    expect(material.transparent).toBe(false);
  });

  test('additive + proceduretype water stays transparent when odysseyAlphaFx is set', async () => {
    const material = makeShaderMaterial();
    material.userData.odysseyAlphaFx = true;
    material.transparent = true;

    const texture = new OdysseyTexture();
    texture.txi = new TXI('blending additive\r\nproceduretype water\r\n');

    await OdysseyMaterialBuilder.applyTXIToMaterial(texture, material, { resolveTexture });

    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(THREE.FrontSide);
    expect(material.defines).not.toHaveProperty('WATER');
  });

  test('non-additive proceduretype water still gets DoubleSide without WATER define', async () => {
    const material = makeShaderMaterial();
    material.side = THREE.FrontSide;

    const texture = new OdysseyTexture();
    texture.txi = new TXI('proceduretype water\r\n');

    await OdysseyMaterialBuilder.applyTXIToMaterial(texture, material, { resolveTexture });

    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.depthWrite).toBe(false);
    expect(material.transparent).toBe(true);
    expect(material.defines).toHaveProperty('IGNORE_LIGHTING');
    // Bare proceduretype water no longer sets WATER; real water uses waterAlpha path.
    expect(material.defines).not.toHaveProperty('WATER');
  });
});
