/**
 * Level-load T-pose: loadModel must prime pose under EngineMode.LOADING.
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import { srcPath } from "@/tests/helpers/paths";

describe("Creature.primeAnimationPose", () => {
  it("defines primeAnimationPose and loadModel calls it before return", () => {
    const src = fs.readFileSync(
      srcPath("engine", "module", "Creature.ts"),
      "utf8"
    );
    expect(src).toMatch(/primeAnimationPose\s*\(/);
    const loadStart = src.indexOf("  async loadModel (): Promise<OdysseyModel3D> {");
    expect(loadStart).toBeGreaterThan(-1);
    const loadEnd = src.indexOf("private detachEquippedModelsFromBody", loadStart);
    const loadFn = src.slice(loadStart, loadEnd > loadStart ? loadEnd : loadStart + 2000);
    expect(loadFn).toMatch(/this\.primeAnimationPose\s*\(\s*\)/);
    expect(loadFn).toMatch(/this\.model\.visible\s*=\s*false/);
    expect(loadFn).toMatch(/this\.model\.visible\s*=\s*true/);
  });

  it("primeAnimationPose drives updateAnimationState + model.update without Mode gate", () => {
    const src = fs.readFileSync(
      srcPath("engine", "module", "Creature.ts"),
      "utf8"
    );
    const start = src.indexOf("  primeAnimationPose(){");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start, start + 900);
    expect(fn).toMatch(/this\.updateAnimationState\s*\(/);
    expect(fn).toMatch(/this\.model\.update\s*\(/);
    expect(fn).not.toMatch(/EngineMode/);
  });
});

describe("Area loadPlayer / loadParty T-pose guards", () => {
  it("loadPlayer parents party container after loadModel", () => {
    const src = fs.readFileSync(
      srcPath("engine", "module", "Area.ts"),
      "utf8"
    );
    const start = src.indexOf("  async loadPlayer(): Promise<void> {");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("  async loadParty(): Promise<void> {", start);
    const fn = src.slice(start, end > start ? end : start + 4000);
    const firstAdd = fn.indexOf("GameState.group.party.add");
    const firstLoadModel = fn.indexOf("loadModel()");
    expect(firstAdd).toBeGreaterThan(-1);
    expect(firstLoadModel).toBeGreaterThan(-1);
    expect(firstLoadModel).toBeLessThan(firstAdd);
  });

  it("loadParty re-primes after clearLocomotionState", () => {
    const src = fs.readFileSync(
      srcPath("engine", "module", "Area.ts"),
      "utf8"
    );
    const start = src.indexOf("  async loadParty(): Promise<void> {");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("  resolveCombatRoundObjectReferences(){", start);
    const fn = src.slice(start, end > start ? end : start + 2000);
    expect(fn).toMatch(/clearLocomotionState/);
    expect(fn).toMatch(/primeAnimationPose/);
    expect(fn.indexOf("clearLocomotionState")).toBeLessThan(fn.indexOf("primeAnimationPose"));
  });
});
