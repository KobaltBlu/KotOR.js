import { ActionParameterType } from "@/enums/actions/ActionParameterType";
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

/** Upstream 002dfe03, action #84: upstream-body-changed. */
export const GetCasterLevel: INWScriptDefAction = {
    comment: "84: Get the Caster Level of oCreature.\n* Return value on error: 0;\n",
    name: "GetCasterLevel",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return (args[0] as ModuleCreature).getTotalClassLevel();
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #211: upstream-body-changed. */
export const GetGoingToBeAttackedBy: INWScriptDefAction = {
    comment: "211: Get the creature that is going to attack oTarget.\nNote: This value is cleared out at the end of every combat round and should\nnot be used in any case except when getting a 'going to be attacked' shout\nfrom the master creature (and this creature is a henchman)\n* Returns OBJECT_INVALID if oTarget is not a valid creature.\n",
    name: "GetGoingToBeAttackedBy",
    type: NWScriptDataType.OBJECT,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return (args[0] as ModuleCreature).combatData?.lastAttemptedAttackTarget || undefined;
      }
      return undefined;
    }
  };

/** Upstream 002dfe03, action #389: upstream-body-changed. */
export const AddMultiClass: INWScriptDefAction = {
    comment: "389: This allows you to add a new class to any creature object\n",
    name: "AddMultiClass",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [number, ModuleObject]){
      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleCreature)) return;
      const creature = args[1] as ModuleCreature;
      const classes: any[] = (creature as any).classes || [];
      for(let i = 0, len = classes.length; i < len; i++){
        if(classes[i].id == args[0]) return;
      }
      classes.push({ id: args[0], level: 1, spells: [] });
      return;
    }
  };

/** Upstream 002dfe03, action #476: upstream-body-changed. */
export const SurrenderToEnemies: INWScriptDefAction = {
    comment: "476: Use this on an NPC to cause all creatures within a 10-metre radius to stop\nwhat they are doing and sets the NPC's enemies within this range to be\nneutral towards the NPC. If this command is run on a PC or an object that is\nnot a creature, nothing will happen.\n",
    name: "SurrenderToEnemies",
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      if(!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)){
        return;
      }
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModulePlayer)){
        return;
      }

      const caller = this.caller as ModuleCreature;
      const creatures = GameState.module.area.creatures;
      for(let i = 0; i < creatures.length; i++){
        const creature = creatures[i];
        if(creature === caller) continue;
        const dx = creature.position.x - caller.position.x;
        const dy = creature.position.y - caller.position.y;
        if(dx * dx + dy * dy > 100) continue; // 10m radius = 100 sq
        if(creature.isHostile(caller)){
          creature.clearAllActions();
          creature.clearAllEffects();
          GameState.FactionManager.SetFactionReputation(caller, creature, 50);
        }
      }
    }
  };

/** Upstream 002dfe03, action #491: upstream-body-changed. */
export const GetFortitudeSavingThrow: INWScriptDefAction = {
    comment: "491: Get oTarget's base fortitude saving throw value (this will only work for\ncreatures, doors, and placeables).\n* Returns 0 if oTarget is invalid.\n",
    name: "GetFortitudeSavingThrow",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return (args[0] as any).fortitudeSaveThrow || 0;
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #492: upstream-body-changed. */
export const GetWillSavingThrow: INWScriptDefAction = {
    comment: "492: Get oTarget's base will saving throw value (this will only work for creatures,\ndoors, and placeables).\n* Returns 0 if oTarget is invalid.\n",
    name: "GetWillSavingThrow",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return (args[0] as any).willSaveThrow || 0;
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #493: upstream-body-changed. */
export const GetReflexSavingThrow: INWScriptDefAction = {
    comment: "493: Get oTarget's base reflex saving throw value (this will only work for\ncreatures, doors, and placeables).\n* Returns 0 if oTarget is invalid.\n",
    name: "GetReflexSavingThrow",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return (args[0] as any).reflexSaveThrow || 0;
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #494: upstream-body-changed. */
export const GetChallengeRating: INWScriptDefAction = {
    comment: "494: Get oCreature's challenge rating.\n* Returns 0.0 if oCreature is invalid.\n",
    name: "GetChallengeRating",
    type: NWScriptDataType.FLOAT,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return (args[0] as ModuleCreature).challengeRating;
      }
      return 0.0;
    }
  };

/** Upstream 002dfe03, action #496: upstream-body-changed. */
export const GetMovementRate: INWScriptDefAction = {
    comment: "496: Get oCreature's movement rate.\n* Returns 0 if oCreature is invalid.\n",
    name: "GetMovementRate",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return (args[0] as ModuleCreature).walkRate;
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #500: upstream-body-changed. */
export const DuplicateHeadAppearance: INWScriptDefAction = {
    comment: "500:\n",
    name: "DuplicateHeadAppearance",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject, ModuleObject]){
      if(!BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)) return;
      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleCreature)) return;
      (args[0] as any).appearance = (args[1] as any).appearance;
      return;
    }
  };

/** Upstream 002dfe03, action #501: upstream-body-changed. */
export const ActionCastFakeSpellAtObject: INWScriptDefAction = {
    comment: "501: The action subject will fake casting a spell at oTarget; the conjure and cast\nanimations and visuals will occur, nothing else.\n- nSpell\n- oTarget\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n",
    name: "ActionCastFakeSpellAtObject",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number, ModuleObject, number]){
      if(!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)){
        return;
      }
      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleObject)){
        return;
      }

      const action = new GameState.ActionFactory.ActionCastSpell();
      action.setParameter(0, ActionParameterType.INT, args[0]); //Spell Id
      action.setParameter(1, ActionParameterType.INT, -1); //Cheat enabled
      action.setParameter(2, ActionParameterType.INT, 0); //DomainLevel
      action.setParameter(3, ActionParameterType.INT, 0);
      action.setParameter(4, ActionParameterType.INT, 0);
      action.setParameter(5, ActionParameterType.DWORD, args[1].id); //Target Object
      action.setParameter(6, ActionParameterType.FLOAT, args[1].position.x);
      action.setParameter(7, ActionParameterType.FLOAT, args[1].position.y);
      action.setParameter(8, ActionParameterType.FLOAT, args[1].position.z);
      action.setParameter(9, ActionParameterType.INT, args[2] || 0); //ProjectilePath
      action.setParameter(10, ActionParameterType.INT, -1);
      action.setParameter(11, ActionParameterType.INT, -1);
      this.caller.actionQueue.add(action);
    }
  };

/** Upstream 002dfe03, action #542: upstream-body-changed. */
export const GetPCLevellingUp: INWScriptDefAction = {
    comment: "542: Get the last PC that levelled up.\n",
    name: "GetPCLevellingUp",
    type: NWScriptDataType.OBJECT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      const player = GameState.PartyManager.party[0];
      if(player && player.canLevelUp()){
        return player;
      }
      return undefined;
    }
  };

/** Upstream 002dfe03, action #736: upstream-body-replaces-local-stub. */
export const SurrenderByFaction: INWScriptDefAction = {
    comment: "736: This affects all creatures in the area that are in faction nFactionFrom...\n- Makes them join nFactionTo\n- Clears all actions\n- Disables combat mode\n",
    name: "SurrenderByFaction",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number, number]){
      //TODO move all creatures from current faction to target faction
      //TODO clear all actions 
      //TODO clear combat
    }
  };

/** Upstream 002dfe03, action #737: upstream-body-replaces-local-stub. */
export const ChangeFactionByFaction: INWScriptDefAction = {
    comment: "737: This affects all creatures in the area that are in faction nFactionFrom.\nmaking them change to nFactionTo\n",
    name: "ChangeFactionByFaction",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number, number]){
      //TODO move all creatures from current faction to target faction
    }
  };

/** Upstream 002dfe03, action #762: upstream-body-changed. */
export const SurrenderRetainBuffs: INWScriptDefAction = {
    comment: "762: SurrenderRetainBuffs()\nThis will do the same as SurrenderToEnemies, except that affected creatures will not\nlose effects which they have put on themselves\n",
    name: "SurrenderRetainBuffs",
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      if(!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)){
        return;
      }
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModulePlayer)){
        return;
      }

      const caller = this.caller as ModuleCreature;
      const creatures = GameState.module.area.creatures;
      for(let i = 0; i < creatures.length; i++){
        const creature = creatures[i];
        if(creature === caller) continue;
        const dx = creature.position.x - caller.position.x;
        const dy = creature.position.y - caller.position.y;
        if(dx * dx + dy * dy > 100) continue; // 10m radius = 100 sq
        if(creature.isHostile(caller)){
          creature.clearAllActions();
          // Unlike SurrenderToEnemies, do NOT clear effects
          GameState.FactionManager.SetFactionReputation(caller, creature, 50);
        }
      }
    }
  };
