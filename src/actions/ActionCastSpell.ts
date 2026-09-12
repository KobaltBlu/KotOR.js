import * as THREE from "three";
import { Action } from "@/actions/Action";
import { SpellCastInstance } from "@/combat";
import {
  getSpellCastAnimState,
  getSpellConjureAnimState,
  INSTANT_CAST_ANIM,
  INSTANT_CAST_PAUSE_MS,
} from "@/combat/spell-cast-anims";
import { passesSpellKnownGate, passesSpellPrerequisiteGate, canTargetSpellCastByPerception } from "@/combat/spell-cast-gates";
import { shouldBindSpellCastToCaster } from "@/combat/spell-self-target";
import { ExcitedDurationRow } from "@/combat/combat-engagement";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

/** Parse spells.2da conjure/cast/catch time to milliseconds. */
function spellTimeMs(value: unknown, fallback: number = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if(isNaN(n) || n < 0) return fallback;
  if(n > 0 && n < 20) return n * 1000;
  return n;
}

/** packs bInstantSpell in bit 30 of the projectile-path dword. */
const INSTANT_CAST_FLAG = 0x40000000;

/**
 * ActionCastSpell class.
 *
 * cast-spell action — phase gate on conjure/cast/catch,
 * entangled fail, RemoveSpellActionFromRound on fail/complete, duel pause sync.
 *
 * @file ActionCastSpell.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionCastSpell extends Action {

  spell: any = {}
  targetPosition: THREE.Vector3 = new THREE.Vector3();
  spellCastInstance: SpellCastInstance | undefined;
  private castStarted = false;
  /** True once force points for this cast have been spent. */
  private forceSpent = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionCastSpell;

    //PARAMS
    // 0 - int: nSpellId
    // 1 - int: classIndex (ForceMenu) OR -1 if cheat
    // 2 - int: nDomainLevel
    // 3 - int: Unknown: Always 0?
    // 4 - int: Unknown: Always 0?
    // 5 - dword: target object id
    // 6 - float: target x
    // 7 - float: target y
    // 8 - float: target z
    // 9 - int: nProjectilePath (+ bit 30 = bInstantSpell)
    // 10 - int: Unknown: Always -1?
    // 11 - int: override spell id (−1 = none)
    // 12 - int: fake cast (1 = visuals only)

  }

  get isFake(): boolean {
    return this.getParameter<number>(12) === 1;
  }

  /** cast-spell action instant path (param flags bit 30). */
  get isInstant(): boolean {
    return ((this.getParameter<number>(9) || 0) & INSTANT_CAST_FLAG) !== 0;
  }

  /**
   * Cheat cast — param 1 === -1 (NWScript bCheat / FakeSpell).
   * Param 11 is override spell id (−1 = none), not a cheat flag.
   */
  get isCheat(): boolean {
    return this.getParameter<number>(1) === -1;
  }

  dispose(){
    // SpellCastAndImpact is fire-and-forget — after castStarted the
    // area.spellInstances flight must not be interrupted by action dispose.
    if(
      !this.castStarted &&
      this.spellCastInstance &&
      !this.spellCastInstance.completed
    ){
      this.spellCastInstance.interrupt();
    }
    this.spellCastInstance = undefined;
    super.dispose();
  }

  resolveTarget(): boolean {
    const targetObj = this.getParameter<ModuleObject>(5);
    const x = this.getParameter<number>(6);
    const y = this.getParameter<number>(7);
    const z = this.getParameter<number>(8);

    if(isObject(targetObj)){
      this.target = targetObj;
      this.targetPosition.copy(targetObj.position);
      return true;
    }

    if(typeof x === 'number' && typeof y === 'number' && typeof z === 'number'){
      this.target = undefined;
      this.targetPosition.set(x, y, z);
      return true;
    }

    return false;
  }

  private isCasterBlocked(owner: ModuleCreature): boolean {
    return !!(owner.isDead() || owner.isDebilitated() || owner.plot || owner.silenced);
  }

  /** ArcaneSpellFailure percent → random cast fail */
  private rollArcaneSpellFailure(owner: ModuleCreature): boolean {
    const pct = owner.arcaneSpellFailure || 0;
    if(pct <= 0) return false;
    return (Math.floor(Math.random() * 100) + 1) <= pct;
  }

  private isEntangled(owner: ModuleCreature): boolean {
    return !!owner.isEntangled?.();
  }

  /**
   * GetForceItemMask vs spell forbid/require masks.
   * Fail when forbidden bits overlap, or required bits are missing.
   */
  private failsForceItemMask(owner: ModuleCreature, castSpell: any): boolean {
    const forbid = castSpell?.forbiditemmask | 0;
    const require = castSpell?.requireitemmask | 0;
    if(!forbid && !require) return false;
    const mask = owner.getForceItemMask?.() ?? 0;
    if((forbid & mask) !== 0) return true;
    if((require & mask) !== require) return true;
    return false;
  }

  private applyConjureAnim(owner: ModuleCreature, castSpell: any){
    const anim = castSpell?.getConjureAnimState?.()
      ?? getSpellConjureAnimState(castSpell?.conjanim);
    if(owner.combatRound?.action){
      owner.combatRound.action.animation = anim;
    }
    owner.setAnimationState(anim);
  }

  private applyCastAnim(owner: ModuleCreature, castSpell: any){
    const anim = castSpell?.getCastAnimState?.()
      ?? getSpellCastAnimState(castSpell?.castanim || castSpell?.conjanim);
    if(!anim) return;
    if(owner.combatRound?.action){
      owner.combatRound.action.animation = anim;
    }
    owner.setAnimationState(anim);
  }

  private isTargetInvalid(): boolean {
    if(!this.target) return false;
    if(!isCreature(this.target)){
      return false;
    }
    return !!(this.target.isDead?.() || this.target.plot);
  }

  private failCast(owner: ModuleCreature, status: ActionStatus): ActionStatus {
    if(this.spellCastInstance && !this.spellCastInstance.completed){
      this.spellCastInstance.interrupt();
    }
    this.spellCastInstance = undefined;
    this.castStarted = false;
    this.forceSpent = false;
    const round = owner.combatRound;
    if(round){
      round.removeSpellActionFromRound();
      round.processPendingCombatActions?.();
      round.unpauseRound?.(owner);
      if(round.engaged && round.duelPartner?.combatRound){
        round.duelPartner.combatRound.unpauseRound?.(round.duelPartner);
      }
    }
    return status;
  }

  private spellPauseMs(castSpell: any): number {
    const conj = spellTimeMs(castSpell?.getConjureTime?.() ?? castSpell?.conjtime, 3000);
    const cast = spellTimeMs(castSpell?.getCastTime?.() ?? castSpell?.casttime, 0);
    const catchT = spellTimeMs(castSpell?.getCatchTime?.() ?? castSpell?.catchtime, 0);
    return Math.max(1, conj + cast + catchT);
  }

  private pauseCasterAndPartner(owner: ModuleCreature, pauseMs: number){
    const combatRound = owner.combatRound;
    if(!combatRound) return;

    combatRound.pauseRound(owner, pauseMs);
    combatRound.decrementRoundLength?.(pauseMs);

    // : when engaged, pause the duel partner for the same duration
    if(combatRound.engaged && combatRound.duelPartner?.combatRound){
      const partnerRound = combatRound.duelPartner.combatRound;
      partnerRound.pauseRound(combatRound.duelPartner, pauseMs);
      partnerRound.decrementRoundLength?.(pauseMs);
    }
  }

  private faceCastTarget(owner: ModuleCreature){
    // AddCastSpellActions queues ChangeFacingObject / FacingPoint —
    // animate turn (FacePoint snaps every tick).
    if(this.target){
      owner.setFacingObject(this.target);
    }else{
      owner.setFacing(
        Math.atan2(
          owner.position.y - this.targetPosition.y,
          owner.position.x - this.targetPosition.x
        ) + Math.PI / 2,
        false
      );
    }
  }

  /**
   * hostilesetting → ActivityManager(1)+SetCombatState /
   * ActivityManager(2) for non-hostile (mirrors item-cast action).
   */
  private applyHostileActivity(owner: ModuleCreature, castSpell: any){
    const hostile = (castSpell?.hostilesetting | 0) === 1;
    owner.activityManager?.(hostile ? 1 : 2);
    if(hostile){
      owner.setCombatState?.(true, ExcitedDurationRow.SpellCast);
      owner.broadcastCombatStateToParty?.(owner);
      owner.setExcitedState?.(ExcitedDurationRow.SpellCast);
      owner.removeCombatInvisibilityEffects?.();
    }
  }

  private startSpellInstance(castTarget: ModuleObject | undefined, castSpell: any, fake: boolean): boolean {
    if(!isCreature(this.owner)){
      return false;
    }
    // DecrementSpellReadyCount / UnReadySpell at cast-start gate
    if(!fake && !this.isCheat && !this.forceSpent){
      if(!this.owner.unreadySpell(castSpell)){
        return false;
      }
      this.forceSpent = true;
    }
    const spellCastInstance = new SpellCastInstance(this.owner, castTarget as ModuleObject, castSpell);
    if(!castTarget){
      spellCastInstance.targetLocation.copy(this.targetPosition);
      spellCastInstance.projectileTarget.copy(this.targetPosition);
    }
    // ActionCombat param 9 may carry path type (sans instant bit)
    const pathParam = (this.getParameter<number>(9) || 0) & ~INSTANT_CAST_FLAG;
    if(pathParam > 0){
      spellCastInstance.projectilePathOverride = pathParam;
    }
    spellCastInstance.applySpellData({ fake });
    this.owner.area.attachSpellInstance(spellCastInstance);
    spellCastInstance.init();
    this.spellCastInstance = spellCastInstance;
    this.castStarted = true;
    return true;
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    // : dead / plot / debilitated → RemoveSpellActionFromRound + ERROR
    if(this.isCasterBlocked(this.owner)){
      return this.failCast(this.owner, ActionStatus.ERROR);
    }

    if(this.spellCastInstance){
      // : ENTANGLED during cast gate aborts
      if(this.isEntangled(this.owner)){
        return this.failCast(this.owner, ActionStatus.ERROR);
      }
      if(this.spellCastInstance.interrupted){
        this.spellCastInstance = undefined;
        this.owner.combatRound?.removeSpellActionFromRound();
        this.castStarted = false;
        this.forceSpent = false;
        return ActionStatus.FAILED;
      }
      if(this.spellCastInstance.completed){
        this.spellCastInstance = undefined;
        this.owner.combatRound?.removeSpellActionFromRound();
        this.owner.combatRound?.processPendingCombatActions?.();
        this.castStarted = false;
        this.forceSpent = false;
        return ActionStatus.COMPLETE;
      }
      if(this.spellCastInstance.conjuring){
        this.applyConjureAnim(this.owner, this.spellCastInstance.spell || this.spell);
      }else{
        this.applyCastAnim(this.owner, this.spellCastInstance.spell || this.spell);
      }
      this.faceCastTarget(this.owner);
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.resolveTarget()){
      return this.failCast(this.owner, ActionStatus.FAILED);
    }

    if(this.isTargetInvalid()){
      return this.failCast(this.owner, ActionStatus.ERROR);
    }

    this.spell = new GameState.TalentSpell( this.getParameter<number>(0));
    if(!this.spell){
      return this.failCast(this.owner, ActionStatus.FAILED);
    }

    // GetSelfForcePowers / range P — rebind after resolve so a selected
    // party member never becomes MoveTo / GetSpellTargetObject.
    if(shouldBindSpellCastToCaster(this.spell, { isUserAction: this.isUserAction })){
      this.target = this.owner;
      this.targetPosition.copy(this.owner.position);
    }

    // force-item forbid/require masks
    if(this.failsForceItemMask(this.owner, this.spell)){
      return this.failCast(this.owner, ActionStatus.ERROR);
    }

    // spell-tree / feat prerequisite gate (N8 residual)
    if(!this.isCheat && !this.isFake && !passesSpellPrerequisiteGate(this.owner, this.spell)){
      return this.failCast(this.owner, ActionStatus.FAILED);
    }

    // known-spell gate (skipped for cheat / fake)
    if(!this.isCheat && !this.isFake && !passesSpellKnownGate(this.owner, this.spell?.id ?? this.getParameter<number>(0))){
      return this.failCast(this.owner, ActionStatus.FAILED);
    }

    // AddCastSpellActions visibility (non-party creatures)
    if(this.target && this.target !== this.owner && !this.isCheat && !this.isFake){
      const isPartyUI = !!(this.owner.isPartyMember?.() || this.owner.isPlayer || this.owner.isPM);
      const entry = this.owner.perceptionList?.find(
        (o) => o.object === this.target || o.objectId === this.target.id
      );
      if(!canTargetSpellCastByPerception(entry?.data, {
        isPartyOrPlayerUI: isPartyUI,
        isSelf: false,
      })){
        return this.failCast(this.owner, ActionStatus.FAILED);
      }
    }

    const rangeTarget = (this.target || { position: this.targetPosition }) as ModuleObject;
    if(!this.spell.inRange(rangeTarget, this.owner)){
      let actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(-1, this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.targetPosition.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.targetPosition.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.targetPosition.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target ? this.target.id : ModuleObjectConstant.OBJECT_INVALID);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, this.spell.getCastRange() );
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);

      return ActionStatus.IN_PROGRESS;
    }

    this.owner.force = 0;
    this.owner.speed = 0;

    this.faceCastTarget(this.owner);

    if(this.isFake){
      this.applyConjureAnim(this.owner, this.spell);

      if(!this.castStarted){
        if(!this.startSpellInstance(this.target, this.spell, true)){
          return this.failCast(this.owner, ActionStatus.FAILED);
        }
      }
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.owner.combatRound){
      return ActionStatus.FAILED;
    }

    // Deaf / ArcaneSpellFailure: percent chance to fizzle the cast
    if(this.rollArcaneSpellFailure(this.owner)){
      return this.failCast(this.owner, ActionStatus.FAILED);
    }

    const combatRound = this.owner.combatRound;
    if(combatRound.roundPaused && this.castStarted){
      // Switch to cast-phase anim once conjure elapses
      if(this.spellCastInstance && !this.spellCastInstance.conjuring){
        this.applyCastAnim(this.owner, this.spellCastInstance.spell || this.spell);
      }
      return ActionStatus.IN_PROGRESS;
    }

    // : cannot start cast while entangled
    if(this.isEntangled(this.owner)){
      return this.failCast(this.owner, ActionStatus.ERROR);
    }

    // instant-cast bit path — 1500ms ATTACK anim, immediate SpellCastAndImpact
    if(this.isInstant){
      const castTarget = combatRound.action?.target || this.target;
      const castSpell = combatRound.action?.spell || this.spell;
      if(!combatRound.roundStarted){
        combatRound.beginCombatRound();
      }
      this.applyHostileActivity(this.owner, castSpell);
      combatRound.setSpellCastRound(castSpell?.id ?? this.getParameter<number>(0) ?? -1, 0);
      this.pauseCasterAndPartner(this.owner, INSTANT_CAST_PAUSE_MS);
      if(combatRound.action){
        combatRound.action.animation = INSTANT_CAST_ANIM;
      }
      this.owner.setAnimationState(INSTANT_CAST_ANIM);
      if(!this.castStarted){
        if(!this.startSpellInstance(castTarget, castSpell, false)){
          return this.failCast(this.owner, ActionStatus.FAILED);
        }
        // Zero conjure/cast so impact runs immediately (SpellCastAndImpact)
        if(this.spellCastInstance){
          this.spellCastInstance.conjureTime = 0;
          this.spellCastInstance.castTime = 0;
          this.spellCastInstance.update(0);
        }
      }
      if(this.spellCastInstance?.completed){
        this.spellCastInstance = undefined;
        combatRound.removeSpellActionFromRound();
        combatRound.processPendingCombatActions?.();
        this.castStarted = false;
        this.forceSpent = false;
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.IN_PROGRESS;
    }

    if(!combatRound.roundPaused) {
      const castTarget = combatRound.action?.target || this.target;
      const castSpell = combatRound.action?.spell || this.spell;
      const pauseMs = this.spellPauseMs(castSpell);

      if(!combatRound.roundStarted){
        combatRound.beginCombatRound();
      }
      this.applyHostileActivity(this.owner, castSpell);
      combatRound.setSpellCastRound(castSpell?.id ?? this.getParameter<number>(0) ?? -1, 0);
      this.pauseCasterAndPartner(this.owner, pauseMs);

      this.applyConjureAnim(this.owner, castSpell);

      if(combatRound.roundStarted && !this.castStarted){
        if(!this.startSpellInstance(castTarget, castSpell, false)){
          return this.failCast(this.owner, ActionStatus.FAILED);
        }
      }
    }

    return ActionStatus.IN_PROGRESS;
  }

}
