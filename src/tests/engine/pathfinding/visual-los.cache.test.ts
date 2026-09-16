import * as THREE from "three";
import { hasVisualLos } from "@/engine/pathfinding/visual-los";

jest.mock("@/GameState", () => ({
  GameState: {
    raycaster: new THREE.Raycaster(),
  },
}));

describe("hasVisualLos spatial filtering and memo", () => {
  it("raycasts only candidate faces and memoizes the result for the frame", () => {
    const candidateFace = { materialIndex: 0 };
    const getFacesInBox = jest.fn(() => [candidateFace]);
    const raycast = jest.fn(() => []);
    const area = {
      doors: [],
      placeables: [],
      frameLosCache: new Map<string, boolean>(),
      rooms: [
        {
          collisionManager: {
            walkmesh: {
              aabbNodes: [{}],
              faces: [{ materialIndex: 0 }, { materialIndex: 1 }],
              getFacesInBox,
              raycast,
            },
          },
        },
      ],
    } as any;

    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);

    expect(hasVisualLos(area, from, to, { eyeHeight: 1, ignoreSource: { id: 1 } as any })).toBe(true);
    expect(hasVisualLos(area, from, to, { eyeHeight: 1, ignoreSource: { id: 1 } as any })).toBe(true);

    expect(getFacesInBox).toHaveBeenCalledTimes(1);
    expect(raycast).toHaveBeenCalledTimes(1);
    expect(raycast.mock.calls[0][1]).toEqual([candidateFace]);
  });

  it("does not reuse memoized results after the frame cache is cleared", () => {
    const raycast = jest.fn(() => []);
    const area = {
      doors: [],
      placeables: [],
      frameLosCache: new Map<string, boolean>(),
      rooms: [
        {
          collisionManager: {
            walkmesh: {
              aabbNodes: [{}],
              faces: [{}],
              getFacesInBox: jest.fn(() => [{}]),
              raycast,
            },
          },
        },
      ],
    } as any;

    hasVisualLos(area, new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0), { eyeHeight: 1 });
    area.frameLosCache.clear();
    hasVisualLos(area, new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0), { eyeHeight: 1 });

    expect(raycast).toHaveBeenCalledTimes(2);
  });
});
