import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { SSFType } from "../enums/resource/SSFType";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModulePlaceable } from "../module/ModulePlaceable";
import type { ModuleDoor } from "../module/ModuleDoor";
import type { ModuleItem } from "../module";
import { SkillType } from "../enums/nwscript/SkillType";
import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { ModuleItemProperty } from "../enums/module/ModuleItemProperty";
import { SignalEventType } from "../enums/events/SignalEventType";

/**
 * ActionUnlockObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionUnlockObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionUnlockObject extends Action {
  timer: number;
  shouted: boolean;
  usedItem: boolean;
  oItem: ModuleItem;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionUnlockObject;
    this.timer = 1.5;

    //PARAMS
    // 0 - dword: object id
    // 1 - dword: item id (security tunneler)
    
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter(0);
    this.oItem = this.getParameter(1);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) && !BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable))
      return ActionStatus.FAILED;

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleDoor) || BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModulePlaceable)){
      return ActionStatus.FAILED;
    }
    
    if(!this.shouted){
      this.shouted = true;
      this.owner.playSoundSet(SSFType.UNLOCK);
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 1.5){
        
      // this.owner.openSpot = undefined;
      let actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 1.5 );
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);

      return ActionStatus.IN_PROGRESS;
    }else{

      if(this.oItem && !this.usedItem){
        for(let i = 0, len = this.oItem.properties.length; i < len; i++){
          let property = this.oItem.properties[i];
          if(!property.isUseable()){ continue; }
    
          if(property.is(ModuleItemProperty.ThievesTools)){
            const effect = new GameState.GameEffectFactory.EffectSkillIncrease();
            effect.setCreator(this.owner);
            effect.setSpellId(-1);
            effect.setInt(0, SkillType.SECURITY);
            effect.setInt(1, property.getValue());
            effect.setInt(2, GameState.TwoDAManager.datatables.get('racialtypes').RowCount);
            this.owner.addEffect(effect.initialize(), GameEffectDurationType.TEMPORARY, 3);
          }
        }
        this.usedItem = true;
      }

      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      this.owner.force = 0;
      this.owner.speed = 0;
                        
      if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
        this.owner.setFacingObject( this.target );

      if(this.timer == undefined){
        this.timer = 1.5;
        this.target.audioEmitter.playSound('gui_lockpick');
      }

      if(!this.owner.isSimpleCreature()){
        if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor)){
          this.owner.setAnimationState(ModuleCreatureAnimState.UNLOCK_DOOR);
        }else{
          this.owner.setAnimationState(ModuleCreatureAnimState.UNLOCK_CONTAINER);
        }
      }

      this.timer -= delta;

      if(this.timer <= 0){
        const unlocked = (this.target as any).attemptUnlock(this.owner);
        if(!unlocked){
          const event = new GameState.GameEventFactory.EventSignalEvent();
          event.setCaller(this.getOwner());
          event.setObject(this.target);
          event.setDay(GameState.module.timeManager.pauseDay);
          event.setTime(GameState.module.timeManager.pauseTime);
          event.eventType = SignalEventType.OnFailToOpen;
          GameState.module.addEvent(event);
        }
        return ActionStatus.COMPLETE;
      }
      
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

      return ActionStatus.IN_PROGRESS;
      
    }

    return ActionStatus.FAILED;
  }

}
