import { ActionMoveToPoint } from ".";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { ModuleCreature, ModuleObject } from "../module";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

export class ActionPhysicalAttacks extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionPhysicalAttacks;
  }

  update(delta: number = 0): ActionStatus {
    
    this.target = this.getParameter(1);

    if(!(this.target instanceof ModuleObject)){
      return ActionStatus.FAILED;
    }

    if(!(this.owner instanceof ModuleCreature)){
      return ActionStatus.FAILED;
    }

    this.owner.resetExcitedDuration();
    let range = ( this.owner.getEquippedWeaponType() == 4 ? 15.0 : 2.0 );

    //if(!this.combatAction.isCutsceneAttack){
      if(this.target.isDead()){
        return ActionStatus.FAILED;
      }else{
        let distance = Utility.Distance2D(this.owner.position, this.target.position);
        if( distance > range ){

          this.owner.openSpot = undefined;
          let target_position = this.target.position.clone();

          if(this.target instanceof ModuleCreature){
            if(this.owner.getEquippedWeaponType() != 4){ //RANGED
              this.owner.openSpot = this.target.getClosesetOpenSpot(this.owner);
              if(typeof this.owner.openSpot != 'undefined'){
                target_position.copy(this.owner.openSpot.targetVector);
              }
            }
          }



          let actionMoveToTarget = new ActionMoveToPoint(undefined, this.groupId);
          actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, target_position.x);
          actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, target_position.y);
          actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, target_position.z);
          actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
          actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
          actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
          actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, range );
          actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
          actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
          this.owner.actionQueue.addFront(actionMoveToTarget);

          return ActionStatus.IN_PROGRESS;
        }else{
          this.owner.animState = ModuleCreatureAnimState.IDLE;
          this.owner.force = 0;
          this.owner.speed = 0;
          this.owner.openSpot = undefined;
          return ActionStatus.COMPLETE;
        }
      }
    //}
  }

}
