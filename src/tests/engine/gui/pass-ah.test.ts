/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));

import {
  chemicalCreateCost,
  chemicalRecipeVisible,
  componentPieceValue,
  itemCreateAlignBucket,
  itemCreateRecipeVisible,
  nwscriptPieceValue,
  parseChemicalCreateRow,
  parseItemCreateRow,
  treatInjuryDiscountFactor,
} from "@engine/games/tsl-crafting";

describe("Pass AH crafting cost helpers", () => {
  it("chemical create cost is max(1, cost>>1)", () => {
    expect(chemicalCreateCost(0)).toBe(1);
    expect(chemicalCreateCost(1)).toBe(1);
    expect(chemicalCreateCost(100)).toBe(50);
    expect(chemicalCreateCost(101)).toBe(50);
  });

  it("component piece value is max(1, cost/20)", () => {
    expect(componentPieceValue(0)).toBe(1);
    expect(componentPieceValue(19)).toBe(1);
    expect(componentPieceValue(20)).toBe(1);
    expect(componentPieceValue(40)).toBe(2);
    expect(componentPieceValue(100)).toBe(5);
  });

  it("NWScript piece value is floor(cost/20) allowing 0", () => {
    expect(nwscriptPieceValue(0)).toBe(0);
    expect(nwscriptPieceValue(19)).toBe(0);
    expect(nwscriptPieceValue(20)).toBe(1);
    expect(nwscriptPieceValue(100)).toBe(5);
  });

  it("Treat Injury discount factor caps at 1.0", () => {
    expect(treatInjuryDiscountFactor(0)).toBe(0);
    expect(treatInjuryDiscountFactor(10)).toBe(0.5);
    expect(treatInjuryDiscountFactor(20)).toBe(1);
    expect(treatInjuryDiscountFactor(40)).toBe(1);
  });
});

describe("Pass AH recipe filters", () => {
  it("chemicalRecipeVisible matches group and skillLevel <= rank+8", () => {
    const recipe = parseChemicalCreateRow({
      label: "g_i_medeqpmnt01",
      group: 0,
      skillLevel: 5,
      base_skill: 7,
    }, 0)!;
    expect(chemicalRecipeVisible(recipe, 0, () => 0)).toBe(true); // 5 <= 8
    expect(chemicalRecipeVisible(recipe, 1, () => 20)).toBe(false);
    expect(chemicalRecipeVisible(recipe, 0, () => -10)).toBe(false); // 5 <= -2
  });

  it("itemCreateRecipeVisible gates skill/level/align", () => {
    const recipe = parseItemCreateRow({
      label: "g_w_blstrpstl001",
      group: 0,
      skill: 4,
      base_skill: 1,
      level: 5,
      align: 0,
    }, 0)!;
    expect(itemCreateRecipeVisible(recipe, 0, () => 0, 10, 1)).toBe(true);
    expect(itemCreateRecipeVisible(recipe, 0, () => 0, 3, 1)).toBe(false);
    const aligned = parseItemCreateRow({
      label: "x",
      group: 0,
      skill: 0,
      base_skill: 0,
      level: 0,
      align: 2,
    }, 1)!;
    expect(itemCreateRecipeVisible(aligned, 0, () => 20, 10, 1)).toBe(false);
    expect(itemCreateRecipeVisible(aligned, 0, () => 20, 10, 2)).toBe(true);
  });

  it("itemCreateAlignBucket matches engine thresholds", () => {
    expect(itemCreateAlignBucket(0)).toBe(3);
    expect(itemCreateAlignBucket(0x28)).toBe(3);
    expect(itemCreateAlignBucket(0x29)).toBe(1);
    expect(itemCreateAlignBucket(0x3b)).toBe(1);
    expect(itemCreateAlignBucket(0x3c)).toBe(2);
    expect(itemCreateAlignBucket(100)).toBe(2);
  });
});

describe("Pass AH PartyManager stockpile ops", () => {
  it("create deducts chemicals; breakdown adds", () => {
    let ChemicalCount = 100;
    const createCost = chemicalCreateCost(80); // 40
    expect(ChemicalCount >= createCost).toBe(true);
    ChemicalCount -= createCost;
    expect(ChemicalCount).toBe(60);
    ChemicalCount += createCost;
    expect(ChemicalCount).toBe(100);
  });

  it("create deducts components; breakdown adds piece value", () => {
    let ComponentCount = 50;
    const cost = componentPieceValue(200); // 10
    ComponentCount -= cost;
    expect(ComponentCount).toBe(40);
    ComponentCount += componentPieceValue(60); // 3
    expect(ComponentCount).toBe(43);
  });
});
