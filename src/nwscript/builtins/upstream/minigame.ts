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

/** Upstream 002dfe03, action #521: upstream-body-changed. */
export const SWMG_GetLateralAccelerationPerSecond: INWScriptDefAction = {
    comment: "521: Returns the minigame lateral acceleration/sec value\n",
    name: "SWMG_GetLateralAccelerationPerSecond",
    type: NWScriptDataType.FLOAT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return GameState.module?.area?.miniGame?.player?.accel_lateral_secs ?? 0.0;
    }
  };

/** Upstream 002dfe03, action #563: upstream-body-replaces-local-stub. */
export const SWMG_SetSpeedBlurEffect: INWScriptDefAction = {
    comment: "563: Turns on or off the speed blur effect in rendered scenes.\nbEnabled: Set TRUE to turn it on, FALSE to turn it off.\nfRatio: Sets the frame accumulation ratio.\n",
    name: "SWMG_SetSpeedBlurEffect",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [number, number]){
        //TODO
    }
  };

/** Upstream 002dfe03, action #591: upstream-body-replaces-local-stub. */
export const SWMG_OnBulletHit: INWScriptDefAction = {
    comment: "591: the default implementation of OnBulletHit\nSWMG_OnBulletHit\n",
    name: "SWMG_OnBulletHit",
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)){
        //return this.caller.onBulletHit();
      }
    }
  };

/** Upstream 002dfe03, action #592: upstream-body-replaces-local-stub. */
export const SWMG_OnObstacleHit: INWScriptDefAction = {
    comment: "592: the default implementation of OnObstacleHit\nSWMG_OnObstacleHit\n",
    name: "SWMG_OnObstacleHit",
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleMGObstacle)){
        //return this.caller.onObstacleHit();
      }
    }
  };

/** Upstream 002dfe03, action #598: upstream-body-replaces-local-stub. */
export const SWMG_OnDeath: INWScriptDefAction = {
    comment: "598: the default implementation of OnDeath\nSWMG_OnDeath\n",
    name: "SWMG_OnDeath",
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)){
        //this.caller.onDeath();
      }
    }
  };

/** Upstream 002dfe03, action #604: upstream-body-replaces-local-stub. */
export const SWMG_SetFollowerHitPoints: INWScriptDefAction = {
    comment: "604: SWMG_SetFollowerHitPoints\n",
    name: "SWMG_SetFollowerHitPoints",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)){
        this.caller.onDamaged();
      }
    }
  };

/** Upstream 002dfe03, action #605: upstream-body-replaces-local-stub. */
export const SWMG_OnDamage: INWScriptDefAction = {
    comment: "605: SWMG_OnDamage\n",
    name: "SWMG_OnDamage",
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)){
        //this.caller.onDamaged();
      }
    }
  };

/** Upstream 002dfe03, action #624: upstream-body-changed. */
export const SWMG_GetGunBankCount: INWScriptDefAction = {
    comment: "624: SWMG_GetGunBankCount\n",
    name: "SWMG_GetGunBankCount",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      const banks = (args[0] as any)?.gunBanks;
      return Array.isArray(banks) ? banks.length : 0;
    }
  };

/** Upstream 002dfe03, action #625: upstream-body-changed. */
export const SWMG_GetGunBankBulletModel: INWScriptDefAction = {
    comment: "625: SWMG_GetGunBankBulletModel\n",
    name: "SWMG_GetGunBankBulletModel",
    type: NWScriptDataType.STRING,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return '';
      const bank = banks[args[1]];
      if(!bank) return '';
      return bank.bulletTemplate ?? '';
    }
  };

/** Upstream 002dfe03, action #626: upstream-body-changed. */
export const SWMG_GetGunBankGunModel: INWScriptDefAction = {
    comment: "626: SWMG_GetGunBankGunModel\n",
    name: "SWMG_GetGunBankGunModel",
    type: NWScriptDataType.STRING,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return '';
      const bank = banks[args[1]];
      if(!bank) return '';
      return bank.gunModel ?? '';
    }
  };

/** Upstream 002dfe03, action #632: upstream-body-changed. */
export const SWMG_SetGunBankBulletModel: INWScriptDefAction = {
    comment: "632: SWMG_SetGunBankBulletModel\n",
    name: "SWMG_SetGunBankBulletModel",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.STRING],
    action: function(this: NWScriptInstance, args: [ModuleObject, number, any]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return;
      const bank = banks[args[1]];
      if(!bank) return;
      bank.bulletTemplate = args[2];
      return;
    }
  };

/** Upstream 002dfe03, action #633: upstream-body-changed. */
export const SWMG_SetGunBankGunModel: INWScriptDefAction = {
    comment: "633: SWMG_SetGunBankGunModel\n",
    name: "SWMG_SetGunBankGunModel",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.STRING],
    action: function(this: NWScriptInstance, args: [ModuleObject, number, any]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return;
      const bank = banks[args[1]];
      if(!bank) return;
      bank.gunModel = args[2];
      return;
    }
  };

/** Upstream 002dfe03, action #657: upstream-body-changed. */
export const SWMG_GetGunBankHorizontalSpread: INWScriptDefAction = {
    comment: "657: SWMG_GetGunBankHorizontalSpread\n",
    name: "SWMG_GetGunBankHorizontalSpread",
    type: NWScriptDataType.FLOAT,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return 0.0;
      const bank = banks[args[1]];
      if(!bank) return 0.0;
      return bank.horizSpread ?? 0.0;
    }
  };

/** Upstream 002dfe03, action #658: upstream-body-changed. */
export const SWMG_GetGunBankVerticalSpread: INWScriptDefAction = {
    comment: "658: SWMG_GetGunBankVerticalSpread\n",
    name: "SWMG_GetGunBankVerticalSpread",
    type: NWScriptDataType.FLOAT,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return 0.0;
      const bank = banks[args[1]];
      if(!bank) return 0.0;
      return bank.vertSpread ?? 0.0;
    }
  };

/** Upstream 002dfe03, action #659: upstream-body-changed. */
export const SWMG_GetGunBankSensingRadius: INWScriptDefAction = {
    comment: "659: SWMG_GetGunBankSensingRadius\n",
    name: "SWMG_GetGunBankSensingRadius",
    type: NWScriptDataType.FLOAT,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return 0.0;
      const bank = banks[args[1]];
      if(!bank) return 0.0;
      return bank.sensingRadius ?? 0.0;
    }
  };

/** Upstream 002dfe03, action #660: upstream-body-changed. */
export const SWMG_GetGunBankInaccuracy: INWScriptDefAction = {
    comment: "660: SWMG_GetGunBankInaccuracy\n",
    name: "SWMG_GetGunBankInaccuracy",
    type: NWScriptDataType.FLOAT,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return 0.0;
      const bank = banks[args[1]];
      if(!bank) return 0.0;
      return bank.inaccuracy ?? 0.0;
    }
  };

/** Upstream 002dfe03, action #661: upstream-body-changed. */
export const SWMG_SetGunBankHorizontalSpread: INWScriptDefAction = {
    comment: "661: SWMG_SetGunBankHorizontalSpread\n",
    name: "SWMG_SetGunBankHorizontalSpread",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [ModuleObject, number, any]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return;
      const bank = banks[args[1]];
      if(!bank) return;
      bank.horizSpread = args[2];
      return;
    }
  };

/** Upstream 002dfe03, action #662: upstream-body-changed. */
export const SWMG_SetGunBankVerticalSpread: INWScriptDefAction = {
    comment: "662: SWMG_SetGunBankVerticalSpread\n",
    name: "SWMG_SetGunBankVerticalSpread",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [ModuleObject, number, any]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return;
      const bank = banks[args[1]];
      if(!bank) return;
      bank.vertSpread = args[2];
      return;
    }
  };

/** Upstream 002dfe03, action #663: upstream-body-changed. */
export const SWMG_SetGunBankSensingRadius: INWScriptDefAction = {
    comment: "663: SWMG_SetGunBankSensingRadius\n",
    name: "SWMG_SetGunBankSensingRadius",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [ModuleObject, number, any]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return;
      const bank = banks[args[1]];
      if(!bank) return;
      bank.sensingRadius = args[2];
      return;
    }
  };

/** Upstream 002dfe03, action #664: upstream-body-changed. */
export const SWMG_SetGunBankInaccuracy: INWScriptDefAction = {
    comment: "664: SWMG_SetGunBankInaccuracy\n",
    name: "SWMG_SetGunBankInaccuracy",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [ModuleObject, number, any]){
      const banks = (args[0] as any)?.gunBanks;
      if(!Array.isArray(banks)) return;
      const bank = banks[args[1]];
      if(!bank) return;
      bank.inaccuracy = args[2];
      return;
    }
  };
