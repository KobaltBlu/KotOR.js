/**
 * ensureSafeStandingPosition — lip / wall-buffer recovery after AI MoveTo.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockIsSafeWalkPoint = jest.fn();
const mockFindOpenWalkLocation = jest.fn();
const mockTeleportObject = jest.fn();

jest.mock("@/engine/pathfinding/safe-walk-point", () => ({
  isSafeWalkPoint: (...args: unknown[]) => mockIsSafeWalkPoint(...args),
}));

jest.mock("@/engine/pathfinding/open-walk-location", () => ({
  findOpenWalkLocation: (...args: unknown[]) => mockFindOpenWalkLocation(...args),
}));

jest.mock("@/engine/movement/teleport", () => ({
  teleportObject: (...args: unknown[]) => mockTeleportObject(...args),
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 1.0,
}));

import { ensureSafeStandingPosition } from "@/engine/pathfinding/ensure-safe-standing";
import type { ModuleCreature } from "@/module/ModuleCreature";

describe("ensureSafeStandingPosition", () => {
  beforeEach(() => {
    mockIsSafeWalkPoint.mockReset();
    mockFindOpenWalkLocation.mockReset();
    mockTeleportObject.mockReset();
  });

  it("no-ops when the stand is already capsule-safe", () => {
    mockIsSafeWalkPoint.mockReturnValue(true);
    const creature = {
      position: new THREE.Vector3(10, 10, 0),
      area: {},
    } as unknown as ModuleCreature;

    expect(ensureSafeStandingPosition(creature)).toBe(false);
    expect(mockFindOpenWalkLocation).not.toHaveBeenCalled();
    expect(mockTeleportObject).not.toHaveBeenCalled();
  });

  it("teleports to an open walk location when the stand is unsafe", () => {
    mockIsSafeWalkPoint.mockReturnValue(false);
    mockFindOpenWalkLocation.mockImplementation(
      (_area: unknown, _center: THREE.Vector3, out: THREE.Vector3) => {
        out.set(9, 9, 0.005);
        return true;
      }
    );
    const creature = {
      position: new THREE.Vector3(10, 10.75, 0),
      area: {},
    } as unknown as ModuleCreature;

    expect(ensureSafeStandingPosition(creature)).toBe(true);
    expect(mockFindOpenWalkLocation).toHaveBeenCalledWith(
      creature.area,
      creature.position,
      expect.any(THREE.Vector3),
      expect.objectContaining({
        radius: 2,
        personalSpace: 1.0,
        owner: creature,
      })
    );
    expect(mockTeleportObject).toHaveBeenCalledWith(
      creature,
      expect.objectContaining({ x: 9, y: 9, z: 0.005 }),
      0,
      0,
      expect.objectContaining({ caller: "ensureSafeStandingPosition" })
    );
  });

  it("returns false when open-walk search finds nothing", () => {
    mockIsSafeWalkPoint.mockReturnValue(false);
    mockFindOpenWalkLocation.mockReturnValue(false);
    const creature = {
      position: new THREE.Vector3(10, 10, 0),
      area: {},
    } as unknown as ModuleCreature;

    expect(ensureSafeStandingPosition(creature)).toBe(false);
    expect(mockTeleportObject).not.toHaveBeenCalled();
  });
});
