import { Action } from "@/actions/Action";
import { SpellCastInstance } from "@/combat";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GameState } from "@/GameState";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import {
  resolveItemCastTiming,
  resolveDroidUtilityGateMs,
  type ItemCastTimingResolved,
} from "@/combat/item-cast-timing";
import {
  calculateSpellProjectileImpactDelayMs,
} from "@/combat/spell-projectile-time";
import { ExcitedDurationRow } from "@/combat/combat-engagement";
import { isWithinSpellCastRange } from "@/combat/spell-range";
import { shouldFailItemCastForNoUses } from "@/combat/item-property-uses";
import { isGrenadeItemType } from "@/combat/item-cast-grenade";
import * as THREE from "three";

import { isCreature } from "@/module/guards/isCreature";

/** item-cast action SendFeedbackMessage when uses left == 0. */
const FEEDBACK_ITEM_NO_USES = 0x17;

/** item-cast action per-item-type animation + gate + pause. */
type ItemCastTiming = ItemCastTimingResolved;

/** Debug prefix — filter console on `[ItemCast]`. */
const LOG = (...args: unknown[]) => console.log('[ItemCast]', ...args);

/**
 * ActionItemCastSpell class.
 * Item-cast action — stays IN_PROGRESS until spell impact fires.
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
  /** elapsed-since-action-start used for the conjure gate / pause. */
  private elapsedMs = 0;
  private throwAnim: ModuleCreatureAnimState | undefined;
  private timing: ItemCastTiming | undefined;
  /** Cached after first resolve — item may leave ObjectList after DecrementUses. */
  private cachedItem: ModuleItem | undefined;
  private cachedSpell: any = undefined;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionItemCastSpell;

    //PARAMS
    // Current KotOR.js layout (ActionCombat / item-cast dispatch):
    // 0 - dword: target object id (or invalid)
    // 1 - dword: target area object id
    // 2 - float: target x
    // 3 - float: target y
    // 4 - float: target z
    // 5 - int: spell id
    // 6 - int: caster level
    // 7 - float: cast delay
    // 8 - int: projectile path
    // 9 - int: projectile spell id
    // 10 - dword: item object id
    // 11 - string: impact script
    // 12 - int: active property index
  }

  dispose(){
    // Spell impact is fire-and-forget — after castStarted the
    // area.spellInstances flight must not be interrupted by action dispose.
    const wouldInterrupt =
      !this.castStarted &&
      !!this.spellCastInstance &&
      !this.spellCastInstance.completed;
    LOG('dispose', {
      castStarted: this.castStarted,
      wouldInterrupt,
      hasInstance: !!this.spellCastInstance,
    });
    if(wouldInterrupt){
      this.spellCastInstance!.interrupt();
    }
    this.spellCastInstance = undefined;
    super.dispose();
  }

  private consumeItemCharges(oItem: ModuleItem){
    if(this.chargesConsumed || !oItem) return;
    if(!isCreature(this.owner)) return;
    this.chargesConsumed = true;
    const propIndex = this.getParameter<number>(12) ?? 0;
    LOG('decrementUses', {
      itemId: oItem.id,
      tag: oItem.getTag?.(),
      stack: oItem.getStackSize?.(),
      propIndex,
      party: !!this.owner.isPartyMember?.(),
    });
    // Decrement item uses — stack / charges / uses-per-day.
    oItem.decrementUses(this.owner, propIndex);
  }

  /**
   * Spawn the grenade mesh on the thrower's hand at throw-pose start.
   * Flight / impact wait until {@link releaseGrenadeIntoFlight} at the gate.
   */
  private beginGrenadeHandHold(
    castTarget: ModuleObject | undefined,
    oItem: ModuleItem
  ){
    if(this.spellCastInstance || this.castStarted || !isCreature(this.owner)){
      return;
    }
    if(!this.owner.area?.attachSpellInstance){
      return;
    }

    const spellCastInstance = new SpellCastInstance(
      this.owner,
      castTarget as ModuleObject,
      this.spell
    );
    const x = this.getParameter<number>(2) || 0;
    const y = this.getParameter<number>(3) || 0;
    const z = this.getParameter<number>(4) || 0;
    if(!castTarget){
      spellCastInstance.targetLocation.set(x, y, z);
      spellCastInstance.projectileTarget.set(x, y, z);
    }else{
      spellCastInstance.targetLocation.copy(castTarget.position);
    }

    spellCastInstance.applySpellData();
    spellCastInstance.allowCounterSpell = false;
    spellCastInstance.castItem = oItem;
    spellCastInstance.holdOnHand = true;
    spellCastInstance.conjureTime = 0;
    spellCastInstance.castTime = 0;
    spellCastInstance.impactAtProjectileLanding = false;

    const pathParam = this.getParameter<number>(8) | 0;
    if(pathParam > 0){
      spellCastInstance.projectilePathOverride = pathParam;
    }

    if(oItem){
      this.owner.spellCastItem = oItem;
    }
    this.owner.spellTargetPosition.copy(spellCastInstance.targetLocation);

    LOG('grenadeHandHold', {
      spellId: this.spell?.id,
      itemId: oItem?.id,
      itemModel: oItem?.baseItem?.defaultModel,
      targetLoc: {
        x: spellCastInstance.targetLocation.x,
        y: spellCastInstance.targetLocation.y,
        z: spellCastInstance.targetLocation.z,
      },
    });

    this.owner.area.attachSpellInstance(spellCastInstance);
    spellCastInstance.init();
    this.spellCastInstance = spellCastInstance;
  }

  /**
   * Release a hand-held grenade into path-6 flight and burn charges.
   * @returns true when an existing hand-hold instance was released
   */
  private releaseGrenadeIntoFlight(
    castTarget: ModuleObject | undefined,
    oItem: ModuleItem
  ): boolean {
    const instance = this.spellCastInstance;
    if(!instance?.holdOnHand){
      return false;
    }

    const pathParam = this.getParameter<number>(8) | 0;
    const origin = this.owner.position;
    const dest = instance.targetLocation;
    const distance = origin.distanceTo(dest);
    const pathOverride = pathParam > 0 ? pathParam : -1;
    const flightMs = calculateSpellProjectileImpactDelayMs(
      this.spell,
      distance,
      pathOverride
    );

    if(this.spell){
      this.spell.oTarget = castTarget;
    }
    if(oItem){
      this.owner.spellCastItem = oItem;
    }
    const lastClass = this.owner.classes?.[this.owner.classes.length - 1];
    this.owner.baseClassLevel = (lastClass?.level | 0);
    this.owner.itemSpellCastActive = true;
    if(this.spell?.setCasterLevel){
      this.spell.setCasterLevel(this.owner.baseClassLevel);
    }
    if(this.owner.combatData){
      this.owner.combatData.lastSpellTarget = castTarget;
    }
    if(castTarget?.combatData){
      castTarget.combatData.lastSpellAttacker = this.owner;
    }

    instance.releaseFromHandHold(flightMs);
    LOG('grenadeRelease', {
      flightMs,
      impactAtLanding: instance.impactAtProjectileLanding,
      castTime: instance.castTime,
    });

    // Area owns the instance for the rest of the flight.
    this.spellCastInstance = undefined;
    this.castStarted = true;
    return true;
  }

  private startSpellInstance(castTarget: ModuleObject | undefined, oItem?: ModuleItem){
    // Location-only casts (grenades after non-hostile clear) must not bind the
    // caster as target — that would overwrite the throw point and hide the explosion.
    const spellCastInstance = new SpellCastInstance(this.owner, castTarget as ModuleObject, this.spell);
    const x = this.getParameter<number>(2) || 0;
    const y = this.getParameter<number>(3) || 0;
    const z = this.getParameter<number>(4) || 0;
    if(!castTarget){
      spellCastInstance.targetLocation.set(x, y, z);
      spellCastInstance.projectileTarget.set(x, y, z);
    }
    // Apply spell data and run impact; item casts cannot be counterspelled.
    spellCastInstance.applySpellData();
    spellCastInstance.allowCounterSpell = false;
    spellCastInstance.castItem = oItem;
    // Param 8 — projectile path override.
    const pathParam = this.getParameter<number>(8) | 0;
    if(pathParam > 0){
      spellCastInstance.projectilePathOverride = pathParam;
    }
    // Wind-up already held by the conjure gate — only projectile flight remains.
    spellCastInstance.conjureTime = 0;
    // Grenade / throw: impact after projectile flight, not at cast-start.
    let flightMs = 0;
    if(this.timing?.grenade){
      // No projectile mesh when proj == 0 → delay 0.
      const origin = this.owner.position;
      const dest = spellCastInstance.targetLocation;
      const distance = origin.distanceTo(dest);
      const pathOverride = pathParam > 0 ? pathParam : -1;
      flightMs = calculateSpellProjectileImpactDelayMs(
        this.spell,
        distance,
        pathOverride
      );
      if(flightMs <= 0){
        spellCastInstance.castTime = 0;
        spellCastInstance.impactAtProjectileLanding = false;
      }else{
        spellCastInstance.castTime = Math.max(spellCastInstance.castTime || 0, flightMs);
        spellCastInstance.impactAtProjectileLanding = true;
      }
    }
    // Stamp talent/combat targets before init so impact scripts see them
    if(this.spell){
      this.spell.oTarget = castTarget;
    }
    if(!isCreature(this.owner)){
      return;
    }
    if(oItem){
      this.owner.spellCastItem = oItem;
    }
    // Stamp caster level from the creature's last class; mark item-cast active
    const lastClass = this.owner.classes?.[this.owner.classes.length - 1];
    this.owner.baseClassLevel = (lastClass?.level | 0);
    this.owner.itemSpellCastActive = true;
    if(this.spell?.setCasterLevel){
      this.spell.setCasterLevel(this.owner.baseClassLevel);
    }
    if(this.owner.combatData){
      this.owner.combatData.lastSpellTarget = castTarget;
    }
    if(castTarget){
      if(castTarget.combatData){
        castTarget.combatData.lastSpellAttacker = this.owner;
      }
      spellCastInstance.targetLocation.copy(castTarget.position);
    }
    this.owner.spellTargetPosition.copy(spellCastInstance.targetLocation);
    const loc = spellCastInstance.targetLocation;
    LOG('itemSpellImpact', {
      spellId: this.spell?.id,
      impactscript: spellCastInstance.impactscript,
      proj: this.spell?.proj,
      projmodel: this.spell?.projmodel,
      projtype: this.spell?.projtype,
      grenade: !!this.timing?.grenade,
      flightMs,
      impactAtLanding: spellCastInstance.impactAtProjectileLanding,
      castTime: spellCastInstance.castTime,
      castTargetId: castTarget?.id,
      targetLoc: { x: loc.x, y: loc.y, z: loc.z },
      paramsXYZ: { x, y, z },
      itemId: oItem?.id,
      itemTag: oItem?.getTag?.(),
      itemType: oItem?.baseItem?.itemType,
      itemModel: oItem?.baseItem?.defaultModel,
    });
    this.owner.area.attachSpellInstance(spellCastInstance);
    spellCastInstance.init();
    // Fire-and-forget: area owns the instance; dispose must not interrupt it.
    this.spellCastInstance = undefined;
    this.castStarted = true;
  }

  /**
   * item-cast action switch on baseitems ItemType.
   */
  private resolveItemCastTiming(oItem: ModuleItem, targetPosition: THREE.Vector3): ItemCastTiming {
    const modeltype = isCreature(this.owner)
      ? (this.owner.creatureAppearance?.modeltype ?? this.owner.getAppearance?.()?.modeltype)
      : undefined;
    const distanceSq = targetPosition.distanceToSquared(this.owner.position);
    const timing = resolveItemCastTiming(
      oItem?.baseItem?.itemType,
      modeltype,
      distanceSq,
      ActionItemCastSpell.parseSpellCastTimeMs(this.spell)
    );
    // Droid utility: gate = animation length minus a short lead-in.
    if(timing.postImpactAnim){
      const lenSec = this.owner.getAnimationLength?.(timing.animation) || 0;
      timing.gateMs = resolveDroidUtilityGateMs(lenSec);
    }
    return timing;
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
    // Self-stamped casts: prefer this.owner when DWORD id matches this.owner.id so a
    // colliding ObjectList entry (companion on PLAYER_ID) cannot become MoveTo.
    const targetParam = this.parameters[0];
    const rawTargetId =
      targetParam && targetParam.type === ActionParameterType.DWORD
        ? (targetParam.value as number)
        : undefined;
    if(
      rawTargetId != null &&
      this.owner &&
      rawTargetId === this.owner.id
    ){
      this.target = this.owner;
    }else{
      this.target = this.getParameter<ModuleObject>(0);
    }
    const spellId = this.getParameter<number>(5);
    const oItemParam = this.getParameter<ModuleItem>(10);
    if(oItemParam){
      this.cachedItem = oItemParam;
    }
    if(!this.cachedSpell){
      this.cachedSpell = new GameState.TalentSpell(spellId);
    }
    this.spell = this.cachedSpell;
    const oItem = this.cachedItem || oItemParam;
    // Personal item casts (medpac etc.): if the stamped caster id failed to
    // resolve, fall back to this.owner — never leave the spell target invalid
    // so a nearby party member wins via shape queries.
    if(
      !this.target &&
      this.isUserAction &&
      isCreature(this.owner) &&
      !isGrenadeItemType(oItem?.baseItem?.itemType)
    ){
      const forceHostile = this.spell?.forcehostile ?? -1;
      const hostile =
        typeof forceHostile === 'number'
          ? forceHostile
          : parseInt(String(forceHostile), 10);
      if(!(hostile >= 1) && (this.spell?.hostilesetting | 0) !== 1){
        this.target = this.owner;
      }
    }

    // Before impact the item must resolve; after cast, it may be destroyed
    // while the action still holds until pause ends.
    if(!this.castStarted && (!this.spell || !oItem)){
      LOG('FAIL pre-cast missing spell/item', {
        spellId,
        hasSpell: !!this.spell,
        itemParam: !!oItemParam,
        cachedItem: !!this.cachedItem,
      });
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    if(this.owner.isDead() || this.owner.isDebilitated()){
      if(
        !this.castStarted &&
        this.spellCastInstance &&
        !this.spellCastInstance.completed
      ){
        this.spellCastInstance.interrupt();
      }
      this.spellCastInstance = undefined;
      return ActionStatus.ERROR;
    }

    if(this.spellCastInstance){
      if(this.spellCastInstance.interrupted){
        this.spellCastInstance = undefined;
        return ActionStatus.FAILED;
      }
      if(this.spellCastInstance.completed){
        // Impact resolved — still holds the action until the pause ends
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

    // Still move into spell range after a non-hostile clear drops the object target.
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
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, this.owner.area?.id ?? this.target?.area?.id ?? 0);
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

    // Resolved once — picks the throw arc from the distance at wind-up
    if(!this.timing && oItem){
      this.timing = this.resolveItemCastTiming(oItem, targetPosition);
      LOG('timing', {
        grenade: this.timing.grenade,
        gateMs: this.timing.gateMs,
        pauseMs: this.timing.pauseMs,
        animation: this.timing.animation,
        itemType: oItem.baseItem?.itemType,
      });
    }
    if(!this.timing){
      if(!this.castStarted){
        LOG('FAIL no timing and no item');
      }
      return this.castStarted ? ActionStatus.IN_PROGRESS : ActionStatus.FAILED;
    }
    const timing = this.timing;
    this.elapsedMs += delta * 1000;

    if(!combatRound.roundPaused && !this.castStarted){
      // Non-hostile → activity mode 2; hostile → mode 1 + combat state.
      // Grenades force an engaged combat round start.
      const hostile = (this.spell.hostilesetting | 0) === 1;
      this.owner.activityManager(hostile ? 1 : 2);
      if(hostile){
        this.owner.setCombatState(true, ExcitedDurationRow.SpellCast);
      }

      if(timing.grenade){
        combatRound.startCombatRound(this.target, true, true, 0);
      }else{
        combatRound.beginCombatRound();
      }
      // Clear spell-cast round flags before pause.
      combatRound.setSpellCastRound(0, 0);
      combatRound.pauseRound(this.owner, timing.pauseMs);
      combatRound.decrementRoundLength(timing.pauseMs);

      if(timing.grenade || hostile){
        this.owner.broadcastCombatStateToParty(this.owner);
        this.owner.setExcitedState(ExcitedDurationRow.SpellCast);
        this.owner.removeCombatInvisibilityEffects();
      }
    }

    if(combatRound.action){
      combatRound.action.animation = timing.animation;
      combatRound.action.animationTime = timing.pauseMs;
    }

    // Hold the throw/cast pose until the conjure gate, then release.
    // Medical / other types play the anim on the target when present.
    if(this.throwAnim !== timing.animation){
      this.throwAnim = timing.animation;
      const animTarget =
        timing.animOnTarget &&
        this.target &&
        isCreature(this.target)
          ? this.target
          : this.owner;
      animTarget.setAnimationState(timing.animation);
      // Grenade: spawn mesh on hand as soon as the throw pose starts.
      if(timing.grenade && oItem && !this.castStarted){
        this.beginGrenadeHandHold(this.target || undefined, oItem);
      }
    }

    // Scripted item casts often face first; combat-round dispatch skips that —
    // animate the turn here (instant face would snap every tick).
    if(this.target){
      this.owner.setFacingObject(this.target);
    }else{
      this.owner.setFacing(
        Math.atan2(
          this.owner.position.y - targetPosition.y,
          this.owner.position.x - targetPosition.x
        ) + Math.PI / 2,
        false
      );
    }

    if(this.elapsedMs < timing.gateMs){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.castStarted && combatRound.roundStarted && oItem){
      const propIndex = this.getParameter<number>(12) ?? 0;
      const prop =
        oItem.getActiveCastSpellProperty?.(propIndex) ||
        oItem.properties?.[propIndex | 0];
      // Abort when the active property has no uses left.
      if(
        shouldFailItemCastForNoUses(
          prop,
          oItem.charges | 0,
          oItem.getStackSize?.() | 0
        )
      ){
        LOG('FAIL no uses left', {
          charges: oItem.charges,
          stack: oItem.getStackSize?.(),
          costValue: prop?.costValue,
        });
        this.owner.setAnimationState(ModuleCreatureAnimState.READY);
        GameState.FeedbackMessageManager?.SendFeedbackMessage?.(FEEDBACK_ITEM_NO_USES);
        if(this.spellCastInstance && !this.spellCastInstance.completed){
          this.spellCastInstance.interrupt();
        }
        this.spellCastInstance = undefined;
        combatRound.removeSpellActionFromRound?.();
        combatRound.processPendingCombatActions?.();
        return ActionStatus.FAILED;
      }

      // Object target only when present — never fall back to this.owner (location casts)
      const castTarget = this.target || undefined;
      if(
        timing.grenade &&
        !this.releaseGrenadeIntoFlight(castTarget, oItem)
      ){
        // No hand-hold (mesh failed / non-grenade path) — full impact start.
        this.startSpellInstance(castTarget, oItem);
      }else if(!timing.grenade){
        this.startSpellInstance(castTarget, oItem);
      }
      // Consume charges with the impact, not at round end.
      this.consumeItemCharges(oItem);
      // After impact, clear the pending spell action from the combat queue.
      combatRound.removeSpellAction();
      // Droid utility: post-impact hold uses a follow-up anim.
      if(timing.postImpactAnim){
        this.owner.setAnimationState(timing.postImpactAnim);
        this.throwAnim = timing.postImpactAnim;
      }
    }

    if(this.elapsedMs >= timing.pauseMs){
      this.owner.setAnimationState(ModuleCreatureAnimState.READY);
      if(
        timing.animOnTarget &&
        this.target &&
        isCreature(this.target)
      ){
        this.target.setAnimationState(ModuleCreatureAnimState.READY);
      }
      // Spell impact is fire-and-forget — a grenade still
      // in flight must finish on the area, not be interrupted by dispose.
      LOG('COMPLETE pause ended', {
        elapsedMs: this.elapsedMs,
        pauseMs: timing.pauseMs,
        castStarted: this.castStarted,
      });
      this.spellCastInstance = undefined;
      combatRound.removeSpellActionFromRound?.();
      combatRound.processPendingCombatActions?.();
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.IN_PROGRESS;
  }

}
