import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { CreatureClassType } from "@/enums/nwscript/CreatureClassType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { CombatRound } from "@/combat/CombatRound";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const GetCurrentForcePoints = defineAction({
  id: 55,
  name: "GetCurrentForcePoints",
  comment: "55: Return the current force points for the creature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getFP();
    }
    return 0;
  },
});

export const GetMaxForcePoints = defineAction({
  id: 56,
  name: "GetMaxForcePoints",
  comment: "56: Return the max force points for the creature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getMaxFP();
    }
    return 0;
  },
});

export const GetRacialType = defineAction({
  id: 107,
  name: "GetRacialType",
  comment: "107: Get the racial type of oCreature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (typeof oCreature === "undefined") {
      return undefined;
    }
    return oCreature.getRace();
  },
});

export const GetGoodEvilValue = defineAction({
  id: 125,
  name: "GetGoodEvilValue",
  comment: "125: Get the good/evil alignment value of oCreature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleCreature | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (typeof oCreature === "undefined") return -1;
    return oCreature.getGoodEvil();
  },
});

export const GetAlignmentGoodEvil = defineAction({
  id: 127,
  name: "GetAlignmentGoodEvil",
  comment: "127: Return an ALIGNMENT_* constant representing oCreature's good/evil alignment.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleCreature>("oCreature")] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (oCreature.getGoodEvil() < 25) return 3;
    if (oCreature.getGoodEvil() < 75) return 0;
    return 2;
  },
});

export const GetHitDice = defineAction({
  id: 166,
  name: "GetHitDice",
  comment: "166: Get the number of hit dice for oCreature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getTotalClassLevel();
    }
    return 0;
  },
});

export const GetAbilityModifier = defineAction({
  id: 331,
  name: "GetAbilityModifier",
  comment: "331: Get oCreature's ability modifier for nAbility.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nAbility"), objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, nAbility, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      const creature = oCreature as ModuleCreature;
      switch (nAbility) {
        case 0: return CombatRound.GetMod(creature.getSTR());
        case 1: return CombatRound.GetMod(creature.getDEX());
        case 2: return CombatRound.GetMod(creature.getCON());
        case 3: return CombatRound.GetMod(creature.getINT());
        case 4: return CombatRound.GetMod(creature.getWIS());
        case 5: return CombatRound.GetMod(creature.getCHA());
      }
    }
    return 0;
  },
});

export const GetGender = defineAction({
  id: 358,
  name: "GetGender",
  comment: "358: Get the gender of oCreature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleCreature>("oCreature")] as const,
  kotor(this: NWScriptInstance, oCreature) {
    return oCreature.getGender();
  },
});

export const GetCreatureSize = defineAction({
  id: 479,
  name: "GetCreatureSize",
  comment: "479: Get the size of oCreature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getAppearance().sizecategory;
    }
    return undefined;
  },
});

export const GetClassByPosition = defineAction({
  id: 341,
  name: "GetClassByPosition",
  comment: "341: Determine the creature's class by class position.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nClassPosition"), objectParam<ModuleCreature>("oCreature")] as const,
  kotor(this: NWScriptInstance, nClassPosition, oCreature) {
    switch (nClassPosition) {
      case 1: return oCreature.classes[0]?.id || CreatureClassType.INVALID;
      case 2: return oCreature.classes[1]?.id || CreatureClassType.INVALID;
      case 3: return oCreature.classes[2]?.id || CreatureClassType.INVALID;
    }
    return CreatureClassType.INVALID;
  },
});

export const GetLevelByPosition = defineAction({
  id: 342,
  name: "GetLevelByPosition",
  comment: "342: Determine the creature's class level by class position.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nClassPosition"), objectParam<ModuleCreature>("oCreature")] as const,
  kotor(this: NWScriptInstance, nClassPosition, oCreature) {
    switch (nClassPosition) {
      case 1: return oCreature.classes[0]?.level || 0;
      case 2: return oCreature.classes[1]?.level || 0;
      case 3: return oCreature.classes[2]?.level || 0;
    }
    return 0;
  },
});

export const GetLevelByClass = defineAction({
  id: 343,
  name: "GetLevelByClass",
  comment: "343: Determine the levels that oCreature holds in nClassType.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nClassType"), objectParam<ModuleCreature>("oCreature")] as const,
  kotor(this: NWScriptInstance, nClassType, oCreature) {
    return oCreature.getClassLevel(nClassType);
  },
});

export const SetGoodEvilValue = defineAction({
  id: 750,
  name: "SetGoodEvilValue",
  comment: "750: Set oCreature's alignment value.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleCreature>("oCreature"), intParam("nAlignmentValue")] as const,
  kotor(this: NWScriptInstance, oCreature, nAlignmentValue) {
    let value = nAlignmentValue;
    if (value > 100) value = 100;
    if (value < 0) value = 0;
    if (oCreature) oCreature.setGoodEvil(value);
  },
});

export const GetIsPoisoned = defineAction({
  id: 751,
  name: "GetIsPoisoned",
  comment: "751: Return TRUE if the object specified is poisoned.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return oObject.isPoisoned();
    }
    return 0;
  },
});

export const creaturesActions = [
  GetCurrentForcePoints,
  GetMaxForcePoints,
  GetRacialType,
  GetGoodEvilValue,
  GetAlignmentGoodEvil,
  GetHitDice,
  GetAbilityModifier,
  GetGender,
  GetCreatureSize,
  GetClassByPosition,
  GetLevelByPosition,
  GetLevelByClass,
  SetGoodEvilValue,
  GetIsPoisoned,
] as const;
