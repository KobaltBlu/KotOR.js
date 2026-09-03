import { describe, expect, test } from "@jest/globals";
import {
  collectNssIncludeResrefs,
  normalizeNssIncludeResref,
} from "@/apps/forge/helpers/nssIncludeResref";

describe("normalizeNssIncludeResref", () => {
  test("strips quotes, extension, and case", () => {
    expect(normalizeNssIncludeResref("k_inc_generic")).toBe("k_inc_generic");
    expect(normalizeNssIncludeResref("K_Inc_Generic.NSS")).toBe("k_inc_generic");
    expect(normalizeNssIncludeResref('"k_inc_generic.nss"')).toBe("k_inc_generic");
  });
});

describe("collectNssIncludeResrefs", () => {
  test("collects unique resrefs from quoted and unquoted includes", () => {
    const source = [
      '#include "k_inc_generic.nss"',
      "#include k_inc_debug",
      '#include "k_inc_generic"',
      "void main() {}",
    ].join("\n");
    expect(collectNssIncludeResrefs(source)).toEqual(["k_inc_generic", "k_inc_debug"]);
  });
});
