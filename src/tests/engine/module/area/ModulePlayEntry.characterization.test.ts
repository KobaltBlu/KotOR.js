/**
 * Characterizes phase three of area bootstrap. Area.load owns data attachment,
 * loadScene owns scene realization, and these hosts own playable-entry reveal.
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";

const RUNTIME_DIR = path.resolve(__dirname, "../../../../engine/runtime");
const PREVIEW_DIR = path.resolve(__dirname, "../../../../engine/preview");

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

describe("module playable-entry tail characterization", () => {
  test("ModulePlayEntrySequence owns spawn, ready, warm-up, and fade order", () => {
    const source = fs.readFileSync(
      path.join(RUNTIME_DIR, "ModulePlayEntrySequence.ts"),
      "utf8",
    );
    const run = extractMethod(source, "run");

    expectInOrder(run, [
      "const runSpawnScripts = !loadingSave",
      "await GameState.module.area.initAreaObjects(runSpawnScripts)",
      "GameState.module.readyToProcessEvents = true",
      "GameState.module.area.primePostLoadReveal()",
      "await ModuleLoadCoordinator.warmModuleGpuForArea()",
      "ModuleLoadCoordinator.applyPostLoadRevealFade()",
    ]);
  });

  test("runtime waits at the movie gate before the shared play-entry sequence", () => {
    const source = fs.readFileSync(
      path.join(RUNTIME_DIR, "ModuleLoadCoordinator.ts"),
      "utf8",
    );
    const loadModule = extractMethod(source, "LoadModule");

    expectInOrder(loadModule, [
      "module.initEventQueue()",
      "await module.initScripts()",
      "ModulePlayEntrySequence.run(",
      "movies: true",
      "fade: false",
      "ModuleLoadCoordinator.applyPostLoadRevealFade()",
    ]);
  });

  test("Forge preview uses explicit non-save spawn options and the shared reveal tail", () => {
    const source = fs.readFileSync(
      path.join(PREVIEW_DIR, "ForgePreviewHost.ts"),
      "utf8",
    );
    const loadModule = extractMethod(source, "LoadModuleFromArchives");

    expectInOrder(loadModule, [
      "module.initEventQueue()",
      "await module.initScripts()",
      "ModulePlayEntrySequence.run(",
      "isLoadingSave: false",
      "fade: true",
    ]);
  });
});
