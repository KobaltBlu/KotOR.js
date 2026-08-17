import { describe, expect, test } from "@jest/globals";
import {
  TXI_DIRECTIVE_SET,
  completeTxi,
  getTxiDirective,
  hoverTxi,
  validateTxi,
} from "@/apps/forge/txi/txiSchema";

describe("TXI schema", () => {
  test("includes bump, channel, and procedure keys", () => {
    expect(TXI_DIRECTIVE_SET.has("isdiffusebumpmap")).toBe(true);
    expect(TXI_DIRECTIVE_SET.has("isspecularbumpmap")).toBe(true);
    expect(TXI_DIRECTIVE_SET.has("channelscale0")).toBe(true);
    expect(TXI_DIRECTIVE_SET.has("renderbmlmtype")).toBe(true);
    expect(TXI_DIRECTIVE_SET.has("maptexelstopixels")).toBe(true);
    expect(getTxiDirective("proceduretype")?.values?.map((value) => value.name)).toEqual(
      expect.arrayContaining(["cycle", "water", "arturo", "perlin", "life", "wave"]),
    );
  });
});

describe("completeTxi", () => {
  test("offers directives on an empty line", () => {
    const labels = completeTxi("").map((item) => item.label);
    expect(labels).toEqual(expect.arrayContaining(["blending", "proceduretype", "envmaptexture", "numx"]));
    expect(labels).toEqual(expect.arrayContaining(["cycle flipbook"]));
  });

  test("filters directives by the current token", () => {
    const labels = completeTxi("blend").map((item) => item.label);
    expect(labels).toContain("blending");
    expect(labels.some((label) => label === "proceduretype")).toBe(false);
  });

  test("offers blending modes after the key", () => {
    const labels = completeTxi("blending ").map((item) => item.label);
    expect(labels).toEqual(expect.arrayContaining(["additive", "punchthrough"]));
  });

  test("offers procedure types after the key", () => {
    const labels = completeTxi("proceduretype a").map((item) => item.label);
    expect(labels).toContain("arturo");
    expect(labels).not.toContain("cycle");
  });

  test("offers 0/1 for bool keys", () => {
    const labels = completeTxi("mipmap ").map((item) => item.label);
    expect(labels).toEqual(["1", "0"]);
  });

  test("skips comments", () => {
    expect(completeTxi("// blending")).toEqual([]);
  });
});

describe("hoverTxi", () => {
  test("describes the directive on the line", () => {
    const hover = hoverTxi("  blending additive");
    expect(hover?.name).toBe("blending");
    expect(hover?.documentation.toLowerCase()).toContain("blend");
  });
});

describe("validateTxi", () => {
  test("accepts known lines and coord triples", () => {
    const text = [
      "proceduretype cycle",
      "numx 4",
      "numy 4",
      "fps 8",
      "upperleftcoords 1",
      "0.1 0.2 0.0",
    ].join("\n");
    expect(validateTxi(text)).toEqual([]);
  });

  test("flags unknown keys and bad enum values", () => {
    const issues = validateTxi("blorb 1\nblending glow\n");
    expect(issues.map((issue) => issue.message).join(" ")).toContain("Unknown directive");
    expect(issues.some((issue) => issue.message.includes("additive"))).toBe(true);
  });
});
