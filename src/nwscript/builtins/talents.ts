import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam, talentParam } from "@/nwscript/builtins/actionBuilder";

export const TalentSpell = defineAction({
  id: 301,
  name: "TalentSpell",
  comment: "301: Create a Spell Talent.",
  returnType: NWScriptDataType.TALENT,
  params: [intParam("nSpell")] as const,
  kotor(this: NWScriptInstance, nSpell) {
    return new GameState.TalentSpell(nSpell);
  },
});

export const TalentFeat = defineAction({
  id: 302,
  name: "TalentFeat",
  comment: "302: Create a Feat Talent.",
  returnType: NWScriptDataType.TALENT,
  params: [intParam("nFeat")] as const,
  kotor(this: NWScriptInstance, nFeat) {
    return new GameState.TalentFeat(nFeat);
  },
});

export const TalentSkill = defineAction({
  id: 303,
  name: "TalentSkill",
  comment: "303: Create a Skill Talent.",
  returnType: NWScriptDataType.TALENT,
  params: [intParam("nSkill")] as const,
  kotor(this: NWScriptInstance, nSkill) {
    return new GameState.TalentSkill(nSkill);
  },
});

export const GetCreatureHasTalent = defineAction({
  id: 306,
  name: "GetCreatureHasTalent",
  comment: "306: Determine whether oCreature has tTalent.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    talentParam<TalentObject>("tTalent"),
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, tTalent, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).hasTalent(tTalent) ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const GetCreatureTalentRandom = defineAction({
  id: 307,
  name: "GetCreatureTalentRandom",
  comment: "307: Get a random talent of oCreature, within nCategory.",
  returnType: NWScriptDataType.TALENT,
  params: [
    intParam("nCategory"),
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nInclusion", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, nCategory, oCreature, nInclusion) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getRandomTalent(nCategory, nInclusion);
    }
    return undefined;
  },
});

export const GetCreatureTalentBest = defineAction({
  id: 308,
  name: "GetCreatureTalentBest",
  comment: "308: Get the best talent of oCreature within nCategory.",
  returnType: NWScriptDataType.TALENT,
  params: [
    intParam("nCategory"),
    intParam("nCRMax"),
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nInclusion", { optional: true, default: 0 }),
    intParam("nExcludeType", { optional: true, default: 0 }),
    intParam("nExcludeId", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, nCategory, nCRMax, oCreature, nInclusion, nExcludeType, nExcludeId) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getTalentBest(
        nCategory,
        nCRMax,
        nInclusion,
        nExcludeType,
        nExcludeId,
      );
    }

    console.warn("GetCreatureTalentBest called on non-creature object", oCreature, "of type", oCreature ? oCreature.type : typeof oCreature);
    return undefined;
  },
});

export const ActionUseTalentOnObject = defineAction({
  id: 309,
  name: "ActionUseTalentOnObject",
  comment: "309: Use tChosenTalent on oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [
    talentParam<TalentObject>("tChosenTalent"),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, tChosenTalent, oTarget) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).useTalent(tChosenTalent, oTarget);
    }
  },
});

export const GetIsTalentValid = defineAction({
  id: 359,
  name: "GetIsTalentValid",
  comment: "359: Returns TRUE if tTalent is valid.",
  returnType: NWScriptDataType.INTEGER,
  params: [talentParam<TalentObject | undefined>("tTalent", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, tTalent) {
    return typeof tTalent !== "undefined" && typeof tTalent === "object" && typeof tTalent.objectType !== "undefined"
      ? NW_TRUE
      : NW_FALSE;
  },
});

export const GetTypeFromTalent = defineAction({
  id: 362,
  name: "GetTypeFromTalent",
  comment: "362: Get the type (TALENT_TYPE_*) of tTalent.",
  returnType: NWScriptDataType.INTEGER,
  params: [talentParam<TalentObject | undefined>("tTalent", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, tTalent) {
    if (typeof tTalent === "object") {
      return tTalent.objectType || 0;
    }
    return 0;
  },
});

export const GetIdFromTalent = defineAction({
  id: 363,
  name: "GetIdFromTalent",
  comment: "363: Get the ID of tTalent.",
  returnType: NWScriptDataType.INTEGER,
  params: [talentParam<TalentObject | undefined>("tTalent", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, tTalent) {
    if (tTalent !== undefined) {
      return tTalent.id;
    }
    return 0;
  },
});

export const GetCategoryFromTalent = defineAction({
  id: 735,
  name: "GetCategoryFromTalent",
  comment: "735: Get the category of tTalent.",
  returnType: NWScriptDataType.INTEGER,
  params: [talentParam<TalentObject | undefined>("tTalent", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, tTalent) {
    if (typeof tTalent !== "undefined") {
      let category = parseInt(tTalent.category as any);
      if (isNaN(category)) category = -1;
      return category;
    }
    return -1;
  },
});

export const talentsActions = [
  TalentSpell,
  TalentFeat,
  TalentSkill,
  GetCreatureHasTalent,
  GetCreatureTalentRandom,
  GetCreatureTalentBest,
  ActionUseTalentOnObject,
  GetIsTalentValid,
  GetTypeFromTalent,
  GetIdFromTalent,
  GetCategoryFromTalent,
] as const;
