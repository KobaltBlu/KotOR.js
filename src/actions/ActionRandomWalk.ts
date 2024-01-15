import * as THREE from "three";
import { GameState } from "../GameState";
import { ActionParameterType, ActionStatus, ActionType, ModuleObjectType } from "../enums";
import type { ModuleCreature } from "../module/ModuleCreature";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";

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
    super(groupId);
    this.type = ActionType.ActionRandomWalk;

    //PARAMS
  }

  update(delta?: number): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as ModuleCreature;

    if(!owner.room || !owner.room.collisionData.walkmesh){
      return ActionStatus.FAILED;
    }

    let run = false;
    let maxDistance = 1.5;
    let position = new THREE.Vector3();

    const faces = owner.room.collisionData.walkmesh.walkableFaces;
    const face = faces[Math.floor(Math.random()*faces.length)];

    if(!face){
      return ActionStatus.FAILED;
    }

    position.copy(face.centroid);

    const action = new GameState.ActionFactory.ActionMoveToPoint();
    action.setParameter(0, ActionParameterType.FLOAT, position.x);
    action.setParameter(1, ActionParameterType.FLOAT, position.y);
    action.setParameter(2, ActionParameterType.FLOAT, position.z);
    action.setParameter(3, ActionParameterType.DWORD, this.owner.area);
    action.setParameter(4, ActionParameterType.DWORD, 0xFFFFFFFF);
    action.setParameter(5, ActionParameterType.INT, run ? 1 : 0);
    action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, maxDistance));
    action.setParameter(7, ActionParameterType.INT, 0);
    action.setParameter(8, ActionParameterType.FLOAT, 30.0);
    owner.actionQueue.addFront(action);

    return ActionStatus.COMPLETE;
  }

}