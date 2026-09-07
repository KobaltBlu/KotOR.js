import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { CombatMode } from "@/enums/combat/CombatMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { getCounterSpellRange } from "@/combat/spell-range";
import { Utility } from "@/utility/Utility";

/**
 * ActionCounterSpell class.
 * counter-spell action
 * Holds counter-spell stance (IN_PROGRESS) while the target remains valid;
 * interrupt is resolved during SpellCastInstance conjure.
 *
 * @file ActionCounterSpell.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionCounterSpell extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionCounterSpell;

    //PARAMS
    // 0 - dword: target caster
  }

  private leaveStance(owner: ModuleCreature){
    if(owner.combatMode === CombatMode.COUNTERSPELL){
      owner.clearCombatMode();
    }
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead() || owner.isDebilitated()){
      this.leaveStance(owner);
      return ActionStatus.ERROR;
    }

    this.target = this.getParameter<ModuleObject>(0);
    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      this.leaveStance(owner);
      return ActionStatus.ERROR;
    }

    const target = this.target as ModuleCreature;
    if(target.isDead()){
      this.leaveStance(owner);
      return ActionStatus.ERROR;
    }

    const range = getCounterSpellRange();
    const distance = Utility.Distance2D(owner.position, target.position);
    if(distance > range || owner.area !== target.area){
      // Out of range: if not already in combat, feedback + ERROR; else chase
      // (requeue Move + Check + CounterSpell). combatState stands in for the
      // "already fighting" gate.
      if(!owner.combatData?.combatState){
        // SendFeedbackMessage(7) → CC 0xb → GetGUIString/TLK 0x595
        GameState.FeedbackMessageManager.SendFeedbackMessage(7);
        this.leaveStance(owner);
        return ActionStatus.ERROR;
      }

      const counter = new GameState.ActionFactory.ActionCounterSpell(undefined, this.groupId);
      counter.setParameter(0, ActionParameterType.DWORD, target.id);

      const check = new GameState.ActionFactory.ActionCheckMoveToObjectRadius(undefined, this.groupId);
      check.setParameter(0, ActionParameterType.DWORD, target.id);
      check.setParameter(1, ActionParameterType.FLOAT, range);

      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, target.area?.id ?? GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, range);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);

      this.leaveStance(owner);
      owner.actionQueue.addFront(counter);
      owner.actionQueue.addFront(check);
      owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.COMPLETE;
    }

    // : ActivityManager(4) + SetCombatMode(4) / activity 0x800
    owner.enterCounterSpellMode();
    owner.setFacingObject(target);
    owner.setAnimationState(ModuleCreatureAnimState.CASTOUT1_LP);
    // counter-spell action — BroadcastCombatStateToParty + ResolveInitiative
    owner.broadcastCombatStateToParty(target);
    owner.resolveInitiative();
    return ActionStatus.IN_PROGRESS;
  }

}
