import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleObject } from "@/module/ModuleObject";
import { Action } from "@/actions/Action";
import { GameState } from "@/GameState";
import {
  classifyJumpDestination,
} from "@/engine/jump-to-location";
import { applyAddToArea, applyLocalJump } from "@/actions/ActionJumpToPoint";
import { findOpenWalkLocation } from "@/engine/pathfinding/open-walk-location";
import { getPathPersonalSpace } from "@/combat/attack-range";

import { isCreature } from "@/module/guards/isCreature";
import * as THREE from "three";
import { ModuleLoadCoordinator } from '@/engine/ModuleLoadCoordinator';

const _jumpCenter = new THREE.Vector3();
const _jumpSafe = new THREE.Vector3();

/**
 * ActionJumpToObject — teleports the actor to an object.
 * Always searches for a safe landing within radius 20. Param 1
 * (requireLineOfSight) gates offset candidates. Search failure → FAILED.
 *
 * @file ActionJumpToObject.ts
 */
export class ActionJumpToObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionJumpToObject;

    //PARAMS
    // 0 - dword: target object id
    // 1 - int: requireLineOfSight for safe-location offsets (default 1)
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);

    if(!this.target)
      return ActionStatus.FAILED;

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const destArea = this.target.area;
    const classified = classifyJumpDestination(
      this.owner.area,
      destArea,
      GameState.module?.filename || ''
    );

    if(classified.kind === 'loadModule' && classified.moduleName){
      const pc = GameState.PartyManager.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(this.owner === pc || this.owner.controlled){
        const rot = this.target.getRotationFromBearing?.() || this.target.rotation;
        ModuleLoadCoordinator.LoadModuleWithJumpSpawn(classified.moduleName.toLowerCase(), {
          x: this.target.position.x,
          y: this.target.position.y,
          z: this.target.position.z,
          ox: rot?.x ?? 0,
          oy: rot?.y ?? 1,
        });
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.FAILED;
    }

    if(classified.kind === 'reattach' && classified.area){
      applyAddToArea(this.owner, classified.area);
    }

    // Default true — offset hits must have a clear line to the center.
    const requireLineOfSight = (this.getParameter<number>(1) ?? 1) !== 0;
    const area = this.owner.area || this.target.area;
    _jumpCenter.copy(this.target.position);

    if(!findOpenWalkLocation(area, _jumpCenter, _jumpSafe, {
      radius: 20,
      personalSpace: getPathPersonalSpace(this.owner),
      owner: this.owner,
      requireLineOfSight,
      allowPartyCreatures: false,
    })){
      return ActionStatus.FAILED;
    }

    applyLocalJump(
      this.owner,
      _jumpSafe.x,
      _jumpSafe.y,
      _jumpSafe.z,
      this.target.rotation?.z ?? 0
    );

    const leader = GameState.PartyManager?.party?.[0];
    if(this.owner === leader){
      GameState.PartyManager.resetFollowPath(this.owner);
    }

    return ActionStatus.COMPLETE;
  }
}
