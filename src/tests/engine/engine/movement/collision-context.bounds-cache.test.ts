/**
 * CollisionContext cached object bounds (collision / path-query AABB).
 * @jest-environment node
 */
import { describe, expect, test, jest, afterEach } from "@jest/globals";
import * as THREE from "three";
import { CollisionContext } from "@engine/movement/CollisionContext";

jest.mock("@engine/runtime/GameState", () => {
  const THREE = require("three");
  return {
    GameState: {
      raycaster: new THREE.Raycaster(),
      group: {},
      module: { area: {} },
    },
  };
});

jest.mock("@engine/odyssey", () => ({
  OdysseyWalkMesh: class {},
}));

jest.mock("@engine/render/three/odyssey", () => ({
  OdysseyFace3: class {},
}));

jest.mock("@engine/movement/area-movement-queries", () => ({
  findWalkableAttachmentAt: () => undefined,
}));

jest.mock("@engine/movement/apply-walkable-attachment", () => ({
  applyWalkableAttachment: () => undefined,
}));

afterEach(() => {
  jest.restoreAllMocks();
});

function makeCollisionObject(){
  const container = new THREE.Object3D();
  const model = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshBasicMaterial()
  );
  container.add(model);
  container.position.set(1, 2, 3);
  container.updateMatrix();
  container.updateMatrixWorld(true);

  const object: any = {
    model,
    container,
    position: container.position,
    box: new THREE.Box3(),
    sphere: new THREE.Sphere(),
    collisionBoundsDirty: true,
    collisionMatrixDirty: true,
  };
  object.collisionContext = new CollisionContext(object);
  object.collisionManager = object.collisionContext;
  return object;
}

describe("CollisionContext cached object bounds", () => {
  test("recomputes local bounds once and reuses them for matrix-only movement", () => {
    const object = makeCollisionObject();
    const manager = object.collisionContext as CollisionContext;
    const setFromObjectSpy = jest.spyOn(THREE.Box3.prototype, "setFromObject");

    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(1);
    expect(object.collisionBoundsDirty).toBe(false);
    expect(object.collisionMatrixDirty).toBe(false);
    expect(object.box.min.x).toBeCloseTo(0);
    expect(object.box.max.x).toBeCloseTo(2);

    object.container.position.set(4, 2, 3);
    object.collisionMatrixDirty = true;
    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(1);
    expect(object.box.min.x).toBeCloseTo(3);
    expect(object.box.max.x).toBeCloseTo(5);

    object.collisionBoundsDirty = true;
    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(2);
  });

  test("matrix-only refresh updates root once without recomputing local bounds", () => {
    const object = makeCollisionObject();
    const manager = object.collisionContext as CollisionContext;
    const setFromObjectSpy = jest.spyOn(THREE.Box3.prototype, "setFromObject");
    const rootSpy = jest.spyOn(object.container, "updateMatrixWorld");

    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(1);
    setFromObjectSpy.mockClear();
    rootSpy.mockClear();

    object.container.position.set(4, 2, 3);
    object.collisionMatrixDirty = true;
    manager.refreshObjectBounds(false);

    expect(rootSpy).toHaveBeenCalledTimes(1);
    expect(setFromObjectSpy).not.toHaveBeenCalled();
    expect(object.box.min.x).toBeCloseTo(3);
    expect(object.box.max.x).toBeCloseTo(5);
  });

  test("ignores inflated MDL header box and uses mesh AABB for picking", () => {
    const object = makeCollisionObject();
    // Aurora default header extents (~10×10×11) — must not become obj.box.
    (object.model as any).box = new THREE.Box3(
      new THREE.Vector3(-5, -5, -1),
      new THREE.Vector3(5, 5, 10)
    );
    object.model.position.set(0, 0, 0);
    object.model.updateMatrix();
    object.container.updateMatrixWorld(true);

    const manager = object.collisionContext as CollisionContext;
    const setFromObjectSpy = jest.spyOn(THREE.Box3.prototype, "setFromObject");

    manager.refreshObjectBounds(true);
    expect(setFromObjectSpy).toHaveBeenCalled();
    // Mesh is BoxGeometry(2,2,2) under container at (1,2,3)
    expect(object.box.min.x).toBeCloseTo(0);
    expect(object.box.max.x).toBeCloseTo(2);
    expect(object.box.max.x - object.box.min.x).toBeCloseTo(2);
    expect(object.box.max.y - object.box.min.y).toBeCloseTo(2);
    expect(object.box.max.z - object.box.min.z).toBeCloseTo(2);
  });

  test("repeated matrix-dirty updates avoid setFromObject (cutscene path)", () => {
    const object = makeCollisionObject();
    const manager = object.collisionContext as CollisionContext;
    const setFromObjectSpy = jest.spyOn(THREE.Box3.prototype, "setFromObject");

    object.collisionBoundsDirty = true;
    object.collisionMatrixDirty = true;
    manager.refreshObjectBounds(false);
    expect(setFromObjectSpy).toHaveBeenCalledTimes(1);
    setFromObjectSpy.mockClear();

    for(let i = 0; i < 5; i++){
      object.container.position.x = 1 + i;
      object.collisionMatrixDirty = true;
      // Mimic GameObject.computeBoundingBox dirty gate
      if(object.collisionBoundsDirty || object.collisionMatrixDirty){
        manager.refreshObjectBounds(false);
      }
    }
    expect(setFromObjectSpy).not.toHaveBeenCalled();
    expect(object.box.min.x).toBeCloseTo(4);
    expect(object.box.max.x).toBeCloseTo(6);
  });
});
