/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockParty: unknown[] = [];
const mockGameState = {
  PartyManager: {
    FollowState: 0,
    party: mockParty,
    getFormationOffsets: () => [
      { x: 0, y: 0 },
      { x: 1.5, y: -0.7 },
      { x: -1.5, y: 0.8 },
    ],
  },
  SWRuleSet: {
    ranges: {
      14: { primaryRange: 5.0 },
      15: { primaryRange: 8.0 },
    },
  },
  ModuleObjectManager: { GetObjectById: () => undefined },
  module: undefined as undefined,
};

jest.mock("@/GameState", () => ({
  GameState: mockGameState,
}));

const mockTestDirectLine = jest.fn(() => ({
  ok: true,
  code: 1,
  clearPoint: new THREE.Vector3(),
  clearT: 1,
}));

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  testDirectLine: (...args: unknown[]) => mockTestDirectLine(...args),
  TestDirectLineCode: { Ok: 1, NonWalk: 2, Creature: -3 },
  hasDirectLine: () => true,
}));

jest.mock("@/engine/pathfinding/test-safe-location-point", () => ({
  testSafeLocationPoint: () => true,
}));

jest.mock("@/engine/pathfinding/walk-update-location", () => ({
  walkUpdateLocation: () => {},
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.5,
}));

import { PartyFollowPath, partyFollowPath, FOLLOW_RING_SIZE } from "@/engine/pathfinding/party-follow-path";
import {
  createFollowRuntime,
  FollowLeaderState,
  FOLLOW_RING_WARM_COUNT,
} from "@/engine/pathfinding/follow-leader";
import {
  driveTowardOffset,
  stepFollowLeaderState,
} from "@/engine/pathfinding/follow-leader-sm";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";

function makeCreature(x: number, y: number, z = 0): ModuleCreature {
  const creature = {
    position: new THREE.Vector3(x, y, z),
    rotation: { z: 0 },
    area: undefined,
    partyFollowInfo: { inSafetyRange: 0 },
    getComputedPath: () => undefined,
    setComputedPath: () => {},
    setAnimationState: () => {},
    setFacing: () => {},
    setPosition(v: THREE.Vector3 | number, yy = 0, zz = 0){
      if(typeof v === 'object'){
        creature.position.copy(v);
      }else{
        creature.position.set(v, yy, zz);
      }
    },
    getWalkSpeed: () => 1.7,
    getRunSpeed: () => 5.4,
    movementSpeed: 1,
    walkSpeedFactor: 0.8,
    walk: false,
    force: 0,
    blockingTimer: 0,
    collisionTimer: 0,
    moveDirOverride: undefined,
    helperColor: 0,
    clearLocomotionAnimation: jest.fn(),
  };
  return creature as unknown as ModuleCreature;
}

function seedRing(ring: PartyFollowPath, count: number){
  const leader = makeCreature(0, 0, 0);
  for(let i = 0; i < count; i++){
    leader.position.set(i * 0.6, 0, 0);
    ring.processPoint(leader, undefined);
  }
}

describe("getFollowRange PT_FOLLOWSTATE", () => {
  beforeEach(() => {
    mockGameState.PartyManager.FollowState = 0;
  });

  it("uses ranges.2da row 14 when FollowState is 0 (close)", () => {
    const ring = new PartyFollowPath();
    mockGameState.PartyManager.FollowState = 0;
    expect(ring.getFollowRange()).toBe(5.0);
  });

  it("uses ranges.2da row 15 when FollowState is 1 (far)", () => {
    const ring = new PartyFollowPath();
    mockGameState.PartyManager.FollowState = 1;
    expect(ring.getFollowRange()).toBe(8.0);
  });
});

describe("WaitingForPath cold-ring hold", () => {
  beforeEach(() => {
    mockParty.length = 0;
    partyFollowPath.reset();
    mockGameState.PartyManager.FollowState = 0;
    mockTestDirectLine.mockReset();
    mockTestDirectLine.mockImplementation(() => ({
      ok: true,
      code: 1,
      clearPoint: new THREE.Vector3(),
      clearT: 1,
    }));
  });

  it("holds Moving* while ring count ≤ 4 even when far from cold lateral", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(10, 0, 0);
    mockParty.push(leader, companion);

    // Cold ring after reset (count 1)
    partyFollowPath.reset(leader.position, 0);
    expect(partyFollowPath.count).toBeLessThanOrEqual(FOLLOW_RING_WARM_COUNT);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.WaitingForPath;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    // Phantom close lateral beside leader — old bug chased this
    const coldLateral = new THREE.Vector3(1.5, 0, 0);

    const step = stepFollowLeaderState(
      runtime, companion, leader, coldLateral, 0.016
    );

    expect(step.teleport).toBe(false);
    expect(runtime.state).toBe(FollowLeaderState.WaitingForPath);
    expect([
      FollowLeaderState.MovingToOffset,
      FollowLeaderState.MovingToPath,
      FollowLeaderState.FindPath,
      FollowLeaderState.FollowingPath,
    ]).not.toContain(runtime.state);
  });

  it("may leave WaitingForPath once ring count > 4", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(10, 0, 0);
    mockParty.push(leader, companion);

    // Long enough trail that GetPointBack covers follow range
    seedRing(partyFollowPath, 20);
    expect(partyFollowPath.count).toBeGreaterThan(FOLLOW_RING_WARM_COUNT);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.WaitingForPath;
    runtime.inSafetyRange = 0;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    // Give companion a stub area so LOS checks can succeed (mocked testDirectLine)
    (companion as { area: object }).area = {
      path: { traverseToPoint: () => undefined },
    };
    const offset = new THREE.Vector3(companion.position.x, companion.position.y, 0);

    stepFollowLeaderState(runtime, companion, leader, offset, 0.016);

    expect(runtime.state).not.toBe(FollowLeaderState.WaitingForPath);
  });

  it("holds while inSafetyRange and leader within 7 units", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(3, 0, 0);
    mockParty.push(leader, companion);

    seedRing(partyFollowPath, 6);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.WaitingForPath;
    runtime.inSafetyRange = 1;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;

    stepFollowLeaderState(
      runtime, companion, leader, companion.position.clone(), 0.016
    );

    expect(runtime.state).toBe(FollowLeaderState.WaitingForPath);
    expect(runtime.inSafetyRange).toBe(1);
  });

  it("keeps Offset idle without stuckCounter Reset thrash", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(1, 0, 0);
    mockParty.push(leader, companion);
    seedRing(partyFollowPath, 8);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.Offset;
    runtime.stuckCounter = 40;
    // Goal within comfort band so Offset holds
    const offset = companion.position.clone();

    for(let i = 0; i < 20; i++){
      stepFollowLeaderState(runtime, companion, leader, offset, 0.016);
    }

    expect(runtime.state).toBe(FollowLeaderState.Offset);
    expect(runtime.stuckCounter).toBe(0);
  });

  it("does not force Teleport while ring is still cold even if leader is far", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(20, 0, 0);
    mockParty.push(leader, companion);

    partyFollowPath.reset(leader.position, 0);
    expect(partyFollowPath.count).toBeLessThanOrEqual(FOLLOW_RING_WARM_COUNT);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.WaitingForPath;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;

    const step = stepFollowLeaderState(
      runtime, companion, leader, companion.position.clone(), 0.016
    );

    expect(step.teleport).toBe(false);
    expect(runtime.state).toBe(FollowLeaderState.WaitingForPath);
  });
});

describe("SmoothFollowPath densify", () => {
  it("inserts unit steps for long trail segments", () => {
    const ring = new PartyFollowPath();
    const leader = makeCreature(0, 0, 0);
    mockParty.length = 0;
    mockParty.push(leader, makeCreature(1, 0, 0));
    for(let i = 0; i < 6; i++){
      leader.position.set(i * 3, 0, 0);
      ring.processPoint(leader, undefined);
    }
    // After densify, consecutive points should be ≤ ~1.0 apart along X
    let maxSeg = 0;
    const n = Math.min(ring.count, FOLLOW_RING_SIZE);
    for(let i = 1; i < n; i++){
      const a = ring.points[i - 1];
      const b = ring.points[i];
      maxSeg = Math.max(maxSeg, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    }
    expect(ring.count).toBeGreaterThan(4);
    expect(maxSeg).toBeLessThanOrEqual(1.01);
  });
});

describe("Offset direct trail stepping", () => {
  beforeEach(() => {
    mockParty.length = 0;
    partyFollowPath.reset();
    mockGameState.PartyManager.FollowState = 0;
  });

  it("stays in Offset while distOffset is between COMFORT and REPATH", () => {
    // Keep leader within FOLLOW_REPATH+1.5 so entry resolver does not force FindPath
    const leader = makeCreature(10, 0, 0);
    const companion = makeCreature(7.7, 0, 0);
    mockParty.push(leader, companion);

    seedRing(partyFollowPath, 30);
    partyFollowPath.recalculateFollowPoints();

    (companion as { area: object }).area = {
      path: {
        traverseToPoint: (_o: unknown, _from: THREE.Vector3, to: THREE.Vector3) => ({
          points: [{ vector: to.clone() }],
          fixWalkEdges: () => {},
          setColor: () => {},
          realtime: true,
          timer: 20,
          pop: () => {},
        }),
      },
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      isPointWalkable: () => true,
    };

    // Mid-band offset: dist ≈ 2.3 (between COMFORT 2.0 and REPATH 3.5)
    const offset = new THREE.Vector3(companion.position.x - 2.3, -0.7, 0);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    runtime.pathPointX = companion.position.x - 2.0;
    runtime.pathPointY = 0;
    runtime.pathPointZ = 0;

    const states: FollowLeaderState[] = [];
    for(let i = 0; i < 8; i++){
      leader.position.x += 0.15;
      partyFollowPath.processPoint(leader, undefined);
      partyFollowPath.recalculateFollowPoints();
      offset.x = companion.position.x - 2.3;
      offset.y = -0.7;
      stepFollowLeaderState(runtime, companion, leader, offset, 0.05);
      states.push(runtime.state);
    }

    expect(states.every((s) => s === FollowLeaderState.Offset)).toBe(true);
    expect(runtime.offsetStepped).toBe(true);
  });

  it("scales Offset direct step budget by movementSpeed", () => {
    const runOffsetFrame = (movementSpeed: number) => {
      mockParty.length = 0;
      partyFollowPath.reset();
      const leader = makeCreature(0, 0, 0);
      const companion = makeCreature(2.5, -0.5, 0) as ModuleCreature & { movementSpeed: number };
      companion.movementSpeed = movementSpeed;
      mockParty.push(leader, companion);
      seedRing(partyFollowPath, 30);
      partyFollowPath.recalculateFollowPoints();

      const runtime = createFollowRuntime();
      runtime.state = FollowLeaderState.Offset;
      runtime.lastSampleX = companion.position.x;
      runtime.lastSampleY = companion.position.y;
      runtime.lastSampleZ = companion.position.z;
      runtime.pathPointX = companion.position.x;
      runtime.pathPointY = companion.position.y;
      runtime.pathPointZ = companion.position.z;

      const offset = new THREE.Vector3(1.5, -0.7, 0);
      stepFollowLeaderState(runtime, companion, leader, offset, 0.1);
      return Math.hypot(companion.position.x - 2.5, companion.position.y + 0.5);
    };

    const normal = runOffsetFrame(1.0);
    const hasted = runOffsetFrame(1.5);

    expect(hasted).toBeGreaterThan(normal * 1.35);
  });

  it("leaves Offset for MovingToPath when distOffset ≥ REPATH", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(0, 0, 0);
    mockParty.push(leader, companion);
    seedRing(partyFollowPath, 10);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.Offset;
    const farOffset = new THREE.Vector3(5, 0, 0); // dist 5 ≥ 3.5

    stepFollowLeaderState(runtime, companion, leader, farOffset, 0.016);
    expect(runtime.state).not.toBe(FollowLeaderState.Offset);
  });

  it("does not keep offsetStepped on sub-epsilon micro-chases (stops run anim)", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(1.5, -0.7, 0);
    mockParty.push(leader, companion);
    seedRing(partyFollowPath, 30);
    partyFollowPath.recalculateFollowPoints();

    const setAnim = jest.fn();
    const clearAnim = jest.fn();
    (companion as { setAnimationState: typeof setAnim }).setAnimationState = setAnim;
    (companion as { clearLocomotionAnimation: typeof clearAnim }).clearLocomotionAnimation = clearAnim;

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    // Offset goal almost under feet — any residual lateral is sub-epsilon
    const offset = companion.position.clone();
    stepFollowLeaderState(runtime, companion, leader, offset, 0.1);

    expect(runtime.state).toBe(FollowLeaderState.Offset);
    expect(runtime.offsetStepped).toBe(false);
    expect(setAnim).not.toHaveBeenCalledWith(ModuleCreatureAnimState.RUNNING);
  });
});

describe("Moving direct follow rate scaling", () => {
  it("scales Moving* direct step budget by movementSpeed", () => {
    const runMove = (movementSpeed: number) => {
      const companion = makeCreature(0, 0, 0) as ModuleCreature & { movementSpeed: number };
      companion.movementSpeed = movementSpeed;
      (companion as { getWalkSpeed: () => number }).getWalkSpeed = () => 2.0;
      driveTowardOffset(companion, new THREE.Vector3(10, 0, 0), 1.0, false);
      return companion.position.x;
    };

    const normal = runMove(1.0);
    const hasted = runMove(1.5);

    expect(normal).toBeCloseTo(2.4, 5);
    expect(hasted).toBeCloseTo(3.6, 5);
  });
});

describe("Offset stale field17 LOS (Carth stuck walk)", () => {
  beforeEach(() => {
    mockParty.length = 0;
    partyFollowPath.reset();
    mockGameState.PartyManager.FollowState = 0;
    mockTestDirectLine.mockReset();
  });

  it("refreshes lastSample to feet when stale sample LOS fails but feet LOS ok", () => {
    const leader = makeCreature(10, 0, 0);
    const companion = makeCreature(8.5, 0, 0);
    mockParty.push(leader, companion);
    seedRing(partyFollowPath, 20);
    partyFollowPath.recalculateFollowPoints();

    mockTestDirectLine.mockImplementation((
      _area: unknown,
      from: THREE.Vector3
    ) => {
      const fromFeet =
        Math.hypot(from.x - companion.position.x, from.y - companion.position.y) < 0.6;
      return {
        ok: fromFeet,
        code: fromFeet ? 1 : -3,
        clearT: fromFeet ? 1 : 0.5,
        clearPoint: from.clone(),
      };
    });

    (companion as { area: object }).area = {
      path: {
        traverseToPoint: (_o: unknown, _from: THREE.Vector3, to: THREE.Vector3) => ({
          points: [{ vector: to.clone() }],
          fixWalkEdges: () => {},
          setColor: () => {},
          realtime: true,
          timer: 20,
          pop: () => {},
        }),
      },
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      isPointWalkable: () => true,
    };

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = -5;
    runtime.lastSampleY = 0;
    runtime.lastSampleZ = 0;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    const offset = companion.position.clone();
    offset.x -= 1.5;

    stepFollowLeaderState(runtime, companion, leader, offset, 0.05);

    // Should not thrash to MovingToPath when feet LOS is clear
    expect(runtime.state).toBe(FollowLeaderState.Offset);
    // Stale sample must be discarded (updated to feet then lateral)
    expect(runtime.lastSampleX).not.toBe(-5);
    expect(runtime.lastSampleX).toBeGreaterThan(0);
    expect(mockTestDirectLine.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("parks in Offset when LOS blocked but already within FOLLOW_COMFORT (no Moving thrash)", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(1.5, 0, 0);
    mockParty.push(leader, companion);
    seedRing(partyFollowPath, 20);
    partyFollowPath.recalculateFollowPoints();

    // Always blocked — DetailedBlock like live Kreia→offset
    mockTestDirectLine.mockImplementation(() => ({
      ok: false,
      code: -2,
      clearT: 0,
      clearPoint: companion.position.clone(),
    }));

    (companion as { area: object }).area = {
      path: {
        traverseToPoint: () => ({
          points: [{ vector: companion.position.clone() }],
          fixWalkEdges: () => {},
          setColor: () => {},
        }),
      },
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      isPointWalkable: () => true,
    };

    const clearAnim = jest.fn();
    (companion as { clearLocomotionAnimation: typeof clearAnim }).clearLocomotionAnimation = clearAnim;
    (companion as { setAnimationState: (s: number) => void }).setAnimationState = jest.fn();

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    // Within comfort (~1.5)
    const offset = new THREE.Vector3(0, 0, 0);
    const first = stepFollowLeaderState(runtime, companion, leader, offset, 0.05);
    expect(runtime.state).toBe(FollowLeaderState.Offset);
    expect(first.continueInner).toBe(false);
    expect(clearAnim).toHaveBeenCalled();

    // Same-frame Moving re-enter must not bounce back into a thrash loop
    runtime.state = FollowLeaderState.MovingToPath;
    const second = stepFollowLeaderState(runtime, companion, leader, offset, 0.05);
    expect(runtime.state).toBe(FollowLeaderState.Offset);
    // Inner continue into Offset is ok; Offset then parks without returning to Moving
    if(second.continueInner){
      const third = stepFollowLeaderState(runtime, companion, leader, offset, 0.05);
      expect(runtime.state).toBe(FollowLeaderState.Offset);
      expect(third.continueInner).toBe(false);
    }
  });
});

describe("WaitDest ring-index logic (G4)", () => {
  beforeEach(() => {
    mockParty.length = 0;
    partyFollowPath.reset();
    mockGameState.PartyManager.FollowState = 0;
  });

  it("leaves OffsetWaitDest same frame when cursor already at goal", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(1, 0, 0);
    mockParty.push(leader, companion);
    seedRing(partyFollowPath, 20);

    partyFollowPath.memberCursor[1] = 5;
    partyFollowPath.memberGoalIndex[1] = 5;
    // writeHead past goal so walk finds goalIdx before writeHead
    expect(partyFollowPath.writeHead).toBeGreaterThan(5);

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.OffsetWaitDest;
    const p = partyFollowPath.points[5];
    // pathPoint farther than goal → leave WaitDest
    runtime.pathPointX = p.x + 10;
    runtime.pathPointY = p.y;
    runtime.pathPointZ = p.z;
    runtime.goalX = p.x;
    runtime.goalY = p.y;
    runtime.goalZ = p.z;

    stepFollowLeaderState(
      runtime, companion, leader, companion.position.clone(), 0.016
    );
    expect(runtime.state).toBe(FollowLeaderState.Offset);
  });

  it("stays in WaitDest while goal is still ahead of writeHead walk", () => {
    const leader = makeCreature(0, 0, 0);
    const companion = makeCreature(1, 0, 0);
    mockParty.push(leader, companion);
    seedRing(partyFollowPath, 12);

    partyFollowPath.memberCursor[1] = 2;
    partyFollowPath.memberGoalIndex[1] = 90; // beyond current writeHead

    const runtime = createFollowRuntime();
    runtime.state = FollowLeaderState.OffsetWaitDest;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    stepFollowLeaderState(
      runtime, companion, leader, companion.position.clone(), 0.016
    );
    expect(runtime.state).toBe(FollowLeaderState.OffsetWaitDest);
  });
});
