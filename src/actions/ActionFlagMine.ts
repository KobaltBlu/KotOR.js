import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleTriggerType } from "@/enums/module/ModuleTriggerType";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleTrigger } from "@/module/ModuleTrigger";
import { BitWise } from "@/utility/BitWise";


/**
 * ActionFlagMine class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionFlagMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionFlagMine extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionFlagMine;

    //PARAMS - unknown
    //0 - DWORD: oTarget
  }

  update(delta?: number): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

    if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleTrigger)){
      const trap: ModuleTrigger = this.target as any;
      if(trap.type != ModuleTriggerType.TRAP){
        return ActionStatus.FAILED;
      }

      trap.detectTrap();

      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
