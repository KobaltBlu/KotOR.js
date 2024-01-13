import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { SSFType } from "../enums/resource/SSFType";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";

/**
 * ActionUnlockObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionUnlockObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionUnlockObject extends Action {
  timer: number;
  shouted: any;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionUnlockObject;
    this.timer = 1.5;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
      return ActionStatus.FAILED;

    this.target = this.getParameter(0);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) && !BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable))
      return ActionStatus.FAILED;

    if(!this.shouted){
      this.shouted = true;
      this.owner.playSoundSet(SSFType.UNLOCK);
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 1.5){
        
      this.owner.openSpot = undefined;
      let actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 1.5 );
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      this.owner.force = 0;
      this.owner.speed = 0;
                        
      if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
        this.owner.setFacingObject( this.target );

      if(this.timer == undefined){
        this.timer = 1.5;
        this.target.audioEmitter.playSound('gui_lockpick');
      }

      if(!this.owner.isSimpleCreature()){
        if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor)){
          this.owner.setAnimationState(ModuleCreatureAnimState.UNLOCK_DOOR);
        }else{
          this.owner.setAnimationState(ModuleCreatureAnimState.UNLOCK_CONTAINER);
        }
      }

      this.timer -= delta;

      if(this.timer <= 0){
        (this.target as any).attemptUnlock(this.owner);
        return ActionStatus.COMPLETE;
      }

      return ActionStatus.IN_PROGRESS;
      
    }

    return ActionStatus.FAILED;
  }

}
