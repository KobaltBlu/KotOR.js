import { GameState } from "@/GameState";
import { ModuleCreatureAnimState, ModuleItemProperty } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import type { ModuleItem } from "@/module/ModuleItem";
import { ModuleObject } from "@/module/ModuleObject";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { MineSkillResult, resolveMineSetCheck, signalTrapTriggered } from "@/actions/mine-skill";

import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isItem } from "@/module/guards/isItem";
import { isObject } from "@/module/guards/isObject";
import { isPlaceable } from "@/module/guards/isPlaceable";

/**
 * ActionSetMine class.
 * set-mine action
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionSetMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionSetMine extends Action {

  bAnimQueued = false;
  oItem: ModuleItem;
  usedItem: boolean = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionSetMine;

    //PARAMS
    //0 - DWORD: oItem
    //1 - DWORD: oTarget
    //2 - FLOAT: x
    //3 - FLOAT: y
    //4 - FLOAT: z
  }

  update(delta?: number): ActionStatus {

    this.oItem = this.getParameter<ModuleItem>(0);
    this.target = this.getParameter<ModuleObject>(1);
    const x = this.getParameter<number>(2);
    const y = this.getParameter<number>(3);
    const z = this.getParameter<number>(4);

    if(!isCreature(this.owner)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }
    if(!isItem(this.oItem)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    const stopBar = () => GameState.GuiTimingBarManager?.stopFor?.(this.owner);
    const hasTarget = isObject(this.target);
    const plantPos = hasTarget
      ? this.target.position
      : { x: typeof x === 'number' ? x : this.owner.position.x, y: typeof y === 'number' ? y : this.owner.position.y, z: typeof z === 'number' ? z : this.owner.position.z };

    const distance = Utility.Distance2D(this.owner.position, plantPos as any);
    if(distance > 1.5){
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, plantPos.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, plantPos.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, plantPos.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, hasTarget ? this.target.id : ModuleObjectConstant.OBJECT_INVALID);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, hasTarget ? 0.5 : 1.0);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.bAnimQueued){
      this.bAnimQueued = true;
      if(hasTarget){
        this.owner.setFacingObject(this.target);
      }
      const action = new GameState.ActionFactory.ActionPlayAnimation();
      action.setParameter(0, ActionParameterType.INT, ModuleCreatureAnimState.SET_MINE);
      action.setParameter(1, ActionParameterType.FLOAT, 1);
      action.setParameter(2, ActionParameterType.FLOAT, 2.0);
      this.owner.actionQueue.addFront(action);
      // SetMine uses a shorter bar (~2s) vs Flag/Disarm 4500 ms
      if(this.owner === GameState.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.start?.(2.0, 'Set Mine', this.owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    if(this.usedItem){
      stopBar();
      return ActionStatus.COMPLETE;
    }

    let planted = false;
    let shouldTrigger = false;
    let trapSubtype = -1;

    for(let i = 0, len = this.oItem.properties.length; i < len; i++){
      const property = this.oItem.properties[i];
      if(!property.is(ModuleItemProperty.Trap)){
        continue;
      }

      const check = resolveMineSetCheck(this.owner, property.subType | 0);
      if(check.result === MineSkillResult.FAIL){
        stopBar();
        return ActionStatus.FAILED;
      }
      if(check.result === MineSkillResult.FAIL_TRIGGER){
        shouldTrigger = true;
      }

      trapSubtype = property.subType | 0;
      let plantedTrigger: ModuleObject | undefined;
      if(
        hasTarget &&
        (isDoor(this.target) ||
          isPlaceable(this.target))
      ){
        this.target.addTrap(trapSubtype, this.owner);
        plantedTrigger = this.target;
        planted = true;
      }else{
        // Free-ground: area trigger at plantPos (not hosted on the creature).
        const area = this.owner.area ?? GameState.module?.area;
        plantedTrigger = ModuleObject.plantGroundTrap(area, trapSubtype, plantPos as any, this.owner);
        planted = !!plantedTrigger;
      }
      if(shouldTrigger && plantedTrigger){
        signalTrapTriggered(plantedTrigger, this.owner);
      }
      break;
    }

    if(!planted){
      stopBar();
      return ActionStatus.FAILED;
    }

    this.usedItem = true;
    if(!GameState.infiniteUses){
      const stack = this.oItem.getStackSize() | 0;
      if(stack > 1){
        this.oItem.setStackSize(stack - 1);
      }else if((this.oItem.charges | 0) > 1){
        this.oItem.charges -= 1;
      }else{
        this.owner.removeItem(this.oItem, 1);
      }
    }

    stopBar();
    return ActionStatus.COMPLETE;
  }

}
