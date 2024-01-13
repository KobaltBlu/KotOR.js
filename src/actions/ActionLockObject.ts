import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { GameState } from "../GameState";
// import { ModuleCreature, ModuleDoor, ModulePlaceable } from "../module";
import { BitWise } from "../utility/BitWise";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

/**
 * ActionLockObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionLockObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionLockObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionLockObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) && !BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable))
      return ActionStatus.FAILED;

    this.target = this.getParameter(0);

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        
        (this.owner as any).openSpot = undefined;
        let actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 2 );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);
  
        return ActionStatus.IN_PROGRESS;
      }else{
        this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
        this.owner.force = 0;
        //console.log(action.object);

        this.owner.setFacingObject( this.target );

        if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor)){
          (this.target as any).closeDoor(this.owner);
        }else if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)){
          (this.target as any).close(this.owner);
        }

        (this.target as any).setLocked(true);
        return ActionStatus.COMPLETE;
        
      }
    }else{
      if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor)){
        (this.target as any).closeDoor(this.owner);
      }else if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)){
        (this.target as any).close(this.owner);
      }

      (this.target as any).setLocked(true);
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
