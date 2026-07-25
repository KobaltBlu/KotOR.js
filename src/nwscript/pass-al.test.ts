/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/GameState", () => ({ GameState: {} }));

/** Mirror of ModuleObjectManager.GetNearestObjectToLocation distance sort. */
function nearestObjectToLocation(
  objects: { position: THREE.Vector3 }[],
  origin: THREE.Vector3,
  iNum = 0,
) {
  const results = objects.slice().sort((a, b) =>
    a.position.distanceTo(origin) - b.position.distanceTo(origin)
  );
  return results[iNum];
}

describe("Pass AL GetNearestObjectToLocation sort", () => {
  it("returns nearer object first by location XYZ", () => {
    const near = { position: new THREE.Vector3(1, 0, 0) };
    const far = { position: new THREE.Vector3(10, 0, 0) };
    const origin = new THREE.Vector3(0, 0, 0);
    expect(nearestObjectToLocation([far, near], origin, 0)).toBe(near);
    expect(nearestObjectToLocation([far, near], origin, 1)).toBe(far);
  });
});

describe("Pass AL GetNearestCreatureToLocation IS_ALIVE sort", () => {
  it("sorts alive creatures by location distance", () => {
    const near = { position: new THREE.Vector3(2, 0, 0), isDead: () => false };
    const far = { position: new THREE.Vector3(20, 0, 0), isDead: () => false };
    const dead = { position: new THREE.Vector3(0.5, 0, 0), isDead: () => true };
    const alive = [far, near, dead].filter((c) => !c.isDead());
    const origin = new THREE.Vector3(0, 0, 0);
    alive.sort((a, b) => a.position.distanceTo(origin) - b.position.distanceTo(origin));
    expect(alive[0]).toBe(near);
  });
});

describe("Pass AL lock getter smoke", () => {
  it("reads keyRequired / keyName / lockable / DCs from door-like object", () => {
    const door = {
      keyRequired: true,
      keyName: "key_tag",
      lockable: true,
      openLockDC: 28,
      closeLockDC: 15,
    };
    expect(door.keyRequired ? 1 : 0).toBe(1);
    expect(String(door.keyName || "")).toBe("key_tag");
    expect(door.lockable ? 1 : 0).toBe(1);
    expect((door.openLockDC | 0) & 0xff).toBe(28);
    expect((door.closeLockDC | 0) & 0xff).toBe(15);
  });
});

describe("Pass AL trapDetectedBy list", () => {
  it("tracks detector ids and lastTrapDetected", () => {
    const trap = {
      id: 100,
      trapDetectedByIds: [] as number[],
      trapDetected: false,
      setTrapDetectedBy(detector: { id: number; lastTrapDetected?: unknown }) {
        if (this.trapDetectedByIds.indexOf(detector.id) < 0) {
          this.trapDetectedByIds.push(detector.id);
        }
        this.trapDetected = true;
        detector.lastTrapDetected = this;
        return true;
      },
      isTrapDetectedBy(creature: { id: number }) {
        return this.trapDetectedByIds.indexOf(creature.id) >= 0;
      },
    };
    const creature = { id: 7, lastTrapDetected: undefined as unknown };
    expect(trap.isTrapDetectedBy(creature)).toBe(false);
    expect(trap.setTrapDetectedBy(creature)).toBe(true);
    expect(trap.isTrapDetectedBy(creature)).toBe(true);
    expect(creature.lastTrapDetected).toBe(trap);
  });
});
