import * as THREE from "three";
import type EngineLocation from "@/engine/EngineLocation";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import type { OdysseyModel3D } from "@/three/odyssey";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, locationParam, objectParam } from "@/nwscript/builtins/actionBuilder";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const SetPartyLeader = defineAction({
  id: 13,
  name: "SetPartyLeader",
  comment: "13: Set which party member should be the controlled character.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId) {
    const pm = GameState.PartyManager.GetPMByNPCId(nNPCId);
    if (!pm) {
      return NW_FALSE;
    }

    return GameState.PartyManager.party.unshift(
      GameState.PartyManager.party.splice(
        GameState.PartyManager.party.indexOf(pm),
        1,
      )[0],
    )
      ? NW_TRUE
      : NW_FALSE;
  },
});

export const GetPartyMemberCount = defineAction({
  id: 126,
  name: "GetPartyMemberCount",
  comment: "126: Return a count of how many members are in the party including the player character.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,

  kotor(this: NWScriptInstance) {
    return GameState.PartyManager.party.length;
  },
});

export const AddPartyMember = defineAction({
  id: 574,
  name: "AddPartyMember",
  comment: "574: Add a creature to the party.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      GameState.PartyManager.AddCreatureToParty(nNPCId, oCreature as ModuleCreature);
      return NW_TRUE;
    }

    return NW_FALSE;
  },
});

export const RemovePartyMember = defineAction({
  id: 575,
  name: "RemovePartyMember",
  comment: "575: Remove a creature from the party.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId) {
    GameState.PartyManager.RemoveNPCById(nNPCId, true);
    return 0;
  },
});

export const IsObjectPartyMember = defineAction({
  id: 576,
  name: "IsObjectPartyMember",
  comment: "576: Return whether a specified creature is a party member.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleCreature>("oCreature"),
  ] as const,

  kotor(this: NWScriptInstance, oCreature) {
    return GameState.PartyManager.party.indexOf(oCreature) >= 0 || oCreature === GameState.PartyManager.Player
      ? NW_TRUE
      : NW_FALSE;
  },
});

export const GetPartyMemberByIndex = defineAction({
  id: 577,
  name: "GetPartyMemberByIndex",
  comment: "577: Return the party member at a given index in the party.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    intParam("nIndex"),
  ] as const,

  kotor(this: NWScriptInstance, nIndex) {
    return GameState.PartyManager.party[nIndex];
  },
});

export const AddAvailableNPCByObject = defineAction({
  id: 694,
  name: "AddAvailableNPCByObject",
  comment: "694: Add an NPC to the list of available party members using a game object as the template.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
    objectParam<ModuleObject>("oCreature"),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId, oCreature) {
    return GameState.PartyManager.AddAvailableNPCByObject(nNPCId, oCreature as ModuleCreature)
      ? NW_TRUE
      : NW_FALSE;
  },
});

export const RemoveAvailableNPC = defineAction({
  id: 695,
  name: "RemoveAvailableNPC",
  comment: "695: Remove an NPC from the list of available party members.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId) {
    GameState.PartyManager.RemoveAvailableNPC(nNPCId);
    return NW_TRUE;
  },
});

export const IsAvailableCreature = defineAction({
  id: 696,
  name: "IsAvailableCreature",
  comment: "696: Return whether an NPC is in the list of available party members.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId) {
    return GameState.PartyManager.IsAvailable(nNPCId) ? NW_TRUE : NW_FALSE;
  },
});

export const AddAvailableNPCByTemplate = defineAction({
  id: 697,
  name: "AddAvailableNPCByTemplate",
  comment: "697: Add an NPC to the list of available party members using a template.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
    objectParam<string>("sTemplate", { type: NWScriptDataType.STRING } as any),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId, sTemplate) {
    return GameState.PartyManager.AddAvailableNPCByTemplate(nNPCId, sTemplate)
      ? NW_TRUE
      : NW_FALSE;
  },
});

export const SpawnAvailableNPC = defineAction({
  id: 698,
  name: "SpawnAvailableNPC",
  comment: "698: Spawn an NPC from the list of available creatures.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    intParam("nNPCId"),
    locationParam<EngineLocation>("lLocation"),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId, lLocation) {
    const template = GameState.PartyManager.NPCS[nNPCId]?.template;
    if (!template) {
      return undefined;
    }

    const partyMember = new GameState.Module.ModuleArea.ModuleCreature(template);
    lLocation.area.attachObject(partyMember);
    partyMember.load();
    partyMember.clearAllActions();

    partyMember.loadModel().then((model: OdysseyModel3D) => {
      partyMember.model.userData.moduleObject = partyMember;
      partyMember.setPosition(lLocation.position);
      partyMember.setFacing(lLocation.getFacing(), true);
      partyMember.box = new THREE.Box3().setFromObject(partyMember.container);
      model.hasCollision = true;
      GameState.group.creatures.add(partyMember.container);
      partyMember.getCurrentRoom();
      partyMember.onSpawn();
    });

    return partyMember;
  },
});

export const IsNPCPartyMember = defineAction({
  id: 699,
  name: "IsNPCPartyMember",
  comment: "699: Return whether a given NPC constant is currently in the party.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nNPCId"),
  ] as const,

  kotor(this: NWScriptInstance, nNPCId) {
    return GameState.PartyManager.IsNPCInParty(nNPCId) ? NW_TRUE : NW_FALSE;
  },
});

export const partyActions = [
  SetPartyLeader,
  GetPartyMemberCount,
  AddPartyMember,
  RemovePartyMember,
  IsObjectPartyMember,
  GetPartyMemberByIndex,
  AddAvailableNPCByObject,
  RemoveAvailableNPC,
  IsAvailableCreature,
  AddAvailableNPCByTemplate,
  SpawnAvailableNPC,
  IsNPCPartyMember,
] as const;
