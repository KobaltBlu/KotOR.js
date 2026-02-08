import { GameState } from "../GameState";
import { ModuleTriggerType } from "../enums";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { SkillType } from "../enums/nwscript/SkillType";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleObject } from "../module/ModuleObject";
import type { ModuleTrigger } from "../module/ModuleTrigger";
import { BitWise } from "../utility/BitWise";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

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

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDisarmMine;

    //PARAMS - unknown
    //0 - DWORD: oTarget
  }

  update(delta?: number): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);
    if(!this.target){
      return ActionStatus.FAILED;
    }

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 3){
        // this.owner.openSpot = undefined;
        let actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, this.target.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 3 );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        return ActionStatus.IN_PROGRESS;
      }

      if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleTrigger)){
        const trap: ModuleTrigger = this.target as any;
        if(trap.type != ModuleTriggerType.TRAP){
          return ActionStatus.FAILED;
        }

        if(!trap.trapDisarmable){
          return ActionStatus.FAILED;
        }

        const ownerCreature = this.owner as ModuleCreature;
        let disarmSuccess = false;

        if(trap.creatorId !== undefined && trap.creatorId !== ModuleObjectConstant.OBJECT_INVALID && trap.creatorId === ownerCreature.id){
          disarmSuccess = true;
        }else{
          const disarmDC = Math.max(1, trap.trapDisarmDC || trap.trapDetectDC || 1);
          if(disarmDC > 35){
            return ActionStatus.FAILED;
          }
          const skillRank = ownerCreature.getSkillLevel(SkillType.DEMOLITIONS);
          const d20Roll = Math.floor(Math.random() * 20) + 1;
          disarmSuccess = (skillRank + d20Roll) >= disarmDC;
        }

        if(disarmSuccess){
          trap.destroy();
        }else{
          return ActionStatus.FAILED;
        }
      }

      return ActionStatus.COMPLETE;
    }
    
    return ActionStatus.FAILED;
  }

}