import { GameState } from "@/GameState";
import { ModuleTriggerType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleTrigger } from "@/module/ModuleTrigger";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";
import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";
import { isTrigger } from "@/module/guards/isTrigger";
import {
  fadeDestroyTrap,
  MineSkillResult,
  resolveMineSkillCheck,
  runTriggerOnDisarmScript,
  signalTrapDisarm,
  signalTrapTriggered,
} from "@/actions/mine-skill";

/**
 * ActionDisarmMine class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionDisarmMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionDisarmMine extends Action {

  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDisarmMine;

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

    const owner = this.owner as ModuleCreature;
    if(queueMoveIntoUseRange(owner, this.target, this.groupId, { extraRange: 0.25 })){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.animQueued){
      this.animQueued = true;
      owner.setFacingObject(this.target);
      // disarm-mine action: door 0x2796, placeable 0x2797, trigger 0x2794
      const animId = isDoor(this.target) ? 0x2796 : (isPlaceable(this.target) ? 0x2797 : 0x2794);
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 4.5);
      owner.actionQueue.addFront(playAnim);
      if(owner === GameState.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x1194, 'Disarm Mine', owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    const stopBar = () => GameState.GuiTimingBarManager?.stopFor?.(owner);

    if(isTrigger(this.target)){
      const trap = this.target as ModuleTrigger;
      if(trap.type != ModuleTriggerType.TRAP){
        stopBar();
        return ActionStatus.FAILED;
      }

      const check = resolveMineSkillCheck(owner, trap);
      if(check.result === MineSkillResult.FAIL_TRIGGER){
        signalTrapTriggered(trap, owner);
        stopBar();
        return ActionStatus.FAILED;
      }
      if(check.result === MineSkillResult.FAIL){
        stopBar();
        return ActionStatus.FAILED;
      }

      signalTrapDisarm(trap, owner);
      runTriggerOnDisarmScript(trap);
      fadeDestroyTrap(trap);
      stopBar();
      return ActionStatus.COMPLETE;
    }

    // Door / placeable trap
    const check = resolveMineSkillCheck(owner, this.target);
    if(check.result === MineSkillResult.FAIL_TRIGGER){
      signalTrapTriggered(this.target, owner);
      stopBar();
      return ActionStatus.FAILED;
    }
    if(check.result === MineSkillResult.FAIL){
      stopBar();
      return ActionStatus.FAILED;
    }

    signalTrapDisarm(this.target, owner);
    stopBar();
    return ActionStatus.COMPLETE;
  }

}
