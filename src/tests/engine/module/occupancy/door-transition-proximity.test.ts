/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const transitionMenu = {
  setTransitionObject: jest.fn(),
  unsetTransitionObject: jest.fn(),
};
const gameState = {
  PartyManager: { party: [] as any[] },
  MenuManager: { InGameAreaTransition: transitionMenu },
};

jest.mock("@engine/runtime/GameState", () => ({ GameState: gameState }));

import { DoorTransitionProximity } from "@engine/module/occupancy/DoorTransitionProximity";

function makeDoor(transitionDistance: number, linkedOpen: boolean): any {
  return {
    position: new THREE.Vector3(),
    transitionDistance,
    testTransitionLine: jest.fn(),
    getLinkedToModule: jest.fn(() => linkedOpen ? "module" : ""),
    isOpen: jest.fn(() => linkedOpen),
    onEnter: jest.fn(),
    onExit: jest.fn(),
  };
}

describe("DoorTransitionProximity", () => {
  beforeEach(() => {
    transitionMenu.setTransitionObject.mockClear();
    transitionMenu.unsetTransitionObject.mockClear();
    gameState.PartyManager.party = [];
  });

  it("uses the 5m range for an open linked door", () => {
    const leader: any = { position: new THREE.Vector3(1, 0, 0) };
    const door = makeDoor(4.9, true);
    door.onEnter = jest.fn(() => { leader.lastDoorEntered = door; });
    gameState.PartyManager.party = [leader];

    DoorTransitionProximity.update(door);

    expect(door.onEnter).toHaveBeenCalledWith(leader);
    expect(transitionMenu.setTransitionObject).toHaveBeenCalledWith(door);
  });

  it("uses the strict 0.5m range for other doors", () => {
    const leader: any = { position: new THREE.Vector3(1, 0, 0) };
    const door = makeDoor(0.5, false);
    leader.lastDoorEntered = door;
    door.onExit = jest.fn(() => { leader.lastDoorEntered = undefined; });
    gameState.PartyManager.party = [leader];

    DoorTransitionProximity.update(door);

    expect(door.onEnter).not.toHaveBeenCalled();
    expect(door.onExit).toHaveBeenCalledWith(leader);
    expect(transitionMenu.setTransitionObject).not.toHaveBeenCalled();
  });

  it("checks only the party leader", () => {
    const follower = { position: new THREE.Vector3() };
    const door = makeDoor(0, true);
    gameState.PartyManager.party = [undefined, follower];

    DoorTransitionProximity.update(door);

    expect(door.testTransitionLine).not.toHaveBeenCalled();
  });
});
