import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { ActionParameterType, ActionStatus, ActionType } from "@core/enums";
import { Action } from "@engine/actions/Action";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * ActionRandomWalk class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionRandomWalk.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionRandomWalk extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionRandomWalk;

    //PARAMS
    // none
  }

  update(delta?: number): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    if(!this.owner.room || !this.owner.room.collisionManager.walkmesh){
      return ActionStatus.FAILED;
    }

    let run = false;
    let maxDistance = 1.5;
    let position = new THREE.Vector3();

    const faces = this.owner.room.collisionManager.walkmesh.walkableFaces;
    const face = faces[Math.floor(Math.random()*faces.length)];

    if(!face){
      return ActionStatus.FAILED;
    }

    position.copy(face.centroid);

    const action = new GameState.ActionFactory.ActionMoveToPoint();
    action.setParameter(0, ActionParameterType.FLOAT, position.x);
    action.setParameter(1, ActionParameterType.FLOAT, position.y);
    action.setParameter(2, ActionParameterType.FLOAT, position.z);
    action.setParameter(3, ActionParameterType.DWORD, this.owner.area?.id ?? 0);
    action.setParameter(4, ActionParameterType.DWORD, 0xFFFFFFFF);
    action.setParameter(5, ActionParameterType.INT, run ? 1 : 0);
    action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, maxDistance));
    action.setParameter(7, ActionParameterType.INT, 0);
    action.setParameter(8, ActionParameterType.FLOAT, 30.0);
    this.owner.actionQueue.addFront(action);

    return ActionStatus.IN_PROGRESS;
  }

}