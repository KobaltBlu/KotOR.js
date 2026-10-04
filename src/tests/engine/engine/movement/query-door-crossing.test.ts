/**
 * Door crossing uses transition-line plane, not door.facing.
 * Live Endar Spire end_door10: facing N/S, walkthrough E/W.
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: { party: [] as unknown[] },
    module: undefined,
    debug: {},
  },
}));

jest.mock("@engine/combat/attack-range", () => ({
  getCreaturePersonalSpace: () => 0.4,
  getPathPersonalSpace: () => 0.5,
}));

import { queryDoorCrossing } from "@engine/movement/area-movement-queries";
import type { ModuleArea } from "@engine/module/ModuleArea";
import type { ModuleDoor } from "@engine/module/ModuleDoor";

/**
 * Door like end_door10: facing −π/2 (normal N/S), transition line along Y
 * (plane normal E/W). Walking east crosses the doorway.
 */
function makeDoorwayAxisDoor(): ModuleDoor {
  const position = new THREE.Vector3(47.417, 120.126, 0);
  const transitionLine = new THREE.Line3(
    new THREE.Vector3(47.417, 125.126, 0),
    new THREE.Vector3(47.417, 115.126, 0)
  );
  const box = new THREE.Box3(
    new THREE.Vector3(47.295, 117.039, -1),
    new THREE.Vector3(47.54, 123.199, 2)
  );

  const door = {
    id: 74,
    position,
    facing: -Math.PI / 2,
    box,
    linkedToFlags: 2,
    transitionLine,
    generateTransitionLine() {
      this.transitionLine = transitionLine;
    },
    segmentCrossesTransitionPlane(
      fromX: number,
      fromY: number,
      toX: number,
      toY: number
    ) {
      if(!this.transitionLine) this.generateTransitionLine();
      const lx = this.transitionLine.end.x - this.transitionLine.start.x;
      const ly = this.transitionLine.end.y - this.transitionLine.start.y;
      const llen = Math.hypot(lx, ly);
      if(llen <= 0) return false;
      const nx = -ly / llen;
      const ny = lx / llen;
      const d0 =
        (fromX - this.position.x) * nx + (fromY - this.position.y) * ny;
      const d1 =
        (toX - this.position.x) * nx + (toY - this.position.y) * ny;
      return (d0 > 0) !== (d1 > 0);
    },
    getLinkedToModule: () => "end_m01ab",
    isOpen: () => true,
  } as unknown as ModuleDoor;

  return door;
}

describe("queryDoorCrossing transition-line plane", () => {
  it("detects east walkthrough when facing is N/S (Endar Spire-style)", () => {
    const door = makeDoorwayAxisDoor();
    const area = { doors: [door] } as unknown as ModuleArea;
    const from = new THREE.Vector3(46.92, 120.09, 0);
    const to = new THREE.Vector3(47.92, 120.09, 0);

    // Facing-based check would NOT flip (both sides same Dot with (0,-1)).
    const fx = Math.cos(door.facing);
    const fy = Math.sin(door.facing);
    const d0f =
      (from.x - door.position.x) * fx + (from.y - door.position.y) * fy;
    const d1f =
      (to.x - door.position.x) * fx + (to.y - door.position.y) * fy;
    expect((d0f > 0) === (d1f > 0)).toBe(true);

    const hit = queryDoorCrossing(area, from, to);
    expect(hit).toBeDefined();
    expect(hit!.door).toBe(door);
    expect(hit!.linkedOpen).toBe(true);
  });

  it("ignores motion parallel to the doorway (along the transition line)", () => {
    const door = makeDoorwayAxisDoor();
    const area = { doors: [door] } as unknown as ModuleArea;
    // Stay west of the plane; move north/south along the wall
    const from = new THREE.Vector3(46.92, 120.09, 0);
    const to = new THREE.Vector3(46.92, 121.09, 0);

    const hit = queryDoorCrossing(area, from, to);
    expect(hit).toBeUndefined();
  });

  it("returns linkedOpen false when door is closed", () => {
    const door = makeDoorwayAxisDoor();
    (door as { isOpen: () => boolean }).isOpen = () => false;
    const area = { doors: [door] } as unknown as ModuleArea;
    const from = new THREE.Vector3(46.92, 120.09, 0);
    const to = new THREE.Vector3(47.92, 120.09, 0);

    const hit = queryDoorCrossing(area, from, to);
    expect(hit).toBeDefined();
    expect(hit!.linkedOpen).toBe(false);
  });
});
