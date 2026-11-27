/**
 * A move whose plot fails on a door that is already being opened waits for it
 * (end_m01aa: AssignCommand(end_door01, ActionOpenDoor) then ActionMoveToObject
 * — Trask must walk in once the door opens, not give up and talk through it).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { ActionType } from "@core/enums/actions/ActionType";
import { ModuleDoorOpenState } from "@core/enums/module/ModuleDoorOpenState";
import { findOpeningDoorOnLine, isDoorAboutToOpen } from "@engine/pathfinding/door-opening";

function door(opts: {
  open?: boolean;
  also?: ModuleDoorOpenState;
  queued?: boolean;
  x?: number;
  y?: number;
} = {}): any {
  const self: any = {
    position: new THREE.Vector3(opts.x ?? 21.12, opts.y ?? 20.71, 0),
    alsoOpenState: opts.also ?? ModuleDoorOpenState.CLOSED,
    isOpen: () => !!opts.open,
    actionQueue: [] as any[],
  };
  if(opts.queued){
    self.actionQueue.push({ type: ActionType.ActionOpenDoor, getParameter: () => self });
  }
  return self;
}

const from = new THREE.Vector3(22.88, 20.61, 0);
const to = new THREE.Vector3(15.42, 20.12, 0);

describe("door-opening", () => {
  it("a closed door with its own open queued is about to open", () => {
    expect(isDoorAboutToOpen(door({ queued: true }))).toBe(true);
  });

  it("a door mid-open animation is about to open", () => {
    expect(isDoorAboutToOpen(door({ also: ModuleDoorOpenState.OPEN2 }))).toBe(true);
  });

  it("a closed idle door, or an open one, is not", () => {
    expect(isDoorAboutToOpen(door())).toBe(false);
    expect(isDoorAboutToOpen(door({ open: true, queued: true }))).toBe(false);
  });

  it("finds an opening door on the walk line", () => {
    const d = door({ queued: true });
    expect(findOpeningDoorOnLine({ doors: [d] } as any, from, to)).toBe(d);
  });

  it("ignores an opening door well off the walk line", () => {
    const d = door({ queued: true, x: 46.57, y: 50.81 });
    expect(findOpeningDoorOnLine({ doors: [d] } as any, from, to)).toBeUndefined();
  });

  it("ignores a closed door nobody is opening", () => {
    expect(findOpeningDoorOnLine({ doors: [door()] } as any, from, to)).toBeUndefined();
  });
});
