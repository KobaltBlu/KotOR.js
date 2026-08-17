import { describe, expect, test } from "@jest/globals";
import { mergeResRefCatalog, resRefFromPath } from "@/apps/forge/helpers/resRefCatalog";

describe("resRefFromPath", () => {
  test("strips matching extensions", () => {
    expect(resRefFromPath("streamvoice/n_bastila01.wav", ["wav"])).toBe("n_bastila01");
    expect(resRefFromPath("models\\cutscam.MDL", ["mdl"])).toBe("cutscam");
    expect(resRefFromPath("music/mus_theme.mp3", ["wav", "mp3", "bmu"])).toBe("mus_theme");
    expect(resRefFromPath("n_bastila01.lip", ["wav"])).toBeNull();
  });
});

describe("mergeResRefCatalog", () => {
  test("prefers project over override over game", () => {
    const entries = mergeResRefCatalog([
      { source: "game", resrefs: ["n_bastila01", "gui_click"] },
      { source: "override", resrefs: ["n_bastila01"] },
      { source: "project", resrefs: ["n_bastila01", "my_line"] },
    ]);
    expect(entries).toEqual([
      { resref: "gui_click", source: "game" },
      { resref: "my_line", source: "project" },
      { resref: "n_bastila01", source: "project" },
    ]);
  });
});
