import {
  APPEARANCE_BODY_MAX_K1,
  APPEARANCE_BODY_MAX_K2,
  APPEARANCE_EVIL_BODY_ALIGN_MAX,
  SWCreatureAppearance,
} from "@/engine/rules/SWCreatureAppearance";

describe("SWCreatureAppearance.From2DA", () => {
  it("reads deathvfx / deathvfxnode and K2 TEX*Evil / ModelN columns", () => {
    const appearance = SWCreatureAppearance.From2DA({
      __index: "42",
      deathvfx: "7",
      deathvfxnode: "chest",
      modeln: "P_MaleN",
      texn: "PMHN",
      texlevil: "PMHLE",
      texnevil: "PMHNE",
      texbevil: "PMHBE",
      driveanimrun_pc: "5.5",
    });

    expect(appearance.id).toBe(42);
    expect(appearance.deathvfx).toBe(7);
    expect(appearance.deathvfxnode).toBe("chest");
    expect(appearance.modeln).toBe("P_MaleN");
    expect(appearance.texn).toBe("PMHN");
    expect(appearance.texlevil).toBe("PMHLE");
    // 2DA column texnevil → stored as texmevil (retail lookup string TEXMEVIL)
    expect(appearance.texmevil).toBe("PMHNE");
    expect(appearance.texbevil).toBe("PMHBE");
    expect(appearance.driveanimrun_pc).toBe(5.5);
    // TSL CreateBodyAppearance: DriveAnimRun_PC fills the DriveAnimRun slot
    expect(appearance.driveanimrun).toBe(5.5);
  });

  it("maps DriveAnimRun_PC into driveanimrun when DriveAnimRun is absent", () => {
    const appearance = SWCreatureAppearance.From2DA({
      __index: "0",
      driveanimrun_pc: "5.4",
      driveanimrun_xbox: "6.0",
    });
    expect(appearance.driveanimrun_pc).toBe(5.4);
    expect(appearance.driveanimrun).toBe(5.4);
    expect(appearance.driveanimrun_xbox).toBe(6.0);
  });

  it("keeps K1 DriveAnimRun when both DriveAnimRun and DriveAnimRun_PC exist", () => {
    const appearance = SWCreatureAppearance.From2DA({
      __index: "0",
      driveanimrun: "4.5",
      driveanimrun_pc: "5.5",
    });
    expect(appearance.driveanimrun).toBe(4.5);
    expect(appearance.driveanimrun_pc).toBe(5.5);
  });

  it("accepts texmevil alias when texnevil is absent", () => {
    const appearance = SWCreatureAppearance.From2DA({
      __index: "1",
      texmevil: "PMHME",
    });
    expect(appearance.texmevil).toBe("PMHME");
  });

  it("accepts legacy deathfx aliases", () => {
    const appearance = SWCreatureAppearance.From2DA({
      __index: "1",
      deathfx: "3",
      deathfxnode: "impact",
    });
    expect(appearance.deathvfx).toBe(3);
    expect(appearance.deathvfxnode).toBe("impact");
  });
});

describe("SWCreatureAppearance.getBodyModelInfo", () => {
  function makeAppearance(overrides: Partial<SWCreatureAppearance> = {}) {
    const a = SWCreatureAppearance.From2DA({
      __index: "0",
      modeltype: "B",
      modela: "P_MaleA",
      texa: "PMHA",
      texaevil: "PMHAE",
      modelb: "P_MaleB",
      texb: "PMHB",
      texbevil: "PMHBE",
      modelj: "P_MaleJ",
      texj: "PMHJ",
      modeln: "P_MaleN",
      texn: "PMHN",
      modeli: "P_MaleI",
      texi: "PMHI",
      texievil: "PMHIE",
      modell: "P_MaleL",
      texl: "PMHL",
      texlevil: "PMHLE",
      modelm: "P_MaleM",
      texm: "PMHM",
      texnevil: "PMHNE",
      ...Object.fromEntries(
        Object.entries(overrides).map(([k, v]) => [k, String(v)])
      ),
    });
    return a;
  }

  it("selects ModelA–N by letter with K2 clamp N", () => {
    const a = makeAppearance();
    expect(a.getBodyModelInfo("A", 1, APPEARANCE_BODY_MAX_K2).model).toBe("p_malea");
    expect(a.getBodyModelInfo("J", 2, APPEARANCE_BODY_MAX_K2)).toEqual({
      model: "p_malej",
      texture: "pmhj02",
    });
    expect(a.getBodyModelInfo("N", 1, APPEARANCE_BODY_MAX_K2)).toEqual({
      model: "p_malen",
      texture: "pmhn01",
    });
  });

  it("clamps body N down to J on K1 max", () => {
    const a = makeAppearance();
    const info = a.getBodyModelInfo("N", 1, APPEARANCE_BODY_MAX_K1);
    expect(info.model).toBe("p_malej");
    expect(info.texture).toBe("pmhj01");
  });

  it("uses TEXAEvil+01 when GoodEvil below threshold and no body variation", () => {
    const a = makeAppearance();
    const info = a.getBodyModelInfo(
      "",
      3,
      APPEARANCE_BODY_MAX_K2,
      APPEARANCE_EVIL_BODY_ALIGN_MAX - 1,
      false,
    );
    expect(info.texture).toBe("pmhae01");
    expect(info.model).toBe("p_malea");
  });

  it("uses TEXBEvil / TEXIEvil / TEXLEvil / TEXMEvil by retail body indices", () => {
    const a = makeAppearance();
    const ge = APPEARANCE_EVIL_BODY_ALIGN_MAX - 1;
    expect(a.getBodyModelInfo("B", 1, APPEARANCE_BODY_MAX_K2, ge, true).texture).toBe("pmhbe01");
    expect(a.getBodyModelInfo("I", 1, APPEARANCE_BODY_MAX_K2, ge, true).texture).toBe("pmhie01");
    expect(a.getBodyModelInfo("L", 1, APPEARANCE_BODY_MAX_K2, ge, true).texture).toBe("pmhle01");
    // Retail body byte 0xE = letter N → TEXMEVIL string / texnevil 2DA column
    expect(a.getBodyModelInfo("N", 1, APPEARANCE_BODY_MAX_K2, ge, true).texture).toBe("pmhne01");
  });

  it("uses normal tex when GoodEvil is at or above evil threshold", () => {
    const a = makeAppearance();
    const info = a.getBodyModelInfo(
      "B",
      4,
      APPEARANCE_BODY_MAX_K2,
      APPEARANCE_EVIL_BODY_ALIGN_MAX,
      true,
    );
    expect(info.texture).toBe("pmhb04");
  });

  it("leaves texture empty when body Model* exists but TEX* is blank (Atton/Mira)", () => {
    const a = SWCreatureAppearance.From2DA({
      __index: "452",
      modeltype: "B",
      modela: "PMBAM",
      texa: "PMBAMC",
      texaevil: "PMBAMD",
      modelb: "P_AttonBB",
      texb: "",
      texbevil: "P_AttonBAD",
    });
    // Retail GetBType: empty TEXB → no ReplaceTexture (MDL default), not TEXA
    expect(a.getBodyModelInfo("B", 1, APPEARANCE_BODY_MAX_K2, 50, true)).toEqual({
      model: "p_attonbb",
      texture: "",
    });
    // Evil still uses TEXBEvil when GoodEvil < 0x29
    expect(a.getBodyModelInfo("B", 1, APPEARANCE_BODY_MAX_K2, 40, true)).toEqual({
      model: "p_attonbb",
      texture: "p_attonbad01",
    });
  });

  it("uses race/racetex for non-B modeltype", () => {
    const a = SWCreatureAppearance.From2DA({
      __index: "0",
      modeltype: "S",
      race: "N_Rakghoul",
      racetex: "N_Rakghoul01",
      modela: "ignored",
      texa: "ignored",
    });
    expect(a.getBodyModelInfo("B", 1)).toEqual({
      model: "n_rakghoul",
      texture: "n_rakghoul01",
    });
  });
});

describe("SWCreatureAppearance.maxBodyVariationIndex", () => {
  it("returns J clamp for K1 and N clamp for TSL", () => {
    expect(SWCreatureAppearance.maxBodyVariationIndex(false)).toBe(APPEARANCE_BODY_MAX_K1);
    expect(SWCreatureAppearance.maxBodyVariationIndex(true)).toBe(APPEARANCE_BODY_MAX_K2);
  });
});
