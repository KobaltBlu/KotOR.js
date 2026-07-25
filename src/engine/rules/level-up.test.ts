import { GameEngineType } from "@/enums/engine";
import {
  shouldOfferAbilityBump,
  getFeatPicksForLevel,
  getPowerPicksForLevel,
  getTotalFeatPicksForLevel,
  primaryAbilityToIndex,
  LevelUpAbilityIndex,
  beginLevelUpDraft,
  validateLevelUpDraft,
  addFeatToDraft,
  createEmptyDraft,
  levelStatRecordFromDraft,
  createEmptyLevelStatRecord,
} from "@/engine/rules/level-up";
import { computeSkillPointsGained } from "@/engine/rules/skill-points";

describe("level-up rules", () => {
  it("offers ability bump on class levels 4/8/12/16/20", () => {
    expect(shouldOfferAbilityBump(3)).toBe(false);
    expect(shouldOfferAbilityBump(4)).toBe(true);
    expect(shouldOfferAbilityBump(5)).toBe(false);
    expect(shouldOfferAbilityBump(8)).toBe(true);
  });

  it("maps primary ability to retail LevelUp index order", () => {
    expect(primaryAbilityToIndex("STR")).toBe(LevelUpAbilityIndex.STR);
    expect(primaryAbilityToIndex("INT")).toBe(LevelUpAbilityIndex.INT);
    expect(primaryAbilityToIndex("WIS")).toBe(LevelUpAbilityIndex.WIS);
  });

  it("reads feat/power picks from class gain arrays", () => {
    const cls: any = {
      featGainPoints: [1, 0, 0, 1, 0],
      featGainBonuses: [0, 0, 0, 0, 0],
      spellGainPoints: [0, 1, 0, 0, 1],
      spellcaster: true,
      forcedie: 4,
    };
    expect(getFeatPicksForLevel(cls, 1)).toBe(1);
    expect(getFeatPicksForLevel(cls, 2)).toBe(0);
    expect(getFeatPicksForLevel(cls, 4)).toBe(1);
    expect(getTotalFeatPicksForLevel(cls, 1)).toBe(1);
    expect(getPowerPicksForLevel(cls, 2)).toBe(1);
  });

  it("beginLevelUpDraft sets ability step and skill budget", () => {
    const creature: any = {
      skillPoints: 0,
      skills: Array.from({ length: 8 }, () => ({ rank: 0 })),
      classes: [{
        id: 0,
        level: 3,
        skillpointbase: 2,
        hitdie: 10,
        forcedie: 0,
        primaryabil: "STR",
        featGainPoints: [0, 0, 0, 1],
        featGainBonuses: [],
        spellGainPoints: [],
        spellcaster: false,
      }],
      getTotalClassLevel: () => 3,
      getINT: () => 10,
      getMainClass(){ return this.classes[0]; },
    };
    const draft = beginLevelUpDraft(creature, GameEngineType.KOTOR);
    expect(draft).not.toBeNull();
    expect(draft!.newClassLevel).toBe(4);
    expect(draft!.hasAbilityStep).toBe(true);
    expect(draft!.attributeIndex).toBe(LevelUpAbilityIndex.STR);
    expect(draft!.hpChange).toBe(10);
    expect(draft!.skillPointsBudget).toBe(
      computeSkillPointsGained(2, 10, 4, GameEngineType.KOTOR)
    );
  });

  it("validateLevelUpDraft requires remaining feat picks spent", () => {
    const draft = createEmptyDraft();
    draft.classId = 0;
    draft.hasFeatsStep = true;
    draft.featPicksRemaining = 1;
    expect(validateLevelUpDraft(draft)).toBe(false);
    expect(addFeatToDraft(draft, 42)).toBe(true);
    expect(validateLevelUpDraft(draft)).toBe(true);
  });

  it("levelStatRecordFromDraft snapshots retail LvlStat fields", () => {
    const draft = createEmptyDraft();
    draft.classId = 2;
    draft.hpChange = 6;
    draft.fpChange = 0;
    draft.attributeIndex = LevelUpAbilityIndex.NONE;
    draft.skillRankChanges = [0, 4, 4, 4, 0, 0, 4, 2];
    draft.skillPointsRemaining = 0;
    draft.feats = [5, 8, 31];
    draft.spellsAdded = [];
    const rec = levelStatRecordFromDraft(draft);
    expect(rec.classId).toBe(2);
    expect(rec.hpChange).toBe(6);
    expect(rec.fpChange).toBe(0);
    expect(rec.attributeIndex).toBe(LevelUpAbilityIndex.NONE);
    expect(rec.skillRankChanges).toEqual([0, 4, 4, 4, 0, 0, 4, 2]);
    expect(rec.feats).toEqual([5, 8, 31]);
    expect(createEmptyLevelStatRecord().feats).toEqual([]);
  });
});
