import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import { SSFType } from "@/enums/resource/SSFType";
import { Action } from "@/actions/Action";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { queueMoveIntoUseRange } from "@/actions/use-range";
// import type { ModulePlaceable } from "@/module/ModulePlaceable";
// import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { ModuleItemProperty } from "@/enums/module/ModuleItemProperty";
import { SignalEventType } from "@/enums/events/SignalEventType";

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
  private timingBarStarted = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionUnlockObject;
    this.timer = 1.5;

    //PARAMS
    // 0 - dword: object id
    // 1 - dword: item id (security tunneler)
    
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    this.oItem = this.getParameter<ModuleItem>(1);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) && !BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleDoor) || BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModulePlaceable)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }
    
    if(!this.shouted){
      this.shouted = true;
      this.owner.playSoundSet(SSFType.UNLOCK);
    }

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature) &&
       queueMoveIntoUseRange(this.owner as ModuleCreature, this.target, this.groupId)){
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
            effect.setInt(2, GameState.SWRuleSet.racialTypeCount);
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

      if(!this.timingBarStarted){
        this.timingBarStarted = true;
        this.target.audioEmitter.playSound('gui_lockpick');
        // Retail StartGuiTimingBar(this, 0x5dc, 8) — 1500 ms, type 8
        if(this.owner === GameState.getCurrentPlayer()){
          GameState.GuiTimingBarManager?.startMs?.(0x5dc, 'Unlock', this.owner, 8);
        }
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
        GameState.GuiTimingBarManager?.stopFor?.(this.owner);
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
