/// <reference types="jest" />
import * as THREE from 'three';
import { OdysseyEmitter3D } from '@/three/odyssey/OdysseyEmitter3D';
import { LifeExpController } from '@/odyssey/controllers/LifeExpController';

jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/loaders/TextureLoader', () => ({ TextureLoader: {} }));
jest.mock('@/odyssey', () => ({ OdysseyModelNode: class {}, OdysseyModelNodeEmitter: class {} }));
jest.mock('@/three/odyssey/OdysseyObject3D', () => ({
  OdysseyObject3D: class extends (require('three').Object3D) {},
}));
jest.mock('@/three/odyssey/windPowerContext', () => ({
  ODYSSEY_AREA_WIND_DIRECTION: new (require('three').Vector3)(1, 0, 0),
  resolveDanglyWindPower: () => 0,
}));

function emitterFixture() {
  // A synthetic node deliberately skips constructor model-resource loading.
  const emitter = new OdysseyEmitter3D({ renderMode: 'Normal', flags: {} } as any);
  emitter.material = new THREE.ShaderMaterial({ uniforms: {
    maxAge: { value: 0 }, drag: { value: 0 }, velocity: { value: 0 },
    randVelocity: { value: 0 }, time: { value: 0 },
  } });
  emitter.offsets = new THREE.BufferAttribute(new Float32Array(), 3);
  emitter.updateType = 'Lightning';
  emitter.tickLightning = jest.fn();
  return emitter;
}

test('controller-driven velocity/drag caches refresh without restarting births', () => {
  const emitter = emitterFixture();
  emitter.velocity = 10;
  emitter.randVelocity = 2;
  emitter.spread = 0;
  emitter.drag = 0.25;
  emitter.lifeExp = 2.5;
  emitter._birthTimer = 0.125;
  emitter.refreshDerivedState();
  expect(emitter.d * emitter.vz).toBeCloseTo(10);
  expect(emitter.d2 * emitter.vz).toBeCloseTo(2);
  expect(emitter.material.uniforms.drag.value).toBe(0.25);
  expect(emitter.material.uniforms.maxAge.value).toBe(2.5);
  expect(emitter._birthTimer).toBe(0.125);
  emitter.dispose();
});

test('detonation-controller activation triggers once per positive edge', () => {
  const emitter = emitterFixture();
  emitter.detonate = jest.fn();
  emitter._detonate = 1;
  emitter.tick(0.01);
  emitter.tick(0.01);
  expect(emitter.detonate).toHaveBeenCalledTimes(1);
  emitter._detonate = 0;
  emitter.tick(0.01);
  emitter._detonate = 1;
  emitter.tick(0.01);
  expect(emitter.detonate).toHaveBeenCalledTimes(2);
  emitter.dispose();
});

test('random birth contribution affects capacity and timing and stops on disable', () => {
  const emitter = emitterFixture();
  emitter.birthRate = 2;
  emitter.birthRateRandom = 6;
  emitter.lifeExp = 1;
  expect(emitter.getEffectiveBirthRate()).toBe(5);
  expect(emitter.getBirthTimer()).toBe(0.2);
  expect(emitter.getMaxParticleCount()).toBe(5);
  emitter.disable();
  expect(emitter.getEffectiveBirthRate()).toBe(0);
  emitter.dispose();
});

test('fractional lifetimes are preserved and interpolated rather than rounded', () => {
  const controller = Object.create(LifeExpController.prototype) as LifeExpController;
  const manager = { modelNode: { emitter: { lifeExp: 0 } } };
  controller.setFrame(manager as any, undefined, { value: 0.25 } as any);
  expect(manager.modelNode.emitter.lifeExp).toBe(0.25);
  controller.animate(manager as any, undefined, { value: 0.25 } as any, { value: 0.75 } as any, 0.5);
  expect(manager.modelNode.emitter.lifeExp).toBe(0.5);
});
