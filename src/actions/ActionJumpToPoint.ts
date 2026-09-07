import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import * as THREE from "three";
import { GameState } from "@/GameState";
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
    // 0 - float: x
    // 1 - float: y
    // 2 - float: z
    // 3 - dword: target area object id
    // 4 - int: unknown (takeStraightLine)
    // 5 - float: find safe location radius (default 20)
    // 6 - float: rotation x
    // 7 - float: rotation y
  }

  update(delta: number = 0): ActionStatus {
    this.x = this.getParameter<number>(0);
    this.y = this.getParameter<number>(1);
    this.z = this.getParameter<number>(2);
    const areaParam = this.getParameter<any>(3);
    const ox = this.getParameter<number>(6) || 0;
    const oy = this.getParameter<number>(7) || 0;
    this.facing = jumpFacingFromOrientation(ox, oy);

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const creature = this.owner as ModuleCreature;

    // : leave limbo when jumping from area-less state
    if(GameState.module?.isObjectInLimbo(creature) && !creature.area){
      GameState.module.removeObjectFromLimbo(creature);
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
      destArea = creature.area || GameState.module?.area;
    }

    const classified = classifyJumpDestination(
      creature.area,
      destArea,
      GameState.module?.filename || ''
    );

    if(classified.kind === 'loadModule' && classified.moduleName){
      const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(creature === pc || creature.controlled){
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
      applyAddToArea(creature, classified.area);
    }

    applyLocalJump(creature, this.x, this.y, this.z, this.facing);

    const leader = GameState.PartyManager?.party?.[0];
    if(creature === leader){
      GameState.PartyManager.resetFollowPath(creature);
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
