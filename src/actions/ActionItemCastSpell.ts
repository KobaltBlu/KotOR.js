import { Action } from "@/actions/Action";
import { SpellCastInstance } from "@/combat";
import { ModuleObjectType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import * as THREE from "three";

/**
 * ActionItemCastSpell class.
 * Retail AIActionItemCastSpell @ 0050f170 — stays IN_PROGRESS until SpellCastAndImpact.
 *
 * @file ActionItemCastSpell.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionItemCastSpell extends Action {

  spell: any = {};
  spellCastInstance: SpellCastInstance | undefined;
  private castStarted = false;
  private chargesConsumed = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionItemCastSpell;

    //PARAMS
    // 0 - dword: oTarget
    // 1 - dword: oArea
    // 2 - float: x
    // 3 - float: y
    // 4 - float: z
    // 5 - int: spellId
    // 6 - int: casterLevel
    // 7 - float: delay
    // 8 - int: projectilePath
    // 9 - int: projectileSpellId
    // 10 - dword: oItem
    // 11 - string: impactScript
  }

  dispose(){
    if(this.spellCastInstance && !this.spellCastInstance.completed){
      this.spellCastInstance.interrupt();
    }
    this.spellCastInstance = undefined;
    super.dispose();
  }

  private consumeItemCharges(oItem: ModuleItem){
    if(this.chargesConsumed || !oItem) return;
    this.chargesConsumed = true;
    if(oItem.charges > 1){
      oItem.charges -= 1;
    }else if(oItem.charges === 1){
      this.owner.removeItem(oItem, 1);
    }
  }

  private startSpellInstance(castTarget: ModuleObject){
    const spellCastInstance = new SpellCastInstance(this.owner, castTarget, this.spell);
    if(!this.target){
      const x = this.getParameter<number>(2) || 0;
      const y = this.getParameter<number>(3) || 0;
      const z = this.getParameter<number>(4) || 0;
      spellCastInstance.targetLocation.set(x, y, z);
      spellCastInstance.projectileTarget.set(x, y, z);
    }
    this.owner.area.attachSpellInstance(spellCastInstance);
    spellCastInstance.init();
    this.spellCastInstance = spellCastInstance;
    this.castStarted = true;
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    const spellId = this.getParameter<number>(5);
    const oItem = this.getParameter<ModuleItem>(10);
    this.spell = new GameState.TalentSpell(spellId);

    if(!this.spell || !oItem){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead() || owner.isDebilitated()){
      if(this.spellCastInstance && !this.spellCastInstance.completed){
        this.spellCastInstance.interrupt();
      }
      return ActionStatus.ERROR;
    }

    if(this.spellCastInstance){
      if(this.spellCastInstance.interrupted){
        this.spellCastInstance = undefined;
        return ActionStatus.FAILED;
      }
      if(this.spellCastInstance.completed){
        // Retail DecrementUses at SpellCastAndImpact
        this.consumeItemCharges(oItem);
        this.spellCastInstance = undefined;
        const creature = this.owner as ModuleCreature;
        creature.combatRound?.processPendingCombatActions?.();
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.IN_PROGRESS;
    }

    const targetPosition = this.target
      ? this.target.position
      : new THREE.Vector3(
          this.getParameter<number>(2) || 0,
          this.getParameter<number>(3) || 0,
          this.getParameter<number>(4) || 0
        );

    if(this.target && !this.spell.inRange(this.target, this.owner)){
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(-1, this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, targetPosition.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, targetPosition.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, targetPosition.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target ? this.target.id : ModuleObjectConstant.OBJECT_INVALID);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, this.spell.getCastRange());
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    this.owner.force = 0;
    this.owner.speed = 0;

    const combatRound = this.owner.combatRound;
    if(!combatRound){
      return ActionStatus.FAILED;
    }

    if(combatRound.roundPaused && this.castStarted){
      return ActionStatus.IN_PROGRESS;
    }

    if(!combatRound.roundPaused){
      combatRound.beginCombatRound();
      combatRound.pauseRound(this.owner, combatRound.roundLength);
      if(combatRound.action){
        combatRound.action.animation = ModuleCreatureAnimState.CASTOUT1;
      }

      if(combatRound.roundStarted && !this.castStarted){
        const spellTarget = this.target || this.owner;
        this.startSpellInstance(spellTarget);
      }
    }

    return ActionStatus.IN_PROGRESS;
  }

}
