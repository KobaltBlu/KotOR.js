import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";

/**
 * ActionSwitchWeapons class.
 * TSL switch-weapons action — swap RH/LH with RIGHTHAND2/LEFTHAND2.
 * RunActions case 0x47.
 *
 * @file ActionSwitchWeapons.ts
 */
export class ActionSwitchWeapons extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionSwitchWeapons;
  }

  /** Clear trailing queue actions; current head stays until process() shifts it. */
  private clearTrailingActions(owner: ModuleCreature){
    const queue = owner.actionQueue;
    while(queue.length > 1){
      const removed = queue.pop();
      removed?.dispose?.();
    }
    owner.combatRound?.clearActions?.();
  }

  update(_delta: number = 0): ActionStatus {
    console.log('ActionSwitchWeapons update', this);
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }

    // NWScript: does not work in dialogs
    if(GameState.Mode === EngineMode.DIALOG){
      return ActionStatus.ERROR;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead() || owner.isDebilitated()){
      return ActionStatus.ERROR;
    }

    const right1 = owner.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    const left1 = owner.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
    const right2 = owner.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    const left2 = owner.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND2);

    // Retail ClearAllActions while current node is already off the list
    this.clearTrailingActions(owner);

    owner.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND2);
    owner.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    owner.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    owner.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);

    // Retail equip order: RH2→RH, LH2→LH, old RH→RH2, old LH→LH2
    if(right2){
      void owner.equipItem(ModuleCreatureArmorSlot.RIGHTHAND, right2);
    }
    if(left2){
      void owner.equipItem(ModuleCreatureArmorSlot.LEFTHAND, left2);
    }
    if(right1){
      void owner.equipItem(ModuleCreatureArmorSlot.RIGHTHAND2, right1);
    }
    if(left1){
      void owner.equipItem(ModuleCreatureArmorSlot.LEFTHAND2, left1);
    }

    // Retail: if party PC in combat with attack target, re-queue attack
    const attackTarget = owner.combatData?.lastAttemptedAttackTarget as ModuleObject | undefined;
    if(
      owner.combatData?.combatState &&
      BitWise.InstanceOfObject(attackTarget, ModuleObjectType.ModuleCreature)
    ){
      owner.attackCreature?.(attackTarget as ModuleCreature, undefined);
    }

    return ActionStatus.COMPLETE;
  }

}
