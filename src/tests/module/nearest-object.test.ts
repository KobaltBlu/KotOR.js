/**
 * Retail ExecuteCommandGetNearestObject @ 0054b550 spiral finder.
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { findNearestInArea, insertByDistSq, type NearestCandidate } from "@/managers/nearest-object";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";

type FakeObj = {
  id: number;
  position: THREE.Vector3;
  tag?: string;
  getTag?: () => string;
};

function makeArea(objects: FakeObj[]): ModuleArea {
  const gameObjects = objects
    .slice()
    .sort((a, b) => a.position.x - b.position.x || a.id - b.id) as unknown as ModuleObject[];
  return {
    gameObjects,
    gameObjectsDirty: false,
    ensureGameObjectsSorted() {},
    getFirstObjectIndexByX(x: number) {
      let lo = 0;
      let hi = gameObjects.length;
      while(lo < hi){
        const mid = (lo + hi) >> 1;
        if(gameObjects[mid].position.x < x){
          lo = mid + 1;
        }else{
          hi = mid;
        }
      }
      return lo;
    },
  } as unknown as ModuleArea;
}

describe("insertByDistSq", () => {
  it("keeps ascending distSq order", () => {
    const candidates: NearestCandidate[] = [];
    const a = { id: 1 } as ModuleObject;
    const b = { id: 2 } as ModuleObject;
    const c = { id: 3 } as ModuleObject;
    insertByDistSq(candidates, b, 4);
    insertByDistSq(candidates, a, 1);
    insertByDistSq(candidates, c, 9);
    expect(candidates.map((x) => x.obj.id)).toEqual([1, 2, 3]);
  });
});

describe("findNearestInArea", () => {
  it("returns nearer object by world distSq (nth=0)", () => {
    const near = { id: 2, position: new THREE.Vector3(1, 0, 0) };
    const far = { id: 3, position: new THREE.Vector3(10, 0, 0) };
    const source = { id: 1, position: new THREE.Vector3(0, 0, 0) };
    const area = makeArea([source, near, far]);
    const result = findNearestInArea({
      area,
      origin: source.position,
      nth: 0,
      excludeId: source.id,
      matches: () => true,
    });
    expect(result?.id).toBe(2);
  });

  it("never returns the source object for nth=0", () => {
    const source = { id: 1, position: new THREE.Vector3(0, 0, 0) };
    const other = { id: 2, position: new THREE.Vector3(1, 0, 0) };
    const area = makeArea([source, other]);
    const result = findNearestInArea({
      area,
      origin: source.position,
      nth: 0,
      excludeId: source.id,
      matches: () => true,
    });
    expect(result?.id).toBe(2);
    expect(result?.id).not.toBe(source.id);
  });

  it("returns nth-nearest by distSq", () => {
    const source = { id: 1, position: new THREE.Vector3(0, 0, 0) };
    const a = { id: 2, position: new THREE.Vector3(1, 0, 0) };
    const b = { id: 3, position: new THREE.Vector3(2, 0, 0) };
    const c = { id: 4, position: new THREE.Vector3(3, 0, 0) };
    const area = makeArea([source, a, b, c]);
    expect(findNearestInArea({
      area, origin: source.position, nth: 0, excludeId: 1, matches: () => true,
    })?.id).toBe(2);
    expect(findNearestInArea({
      area, origin: source.position, nth: 1, excludeId: 1, matches: () => true,
    })?.id).toBe(3);
    expect(findNearestInArea({
      area, origin: source.position, nth: 2, excludeId: 1, matches: () => true,
    })?.id).toBe(4);
  });

  it("applies tag predicate", () => {
    const source = { id: 1, position: new THREE.Vector3(0, 0, 0), tag: "src" };
    const taggedFar = { id: 2, position: new THREE.Vector3(5, 0, 0), tag: "foo", getTag: () => "foo" };
    const taggedNear = { id: 3, position: new THREE.Vector3(1, 0, 0), tag: "bar", getTag: () => "bar" };
    const area = makeArea([source, taggedNear, taggedFar]);
    const result = findNearestInArea({
      area,
      origin: source.position,
      nth: 0,
      excludeId: 1,
      matches: (obj) => ((obj as FakeObj).getTag?.() || "").toLowerCase() === "foo",
    });
    expect(result?.id).toBe(2);
  });

  it("early-aborts farther-X objects once nth distSq is locked", () => {
    const source = { id: 1, position: new THREE.Vector3(0, 0, 0) };
    const near = { id: 2, position: new THREE.Vector3(1, 0, 0) };
    // Same Y/Z but large |dx|; after near fills nth=0, |dx|²=100 > near distSq=1 → abort +X.
    const farX = { id: 3, position: new THREE.Vector3(10, 0, 0) };
    const fartherX = { id: 4, position: new THREE.Vector3(20, 0, 0) };
    const area = makeArea([source, near, farX, fartherX]);
    const considered: number[] = [];
    const result = findNearestInArea({
      area,
      origin: source.position,
      nth: 0,
      excludeId: 1,
      matches: (obj) => {
        considered.push(obj.id);
        return true;
      },
    });
    expect(result?.id).toBe(2);
    // Spiral visits near (+1) then abort on farX (+2) without matching fartherX.
    expect(considered).toContain(2);
    expect(considered).not.toContain(4);
  });

  it("location query finds nearest without excludeId", () => {
    // Retail spiral skips the lower_bound slot; place two objects so +1/-1 can hit them.
    const left = { id: 1, position: new THREE.Vector3(-2, 0, 0) };
    const rightNear = { id: 2, position: new THREE.Vector3(1, 0, 0) };
    const rightFar = { id: 3, position: new THREE.Vector3(5, 0, 0) };
    const origin = new THREE.Vector3(0, 0, 0);
    // lower_bound of 0 is index of rightNear (x=1). Spiral: +1=rightFar, -1=left.
    const area = makeArea([left, rightNear, rightFar]);
    const result = findNearestInArea({
      area,
      origin,
      nth: 0,
      matches: () => true,
    });
    // left distSq=4, rightFar distSq=25 — left wins; rightNear at start is skipped (retail).
    expect(result?.id).toBe(1);
  });
});
