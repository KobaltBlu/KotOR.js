import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";

import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";
type Lockable = ModuleObject & {
  locked?: boolean;
  keyRequired?: boolean;
  closeLockDC?: number;
  keyName?: string;
  autoRemoveKey?: boolean;
  lock?: (o: ModuleObject) => void;
  isLocked?: () => boolean;
};

/**
 * ActionLockObject class.
 *
 * lock-object action
 * — move into use range → PlayAnimation (door 0x2790 / placeable 0x2793, 1.5s)
 * + StartGuiTimingBar(0x5dc, type 8) → EvaluateLock (key) or Security vs CloseLockDC.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionLockObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionLockObject extends Action {

  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionLockObject;

    //PARAMS
    // 0 - dword: oTarget (door or placeable object id to lock)
  }

  update(_delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);

    if(!isDoor(this.target) &&
       !isPlaceable(this.target)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(queueMoveIntoUseRange(this.owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    // Already locked — SendFeedbackMessage 0x0d (needs object context;
    // full CC payload TBD — fail closed like).
    if(this.target.isLocked?.() || this.target.locked){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    // KeyRequired blocks ActionLockObject (door/placeable path)
    if(this.target.keyRequired){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(!this.animQueued){
      this.animQueued = true;
      this.owner.setFacingObject(this.target);
      this.owner.force = 0;

      // : door 0x2790 (UNLOCK_DOOR), placeable 0x2793 (UNLOCK_CONTAINER)
      const animId = isDoor(this.target) ? 0x2790 : 0x2793;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 1.5);
      this.owner.actionQueue.addFront(playAnim);

      // StartGuiTimingBar(this, 0x5dc, 8) — 1500 ms, type 8
      if(this.owner === GameState.PartyManager.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x5dc, 'Lock', this.owner, 8);
      }
      return ActionStatus.IN_PROGRESS;
    }

    // EvaluateLock(target, 1): key can lock without a skill check
    if(this.tryLockWithKey(this.owner, this.target)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.COMPLETE;
    }

    // Security skill + d20 vs CloseLockDC (: no WIS/2; DC min 1)
    const skill = this.owner.getSkillLevel(SkillType.SECURITY) | 0;
    const roll = this.owner.combatData?.combatState ? ((Math.random() * 20) | 0) + 1 : 20;
    const dc = Math.max(1, this.target.closeLockDC | 0);
    if(skill + roll >= dc){
      this.target.lock?.(this.owner);
    }

    GameState.GuiTimingBarManager?.stopFor?.(this.owner);
    return ActionStatus.COMPLETE;
  }

  /** EvaluateLock with desiredLocked=1 */
  private tryLockWithKey(owner: ModuleCreature, target: Lockable): boolean {
    const keyName = (target.keyName || '').trim();
    if(!keyName.length) return false;

    const keyItem = owner.getItemByTag?.(keyName);
    if(!keyItem) return false;

    target.lock?.(owner);
    if(target.autoRemoveKey){
      owner.removeItem(keyItem, 1);
    }
    return true;
  }

}
