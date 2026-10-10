/**
 * @jest-environment node
 *
 * isStaticWalkClearOnAreaMesh uses getWalkCandidatesForBox (edges:false,
 * walkFacesOnly:false) so a warm frame cache avoids re-entering wok AABB trees.
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));
jest.mock("@engine/render/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@engine/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@engine/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@engine/render/FollowerCamera", () => ({ FollowerCamera: {} }));

import { Area } from "@engine/module/Area";
import { isStaticWalkClearOnAreaMesh } from "@engine/pathfinding/static-walk-blockers-mesh";
import type { OdysseyFace3 } from "@engine/render/three/odyssey/OdysseyFace3";

describe("isStaticWalkClearOnAreaMesh walk candidate reuse", () => {
  function makeArea(rooms: any[]): Area {
    const area = Object.create(Area.prototype) as Area;
    area.rooms = rooms as any;
    area.placeables = [] as any;
    area.frameWalkCandidateCache = new Map();
    (area as any)._walkCandidateFaceScratch = [];
    (area as any)._walkCandidateEdgeScratch = [];
    return area;
  }

  it("second corridor test reuses frame cache without re-querying wok faces", () => {
    // Non-walk walk-check blocker far from corridor — clear path, but still queried.
    const blockFace = {
      walk: false,
      surfacemat: { walkCheck: true, walk: false },
      a: new THREE.Vector3(100, 100, 0),
      b: new THREE.Vector3(101, 100, 0),
      c: new THREE.Vector3(100, 101, 0),
      triangle: {
        a: new THREE.Vector3(100, 100, 0),
        b: new THREE.Vector3(101, 100, 0),
        c: new THREE.Vector3(100, 101, 0),
      },
    } as unknown as OdysseyFace3;

    const getFacesInBox = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      out.push(blockFace);
      return out;
    });
    const getEdgesInBox = jest.fn((_box: THREE.Box3, out: any[] = []) => {
      out.length = 0;
      return out;
    });

    const room = {
      box: new THREE.Box3(new THREE.Vector3(-5, -5, -1), new THREE.Vector3(5, 5, 1)),
      collisionManager: {
        walkmesh: {
          faces: [blockFace],
          box: new THREE.Box3(new THREE.Vector3(-5, -5, -1), new THREE.Vector3(5, 5, 1)),
          getFacesInBox,
          getEdgesInBox,
        },
      },
    };
    const area = makeArea([room]);

    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(0.2, 0, 0);

    const first = isStaticWalkClearOnAreaMesh(area, from, to, { personalSpace: 0.5 });
    expect(first.clear).toBe(true);
    expect(getFacesInBox).toHaveBeenCalledTimes(1);
    expect(getEdgesInBox).not.toHaveBeenCalled();

    const second = isStaticWalkClearOnAreaMesh(area, from, to, { personalSpace: 0.5 });
    expect(second.clear).toBe(true);
    expect(getFacesInBox).toHaveBeenCalledTimes(1);
  });
});
