/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { AuroraAnimationFlag } from '@core/enums/animation/AuroraAnimationFlag';
import { OdysseyModelControllerType } from '@core/enums/odyssey/OdysseyModelControllerType';
import {
  createAnimRun,
  invalidateAnimRunFrameCursors,
} from '@engine/odyssey/AnimRun';
import {
  bindAnimation,
  ensureRunFrameCursorArray,
} from '@engine/odyssey/BoundAnimation';
import { OdysseyModelAnimationManager } from '@engine/odyssey/OdysseyModelAnimationManager';
import type { OdysseyModelAnimation } from '@engine/odyssey/OdysseyModelAnimation';
import type { OdysseyController } from '@engine/odyssey/controllers/OdysseyController';
import type { AnimRun } from '@engine/odyssey/AnimRun';

function frames(...times: number[]) {
  return times.map((time) => ({ time, x: 0, y: 0, z: 0, a: 0, b: 0, c: 0, d: 1 }));
}

function stubController(times: number[]): OdysseyController {
  const data = frames(...times);
  return {
    type: OdysseyModelControllerType.Position,
    frameCount: data.length,
    data,
    setFrame() {},
    animate() {},
  } as unknown as OdysseyController;
}

function fakeAnimWithController(
  name: string,
  times: number[],
  length = 1
): { anim: OdysseyModelAnimation; controller: OdysseyController } {
  const controller = stubController(times);
  const node: any = {
    name: 'bone',
    nodeNumber: 0,
    controllers: new Map([[OdysseyModelControllerType.Position, controller]]),
  };
  const anim = {
    type: 'OdysseyModelAnimation',
    name,
    length,
    transition: 0,
    nodes: [node],
    events: [],
    _position: new THREE.Vector3(),
    _quaternion: new THREE.Quaternion(),
  } as OdysseyModelAnimation;
  return { anim, controller };
}

function makePoseManager() {
  const bone: any = new THREE.Object3D();
  bone.name = 'bone';
  const model: any = {
    bonesInitialized: true,
    animateFrame: true,
    wasOffscreen: false,
    animLoops: [],
    playEvent() {},
    nodes: new Map([['bone', bone]]),
    nodesById: [bone],
  };
  return new OdysseyModelAnimationManager(model);
}

/** Pose without advanceRun so lastTime/elapsed stay under test control. */
function samplePose(mgr: OdysseyModelAnimationManager, run: AnimRun) {
  const bound = bindAnimation(mgr.model, run.animation);
  ensureRunFrameCursorArray(run, bound);
  mgr.updateAnimationNode(run, bound.nodes[0], 1);
}

describe('AnimRun frame cursors', () => {
  test('two managers sharing one animation keep independent cursors', () => {
    const { anim } = fakeAnimWithController('shared', [0, 0.25, 0.5, 0.75, 1]);
    const a = makePoseManager();
    const b = makePoseManager();

    const runA = a.playAnimation(anim, AuroraAnimationFlag.LOOPING, {
      loop: true,
      elapsed: 0.3,
      lastTime: 0.25,
    })!;
    const runB = b.playAnimation(anim, AuroraAnimationFlag.LOOPING, {
      loop: true,
      elapsed: 0.8,
      lastTime: 0.75,
    })!;

    samplePose(a, runA);
    samplePose(b, runB);

    expect(runA.frameCursorArray).toBeTruthy();
    expect(runB.frameCursorArray).toBeTruthy();
    expect(runA.frameCursorArray).not.toBe(runB.frameCursorArray);
    expect(runA.frameCursorArray![0]).toBe(1);
    expect(runB.frameCursorArray![0]).toBe(3);
  });

  test('base + overlay on same manager do not share cursor arrays', () => {
    const mgr = makePoseManager();
    const base = fakeAnimWithController('walk', [0, 0.5, 1]);
    const overlay = fakeAnimWithController('listen', [0, 0.5, 1]);

    const baseRun = mgr.playAnimation(base.anim, AuroraAnimationFlag.LOOPING, {
      loop: true,
      elapsed: 0.6,
      lastTime: 0.5,
    })!;
    const overlayRun = mgr.playOverlayAnimation(
      overlay.anim,
      AuroraAnimationFlag.OVERLAY_SLOT | AuroraAnimationFlag.FIRE_FORGET,
      { elapsed: 0.1, lastTime: 0 }
    )!;

    samplePose(mgr, baseRun);
    samplePose(mgr, overlayRun);

    expect(baseRun.frameCursorArray).toBeTruthy();
    expect(overlayRun.frameCursorArray).toBeTruthy();
    expect(baseRun.frameCursorArray).not.toBe(overlayRun.frameCursorArray);
    expect(baseRun.frameCursorArray![0]).toBe(1);
    expect(overlayRun.frameCursorArray![0]).toBe(0);
  });

  test('additive reuse after elapsed reset invalidates / re-resolves cursors', () => {
    const mgr = makePoseManager();
    const { anim } = fakeAnimWithController('gesture', [0, 0.25, 0.5, 0.75, 1]);

    const run = mgr.playAnimation(
      anim,
      AuroraAnimationFlag.ADDITIVE_GESTURE | AuroraAnimationFlag.FIRE_FORGET,
      { elapsed: 0.8, lastTime: 0.75 }
    )!;
    samplePose(mgr, run);
    expect(run.frameCursorArray![0]).toBe(3);

    mgr.playAnimation(
      anim,
      AuroraAnimationFlag.ADDITIVE_GESTURE | AuroraAnimationFlag.FIRE_FORGET,
      { elapsed: 0.1 }
    );
    expect(run.state.elapsed).toBe(0.1);
    expect(run.frameCursorArray![0]).toBe(0);

    run.state.lastTime = 0;
    samplePose(mgr, run);
    expect(run.frameCursorArray![0]).toBe(0);
  });

  test('invalidateAnimRunFrameCursors clears Map and fills Int32Array', () => {
    const { anim, controller } = fakeAnimWithController('x', [0, 1]);
    const run = createAnimRun(anim, 0);
    run.frameCursors = new Map([[controller, 5]]);
    const bound = bindAnimation(
      {
        nodes: new Map(),
        nodesById: [],
      } as any,
      anim
    );
    ensureRunFrameCursorArray(run, bound);
    run.frameCursorArray![0] = 7;

    invalidateAnimRunFrameCursors(run);
    expect(run.frameCursors!.size).toBe(0);
    expect(run.frameCursorArray![0]).toBe(0);
  });

  test('wrap discontinuity re-resolves via binary search', () => {
    const mgr = makePoseManager();
    const { anim } = fakeAnimWithController('loop', [0, 0.25, 0.5, 0.75, 1], 1);

    const run = mgr.playAnimation(anim, AuroraAnimationFlag.LOOPING, {
      loop: true,
      elapsed: 0.9,
      lastTime: 0.85,
    })!;
    samplePose(mgr, run);
    expect(run.frameCursorArray![0]).toBe(3);

    run.state.lastTime = 0.99;
    run.state.elapsed = 0.05;
    samplePose(mgr, run);
    expect(run.frameCursorArray![0]).toBe(0);
  });

  test('continuous advance keeps O(1) cursor walk', () => {
    const mgr = makePoseManager();
    const { anim } = fakeAnimWithController('fwd', [0, 0.25, 0.5, 0.75, 1]);

    const run = mgr.playAnimation(anim, AuroraAnimationFlag.LOOPING, {
      loop: true,
      elapsed: 0.2,
      lastTime: 0.1,
    })!;
    samplePose(mgr, run);
    expect(run.frameCursorArray![0]).toBe(0);

    run.state.lastTime = 0.2;
    run.state.elapsed = 0.3;
    samplePose(mgr, run);
    expect(run.frameCursorArray![0]).toBe(1);

    run.state.lastTime = 0.3;
    run.state.elapsed = 0.55;
    samplePose(mgr, run);
    expect(run.frameCursorArray![0]).toBe(2);
  });
});
