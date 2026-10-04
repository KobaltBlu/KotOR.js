import { ModuleObjectScript, ModuleObjectType } from "@/enums";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, defineVariantAction, intParam, objectParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const Action768 = defineVariantAction({
  kind: "variant",
  id: 768,
  kotor: {
    name: "IsMoviePlaying",
    comment: "768: Check if a movie is currently playing.",
    returnType: NWScriptDataType.INTEGER,
    params: [],
    implementation: function(this: NWScriptInstance) {
      return GameState.VideoManager.isMoviePlaying() ? 1 : 0;
    },
  },
  tsl: {
    name: "GetScriptParameter",
    comment: "768: Return the script parameter at the given index.",
    returnType: NWScriptDataType.INTEGER,
    params: [intParam("nIndex")],
    implementation: function(this: NWScriptInstance, nIndex: number) {
      return parseInt(this.params[nIndex - 1] as any);
    },
  },
});

export const Action769 = defineVariantAction({
  kind: "variant",
  id: 769,
  kotor: {
    name: "QueueMovie",
    comment: "769: Queue a movie to be played using PlayMovieQueue.",
    returnType: NWScriptDataType.VOID,
    params: [stringParam("sMovie"), intParam("bSkippable")],
    implementation: function(this: NWScriptInstance, sMovie: string, bSkippable: number) {
      GameState.VideoManager.queueMovie(sMovie, bSkippable === 1);
    },
  },
  tsl: {
    name: "SetFadeUntilScript",
    comment: "769: Hold the fade until a call to SetGlobalFadeIn().",
    returnType: NWScriptDataType.VOID,
    params: [],
    implementation: function(this: NWScriptInstance) {
      GameState.FadeOverlayManager.holdForScript = true;
    },
  },
});

export const Action770 = defineVariantAction({
  kind: "variant",
  id: 770,
  kotor: {
    name: "PlayMovieQueue",
    comment: "770: Play the movies that have been added to the queue by QueueMovie.",
    returnType: NWScriptDataType.VOID,
    params: [intParam("bAllowSeparateSkips")],
    implementation: async function(this: NWScriptInstance, bAllowSeparateSkips: number) {
      await GameState.VideoManager.playMovieQueue();
    },
  },
  tsl: {
    name: "EffectForceBody",
    comment: "770: Create a Force Body effect.",
    returnType: NWScriptDataType.EFFECT,
    params: [intParam("nLevel")],
  },
});

export const Action771 = defineVariantAction({
  kind: "variant",
  id: 771,
  kotor: {
    name: "YavinHackCloseDoor",
    comment: "771: YavinHackCloseDoor.",
    returnType: NWScriptDataType.VOID,
    params: [objectParam<ModuleObject>("oDoor")],
  },
  tsl: {
    name: "GetItemComponent",
    comment: "771: Get the number of components for an item.",
    returnType: NWScriptDataType.INTEGER,
    params: [],
  },
});

export const GetScriptStringParameter = defineAction({
  availability: "tsl",
  id: 831,
  name: "GetScriptStringParameter",
  comment: "831: Return the one string parameter allowed for the currently running script.",
  returnType: NWScriptDataType.STRING,
  params: [] as const,
  tsl(this: NWScriptInstance) {
    return this.paramString;
  },
});

export const GetObjectPersonalSpace = defineAction({
  availability: "tsl",
  id: 832,
  name: "GetObjectPersonalSpace",
  comment: "832: Return the personal space value of an object.",
  returnType: NWScriptDataType.FLOAT,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return (oObject as ModuleCreature).getPersonalSpace();
    }
    return 0.0;
  },
});

export const IncrementGlobalNumber = defineAction({
  availability: "tsl",
  id: 799,
  name: "IncrementGlobalNumber",
  comment: "799: Increase the value of the given global number by the given amount.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("sIdentifier"), intParam("nAmount")] as const,
  tsl(this: NWScriptInstance, sIdentifier, nAmount) {
    if (typeof GameState.GlobalVariableManager.Globals.Number.has(sIdentifier.toLowerCase()) !== "undefined") {
      GameState.GlobalVariableManager.Globals.Number.get(sIdentifier.toLowerCase()).value += parseInt(nAmount as any);
    }
  },
});

export const DecrementGlobalNumber = defineAction({
  availability: "tsl",
  id: 800,
  name: "DecrementGlobalNumber",
  comment: "800: Decrease the value of the given global number by the given amount.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("sIdentifier"), intParam("nAmount")] as const,
  tsl(this: NWScriptInstance, sIdentifier, nAmount) {
    if (typeof GameState.GlobalVariableManager.Globals.Number.has(sIdentifier.toLowerCase()) !== "undefined") {
      GameState.GlobalVariableManager.Globals.Number.get(sIdentifier.toLowerCase()).value -= parseInt(nAmount as any);
    }
  },
});

export const GetOwnerDemolitionsSkill = defineAction({
  availability: "tsl",
  id: 793,
  name: "GetOwnerDemolitionsSkill",
  comment:
    "793: Returns the Demolitions skill of the creature that placed this mine.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.ownerDemolitions ?? 0;
    }
    return 0;
  },
});

export const IsMeditating = defineAction({
  availability: "tsl",
  id: 811,
  name: "IsMeditating",
  comment: "811: Determines if the given creature is using any Meditation Tree Force Power.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).animState == ModuleCreatureAnimState.MEDITATE ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const SetHealTarget = defineAction({
  availability: "tsl",
  id: 813,
  name: "SetHealTarget",
  comment: "813: Stores a Heal Target for the Healer AI script.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oHealer", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  tsl(this: NWScriptInstance, oHealer, oTarget) {
    if (BitWise.InstanceOfObject(oHealer, ModuleObjectType.ModuleObject)) {
      this.healTarget = oTarget;
    }
  },
});

export const GetHealTarget = defineAction({
  availability: "tsl",
  id: 814,
  name: "GetHealTarget",
  comment: "814: Retrieves the Heal Target for the Healer AI script.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oHealer", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, oHealer) {
    return this.healTarget;
  },
});

export const GetSpellFormMask = defineAction({
  availability: "tsl",
  id: 817,
  name: "GetSpellFormMask",
  comment: "817: Returns the Form Mask of the requested spell.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nSpell")] as const,
  tsl(this: NWScriptInstance, nSpell) {
    const spell = GameState.TwoDAManager.datatables.get("spells")?.rows[nSpell];
    if (!spell) {
      return 0;
    }
    return parseInt(spell.formmask as any) || 0;
  },
});

export const IsRunning = defineAction({
  availability: "tsl",
  id: 824,
  name: "IsRunning",
  comment: "824: Gets the walk state of the creature: 0 walk or standing, 1 is running.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).animState == ModuleCreatureAnimState.RUNNING ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const GetIsXBox = defineAction({
  availability: "tsl",
  id: 851,
  name: "GetIsXBox",
  comment: "851: Returns TRUE if this script is being executed on the X-Box.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  tsl(this: NWScriptInstance) {
    return NW_FALSE;
  },
});

export const GetIsPartyLeader = defineAction({
  availability: "tsl",
  id: 844,
  name: "GetIsPartyLeader",
  comment: "844: Return TRUE if the object passed is the character the player is actively controlling.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject === GameState.PartyManager.party[0] ? 1 : 0;
    }
    return 0;
  },
});

export const GetPartyLeader = defineAction({
  availability: "tsl",
  id: 845,
  name: "GetPartyLeader",
  comment: "845: Return the object ID of the party leader.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  tsl(this: NWScriptInstance) {
    return GameState.PartyManager.party[0];
  },
});

export const RemoveNPCFromPartyToBase = defineAction({
  availability: "tsl",
  id: 846,
  name: "RemoveNPCFromPartyToBase",
  comment: "846: Remove the CNPC from the 3-person party and send them back to base.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNPC")],
  tsl(this: NWScriptInstance, nNPC) {
    GameState.PartyManager.RemoveNPCById(nNPC, true);
    return 1;
  },
});

export const CreatureFlourishWeapon = defineAction({
  availability: "tsl",
  id: 847,
  name: "CreatureFlourishWeapon",
  comment: "847: Cause a creature to flourish with its currently equipped weapon.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oCreature")],
  tsl(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      (oCreature as ModuleCreature).flourish();
    }
  },
});

export const GetIsPlayerMadeCharacter = defineAction({
  availability: "tsl",
  id: 875,
  name: "GetIsPlayerMadeCharacter",
  comment: "875: Return TRUE if the object passed is the character the player made at the start of the game.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")],
  tsl(this: NWScriptInstance, oObject) {
    return BitWise.InstanceOfObject(oObject, ModuleObjectType.ModulePlayer) ? NW_TRUE : NW_FALSE;
  },
});

export const RemoveHeartbeat = defineAction({
  availability: "tsl",
  id: 866,
  name: "RemoveHeartbeat",
  comment: "866: Remove the heartbeat script on the placeable.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oPlaceable")],
  tsl(this: NWScriptInstance, oPlaceable) {
    if (BitWise.InstanceOfObject(oPlaceable, ModuleObjectType.ModulePlaceable)) {
      oPlaceable.scripts[ModuleObjectScript.PlaceableOnHeartbeat] = undefined;
    }
  },
});

export const PlayOverlayAnimation = defineAction({
  availability: "tsl",
  id: 854,
  name: "PlayOverlayAnimation",
  comment: "854: Play an overlay animation on a character even if the character is moving.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oObject"), intParam("nAnimation")],
  tsl(this: NWScriptInstance, oObject: ModuleObject, nAnimation: number) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      (oObject as ModuleCreature).playOverlayAnimation(nAnimation);
    }
  },
});

export const k2specialActions = [
  Action768,
  Action769,
  Action770,
  Action771,
  GetOwnerDemolitionsSkill,
  IsMeditating,
  SetHealTarget,
  GetHealTarget,
  GetSpellFormMask,
  IsRunning,
  GetScriptStringParameter,
  GetObjectPersonalSpace,
  IncrementGlobalNumber,
  DecrementGlobalNumber,
  GetIsPartyLeader,
  GetPartyLeader,
  RemoveNPCFromPartyToBase,
  CreatureFlourishWeapon,
  GetIsXBox,
  PlayOverlayAnimation,
  RemoveHeartbeat,
  GetIsPlayerMadeCharacter,
] as const;
