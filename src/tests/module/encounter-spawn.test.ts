/**
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as THREE from "three";

const safeMock = jest.fn();
const nonVisMock = jest.fn();

jest.mock("@/GameState", () => ({
  GameState: {
    module: { area: {} },
    PartyManager: { party: [] as unknown[] },
  },
}));

jest.mock("@/engine/pathfinding/compute-safe-location", () => ({
  computeSafeLocation: (...args: unknown[]) => safeMock(...args),
  computeNonVisibleLocation: (...args: unknown[]) => nonVisMock(...args),
}));

jest.mock("@/loaders", () => ({ ResourceLoader: {} }));
jest.mock("@/resource/GFFObject", () => ({ GFFObject: class {} }));
jest.mock("@/resource/ResourceTypes", () => ({ ResourceTypes: {} }));
jest.mock("@/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@/module/EncounterCreatureEntry", () => ({
  EncounterCreatureEntry: class {},
}));
jest.mock("@/module/EncounterSpawnEntry", () => ({
  EncounterSpawnEntry: class {
    spawnResref = "";
    spawnCR = 0;
    poolPoints = 0;
  },
}));

import { ModuleEncounter } from "@/module/ModuleEncounter";
const { pickSpawnPosition, spawnIfAppropriate } = ModuleEncounter;

function makeEncounter(partial: Partial<ModuleEncounter> = {}): ModuleEncounter {
  return {
    active: 1,
    started: 0,
    playerOnly: 0,
    creatureList: [{ resref: "g_enemy", cr: 1 }],
    spawnList: [],
    spawnPointList: [],
    position: new THREE.Vector3(10, 20, 0),
    lastEntered: { position: new THREE.Vector3(0, 0, 0), isPC: 1 },
    spawnPoolRecovered: 0,
    spawnPoolActive: 0,
    difficulty: 1,
    area: {},
    ...partial,
  } as unknown as ModuleEncounter;
}

describe("spawnIfAppropriate pool gates (Pass AF)", () => {
  it("does not build when spawnPoolRecovered is 0", () => {
    const enc = makeEncounter({ spawnPoolRecovered: 0 });
    spawnIfAppropriate(enc);
    expect(enc.started).toBe(0);
    expect(enc.spawnList.length).toBe(0);
  });
});

describe("pickSpawnPosition fail paths (Pass AF)", () => {
  beforeEach(() => {
    safeMock.mockReset();
    nonVisMock.mockReset();
  });

  it("falls through to NonVisible when Safe fails with spawn points", () => {
    const enc = makeEncounter({
      spawnPointList: [
        { position: new THREE.Vector3(50, 50, 0), orientation: 0 } as any,
      ],
    });
    safeMock.mockReturnValue(false);
    nonVisMock.mockImplementation((_a: unknown, _c: unknown, out: THREE.Vector3) => {
      out.set(11, 22, 0);
      return true;
    });

    const placement = pickSpawnPosition(enc);
    expect(safeMock).toHaveBeenCalled();
    expect(nonVisMock).toHaveBeenCalled();
    expect(placement?.pos.x).toBeCloseTo(11);
    expect(placement?.pos.y).toBeCloseTo(22);
  });

  it("aborts when NonVisible returns sentinel (−1,−1,−1)", () => {
    const enc = makeEncounter({ spawnPointList: [] });
    nonVisMock.mockImplementation((_a: unknown, _c: unknown, out: THREE.Vector3) => {
      out.set(-1, -1, -1);
      return false;
    });

    expect(pickSpawnPosition(enc)).toBeUndefined();
  });
});
