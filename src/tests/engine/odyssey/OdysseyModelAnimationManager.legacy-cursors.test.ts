/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));
jest.mock("@engine/render/three/odyssey", () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
}));
jest.mock("@engine/render/three/odyssey/OdysseySkeletonBind", () => ({
  markOdysseySkeletonsDirtyUnder: () => {},
  markOdysseySkeletonDirty: () => {},
}));

import { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import {
  binarySearchFrameCursor,
  isPlaybackDiscontinuity,
  resolveFrameCursor,
} from "@engine/odyssey/resolveFrameCursor";

function frames(...times: number[]) {
  return times.map((time) => ({ time })) as any[];
}

describe("legacy animLoops frame cursors", () => {
  it("forward playback advances with resolveFrameCursor", () => {
    const f = frames(0, 0.25, 0.5, 0.75, 1);
    let c = 0;
    c = resolveFrameCursor(f, 0.1, c);
    expect(c).toBe(0);
    c = resolveFrameCursor(f, 0.3, c);
    expect(c).toBe(1);
    c = resolveFrameCursor(f, 0.8, c);
    expect(c).toBe(3);
  });

  it("loop wrap uses binary search after discontinuity", () => {
    const f = frames(0, 0.25, 0.5, 0.75, 1);
    let c = resolveFrameCursor(f, 0.9, 0);
    expect(c).toBe(3);
    // After wrap: elapsed 0.05, lastTime was length
    expect(isPlaybackDiscontinuity(0.05, 1, 1)).toBe(true);
    c = binarySearchFrameCursor(f, 0.05);
    expect(c).toBe(0);
  });

  it("reverse playback detects discontinuity and seeks", () => {
    const f = frames(0, 0.25, 0.5, 0.75, 1);
    let c = binarySearchFrameCursor(f, 0.8);
    expect(c).toBe(3);
    expect(isPlaybackDiscontinuity(0.2, 0.8, -1)).toBe(false);
    c = resolveFrameCursor(f, 0.2, c);
    expect(c).toBe(0);
    // Seek forward while reversing rate — elapsed jumped up
    expect(isPlaybackDiscontinuity(0.9, 0.2, -1)).toBe(true);
    c = binarySearchFrameCursor(f, 0.9);
    expect(c).toBe(3);
  });

  it("updateAnimationNodeLegacy stores and reuses typed frame cursors", () => {
    const manager = Object.create(OdysseyModelAnimationManager.prototype) as OdysseyModelAnimationManager;
    const setFrame = jest.fn();
    const animate = jest.fn();
    const controller: any = {
      frameCount: 4,
      data: frames(0, 0.25, 0.5, 0.75),
      setFrame,
      animate,
      type: 8,
    };
    const node: any = {
      name: "root",
      nodeNumber: 0,
      controllers: new Map([[8, controller]]),
    };
    const anim: any = {
      nodes: [node],
      length: 1,
      _position: { x: 0, y: 0, z: 0 },
      _quaternion: { x: 0, y: 0, z: 0, w: 1 },
    };
    const modelNode: any = {
      position: { x: 0, y: 0, z: 0, copy: jest.fn(function(v){ this.x=v.x; this.y=v.y; this.z=v.z; return this; }), lerp: jest.fn() },
      quaternion: { x: 0, y: 0, z: 0, w: 1, copy: jest.fn(function(v){ this.x=v.x; this.y=v.y; this.z=v.z; this.w=v.w; return this; }), slerp: jest.fn() },
      scale: { x: 1, y: 1, z: 1, copy: jest.fn(function(v){ this.x=v.x; this.y=v.y; this.z=v.z; return this; }) },
    };
    (manager as any).model = {
      nodesById: [modelNode],
      nodes: new Map([["root", modelNode]]),
      wasOffscreen: false,
    };
    (manager as any)._prevPosition = { copy: jest.fn() };
    (manager as any)._prevQuaternion = { copy: jest.fn() };
    (manager as any)._prevScale = { copy: jest.fn() };
    (manager as any).nodeTransformChanged = jest.fn(() => false);
    (manager as any).applyControllerSample = jest.fn((_a, _s, _c, lastFrame) => {
      return lastFrame;
    });
    (manager as any).markNodeTransformDirty = jest.fn();

    const state: any = {
      elapsed: 0.1,
      lastTime: 0,
      speed: 1,
      frameCursors: new Map(),
    };

    manager.updateAnimationNodeLegacy(anim, node, state, 1);
    expect(state.frameCursorArray[0]).toBe(0);
    expect((manager as any).applyControllerSample).toHaveBeenCalled();
    expect((manager as any).applyControllerSample.mock.calls[0][3]).toBe(0);

    state.lastTime = 0.1;
    state.elapsed = 0.6;
    manager.updateAnimationNodeLegacy(anim, node, state, 1);
    expect(state.frameCursorArray[0]).toBe(2);

    // Loop wrap discontinuity
    state.lastTime = 1;
    state.elapsed = 0.05;
    manager.updateAnimationNodeLegacy(anim, node, state, 1);
    expect(state.frameCursorArray[0]).toBe(0);
  });

  it("updateAnimation clears frame cursors on loop wrap", () => {
    const manager = Object.create(OdysseyModelAnimationManager.prototype) as OdysseyModelAnimationManager;
    (manager as any).model = {
      bonesInitialized: true,
      animateFrame: false,
    };
    (manager as any)._matrixBatchDepth = 1;
    (manager as any).updateAnimationEvents = jest.fn();
    (manager as any).beginMatrixBatch = jest.fn();
    (manager as any).endMatrixBatch = jest.fn();

    const state: any = {
      loop: true,
      elapsed: 0.9,
      lastTime: 0.8,
      elapsedCount: 0,
      events: [true],
      lastEvent: 0,
      frameCursors: new Map([[{}, 3]]),
      delta: 0,
    };
    const anim: any = { length: 1, nodes: [] };

    manager.updateAnimation(anim, state, 0.2);
    expect(state.elapsed).toBe(0);
    expect(state.frameCursors.size).toBe(0);
    expect(state.elapsedCount).toBe(1);
  });
});
