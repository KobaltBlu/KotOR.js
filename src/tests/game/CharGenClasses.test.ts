import { describe, expect, it } from "@jest/globals";
import { CharGenClasses } from "@/game/CharGenClasses";

describe("CharGenClasses slot mapping", () => {
  it("maps UI slots to engine class ids (soldier/scout/scoundrel)", () => {
    // Male: scoundrel, scout, soldier (staticInitClassSelection)
    expect(CharGenClasses[0].id).toBe(2);
    expect(CharGenClasses[1].id).toBe(1);
    expect(CharGenClasses[2].id).toBe(0);
    // Female: soldier, scout, scoundrel
    expect(CharGenClasses[3].id).toBe(0);
    expect(CharGenClasses[4].id).toBe(1);
    expect(CharGenClasses[5].id).toBe(2);
  });

  it("uses engine classSelection soundsets (male 85 / female 83)", () => {
    expect(CharGenClasses[0].soundset).toBe(85);
    expect(CharGenClasses[1].soundset).toBe(85);
    expect(CharGenClasses[2].soundset).toBe(85);
    expect(CharGenClasses[3].soundset).toBe(83);
    expect(CharGenClasses[4].soundset).toBe(83);
    expect(CharGenClasses[5].soundset).toBe(83);
  });

  it("keeps male scoundrel appearances on the +3 sequence", () => {
    const apps = CharGenClasses[1].appearances;
    expect(apps[apps.length - 2]).toBe(176);
    expect(apps[apps.length - 1]).toBe(179);
    for(let i = 1; i < apps.length; i++){
      expect(apps[i] - apps[i - 1]).toBe(3);
    }
  });
});
