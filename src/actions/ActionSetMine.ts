import { GameState } from "@/GameState";
import { ModuleCreatureAnimState, ModuleItemProperty } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { SignalEventType } from "@/enums/events/SignalEventType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

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

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      const distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        enqueueMoveToPoint(this.owner, {
          x: this.target.position.x,
          y: this.target.position.y,
          z: this.target.position.z,
          area: GameState.module.area.id,
          target: this.target.id,
          run: true,
          range: 2,
          timeout: 30.0,
          groupId: this.groupId,
        });

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
          // if(!property.isUseable()){ continue; }
    
          if(property.is(ModuleItemProperty.Trap)){
            if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) || BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)){
              this.target.addTrap(property.subType, this.getOwner());
            }
          }
        }

        this.usedItem = true;
        console.log('ActionSetMine', 'ITEM_USED');

        const futureTime = GameState.module.timeManager.getFutureTimeFromSeconds(3);

        const event = new GameState.GameEventFactory.EventSignalEvent();
        event.setCaller(this.getOwner());
        event.setObject(this.getTarget());
        event.setDay(futureTime.pauseDay);
        event.setTime(futureTime.pauseTime);
        event.eventType = SignalEventType.OnTrapTriggered;
        GameState.module.addEvent(event);
        
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