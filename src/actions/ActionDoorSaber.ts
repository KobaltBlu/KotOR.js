import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleObject } from "@/module/ModuleObject";
import { queueMoveIntoUseRange } from "@/actions/use-range";
import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";

/** PlayAnimation id 0x28bd during DoorSaber timing bar. */
const DOOR_SABER_ANIM = 0x28bd;
/** StartGuiTimingBar(2000, 9). */
const DOOR_SABER_BAR_MS = 2000;
const DOOR_SABER_BAR_TYPE = 9;

/**
 * ActionDoorSaber class.
 * TSL door-saber action — cut open a locked door with a lightsaber.
 * RunActions case 0x43.
 *
 * PARAMS
 * 0 - dword: door object id
 * 1 - int: faced (creature field ≈ 0x10ac)
 * 2 - int: timingStarted (creature field ≈ 0x10b0)
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
    if(!isCreature(this.owner)){
      return ActionStatus.ERROR;
    }

    if(this.owner.isDead?.() || this.owner.isDebilitated?.()){
      this.stopBar(this.owner);
      return ActionStatus.ERROR;
    }

    this.target = this.getParameter<ModuleObject>(0);
    if(!isDoor(this.target)){
      this.stopBar(this.owner);
      return ActionStatus.ERROR;
    }

    const faced = this.getParameter<number>(1) || 0;
    const timingStarted = this.getParameter<number>(2) || 0;

    this.powerSabers(this.owner);

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    this.owner.force = 0;
    this.owner.speed = 0;
    this.owner.setFacingObject?.(this.target);

    if(!faced){
      this.requeueSelf(this.owner, this.target, 1, 0);
      const face = new GameState.ActionFactory.ActionChangeFacingObject(undefined, this.groupId);
      face.setParameter(0, ActionParameterType.DWORD, this.target.id);
      this.owner.actionQueue.addFront(face);
      return ActionStatus.COMPLETE;
    }

    if(!timingStarted){
      const anim = new GameState.ActionFactory.ActionPlayAnimation(undefined, this.groupId);
      anim.setParameter(0, ActionParameterType.INT, DOOR_SABER_ANIM);
      anim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      anim.setParameter(2, ActionParameterType.FLOAT, 2.0);
      anim.setParameter(3, ActionParameterType.INT, 1);

      this.requeueSelf(this.owner, this.target, 1, 1);
      this.owner.actionQueue.addFront(anim);

      GameState.GuiTimingBarManager?.startMs?.(
        DOOR_SABER_BAR_MS,
        '',
        this.owner,
        DOOR_SABER_BAR_TYPE
      );
      return ActionStatus.COMPLETE;
    }

    // Timing finished — open locked door (clears lock then OpenDoor)
    if(this.target.isLocked() || this.target.locked){
      this.target.setLocked(false);
      this.target.openDoor(this.owner);
    }else{
      GameState.FeedbackMessageManager?.SendFeedbackMessage?.(0xe);
      this.stopBar(this.owner);
      return ActionStatus.ERROR;
    }

    this.stopBar(this.owner);
    this.owner.setAnimationState?.(ModuleCreatureAnimState.IDLE);
    return ActionStatus.COMPLETE;
  }

}
