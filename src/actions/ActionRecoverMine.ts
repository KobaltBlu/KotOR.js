import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleTriggerType } from "@/enums/module/ModuleTriggerType";
import { ResourceLoader } from "@/loaders/ResourceLoader";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleTrigger } from "@/module/ModuleTrigger";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";
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

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
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
      // recover-mine action: door/placeable 0x274c, trigger 0x279d
      const isDoorOrPlaceable =
        BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) ||
        BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable);
      const animId = isDoorOrPlaceable ? 0x274c : 0x279d;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 4.5);
      owner.actionQueue.addFront(playAnim);
      if(owner === GameState.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x1194, 'Recover Mine', owner, 1);
      }
      return ActionStatus.IN_PROGRESS;
    }

    const stopBar = () => GameState.GuiTimingBarManager?.stopFor?.(owner);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleTrigger)){
      stopBar();
      return ActionStatus.FAILED;
    }

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

    const resRef = trap.trapResRef || trap.templateResRef;
    if(resRef){
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utp'], resRef);
      if(buffer){
        const item = new GameState.Module.ModuleArea.ModuleItem(new GFFObject(buffer));
        owner.addItem(item);
      }
    }

    fadeDestroyTrap(trap);
    stopBar();
    return ActionStatus.COMPLETE;
  }

}
