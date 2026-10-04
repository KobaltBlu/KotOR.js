import { ModuleObjectType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import { ModuleDoor } from "@/module/ModuleDoor";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

/**
 * ActionCloseDoor class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionCloseDoor.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionCloseDoor extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionCloseDoor;

    //PARAMS
    // 0 - dword: door object id
    // 1 - int : always zero?

  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor))
      return ActionStatus.FAILED;

    if(!(this.target as ModuleDoor).isOpen())
      return ActionStatus.FAILED;

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        
        // this.owner.openSpot = undefined;
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
        this.owner.speed = 0;
        //console.log(action.object);

        this.owner.setFacingObject( this.target );
        
        (this.target as ModuleDoor).closeDoor(this.owner);
        return ActionStatus.COMPLETE;
        
      }
    }else{
      (this.target as ModuleDoor).closeDoor(this.owner);
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
