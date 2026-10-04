import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const GetLastAttacker = defineAction({
  id: 36,
  name: "GetLastAttacker",
  comment: "36: Get the last attacker of oAttackee.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oAttackee", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oAttackee) {
    if (BitWise.InstanceOfObject(oAttackee, ModuleObjectType.ModuleCreature)) {
      return oAttackee.combatData.lastAttacker;
    }
    return undefined;
  },
});

export const ActionAttack = defineAction({
  id: 37,
  name: "ActionAttack",
  comment: "37: Attack oAttackee.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oAttackee", { optional: true, default: undefined }),
    intParam("bPassive", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oAttackee, bPassive) {
    if (BitWise.InstanceOfObject(oAttackee, ModuleObjectType.ModuleCreature)) {
      this.caller.attackCreature(oAttackee);
    } else {
      console.error("ActionAttack target undefined");
    }
  },
});

export const GetSpellTargetObject = defineAction({
  id: 47,
  name: "GetSpellTargetObject",
  comment: "47: Get the object at which the caller last cast a spell.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      return this.caller.combatData.lastSpellTarget;
    }
    return undefined;
  },
});

export const GetCurrentHitPoints = defineAction({
  id: 49,
  name: "GetCurrentHitPoints",
  comment: "49: Get the current hitpoints of oObject.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (!BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return 0;
    }
    return oObject.getHP();
  },
});

export const GetMaxHitPoints = defineAction({
  id: 50,
  name: "GetMaxHitPoints",
  comment: "50: Get the maximum hitpoints of oObject.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (!BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return 0;
    }
    return oObject.getMaxHP();
  },
});

export const FortitudeSave = defineAction({
  id: 108,
  name: "FortitudeSave",
  comment: "108: Do a Fortitude Save check for the given DC.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nDC"),
    intParam("nSaveType"),
    objectParam<ModuleObject | undefined>("oSaveVersus", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nDC, nSaveType, oSaveVersus) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleObject)) {
      return oCreature.fortitudeSave(nDC, nSaveType, oSaveVersus);
    }
    return 0;
  },
});

export const ReflexSave = defineAction({
  id: 109,
  name: "ReflexSave",
  comment: "109: Do a Reflex Save check for the given DC.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nDC"),
    intParam("nSaveType"),
    objectParam<ModuleObject | undefined>("oSaveVersus", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nDC, nSaveType, oSaveVersus) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleObject)) {
      return oCreature.reflexSave(nDC, nSaveType, oSaveVersus);
    }
    return 0;
  },
});

export const WillSave = defineAction({
  id: 110,
  name: "WillSave",
  comment: "110: Do a Will Save check for the given DC.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nDC"),
    intParam("nSaveType"),
    objectParam<ModuleObject | undefined>("oSaveVersus", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nDC, nSaveType, oSaveVersus) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleObject)) {
      return oCreature.willSave(nDC, nSaveType, oSaveVersus);
    }
    return 0;
  },
});

export const GetAttackTarget = defineAction({
  id: 316,
  name: "GetAttackTarget",
  comment: "316: Get the attack target of oCreature.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      if (oCreature.combatData.combatState) {
        return oCreature.combatData.lastAttackTarget || oCreature.combatData.lastAttacker;
      }
    }
    return undefined;
  },
});

export const GetIsInCombat = defineAction({
  id: 320,
  name: "GetIsInCombat",
  comment: "320: Returns TRUE if oCreature is in combat.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("bRealCombatOnly", { availability: "tsl", optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, bRealCombatOnly) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return oCreature.combatData.combatState ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const GetAttemptedAttackTarget = defineAction({
  id: 361,
  name: "GetAttemptedAttackTarget",
  comment: "361: Get the target that the caller attempted to attack.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.caller.combatData.lastAttemptedAttackTarget;
  },
});

export const GetLastSpellCaster = defineAction({
  id: 245,
  name: "GetLastSpellCaster",
  comment: "245: Get who cast the last spell.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.lastSpellAttacker;
  },
});

export const GetLastSpell = defineAction({
  id: 246,
  name: "GetLastSpell",
  comment: "246: Get the ID of the spell that was cast.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.lastSpell?.id ? this.lastSpell.id : 0;
  },
});

export const GetSpellId = defineAction({
  id: 248,
  name: "GetSpellId",
  comment: "248: Get the ID of the spell that is being cast.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.getSpellId();
  },
});

export const GetAttemptedSpellTarget = defineAction({
  id: 375,
  name: "GetAttemptedSpellTarget",
  comment: "375: Get the target at which the caller attempted to cast a spell.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.caller.combatData.lastAttemptedSpellTarget;
  },
});

export const GetLastSpellHarmful = defineAction({
  id: 423,
  name: "GetLastSpellHarmful",
  comment: "423: Determine whether the last spell cast was harmful.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.lastSpellHarmful ? NW_TRUE : NW_FALSE;
  },
});

export const GetCurrentAction = defineAction({
  id: 522,
  name: "GetCurrentAction",
  comment: "522: Get the current action (ACTION_*) that oObject is executing.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    const target = oObject ?? this.caller;
    if (BitWise.InstanceOfObject(target, ModuleObjectType.ModuleObject)) {
      const action = target.actionQueue[0];
      if (action) {
        switch (action.type) {
          case ActionType.ActionMoveToPoint: return 0;
          case ActionType.ActionPickUpItem: return 1;
          case ActionType.ActionDropItem: return 2;
          case ActionType.ActionPhysicalAttacks: return 3;
          case ActionType.ActionCastSpell: return 4;
          case ActionType.ActionItemCastSpell: return 4;
          case ActionType.ActionOpenDoor: return 5;
          case ActionType.ActionCloseDoor: return 6;
          case ActionType.ActionDialogObject: return 7;
          case ActionType.ActionDisarmMine: return 8;
          case ActionType.ActionRecoverMine: return 9;
          case ActionType.ActionFlagMine: return 10;
          case ActionType.ActionExamineMine: return 11;
          case ActionType.ActionSetMine: return 12;
          case ActionType.ActionUnlockObject: return 13;
          case ActionType.ActionLockObject: return 14;
          case ActionType.ActionUseObject: return 15;
          case ActionType.ActionCounterSpell: return 31;
          case ActionType.ActionHeal: return 33;
          case ActionType.ActionForceFollowObject: return 35;
          case ActionType.ActionWait: return 36;
          case ActionType.ActionFollowLeader: return 38;
        }
      } else {
        return 65534;
      }
    }
    return 65535;
  },
});

export const GetLastAttackAction = defineAction({
  id: 722,
  name: "GetLastAttackAction",
  comment: "722: Return the last attack action for a given object.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      switch (oObject.combatData.lastAttackAction) {
        case ActionType.ActionPhysicalAttacks:
          return 3;
        case ActionType.ActionCastSpell:
        case ActionType.ActionItemCastSpell:
          return 4;
      }
    }
    return -1;
  },
});

export const GetLastAttackResult = defineAction({
  id: 725,
  name: "GetLastAttackResult",
  comment: "725: Return the result of the last attack.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    return oObject.combatData.lastAttackResult || 0;
  },
});

export const combatActions = [
  GetLastAttacker,
  ActionAttack,
  GetSpellTargetObject,
  GetCurrentHitPoints,
  GetMaxHitPoints,
  FortitudeSave,
  ReflexSave,
  WillSave,
  GetAttackTarget,
  GetIsInCombat,
  GetAttemptedAttackTarget,
  GetLastSpellCaster,
  GetLastSpell,
  GetSpellId,
  GetAttemptedSpellTarget,
  GetLastSpellHarmful,
  GetCurrentAction,
  GetLastAttackAction,
  GetLastAttackResult,
] as const;
