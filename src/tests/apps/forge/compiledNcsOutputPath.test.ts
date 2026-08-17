import { describe, expect, test } from "@jest/globals";
import { compiledNcsOverrideRelativePath, compiledNcsPathForProjectNss } from "@/apps/forge/helpers/forgeNcsCompilePaths";

describe("compiled NCS output paths", () => {
  test("puts archive/game compiles in Override/{resref}.ncs", () => {
    expect(compiledNcsOverrideRelativePath("k_sup_confuse")).toBe("Override/k_sup_confuse.ncs");
    expect(compiledNcsOverrideRelativePath("k_sup_confuse.ncs")).toBe("Override/k_sup_confuse.ncs");
    expect(compiledNcsOverrideRelativePath("k_sup_confuse.nss")).toBe("Override/k_sup_confuse.ncs");
    expect(compiledNcsOverrideRelativePath(undefined)).toBe("Override/untitled.ncs");
  });

  test("mirrors project NSS under ncs/", () => {
    expect(compiledNcsPathForProjectNss("scripts/k_sup_confuse.nss")).toBe("ncs/scripts/k_sup_confuse.ncs");
  });
});
