import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleTriggerType } from "@/enums/module/ModuleTriggerType";
import { ResourceLoader } from "@/loaders/ResourceLoader";
import type { ModuleObject } from "@/module/ModuleObject";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
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
 * ActionRecoverMine class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionRecoverMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionRecoverMine extends Action {

  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionRecoverMine;

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

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId, { extraRange: 0.25 })){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.animQueued){
      this.animQueued = true;
      this.owner.setFacingObject(this.target);
      // recover-mine action: door/placeable 0x274c, trigger 0x279d
      const isDoorOrPlaceable =
        isDoor(this.target) ||
        isPlaceable(this.target);
      const animId = isDoorOrPlaceable ? 0x274c : 0x279d;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 4.5);
      this.owner.actionQueue.addFront(playAnim);
      if(this.owner === GameState.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x1194, 'Recover Mine', this.owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    const stopBar = () => GameState.GuiTimingBarManager?.stopFor?.(this.owner);

    if(!isTrigger(this.target)){
      stopBar();
      return ActionStatus.FAILED;
    }

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

    const resRef = this.target.trapResRef || this.target.templateResRef;
    if(resRef){
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utp'], resRef);
      if(buffer){
        const item = new GameState.Module.ModuleArea.ModuleItem(new GFFObject(buffer));
        this.owner.addItem(item);
      }
    }

    fadeDestroyTrap(this.target);
    stopBar();
    return ActionStatus.COMPLETE;
  }

}
