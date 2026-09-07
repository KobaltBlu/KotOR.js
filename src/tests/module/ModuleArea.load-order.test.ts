import { describe, expect, test, jest } from "@jest/globals";

jest.mock("@/GameState", () => ({ GameState: {} }));
jest.mock("@/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@/engine/FollowerCamera", () => ({ FollowerCamera: {} }));

import {
  ODYSSEY_INIT_AREA_OBJECT_ORDER,
  ODYSSEY_LOAD_GIT_OBJECT_ORDER,
  ODYSSEY_LOAD_SCENE_OBJECT_ORDER,
} from "@/module/ModuleArea";

/**
 * Guardrails for ModuleArea load/loadScene/initAreaObjects order.
 * Implementation comments reference GIT load / LoadArea.
 */
describe("area load order (engine GIT load)", () => {
  test("GIT object sequence matches GIT load", () => {
    expect([...ODYSSEY_LOAD_GIT_OBJECT_ORDER]).toEqual([
      "creatures",
      "items",
      "doors",
      "triggers",
      "encounters",
      "waypoints",
      "sounds",
      "placeables",
      "stores",
      "areaEffects",
      "properties",
      "maps",
      "cameras",
    ]);
  });

  test("scene object sequence keeps player/party beside creatures then GIT order", () => {
    expect([...ODYSSEY_LOAD_SCENE_OBJECT_ORDER]).toEqual([
      "creatures",
      "player",
      "party",
      "items",
      "doors",
      "triggers",
      "encounters",
      "waypoints",
      "sounds",
      "placeables",
      "stores",
      "areaEffects",
      "cameras",
    ]);
  });

  test("initAreaObjects sequence matches GIT types then party", () => {
    expect([...ODYSSEY_INIT_AREA_OBJECT_ORDER]).toEqual([
      "creatures",
      "items",
      "doors",
      "triggers",
      "encounters",
      "waypoints",
      "sounds",
      "placeables",
      "stores",
      "areaEffects",
      "party",
    ]);
  });

  test("doors precede placeables and cameras are last among GIT lists", () => {
    const git = ODYSSEY_LOAD_GIT_OBJECT_ORDER;
    expect(git.indexOf("doors")).toBeLessThan(git.indexOf("placeables"));
    expect(git.indexOf("cameras")).toBe(git.length - 1);
    expect(git.indexOf("creatures")).toBe(0);
  });

  test("scene order places cameras after placeables", () => {
    const scene = ODYSSEY_LOAD_SCENE_OBJECT_ORDER;
    expect(scene.indexOf("doors")).toBeLessThan(scene.indexOf("placeables"));
    expect(scene.indexOf("cameras")).toBe(scene.length - 1);
  });
});
