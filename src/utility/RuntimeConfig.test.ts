import { __private__, RuntimeConfig } from "./RuntimeConfig";

describe("RuntimeConfig", () => {
  beforeEach(() => {
    (globalThis as any).RUNTIME_CONFIG = undefined;
    (globalThis as any).__RUNTIME_CONFIG__ = undefined;
    (globalThis as any).APP_CONFIG = undefined;
  });

  describe("normalizeBasePath", () => {
    test.each([
      [undefined, ""],
      [null, ""],
      ["", ""],
      [" ", ""],
      ["/", ""],
      ["foo", "/foo"],
      ["/foo", "/foo"],
      ["/foo/", "/foo"],
      ["//foo//", "/foo"],
    ])("normalizes %p -> %p", (input: any, expected: string) => {
      expect(__private__.normalizeBasePath(input)).toBe(expected);
    });
  });

  describe("toPublicUrl", () => {
    test("returns path as-is when no basePath", () => {
      (globalThis as any).RUNTIME_CONFIG = { basePath: "" };
      expect(RuntimeConfig.toPublicUrl("/game/index.html")).toBe("/game/index.html");
    });

    test("prefixes basePath", () => {
      (globalThis as any).RUNTIME_CONFIG = { basePath: "/kotor" };
      expect(RuntimeConfig.toPublicUrl("/game/index.html")).toBe("/kotor/game/index.html");
    });

    test("handles missing leading slash", () => {
      (globalThis as any).RUNTIME_CONFIG = { basePath: "kotor" };
      expect(RuntimeConfig.toPublicUrl("game/index.html")).toBe("/kotor/game/index.html");
    });

    test("collapses double slashes", () => {
      (globalThis as any).RUNTIME_CONFIG = { basePath: "/kotor/" };
      expect(RuntimeConfig.toPublicUrl("/game/index.html")).toBe("/kotor/game/index.html");
    });
  });
});


