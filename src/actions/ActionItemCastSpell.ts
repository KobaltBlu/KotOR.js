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
import {
  resolveItemCastTiming,
  type ItemCastTimingResolved,
} from "@/combat/item-cast-timing";
import {
  calculateLastSpellProjectileTimeMs,
  resolveSpellProjectilePathType,
} from "@/combat/spell-projectile-time";
import { ExcitedDurationRow } from "@/combat/combat-engagement";
import { isWithinSpellCastRange } from "@/combat/spell-range";
import { shouldFailItemCastForNoUses } from "@/combat/item-property-uses";
import * as THREE from "three";

/** Retail AIActionItemCastSpell SendFeedbackMessage when uses left == 0. */
const FEEDBACK_ITEM_NO_USES = 0x17;

/** Retail AIActionItemCastSpell per-item-type animation + gate + pause. */
type ItemCastTiming = ItemCastTimingResolved;

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
    // 12 - int: activePropertyIndex
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
    const propIndex = this.getParameter<number>(12) ?? 0;
    // Retail DecrementUses — cost_value stack / charges / uses-per-day
    oItem.decrementUses(this.owner as ModuleCreature, propIndex);
  }

  private startSpellInstance(castTarget: ModuleObject | undefined){
    // Location-only casts (grenades after FORCEHOSTILE clear) must not bind the
    // caster as oTarget — that makes GetSpellTargetLocation / stampSpellTarget
    // overwrite the throw point and hide the explosion at the wrong place.
    const spellCastInstance = new SpellCastInstance(this.owner, castTarget as ModuleObject, this.spell);
    const x = this.getParameter<number>(2) || 0;
    const y = this.getParameter<number>(3) || 0;
    const z = this.getParameter<number>(4) || 0;
    if(!castTarget){
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
    // Grenade / throw: impact after CalculateLastSpellProjectileTime (@ 004cb9e0),
    // not at cast-start like instant non-L spells.
    if(this.timing?.grenade){
      const origin = this.owner.position;
      const dest = spellCastInstance.targetLocation;
      const distance = origin.distanceTo(dest);
      // SpellCastInstance BroadcastSafeProjectile uses path 6 for throws;
      // empty projtype defaults to 6 so +2500 ms hang matches retail grenades.
      const pathType =
        resolveSpellProjectilePathType(this.spell?.projtype) || 6;
      const flightMs = calculateLastSpellProjectileTimeMs(distance, pathType);
      spellCastInstance.castTime = Math.max(spellCastInstance.castTime || 0, flightMs);
      spellCastInstance.impactAtProjectileLanding = true;
    }
    // Stamp talent/combat targets before init so impact scripts see them
    if(this.spell){
      this.spell.oTarget = castTarget;
    }
    const owner = this.owner as ModuleCreature;
    if(owner.combatData){
      owner.combatData.lastSpellTarget = castTarget;
    }
    if(castTarget){
      if(castTarget.combatData){
        castTarget.combatData.lastSpellAttacker = owner;
      }
      spellCastInstance.targetLocation.copy(castTarget.position);
    }
    owner.spellTargetPosition.copy(spellCastInstance.targetLocation);
    this.owner.area.attachSpellInstance(spellCastInstance);
    spellCastInstance.init();
    this.spellCastInstance = spellCastInstance;
    this.castStarted = true;
  }

  /**
   * Retail AIActionItemCastSpell @ 0050f170 switch on baseitems ItemType.
   */
  private resolveItemCastTiming(oItem: ModuleItem, targetPosition: THREE.Vector3): ItemCastTiming {
    const creature = this.owner as ModuleCreature;
    const modeltype = creature.creatureAppearance?.modeltype
      ?? creature.getAppearance?.()?.modeltype;
    const distanceSq = targetPosition.distanceToSquared(this.owner.position);
    return resolveItemCastTiming(
      oItem?.baseItem?.itemType,
      modeltype,
      distanceSq,
      ActionItemCastSpell.parseSpellCastTimeMs(this.spell)
    );
  }

  /** Parse spell casttime the same way SpellCastInstance does (ms, or seconds if < 20). */
  private static parseSpellCastTimeMs(spell: any): number {
    const value = spell?.getCastTime?.() ?? spell?.casttime;
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    if(isNaN(n) || n < 0) return 1500;
    if(n > 0 && n < 20) return n * 1000;
    return n;
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

    // Retail still MoveTo vs spell range after FORCEHOSTILE clears oTarget
    const inRange = this.target
      ? this.spell.inRange(this.target, this.owner)
      : isWithinSpellCastRange(
          this.spell.range,
          this.owner.position.distanceTo(targetPosition),
          false
        );
    if(!this.castStarted && !inRange){
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
      // Retail: hostilesetting==0 → ActivityManager(2); else ActivityManager(1)
      // + SetCombatState(1,1). Grenades force StartCombatRound(engaged=1).
      const hostile = (this.spell.hostilesetting | 0) === 1;
      owner.activityManager(hostile ? 1 : 2);
      if(hostile){
        owner.setCombatState(true, ExcitedDurationRow.SpellCast);
      }

      if(timing.grenade){
        combatRound.startCombatRound(this.target, true, true, 0);
      }else{
        combatRound.beginCombatRound();
      }
      // Retail SetSpellCastRound(0, 0) before pause
      combatRound.setSpellCastRound(0, 0);
      combatRound.pauseRound(this.owner, timing.pauseMs);
      combatRound.decrementRoundLength(timing.pauseMs);

      if(timing.grenade || hostile){
        owner.broadcastCombatStateToParty(owner);
        owner.setExcitedState(ExcitedDurationRow.SpellCast);
        owner.removeCombatInvisibilityEffects();
      }
    }

    if(combatRound.action){
      combatRound.action.animation = timing.animation;
      combatRound.action.animationTime = timing.pauseMs;
    }

    // Retail holds the throw/cast pose until the conjure gate, then releases.
    // Medical / OTHER (0x19, 0x2d, 0x2f) play the anim on the target when present.
    if(this.throwAnim !== timing.animation){
      this.throwAnim = timing.animation;
      const animTarget =
        timing.animOnTarget &&
        this.target &&
        BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)
          ? (this.target as ModuleCreature)
          : owner;
      animTarget.setAnimationState(timing.animation);
    }

    // Retail AddItemCastSpellActions queues ChangeFacingObject / FacingPoint
    // before ItemCastSpell; combat-round dispatch skips that — animate turn
    // (FacePoint is instant and snaps every tick).
    if(this.target){
      owner.setFacingObject(this.target);
    }else{
      owner.setFacing(
        Math.atan2(
          owner.position.y - targetPosition.y,
          owner.position.x - targetPosition.x
        ) + Math.PI / 2,
        false
      );
    }

    if(this.elapsedMs < timing.gateMs){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.castStarted && combatRound.roundStarted){
      const propIndex = this.getParameter<number>(12) ?? 0;
      const prop =
        oItem.getActiveCastSpellProperty?.(propIndex) ||
        oItem.properties?.[propIndex | 0];
      // Retail GetUsedActivePropertyUsesLeft — abort with feedback 0x17
      if(
        shouldFailItemCastForNoUses(
          prop,
          oItem.charges | 0,
          oItem.getStackSize?.() | 0
        )
      ){
        owner.setAnimationState(ModuleCreatureAnimState.READY);
        GameState.FeedbackMessageManager?.SendFeedbackMessage?.(FEEDBACK_ITEM_NO_USES);
        combatRound.removeSpellActionFromRound?.();
        combatRound.processPendingCombatActions?.();
        return ActionStatus.FAILED;
      }

      // Object target only when present — never fall back to owner (location casts)
      this.startSpellInstance(this.target || undefined);
      // Retail DecrementUses fires with SpellCastAndImpact, not at round end
      this.consumeItemCharges(oItem);
      // Retail AIActionItemCastSpell @ 0050f170 — after SpellCastAndImpact,
      // RemoveSpellAction if GetSpellActionPending (clears combat-queue icon).
      combatRound.removeSpellAction();
    }

    if(this.elapsedMs >= timing.pauseMs){
      owner.setAnimationState(ModuleCreatureAnimState.READY);
      if(
        timing.animOnTarget &&
        this.target &&
        BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)
      ){
        (this.target as ModuleCreature).setAnimationState(ModuleCreatureAnimState.READY);
      }
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
