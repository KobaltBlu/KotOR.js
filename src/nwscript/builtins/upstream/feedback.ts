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
import { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #1: upstream-body-replaces-local-stub. */
export const PrintString: INWScriptDefAction = {
    comment: "1: Output sString to the log file.\n",
    name: "PrintString",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.STRING],
    action: function(this: NWScriptInstance, args: [string]){
      // console.log('PrintString', args[0]);
    }
  };

/** Upstream 002dfe03, action #4: upstream-body-replaces-local-stub. */
export const PrintInteger: INWScriptDefAction = {
    comment: "4: Output nInteger to the log file.\n",
    name: "PrintInteger",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number]){
      // console.log(args[0]);
    }
  };

/** Upstream 002dfe03, action #5: upstream-body-replaces-local-stub. */
export const PrintObject: INWScriptDefAction = {
    comment: "5: Output oObject's ID to the log file.\n",
    name: "PrintObject",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      // console.log(args[0]?.id);
    }
  };

/** Upstream 002dfe03, action #265: upstream-body-changed. */
export const ShowLevelUpGUI: INWScriptDefAction = {
    comment: "265: Brings up the level up GUI for the player.  The GUI will only show up\nif the player has gained enough experience points to level up.\n* Returns TRUE if the GUI was successfully brought up; FALSE if not.\n",
    name: "ShowLevelUpGUI",
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      GameState.MenuManager.MenuLevelUp.open();
      return;
    }
  };

/** Upstream 002dfe03, action #374: upstream-body-changed. */
export const SendMessageToPC: INWScriptDefAction = {
    comment: "374: Send a server message (szMessage) to the oPlayer.\n",
    name: "SendMessageToPC",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.STRING],
    action: function(this: NWScriptInstance, args: [ModuleObject, string]){
      const entry = new FeedbackMessageEntry();
      entry.message = args[1];
      entry.color = FeebackMessageColor.INFO;
      entry.type = 0;
      GameState.FeedbackMessageManager.AddEntry(entry);
    }
  };

/** Upstream 002dfe03, action #388: upstream-body-changed. */
export const PopUpGUIPanel: INWScriptDefAction = {
    comment: "388: Spawn a GUI panel for the client that controls oPC.\n- oPC\n- nGUIPanel: GUI_PANEL_*\n* Nothing happens if oPC is not a player character or if an invalid value is\nused for nGUIPanel.\n",
    name: "PopUpGUIPanel",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      switch(args[1]){
        case 0: //LEVEL UP
          GameState.MenuManager.MenuLevelUp.open();
        break;
        default:
          console.warn('PopUpGUIPanel: unhandled panel', args[1]);
        break;
      }
      return;
    }
  };

/** Upstream 002dfe03, action #525: upstream-body-changed. */
export const FloatingTextStrRefOnCreature: INWScriptDefAction = {
    comment: "525: Display floaty text above the specified creature.\nThe text will also appear in the chat buffer of each player that receives the\nfloaty text.\n- nStrRefToDisplay: String ref (therefore text is translated)\n- oCreatureToFloatAbove\n- bBroadcastToFaction: If this is TRUE then only creatures in the same faction\nas oCreatureToFloatAbove\nwill see the floaty text, and only if they are within range (30 metres).\n",
    name: "FloatingTextStrRefOnCreature",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number, ModuleObject, number]){
      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleCreature)) return;
      if(args[2] && GameState.PartyManager.party.indexOf(args[1] as ModuleCreature) == -1) return;
      const entry = new FeedbackMessageEntry();
      entry.message = GameState.TLKManager.GetStringById(args[0])?.Value || '';
      entry.color = FeebackMessageColor.INFO;
      entry.type = 0;
      GameState.FeedbackMessageManager.AddEntry(entry);
      return;
    }
  };

/** Upstream 002dfe03, action #526: upstream-body-changed. */
export const FloatingTextStringOnCreature: INWScriptDefAction = {
    comment: "526: Display floaty text above the specified creature.\nThe text will also appear in the chat buffer of each player that receives the\nfloaty text.\n- sStringToDisplay: String\n- oCreatureToFloatAbove\n- bBroadcastToFaction: If this is TRUE then only creatures in the same faction\nas oCreatureToFloatAbove\nwill see the floaty text, and only if they are within range (30 metres).\n",
    name: "FloatingTextStringOnCreature",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.STRING, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [string, ModuleObject, number]){
      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleCreature)) return;
      if(args[2] && GameState.PartyManager.party.indexOf(args[1] as ModuleCreature) == -1) return;
      const entry = new FeedbackMessageEntry();
      entry.message = args[0];
      entry.color = FeebackMessageColor.INFO;
      entry.type = 0;
      GameState.FeedbackMessageManager.AddEntry(entry);
      return;
    }
  };

/** Upstream 002dfe03, action #560: upstream-body-changed. */
export const WriteTimestampedLogEntry: INWScriptDefAction = {
    comment: "560: Write sLogEntry as a timestamped entry into the log file\n",
    name: "WriteTimestampedLogEntry",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.STRING],
    action: function(this: NWScriptInstance, args: [string]){
      console.log(`[${new Date().toISOString()}] ${args[0]}`);
      return;
    }
  };
