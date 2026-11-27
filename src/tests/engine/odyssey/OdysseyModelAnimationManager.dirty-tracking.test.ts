/**
 * @jest-environment node
 */
import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';
import { OdysseyModelAnimationManager } from '@engine/odyssey/OdysseyModelAnimationManager';
import { OdysseyModelControllerType } from '@core/enums/odyssey/OdysseyModelControllerType';
import { AuroraAnimationFlag } from '@core/enums/animation/AuroraAnimationFlag';
import type { OdysseyModelAnimation } from '@engine/odyssey/OdysseyModelAnimation';
import { classifyControllerKind, BoundControllerKind } from '@engine/odyssey/BoundControllerKind';
import { bindAnimation } from '@engine/odyssey/BoundAnimation';
import { buildAnimationTransformBinding } from '@engine/odyssey/AnimationTransformBinding';

function makePosController(x: number, y: number, z: number){
  return {
    type: OdysseyModelControllerType.Position,
    frameCount: 1,
    data: [{ time: 0, x, y, z, w: 1, value: 1 }],
    setFrame: jest.fn((manager: OdysseyModelAnimationManager, _a: any, data: any) => {
      manager.modelNode.position.set(data.x, data.y, data.z);
      manager.markNodeTransformDirty();
    }),
    animate: jest.fn(),
  } as any;
}

function makeOriController(x: number, y: number, z: number, w: number){
  return {
    type: OdysseyModelControllerType.Orientation,
    frameCount: 1,
    data: [{ time: 0, x, y, z, w, value: 1 }],
    setFrame: jest.fn((manager: OdysseyModelAnimationManager, _a: any, data: any) => {
      manager.modelNode.quaternion.set(data.x, data.y, data.z, data.w);
      manager.markNodeTransformDirty();
    }),
    animate: jest.fn(),
  } as any;
}

function makeScaleController(value: number){
  return {
    type: OdysseyModelControllerType.Scale,
    frameCount: 1,
    data: [{ time: 0, x: 0, y: 0, z: 0, w: 1, value }],
    setFrame: jest.fn((manager: OdysseyModelAnimationManager, _a: any, data: any) => {
      manager.modelNode.scale.setScalar(data.value);
      manager.markNodeTransformDirty();
    }),
    animate: jest.fn((manager: OdysseyModelAnimationManager, _a: any, _l: any, next: any, fl: number) => {
      // Characterize current→next lerp behavior (stateful).
      manager.modelNode.scale.lerp(
        new THREE.Vector3(next.value, next.value, next.value),
        fl
      );
      manager.markNodeTransformDirty();
    }),
  } as any;
}

function makeAnimation(nodeName: string, controllers: Map<number, any>): OdysseyModelAnimation {
  return {
    type: 'OdysseyModelAnimation',
    name: 'clip',
    length: 1,
    transition: 0,
    nodes: [{ name: nodeName, nodeNumber: 0, controllers } as any],
    events: [],
    _position: new THREE.Vector3(),
    _quaternion: new THREE.Quaternion(),
  } as OdysseyModelAnimation;
}

function makeModel(node: THREE.Object3D){
  return {
    bonesInitialized: true,
    animateFrame: true,
    wasOffscreen: false,
    playOutOfPlaceActive: false,
    animLoops: [],
    Scale: 1,
    nodes: new Map([[node.name, node]]),
    nodesById: [node],
    skins: [],
    playEvent: jest.fn(),
  } as any;
}

describe('BoundController classification', () => {
  test('classifies transform / material kinds', () => {
    expect(classifyControllerKind({ type: OdysseyModelControllerType.Position } as any))
      .toBe(BoundControllerKind.TransformPos);
    expect(classifyControllerKind({ type: OdysseyModelControllerType.Orientation } as any))
      .toBe(BoundControllerKind.TransformOri);
    expect(classifyControllerKind({ type: OdysseyModelControllerType.Scale } as any))
      .toBe(BoundControllerKind.TransformScale);
    expect(classifyControllerKind({ type: OdysseyModelControllerType.Alpha } as any))
      .toBe(BoundControllerKind.Material);
  });

  test('bindAnimation caches constant transform tracks', () => {
    const node = new THREE.Object3D() as any;
    node.name = 'bone01';
    const controllers = new Map([
      [OdysseyModelControllerType.Position, makePosController(1, 2, 3)],
    ]);
    const anim = makeAnimation(node.name, controllers);
    const bound = bindAnimation(makeModel(node), anim);
    expect(bound.nodes[0].controllers[0].constant).toBe(true);
    expect(bound.nodes[0].controllers[0].constPos![0]).toBe(1);
  });
});

describe('OdysseyModelAnimationManager dirty tracking', () => {
  test('full-weight Position/Orientation/Scale flush one matrix update', () => {
    const node = new THREE.Object3D() as any;
    node.name = 'bone01';
    node.controllers = new Map();
    node.controllerHelpers = {};
    const model = makeModel(node);
    const manager = new OdysseyModelAnimationManager(model);
    const spy = jest.spyOn(node, 'updateMatrix');
    const controllers = new Map([
      [OdysseyModelControllerType.Position, makePosController(1, 2, 3)],
      [OdysseyModelControllerType.Orientation, makeOriController(0, 0, 0, 1)],
      [OdysseyModelControllerType.Scale, makeScaleController(2)],
    ]);
    const anim = makeAnimation(node.name, controllers);
    manager.updateAnimation(anim, manager.createAnimationState(), 0.016);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(node.position.x).toBe(1);
    expect(node.scale.x).toBe(2);
  });

  test('unchanged looping pose does not updateMatrix again', () => {
    const node = new THREE.Object3D() as any;
    node.name = 'bone01';
    node.controllers = new Map();
    node.controllerHelpers = {};
    node.position.set(1, 2, 3);
    const model = makeModel(node);
    const manager = new OdysseyModelAnimationManager(model);
    const controllers = new Map([
      [OdysseyModelControllerType.Position, makePosController(1, 2, 3)],
    ]);
    const anim = makeAnimation(node.name, controllers);
    const state = manager.createAnimationState();
    manager.updateAnimation(anim, state, 0.016);
    const spy = jest.spyOn(node, 'updateMatrix');
    state.elapsed = 0.1;
    state.lastTime = 0;
    manager.updateAnimation(anim, state, 0.016);
    expect(spy).toHaveBeenCalledTimes(0);
  });

  test('playOutOfPlaceActive skips root Position on legacy path', () => {
    const node = new THREE.Object3D() as any;
    node.name = 'rootdummy';
    node.controllers = new Map();
    node.controllerHelpers = {};
    node.position.set(0, 0, 0);
    const model = makeModel(node);
    model.rootdummy = node;
    model.playOutOfPlaceActive = true;
    const manager = new OdysseyModelAnimationManager(model);
    const pos = makePosController(9, 9, 9);
    const anim = makeAnimation(node.name, new Map([[OdysseyModelControllerType.Position, pos]]));
    manager.updateAnimation(anim, manager.createAnimationState(), 0.016);
    expect(node.position.x).toBe(0);
    expect(pos.setFrame).not.toHaveBeenCalled();
  });

  test('paused speed 0 still contributes pose on stack', () => {
    const node = new THREE.Object3D() as any;
    node.name = 'bone01';
    node.controllers = new Map();
    node.controllerHelpers = {};
    const model = makeModel(node);
    const manager = new OdysseyModelAnimationManager(model);
    const controllers = new Map([
      [OdysseyModelControllerType.Position, makePosController(4, 5, 6)],
    ]);
    const anim = makeAnimation(node.name, controllers);
    manager.playAnimation(anim, AuroraAnimationFlag.LOOPING, { loop: true, speed: 0 });
    manager.update(0.016);
    expect(node.position.x).toBe(4);
  });

  test('quaternion q and -q treated equal for dirty detection', () => {
    const manager = Object.create(OdysseyModelAnimationManager.prototype) as OdysseyModelAnimationManager;
    const a = new THREE.Quaternion(0, 0, 0, 1);
    const b = new THREE.Quaternion(0, 0, 0, -1);
    expect((manager as any).quaternionsEqual(a, b)).toBe(true);
  });
});

describe('AnimationTransformBinding', () => {
  test('maps bones to owning skeletons', () => {
    const bone = new THREE.Bone();
    bone.name = 'b0';
    const skeleton = new THREE.Skeleton([bone], [new THREE.Matrix4()]);
    const skin = new THREE.SkinnedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    skin.skeleton = skeleton;
    const model: any = {
      skins: [skin],
      uuid: 'model',
    };
    bone.parent = model;
    const binding = buildAnimationTransformBinding(model);
    expect(binding?.nodeSkeletons.get(bone.uuid)?.length).toBe(1);
  });
});

describe('ScaleController animate characterization', () => {
  test('animate lerps from current scale toward next (stateful)', () => {
    const node = new THREE.Object3D() as any;
    node.name = 'bone01';
    node.scale.setScalar(1);
    node.controllers = new Map();
    node.controllerHelpers = {};
    const model = makeModel(node);
    const manager = new OdysseyModelAnimationManager(model);
    manager.modelNode = node;
    const ctrl = makeScaleController(3);
    ctrl.frameCount = 2;
    ctrl.data = [
      { time: 0, value: 1 },
      { time: 1, value: 3 },
    ];
    ctrl.animate(manager, { _position: new THREE.Vector3(), _quaternion: new THREE.Quaternion() } as any, ctrl.data[0], ctrl.data[1], 0.5);
    // current(1) → next(3) at fl=0.5 => 2
    expect(node.scale.x).toBeCloseTo(2);
  });
});
