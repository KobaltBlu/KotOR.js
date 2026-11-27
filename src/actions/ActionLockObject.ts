import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

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
    super(actionId, groupId);
    this.type = ActionType.ActionLockObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) && !BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable))
      return ActionStatus.FAILED;

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        
        // (this.owner as any).openSpot = undefined;
        enqueueMoveToPoint(this.owner, {
          x: this.target.position.x,
          y: this.target.position.y,
          z: this.target.position.z,
          area: GameState.module.area.id,
          target: this.target.id,
          run: true,
          range: 2,
          timeout: 30.0,
          groupId: this.groupId,
        });
  
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
