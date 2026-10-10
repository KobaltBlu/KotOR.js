/**
 * Characterizes phase three of area bootstrap: after Area.load attaches data
 * and loadScene realizes assets, initAreaObjects performs spawn/start scripts.
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";

const AREA_DIR = path.resolve(__dirname, "../../../../engine/module/area");
const AREA_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../../../engine/module/Area.ts"),
  "utf8",
);
const INIT_PIPELINE_SOURCE = fs.readFileSync(
  path.join(AREA_DIR, "AreaInitPipeline.ts"),
  "utf8",
);

function extractMethod(source: string, name: string): string {
  const signature = new RegExp(
    `(?:^|\\n)[ \\t]*(?:static[ \\t]+)?(?:async[ \\t]+)?${name}[ \\t]*\\(`,
  );
  const match = signature.exec(source);
  if(!match){
    throw new Error(`Method ${name} was not found`);
  }

  let index = match.index + match[0].length - 1; // '('
  let parenDepth = 0;
  for(; index < source.length; index++){
    if(source[index] === "(") parenDepth++;
    if(source[index] === ")"){
      parenDepth--;
      if(parenDepth === 0){
        index++;
        break;
      }
    }
  }
  while(index < source.length && source[index] !== "{") index++;
  if(index >= source.length || source[index] !== "{"){
    throw new Error(`Method ${name} has no opening brace`);
  }

  const start = index;
  let depth = 0;
  for(; index < source.length; index++){
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

describe("Area init pipeline characterization", () => {
  const initAreaObjects = extractMethod(INIT_PIPELINE_SOURCE, "initAreaObjects");

  test("Area.initAreaObjects delegates to AreaInitPipeline", () => {
    const wrapper = extractMethod(AREA_SOURCE, "initAreaObjects");
    expect(wrapper).toContain("AreaInitPipeline.initAreaObjects(this, runSpawnScripts)");
  });

  test.each([
    ["creatures", "runSpawnScripts"],
    ["items", "false"],
    ["doors", "runSpawnScripts"],
    ["triggers", "runSpawnScripts"],
    ["encounters", "false"],
    ["waypoints", "runSpawnScripts"],
    ["sounds", "false"],
    ["placeables", "runSpawnScripts"],
    ["stores", "false"],
    ["areaOfEffects", "false"],
  ])("%s use onSpawn(%s)", (collection, argument) => {
    const loopStart = initAreaObjects.indexOf(`area.${collection}.length`);
    expect(loopStart).toBeGreaterThan(-1);

    const nextLoop = initAreaObjects.indexOf("for(let i = 0;", loopStart + 1);
    const loop = initAreaObjects.slice(
      loopStart,
      nextLoop === -1 ? initAreaObjects.length : nextLoop,
    );
    expect(loop).toContain(`.onSpawn(${argument})`);
  });

  test("party receives the explicit second spawn pass after area creatures", () => {
    expectInOrder(initAreaObjects, [
      "area.creatures.length",
      "area.creatures[i].onSpawn(runSpawnScripts)",
      "party.length",
      "party[i].onSpawn(runSpawnScripts)",
    ]);
  });

  test("minigame object initialization precedes area start scripts", () => {
    expectInOrder(initAreaObjects, [
      "area.miniGame.initMiniGameObjects()",
      "this.runStartScripts(area)",
    ]);
  });

  test("start scripts run minigame scripts before area OnEnter", () => {
    const runStartScripts = extractMethod(INIT_PIPELINE_SOURCE, "runStartScripts");
    expectInOrder(runStartScripts, [
      "area.miniGame.runMiniGameScripts()",
      "area.runOnEnterScripts()",
    ]);
  });
});
