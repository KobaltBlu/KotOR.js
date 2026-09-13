import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { Action } from "@/actions/Action";
import * as THREE from "three";
import { GameState } from "@/GameState";
import { isCreature } from "@/module/guards/isCreature";
import {
  classifyJumpDestination,
  isAreaLike,
  jumpFacingFromOrientation,
} from "@/engine/jump-to-location";

/**
 * ActionJumpToPoint — jump-to-point action.
 *
 * Same area: SetPosition. Foreign loaded area: AddToArea (detach/attach).
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
    // 3 - dword: target area object id
    // 4 - int: bWalkStraight (safe location check flag)
    // 5 - float: fSearchRange (radius for safe location search, default 20.0)
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

    // : leave limbo when jumping from area-less state
    if(GameState.module?.isObjectInLimbo(this.owner) && !this.owner.area){
      GameState.module.removeObjectFromLimbo(this.owner);
    }

    let destArea: ModuleArea | undefined;
    if(isAreaLike(areaParam)){
      destArea = areaParam;
    }else if(typeof areaParam === 'number'){
      const obj = GameState.ModuleObjectManager?.GetObjectById?.(areaParam);
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
      const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(this.owner === pc || this.owner.controlled){
        GameState.LoadModuleWithJumpSpawn(classified.moduleName.toLowerCase(), {
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
    }

    applyLocalJump(this.owner, this.x, this.y, this.z, this.facing);

    const leader = GameState.PartyManager?.party?.[0];
    if(this.owner === leader){
      GameState.PartyManager.resetFollowPath(this.owner);
    }

    return ActionStatus.COMPLETE;
  }
}

/** AddToArea when dest area ≠ current. */
export function applyAddToArea(creature: ModuleCreature, destArea: ModuleArea){
  if(!creature || !destArea) return;
  if(creature.area && creature.area !== destArea){
    creature.area.detachObject?.(creature);
  }
  destArea.attachObject(creature);
}

export function applyLocalJump(
  creature: ModuleCreature,
  x: number,
  y: number,
  z: number,
  facing: number
){
  creature.setPosition(new THREE.Vector3(x, y, z));
  // jump-to-point → SetOrientation (instant).
  creature.setFacing(facing, true);
  if(creature.collisionManager){
    creature.collisionManager.groundFace = undefined;
    creature.collisionManager.lastGroundFace = undefined;
    creature.collisionManager.findWalkableFace?.();
  }
}
