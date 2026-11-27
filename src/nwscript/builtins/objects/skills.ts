import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const GetHasFeat = defineAction({
  id: 285,
  name: "GetHasFeat",
  comment: "285: Determine whether oCreature has nFeat, and nFeat is useable.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nFeat"),
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nFeat, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getHasFeat(nFeat) ? 1 : 0;
    }
    return 0;
  },
});

export const GetHasSkill = defineAction({
  id: 286,
  name: "GetHasSkill",
  comment: "286: Determine whether oCreature has nSkill, and nSkill is useable.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nSkill"),
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nSkill, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      const creature = oCreature as ModuleCreature;
      const skill = creature.skills?.[nSkill];
      if (!skill) {
        return 0;
      }

      return (skill.rank > 0 || skill.untrained) ? 1 : 0;
    }
    return 0;
  },
});

export const GetSkillRank = defineAction({
  id: 315,
  name: "GetSkillRank",
  comment: "315: Get the number of ranks that oTarget has in nSkill.\n* Returns -1 if oTarget doesn't have nSkill.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nSkill"),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nSkill, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleCreature)) {
      return oTarget.getSkillLevel(nSkill);
    }
    return 0;
  },
});

export const GetSubRace = defineAction({
  id: 497,
  name: "GetSubRace",
  comment: "497: GetSubRace of oCreature. Returns SUBRACE_*",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (!BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) return 0;
    return (oCreature as ModuleCreature).getSubRace();
  },
});

export const GetAppearanceType = defineAction({
  id: 524,
  name: "GetAppearanceType",
  comment: "524: Returns the appearance type of oCreature (0 if creature doesn't exist).",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return oCreature.appearance;
    }
    return 0;
  },
});

export const skillsObjectActions = [
  GetHasFeat,
  GetHasSkill,
  GetSkillRank,
  GetSubRace,
  GetAppearanceType,
] as const;
