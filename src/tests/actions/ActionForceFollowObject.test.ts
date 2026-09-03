/**
 * ForceFollow retail Check+Wait+MoveTo model (G1).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const queue: { type: number; params: unknown[] }[] = [];

jest.mock("@/three/odyssey", () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock("@/three/odyssey/OdysseyModel3D", () => ({
  OdysseyModel3D: class {},
}));

jest.mock("@/GameState", () => ({
  GameState: {
    module: { area: { id: 1, getNearestWalkablePoint: (p: THREE.Vector3) => p.clone() } },
    PartyManager: {
      party: [],
      GetFollowPosition: (o: { position: THREE.Vector3 }) => o.position.clone(),
    },
    ModuleObjectManager: {
      GetObjectById: (id: number) => (id === 2 ? mockTarget : undefined),
    },
    ActionFactory: {
      ActionCheckForceFollowObject: class {
        type = 0x3a;
        params: unknown[] = [];
        setParameter(i: number, _t: number, v: unknown){ this.params[i] = v; }
      },
      ActionWait: class {
        type = 0x1e;
        params: unknown[] = [];
        setParameter(i: number, _t: number, v: unknown){ this.params[i] = v; }
      },
      ActionMoveToPoint: class {
        type = 0x01;
        params: unknown[] = [];
        setParameter(i: number, _t: number, v: unknown){ this.params[i] = v; }
      },
    },
  },
}));

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => typeof v === "object" && v != null,
    InstanceOf: () => true,
  },
}));

jest.mock("@/engine/pathfinding/party-follow-path", () => ({
  partyFollowPath: { getFollowRange: () => 5.0 },
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

jest.mock("@/utility/Utility", () => ({
  Utility: {
    Distance2D: (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y),
  },
}));

import { ActionForceFollowObject } from "@/actions/ActionForceFollowObject";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";

let mockTarget: {
  id: number;
  position: THREE.Vector3;
  area: { id: number };
  isDead: () => boolean;
  rotation: { z: number };
};

describe("ActionForceFollowObject retail model", () => {
  beforeEach(() => {
    queue.length = 0;
    mockTarget = {
      id: 2,
      position: new THREE.Vector3(10, 0, 0),
      area: { id: 1 },
      isDead: () => false,
      rotation: { z: 0 },
    };
  });

  function makeOwner(x: number, y: number){
    return {
      id: 1,
      position: new THREE.Vector3(x, y, 0),
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
        isPointWalkable: () => true,
      },
      isDead: () => false,
      isDebilitated: () => false,
      isPartyMember: () => false,
      walkSpeedFactor: 0.7,
      force: 1,
      speed: 1,
      walk: true,
      moveDirOverride: { x: 1, y: 0 },
      actionQueue: {
        addFront: (a: { type: number; params?: unknown[] }) => {
          queue.unshift({ type: a.type, params: a.params || [] });
        },
      },
    };
  }

  it("enqueues MoveTo + Wait + Check when outside range (no Jump)", () => {
    const owner = makeOwner(0, 0);
    const action = new ActionForceFollowObject();
    action.setOwner(owner as any);
    action.setParameter(0, ActionParameterType.DWORD, mockTarget.id);
    action.setParameter(1, ActionParameterType.FLOAT, 2.0);
    (action as { target: unknown }).target = mockTarget;

    const status = action.update(0.016);
    expect(status).toBe(ActionStatus.COMPLETE);
    expect(queue.length).toBe(3);
    // Front-load order → execution: MoveTo, Wait, Check
    expect(queue[0].type).toBe(0x01);
    expect(queue[1].type).toBe(0x1e);
    expect(queue[2].type).toBe(0x3a);
    expect(owner.walkSpeedFactor).toBe(0.7);
  });

  it("holds in range without enqueueing MoveTo", () => {
    mockTarget.position.set(1.5, 0, 0);
    const owner = makeOwner(0, 0);
    const action = new ActionForceFollowObject();
    action.setOwner(owner as any);
    action.setParameter(0, ActionParameterType.DWORD, mockTarget.id);
    action.setParameter(1, ActionParameterType.FLOAT, 2.0);
    (action as { target: unknown }).target = mockTarget;

    const status = action.update(0.016);
    expect(status).toBe(ActionStatus.IN_PROGRESS);
    expect(queue.length).toBe(0);
    expect(owner.force).toBe(0);
    expect(owner.walkSpeedFactor).toBe(0.7);
  });
});
