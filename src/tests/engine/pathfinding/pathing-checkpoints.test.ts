/**
 * Pathing checkpoint + over-time validation suite.
 *
 * Covers the major pipeline gates (TestDirectLine → Plot/Grid →
 * WalkUpdate → FollowLeader SM / ring) and multi-frame regressions that
 * caused Carth stuck-walk / WaitDest thrash in playtests.
 *
 * Run: `npm run test:pathing`
 *
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
    GetFollowPosition: (o: { position: THREE.Vector3 }) =>
      new THREE.Vector3(o.position.x - 1.5, o.position.y - 0.7, o.position.z),
  },
  SWRuleSet: {
    ranges: {
      14: { primaryRange: 5.0 },
      15: { primaryRange: 8.0 },
    },
  },
  ModuleObjectManager: { GetObjectById: () => undefined },
  module: undefined as undefined,
  GameKey: "KOTOR",
};

jest.mock("@/GameState", () => ({ GameState: mockGameState }));

const mockTestDirectLine = jest.fn(() => ({
  ok: true,
  code: 1,
  clearPoint: new THREE.Vector3(),
  clearT: 1,
}));

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  testDirectLine: (...args: unknown[]) => mockTestDirectLine(...args),
  TestDirectLineCode: {
    Ok: 1,
    Fail: 0,
    NonWalk: -1,
    DetailedBlock: -2,
    Creature: -3,
  },
  hasDirectLine: (
    area: { isPointWalkable?: (p: THREE.Vector3) => boolean },
    a: THREE.Vector3,
    b: THREE.Vector3
  ) => {
    const steps = 10;
    for(let i = 1; i <= steps; i++){
      const t = i / steps;
      const p = new THREE.Vector3(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        0
      );
      if(area?.isPointWalkable && !area.isPointWalkable(p)) return false;
    }
    return true;
  },
}));

jest.mock("@/engine/pathfinding/test-safe-location-point", () => ({
  testSafeLocationPoint: () => true,
}));

/** WalkUpdate mock that advances toward dest (Moving* over-time tests). */
const mockWalkUpdate = jest.fn((
  creature: { position: THREE.Vector3; walkSpeedFactor: number; force: number; speed: number },
  dest: THREE.Vector3,
  run: boolean,
  delta: number
) => {
  const rate = run ? 5.4 : 1.7;
  const step = rate * Math.max(0, delta) * Math.max(0.1, creature.walkSpeedFactor || 0.5);
  const dx = dest.x - creature.position.x;
  const dy = dest.y - creature.position.y;
  const dist = Math.hypot(dx, dy);
  if(dist < 1e-6) return 2; // ARRIVED
  const t = Math.min(1, step / dist);
  creature.position.x += dx * t;
  creature.position.y += dy * t;
  creature.force = 0;
  creature.speed = rate;
  creature.walkSpeedFactor = Math.min(1, (creature.walkSpeedFactor || 0.5) + delta);
  return 1; // OK
});

jest.mock("@/engine/pathfinding/update-creature-walk", () => ({
  updateCreatureWalk: (...args: unknown[]) => (mockWalkUpdate as Function)(...args),
  CreatureWalkResult: { OK: 1, ARRIVED: 2, BLOCKED: 3 },
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.5,
}));

jest.mock("@/engine/pathfinding/smooth-select-nodes", () => ({
  smoothSelection: (_a: unknown, world: THREE.Vector3[]) => world,
}));

jest.mock("@/engine/pathfinding/path-point-creature-detour", () => ({
  getPathStepTolerance: () => 2,
}));

jest.mock("@/actions/use-range", () => ({
  isInUseRange: () => false,
}));

import { partyFollowPath } from "@/engine/pathfinding/party-follow-path";
import {
  createFollowRuntime,
  FollowLeaderState,
  FOLLOW_COMFORT,
  FOLLOW_REPATH,
  FOLLOW_TELEPORT_DIST,
} from "@/engine/pathfinding/follow-leader";
import { stepFollowLeaderState } from "@/engine/pathfinding/follow-leader-sm";
import { plotGridPath } from "@/engine/pathfinding/plot-grid-path";
import { canPathToPoint } from "@/engine/pathfinding/can-path-to";
import { PlotPathCode } from "@/engine/pathfinding/plot-path";
import {
  countStateTransitions,
  createFollowParty,
  DT,
  makeCreature,
  makeOpenArea,
  simulateFollowFrames,
  totalDisplacement,
  uniqueStates,
} from "@/tests/engine/pathfinding/pathing-harness";

const plotPathMock = jest.fn();
jest.mock("@/engine/pathfinding/plot-path", () => ({
  PlotPathCode: { Incomplete: 1, Ready: 2, Fail: 3 },
  plotPath: (...args: unknown[]) => plotPathMock(...args),
}));

describe("Pathing checkpoints — Plot / Grid / Check", () => {
  beforeEach(() => {
    mockParty.length = 0;
    partyFollowPath.reset();
    mockTestDirectLine.mockReset();
    mockTestDirectLine.mockImplementation(() => ({
      ok: true,
      code: 1,
      clearPoint: new THREE.Vector3(),
      clearT: 1,
    }));
    mockWalkUpdate.mockClear();
    plotPathMock.mockReset();
  });

  it("CP-GRID: empty-PTH L-corridor finds a detouring path", () => {
    const area = makeOpenArea({
      wall: { minX: 1.5, maxX: 3.5, minY: -0.75, maxY: 0.75 },
    });
    const path = plotGridPath(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      { personalSpace: 0.5, maxLateral: 16 }
    );
    expect(path).toBeDefined();
    expect(path!.length).toBeGreaterThanOrEqual(2);
    const maxAbsY = path!.reduce((m, p) => Math.max(m, Math.abs(p.y)), 0);
    expect(maxAbsY).toBeGreaterThan(0.4);
  });

  it("CP-GRID: unreachable dest returns undefined", () => {
    const area = makeOpenArea();
    (area as { isPointWalkable: (p: THREE.Vector3) => boolean }).isPointWalkable =
      (p) => Math.hypot(p.x, p.y) < 0.2;
    const path = plotGridPath(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      { personalSpace: 0.5, maxLateral: 4 }
    );
    expect(path).toBeUndefined();
  });

  it("CP-CHECK: canPathTo treats Incomplete and Ready as traversable", () => {
    const creature = makeCreature(0, 0, 0, { area: makeOpenArea() });
    plotPathMock.mockReturnValue({ code: PlotPathCode.Incomplete });
    expect(canPathToPoint(creature, new THREE.Vector3(5, 0, 0))).toBe(true);
    plotPathMock.mockReturnValue({ code: PlotPathCode.Ready });
    expect(canPathToPoint(creature, new THREE.Vector3(5, 0, 0))).toBe(true);
    plotPathMock.mockReturnValue({ code: PlotPathCode.Fail });
    expect(canPathToPoint(creature, new THREE.Vector3(5, 0, 0))).toBe(false);
  });
});

describe("Pathing checkpoints — FollowLeader SM gates", () => {
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
    mockWalkUpdate.mockClear();
  });

  it("CP-COLD: holds WaitingForPath while ring count ≤ 4", () => {
    const { leader, companion, runtime } = createFollowParty({
      companionXY: [10, 0],
      ringCount: 1,
    });
    mockParty.push(leader, companion);
    partyFollowPath.reset(leader.position, 0);
    runtime.state = FollowLeaderState.WaitingForPath;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;

    const offset = new THREE.Vector3(1.5, 0, 0);
    stepFollowLeaderState(runtime, companion, leader, offset, DT);
    expect(runtime.state).toBe(FollowLeaderState.WaitingForPath);
  });

  it("CP-WAITDEST-FAR: OffsetWaitDest → MovingToPath when outside comfort", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [8, 0],
      ringCount: 30,
    });
    mockParty.push(leader, companion);
    partyFollowPath.memberCursor[1] = 5;
    partyFollowPath.memberGoalIndex[1] = 5;
    runtime.state = FollowLeaderState.OffsetWaitDest;
    runtime.goalX = leader.position.x - 1.5;
    runtime.goalY = 0;
    runtime.goalZ = 0;
    runtime.pathPointX = runtime.goalX;
    runtime.pathPointY = 0;
    runtime.pathPointZ = 0;
    const p = partyFollowPath.points[5];
    if(p){
      runtime.pathPointX = p.x + 10;
      runtime.goalX = p.x;
      runtime.goalY = p.y;
    }

    stepFollowLeaderState(
      runtime, companion, leader, new THREE.Vector3(runtime.goalX, 0, 0), DT
    );
    expect(runtime.state).toBe(FollowLeaderState.MovingToPath);
  });

  it("CP-STALE-LOS: recovers Offset when feet LOS clear but sample blocked", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [10, 0],
      companionXY: [8.5, 0],
      ringCount: 20,
    });
    mockParty.push(leader, companion);
    mockTestDirectLine.mockImplementation((_a: unknown, from: THREE.Vector3) => {
      const fromFeet =
        Math.hypot(from.x - companion.position.x, from.y - companion.position.y) < 0.6;
      return {
        ok: fromFeet,
        code: fromFeet ? 1 : -3,
        clearT: fromFeet ? 1 : 0.4,
        clearPoint: from.clone(),
      };
    });

    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = -5;
    runtime.lastSampleY = 0;
    runtime.lastSampleZ = 0;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    const offset = companion.position.clone();
    offset.x -= 1.5;
    stepFollowLeaderState(runtime, companion, leader, offset, DT);

    expect(runtime.state).toBe(FollowLeaderState.Offset);
    expect(runtime.lastSampleX).not.toBe(-5);
  });

  it("CP-REPATH: Offset leaves for MovingToPath when distOffset ≥ REPATH", () => {
    // Companion at leader feet so offset @ (5,0) is clearly past FOLLOW_REPATH (3.5).
    const { leader, companion, runtime } = createFollowParty({
      companionXY: [0, 0],
      ringCount: 10,
    });
    mockParty.push(leader, companion);
    runtime.state = FollowLeaderState.Offset;
    const far = new THREE.Vector3(5, 0, 0);
    stepFollowLeaderState(runtime, companion, leader, far, DT);
    expect(runtime.state).not.toBe(FollowLeaderState.Offset);
    expect([
      FollowLeaderState.MovingToPath,
      FollowLeaderState.FindPath,
      FollowLeaderState.FollowingPath,
      FollowLeaderState.MovingToOffset,
      FollowLeaderState.OffsetWaitDest,
      FollowLeaderState.PathWaitDest,
    ]).toContain(runtime.state);
  });

  it("CP-BLOCKER: Moving* does not bump world creatures out of follower path", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [5, 0],
      ringCount: 20,
    });
    const blocker = makeCreature(9, 4.5, 0);
    mockParty.push(leader, companion);
    mockTestDirectLine.mockImplementation(() => ({
      ok: false,
      code: -3,
      clearPoint: companion.position.clone(),
      clearT: 0,
      blockingCreatureId: blocker.id,
    }));

    runtime.state = FollowLeaderState.MovingToPath;
    const beforeBlocker = blocker.position.clone();
    const beforeCompanion = companion.position.clone();
    stepFollowLeaderState(runtime, companion, leader, new THREE.Vector3(0, 0, 0), DT);

    expect(runtime.state).toBe(FollowLeaderState.Teleport);
    expect(blocker.position).toEqual(beforeBlocker);
    expect(companion.position).toEqual(beforeCompanion);
  });
});

describe("Pathing over time — multi-frame regressions", () => {
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
    mockWalkUpdate.mockClear();
  });

  it("OT-OFFSET-PROGRESS: companion closes on offset over 90 frames without thrash", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [2.5, -0.5],
      ringCount: 30,
    });
    mockParty.push(leader, companion);
    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    const getOffset = () =>
      new THREE.Vector3(
        leader.position.x + 1.5,
        leader.position.y - 0.7,
        leader.position.z
      );

    const startDist = Math.hypot(
      companion.position.x - getOffset().x,
      companion.position.y - getOffset().y
    );

    const trace = simulateFollowFrames({
      frames: 90,
      runtime,
      companion,
      leader,
      getOffset,
    });

    const end = trace[trace.length - 1];
    expect(end.distOffset).toBeLessThan(startDist);
    // Should not oscillate wildly between Offset and Moving*
    expect(countStateTransitions(trace)).toBeLessThan(20);
    // Must spend meaningful time in Offset (or arrive and park)
    const offsetFrames = trace.filter((t) => t.state === FollowLeaderState.Offset).length;
    expect(offsetFrames).toBeGreaterThan(10);
  });

  it("OT-NO-STALE-THRASH: blocked sample does not freeze companion for 120 frames", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [2.2, 0],
      ringCount: 25,
    });
    mockParty.push(leader, companion);

    // First LOS from stale sample fails; subsequent from feet/new sample ok
    mockTestDirectLine.mockImplementation((_a: unknown, from: THREE.Vector3) => {
      const stale = from.x < -1;
      return {
        ok: !stale,
        code: stale ? -3 : 1,
        clearT: stale ? 0.3 : 1,
        clearPoint: from.clone(),
      };
    });

    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = -5;
    runtime.lastSampleY = 0;
    runtime.lastSampleZ = 0;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    const getOffset = () =>
      new THREE.Vector3(leader.position.x + 1.5, leader.position.y, 0);

    const trace = simulateFollowFrames({
      frames: 120,
      runtime,
      companion,
      leader,
      getOffset,
    });

    // Stale sample must be cleared early
    expect(runtime.lastSampleX).toBeGreaterThan(-1);
    // Must not remain motionless the whole window
    expect(totalDisplacement(trace)).toBeGreaterThan(0.05);
    // No pathological Offset↔Moving spam every other frame
    const transitions = countStateTransitions(trace);
    expect(transitions / trace.length).toBeLessThan(0.5);
  });

  it("OT-MOVING-CATCHUP: MovingToPath advances toward offset via direct follow step", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [6, 0],
      ringCount: 20,
    });
    mockParty.push(leader, companion);
    runtime.state = FollowLeaderState.MovingToPath;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;

    const getOffset = () => new THREE.Vector3(1.5, -0.7, 0);
    const start = companion.position.clone();

    const trace = simulateFollowFrames({
      frames: 60,
      runtime,
      companion,
      leader,
      getOffset,
    });

    expect(mockWalkUpdate).not.toHaveBeenCalled();
    expect(totalDisplacement(trace)).toBeGreaterThan(0.5);
    const endDist = Math.hypot(
      companion.position.x - getOffset().x,
      companion.position.y - getOffset().y
    );
    const startDist = Math.hypot(start.x - getOffset().x, start.y - getOffset().y);
    expect(endDist).toBeLessThan(startDist);
  });

  it("OT-LEADER-WEAVE: follower tracks moving leader without freeze", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [2, 0],
      ringCount: 20,
    });
    mockParty.push(leader, companion);
    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    const trace = simulateFollowFrames({
      frames: 120,
      runtime,
      companion,
      leader,
      moveLeader: (L, _f, dt) => {
        L.position.x += 2.5 * dt; // ~walk pace
      },
      getOffset: () =>
        new THREE.Vector3(
          leader.position.x - 1.5,
          leader.position.y - 0.7,
          0
        ),
    });

    expect(totalDisplacement(trace)).toBeGreaterThan(0.5);
    // Follower should stay within a loose follow band most of the time
    const farFrames = trace.filter((t) => t.distLeader > FOLLOW_TELEPORT_DIST).length;
    expect(farFrames).toBe(0);
    const states = uniqueStates(trace);
    expect(states.length).toBeGreaterThanOrEqual(1);
  });

  it("OT-WAITDEST-NO-THRASH: far WaitDest does not Flip-flop Offset for 60 frames", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [8, 0],
      ringCount: 40,
    });
    mockParty.push(leader, companion);
    // Goal index already reachable on ring
    partyFollowPath.memberCursor[1] = 2;
    partyFollowPath.memberGoalIndex[1] = 2;
    runtime.state = FollowLeaderState.OffsetWaitDest;
    runtime.goalX = -1.5;
    runtime.goalY = 0;
    runtime.goalZ = 0;
    runtime.pathPointX = 20; // farther than goal → leave WaitDest
    runtime.pathPointY = 0;
    runtime.pathPointZ = 0;

    const getOffset = () => new THREE.Vector3(-1.5, 0, 0);
    const trace = simulateFollowFrames({
      frames: 60,
      runtime,
      companion,
      leader,
      getOffset,
    });

    // Should leave WaitDest and spend time Moving* (not ping-pong WaitDest/Offset)
    const waitFrames = trace.filter(
      (t) =>
        t.state === FollowLeaderState.OffsetWaitDest ||
        t.state === FollowLeaderState.PathWaitDest
    ).length;
    expect(waitFrames).toBeLessThan(10);
    const movingish = trace.filter((t) =>
      [
        FollowLeaderState.MovingToPath,
        FollowLeaderState.FollowingPath,
        FollowLeaderState.MovingToOffset,
        FollowLeaderState.FindPath,
      ].includes(t.state)
    ).length;
    expect(movingish).toBeGreaterThan(5);
  });

  it("OT-COMFORT-PARK: once inside comfort, stays Offset without Moving spam", () => {
    const { leader, companion, runtime } = createFollowParty({
      leaderXY: [0, 0],
      companionXY: [1.2, -0.5],
      ringCount: 25,
    });
    mockParty.push(leader, companion);
    runtime.state = FollowLeaderState.Offset;
    runtime.lastSampleX = companion.position.x;
    runtime.lastSampleY = companion.position.y;
    runtime.lastSampleZ = companion.position.z;
    runtime.pathPointX = companion.position.x;
    runtime.pathPointY = companion.position.y;
    runtime.pathPointZ = companion.position.z;

    const getOffset = () =>
      new THREE.Vector3(
        companion.position.x + 0.2,
        companion.position.y,
        0
      );

    const trace = simulateFollowFrames({
      frames: 45,
      runtime,
      companion,
      leader,
      getOffset,
    });

    const offsetRatio =
      trace.filter((t) => t.state === FollowLeaderState.Offset).length / trace.length;
    expect(offsetRatio).toBeGreaterThan(0.7);
    expect(countStateTransitions(trace)).toBeLessThan(8);
    // Stay within comfort/repath band
    for(const t of trace){
      expect(t.distOffset).toBeLessThan(FOLLOW_REPATH + 0.5);
    }
  });
});

describe("Pathing invariants — constants & harness sanity", () => {
  it("engine comfort < repath < teleport distances", () => {
    expect(FOLLOW_COMFORT).toBeLessThan(FOLLOW_REPATH);
    expect(FOLLOW_REPATH).toBeLessThan(FOLLOW_TELEPORT_DIST);
  });

  it("createFollowRuntime starts in WaitingForPath", () => {
    const rt = createFollowRuntime();
    expect(rt.state).toBe(FollowLeaderState.WaitingForPath);
    expect(rt.stuckTimer).toBe(0);
  });
});
