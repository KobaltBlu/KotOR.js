import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleObject } from "../module/ModuleObject";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";
import * as THREE from "three";

/**
 * ActionJumpToPoint class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionJumpToPoint.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionJumpToPoint extends Action {
  x: number;
  y: number;
  z: number;
  facing: number;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionJumpToPoint;

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.facing = 0;
    this.target = undefined;

    //PARAMS
    // 0 - float: x
    // 1 - float: y
    // 2 - float: z
    // 3 - dword: target area object id
    // 4 - int: unknown
    // 5 - float: 20.0? maybe max safe distance check radius
    // 6 - float: rotation x
    // 7 - float: rotation y
    
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(3);

    //if(!(this.target instanceof ModuleObject))
    //  return ActionStatus.FAILED;

    this.x = this.getParameter<number>(0);
    this.y = this.getParameter<number>(1);
    this.z = this.getParameter<number>(2);

    this.facing = -Math.atan2(
      this.getParameter<number>(6),
      this.getParameter<number>(7)
    );

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      this.owner.setPosition(new THREE.Vector3(this.x, this.y, this.z));
      this.owner.setFacing(this.facing, false);
      this.owner.collisionData.groundFace = undefined;
      this.owner.collisionData.lastGroundFace = undefined;
      //this.getCurrentRoom();
      this.owner.collisionData.findWalkableFace();
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
