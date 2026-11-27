import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
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
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import { BitWise } from "@/utility/BitWise";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #112: upstream-body-changed. */
export const MagicalEffect: INWScriptDefAction = {
    comment: "112: Set the subtype of eEffect to Magical and return eEffect.\n(Effects default to magical if the subtype is not set)\n",
    name: "MagicalEffect",
    type: NWScriptDataType.EFFECT,
    args: [NWScriptDataType.EFFECT],
    action: function(this: NWScriptInstance, args: [GameEffect]){
      if(!args[0]) return undefined;
      args[0].setSubType(GameEffectSubType.MAGICAL);
      return args[0];
    }
  };

/** Upstream 002dfe03, action #113: upstream-body-changed. */
export const SupernaturalEffect: INWScriptDefAction = {
    comment: "113: Set the subtype of eEffect to Supernatural and return eEffect.\n(Effects default to magical if the subtype is not set)\n",
    name: "SupernaturalEffect",
    type: NWScriptDataType.EFFECT,
    args: [NWScriptDataType.EFFECT],
    action: function(this: NWScriptInstance, args: [GameEffect]){
      if(!args[0]) return undefined;
      args[0].setSubType(GameEffectSubType.SUPERNATURAL);
      return args[0];
    }
  };

/** Upstream 002dfe03, action #114: upstream-body-changed. */
export const ExtraordinaryEffect: INWScriptDefAction = {
    comment: "114: Set the subtype of eEffect to Extraordinary and return eEffect.\n(Effects default to magical if the subtype is not set)\n",
    name: "ExtraordinaryEffect",
    type: NWScriptDataType.EFFECT,
    args: [NWScriptDataType.EFFECT],
    action: function(this: NWScriptInstance, args: [GameEffect]){
      if(!args[0]) return undefined;
      args[0].setSubType(GameEffectSubType.EXTRAORDINARY);
      return args[0];
    }
  };

/** Upstream 002dfe03, action #130: upstream-body-changed. */
export const EffectEntangle: INWScriptDefAction = {
    comment: "130: Create an Entangle effect\nWhen applied, this effect will restrict the creature's movement and apply a\n(-2) to all attacks and a -4 to AC.\n",
    name: "EffectEntangle",
    type: NWScriptDataType.EFFECT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      const effect = new GameState.GameEffectFactory.EffectEntangle();
      effect.setCreator(this.caller);
      effect.setSpellId(this.getSpellId());
      return effect.initialize();
    }
  };

/** Upstream 002dfe03, action #465: upstream-body-changed. */
export const EffectTrueSeeing: INWScriptDefAction = {
    comment: "465: Create a True Seeing effect.\n",
    name: "EffectTrueSeeing",
    type: NWScriptDataType.EFFECT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      let effect = new GameState.GameEffectFactory.EffectTrueSeeing();
      effect.setCreator(this.caller);
      effect.setSpellId(this.getSpellId());
      return effect.initialize();
    }
  };

/** Upstream 002dfe03, action #543: upstream-body-changed. */
export const GetHasFeatEffect: INWScriptDefAction = {
    comment: "543: - nFeat: FEAT_*\n- oObject\n* Returns TRUE if oObject has effects on it originating from nFeat.\n",
    name: "GetHasFeatEffect",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [number, ModuleObject]){
      if(BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleCreature)){
        const feats = (args[1] as ModuleCreature).getFeats() || [];
        for(let i = 0, len = feats.length; i < len; i++){
          if((feats[i] as any)?.id == args[0]){
            return NW_TRUE;
          }
        }
      }
      return NW_FALSE;
    }
  };
