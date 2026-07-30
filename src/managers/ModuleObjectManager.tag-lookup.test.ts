/**
 * Retail CSWSModule tag lookup table helpers —
 * FindObjectByTagOrdinal @ 004c5fe0 / AddObjectToLookupTable @ 004c7de0.
 * @jest-environment node
 */
import { describe, expect, test } from "@jest/globals";
import {
  addObjectToLookupTable,
  findObjectIdByTagOrdinal,
  findTagPositionInTable,
  removeObjectFromLookupTable,
  removeObjectFromLookupTableById,
  type TagLookupNode,
} from "@/managers/tag-lookup-table";

describe("tag-lookup-table (retail CSWSModule)", () => {
  test("inserts equal tags after the existing equal-tag run", () => {
    const table: TagLookupNode[] = [];
    addObjectToLookupTable(table, "b", 2);
    addObjectToLookupTable(table, "a", 1);
    addObjectToLookupTable(table, "a", 3);
    addObjectToLookupTable(table, "c", 4);

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
    expect(findTagPositionInTable(table, "a")).toBe(0);
    expect(findTagPositionInTable(table, "b")).toBe(2);
    expect(findTagPositionInTable(table, "c")).toBe(2);
    expect(findTagPositionInTable(table, "d")).toBe(3);
  });

  test("findObjectIdByTagOrdinal returns nth equal-tag id", () => {
    const table: TagLookupNode[] = [];
    addObjectToLookupTable(table, "foo", 10);
    addObjectToLookupTable(table, "bar", 12);
    addObjectToLookupTable(table, "foo", 11);

    expect(findObjectIdByTagOrdinal(table, "foo", 0)).toBe(10);
    expect(findObjectIdByTagOrdinal(table, "foo", 1)).toBe(11);
    expect(findObjectIdByTagOrdinal(table, "foo", 2)).toBeUndefined();
    expect(findObjectIdByTagOrdinal(table, "bar", 0)).toBe(12);
  });

  test("type filter skips non-matching ids", () => {
    const table: TagLookupNode[] = [];
    addObjectToLookupTable(table, "same", 20);
    addObjectToLookupTable(table, "same", 21);
    const placeables = new Set([21]);

    expect(findObjectIdByTagOrdinal(table, "same", 0, (id) => placeables.has(id))).toBe(21);
    expect(findObjectIdByTagOrdinal(table, "same", 0, (id) => id === 20)).toBe(20);
  });

  test("remove by tag+id and by id alone", () => {
    const table: TagLookupNode[] = [];
    addObjectToLookupTable(table, "x", 1);
    addObjectToLookupTable(table, "x", 2);
    addObjectToLookupTable(table, "y", 3);

    expect(removeObjectFromLookupTable(table, "x", 1)).toBe(true);
    expect(table.map((n) => n.id)).toEqual([2, 3]);

    removeObjectFromLookupTableById(table, 3);
    expect(table.map((n) => n.id)).toEqual([2]);
  });
});
