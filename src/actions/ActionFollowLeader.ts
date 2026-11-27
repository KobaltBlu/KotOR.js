import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

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

  update(delta: number = 0): ActionStatus {
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
        enqueueMoveToPoint(this.owner, {
          x: follow_destination.x,
          y: follow_destination.y,
          z: follow_destination.z,
          area: GameState.module.area.id,
          target: this.target.id,
          run: true,
          range: 4.5,
          timeout: 30.0,
          groupId: this.groupId,
        });

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
