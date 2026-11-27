/**
 * Module folder layout regression: facades stay at `src/engine/module` root;
 * companions and helpers live in domain folders (area/, minigame/, …).
 *
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";

const MODULE_ROOT = path.resolve(__dirname, "../../../engine/module");

/** Flat filenames that must not remain at module root after domain extraction. */
const FORBIDDEN_ROOT_FILES = [
  // Minigame companions (MiniGame*.ts)
  "MiniGame.ts",
  "MiniGameEnemy.ts",
  "MiniGameGunBank.ts",
  "MiniGameGunBullet.ts",
  "MiniGameObstacle.ts",
  "MiniGamePlayer.ts",
  "MiniGameTrack.ts",
  "MiniGameObjectArray.ts",
  // Area companions
  "AreaCamera.ts",
  "AreaMap.ts",
  "AreaPath.ts",
  "AreaRoom.ts",
  "AreaWeather.ts",
  // Encounter companions
  "EncounterSpawnEntry.ts",
  "EncounterSpawnPointEntry.ts",
  "EncounterCreatureEntry.ts",
  // Creature helpers
  "CorpseCache.ts",
  "applyHeadTrackingToHturn.ts",
  // Door helpers
  "door-onopen-diagnostics.ts",
] as const;

const REQUIRED_DOMAIN_FOLDERS = [
  "area",
  "minigame",
  "encounter",
  "creature",
  "door",
  "gameobject",
  "occupancy",
  "serialization",
  "guards",
] as const;

const REQUIRED_ROOT_FACADES = [
  "Area.ts",
  "GameObject.ts",
  "Creature.ts",
  "Door.ts",
  "Encounter.ts",
  "Module.ts",
  "AreaEffect.ts",
] as const;

/** Creature domain services extracted under creature/. */
const REQUIRED_CREATURE_SERVICES = [
  "CreaturePerceptionService.ts",
  "CreatureStatsService.ts",
  "CreatureCombatService.ts",
  "CreatureDeathCorpseService.ts",
  "CreatureAnimationService.ts",
  "CreatureModelService.ts",
  "CreatureEquipmentService.ts",
] as const;

/** GameObject domain services extracted under gameobject/. */
const REQUIRED_GAMEOBJECT_SERVICES = [
  "GameObjectActionService.ts",
  "GameObjectInventoryService.ts",
  "GameObjectTrapService.ts",
  "GameObjectEffectService.ts",
  "GameObjectPresentationService.ts",
  "GameObjectDestructionService.ts",
  "GameObjectPerceptionService.ts",
  "GameObjectScriptService.ts",
  "GameObjectHydrationService.ts",
] as const;

function listRootTsFiles(): string[] {
  return fs.readdirSync(MODULE_ROOT).filter((name) => {
    if(!name.endsWith(".ts")) return false;
    return fs.statSync(path.join(MODULE_ROOT, name)).isFile();
  });
}

function expectDomainFiles(folder: string, files: readonly string[]) {
  for(const name of files){
    const file = path.join(MODULE_ROOT, folder, name);
    expect(fs.existsSync(file) && fs.statSync(file).isFile()).toBe(true);
  }
}

describe("module folder structure", () => {
  test("module root does not contain extracted companion / helper flat files", () => {
    const rootFiles = new Set(listRootTsFiles());
    const offenders = FORBIDDEN_ROOT_FILES.filter((name) => rootFiles.has(name));
    expect(offenders).toEqual([]);

    // Also reject any other MiniGame*.ts left at root.
    const miniGameAtRoot = [...rootFiles].filter((name) => /^MiniGame.+\.ts$/.test(name) || name === "MiniGame.ts");
    expect(miniGameAtRoot).toEqual([]);
  });

  test("required domain folders exist", () => {
    for(const folder of REQUIRED_DOMAIN_FOLDERS){
      const dir = path.join(MODULE_ROOT, folder);
      expect(fs.existsSync(dir) && fs.statSync(dir).isDirectory()).toBe(true);
    }
  });

  test("primary facades remain at module root", () => {
    for(const facade of REQUIRED_ROOT_FACADES){
      const file = path.join(MODULE_ROOT, facade);
      expect(fs.existsSync(file) && fs.statSync(file).isFile()).toBe(true);
    }
  });

  test("creature services live under creature/ while Creature facade stays at root", () => {
    expectDomainFiles("creature", REQUIRED_CREATURE_SERVICES);
    const rootFiles = new Set(listRootTsFiles());
    for(const name of REQUIRED_CREATURE_SERVICES){
      expect(rootFiles.has(name)).toBe(false);
    }
    expect(rootFiles.has("Creature.ts")).toBe(true);
  });

  test("gameobject services live under gameobject/ while GameObject facade stays at root", () => {
    expectDomainFiles("gameobject", REQUIRED_GAMEOBJECT_SERVICES);
    const rootFiles = new Set(listRootTsFiles());
    for(const name of REQUIRED_GAMEOBJECT_SERVICES){
      expect(rootFiles.has(name)).toBe(false);
    }
    expect(rootFiles.has("GameObject.ts")).toBe(true);
  });
});
