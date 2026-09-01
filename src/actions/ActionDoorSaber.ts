import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { queueMoveIntoUseRange } from "@/actions/use-range";

/** Retail PlayAnimation id 0x28bd during DoorSaber timing bar. */
const DOOR_SABER_ANIM = 0x28bd;
/** Retail StartGuiTimingBar(2000, 9). */
const DOOR_SABER_BAR_MS = 2000;
const DOOR_SABER_BAR_TYPE = 9;

/**
 * ActionDoorSaber class.
 * TSL door-saber action — cut open a locked door with a lightsaber.
 * RunActions case 0x43.
 *
 * PARAMS
 *  0 - dword: door object id
 *  1 - int: faced (retail creature field ≈ 0x10ac)
 *  2 - int: timingStarted (retail creature field ≈ 0x10b0)
 *
 * @file ActionDoorSaber.ts
 */
export class ActionDoorSaber extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDoorSaber;
  }

  private stopBar(owner: ModuleCreature){
    GameState.GuiTimingBarManager?.stopFor?.(owner);
  }

  private powerSabers(owner: ModuleCreature){
    const rh = owner.equipment?.RIGHTHAND;
    const lh = owner.equipment?.LEFTHAND;
    if(rh?.isLightsaber?.()){
      rh.setPowered?.(true);
    }
    if(lh?.isLightsaber?.()){
      lh.setPowered?.(true);
    }
  }

  private requeueSelf(owner: ModuleCreature, door: ModuleDoor, faced: number, timingStarted: number){
    const again = new GameState.ActionFactory.ActionDoorSaber(undefined, this.groupId);
    again.setParameter(0, ActionParameterType.DWORD, door.id);
    again.setParameter(1, ActionParameterType.INT, faced);
    again.setParameter(2, ActionParameterType.INT, timingStarted);
    owner.actionQueue.addFront(again);
  }

  update(_delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead?.() || owner.isDebilitated?.()){
      this.stopBar(owner);
      return ActionStatus.ERROR;
    }

    this.target = this.getParameter<ModuleObject>(0);
    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor)){
      this.stopBar(owner);
      return ActionStatus.ERROR;
    }

    const door = this.target as ModuleDoor;
    const faced = this.getParameter<number>(1) || 0;
    const timingStarted = this.getParameter<number>(2) || 0;

    this.powerSabers(owner);

    if(queueMoveIntoUseRange(owner, door, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    owner.force = 0;
    owner.speed = 0;
    owner.setFacingObject?.(door);

    if(!faced){
      this.requeueSelf(owner, door, 1, 0);
      const face = new GameState.ActionFactory.ActionChangeFacingObject(undefined, this.groupId);
      face.setParameter(0, ActionParameterType.DWORD, door.id);
      owner.actionQueue.addFront(face);
      return ActionStatus.COMPLETE;
    }

    if(!timingStarted){
      const anim = new GameState.ActionFactory.ActionPlayAnimation(undefined, this.groupId);
      anim.setParameter(0, ActionParameterType.INT, DOOR_SABER_ANIM);
      anim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      anim.setParameter(2, ActionParameterType.FLOAT, 2.0);
      anim.setParameter(3, ActionParameterType.INT, 1);

      this.requeueSelf(owner, door, 1, 1);
      owner.actionQueue.addFront(anim);

      GameState.GuiTimingBarManager?.startMs?.(
        DOOR_SABER_BAR_MS,
        '',
        owner,
        DOOR_SABER_BAR_TYPE
      );
      return ActionStatus.COMPLETE;
    }

    // Timing finished — open locked door (retail clears lock then OpenDoor)
    if(door.isLocked() || door.locked){
      door.setLocked(false);
      door.openDoor(owner);
    }else{
      GameState.FeedbackMessageManager?.SendFeedbackMessage?.(0xe);
      this.stopBar(owner);
      return ActionStatus.ERROR;
    }

    this.stopBar(owner);
    owner.setAnimationState?.(ModuleCreatureAnimState.IDLE);
    return ActionStatus.COMPLETE;
  }

}
