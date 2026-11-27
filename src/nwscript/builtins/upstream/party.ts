import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #572: upstream-body-changed. */
export const AddToParty: INWScriptDefAction = {
    comment: "572: Add oPC to oPartyLeader's party.  This will only work on two PCs.\n- oPC: player to add to a party\n- oPartyLeader: player already in the party\n",
    name: "AddToParty",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject, ModuleObject]){
      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleCreature)) return;
      const creature = args[1] as ModuleCreature;
      const npcId = (creature as any).npcId ?? -1;
      if(npcId >= 0){
        GameState.PartyManager.AddAvailableNPCByObject(npcId, creature);
      }
      return;
    }
  };

/** Upstream 002dfe03, action #573: upstream-body-changed. */
export const RemoveFromParty: INWScriptDefAction = {
    comment: "573: Remove oPC from their current party. This will only work on a PC.\n- oPC: removes this player from whatever party they're currently in.\n",
    name: "RemoveFromParty",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(!BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)) return;
      const npcId = (args[0] as any).npcId ?? -1;
      if(npcId >= 0){
        GameState.PartyManager.RemoveNPCById(npcId);
      }
      return;
    }
  };

/** Upstream 002dfe03, action #767: upstream-body-changed. */
export const SetAvailableNPCId: INWScriptDefAction = {
    comment: "767. SetAvailableNPCId\nThis will set the object id that should be used for a specific available NPC\n",
    name: "SetAvailableNPCId",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [number, ModuleObject]){
      const npc = GameState.PartyManager.NPCS[args[0]];
      if(!npc){
        return;
      }
      if(BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleCreature)){
        npc.moduleObject = args[1] as ModuleCreature;
      }
    }
  };
