import { describe, expect, test } from "@jest/globals";
import { foldNss } from "./nssFolding";

describe("foldNss", () => {
  test("folds braces", () => {
    const text = "void main()\n{\n  int i = 0;\n}\n";
    expect(foldNss(text)).toEqual([{ start: 1, end: 3 }]);
  });

  test("folds consecutive includes", () => {
    const text = '#include "a"\n#include "b"\n\nvoid main() {}\n';
    const ranges = foldNss(text);
    expect(ranges).toContainEqual({ start: 0, end: 1 });
  });
});
