/**
 * Retail CSWSModule tag lookup table helpers —
 * FindObjectByTagOrdinal / AddObjectToLookupTable.
 * @jest-environment node
 */
import { describe, expect, test, jest } from "@jest/globals";

jest.mock("@/managers/PartyManager", () => ({
  PartyManager: { party: [], Player: undefined },
}));
jest.mock("@/GameState", () => ({
  GameState: { CursorManager: { isClientCombatMode: () => false } },
}));
jest.mock("@/engine/FollowerCamera", () => ({ FollowerCamera: {} }));
jest.mock("@/managers/ResolutionManager", () => ({ ResolutionManager: { addResolution: () => {} } }));
jest.mock("@/combat/objects-in-shape", () => ({ isPointInShape: () => false }));
jest.mock("@/engine/pathfinding/clear-line-of-sight", () => ({ clearLineOfSight: () => true }));

import {
  ModuleObjectManager,
  type TagLookupNode,
} from "@/managers/ModuleObjectManager";

describe("tag-lookup-table (retail CSWSModule)", () => {
  test("inserts equal tags after the existing equal-tag run", () => {
    const table: TagLookupNode[] = [];
    ModuleObjectManager.addObjectToLookupTable(table, "b", 2);
    ModuleObjectManager.addObjectToLookupTable(table, "a", 1);
    ModuleObjectManager.addObjectToLookupTable(table, "a", 3);
    ModuleObjectManager.addObjectToLookupTable(table, "c", 4);

    expect(table.map((n) => [n.tag, n.id])).toEqual([
      ["a", 1],
      ["a", 3],
      ["b", 2],
      ["c", 4],
    ]);
  });

  test("FindTagPositionInTable returns lower_bound index", () => {
    const table: TagLookupNode[] = [
      { tag: "a", id: 1 },
      { tag: "a", id: 2 },
      { tag: "c", id: 3 },
    ];
    expect(ModuleObjectManager.findTagPositionInTable(table, "a")).toBe(0);
    expect(ModuleObjectManager.findTagPositionInTable(table, "b")).toBe(2);
    expect(ModuleObjectManager.findTagPositionInTable(table, "c")).toBe(2);
    expect(ModuleObjectManager.findTagPositionInTable(table, "d")).toBe(3);
  });

  test("findObjectIdByTagOrdinal returns nth equal-tag id", () => {
    const table: TagLookupNode[] = [];
    ModuleObjectManager.addObjectToLookupTable(table, "foo", 10);
    ModuleObjectManager.addObjectToLookupTable(table, "bar", 12);
    ModuleObjectManager.addObjectToLookupTable(table, "foo", 11);

    expect(ModuleObjectManager.findObjectIdByTagOrdinal(table, "foo", 0)).toBe(10);
    expect(ModuleObjectManager.findObjectIdByTagOrdinal(table, "foo", 1)).toBe(11);
    expect(ModuleObjectManager.findObjectIdByTagOrdinal(table, "foo", 2)).toBeUndefined();
    expect(ModuleObjectManager.findObjectIdByTagOrdinal(table, "bar", 0)).toBe(12);
  });

  test("type filter skips non-matching ids", () => {
    const table: TagLookupNode[] = [];
    ModuleObjectManager.addObjectToLookupTable(table, "same", 20);
    ModuleObjectManager.addObjectToLookupTable(table, "same", 21);
    const placeables = new Set([21]);

    expect(ModuleObjectManager.findObjectIdByTagOrdinal(table, "same", 0, (id) => placeables.has(id))).toBe(21);
    expect(ModuleObjectManager.findObjectIdByTagOrdinal(table, "same", 0, (id) => id === 20)).toBe(20);
  });

  test("remove by tag+id and by id alone", () => {
    const table: TagLookupNode[] = [];
    ModuleObjectManager.addObjectToLookupTable(table, "x", 1);
    ModuleObjectManager.addObjectToLookupTable(table, "x", 2);
    ModuleObjectManager.addObjectToLookupTable(table, "y", 3);

    expect(ModuleObjectManager.removeObjectFromLookupTable(table, "x", 1)).toBe(true);
    expect(table.map((n) => n.id)).toEqual([2, 3]);

    ModuleObjectManager.removeObjectFromLookupTableById(table, 3);
    expect(table.map((n) => n.id)).toEqual([2]);
  });
});
