/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/GameState", () => ({ GameState: {} }));
jest.mock("@/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@/engine/FollowerCamera", () => ({ FollowerCamera: {} }));

import { ModuleArea } from "@/module/ModuleArea";
import type { OdysseyFace3 } from "@/three/odyssey/OdysseyFace3";
import type { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";

describe("ModuleArea.getWalkCandidatesForBox spatial filtering and memo", () => {
  function makeArea(rooms: any[]): ModuleArea {
    const area = Object.create(ModuleArea.prototype) as ModuleArea;
    area.rooms = rooms as any;
    area.frameWalkCandidateCache = new Map();
    (area as any)._walkCandidateFaceScratch = [];
    (area as any)._walkCandidateEdgeScratch = [];
    return area;
  }

  it("culls non-overlapping rooms and memoizes the result for the frame", () => {
    const nearFace = { walk: true } as OdysseyFace3;
    const nearEdge = { index: 1 } as WalkmeshEdge;
    const getFacesNear = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      out.push(nearFace);
      return out;
    });
    const getEdgesNear = jest.fn((_box: THREE.Box3, out: WalkmeshEdge[] = []) => {
      out.length = 0;
      out.push(nearEdge);
      return out;
    });
    const getFacesFar = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      return out;
    });
    const getEdgesFar = jest.fn((_box: THREE.Box3, out: WalkmeshEdge[] = []) => {
      out.length = 0;
      return out;
    });

    const nearRoom = {
      box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
      collisionManager: {
        walkmesh: {
          faces: [nearFace],
          box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
          getFacesInBox: getFacesNear,
          getEdgesInBox: getEdgesNear,
        },
      },
    };
    const farRoom = {
      box: new THREE.Box3(new THREE.Vector3(50, -1, -1), new THREE.Vector3(52, 1, 1)),
      collisionManager: {
        walkmesh: {
          faces: [{}],
          box: new THREE.Box3(new THREE.Vector3(50, -1, -1), new THREE.Vector3(52, 1, 1)),
          getFacesInBox: getFacesFar,
          getEdgesInBox: getEdgesFar,
        },
      },
    };

    const area = makeArea([nearRoom, farRoom]);
    const query = new THREE.Box3(
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );

    const first = area.getWalkCandidatesForBox(query);
    expect(first.faces).toEqual([nearFace]);
    expect(first.edges).toEqual([nearEdge]);
    expect(first.rooms).toEqual([nearRoom]);
    expect(getFacesNear).toHaveBeenCalledTimes(1);
    expect(getEdgesNear).toHaveBeenCalledTimes(1);
    expect(getFacesFar).not.toHaveBeenCalled();
    expect(getEdgesFar).not.toHaveBeenCalled();

    const second = area.getWalkCandidatesForBox(query);
    expect(second.faces).toEqual([nearFace]);
    expect(second.edges).toEqual([nearEdge]);
    expect(getFacesNear).toHaveBeenCalledTimes(1);
    expect(getEdgesNear).toHaveBeenCalledTimes(1);
  });

  it("does not reuse memoized results after the frame cache is cleared", () => {
    const face = { walk: true } as OdysseyFace3;
    const getFacesInBox = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      out.push(face);
      return out;
    });
    const getEdgesInBox = jest.fn((_box: THREE.Box3, out: WalkmeshEdge[] = []) => {
      out.length = 0;
      return out;
    });

    const room = {
      box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
      collisionManager: {
        walkmesh: {
          faces: [face],
          box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
          getFacesInBox,
          getEdgesInBox,
        },
      },
    };
    const area = makeArea([room]);
    const query = new THREE.Box3(
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );

    area.getWalkCandidatesForBox(query);
    area.frameWalkCandidateCache.clear();
    area.getWalkCandidatesForBox(query);

    expect(getFacesInBox).toHaveBeenCalledTimes(2);
    expect(getEdgesInBox).toHaveBeenCalledTimes(2);
  });

  it("culls with wok.box when VIS room.box misses the walkable strip", () => {
    // Live m02ac_02b: room.box.min.y=78.75 but wok.box.min.y=75 — player at y=78.24.
    const face = { walk: true } as OdysseyFace3;
    const getFacesInBox = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      out.push(face);
      return out;
    });
    const getEdgesInBox = jest.fn((_box: THREE.Box3, out: WalkmeshEdge[] = []) => {
      out.length = 0;
      return out;
    });

    const room = {
      box: new THREE.Box3(
        new THREE.Vector3(50, 78.75, -1),
        new THREE.Vector3(110, 129, 9)
      ),
      collisionManager: {
        walkmesh: {
          faces: [face],
          box: new THREE.Box3(
            new THREE.Vector3(50, 75, 0),
            new THREE.Vector3(110, 129.5, 3)
          ),
          getFacesInBox,
          getEdgesInBox,
        },
      },
    };
    const area = makeArea([room]);
    // Query around feet in the strip outside room.box but inside wok.box
    const query = new THREE.Box3(
      new THREE.Vector3(91.5, 77.4, -0.5),
      new THREE.Vector3(92.6, 78.7, 0.5)
    );

    const result = area.getWalkCandidatesForBox(query);
    expect(getFacesInBox).toHaveBeenCalledTimes(1);
    expect(result.faces).toEqual([face]);
    expect(result.rooms).toEqual([room]);
  });

  it("face-only then full query shares face descent and lazily fills edges", () => {
    const walkFace = { walk: true } as OdysseyFace3;
    const blockFace = { walk: false } as OdysseyFace3;
    const edge = { index: 1 } as WalkmeshEdge;
    const getFacesInBox = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      out.push(walkFace, blockFace);
      return out;
    });
    const getEdgesInBox = jest.fn((_box: THREE.Box3, out: WalkmeshEdge[] = []) => {
      out.length = 0;
      out.push(edge);
      return out;
    });

    const room = {
      box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
      collisionManager: {
        walkmesh: {
          faces: [walkFace, blockFace],
          box: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
          getFacesInBox,
          getEdgesInBox,
        },
      },
    };
    const area = makeArea([room]);
    const query = new THREE.Box3(
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );

    const faceOnly = area.getWalkCandidatesForBox(query, {}, { edges: false, walkFacesOnly: false });
    expect(faceOnly.faces).toEqual([walkFace, blockFace]);
    expect(faceOnly.edges).toEqual([]);
    expect(getFacesInBox).toHaveBeenCalledTimes(1);
    expect(getEdgesInBox).not.toHaveBeenCalled();

    // Same geometric box — reuse raw faces; fetch edges once.
    const full = area.getWalkCandidatesForBox(query);
    expect(full.faces).toEqual([walkFace]);
    expect(full.edges).toEqual([edge]);
    expect(getFacesInBox).toHaveBeenCalledTimes(1);
    expect(getEdgesInBox).toHaveBeenCalledTimes(1);

    // Warm hits — no extra wok descent.
    area.getWalkCandidatesForBox(query, {}, { edges: false, walkFacesOnly: false });
    area.getWalkCandidatesForBox(query);
    expect(getFacesInBox).toHaveBeenCalledTimes(1);
    expect(getEdgesInBox).toHaveBeenCalledTimes(1);
  });
});
