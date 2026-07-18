import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { GameState } from "@/GameState";

/**
 * ActionAppear class.
 * Retail: CSWSCreature::AIActionAppear @ 005140f0 — 2000ms anim 0x274f, then 0x2711.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionAppear.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionAppear extends Action {

  private elapsed = 0;
  private started = false;
  private static DURATION = 2.0;
  private static ANIM_APPEAR = 0x274f;
  private static ANIM_DONE = 0x2711;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionAppear;

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
      playAnim.setParameter(0, ActionParameterType.INT, typeof anim === 'number' ? anim : ActionAppear.ANIM_APPEAR);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, ActionAppear.DURATION);
      this.owner.actionQueue.addFront(playAnim);
      return ActionStatus.IN_PROGRESS;
    }

    this.elapsed += delta;
    if(this.elapsed < ActionAppear.DURATION){
      return ActionStatus.IN_PROGRESS;
    }

    const playDone = new GameState.ActionFactory.ActionPlayAnimation();
    playDone.setParameter(0, ActionParameterType.INT, ActionAppear.ANIM_DONE);
    playDone.setParameter(1, ActionParameterType.FLOAT, 1.0);
    playDone.setParameter(2, ActionParameterType.FLOAT, 0.1);
    this.owner.actionQueue.addFront(playDone);
    this.owner.setOpacity(1);
    return ActionStatus.COMPLETE;
  }

}
