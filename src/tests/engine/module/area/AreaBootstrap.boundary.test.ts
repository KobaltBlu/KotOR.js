/**
 * Source-boundary regression: area bootstrap, gameobject services, occupancy,
 * and serialization must not import the GameState facade directly.
 *
 * Allowlist (documented debt / adapter seams):
 * - AreaLoadContext.ts — sole GameState adapter for area load (getDefaultAreaLoadContext)
 * - ModulePlayEntrySequence.ts — playable-entry host still drives module/area via GameState
 *
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";

const ENGINE_MODULE = path.resolve(__dirname, "../../../../engine/module");
const AREA_DIR = path.join(ENGINE_MODULE, "area");
const GAMEOBJECT_DIR = path.join(ENGINE_MODULE, "gameobject");
const OCCUPANCY_DIR = path.join(ENGINE_MODULE, "occupancy");
const SERIALIZATION_DIR = path.join(ENGINE_MODULE, "serialization");
const RUNTIME_DIR = path.resolve(__dirname, "../../../../engine/runtime");

const GAMESTATE_IMPORT =
  /from\s+['"]@engine\/runtime\/GameState['"]/;

/** Area bootstrap services that must stay free of direct GameState imports. */
const AREA_BOOTSTRAP_FILES = [
  "AreaAreBootstrap.ts",
  "AreaGitDeserializer.ts",
  "AreaResourceBootstrap.ts",
  "AreaDataBootstrap.ts",
  "AreaSceneBootstrap.ts",
  "AreaObjectSceneLoader.ts",
  "AreaPartyBootstrap.ts",
  "AreaInitPipeline.ts",
  "AreaPostLoadRevealService.ts",
] as const;

/**
 * Files under area/ allowed to import GameState.
 * AreaLoadContext is the strangler adapter; keep this list minimal.
 */
const AREA_GAMESTATE_ALLOWLIST = new Set([
  "AreaLoadContext.ts",
]);

/**
 * Module play-entry remains on GameState for host compatibility
 * (module.area, isLoadingSave). Prefer options.isLoadingSave when callers can supply it.
 */
const MODULE_PLAY_ENTRY_ALLOWLIST = new Set([
  "ModulePlayEntrySequence.ts",
]);

function listTsFiles(dir: string): string[] {
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((file) => file.endsWith(".ts"));
}

function filesImportingGameState(dir: string, files: string[]): string[] {
  return files.filter((file) => {
    const src = fs.readFileSync(path.join(dir, file), "utf8");
    return GAMESTATE_IMPORT.test(src);
  });
}

describe("Area bootstrap / module GameState source boundaries", () => {
  test("area bootstrap services do not import GameState (adapter allowlisted)", () => {
    // Companions (AreaCamera/Map/Path/Room/Weather) may use GameState; only
    // bootstrap services under area/ are held to the no-facade rule.
    const offenders = filesImportingGameState(AREA_DIR, [...AREA_BOOTSTRAP_FILES])
      .filter((file) => !AREA_GAMESTATE_ALLOWLIST.has(file));

    expect(offenders).toEqual([]);

    for(const file of AREA_BOOTSTRAP_FILES){
      const src = fs.readFileSync(path.join(AREA_DIR, file), "utf8");
      expect(src).not.toMatch(GAMESTATE_IMPORT);
    }

    // Adapter may import GameState; document that only this file is allowlisted.
    const adapter = fs.readFileSync(path.join(AREA_DIR, "AreaLoadContext.ts"), "utf8");
    expect(adapter).toMatch(GAMESTATE_IMPORT);
    expect(adapter).toContain("getDefaultAreaLoadContext");
    expect(AREA_GAMESTATE_ALLOWLIST.has("AreaLoadContext.ts")).toBe(true);
  });

  test("gameobject services do not import GameState", () => {
    const offenders = filesImportingGameState(GAMEOBJECT_DIR, listTsFiles(GAMEOBJECT_DIR));
    expect(offenders).toEqual([]);
  });

  test("occupancy package does not import GameState", () => {
    // DoorTransitionProximity uses GameObjectRuntimeContext only (no GameState import).
    const offenders = filesImportingGameState(OCCUPANCY_DIR, listTsFiles(OCCUPANCY_DIR));
    expect(offenders).toEqual([]);
  });

  test("serialization package does not import GameState", () => {
    const offenders = filesImportingGameState(
      SERIALIZATION_DIR,
      listTsFiles(SERIALIZATION_DIR),
    );
    expect(offenders).toEqual([]);
  });

  test("ModulePlayEntrySequence GameState import is allowlisted for host compatibility", () => {
    const file = "ModulePlayEntrySequence.ts";
    const src = fs.readFileSync(path.join(RUNTIME_DIR, file), "utf8");
    expect(MODULE_PLAY_ENTRY_ALLOWLIST.has(file)).toBe(true);
    expect(src).toMatch(GAMESTATE_IMPORT);
    // Prefer injected isLoadingSave when hosts can supply it.
    expect(src).toContain("options.isLoadingSave");
  });
});
