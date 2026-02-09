import { GameState } from "../GameState";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleTriggerType } from "../enums/module/ModuleTriggerType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { SkillType } from "../enums/nwscript/SkillType";
import { SignalEventType } from "../enums";
import { ResourceLoader } from "../loaders/ResourceLoader";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleDoor } from "../module/ModuleDoor";
import type { ModuleObject } from "../module/ModuleObject";
import type { ModulePlaceable } from "../module/ModulePlaceable";
import type { ModuleTrigger } from "../module/ModuleTrigger";
import { GFFObject } from "../resource/GFFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import { BitWise } from "../utility/BitWise";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

/** Recover delay in seconds (matches StartGuiTimingBar 0x1194 = 4500ms). */
const RECOVER_DELAY_SECONDS = 4.5;

/** Use-range margin for GetIsInUseRange (Reva: 0.25). */
const USE_RANGE_MARGIN = 0.25;

/** Default use range when not in range (Reva: GetUseRange fallback; we use 3.0). */
const DEFAULT_USE_RANGE = 3.0;

/** BroadcastSkillData skill id (Reva: SetInteger 0, 0x5fb = 1531). */
const BROADCAST_SKILL_ID = 0x5fb;

/** BroadcastSkillData subtype (Reva: SetInteger 6, 0x144 = 324). */
const BROADCAST_SKILL_SUBTYPE = 0x144;

/** Recover result type: 0 = fail, 1 = success, 2 = critical fail, 3 = auto-fail (roll failed), 4 = auto success. */
export const RecoverMineResultType = {
  FAIL: 0,
  SUCCESS: 1,
  CRITICAL_FAIL: 2,
  AUTO_FAIL: 3,
  AUTO_SUCCESS: 4,
} as const;

/**
 * ActionRecoverMine class.
 * Recover a trap/mine: remove the trap and add the trap item to inventory.
 * 1:1 parity with CSWSCreature::AIActionRecoverMine (Reva 0x00518c40):
 * - Target: Trigger (TRAP), Door, or Placeable (object type from param 0).
 * - Range: GetIsInUseRange(target, 0.25); if false, GetUseRange → move (we use 3.0).
 * - First run: set recoverMineInProgress, queue self + Wait(4.5s) + ChangeFacing(0x13) + PlayAnimation(0x06), StartGuiTimingBar(0x1194), return IN_PROGRESS.
 * - Second run: Demolitions + d20 vs DC (DC = max(1, disarm_dc + 10); raw <= -10 → 1).
 * - Auto-success: creator == owner, or (creator in party or creator is PC) and (owner in party or owner is PC).
 * - Critical fail (rollTotal < DC-5): trap fires on recoverer (OnTrapTriggered); only for Trigger.
 * - Success: create item from traps.2da ResRef by trapType, add to inventory; trigger: destroy + remove from area if count==1; door/placeable: clear trap fields.
 * - BroadcastSkillData: skill 0x5fb, d20, skillRank, DC, isAutoRoll(1/0), resultType; subtype 0x144.
 *
 * @file ActionRecoverMine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionRecoverMine extends Action {

  constructor(actionId: number = -1, groupId: number = -1) {
    super(actionId, groupId);
    this.type = ActionType.ActionRecoverMine;

    // 0 - DWORD: oTarget (trigger/mine, door, or placeable with trap)
  }

  update(delta?: number): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    if (!this.target) {
      this.stopRecoverState();
      return ActionStatus.FAILED;
    }

    if (!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) {
      return ActionStatus.FAILED;
    }

    const ownerCreature = this.owner as ModuleCreature;
    const distance = Utility.Distance2D(this.owner.position, this.target.position);

    // Reva: GetIsInUseRange(this, targetId, 0.25); if false → GetUseRange (move).
    const inUseRange = distance <= DEFAULT_USE_RANGE - USE_RANGE_MARGIN;
    if (!inUseRange) {
      const moveRange = DEFAULT_USE_RANGE;
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, this.target.area?.id ?? 0);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, moveRange);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      ownerCreature.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    // First run: set flag, queue RecoverMine + Wait + ChangeFacing + PlayAnimation, StartGuiTimingBar, return IN_PROGRESS.
    if (!ownerCreature.recoverMineInProgress) {
      ownerCreature.recoverMineInProgress = true;
      const waitSeconds = RECOVER_DELAY_SECONDS;
      const reRecover = new GameState.ActionFactory.ActionRecoverMine(-1, this.groupId);
      reRecover.setParameter(0, ActionParameterType.DWORD, this.target);
      ownerCreature.actionQueue.addFront(reRecover);
      const waitAction = new GameState.ActionFactory.ActionWait(-1, this.groupId);
      waitAction.setParameter(0, ActionParameterType.FLOAT, waitSeconds);
      ownerCreature.actionQueue.addFront(waitAction);
      const changeFacing = this.createChangeFacingAction();
      if (changeFacing) {
        ownerCreature.actionQueue.addFront(changeFacing);
      }
      const playAnim = this.createPlayAnimationAction();
      if (playAnim) {
        ownerCreature.actionQueue.addFront(playAnim);
      }
      this.startGuiTimingBar(ownerCreature);
      return ActionStatus.IN_PROGRESS;
    }

    ownerCreature.recoverMineInProgress = false;

    const skillRank = ownerCreature.getSkillLevel(SkillType.DEMOLITIONS);
    const isAutoRoll = (ownerCreature as any).field59_0x4e0 === 0 ? 1 : 0;
    const d20Roll = isAutoRoll ? 20 : Math.floor(Math.random() * 20) + 1;
    const rollTotal = skillRank + d20Roll;

    let rawDisarmDC: number;
    let trapType: number;
    let trapDisarmable: boolean;
    let creatorId: number | undefined;
    let isTrigger = false;
    let trap: ModuleTrigger | ModuleDoor | ModulePlaceable;

    if (BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleTrigger)) {
      const t = this.target as ModuleTrigger;
      if (t.type !== ModuleTriggerType.TRAP) {
        this.broadcastAndStop(ownerCreature, skillRank, d20Roll, 0, 0, RecoverMineResultType.FAIL);
        return ActionStatus.FAILED;
      }
      trapDisarmable = t.trapDisarmable ?? false;
      rawDisarmDC = t.trapDisarmDC ?? t.trapDetectDC ?? 0;
      trapType = t.trapType ?? 0;
      creatorId = t.creatorId;
      trap = t;
      isTrigger = true;
    } else if (BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor)) {
      const door = this.target as ModuleDoor;
      trapDisarmable = door.trapDisarmable ?? false;
      rawDisarmDC = door.disarmDC ?? door.trapDetectDC ?? 0;
      trapType = door.trapType ?? 0;
      trap = door;
    } else if (BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)) {
      const placeable = this.target as ModulePlaceable;
      trapDisarmable = placeable.trapDisarmable ?? false;
      rawDisarmDC = placeable.disarmDC ?? placeable.trapDetectDC ?? 0;
      trapType = placeable.trapType ?? 0;
      trap = placeable;
    } else {
      this.broadcastAndStop(ownerCreature, skillRank, d20Roll, 0, 0, RecoverMineResultType.FAIL);
      return ActionStatus.FAILED;
    }

    const recoverDC = rawDisarmDC <= -10 ? 1 : Math.max(1, rawDisarmDC + 10);

    let autoSuccess = false;
    if (creatorId !== undefined && creatorId !== ModuleObjectConstant.OBJECT_INVALID && creatorId === ownerCreature.id) {
      autoSuccess = true;
    } else if (creatorId !== undefined && creatorId !== ModuleObjectConstant.OBJECT_INVALID) {
      const creatorInParty = GameState.PartyManager.party.some((pm: ModuleObject) => (pm as ModuleCreature).id === creatorId);
      const creatorObj = GameState.ModuleObjectManager.GetObjectById(creatorId);
      const creatorIsPC = creatorObj && BitWise.InstanceOfObject(creatorObj, ModuleObjectType.ModuleCreature) && (creatorObj as ModuleCreature).isPC;
      const ownerInParty = GameState.PartyManager.party.indexOf(ownerCreature) >= 0;
      const ownerIsPC = !!ownerCreature.isPC;
      if ((creatorInParty || creatorIsPC) && (ownerInParty || ownerIsPC)) {
        autoSuccess = true;
      }
    }

    if (!trapDisarmable) {
      this.broadcastAndStop(ownerCreature, skillRank, d20Roll, recoverDC, 0, RecoverMineResultType.FAIL);
      return ActionStatus.FAILED;
    }

    const success = autoSuccess || rollTotal >= recoverDC;
    const criticalFail = !success && rollTotal < recoverDC - 5;

    let resultType: number;
    if (autoSuccess) {
      resultType = RecoverMineResultType.AUTO_SUCCESS;
    } else if (success) {
      resultType = RecoverMineResultType.SUCCESS;
    } else {
      if (rollTotal < recoverDC - 10) {
        resultType = RecoverMineResultType.CRITICAL_FAIL;
      } else if (recoverDC > rollTotal) {
        resultType = RecoverMineResultType.FAIL;
      } else {
        resultType = RecoverMineResultType.AUTO_FAIL;
      }
    }

    if (criticalFail && isTrigger) {
      const trapTrigger = trap as ModuleTrigger;
      const event = new GameState.GameEventFactory.EventSignalEvent();
      event.setCaller(ownerCreature);
      event.setObject(trapTrigger);
      event.setDay(GameState.module.timeManager.pauseDay);
      event.setTime(GameState.module.timeManager.pauseTime);
      event.eventType = SignalEventType.OnTrapTriggered;
      GameState.module.addEvent(event);
      trapTrigger.trapTriggered = true;
    }

    this.setRecoverResult(ownerCreature, success, skillRank, d20Roll, recoverDC, resultType);
    this.broadcastSkillData(ownerCreature, skillRank, d20Roll, recoverDC, isAutoRoll, resultType);
    this.stopRecoverState();

    if (!success) {
      return ActionStatus.FAILED;
    }

    const trapRow = GameState.TwoDAManager.datatables.get('traps')?.rows?.[trapType];
    const resref = trapRow?.resref ?? (isTrigger ? (trap as ModuleTrigger).trapResRef : undefined);

    if (resref && resref !== '****' && resref !== '') {
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utp'], resref);
      if (buffer) {
        const item = new GameState.Module.ModuleArea.ModuleItem(new GFFObject(buffer));
        ownerCreature.addItem(item);
      }
    }

    if (isTrigger) {
      const triggerTrap = trap as ModuleTrigger;
      triggerTrap.destroy();
    } else {
      (trap as ModuleDoor | ModulePlaceable).trapType = 0;
      (trap as ModuleDoor | ModulePlaceable).trapDisarmable = false;
      (trap as ModuleDoor | ModulePlaceable).trapDetectDC = 0;
      (trap as ModuleDoor | ModulePlaceable).trapDetectable = false;
    }

    return ActionStatus.COMPLETE;
  }

  private createChangeFacingAction(): Action | null {
    if (!this.target) return null;
    const ActionFactory = GameState.ActionFactory as any;
    if (typeof ActionFactory.ActionChangeFacingObject !== 'function') return null;
    const action = new (ActionFactory.ActionChangeFacingObject)(-1, this.groupId);
    action.setParameter(0, ActionParameterType.DWORD, this.target);
    return action;
  }

  private createPlayAnimationAction(): Action | null {
    const ActionFactory = GameState.ActionFactory as any;
    if (!ActionFactory.ActionPlayAnimation) return null;
    const action = new ActionFactory.ActionPlayAnimation(-1, this.groupId);
    action.setParameter(0, ActionParameterType.INT, 10116);
    action.setParameter(1, ActionParameterType.FLOAT, 1.0);
    action.setParameter(2, ActionParameterType.FLOAT, RECOVER_DELAY_SECONDS);
    action.setParameter(3, ActionParameterType.INT, 1);
    return action;
  }

  private startGuiTimingBar(owner: ModuleCreature): void {
    if (typeof (owner as any).startGuiTimingBar === 'function') {
      (owner as any).startGuiTimingBar(0x1194, 2);
    }
  }

  private stopRecoverState(): void {
    if (!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;
    const c = this.owner as ModuleCreature;
    c.recoverMineInProgress = false;
    if (typeof (c as any).stopGuiTimingBar === 'function') {
      (c as any).stopGuiTimingBar();
    }
  }

  private broadcastSkillData(
    owner: ModuleCreature,
    skillRank: number,
    d20Roll: number,
    dc: number,
    isAutoRoll: number,
    resultType: number
  ): void {
    if (typeof (GameState as any).broadcastSkillData === 'function') {
      (GameState as any).broadcastSkillData(owner, {
        skillId: BROADCAST_SKILL_ID,
        d20: d20Roll,
        skillRank,
        dc,
        isAutoRoll,
        resultType,
        subtype: BROADCAST_SKILL_SUBTYPE,
      });
    }
  }

  private broadcastAndStop(
    owner: ModuleCreature,
    skillRank: number,
    d20Roll: number,
    dc: number,
    isAutoRoll: number,
    resultType: number
  ): void {
    this.broadcastSkillData(owner, skillRank, d20Roll, dc, isAutoRoll, resultType);
    this.stopRecoverState();
  }

  private setRecoverResult(
    owner: ModuleCreature,
    success: boolean,
    skillRank: number,
    d20Roll: number,
    dc: number,
    resultType: number
  ): void {
    if (GameState.module && this.target) {
      (GameState as any).lastRecoverMineResult = {
        targetId: this.target.id,
        target: this.target,
        success,
        skillRank,
        d20Roll,
        dc,
        resultType,
      };
    }
  }
}
