import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { GameState } from "@/GameState";

/**
 * ActionDisappear class.
 * disappear action — 2000ms anim 0x274e, then 0x2711.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionDisappear.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionDisappear extends Action {

  private elapsed = 0;
  private started = false;
  private static DURATION = 2.0;
  private static ANIM_DISAPPEAR = 0x274e;
  private static ANIM_DONE = 0x2711;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDisappear;

    //PARAMS
    // 0 - int: animation type (optional override)
  }

  update(delta: number = 0): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(!this.started){
      this.started = true;
      this.elapsed = 0;
      if(this.owner.model){
        this.owner.model.visible = true;
      }
      this.owner.setOpacity(1);
      const anim = this.getParameter<number>(0);
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, typeof anim === 'number' ? anim : ActionDisappear.ANIM_DISAPPEAR);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, ActionDisappear.DURATION);
      this.owner.actionQueue.addFront(playAnim);
      return ActionStatus.IN_PROGRESS;
    }

    this.elapsed += delta;
    if(this.elapsed < ActionDisappear.DURATION){
      return ActionStatus.IN_PROGRESS;
    }

    const playDone = new GameState.ActionFactory.ActionPlayAnimation();
    playDone.setParameter(0, ActionParameterType.INT, ActionDisappear.ANIM_DONE);
    playDone.setParameter(1, ActionParameterType.FLOAT, 1.0);
    playDone.setParameter(2, ActionParameterType.FLOAT, 0.1);
    this.owner.actionQueue.addFront(playDone);
    if(this.owner.model){
      this.owner.model.visible = false;
    }
    this.owner.setOpacity(0);
    return ActionStatus.COMPLETE;
  }

}
