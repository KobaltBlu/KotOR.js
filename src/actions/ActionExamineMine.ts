import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

/**
 * ActionExamineMine class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionExamineMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionExamineMine extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionExamineMine;

    //PARAMS - unknown
    //0 - DWORD: oTarget
  }

  update(delta?: number): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

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
      }

      //todo: examine mine
      return ActionStatus.COMPLETE;
    }
    
    return ActionStatus.FAILED;
  }

}