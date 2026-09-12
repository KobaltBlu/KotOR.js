import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleTriggerType } from "@/enums/module/ModuleTriggerType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleTrigger } from "@/module/ModuleTrigger";
import { Action } from "@/actions/Action";
import { markTrapDetected, MineSkillResult, resolveMineSkillCheck } from "@/actions/mine-skill";
import { queueMoveIntoUseRange } from "@/actions/use-range";
import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";
import { isTrigger } from "@/module/guards/isTrigger";

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

    if(!isTrigger(this.target) && !isDoor(this.target) && !isPlaceable(this.target)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(isTrigger(this.target)){
      const trap = this.target as ModuleTrigger;
      if(trap.type != ModuleTriggerType.TRAP){
        GameState.GuiTimingBarManager?.stopFor?.(this.owner);
        return ActionStatus.FAILED;
      }
      if(trap.trapDetected){
        GameState.GuiTimingBarManager?.stopFor?.(this.owner);
        return ActionStatus.COMPLETE;
      }
    }else if((this.target as any).trapFlag){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.COMPLETE;
    }

    const owner = this.owner as ModuleCreature;
    if(queueMoveIntoUseRange(owner, this.target, this.groupId, { extraRange: 0.0 })){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.animQueued){
      this.animQueued = true;
      owner.setFacingObject(this.target);
      // : 0x274b trigger, 0x274c door/placeable
      const animId = (isDoor || isPlaceable) ? 0x274c : 0x274b;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 4.5);
      owner.actionQueue.addFront(playAnim);
      // StartGuiTimingBar(this, 0x1194, 1) — 4500 ms, type 1
      if(owner === GameState.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x1194, 'Flag Mine', owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    const check = resolveMineSkillCheck(owner, this.target, { flag: true });
    if(check.result === MineSkillResult.SUCCESS || check.result === MineSkillResult.OWNED){
      markTrapDetected(this.target, owner);
    }

    GameState.GuiTimingBarManager?.stopFor?.(owner);
    return ActionStatus.COMPLETE;
  }

}
