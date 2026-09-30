import { GameState } from "@/GameState";
import { ModuleTriggerType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleObject } from "@/module/ModuleObject";
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

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId, { extraRange: 0.25 })){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.animQueued){
      this.animQueued = true;
      this.owner.setFacingObject(this.target);
      // disarm-mine action: door 0x2796, placeable 0x2797, trigger 0x2794
      const animId = isDoor(this.target) ? 0x2796 : (isPlaceable(this.target) ? 0x2797 : 0x2794);
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 4.5);
      this.owner.actionQueue.addFront(playAnim);
      if(this.owner === GameState.PartyManager.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x1194, 'Disarm Mine', this.owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    const stopBar = () => GameState.GuiTimingBarManager?.stopFor?.(this.owner);

    if(isTrigger(this.target)){
      if(this.target.type != ModuleTriggerType.TRAP){
        stopBar();
        return ActionStatus.FAILED;
      }

      const check = resolveMineSkillCheck(this.owner, this.target);
      if(check.result === MineSkillResult.FAIL_TRIGGER){
        signalTrapTriggered(this.target, this.owner);
        stopBar();
        return ActionStatus.FAILED;
      }
      if(check.result === MineSkillResult.FAIL){
        stopBar();
        return ActionStatus.FAILED;
      }

      signalTrapDisarm(this.target, this.owner);
      runTriggerOnDisarmScript(this.target);
      fadeDestroyTrap(this.target);
      stopBar();
      return ActionStatus.COMPLETE;
    }

    // Door / placeable trap
    const check = resolveMineSkillCheck(this.owner, this.target);
    if(check.result === MineSkillResult.FAIL_TRIGGER){
      signalTrapTriggered(this.target, this.owner);
      stopBar();
      return ActionStatus.FAILED;
    }
    if(check.result === MineSkillResult.FAIL){
      stopBar();
      return ActionStatus.FAILED;
    }

    signalTrapDisarm(this.target, this.owner);
    stopBar();
    return ActionStatus.COMPLETE;
  }

}
