import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import { Action } from "@engine/actions/Action";
import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { isCreature } from "@engine/module/guards/isCreature";
import {
  classifyJumpDestination,
  isAreaLike,
  jumpFacingFromOrientation,
} from "@engine/movement/jump-to-location";
import { findOpenWalkLocation } from "@engine/pathfinding/open-walk-location";
import { getPathPersonalSpace } from "@engine/combat/attack-range";
import { applyLocalTeleport } from "@engine/movement/teleport";
import { ModuleLoadCoordinator } from '@engine/runtime/ModuleLoadCoordinator';

const _jumpCenter = new THREE.Vector3();
const _jumpSafe = new THREE.Vector3();

/**
 * ActionJumpToPoint — teleports the actor to a world point.
 * Always searches for a safe landing within searchRange. Param 4
 * (requireLineOfSight) gates offset candidates. Search failure → FAILED.
 *
 * Same area: set position. Foreign loaded area: detach/attach.
 * Foreign module: LoadModuleWithJumpSpawn (party leader / controlled).
 *
 * @file ActionJumpToPoint.ts
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
    // 0 - float: target x
    // 1 - float: target y
    // 2 - float: target z
    // 3 - dword: destination area object id
    // 4 - int: requireLineOfSight for safe-location offsets (default 1)
    // 5 - float: searchRange (safe location radius, default 20.0)
    // 6 - float: orientation vector x
    // 7 - float: orientation vector y
  }

  update(delta: number = 0): ActionStatus {
    this.x = this.getParameter<number>(0);
    this.y = this.getParameter<number>(1);
    this.z = this.getParameter<number>(2);
    const areaParam = this.getParameter<any>(3);
    const ox = this.getParameter<number>(6) || 0;
    const oy = this.getParameter<number>(7) || 0;
    this.facing = jumpFacingFromOrientation(ox, oy);

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    // Leave limbo when jumping from an area-less state.
    if(GameState.module?.isObjectInLimbo(this.owner) && !this.owner.area){
      GameState.module.removeObjectFromLimbo(this.owner);
    }

    let destArea: Area | undefined;
    if(isAreaLike(areaParam)){
      destArea = areaParam;
    }else if(typeof areaParam === 'number'){
      const obj = GameState.GameObjectManager?.GetObjectById?.(areaParam);
      if(isAreaLike(obj)){
        destArea = obj;
      }else{
        const areas = GameState.module?.areas || [];
        for(let i = 0; i < areas.length; i++){
          if(areas[i]?.id === areaParam || (areas[i] as any)?.objectId === areaParam){
            destArea = areas[i];
            break;
          }
        }
        if(!destArea && GameState.module?.area &&
          (GameState.module.area.id === areaParam || (GameState.module.area as any).objectId === areaParam)){
          destArea = GameState.module.area;
        }
      }
    }

    if(!destArea){
      destArea = this.owner.area;
    }

    const classified = classifyJumpDestination(
      this.owner.area,
      destArea,
      GameState.module?.filename || ''
    );

    if(classified.kind === 'loadModule' && classified.moduleName){
      const pc = GameState.PartyManager.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(this.owner === pc || this.owner.controlled){
        ModuleLoadCoordinator.LoadModuleWithJumpSpawn(classified.moduleName.toLowerCase(), {
          x: this.x,
          y: this.y,
          z: this.z,
          ox,
          oy,
        });
        return ActionStatus.COMPLETE;
      }
      // Non-leader NPC: cannot load module alone — fail like missing area
      return ActionStatus.FAILED;
    }

    if(classified.kind === 'reattach' && classified.area){
      applyAddToArea(this.owner, classified.area);
      destArea = classified.area;
    }

    // Always find a safe landing. Param 4 defaults true; some callers pass 0 (no LOS).
    const requireLineOfSight = (this.getParameter<number>(4) ?? 1) !== 0;
    const radius = this.getParameter<number>(5) ?? 20.0;
    _jumpCenter.set(this.x, this.y, this.z);

    if(!findOpenWalkLocation(destArea, _jumpCenter, _jumpSafe, {
      radius,
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
      this.facing
    );

    const leader = GameState.PartyManager?.party?.[0];
    if(this.owner === leader){
      GameState.PartyManager.resetFollowPath(this.owner);
    }

    return ActionStatus.COMPLETE;
  }
}

/** Attach creature to dest area when it differs from the current area. */
export function applyAddToArea(creature: Creature, destArea: Area){
  if(!creature || !destArea) return;
  if(creature.area && creature.area !== destArea){
    creature.area.detachObject?.(creature);
  }
  destArea.attachObject(creature);
}

export function applyLocalJump(
  creature: Creature,
  x: number,
  y: number,
  z: number,
  facing: number
){
  applyLocalTeleport(creature, x, y, z, facing);
}
