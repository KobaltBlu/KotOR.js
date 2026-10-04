import { ModuleObjectType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

const USE_OBJECT_RANGE = 4.5;

/**
 * ActionUseObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionUseObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionUseObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionUseObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleObject)){
      return ActionStatus.FAILED;
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > USE_OBJECT_RANGE){
        
      // this.owner.openSpot = undefined;
      enqueueMoveToPoint(this.owner, {
        x: this.target.position.x,
        y: this.target.position.y,
        z: this.target.position.z,
        area: GameState.module.area.id,
        target: this.target.id,
        run: true,
        range: USE_OBJECT_RANGE,
        timeout: 30.0,
        groupId: this.groupId,
      });

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      this.owner.force = 0;
      this.owner.speed = 0;
      //console.log(this.target);

      this.owner.setFacingObject( this.target );

      if(this.target != GameState.PartyManager.Player){
        this.target.use(this.owner);
      }

      return ActionStatus.COMPLETE;
    }
    return ActionStatus.FAILED;
  }

}
