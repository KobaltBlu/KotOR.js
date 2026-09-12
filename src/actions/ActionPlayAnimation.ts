import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { Action } from "@/actions/Action";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";
enum ActionPlayAnimationType
{
  LOOPING = 0,
  FIRE_AND_FORGET = 1,
  TIMED = 2,
}

/**
 * ActionPlayAnimation class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionPlayAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPlayAnimation extends Action {
  /** When set, force mode-1 overlay routing (SetOverlayAnimation). */
  overlayAnimation: any;
  animation: number;
  speed: number;
  time: number;
  animationLength: number = 0;
  elapsed: number = 0;
  bInitialized: boolean;
  animationType: ActionPlayAnimationType;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPlayAnimation;

    //PARAMS
    // 0 - int: animation constant value like (10000, 10001, etc...)
    // 1 - float: speed
    // 2 - float: duration
    // 3 - int: unknown
    
  }

  update(delta: number = 0): ActionStatus {
    if(!this.bInitialized){
      this.animation = this.getParameter<number>(0);
      this.speed = this.getParameter<number>(1);
      this.time = this.getParameter<number>(2);
      this.elapsed = 0;
      this.animationType = this.time == -1 ? ActionPlayAnimationType.LOOPING : this.time == 0 ? ActionPlayAnimationType.FIRE_AND_FORGET : ActionPlayAnimationType.TIMED;
    }

    if(this.animation < 10000){
      console.error('ActionPlayAnimation Invalid animation', this.owner.getName(), this.animation, this);
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    if(!this.bInitialized){
      if(isCreature(owner) && typeof owner.applyAnimationByMode === 'function'){
        if(this.overlayAnimation && typeof owner.playOverlayAnimation === 'function'){
          owner.playOverlayAnimation(this.animation);
        }else{
          owner.applyAnimationByMode(this.animation, this.speed || 1);
        }
      }else{
        owner.setAnimationState(this.animation);
      }
    }

    this.animationLength = owner.getAnimationLength(this.animation);
    this.bInitialized = true;

    //If the time is -1, the animation will loop until the next animation is applied
    if(this.animationType == ActionPlayAnimationType.LOOPING){
      return ActionStatus.COMPLETE;
    }
    //If the time is 0, the animation will play once
    else if(this.animationType == ActionPlayAnimationType.FIRE_AND_FORGET)
    {
      this.elapsed += delta;
      if(this.elapsed >= this.animationLength){
        this.elapsed = 0;
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.IN_PROGRESS;
    }
    //If the time is greater than 0, the animation will play for the specified time
    else if(this.animationType == ActionPlayAnimationType.TIMED)
    {
      this.elapsed += delta;
      if(this.elapsed >= this.time){
        this.elapsed = 0;
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.IN_PROGRESS;
    }

    return ActionStatus.FAILED;
  }

}
