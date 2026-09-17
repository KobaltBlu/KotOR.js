/**
 * PlayerControl predicted resolve — creature solidity + wall slide.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const testCreatureMovementMock = jest.fn();
const testStaticMovementMock = jest.fn();
const findGroundMock = jest.fn();
const findWalkableAttachmentAtMock = jest.fn();
const nudgeFriendlyCreaturesMock = jest.fn();

jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: { party: [] as unknown[] },
    getCurrentPlayer: () => undefined,
    module: undefined,
    debug: {},
  },
}));

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => !!v,
    InstanceOf: () => true,
  },
}));

jest.mock("@/module/guards/isCreature", () => ({
  isCreature: (o: unknown) => !!(o as { objectType?: number })?.objectType,
}));

jest.mock("@/combat/attack-range", () => ({
  getCreaturePersonalSpace: () => 0.4,
  getPathPersonalSpace: () => 0.5,
}));

jest.mock("@/engine/pathfinding/nudge-friendlies", () => ({
  nudgeFriendlyCreatures: (...args: unknown[]) =>
    nudgeFriendlyCreaturesMock(...args),
}));

jest.mock("@/engine/movement/area-movement-queries", () => ({
  WalkLineHitCode: { Ok: 1, Fail: 0, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
  testCreatureMovement: (...args: unknown[]) => testCreatureMovementMock(...args),
  testStaticMovement: (...args: unknown[]) => testStaticMovementMock(...args),
  findGround: (...args: unknown[]) => findGroundMock(...args),
  findWalkableAttachmentAt: (...args: unknown[]) =>
    findWalkableAttachmentAtMock(...args),
}));

import {
  projectOntoTangent,
  resolvePlayerControlStep,
} from "@/engine/movement/player-control-policy";
import { MovementHitKind, MovementStatus } from "@/engine/movement/types";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleArea } from "@/module/ModuleArea";

function mockCreature(
  id: number,
  x: number,
  y: number,
  area?: ModuleArea
): ModuleCreature {
  return {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    position: new THREE.Vector3(x, y, 0),
    area,
  } as unknown as ModuleCreature;
}

describe("projectOntoTangent", () => {
  it("removes the into-wall component of desired motion", () => {
    const out = new THREE.Vector3();
    // Outward wall normal faces player (−X); desired into +X wall
    projectOntoTangent(1, 1, -1, 0, out);
    expect(out.x).toBeCloseTo(0);
    expect(out.y).toBeCloseTo(1);
  });

  it("keeps escape motion along the normal", () => {
    const out = new THREE.Vector3();
    projectOntoTangent(-1, 0, -1, 0, out);
    expect(out.x).toBeCloseTo(-1);
    expect(out.y).toBeCloseTo(0);
  });
});

describe("resolvePlayerControlStep", () => {
  let area: ModuleArea;
  let player: ModuleCreature;
  let npc: ModuleCreature;

  beforeEach(() => {
    testCreatureMovementMock.mockReset();
    testStaticMovementMock.mockReset();
    findGroundMock.mockReset();
    findWalkableAttachmentAtMock.mockReset();
    nudgeFriendlyCreaturesMock.mockReset();
    findGroundMock.mockReturnValue(undefined);
    findWalkableAttachmentAtMock.mockReturnValue(undefined);
    nudgeFriendlyCreaturesMock.mockReturnValue(false);

    npc = mockCreature(9, 1, 0);
    area = { creatures: [npc] } as unknown as ModuleArea;
    player = mockCreature(1, 0, 0, area);
    (npc as { area: ModuleArea }).area = area;
  });

  it("passes softClearStartOverlap false and allowPartyCreatures false on creature tests", () => {
    testCreatureMovementMock.mockReturnValue({
      clear: false,
      hit: { kind: MovementHitKind.Creature, creatureId: 9, object: npc },
      raw: { clear: false, blockingCreatureId: 9 },
    });
    // Slide probes also fail
    testStaticMovementMock.mockReturnValue({
      clear: false,
      walkHit: {
        code: 0,
        ok: false,
        clearT: 0,
        clearPoint: new THREE.Vector3(0, 0, 0),
      },
    });

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(1, 0, 0)
    );
    expect(result.status).toBe(MovementStatus.Blocked);
    expect(testCreatureMovementMock).toHaveBeenCalled();
    for(const call of testCreatureMovementMock.mock.calls){
      const opts = call[3] as {
        softClearStartOverlap?: boolean;
        allowPartyCreatures?: boolean;
      };
      expect(opts.softClearStartOverlap).toBe(false);
      expect(opts.allowPartyCreatures).toBe(false);
    }
  });

  it("does not accept full ideal step when start-overlapping creature soft-clear would have allowed it", () => {
    // First gate hard-blocks (simulating soft-clear disabled)
    testCreatureMovementMock.mockReturnValue({
      clear: false,
      hit: { kind: MovementHitKind.Creature, creatureId: 9, object: npc },
      raw: { clear: false, blockingCreatureId: 9 },
    });
    testStaticMovementMock.mockReturnValue({
      clear: true,
      walkHit: {
        code: 1,
        ok: true,
        clearT: 1,
        clearPoint: new THREE.Vector3(1, 0, 0),
      },
    });

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(1, 0, 0)
    );
    // Ideal (+1,0) must not be accepted as clear walk-through
    expect(result.finalPosition.x).toBeLessThan(0.99);
    expect(
      result.status === MovementStatus.Blocked ||
        Math.abs(result.finalPosition.y) > 1e-6 ||
        result.actualDistance < 0.99
    ).toBe(true);
  });

  it("keeps party solid — never retries with allowPartyCreatures true", () => {
    const partyMate = mockCreature(2, 0.5, 0, area);
    (area as { creatures: ModuleCreature[] }).creatures = [partyMate];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GameState } = require("@/GameState");
    GameState.PartyManager.party = [player, partyMate];

    testCreatureMovementMock.mockReturnValue({
      clear: false,
      hit: { kind: MovementHitKind.Creature, creatureId: 2, object: partyMate },
      raw: { clear: false, blockingCreatureId: 2 },
    });
    testStaticMovementMock.mockReturnValue({
      clear: false,
      walkHit: {
        code: 0,
        ok: false,
        clearT: 0,
        clearPoint: new THREE.Vector3(0, 0, 0),
      },
    });

    resolvePlayerControlStep(player, new THREE.Vector3(1, 0, 0));
    for(const call of testCreatureMovementMock.mock.calls){
      const opts = call[3] as { allowPartyCreatures?: boolean };
      expect(opts.allowPartyCreatures).toBe(false);
    }
  });

  it("after static clip, accepts projected tangent without remain-renorm (wall slide)", () => {
    testCreatureMovementMock.mockReturnValue({ clear: true, raw: { clear: true } });
    let staticCalls = 0;
    testStaticMovementMock.mockImplementation(
      (_area: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        staticCalls += 1;
        // Ideal step from origin into the wall (first resolve static test)
        if(from.x === 0 && from.y === 0 && to.x > 0.5){
          return {
            clear: false,
            hit: { kind: MovementHitKind.Walkmesh },
            walkHit: {
              code: -1,
              ok: false,
              clearT: 0.2,
              clearPoint: new THREE.Vector3(0.2, 0, 0),
              walkHit: { normal: new THREE.Vector3(-1, 0, 0) },
            },
          };
        }
        // origin+projected / clipped+projected — clear
        return {
          clear: true,
          walkHit: {
            code: 1,
            ok: true,
            clearT: 1,
            clearPoint: to.clone(),
          },
        };
      }
    );

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(1, 0.5, 0)
    );
    expect(result.status).toBe(MovementStatus.Moving);
    // Projected tangent is (0, 0.5) — not renormalized to |desired|
    expect(Math.abs(result.acceptedDisplacement.y)).toBeGreaterThan(1e-4);
    expect(result.actualDistance).toBeLessThan(0.9);
    expect(staticCalls).toBeGreaterThan(1);
  });

  it("rejects wall lateral probe that is static-clear but creature-blocked", () => {
    // Ideal creature-clear, static blocked with no clearT (force lateral fan)
    let creatureCall = 0;
    testCreatureMovementMock.mockImplementation(
      (_a: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        creatureCall += 1;
        const dy = Math.abs(to.y - from.y);
        // Lateral probes have Y component — block creatures
        if(dy > 0.1){
          return {
            clear: false,
            hit: { kind: MovementHitKind.Creature, creatureId: 9 },
            raw: { clear: false, blockingCreatureId: 9 },
          };
        }
        return { clear: true, raw: { clear: true } };
      }
    );
    testStaticMovementMock.mockImplementation(
      (_a: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        const dx = to.x - from.x;
        const dy = Math.abs(to.y - from.y);
        if(dy < 1e-6 && dx > 0){
          return {
            clear: false,
            hit: { kind: MovementHitKind.Walkmesh },
            walkHit: {
              code: -1,
              ok: false,
              clearT: 0,
              clearPoint: from.clone(),
              // Outward normal faces free space (−X)
              walkHit: { normal: new THREE.Vector3(-1, 0, 0) },
            },
          };
        }
        // Lateral static clear
        return {
          clear: true,
          walkHit: {
            code: 1,
            ok: true,
            clearT: 1,
            clearPoint: to.clone(),
          },
        };
      }
    );

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(1, 0, 0)
    );
    expect(result.status).toBe(MovementStatus.Blocked);
    expect(result.actualDistance).toBeLessThan(1e-6);
    expect(creatureCall).toBeGreaterThan(1);
  });

  it("allows escape away from the wall (desired · outwardNormal >= 0)", () => {
    testCreatureMovementMock.mockReturnValue({ clear: true, raw: { clear: true } });
    testStaticMovementMock.mockImplementation(
      (_area: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        // Ideal escape (−X) still reported blocked by start overlap with edge,
        // but a short outward / projected escape probe is clear.
        if(from.x === 0 && from.y === 0 && to.x < -0.5){
          return {
            clear: false,
            hit: { kind: MovementHitKind.Walkmesh },
            walkHit: {
              code: -1,
              ok: false,
              clearT: 0,
              clearPoint: from.clone(),
              walkHit: { normal: new THREE.Vector3(-1, 0, 0) },
            },
          };
        }
        return {
          clear: true,
          walkHit: {
            code: 1,
            ok: true,
            clearT: 1,
            clearPoint: to.clone(),
          },
        };
      }
    );

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(-1, 0, 0)
    );
    expect(result.status).toBe(MovementStatus.Moving);
    expect(result.acceptedDisplacement.x).toBeLessThan(-1e-4);
    // Not forced into Y-only wall-run
    expect(Math.abs(result.acceptedDisplacement.y)).toBeLessThan(0.05);
  });

  it("keeps slide speed at projected magnitude, not full desired length", () => {
    testCreatureMovementMock.mockReturnValue({ clear: true, raw: { clear: true } });
    testStaticMovementMock.mockImplementation(
      (_area: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        if(from.x === 0 && from.y === 0 && to.x > 0.5){
          return {
            clear: false,
            hit: { kind: MovementHitKind.Walkmesh },
            walkHit: {
              code: -1,
              ok: false,
              clearT: 0,
              clearPoint: from.clone(),
              walkHit: { normal: new THREE.Vector3(-1, 0, 0) },
            },
          };
        }
        return {
          clear: true,
          walkHit: {
            code: 1,
            ok: true,
            clearT: 1,
            clearPoint: to.clone(),
          },
        };
      }
    );

    // desired (1, 0.2) → projected (0, 0.2); must not renorm to ~1.02
    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(1, 0.2, 0)
    );
    expect(result.status).toBe(MovementStatus.Moving);
    expect(result.actualDistance).toBeCloseTo(0.2, 2);
    expect(Math.abs(result.acceptedDisplacement.x)).toBeLessThan(0.05);
    expect(result.acceptedDisplacement.y).toBeCloseTo(0.2, 2);
  });

  it("depenetrates when already overlapping another creature", () => {
    // PC at origin overlapping NPC at (0.2, 0) with creperspace 0.4+0.4+0.01
    npc.position.set(0.2, 0, 0);
    testCreatureMovementMock.mockImplementation(
      (_a: unknown, from: THREE.Vector3, to: THREE.Vector3, opts?: { softClearStartOverlap?: boolean }) => {
        const soft = opts?.softClearStartOverlap === true;
        // Hard tests: always blocked while start overlaps
        if(!soft){
          return {
            clear: false,
            hit: { kind: MovementHitKind.Creature, creatureId: 9, object: npc },
            raw: { clear: false, blockingCreatureId: 9 },
          };
        }
        // Soft: allow exit probes that move away from NPC
        const destDist = Math.hypot(to.x - 0.2, to.y - 0);
        const originDist = Math.hypot(from.x - 0.2, from.y - 0);
        if(destDist + 1e-4 >= originDist){
          return { clear: true, raw: { clear: true } };
        }
        return {
          clear: false,
          hit: { kind: MovementHitKind.Creature, creatureId: 9, object: npc },
          raw: { clear: false, blockingCreatureId: 9 },
        };
      }
    );
    testStaticMovementMock.mockReturnValue({
      clear: true,
      walkHit: {
        code: 1,
        ok: true,
        clearT: 1,
        clearPoint: new THREE.Vector3(0, 0, 0),
      },
    });

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(0.1, 0, 0) // still pushing into NPC
    );
    expect(result.status).toBe(MovementStatus.Moving);
    const after = Math.hypot(
      result.finalPosition.x - npc.position.x,
      result.finalPosition.y - npc.position.y
    );
    const before = Math.hypot(0 - npc.position.x, 0 - npc.position.y);
    expect(after).toBeGreaterThan(before + 1e-4);
    // Push is away from NPC (NPC at +X → self moves −X)
    expect(result.finalPosition.x).toBeLessThan(0);
  });

  it("attaches room and groundFace from findWalkableAttachmentAt on clear step", () => {
    const room = { roomName: "m02ac_02e" };
    const face = { walkIndex: 21 };
    findWalkableAttachmentAtMock.mockReturnValue({
      room,
      face,
      z: 0.005,
    });
    testCreatureMovementMock.mockReturnValue({ clear: true, raw: { clear: true } });
    testStaticMovementMock.mockReturnValue({
      clear: true,
      walkHit: {
        code: 1,
        ok: true,
        clearT: 1,
        clearPoint: new THREE.Vector3(1, 0, 0),
      },
    });

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(1, 0, 0)
    );
    expect(result.status).toBe(MovementStatus.Moving);
    expect(result.room).toBe(room);
    expect(result.groundFace).toBe(face);
    expect(result.finalPosition.z).toBeCloseTo(0.005);
    expect(findWalkableAttachmentAtMock).toHaveBeenCalled();
  });

  it("slides along collinear perimeter edges at a vertex despite bad mesh normal", () => {
    // Live m02ac_02c: two walls meet at 111.7; mesh would report ±X.
    const west = {
      transition: -1,
      line: new THREE.Line3(
        new THREE.Vector3(104.25, 99.75, 0),
        new THREE.Vector3(111.7, 99.75, 0)
      ),
      normal: new THREE.Vector3(0, 1, 0),
    };
    const east = {
      transition: -1,
      line: new THREE.Line3(
        new THREE.Vector3(111.7, 99.75, 0),
        new THREE.Vector3(120.75, 99.75, 0)
      ),
      normal: new THREE.Vector3(0, 1, 0),
    };
    (area as { walkEdges: unknown[] }).walkEdges = [west, east];
    player.position.set(111.7, 100.16, 0);

    testCreatureMovementMock.mockReturnValue({ clear: true, raw: { clear: true } });
    testStaticMovementMock.mockImplementation(
      (_a: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        const dy = to.y - from.y;
        // Into-wall (south) blocked with corner normal; along-wall clear
        if(dy < -0.05){
          return {
            clear: false,
            hit: { kind: MovementHitKind.Static },
            walkHit: {
              code: -2,
              ok: false,
              clearT: 0,
              clearPoint: from.clone(),
              walkHit: { normal: new THREE.Vector3(-1, 0.008, 0) },
            },
          };
        }
        return {
          clear: true,
          walkHit: {
            code: 1,
            ok: true,
            clearT: 1,
            clearPoint: to.clone(),
          },
        };
      }
    );

    const result = resolvePlayerControlStep(
      player,
      new THREE.Vector3(0.35, -0.2, 0)
    );
    expect(result.status).toBe(MovementStatus.Moving);
    expect(result.finalPosition.x).toBeGreaterThan(player.position.x + 0.2);
    expect(result.finalPosition.y).toBeCloseTo(player.position.y, 2);
  });
});
