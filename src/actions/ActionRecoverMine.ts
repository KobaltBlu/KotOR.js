import { GameState } from "../GameState";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleTriggerType } from "../enums/module/ModuleTriggerType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { SkillType } from "../enums/nwscript/SkillType";
import { ResourceLoader } from "../loaders/ResourceLoader";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleObject } from "../module/ModuleObject";
import type { ModuleTrigger } from "../module/ModuleTrigger";
import { GFFObject } from "../resource/GFFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import { BitWise } from "../utility/BitWise";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

/**
 * ActionRecoverMine class.
 * Recover a trap/mine (remove it and add the trap as a placeable item to inventory).
 * Matches RunActions case 0x1A / AIActionRecoverMine: creature only, distance 3, target must be
 * trigger type TRAP; recover uses Demolitions + d20 vs DC (same rules as disarm: max(1, disarm/detect DC),
 * fail if DC > 35, auto-success if creator). Trap must be disarmable. On success destroy trigger
 * and create item from trap resref (UTP).
 *
 * @file ActionRecoverMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionRecoverMine extends Action {

  constructor(actionId: number = -1, groupId: number = -1) {
    super(actionId, groupId);
    this.type = ActionType.ActionRecoverMine;

    // 0 - DWORD: oTarget (trigger/mine)
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

    if (distance > 3) {
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, this.target.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 3);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    if (!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleTrigger)) {
      return ActionStatus.FAILED;
    }

    const trap = this.target as ModuleTrigger;
    if (trap.type !== ModuleTriggerType.TRAP) {
      return ActionStatus.FAILED;
    }

    if (!trap.trapDisarmable) {
      return ActionStatus.FAILED;
    }

    let recoverSuccess = false;
    if (
      trap.creatorId !== undefined &&
      trap.creatorId !== ModuleObjectConstant.OBJECT_INVALID &&
      trap.creatorId === ownerCreature.id
    ) {
      recoverSuccess = true;
    } else {
      const recoverDC = Math.max(1, trap.trapDisarmDC || trap.trapDetectDC || 1);
      if (recoverDC > 35) {
        return ActionStatus.FAILED;
      }
      const skillRank = ownerCreature.getSkillLevel(SkillType.DEMOLITIONS);
      const d20Roll = Math.floor(Math.random() * 20) + 1;
      recoverSuccess = skillRank + d20Roll >= recoverDC;
    }

    if (!recoverSuccess) {
      return ActionStatus.FAILED;
    }

    if (!trap.trapResRef) {
      trap.destroy();
      return ActionStatus.COMPLETE;
    }

    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utp'], trap.trapResRef);
    if (buffer) {
      const item = new GameState.Module.ModuleArea.ModuleItem(new GFFObject(buffer));
      ownerCreature.addItem(item);
    }

    trap.destroy();
    return ActionStatus.COMPLETE;
  }
}