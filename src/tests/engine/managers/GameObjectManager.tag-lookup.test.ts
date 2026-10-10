/**
 * module tag lookup table helpers —
 * FindObjectByTagOrdinal / AddObjectToLookupTable.
 * @jest-environment node
 */
import { describe, expect, test, jest } from "@jest/globals";

jest.mock("@engine/managers/PartyManager", () => ({
  PartyManager: { party: [], Player: undefined },
}));
jest.mock("@engine/runtime/GameState", () => ({
  GameState: { CursorManager: { isClientCombatMode: () => false } },
}));
jest.mock("@engine/render/FollowerCamera", () => ({ FollowerCamera: {} }));
jest.mock("@engine/managers/ResolutionManager", () => ({ ResolutionManager: { addResolution: () => {} } }));
jest.mock("@engine/pathfinding/visual-los", () => ({ hasVisualLos: () => true }));


import {
  GameObjectManager,
  type TagLookupNode,
} from "@engine/managers/GameObjectManager";

describe("tag-lookup-table (engine module)", () => {
  test("inserts equal tags after the existing equal-tag run", () => {
    const table: TagLookupNode[] = [];
    GameObjectManager.addObjectToLookupTable(table, "b", 2);
    GameObjectManager.addObjectToLookupTable(table, "a", 1);
    GameObjectManager.addObjectToLookupTable(table, "a", 3);
    GameObjectManager.addObjectToLookupTable(table, "c", 4);

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
    expect(GameObjectManager.findTagPositionInTable(table, "a")).toBe(0);
    expect(GameObjectManager.findTagPositionInTable(table, "b")).toBe(2);
    expect(GameObjectManager.findTagPositionInTable(table, "c")).toBe(2);
    expect(GameObjectManager.findTagPositionInTable(table, "d")).toBe(3);
  });

  test("findObjectIdByTagOrdinal returns nth equal-tag id", () => {
    const table: TagLookupNode[] = [];
    GameObjectManager.addObjectToLookupTable(table, "foo", 10);
    GameObjectManager.addObjectToLookupTable(table, "bar", 12);
    GameObjectManager.addObjectToLookupTable(table, "foo", 11);

    expect(GameObjectManager.findObjectIdByTagOrdinal(table, "foo", 0)).toBe(10);
    expect(GameObjectManager.findObjectIdByTagOrdinal(table, "foo", 1)).toBe(11);
    expect(GameObjectManager.findObjectIdByTagOrdinal(table, "foo", 2)).toBeUndefined();
    expect(GameObjectManager.findObjectIdByTagOrdinal(table, "bar", 0)).toBe(12);
  });

  test("type filter skips non-matching ids", () => {
    const table: TagLookupNode[] = [];
    GameObjectManager.addObjectToLookupTable(table, "same", 20);
    GameObjectManager.addObjectToLookupTable(table, "same", 21);
    const placeables = new Set([21]);

    expect(GameObjectManager.findObjectIdByTagOrdinal(table, "same", 0, (id) => placeables.has(id))).toBe(21);
    expect(GameObjectManager.findObjectIdByTagOrdinal(table, "same", 0, (id) => id === 20)).toBe(20);
  });

  test("remove by tag+id and by id alone", () => {
    const table: TagLookupNode[] = [];
    GameObjectManager.addObjectToLookupTable(table, "x", 1);
    GameObjectManager.addObjectToLookupTable(table, "x", 2);
    GameObjectManager.addObjectToLookupTable(table, "y", 3);

    expect(GameObjectManager.removeObjectFromLookupTable(table, "x", 1)).toBe(true);
    expect(table.map((n) => n.id)).toEqual([2, 3]);

    GameObjectManager.removeObjectFromLookupTableById(table, 3);
    expect(table.map((n) => n.id)).toEqual([2]);
  });
});
