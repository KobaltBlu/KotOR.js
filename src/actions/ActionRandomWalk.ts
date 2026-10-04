import * as THREE from "three";
import { GameState } from "@/GameState";
import { ActionParameterType, ActionStatus, ActionType, ModuleObjectType } from "@/enums";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

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
  }

  update(delta?: number): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as ModuleCreature;

    if(!owner.room || !owner.room.collisionManager.walkmesh){
      return ActionStatus.FAILED;
    }

    let run = false;
    let maxDistance = 1.5;
    let position = new THREE.Vector3();

    const faces = owner.room.collisionManager.walkmesh.walkableFaces;
    const face = faces[Math.floor(Math.random()*faces.length)];

    if(!face){
      return ActionStatus.FAILED;
    }

    position.copy(face.centroid);

    enqueueMoveToPoint(owner, {
      x: position.x,
      y: position.y,
      z: position.z,
      area: this.owner.area,
      target: 0xFFFFFFFF,
      run,
      range: Math.max(1.5, maxDistance),
      timeout: 30.0,
      groupId: this.groupId,
    });

    return ActionStatus.COMPLETE;
  }

}