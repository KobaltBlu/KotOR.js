import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const GetReputation = defineAction({
  id: 208,
  name: "GetReputation",
  comment: "208: Get how oSource feels about oTarget.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oSource", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oSource, oTarget) {
    if (
      BitWise.InstanceOfObject(oSource, ModuleObjectType.ModuleCreature) &&
      BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleCreature)
    ) {
      return GameState.FactionManager.GetReputation(oSource, oTarget);
    }
    return -1;
  },
});

export const AdjustReputation = defineAction({
  id: 209,
  name: "AdjustReputation",
  comment: "209: Adjust how oSourceFactionMember's faction feels about oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oSourceFactionMember"),
    objectParam<ModuleObject>("oTarget"),
    intParam("nAdjustment"),
  ] as const,
  kotor(this: NWScriptInstance, oSourceFactionMember, oTarget, nAdjustment) {
    GameState.FactionManager.AdjustFactionReputation(oSourceFactionMember, oTarget, nAdjustment);
  },
});

export const GetFactionEqual = defineAction({
  id: 172,
  name: "GetFactionEqual",
  comment: "172: Return TRUE if the faction IDs of the two objects are the same.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oFirst", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oSecond", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oFirst, oSecond) {
    if (
      BitWise.InstanceOfObject(oFirst, ModuleObjectType.ModuleCreature) &&
      BitWise.InstanceOfObject(oSecond, ModuleObjectType.ModuleCreature)
    ) {
      return oFirst.faction === oSecond.faction;
    }
    return false;
  },
});

export const ChangeFaction = defineAction({
  id: 173,
  name: "ChangeFaction",
  comment: "173: Make oObjectToChangeFaction join the faction of oMemberOfFactionToJoin.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oObjectToChangeFaction"),
    objectParam<ModuleObject>("oMemberOfFactionToJoin"),
  ] as const,
  kotor(this: NWScriptInstance, oObjectToChangeFaction, oMemberOfFactionToJoin) {
    if (
      BitWise.InstanceOfObject(oObjectToChangeFaction, ModuleObjectType.ModuleCreature) &&
      BitWise.InstanceOfObject(oMemberOfFactionToJoin, ModuleObjectType.ModuleCreature)
    ) {
      oObjectToChangeFaction.faction = oMemberOfFactionToJoin.faction;
      GameState.FactionManager.AddCreatureToFaction(oObjectToChangeFaction);
    }
  },
});

export const GetFactionWeakestMember = defineAction({
  id: 181,
  name: "GetFactionWeakestMember",
  comment: "181: Get the weakest member of oFactionMember's faction.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oFactionMember, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getWeakestMember(!!bPlayerCharactersOnly);
    }
    return undefined;
  },
});

export const GetFactionStrongestMember = defineAction({
  id: 182,
  name: "GetFactionStrongestMember",
  comment: "182: Get the strongest member of oFactionMember's faction.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oFactionMember, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getStrongestMember(!!bPlayerCharactersOnly);
    }
    return undefined;
  },
});

export const GetFactionGold = defineAction({
  id: 185,
  name: "GetFactionGold",
  comment: "185: Get the amount of gold held by oFactionMember's faction.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oFactionMember) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getMemberGold();
    }
    return -1;
  },
});

export const GetFactionAverageReputation = defineAction({
  id: 186,
  name: "GetFactionAverageReputation",
  comment: "186: Get how oSourceFactionMember's faction feels about oTarget.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oSourceFactionMember", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oSourceFactionMember, oTarget) {
    if (BitWise.InstanceOfObject(oSourceFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oSourceFactionMember);
      if (faction) return faction.getAverageReputation(oTarget);
    }
    return -1;
  },
});

export const GetFactionLeader = defineAction({
  id: 562,
  name: "GetFactionLeader",
  comment: "562: Get the leader of the faction of which oMemberOfFaction is a member.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oMemberOfFaction", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oMemberOfFaction) {
    return GameState.FactionManager.GetFactionLeader(oMemberOfFaction);
  },
});

export const GetFactionMostDamagedMember = defineAction({
  id: 183,
  name: "GetFactionMostDamagedMember",
  comment: "183: Get the member of oFactionMember's faction that has taken the most hit points of damage.\n* Returns OBJECT_INVALID if oFactionMember's faction is invalid.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, oFactionMember, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getMostDamagedMember(!!bPlayerCharactersOnly);
    }
    return undefined;
  },
});

export const GetFactionLeastDamagedMember = defineAction({
  id: 184,
  name: "GetFactionLeastDamagedMember",
  comment: "184: Get the member of oFactionMember's faction that has taken the fewest hit points of damage.\n* Returns OBJECT_INVALID if oFactionMember's faction is invalid.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, oFactionMember, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getLeastDamagedMember(!!bPlayerCharactersOnly);
    }
    return undefined;
  },
});

export const GetFactionAverageGoodEvilAlignment = defineAction({
  id: 187,
  name: "GetFactionAverageGoodEvilAlignment",
  comment: "187: Get an integer between 0 and 100 (inclusive) that represents the average good/evil alignment of oFactionMember's faction.\n* Return value on error: -1",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oFactionMember) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getAverageGoodEvilAlignment();
    }
    return -1;
  },
});

export const GetFactionAverageLevel = defineAction({
  id: 189,
  name: "GetFactionAverageLevel",
  comment: "189: Get the average level of the members of the faction.\n* Return value on error: -1",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oFactionMember) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getAverageLevel();
    }
    return -1;
  },
});

export const GetFactionAverageXP = defineAction({
  id: 190,
  name: "GetFactionAverageXP",
  comment: "190: Get the average XP of the members of the faction.\n* Return value on error: -1",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oFactionMember) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getAverageExperience();
    }
    return -1;
  },
});

export const GetFactionMostFrequentClass = defineAction({
  id: 191,
  name: "GetFactionMostFrequentClass",
  comment: "191: Get the most frequent class in the faction.\n* Return value on error: -1",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oFactionMember) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getMostFrequestClass();
    }
    return -1;
  },
});

export const GetFactionWorstAC = defineAction({
  id: 192,
  name: "GetFactionWorstAC",
  comment: "192: Get the object faction member with the lowest armour class.\n* Returns OBJECT_INVALID if oFactionMember's faction is invalid.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, oFactionMember, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getWorstACMember(!!bPlayerCharactersOnly);
    }
    return undefined;
  },
});

export const GetFactionBestAC = defineAction({
  id: 193,
  name: "GetFactionBestAC",
  comment: "193: Get the object faction member with the highest armour class.\n* Returns OBJECT_INVALID if oFactionMember's faction is invalid.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oFactionMember", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, oFactionMember, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oFactionMember, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oFactionMember);
      if (faction) return faction.getBestACMember(!!bPlayerCharactersOnly);
    }
    return undefined;
  },
});

export const factionActions = [
  GetReputation,
  AdjustReputation,
  GetFactionEqual,
  ChangeFaction,
  GetFactionWeakestMember,
  GetFactionStrongestMember,
  GetFactionGold,
  GetFactionAverageReputation,
  GetFactionLeader,
  GetFactionMostDamagedMember,
  GetFactionLeastDamagedMember,
  GetFactionAverageGoodEvilAlignment,
  GetFactionAverageLevel,
  GetFactionAverageXP,
  GetFactionMostFrequentClass,
  GetFactionWorstAC,
  GetFactionBestAC,
] as const;