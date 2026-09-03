/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

/** Retail SetLocalBoolean index — ExecuteCommandDisplayDatapad @ 007b15f0. */
const DATAPAD_SHOWN_LOCAL_BOOL = 0x5e;

/** Mirrors MenuDatapad.resolveDatapadText / DescIdentified path. */
function resolveDatapadText(item: {
  getDescription?: () => string | { getValue: () => string } | undefined;
}): string {
  const desc = item.getDescription?.();
  if (typeof desc === "string") return desc;
  if (desc && typeof (desc as any).getValue === "function") {
    return String((desc as any).getValue() || "");
  }
  return String(desc || "");
}

describe("Pass AM DisplayDatapad local bool", () => {
  it("uses retail index 0x5E", () => {
    expect(DATAPAD_SHOWN_LOCAL_BOOL).toBe(0x5e);
  });

  it("setLocalBoolean(0x5E) latches shown state", () => {
    const locals: { Booleans: Record<number, boolean> } = { Booleans: {} };
    const setLocalBoolean = (index: number, bool: boolean) => {
      locals.Booleans[index] = !!bool;
    };
    const getLocalBoolean = (index: number) => !!locals.Booleans[index];
    expect(getLocalBoolean(DATAPAD_SHOWN_LOCAL_BOOL)).toBe(false);
    setLocalBoolean(DATAPAD_SHOWN_LOCAL_BOOL, true);
    expect(getLocalBoolean(DATAPAD_SHOWN_LOCAL_BOOL)).toBe(true);
  });
});

describe("Pass AM datapad DescIdentified text", () => {
  it("uses string getDescription", () => {
    expect(
      resolveDatapadText({ getDescription: () => "Pad contents here." }),
    ).toBe("Pad contents here.");
  });

  it("unwraps CExoLocString-like getValue", () => {
    expect(
      resolveDatapadText({
        getDescription: () => ({ getValue: () => "LocString body" }),
      }),
    ).toBe("LocString body");
  });

  it("falls back to empty when missing", () => {
    expect(resolveDatapadText({})).toBe("");
  });
});
