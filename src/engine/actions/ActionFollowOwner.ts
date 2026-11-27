import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { GameState } from "@engine/runtime/GameState";
import { Utility } from "@core/utility/Utility";
import { Action } from "@engine/actions/Action";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * ActionFollowOwner class.
 * TSL puppet follow-owner action.
 * While in range: IN_PROGRESS. Out of range: queue MoveToPoint to owner
 * + re-queue FollowOwner, then COMPLETE.
 *
 * @file ActionFollowOwner.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionFollowOwner extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionFollowOwner;

    //PARAMS
    // 0 - float: fFollowDistance (follow distance threshold from PUP owner)
  }

  update(_delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.ERROR;
    }

    if(this.owner.isDead?.() || this.owner.isDebilitated?.()){
      return ActionStatus.ERROR;
    }

    if(!this.owner.area){
      return ActionStatus.IN_PROGRESS;
    }

    const range = this.getParameter<number>(0) || 0.0;
    const followOwner = GameState.PartyManager.GetPUPOwner(this.owner);
    if(!isCreature(followOwner)){
      return ActionStatus.IN_PROGRESS;
    }

    const dist = Utility.Distance2D(this.owner.position, followOwner.position);
    if(dist <= range){
      this.owner.force = 0;
      this.owner.speed = 0;
      return ActionStatus.IN_PROGRESS;
    }

    const move = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
    move.setParameter(0, ActionParameterType.FLOAT, followOwner.position.x);
    move.setParameter(1, ActionParameterType.FLOAT, followOwner.position.y);
    move.setParameter(2, ActionParameterType.FLOAT, followOwner.position.z);
    move.setParameter(3, ActionParameterType.DWORD, this.owner.area.id);
    move.setParameter(4, ActionParameterType.DWORD, followOwner.id);
    move.setParameter(5, ActionParameterType.INT, 1);
    move.setParameter(6, ActionParameterType.FLOAT, range);
    move.setParameter(7, ActionParameterType.INT, 0);
    move.setParameter(8, ActionParameterType.FLOAT, 30.0);

    const follow = new GameState.ActionFactory.ActionFollowOwner(undefined, this.groupId);
    follow.setParameter(0, ActionParameterType.FLOAT, range);

    this.owner.actionQueue.add(move);
    this.owner.actionQueue.add(follow);
    return ActionStatus.COMPLETE;
  }

}
