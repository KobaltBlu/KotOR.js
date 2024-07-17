import { GameState } from "../GameState";
import { ModuleCreatureAnimState, ModuleItemProperty } from "../enums";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { SignalEventType } from "../enums/events/SignalEventType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleItem } from "../module/ModuleItem";
import { BitWise } from "../utility/BitWise";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

/**
 * ActionSetMine class.
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
  usedItem: any;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionSetMine;

    //PARAMS - unknown
    //0 - DWORD: oItem
    //1 - DWORD: oTarget
    //2 - FLOAT: x
    //3 - FLOAT: y
    //4 - FLOAT: z
  }

  update(delta?: number): ActionStatus {

    this.oItem = this.getParameter(0);
    this.target = this.getParameter(1);

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      const distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 2 );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        console.log('ActionSetMine', 'MOVE_TO_TARGET');
        return ActionStatus.IN_PROGRESS;
      }

      if(!this.bAnimQueued){
        this.bAnimQueued = true;
        const action = new GameState.ActionFactory.ActionPlayAnimation();
        action.setParameter(0, ActionParameterType.INT, ModuleCreatureAnimState.SET_MINE);
        action.setParameter(1, ActionParameterType.FLOAT, 1);
        action.setParameter(2, ActionParameterType.FLOAT, 1.5);
        this.owner.actionQueue.addFront(action);
        console.log('ActionSetMine', 'ANIMATION_QUEUED');
        return ActionStatus.IN_PROGRESS;
      }

      if(this.oItem && !this.usedItem){
        for(let i = 0, len = this.oItem.properties.length; i < len; i++){
          let property = this.oItem.properties[i];
          if(!property.isUseable()){ continue; }
    
          if(property.is(ModuleItemProperty.Trap)){
            if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) || BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)){
              this.target.addTrap(property.subType, this.owner);
            }
          }
        }
        this.usedItem = true;
        console.log('ActionSetMine', 'ITEM_USED');
      }
      
      const futureTime = GameState.module.timeManager.getFutureTimeFromSeconds(3);

      const event = new GameState.GameEventFactory.EventSignalEvent();
      event.setCaller(this.getOwner());
      event.setObject(this.getTarget());
      event.setDay(futureTime.pauseDay);
      event.setTime(futureTime.pauseTime);
      event.eventType = SignalEventType.OnTrapTriggered;
      GameState.module.addEvent(event);
      
      if(this.oItem){
        //If we have more charges, reduce the charges count by 1
        if(this.oItem.charges > 1){
          this.oItem.charges -= 1;
        }
        //If we are out of charges remove the item from the owners inventory
        else
        {
          this.owner.removeItem(this.oItem, 1);
        }
      }
      
      console.log('ActionSetMine', 'COMPLETE');
      return ActionStatus.COMPLETE;
    }
    
    console.log('ActionSetMine', 'FAILED');
    return ActionStatus.FAILED;
  }

}