import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleObject } from "@/module/ModuleObject";
import { Action } from "@/actions/Action";
import { markTrapDetected, MineSkillResult, resolveMineSkillCheck } from "@/actions/mine-skill";
import { queueMoveIntoUseRange } from "@/actions/use-range";

import { isCreature } from "@/module/guards/isCreature";

/**
 * ActionExamineMine class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionExamineMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionExamineMine extends Action {

  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionExamineMine;

    //PARAMS
    //0 - DWORD: oTarget
  }

  update(delta?: number): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);
    if(!this.target){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId, { extraRange: 0.0 })){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.animQueued){
      this.animQueued = true;
      this.owner.setFacingObject(this.target);
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, 0x274b);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 4.5);
      this.owner.actionQueue.addFront(playAnim);
      if(this.owner === GameState.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x1194, 'Examine Mine', this.owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    const check = resolveMineSkillCheck(this.owner, this.target, { examine: true });
    if(check.result === MineSkillResult.SUCCESS || check.result === MineSkillResult.OWNED){
      markTrapDetected(this.target);
    }

    GameState.GuiTimingBarManager?.stopFor?.(this.owner);
    return ActionStatus.COMPLETE;
  }

}
