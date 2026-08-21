import { describe, expect, test } from "@jest/globals";
import {
  cameraAnimationHint,
  dialogAnimationRowIndex,
  dialogAnimationStoreValue,
  formatTwoDAOptionLabel,
  listTwoDAIndexOptions,
  twoDATableHasRows,
} from "@/apps/forge/helpers/twoDAIndexOptions";

describe("twoDATableHasRows", () => {
  test("is false when the table is missing or empty", () => {
    expect(twoDATableHasRows(undefined)).toBe(false);
    expect(twoDATableHasRows({ rows: {} })).toBe(false);
    expect(twoDATableHasRows({ rows: {}, RowCount: 0 })).toBe(false);
  });

  test("is true when rows exist", () => {
    expect(twoDATableHasRows({ rows: { 0: { label: "A" } }, RowCount: 1 })).toBe(true);
  });
});

describe("listTwoDAIndexOptions", () => {
  test("keeps a numeric current value when the table is missing", () => {
    const options = listTwoDAIndexOptions(undefined, { currentValue: 12 });
    expect(options).toEqual([{ value: 12, label: formatTwoDAOptionLabel(12, "", true) }]);
  });

  test("uses __rowlabel as the option value", () => {
    const table = {
      columns: ["__rowlabel", "label"],
      rows: {
        0: { __index: 0, __rowlabel: "10", label: "Static" },
        1: { __index: 1, __rowlabel: "11", label: "GUI" },
      },
    };
    const options = listTwoDAIndexOptions(table, {
      currentValue: -1,
      sentinels: [
        { value: -1, label: "None / inherit" },
        { value: -2, label: "Disable" },
      ],
    });
    expect(options.map((option) => option.value)).toEqual([-1, -2, 10, 11]);
    expect(options[2].label).toBe(formatTwoDAOptionLabel(10, "Static"));
  });

  test("keeps an unknown current value so it is not rewritten", () => {
    const table = {
      columns: ["__rowlabel", "label"],
      rows: {
        0: { __index: 0, __rowlabel: "0", label: "Default" },
      },
    };
    const options = listTwoDAIndexOptions(table, { currentValue: 99 });
    expect(options[0]).toEqual({ value: 99, label: formatTwoDAOptionLabel(99, "", true) });
    expect(options.some((option) => option.value === 0)).toBe(true);
  });
});

describe("dialog animation looping band", () => {
  test("maps 10000+row to row for the picker and preserves stored band", () => {
    expect(dialogAnimationRowIndex(10030)).toBe(30);
    expect(dialogAnimationStoreValue(10030, 30)).toBe(10030);
    expect(dialogAnimationStoreValue(10030, 28)).toBe(28);
  });
});

describe("cameraAnimationHint", () => {
  test("formats CUT names and none", () => {
    expect(cameraAnimationHint(-1)).toBe("none");
    expect(cameraAnimationHint(10098)).toBe("none");
    expect(cameraAnimationHint(1000)).toBe("cut001");
    expect(cameraAnimationHint(1001)).toBe("cut002");
  });
});
