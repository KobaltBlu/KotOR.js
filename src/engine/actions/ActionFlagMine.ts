import { GameState } from "@engine/runtime/GameState";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { ModuleTriggerType } from "@core/enums/module/ModuleTriggerType";
import type { ModuleObject } from "@engine/module/ModuleObject";
import { Action } from "@engine/actions/Action";
import { markTrapDetected, MineSkillResult, resolveMineSkillCheck } from "@engine/actions/mine-skill";
import { queueMoveIntoUseRange } from "@engine/actions/use-range";
import { isCreature } from "@engine/module/guards/isCreature";
import { isDoor } from "@engine/module/guards/isDoor";
import { isPlaceable } from "@engine/module/guards/isPlaceable";
import { isTrigger } from "@engine/module/guards/isTrigger";

/**
 * ActionFlagMine class.
 * flag-mine action
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionFlagMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionFlagMine extends Action {

  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionFlagMine;

    //PARAMS
    // 0 - dword: oTarget (trap trigger, door, or placeable object id)
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

    if(!isTrigger(this.target) && !isDoor(this.target) && !isPlaceable(this.target)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(isTrigger(this.target)){
      if(this.target.type != ModuleTriggerType.TRAP){
        GameState.GuiTimingBarManager?.stopFor?.(this.owner);
        return ActionStatus.FAILED;
      }
      if(this.target.trapDetected){
        GameState.GuiTimingBarManager?.stopFor?.(this.owner);
        return ActionStatus.COMPLETE;
      }
    }else if((this.target as any).trapFlag){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.COMPLETE;
    }

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId, { extraRange: 0.0 })){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.animQueued){
      this.animQueued = true;
      this.owner.setFacingObject(this.target);
      // : 0x274b trigger, 0x274c door/placeable
      const animId = (isDoor || isPlaceable) ? 0x274c : 0x274b;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 4.5);
      this.owner.actionQueue.addFront(playAnim);
      // StartGuiTimingBar(this, 0x1194, 1) — 4500 ms, type 1
      if(this.owner === GameState.PartyManager.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x1194, 'Flag Mine', this.owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    const check = resolveMineSkillCheck(this.owner, this.target, { flag: true });
    if(check.result === MineSkillResult.SUCCESS || check.result === MineSkillResult.OWNED){
      markTrapDetected(this.target, this.owner);
    }

    GameState.GuiTimingBarManager?.stopFor?.(this.owner);
    return ActionStatus.COMPLETE;
  }

}
