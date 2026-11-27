/**
 * @jest-environment node
 *
 * OdysseyEmitter3D construction: uniforms match the base emitter shader set plus
 * textureAnimation, uniforms are not shared between emitters, and the reference
 * target placeholder is created only when read.
 */
import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import '@engine/managers/ShaderManager';
import { OdysseyModelNodeEmitter } from '@engine/odyssey/OdysseyModelNodeEmitter';
import { OdysseyEmitter3D } from '@engine/render/three/odyssey/OdysseyEmitter3D';
import { OdysseyObject3D } from '@engine/render/three/odyssey/OdysseyObject3D';

function makeNode(overrides: Record<string, unknown> = {}): OdysseyModelNodeEmitter {
  const node = new OdysseyModelNodeEmitter(undefined as any);
  Object.assign(node, {
    name: 'fx_emit',
    renderMode: 'Normal',
    updateMode: 'Fountain',
    textureResRef: 'fxpa_smoke',
    chunkResRef: '',
    gridX: 4,
    gridY: 2,
    loop: 1,
    controllers: new Map(),
    ...overrides,
  });
  return node;
}

describe('OdysseyEmitter3D construction', () => {
  test('uniforms equal the base emitter set plus textureAnimation', () => {
    const emitter = new OdysseyEmitter3D(makeNode());
    const base = THREE.ShaderLib['odyssey-emitter'].uniforms;
    const uniforms = emitter.material.uniforms;
    for (const key of Object.keys(base)) {
      expect(uniforms).toHaveProperty(key);
    }
    expect(uniforms.textureAnimation.value).toBeInstanceOf(THREE.Vector4);
    expect(uniforms.textureAnimation.value.toArray()).toEqual([4, 2, 8, 1]);
  });

  test('emitters never share uniform values or scratch buffers', () => {
    const a = new OdysseyEmitter3D(makeNode());
    const b = new OdysseyEmitter3D(makeNode({ gridX: 1, gridY: 1 }));
    expect(a.material.uniforms).not.toBe(b.material.uniforms);
    for (const key of Object.keys(a.material.uniforms)) {
      const va = a.material.uniforms[key].value;
      if (va && typeof va === 'object' && !(va instanceof THREE.Texture)) {
        expect(va).not.toBe(b.material.uniforms[key].value);
      }
    }
    expect(b.material.uniforms.textureAnimation.value.toArray()).toEqual([1, 1, 1, 1]);
  });

  test('reference target is lazy and assignable', () => {
    const emitter = new OdysseyEmitter3D(makeNode());
    expect((emitter as any)._referenceNode).toBeUndefined();
    const placeholder = emitter.referenceNode;
    expect(placeholder).toBeInstanceOf(OdysseyObject3D);
    expect(emitter.referenceNode).toBe(placeholder);

    const target = new OdysseyObject3D();
    emitter.setReferenceNode(target);
    expect(emitter.referenceNode).toBe(target);
    expect(emitter.hasReferenceTarget).toBe(true);
  });
});
