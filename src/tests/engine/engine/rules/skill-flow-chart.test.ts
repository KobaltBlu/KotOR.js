/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import {
  buildSortedFeatIds,
  buildSortedPowerIds,
  createInGameFeatChart,
  createInGamePowerChart,
  encodeSpellSubRadial,
  featChainDepth,
  isSpellChartRoot,
  spellSubRadialFamily,
  spellSubRadialPriority,
  spellSubRadialSlot,
  type SkillFlowCreature,
} from "@engine/games/abilities-menu-utils";
import type { TalentFeat } from "@engine/talents/TalentFeat";
import type { TalentSpell } from "@engine/talents/TalentSpell";

function makeFeat(
  id: number,
  opts: { name?: number; prereqFeat1?: number; prereqFeat2?: number } = {},
): TalentFeat {
  return {
    id,
    name: opts.name ?? (id + 1),
    prereqFeat1: opts.prereqFeat1 ?? -1,
    prereqFeat2: opts.prereqFeat2 ?? -1,
  } as TalentFeat;
}

function makeSpell(
  id: number,
  opts: {
    name?: number;
    userType?: number;
    forcehostile?: number;
    forcefriendly?: number;
    forcepassive?: number;
    forcepriority?: number;
    forcepoints?: number;
    goodEvil?: string;
  } = {},
): TalentSpell {
  return {
    id,
    name: opts.name ?? (id + 1),
    userType: opts.userType ?? 1,
    forcehostile: opts.forcehostile ?? -1,
    forcefriendly: opts.forcefriendly ?? -1,
    forcepassive: opts.forcepassive ?? -1,
    forcepriority: opts.forcepriority ?? -1,
    forcepoints: opts.forcepoints ?? 0,
    goodEvil: opts.goodEvil ?? "-",
  } as TalentSpell;
}

describe("subradial encode", () => {
  it("Force Aura/Shield/Armor share friendly family+slot, priorities 0/1/2", () => {
    const aura = encodeSpellSubRadial({ forcefriendly: 1, forcepriority: 0 });
    const shield = encodeSpellSubRadial({ forcefriendly: 1, forcepriority: 1 });
    const armor = encodeSpellSubRadial({ forcefriendly: 1, forcepriority: 2 });
    expect(aura).toBe(3010);
    expect(shield).toBe(3011);
    expect(armor).toBe(3012);
    expect(spellSubRadialFamily(aura)).toBe(spellSubRadialFamily(shield));
    expect(spellSubRadialSlot(aura)).toBe(1);
    expect(spellSubRadialPriority(aura)).toBe(0);
    expect(spellSubRadialPriority(shield)).toBe(1);
    expect(spellSubRadialPriority(armor)).toBe(2);
  });

  it("Force Push/Whirlwind/Wave share hostile family+slot", () => {
    const push = encodeSpellSubRadial({ forcehostile: 6, forcepriority: 0 });
    const ww = encodeSpellSubRadial({ forcehostile: 6, forcepriority: 1 });
    const wave = encodeSpellSubRadial({ forcehostile: 6, forcepriority: 2 });
    expect(push).toBe(1060);
    expect(spellSubRadialFamily(push)).toBe(1);
    expect(spellSubRadialSlot(push)).toBe(6);
    expect(spellSubRadialPriority(ww)).toBe(1);
    expect(spellSubRadialPriority(wave)).toBe(2);
  });

  it("isSpellChartRoot: priority 0 or missing key", () => {
    expect(isSpellChartRoot(encodeSpellSubRadial({ forcehostile: 6, forcepriority: 0 }))).toBe(true);
    expect(isSpellChartRoot(encodeSpellSubRadial({ forcehostile: 6, forcepriority: 1 }))).toBe(false);
    expect(isSpellChartRoot(-1)).toBe(true);
  });
});

describe("BuildSortedFeatList / CreateFeatChart", () => {
  const root = makeFeat(0, { name: 100 });
  const mid = makeFeat(1, { name: 101, prereqFeat1: 0 });
  const end = makeFeat(2, { name: 102, prereqFeat1: 0, prereqFeat2: 1 });
  const otherRoot = makeFeat(3, { name: 103 });
  const feats = [root, mid, end, otherRoot];

  it("featChainDepth matches engine 0/1/2", () => {
    expect(featChainDepth(root)).toBe(0);
    expect(featChainDepth(mid)).toBe(1);
    expect(featChainDepth(end)).toBe(2);
  });

  it("sorted ids put roots before mids before ends", () => {
    expect(buildSortedFeatIds(feats)).toEqual([0, 3, 1, 2]);
  });

  it("in-game chart: known root only, known children only, sparse slots", () => {
    const creature: SkillFlowCreature = {
      getHasFeat: (id) => id === 0 || id === 2, // root + end, not mid
    };
    const groups = createInGameFeatChart(creature, feats);
    expect(groups).toHaveLength(1);
    expect(groups[0][0]).toBe(root);
    expect(groups[0][1]).toBeUndefined();
    expect(groups[0][2]).toBe(end);
    expect(groups[0].length).toBeGreaterThanOrEqual(3);
  });

  it("in-game chart: unknown root omitted; unknown mid omitted when not owned", () => {
    const creature: SkillFlowCreature = {
      getHasFeat: (id) => id === 3,
    };
    const groups = createInGameFeatChart(creature, feats);
    expect(groups).toHaveLength(1);
    expect(groups[0][0]).toBe(otherRoot);
    expect(groups[0][1]).toBeUndefined();
    expect(groups[0][2]).toBeUndefined();
  });

  it("skips feats with name == 0", () => {
    const blank = makeFeat(4, { name: 0 });
    const named = makeFeat(0, { name: 100 });
    expect(buildSortedFeatIds([blank, named])).toEqual([1]);
  });
});

describe("BuildSortedPowerList / CreatePowerChart", () => {
  const push = makeSpell(10, { forcehostile: 6, forcepriority: 0, forcepoints: 10 });
  const ww = makeSpell(11, { forcehostile: 6, forcepriority: 1, forcepoints: 20 });
  const wave = makeSpell(12, { forcehostile: 6, forcepriority: 2, forcepoints: 30 });
  const aura = makeSpell(20, { forcefriendly: 1, forcepriority: 0, forcepoints: 5 });
  const shield = makeSpell(21, { forcefriendly: 1, forcepriority: 1, forcepoints: 15 });
  const orphan = makeSpell(30, { forcepriority: 0, forcepoints: 0 }); // no force columns
  const spells = [wave, shield, push, orphan, ww, aura]; // shuffled

  it("sorts by priority then family then slot", () => {
    const ids = buildSortedPowerIds(spells);
    // priority 0 first: orphan (no key), push (fam1), aura (fam3)
    // then pri 1: ww, shield; then pri 2: wave
    const byId = ids.map((i) => spells[i].id);
    expect(byId.indexOf(30)).toBeLessThan(byId.indexOf(11)); // orphan root before mid
    expect(byId.indexOf(10)).toBeLessThan(byId.indexOf(11));
    expect(byId.indexOf(11)).toBeLessThan(byId.indexOf(12));
  });

  it("full 3-slot hostile chain when known and affordable", () => {
    const creature: SkillFlowCreature = {
      getHasSpell: () => true,
      getFP: () => 100,
      getAdjustedForcePointCost: (s) => s.forcepoints ?? 0,
    };
    const groups = createInGamePowerChart(creature, spells);
    const pushGroup = groups.find((g) => g[0]?.id === 10);
    expect(pushGroup).toBeDefined();
    expect(pushGroup![0]?.id).toBe(10);
    expect(pushGroup![1]?.id).toBe(11);
    expect(pushGroup![2]?.id).toBe(12);
  });

  it("sparse mid when only root+end known/affordable", () => {
    const creature: SkillFlowCreature = {
      getHasSpell: (id) => id === 10 || id === 12,
      getFP: () => 100,
      getAdjustedForcePointCost: (s) => s.forcepoints ?? 0,
    };
    const groups = createInGamePowerChart(creature, spells);
    const pushGroup = groups.find((g) => g[0]?.id === 10)!;
    expect(pushGroup[1]).toBeUndefined();
    expect(pushGroup[2]?.id).toBe(12);
    expect(pushGroup.length).toBeGreaterThanOrEqual(3);
  });

  it("FP gate omits unaffordable mid/end (HasSpell affordability check)", () => {
    const creature: SkillFlowCreature = {
      getHasSpell: () => true,
      getFP: () => 15, // can afford ww(20)? no — 15 < 20; wave 30 no; shield 15 ok
      getAdjustedForcePointCost: (s) => s.forcepoints ?? 0,
    };
    const groups = createInGamePowerChart(creature, spells);
    const pushGroup = groups.find((g) => g[0]?.id === 10)!;
    expect(pushGroup[1]).toBeUndefined();
    expect(pushGroup[2]).toBeUndefined();
    const auraGroup = groups.find((g) => g[0]?.id === 20)!;
    expect(auraGroup[1]?.id).toBe(21); // shield cost 15 <= 15
  });

  it("unknown root omitted; orphan with no force columns still listed when known", () => {
    const creature: SkillFlowCreature = {
      getHasSpell: (id) => id === 30,
      getFP: () => 0,
      getAdjustedForcePointCost: () => 0,
    };
    const groups = createInGamePowerChart(creature, spells);
    expect(groups).toHaveLength(1);
    expect(groups[0][0]?.id).toBe(30);
  });

  it("excludes non-usertype-1 spells", () => {
    const item = makeSpell(99, { userType: 4, forcehostile: 0, forcepriority: 0 });
    expect(buildSortedPowerIds([item, push])).toEqual([1]);
  });
});
