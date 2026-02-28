import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";


/**
 * ActionFollowLeader class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionFollowLeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionFollowLeader extends Action {
  path_realtime: boolean;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionFollowLeader;

    //PARAMS
    // No Params

  }

  update(_delta: number = 0): ActionStatus {
    if((BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))){
      if(GameState.Mode == EngineMode.DIALOG){
        this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
        return ActionStatus.FAILED;
      }

      this.target = GameState.PartyManager.party[0];

      const follow_destination = GameState.PartyManager.GetFollowPosition(this.owner as any);
      const distance = Utility.Distance2D(this.owner.position, this.target.position.clone());
      if(distance > 5){
        this.path_realtime = true;
        // (this.owner as any).openSpot = undefined;
        let actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, follow_destination.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, follow_destination.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, follow_destination.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 4.5 );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        return ActionStatus.IN_PROGRESS;
      }else{
        this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
        this.owner.force = 0;
        this.owner.speed = 0;
        this.owner.setComputedPath(undefined);
        return ActionStatus.COMPLETE;
      }
    }
    return ActionStatus.FAILED;
  }

}
