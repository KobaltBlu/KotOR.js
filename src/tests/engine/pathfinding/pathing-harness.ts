/**
 * Shared fixtures for pathing checkpoint / over-time suites.
 * Keep mocks thin — prefer exercising real SM + ring + grid path code.
 *
 * @file pathing-harness.ts
 */
import { jest } from "@jest/globals";
import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleArea } from "@/module/ModuleArea";
import {
  PartyFollowPath,
  partyFollowPath,
} from "@/engine/pathfinding/party-follow-path";
import {
  createFollowRuntime,
  PartyFollowState,
  type PartyFollowRuntime,
} from "@/engine/pathfinding/party-follow";
import { stepPartyFollowState } from "@/engine/pathfinding/party-follow-sm";

export const DT = 1 / 60;

export type PathingCreature = ModuleCreature & {
  position: THREE.Vector3;
  setPosition: (v: THREE.Vector3 | number, y?: number, z?: number) => void;
  setComputedPath: jest.Mock;
  getComputedPath: jest.Mock;
  setAnimationState: jest.Mock;
  pathBlockFailCount: number;
  blockingTimer: number;
  collisionTimer: number;
  walkSpeedFactor: number;
  force: number;
  speed: number;
  walk: boolean;
};

export type FrameTrace = {
  frame: number;
  state: PartyFollowState;
  x: number;
  y: number;
  distLeader: number;
  distOffset: number;
  offsetStepped: boolean;
  stuckTimer: number;
  stuckCounter: number;
  animCalls: number;
};

/**
 * Minimal open-floor area — everything walkable, optional L-wall strip.
 */
export function makeOpenArea(options: {
  wall?: { minX: number; maxX: number; minY: number; maxY: number };
} = {}): ModuleArea {
  const wall = options.wall;
  return {
    id: 1,
    rooms: [],
    creatures: [],
    doors: [],
    placeables: [],
    isPointWalkable: (p: THREE.Vector3) => {
      if(!wall) return true;
      if(
        p.x > wall.minX && p.x < wall.maxX &&
        p.y > wall.minY && p.y < wall.maxY
      ){
        return false;
      }
      return true;
    },
    getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    path: {
      traverseToPoint: (
        _o: unknown,
        from: THREE.Vector3,
        to: THREE.Vector3
      ) => ({
        points: [{ vector: from.clone() }, { vector: to.clone() }],
        fixWalkEdges: () => {},
        setColor: () => {},
        realtime: true,
        timer: 20,
        pop(){
          this.points.shift();
        },
      }),
    },
  } as unknown as ModuleArea;
}

export function makeCreature(
  x: number,
  y: number,
  z = 0,
  extras: Partial<PathingCreature> = {}
): PathingCreature {
  const creature = {
    id: extras.id ?? Math.floor(Math.random() * 100000),
    position: new THREE.Vector3(x, y, z),
    rotation: { z: 0 },
    area: extras.area,
    partyFollowInfo: { inSafetyRange: 0 },
    pathBlockFailCount: 0,
    blockingTimer: 0,
    collisionTimer: 0,
    walkSpeedFactor: 0.8,
    locomotionScale: 1,
    force: 0,
    speed: 0,
    walk: false,
    moveDirOverride: undefined,
    helperColor: 0,
    forceVector: new THREE.Vector3(),
    getComputedPath: jest.fn(() => undefined),
    setComputedPath: jest.fn(),
    setAnimationState: jest.fn(),
    setFacing: jest.fn(),
    setPosition(v: THREE.Vector3 | number, yy = 0, zz = 0){
      if(typeof v === "object"){
        creature.position.copy(v);
      }else{
        creature.position.set(v, yy, zz);
      }
    },
    getWalkSpeed: () => 1.7,
    getRunSpeed: () => 5.4,
    isDead: () => false,
    isDebilitated: () => false,
    isPartyMember: () => true,
    ...extras,
  };
  return creature as unknown as PathingCreature;
}

export function seedRing(ring: PartyFollowPath, count: number, step = 0.6){
  const leader = makeCreature(0, 0, 0);
  for(let i = 0; i < count; i++){
    leader.position.set(i * step, 0, 0);
    ring.processPoint(leader, undefined);
  }
}

/**
 * Run FollowLeader SM for N frames; returns a position/state trace.
 * Mirrors ActionFollowLeader's inner while (continueInner) per frame.
 */
export function simulateFollowFrames(options: {
  frames: number;
  delta?: number;
  runtime: PartyFollowRuntime;
  companion: PathingCreature;
  leader: PathingCreature;
  /** Live offset each frame (defaults to GetFollowPosition-like lateral). */
  getOffset?: (frame: number) => THREE.Vector3;
  /** Optional leader motion each frame before the SM step. */
  moveLeader?: (leader: PathingCreature, frame: number, dt: number) => void;
  maxInner?: number;
}): FrameTrace[] {
  const dt = options.delta ?? DT;
  const maxInner = options.maxInner ?? 50;
  const traces: FrameTrace[] = [];
  const animBefore = () =>
    (options.companion.setAnimationState as jest.Mock).mock.calls.length;

  for(let frame = 0; frame < options.frames; frame++){
    options.moveLeader?.(options.leader, frame, dt);
    // Keep ring warm when leader moves
    if(options.moveLeader){
      partyFollowPath.processPoint(options.leader, undefined);
      partyFollowPath.recalculateFollowPoints?.();
    }

    const offset = options.getOffset
      ? options.getOffset(frame)
      : options.companion.position.clone().set(
          options.leader.position.x - 1.5,
          options.leader.position.y - 0.7,
          options.leader.position.z
        );

    let inner = 0;
    while(inner < maxInner){
      inner++;
      const step = stepPartyFollowState(
        options.runtime,
        options.companion,
        options.leader,
        offset,
        dt
      );
      if(step.teleport || !step.continueInner) break;
    }

    const distLeader = Math.hypot(
      options.companion.position.x - options.leader.position.x,
      options.companion.position.y - options.leader.position.y
    );
    const distOffset = Math.hypot(
      options.companion.position.x - offset.x,
      options.companion.position.y - offset.y
    );

    traces.push({
      frame,
      state: options.runtime.state,
      x: options.companion.position.x,
      y: options.companion.position.y,
      distLeader,
      distOffset,
      offsetStepped: !!options.runtime.offsetStepped,
      stuckTimer: options.runtime.stuckTimer,
      stuckCounter: options.runtime.stuckCounter,
      animCalls: animBefore(),
    });
  }

  return traces;
}

export function totalDisplacement(trace: FrameTrace[]): number {
  if(trace.length < 2) return 0;
  const a = trace[0];
  const b = trace[trace.length - 1];
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function countStateTransitions(trace: FrameTrace[]): number {
  let n = 0;
  for(let i = 1; i < trace.length; i++){
    if(trace[i].state !== trace[i - 1].state) n++;
  }
  return n;
}

export function uniqueStates(trace: FrameTrace[]): PartyFollowState[] {
  const seen = new Set<PartyFollowState>();
  const out: PartyFollowState[] = [];
  for(const t of trace){
    if(!seen.has(t.state)){
      seen.add(t.state);
      out.push(t.state);
    }
  }
  return out;
}

export function createFollowParty(options?: {
  leaderXY?: [number, number];
  companionXY?: [number, number];
  ringCount?: number;
  area?: ModuleArea;
}){
  const area = options?.area ?? makeOpenArea();
  const [lx, ly] = options?.leaderXY ?? [0, 0];
  const [cx, cy] = options?.companionXY ?? [3, 0];
  const leader = makeCreature(lx, ly, 0, { id: 1, area });
  const companion = makeCreature(cx, cy, 0, { id: 2, area });
  const runtime = createFollowRuntime();
  partyFollowPath.reset(leader.position, 0);
  seedRing(partyFollowPath, options?.ringCount ?? 20);
  partyFollowPath.recalculateFollowPoints?.();
  return { area, leader, companion, runtime };
}
