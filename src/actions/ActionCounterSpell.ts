import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { CombatMode } from "@/enums/combat/CombatMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getCounterSpellRange } from "@/combat/spell-range";
import { Utility } from "@/utility/Utility";
import { isCreature } from "@/module/guards/isCreature";

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
    // 0 - dword: oTarget (target spell caster object id)
  }

  private leaveStance(owner: ModuleCreature){
    if(owner.combatMode === CombatMode.COUNTERSPELL){
      owner.clearCombatMode();
    }
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.ERROR;
    }

    if(this.owner.isDead() || this.owner.isDebilitated()){
      this.leaveStance(this.owner);
      return ActionStatus.ERROR;
    }

    this.target = this.getParameter<ModuleObject>(0);
    if(!isCreature(this.target)){
      this.leaveStance(this.owner);
      return ActionStatus.ERROR;
    }

    if(this.target.isDead()){
      this.leaveStance(this.owner);
      return ActionStatus.ERROR;
    }

    const range = getCounterSpellRange();
    const distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > range || this.owner.area !== this.target.area){
      // Out of range: if not already in combat, feedback + ERROR; else chase
      // (requeue Move + Check + CounterSpell). combatState stands in for the
      // "already fighting" gate.
      if(!this.owner.combatData?.combatState){
        // SendFeedbackMessage(7) → CC 0xb → GetGUIString/TLK 0x595
        GameState.FeedbackMessageManager.SendFeedbackMessage(7);
        this.leaveStance(this.owner);
        return ActionStatus.ERROR;
      }

      const counter = new GameState.ActionFactory.ActionCounterSpell(undefined, this.groupId);
      counter.setParameter(0, ActionParameterType.DWORD, this.target.id);

      const check = new GameState.ActionFactory.ActionCheckMoveToObjectRadius(undefined, this.groupId);
      check.setParameter(0, ActionParameterType.DWORD, this.target.id);
      check.setParameter(1, ActionParameterType.FLOAT, range);

      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, this.target.area?.id ?? this.owner.area?.id ?? 0);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, range);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);

      this.leaveStance(this.owner);
      this.owner.actionQueue.addFront(counter);
      this.owner.actionQueue.addFront(check);
      this.owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.COMPLETE;
    }

    // : ActivityManager(4) + SetCombatMode(4) / activity 0x800
    this.owner.enterCounterSpellMode();
    this.owner.setFacingObject(this.target);
    this.owner.setAnimationState(ModuleCreatureAnimState.CASTOUT1_LP);
    // counter-spell action — BroadcastCombatStateToParty + ResolveInitiative
    this.owner.broadcastCombatStateToParty(this.target);
    this.owner.resolveInitiative();
    return ActionStatus.IN_PROGRESS;
  }

}
