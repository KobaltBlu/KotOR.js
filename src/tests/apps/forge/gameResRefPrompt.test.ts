import { describe, expect, test } from "@jest/globals";
import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";
import {
  blueprintFromTypedResRef,
  blueprintResRefTitle,
  catalogNeedsResRefPrompt,
  confirmTypedResRef,
  utiFromTypedResRef,
} from "@/apps/forge/helpers/gameResRefPrompt";

describe("gameResRefPrompt", () => {
  test("catalog pickers ask for a ResRef when game data is missing", () => {
    expect(catalogNeedsResRefPrompt(false)).toBe(true);
    expect(catalogNeedsResRefPrompt(true)).toBe(false);
  });

  test("typed item ResRefs are sanitized like other Forge ResRef fields", () => {
    expect(sanitizeResRef("G_A_Class04")).toBe("g_a_class04");
    const item = utiFromTypedResRef("G_A_W!LGHTSBR01");
    expect(item.resref).toBe("g_a_wlghtsbr01");
    expect(item.localizedName).toBe(item.resref);
    expect(item.iconResRef).toBe("");
  });

  test("typed blueprint ResRefs keep the selected template type's title", () => {
    expect(blueprintResRefTitle("utc")).toBe("Creature ResRef");
    expect(blueprintFromTypedResRef("n_gamm").resref).toBe("n_gamm");
  });

  test("empty or invalid input does not confirm a ResRef", () => {
    expect(confirmTypedResRef("")).toBeUndefined();
    expect(confirmTypedResRef("!!!")).toBeUndefined();
    expect(confirmTypedResRef("G_I_Trap001")).toBe("g_i_trap001");
  });
});
