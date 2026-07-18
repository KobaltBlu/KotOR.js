import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";

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
 * Retail: CSWSObject::AIActionLockObject @ 0057bec0
 * — move into use range → PlayAnimation (door 0x2790 / placeable 0x2793, 1.5s)
 *   + StartGuiTimingBar(0x5dc, type 8) → EvaluateLock (key) or Security vs CloseLockDC.
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
    // 0 - dword: object id
  }

  update(_delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor) &&
       !BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      GameState.GuiTimingBarManager?.stopFor?.(this.owner);
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    const target = this.target as Lockable;

    if(queueMoveIntoUseRange(owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    // Already locked — retail SendFeedbackMessage 0x0d (needs object context;
    // full CC payload TBD — fail closed like retail).
    if(target.isLocked?.() || target.locked){
      GameState.GuiTimingBarManager?.stopFor?.(owner);
      return ActionStatus.FAILED;
    }

    // KeyRequired blocks ActionLockObject (retail door/placeable path)
    if(target.keyRequired){
      GameState.GuiTimingBarManager?.stopFor?.(owner);
      return ActionStatus.FAILED;
    }

    if(!this.animQueued){
      this.animQueued = true;
      owner.setFacingObject(this.target);
      owner.force = 0;

      const isDoor = BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor);
      // Retail: door 0x2790 (UNLOCK_DOOR), placeable 0x2793 (UNLOCK_CONTAINER)
      const animId = isDoor ? 0x2790 : 0x2793;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, animId);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 1.5);
      owner.actionQueue.addFront(playAnim);

      // Retail StartGuiTimingBar(this, 0x5dc, 8) — 1500 ms, type 8
      if(owner === GameState.getCurrentPlayer()){
        GameState.GuiTimingBarManager?.startMs?.(0x5dc, 'Lock', owner, 8);
      }
      return ActionStatus.IN_PROGRESS;
    }

    // EvaluateLock(target, 1): key can lock without a skill check
    if(this.tryLockWithKey(owner, target)){
      GameState.GuiTimingBarManager?.stopFor?.(owner);
      return ActionStatus.COMPLETE;
    }

    // Security skill + d20 vs CloseLockDC (retail: no WIS/2; DC min 1)
    const skill = owner.getSkillLevel(SkillType.SECURITY) | 0;
    const roll = owner.combatData?.combatState ? ((Math.random() * 20) | 0) + 1 : 20;
    const dc = Math.max(1, target.closeLockDC | 0);
    if(skill + roll >= dc){
      target.lock?.(owner);
    }

    GameState.GuiTimingBarManager?.stopFor?.(owner);
    return ActionStatus.COMPLETE;
  }

  /** Retail EvaluateLock @ 004f0b20 with desiredLocked=1 */
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
