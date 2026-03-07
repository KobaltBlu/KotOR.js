import { GameState } from "../GameState";
import { ModuleTriggerType } from "../enums";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { SkillType } from "../enums/nwscript/SkillType";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleDoor } from "../module/ModuleDoor";
import type { ModuleObject } from "../module/ModuleObject";
import type { ModulePlaceable } from "../module/ModulePlaceable";
import type { ModuleTrigger } from "../module/ModuleTrigger";
import { BitWise } from "../utility/BitWise";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

/**
 * ActionExamineMine class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionExamineMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ActionExamineMine extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionExamineMine;

    //PARAMS - unknown
    //0 - DWORD: oTarget
  }

  update(delta?: number): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);
    if (!this.target) {
      return ActionStatus.FAILED;
    }

    if (!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) {
      return ActionStatus.FAILED;
    }

    const ownerCreature = this.owner as ModuleCreature;

    const distance = Utility.Distance2D(this.owner.position, this.target.position);
    if (distance > 2 && !this.target.box.intersectsBox(this.owner.box)) {
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 2);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    if (!ownerCreature.examineMineInProgress) {
      ownerCreature.examineMineInProgress = true;
      const reExamine = new GameState.ActionFactory.ActionExamineMine();
      reExamine.setParameter(0, ActionParameterType.DWORD, this.target);
      this.owner.actionQueue.addFront(reExamine);
      const waitAction = new GameState.ActionFactory.ActionWait();
      waitAction.setParameter(0, ActionParameterType.FLOAT, 4);
      this.owner.actionQueue.addFront(waitAction);
      return ActionStatus.IN_PROGRESS;
    }

    ownerCreature.examineMineInProgress = false;

    const skillRank = ownerCreature.getSkillLevel(SkillType.DEMOLITIONS);
    const d20Roll = Math.floor(Math.random() * 20) + 1;

    let detectDC: number;
    let rawDisarmDC: number;
    let trapType: number;
    let trapDisarmable: boolean;
    let isCreatorTrap = false;

    if (BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleTrigger)) {
      const trap = this.target as ModuleTrigger;
      if (trap.type !== ModuleTriggerType.TRAP) {
        return ActionStatus.FAILED;
      }
      rawDisarmDC = trap.trapDisarmDC || trap.trapDetectDC || 1;
      detectDC = Math.max(1, rawDisarmDC - 7);
      trapType = trap.trapType ?? 0;
      trapDisarmable = trap.trapDisarmable ?? false;
      if (trap.creatorId !== undefined && trap.creatorId !== ModuleObjectConstant.OBJECT_INVALID && trap.creatorId === ownerCreature.id) {
        isCreatorTrap = true;
      }
    } else if (BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor)) {
      const door = this.target as ModuleDoor;
      rawDisarmDC = door.trapDisarmDC || door.trapDetectDC || 1;
      detectDC = Math.max(1, rawDisarmDC - 7);
      trapType = door.trapType ?? 0;
      trapDisarmable = door.trapDisarmable ?? false;
    } else if (BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)) {
      const placeable = this.target as ModulePlaceable;
      rawDisarmDC = placeable.trapDisarmDC || placeable.trapDetectDC || 1;
      detectDC = Math.max(1, rawDisarmDC - 7);
      trapType = placeable.trapType ?? 0;
      trapDisarmable = placeable.trapDisarmable ?? false;
    } else {
      return ActionStatus.FAILED;
    }

    const detected = isCreatorTrap || (skillRank + d20Roll >= detectDC);

    let difficulty: number;
    if (!trapDisarmable || rawDisarmDC > 35) {
      difficulty = 4;
    } else if (skillRank + 5 < rawDisarmDC) {
      if (skillRank + 10 < rawDisarmDC) {
        if (skillRank + 15 < rawDisarmDC) {
          difficulty = skillRank + 20 < rawDisarmDC ? 4 : 3;
        } else {
          difficulty = 2;
        }
      } else {
        difficulty = 1;
      }
    } else {
      difficulty = 0;
    }

    if (detected && BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleTrigger)) {
      const trap = this.target as ModuleTrigger;
      trap.detectTrap();
    }

    if (GameState.module) {
      (GameState as any).lastExamineMineResult = {
        targetId: this.target.id,
        target: this.target,
        detected,
        trapType,
        difficulty,
        skillRank,
        d20Roll,
        detectDC,
        rawDisarmDC,
      };
    }

    return ActionStatus.COMPLETE;
  }

}