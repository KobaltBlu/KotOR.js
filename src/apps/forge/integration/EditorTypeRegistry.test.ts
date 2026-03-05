import { getForgeEditorTypeFromExtension } from "@/apps/forge/integration/EditorTypeRegistry";

describe("EditorTypeRegistry", () => {
  it("maps specialized editor extensions", () => {
    expect(getForgeEditorTypeFromExtension("are")).toBe("are");
    expect(getForgeEditorTypeFromExtension("git")).toBe("git");
    expect(getForgeEditorTypeFromExtension("ifo")).toBe("ifo");
    expect(getForgeEditorTypeFromExtension("dlg")).toBe("dlg");
    expect(getForgeEditorTypeFromExtension("tlk")).toBe("tlk");
    expect(getForgeEditorTypeFromExtension("ssf")).toBe("ssf");
    expect(getForgeEditorTypeFromExtension("vis")).toBe("vis");
    expect(getForgeEditorTypeFromExtension("sav")).toBe("sav");
  });

  it("maps grouped resource families", () => {
    expect(getForgeEditorTypeFromExtension("utc")).toBe("utc");
    expect(getForgeEditorTypeFromExtension("utp")).toBe("utp");
    expect(getForgeEditorTypeFromExtension("uti")).toBe("uti");

    expect(getForgeEditorTypeFromExtension("gff")).toBe("gff");
    expect(getForgeEditorTypeFromExtension("res")).toBe("gff");
    expect(getForgeEditorTypeFromExtension("bic")).toBe("gff");

    expect(getForgeEditorTypeFromExtension("erf")).toBe("erf");
    expect(getForgeEditorTypeFromExtension("mod")).toBe("erf");
    expect(getForgeEditorTypeFromExtension("rim")).toBe("erf");

    expect(getForgeEditorTypeFromExtension("mdl")).toBe("model");
    expect(getForgeEditorTypeFromExtension("mdx")).toBe("model");

    expect(getForgeEditorTypeFromExtension("tpc")).toBe("image");
    expect(getForgeEditorTypeFromExtension("tga")).toBe("image");

    expect(getForgeEditorTypeFromExtension("wok")).toBe("walkmesh");
    expect(getForgeEditorTypeFromExtension("dwk")).toBe("walkmesh");
    expect(getForgeEditorTypeFromExtension("pwk")).toBe("walkmesh");
    expect(getForgeEditorTypeFromExtension("bwm")).toBe("walkmesh");
  });

  it("supports text and unknown fallbacks", () => {
    expect(getForgeEditorTypeFromExtension("nss")).toBe("text");
    expect(getForgeEditorTypeFromExtension("txt")).toBe("text");
    expect(getForgeEditorTypeFromExtension("unknown_ext")).toBe("binary");
  });
});
