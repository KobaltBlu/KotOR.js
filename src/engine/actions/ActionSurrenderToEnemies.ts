import { Action } from "@engine/actions/Action";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { isCreature } from "@engine/module/guards/isCreature";

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

    // == 1 → FAILED (plot/immortal gate)
    if(this.owner.plot){
      return ActionStatus.FAILED;
    }

    this.owner.surrenderToEnemies(false);
    this.owner.setCommandable(false);
    return ActionStatus.COMPLETE;
  }

}
