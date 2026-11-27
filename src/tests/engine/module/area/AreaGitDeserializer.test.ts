/**
 * Characterizes GIT load-order attachment in AreaGitDeserializer.
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../../../engine/module/area/AreaGitDeserializer.ts"),
  "utf8",
);

function expectInOrder(source: string, tokens: readonly string[]): void {
  let previous = -1;
  for(const token of tokens){
    const index = source.indexOf(token, previous + 1);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
}

describe("AreaGitDeserializer", () => {
  test("weather and var tables precede object construction", () => {
    expectInOrder(SOURCE, [
      "CurrentWeather",
      "WeatherStarted",
      "loadNamedVarTable(",
      "SwVarTableSerializer.deserialize(",
      "new Creature(",
    ]);
  });

  test("transition waypoint resolution happens during waypoint attach", () => {
    expectInOrder(SOURCE, [
      "new Encounter(",
      "area.transWP",
      "new Waypoint(",
      "new Sound(",
    ]);
  });

  test("cameras are constructed after maps and outside attachObject", () => {
    expectInOrder(SOURCE, [
      "AreaMapSerializer.deserialize(",
      "new AreaCamera(",
      "area.cameras.push(camera)",
    ]);
    expect(SOURCE.indexOf("attachObject( new AreaCamera")).toBe(-1);
  });

  test("does not realize scene assets or run area scripts", () => {
    expect(SOURCE).not.toMatch(/loadVis|loadLayout|loadScripts|loadScene|onSpawn/);
  });
});
