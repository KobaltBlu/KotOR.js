import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";

import { isCreature } from "@/module/guards/isCreature";

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

    //PARAMS
    // none
  }

  /** Clear trailing queue actions; current head stays until process shifts it. */
  private clearTrailingActions(owner: ModuleCreature){
    const queue = owner.actionQueue;
    while(queue.length > 1){
      const removed = queue.pop() as Action | undefined;
      if(!removed) continue;
      removed.dispose();
    }
    owner.combatRound.clearActions();
  }

  update(_delta: number = 0): ActionStatus {
    console.log('ActionSwitchWeapons update', this);
    if(!isCreature(this.owner)){
      return ActionStatus.ERROR;
    }

    // NWScript: does not work in dialogs
    if(GameState.Mode === EngineMode.DIALOG){
      return ActionStatus.ERROR;
    }

    if(this.owner.isDead() || this.owner.isDebilitated()){
      return ActionStatus.ERROR;
    }

    const right1 = this.owner.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    const left1 = this.owner.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
    const right2 = this.owner.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    const left2 = this.owner.GetItemInSlot(ModuleCreatureArmorSlot.LEFTHAND2);

    // ClearAllActions while current node is already off the list
    this.clearTrailingActions(this.owner);

    this.owner.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND2);
    this.owner.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    this.owner.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    this.owner.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);

    // equip order: RH2→RH, LH2→LH, old RH→RH2, old LH→LH2
    if(right2){
      void this.owner.equipItem(ModuleCreatureArmorSlot.RIGHTHAND, right2);
    }
    if(left2){
      void this.owner.equipItem(ModuleCreatureArmorSlot.LEFTHAND, left2);
    }
    if(right1){
      void this.owner.equipItem(ModuleCreatureArmorSlot.RIGHTHAND2, right1);
    }
    if(left1){
      void this.owner.equipItem(ModuleCreatureArmorSlot.LEFTHAND2, left1);
    }

    // : if party PC in combat with attack target, re-queue attack
    const attackTarget = this.owner.combatData?.lastAttemptedAttackTarget as ModuleObject | undefined;
    if(
      this.owner.combatData?.combatState &&
      isCreature(attackTarget)
    ){
      this.owner.attackCreature?.(attackTarget, undefined);
    }

    return ActionStatus.COMPLETE;
  }

}
