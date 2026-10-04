/**
 * @jest-environment node
 */
import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';
import { OdysseyModelAnimationManager } from '@engine/odyssey/OdysseyModelAnimationManager';
import { OdysseyModelControllerType } from '@core/enums/odyssey/OdysseyModelControllerType';
import type { OdysseyModelAnimation } from '@engine/odyssey/OdysseyModelAnimation';

function makeController(type: OdysseyModelControllerType, apply: (node: THREE.Object3D) => void){
  return {
    type,
    frameCount: 1,
    data: [{ time: 0, x: 0, y: 0, z: 0, w: 1, value: 1 }],
    setFrame: jest.fn((manager: OdysseyModelAnimationManager) => {
      apply(manager.modelNode as any);
      manager.markNodeTransformDirty();
    }),
    animate: jest.fn(),
  } as any;
}

function makeAnimation(nodeName: string, controllers: Map<OdysseyModelControllerType, any>): OdysseyModelAnimation {
  return {
    type: 'OdysseyModelAnimation',
    name: 'clip',
    length: 1,
    transition: 0,
    nodes: [{ name: nodeName, controllers } as any],
    events: [],
    _position: new THREE.Vector3(),
    _quaternion: new THREE.Quaternion(),
  } as OdysseyModelAnimation;
}

describe('OdysseyModelAnimationManager matrix batching', () => {
  test('flushes one matrix update for a node touched by position, orientation, and scale controllers', () => {
    const node = new THREE.Object3D() as any;
    node.name = 'bone01';
    node.controllers = new Map();
    node.controllerHelpers = {};

    const model: any = {
      bonesInitialized: true,
      animateFrame: true,
      wasOffscreen: false,
      animLoops: [],
      Scale: 1,
      nodes: new Map([[node.name, node]]),
      playEvent: jest.fn(),
    };
    const manager = new OdysseyModelAnimationManager(model);
    const updateMatrixSpy = jest.spyOn(node, 'updateMatrix');
    const controllers = new Map<OdysseyModelControllerType, any>([
      [OdysseyModelControllerType.Position, makeController(OdysseyModelControllerType.Position, n => n.position.set(1, 2, 3))],
      [OdysseyModelControllerType.Orientation, makeController(OdysseyModelControllerType.Orientation, n => n.quaternion.set(0, 0, 0, 1))],
      [OdysseyModelControllerType.Scale, makeController(OdysseyModelControllerType.Scale, n => n.scale.setScalar(2))],
    ]);
    const anim = makeAnimation(node.name, controllers);
    const state = manager.createAnimationState();

    manager.updateAnimation(anim, state, 0.016);

    expect(updateMatrixSpy).toHaveBeenCalledTimes(1);
    expect(node.matrixWorldNeedsUpdate).toBe(true);
  });
});