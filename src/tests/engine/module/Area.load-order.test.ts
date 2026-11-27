import { describe, expect, test, jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));
jest.mock("@engine/render/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@engine/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@engine/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@engine/render/FollowerCamera", () => ({ FollowerCamera: {} }));

import {
  ODYSSEY_INIT_AREA_OBJECT_ORDER,
  ODYSSEY_LOAD_GIT_OBJECT_ORDER,
  ODYSSEY_LOAD_SCENE_OBJECT_ORDER,
} from "@engine/module/Area";

const AREA_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../../engine/module/Area.ts"),
  "utf8",
);

const AREA_DATA_BOOTSTRAP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../../engine/module/area/AreaDataBootstrap.ts"),
  "utf8",
);

const AREA_GIT_DESERIALIZER_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../../engine/module/area/AreaGitDeserializer.ts"),
  "utf8",
);

const AREA_RESOURCE_BOOTSTRAP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../../engine/module/area/AreaResourceBootstrap.ts"),
  "utf8",
);

const AREA_SCENE_BOOTSTRAP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../../engine/module/area/AreaSceneBootstrap.ts"),
  "utf8",
);

function extractMethod(source: string, name: string): string {
  const signature = new RegExp(`(?:async\\s+)?${name}\\s*\\([^)]*\\)\\s*(?::\\s*[^\\{]+)?\\{`);
  const match = signature.exec(source);
  if(!match){
    throw new Error(`Method ${name} was not found`);
  }

  const start = match.index + match[0].length - 1;
  let depth = 0;
  for(let index = start; index < source.length; index++){
    if(source[index] === "{") depth++;
    if(source[index] === "}"){
      depth--;
      if(depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Method ${name} has no closing brace`);
}

function expectInOrder(source: string, tokens: readonly string[]): void {
  let previous = -1;
  for(const token of tokens){
    const index = source.indexOf(token, previous + 1);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
}

/**
 * The bootstrap boundary has three phases:
 * 1. Area.load attaches ARE/GIT data to runtime objects.
 * 2. Area.loadScene realizes rooms and object assets, then repairs scene state.
 * 3. Module entry initializes scripts/spawns and reveals the playable area.
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

  test("Area.load delegates data attachment through AreaDataBootstrap", () => {
    const load = extractMethod(AREA_SOURCE, "load");
    expect(load).toContain("AreaDataBootstrap.load(this)");

    expectInOrder(AREA_DATA_BOOTSTRAP_SOURCE, [
      "AreaAreBootstrap.hydrate(",
      "AreaGitDeserializer.deserialize(",
      "AreaResourceBootstrap.bootstrap(",
    ]);
  });

  test("Area.load attaches GIT object types in the declared bootstrap order", () => {
    expectInOrder(AREA_GIT_DESERIALIZER_SOURCE, [
      "new Creature(",
      "new Item(",
      "new Door(",
      "new Trigger(",
      "new Encounter(",
      "new Waypoint(",
      "new Sound(",
      "new Placeable(",
      "new Store(",
      "new AreaEffect(",
      "setAreaAudioProperties(",
      "AreaMapSerializer.deserialize(",
      "new AreaCamera(",
    ]);
  });

  test("resource bootstrap preserves post-GIT VIS/LYT/script/fog order", () => {
    expectInOrder(AREA_RESOURCE_BOOTSTRAP_SOURCE, [
      "setAlphaTest(",
      "setDesiredEnvironment(",
      "applyDesiredEnvironment(",
      "setCameraStyle(",
      "await this.loadVis(",
      "await this.loadLayout(",
      "await this.loadScripts(",
      "setSceneFog(",
    ]);
  });

  test("Area.loadScene delegates scene realization through AreaSceneBootstrap", () => {
    const loadScene = extractMethod(AREA_SOURCE, "loadScene");
    expect(loadScene).toContain("AreaSceneBootstrap.run(this)");

    expectInOrder(AREA_SCENE_BOOTSTRAP_SOURCE, [
      "await AreaObjectSceneLoader.loadRooms(area, context)",
      "await AreaObjectSceneLoader.loadCreatures(area, context)",
      "await AreaPartyBootstrap.loadPlayer(area, context)",
      "await AreaPartyBootstrap.loadParty(area, context)",
      "await AreaObjectSceneLoader.loadItems(area, context)",
      "await AreaObjectSceneLoader.loadDoors(area, context)",
      "await AreaObjectSceneLoader.loadTriggers(area, context)",
      "await AreaObjectSceneLoader.loadEncounters(area, context)",
      "await AreaObjectSceneLoader.loadWaypoints(area, context)",
      "await AreaObjectSceneLoader.loadsounds(area)",
      "await AreaObjectSceneLoader.loadPlaceables(area, context)",
      "await AreaObjectSceneLoader.loadStores(area)",
      "await AreaObjectSceneLoader.loadAreaEffects(area, context)",
      "await AreaObjectSceneLoader.loadCameras(area, context)",
      "await area.loadPath()",
      "await area.miniGame.load()",
      "await area.loadAreaMusic()",
      "await area.weather.load()",
      "area.cleanupUninitializedObjects()",
      "area.detectRoomObjects()",
      "increaseAILevelPriority(aiObjects)",
      "setAILevel(pm, AILevel.VERY_HIGH)",
    ]);
  });
});
