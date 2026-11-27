/**
 * Movement commit must refresh cull AABB so isOnScreen tracks live position.
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: { party: [] },
    module: undefined,
    debug: {},
    viewportFrustum: {
      intersectsSphere: (sphere: THREE.Sphere) => {
        // Visible only if sphere center is near (10, 0, 0)
        return Math.abs(sphere.center.x - 10) < 2;
      },
    },
  },
}));

jest.mock("@core/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => !!v,
    InstanceOf: () => true,
  },
}));

jest.mock("@engine/module/guards/isCreature", () => ({
  isCreature: () => true,
}));

import { commitMovement } from "@engine/movement/movement-committer";
import {
  advanceMovementFrame,
} from "@engine/movement/creature-movement-state";
import {
  MovementSource,
  MovementStatus,
} from "@engine/movement/types";
import type { Creature } from "@engine/module/Creature";

describe("movement commit cull bounds", () => {
  it("refreshes box so isOnScreen uses live position, not spawn AABB", () => {
    advanceMovementFrame();
    const box = new THREE.Box3(
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );
    const container = new THREE.Object3D();
    container.position.set(0, 0, 0);
    const creature = {
      id: 1,
      position: container.position,
      container,
      box,
      sphere: new THREE.Sphere(),
      force: 0,
      speed: 0,
      blockingTimer: 0,
      collisionTimer: 0,
      collisionMatrixDirty: false,
      collisionBoundsDirty: false,
      markCollisionMatrixDirty(reason?: string){
        creature.collisionMatrixDirty = true;
      },
      computeBoundingBox(){
        // Simulate refreshObjectBounds: world box follows container position
        const p = creature.position;
        creature.box.set(
          new THREE.Vector3(p.x - 0.5, p.y - 0.5, p.z - 0.5),
          new THREE.Vector3(p.x + 0.5, p.y + 0.5, p.z + 0.5)
        );
        creature.collisionMatrixDirty = false;
        return creature.box;
      },
      isOnScreen(){
        if(creature.collisionMatrixDirty || creature.collisionBoundsDirty){
          creature.computeBoundingBox();
        }
        creature.box.getBoundingSphere(creature.sphere);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GameState } = require("@engine/runtime/GameState");
        return GameState.viewportFrustum.intersectsSphere(creature.sphere);
      },
    };

    // Spawn at origin — frustum cares about x≈10
    expect(creature.isOnScreen()).toBe(false);

    commitMovement(
      creature as unknown as Creature,
      {
        source: MovementSource.Walk,
        status: MovementStatus.Moving,
        origin: new THREE.Vector3(0, 0, 0),
        finalPosition: new THREE.Vector3(10, 0, 0),
        acceptedDisplacement: new THREE.Vector3(10, 0, 0),
        actualDistance: 10,
      },
      { delta: 0.1 }
    );

    expect(creature.position.x).toBeCloseTo(10);
    expect(creature.isOnScreen()).toBe(true);
    // Box center should have moved with the creature
    const center = new THREE.Vector3();
    creature.box.getCenter(center);
    expect(center.x).toBeCloseTo(10);
  });
});
