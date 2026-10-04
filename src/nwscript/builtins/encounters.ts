import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleEncounter, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const GetEncounterActive = defineAction({
  id: 276,
  name: "GetEncounterActive",
  comment: "276: Determine whether oEncounter is active.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      return (oEncounter as ModuleEncounter).active;
    }
    return undefined;
  },
});

export const SetEncounterActive = defineAction({
  id: 277,
  name: "SetEncounterActive",
  comment: "277: Set oEncounter's active state to nNewValue.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nNewValue"), objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, nNewValue, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      (oEncounter as ModuleEncounter).active = nNewValue ? 1 : 0;
    }
  },
});

export const GetEncounterSpawnsMax = defineAction({
  id: 278,
  name: "GetEncounterSpawnsMax",
  comment: "278: Get the maximum number of times that oEncounter will spawn.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      return (oEncounter as ModuleEncounter).maxCreatures;
    }
    return undefined;
  },
});

export const SetEncounterSpawnsMax = defineAction({
  id: 279,
  name: "SetEncounterSpawnsMax",
  comment: "279: Set the maximum number of times that oEncounter can spawn.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nMaxSpawns"), objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, nMaxSpawns, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      (oEncounter as ModuleEncounter).maxCreatures = nMaxSpawns;
    }
  },
});

export const GetEncounterSpawnsCurrent = defineAction({
  id: 280,
  name: "GetEncounterSpawnsCurrent",
  comment: "280: Get the number of times that oEncounter has spawned so far.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      return (oEncounter as ModuleEncounter).currentSpawns;
    }
    return undefined;
  },
});

export const SetEncounterSpawnsCurrent = defineAction({
  id: 281,
  name: "SetEncounterSpawnsCurrent",
  comment: "281: Set the number of times that oEncounter has spawned so far.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nCurrentSpawns"), objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, nCurrentSpawns, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      (oEncounter as ModuleEncounter).currentSpawns = nCurrentSpawns;
    }
  },
});

export const SetEncounterDifficulty = defineAction({
  id: 296,
  name: "SetEncounterDifficulty",
  comment: "296: Set the difficulty level of oEncounter.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nEncounterDifficulty"), objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, nEncounterDifficulty, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      (oEncounter as ModuleEncounter).difficultyIndex = nEncounterDifficulty;
    }
  },
});

export const GetEncounterDifficulty = defineAction({
  id: 297,
  name: "GetEncounterDifficulty",
  comment: "297: Get the difficulty level of oEncounter.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oEncounter", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oEncounter) {
    if (BitWise.InstanceOfObject(oEncounter, ModuleObjectType.ModuleEncounter)) {
      return (oEncounter as ModuleEncounter).difficultyIndex;
    }
    return undefined;
  },
});

export const encountersActions = [
  GetEncounterActive,
  SetEncounterActive,
  GetEncounterSpawnsMax,
  SetEncounterSpawnsMax,
  GetEncounterSpawnsCurrent,
  SetEncounterSpawnsCurrent,
  SetEncounterDifficulty,
  GetEncounterDifficulty,
] as const;
