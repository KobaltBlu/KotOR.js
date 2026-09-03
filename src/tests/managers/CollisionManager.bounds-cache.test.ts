/**
 * @jest-environment node
 */
import { describe, expect, test, jest, afterEach } from '@jest/globals';
import * as THREE from 'three';
import { CollisionManager } from '@/engine/CollisionManager';

jest.mock('@/GameState', () => {
  const THREE = require('three');
  return {
    GameState: {
      raycaster: new THREE.Raycaster(),
      group: {},
      module: { area: {} },
    },
  };
});

jest.mock('@/odyssey', () => ({
  OdysseyWalkMesh: class {},
}));

jest.mock('@/three/odyssey', () => ({
  OdysseyFace3: class {},
}));

afterEach(() => {
  jest.restoreAllMocks();
});

function makeCollisionObject(){
  const container = new THREE.Object3D();
  const model = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
  container.add(model);
  container.position.set(1, 2, 3);
  container.updateMatrix();
  container.updateMatrixWorld(true);

  const object: any = {
    model,
    container,
    position: container.position,
    box: new THREE.Box3(),
    sphere: new THREE.Sphere(),
    forceVector: new THREE.Vector3(),
    collisionBoundsDirty: true,
    collisionMatrixDirty: true,
  };
  object.collisionManager = new CollisionManager(object);
  return object;
}

describe('CollisionManager cached object bounds', () => {
  test('recomputes local bounds once and reuses them for matrix-only movement', () => {
    const object = makeCollisionObject();
    const manager = object.collisionManager as CollisionManager;
    const setFromObjectSpy = jest.spyOn(THREE.Box3.prototype, 'setFromObject');

    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(1);
    expect(object.collisionBoundsDirty).toBe(false);
    expect(object.collisionMatrixDirty).toBe(false);
    expect(object.box.min.x).toBeCloseTo(0);
    expect(object.box.max.x).toBeCloseTo(2);

    object.container.position.set(4, 2, 3);
    object.collisionMatrixDirty = true;
    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(1);
    expect(object.box.min.x).toBeCloseTo(3);
    expect(object.box.max.x).toBeCloseTo(5);

    object.collisionBoundsDirty = true;
    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(2);
  });
});