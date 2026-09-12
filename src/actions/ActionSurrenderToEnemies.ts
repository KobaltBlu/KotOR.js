import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";

/**
 * ActionSurrenderToEnemies class.
 *
 * surrender action → SurrenderToEnemies(0).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionSurrenderToEnemies.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionSurrenderToEnemies extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionSurrenderToEnemies;

    //PARAMS
    // none
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    // == 1 → FAILED (plot/immortal gate)
    if(owner.plot){
      return ActionStatus.FAILED;
    }

    owner.surrenderToEnemies(false);
    owner.setCommandable(false);
    return ActionStatus.COMPLETE;
  }

}
