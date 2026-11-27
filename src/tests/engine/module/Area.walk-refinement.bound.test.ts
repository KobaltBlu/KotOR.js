/**
 * Nearby corridor probes should bound AABB descent via sector + area caches.
 * @jest-environment node
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
import type { OdysseyFace3 } from "@engine/render/three/odyssey/OdysseyFace3";

describe("blocked movement refinement AABB descent bound", () => {
  it("repeated nearby corridor probes share one face-tree descent per frame", () => {
    const face = { walk: true } as OdysseyFace3;
    const getFacesInBox = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      out.push(face);
      return out;
    });
    const getEdgesInBox = jest.fn((_box: THREE.Box3, out: OdysseyFace3[] = []) => {
      out.length = 0;
      return out;
    });

    const room = {
      box: new THREE.Box3(new THREE.Vector3(-10, -10, -1), new THREE.Vector3(10, 10, 1)),
      collisionManager: {
        walkmesh: {
          faces: [face],
          box: new THREE.Box3(new THREE.Vector3(-10, -10, -1), new THREE.Vector3(10, 10, 1)),
          getFacesInBox,
          getEdgesInBox,
        },
      },
    };

    const area = Object.create(Area.prototype) as Area;
    area.rooms = [room] as any;
    area.frameWalkCandidateCache = new Map();
    (area as any)._walkCandidateFaceScratch = [];
    (area as any)._walkCandidateEdgeScratch = [];

    // Binary-search style refinement: identical geometric boxes (quantized key)
    // plus tiny cm-scale neighbors that still share the same 3-decimal key.
    const probes = [
      new THREE.Box3(new THREE.Vector3(0, 0, -0.5), new THREE.Vector3(1, 1, 0.5)),
      new THREE.Box3(new THREE.Vector3(0, 0, -0.5), new THREE.Vector3(1, 1, 0.5)),
      new THREE.Box3(new THREE.Vector3(0.0004, 0, -0.5), new THREE.Vector3(1.0004, 1, 0.5)),
    ];

    for(const box of probes){
      area.getWalkCandidatesForBox(box, {}, { edges: false });
      area.getWalkCandidatesForBox(box, {}, { edges: true, walkFacesOnly: true });
    }

    // Face-only then full on same quantized box: 1 face descent total.
    expect(getFacesInBox).toHaveBeenCalledTimes(1);
    expect(getEdgesInBox).toHaveBeenCalledTimes(1);
  });
});
