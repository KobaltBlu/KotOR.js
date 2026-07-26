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
import { CombatRound } from "@/combat/CombatRound";
import {
  GRENADE_PAUSE_MS,
  isGrenadeItemType,
  resolveGrenadeGateMs,
  resolveGrenadeThrowAnim,
} from "@/combat/item-cast-grenade";
import * as THREE from "three";

/** Retail AIActionItemCastSpell per-item-type animation + gate + pause. */
type ItemCastTiming = {
  grenade: boolean;
  animation: ModuleCreatureAnimState;
  gateMs: number;
  pauseMs: number;
};

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
  /** Retail elapsed-since-action-start used for the conjure gate / pause. */
  private elapsedMs = 0;
  private throwAnim: ModuleCreatureAnimState | undefined;
  private timing: ItemCastTiming | undefined;

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
    if(GameState.infiniteUses){ return; }
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
    // Retail SpellCastAndImpact runs the spell's impact script; item casts are
    // not force powers, so they can never be counterspelled.
    spellCastInstance.applySpellData();
    spellCastInstance.allowCounterSpell = false;
    // The action already held the wind-up through its conjure gate — retail
    // enters at the impact call, so only the projectile flight remains.
    spellCastInstance.conjureTime = 0;
    // Stamp talent/combat targets before init so impact scripts see them
    if(this.spell){
      this.spell.oTarget = this.target;
    }
    const owner = this.owner as ModuleCreature;
    if(owner.combatData){
      owner.combatData.lastSpellTarget = this.target;
    }
    if(this.target){
      if(this.target.combatData){
        this.target.combatData.lastSpellAttacker = owner;
      }
      spellCastInstance.targetLocation.copy(this.target.position);
    }
    owner.spellTargetPosition.copy(spellCastInstance.targetLocation);
    this.owner.area.attachSpellInstance(spellCastInstance);
    spellCastInstance.init();
    this.spellCastInstance = spellCastInstance;
    this.castStarted = true;
  }

  /**
   * Retail AIActionItemCastSpell @ 0050f170 switch on baseitems ItemType.
   * Grenades (case 6) lob with THROW_HIGH / THROW_LOW and a fixed 1500 ms pause.
   */
  private resolveItemCastTiming(oItem: ModuleItem, targetPosition: THREE.Vector3): ItemCastTiming {
    const itemType = oItem?.baseItem?.itemType;
    if(!isGrenadeItemType(itemType)){
      return {
        grenade: false,
        animation: ModuleCreatureAnimState.CASTOUT1,
        gateMs: 1,
        pauseMs: this.owner.combatRound?.roundLength || CombatRound.ROUND_LENGTH,
      };
    }

    const creature = this.owner as ModuleCreature;
    const modeltype = creature.creatureAppearance?.modeltype
      ?? creature.getAppearance?.()?.modeltype;
    const distanceSq = targetPosition.distanceToSquared(this.owner.position);
    const animation = resolveGrenadeThrowAnim(modeltype, distanceSq);

    return {
      grenade: true,
      animation,
      gateMs: resolveGrenadeGateMs(animation),
      pauseMs: GRENADE_PAUSE_MS,
    };
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
        // Impact resolved — retail still holds the action until the pause ends
        this.spellCastInstance = undefined;
      }
    }

    const targetPosition = this.target
      ? this.target.position
      : new THREE.Vector3(
          this.getParameter<number>(2) || 0,
          this.getParameter<number>(3) || 0,
          this.getParameter<number>(4) || 0
        );

    if(!this.castStarted && this.target && !this.spell.inRange(this.target, this.owner)){
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

    // Resolved once — retail picks the throw arc from the distance at wind-up
    if(!this.timing){
      this.timing = this.resolveItemCastTiming(oItem, targetPosition);
    }
    const timing = this.timing;
    this.elapsedMs += delta * 1000;

    if(!combatRound.roundPaused && !this.castStarted){
      combatRound.beginCombatRound();
      combatRound.pauseRound(this.owner, timing.pauseMs);
    }

    if(combatRound.action){
      combatRound.action.animation = timing.animation;
      combatRound.action.animationTime = timing.pauseMs;
    }

    // Retail holds the throw/cast pose until the conjure gate, then releases.
    if(this.throwAnim !== timing.animation){
      this.throwAnim = timing.animation;
      owner.setAnimationState(timing.animation);
    }

    if(this.target){
      owner.setFacingObject(this.target);
    }

    if(this.elapsedMs < timing.gateMs){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.castStarted && combatRound.roundStarted){
      const spellTarget = this.target || this.owner;
      this.startSpellInstance(spellTarget);
      // Retail DecrementUses fires with SpellCastAndImpact, not at round end
      this.consumeItemCharges(oItem);
    }

    if(this.elapsedMs >= timing.pauseMs){
      owner.setAnimationState(ModuleCreatureAnimState.READY);
      // Retail SpellCastAndImpact is a fire-and-forget event — a grenade still
      // in flight must finish on the area, not be interrupted by dispose().
      this.spellCastInstance = undefined;
      combatRound.removeSpellActionFromRound?.();
      combatRound.processPendingCombatActions?.();
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.IN_PROGRESS;
  }

}
