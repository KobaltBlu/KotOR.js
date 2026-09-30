import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import { SSFType } from "@/enums/resource/SSFType";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { ModuleItemProperty } from "@/enums/module/ModuleItemProperty";
import { SignalEventType } from "@/enums/events/SignalEventType";
import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";

/**
 * ActionUnlockObject class.
 *
 * Unlock flow: move into range → unlock animation (door / placeable, 1.5s)
 * + GUI timing bar → attempt unlock / open. Clear UNLOCK_* anim state on
 * finish so OnOpen dialogs are not stuck looping the pick clip.
 *
 * @file ActionUnlockObject.ts
 */
export class ActionUnlockObject extends Action {
  shouted: boolean;
  usedItem: boolean;
  oItem: ModuleItem;
  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionUnlockObject;

    //PARAMS
    // 0 - dword: target door or placeable object id
    // 1 - dword: security tools item id (or invalid)
    // 2 - int: active property index (security bonus from item)
  }

  private finishFailed(): ActionStatus {
    GameState.GuiTimingBarManager?.stopFor?.(this.owner);
    if(isCreature(this.owner)){
      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    }
    return ActionStatus.FAILED;
  }

  private finishComplete(): ActionStatus {
    GameState.GuiTimingBarManager?.stopFor?.(this.owner);
    if(isCreature(this.owner)){
      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    }
    return ActionStatus.COMPLETE;
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    this.oItem = this.getParameter<ModuleItem>(1);

    if(!isDoor(this.target) && !isPlaceable(this.target)){
      return this.finishFailed();
    }

    if(isDoor(this.owner) || isPlaceable(this.owner)){
      return this.finishFailed();
    }
    
    if(!this.shouted){
      this.shouted = true;
      this.owner.playSoundSet(SSFType.UNLOCK);
    }

    if(isCreature(this.owner) &&
       queueMoveIntoUseRange(this.owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

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

    if(isCreature(this.owner)){
      this.owner.force = 0;
      this.owner.speed = 0;
      this.owner.setFacingObject(this.target);
    }

    // Queue unlock animation, then resume for the lock check.
    if(!this.animQueued){
      this.animQueued = true;
      this.target.audioEmitter.playSound('gui_lockpick');

      if(isCreature(this.owner) && !this.owner.isSimpleCreature()){
        const animId = isDoor(this.target)
          ? ModuleCreatureAnimState.UNLOCK_DOOR
          : ModuleCreatureAnimState.UNLOCK_CONTAINER;
        const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
        playAnim.setParameter(0, ActionParameterType.INT, animId);
        playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
        playAnim.setParameter(2, ActionParameterType.FLOAT, 1.5);
        this.owner.actionQueue.addFront(playAnim);
      }

      // Player timing bar: 1500 ms, unlock type.
      if(this.owner === GameState.PartyManager.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x5dc, 'Unlock', this.owner, 8);
      }
      return ActionStatus.IN_PROGRESS;
    }

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

    if(this.oItem && !GameState.infiniteUses){
      if(this.oItem.charges > 1){
        this.oItem.charges -= 1;
      }else{
        this.owner.removeItem(this.oItem, 1);
      }
    }

    return this.finishComplete();
  }

}
