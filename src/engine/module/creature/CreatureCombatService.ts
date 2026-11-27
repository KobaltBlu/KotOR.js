import * as THREE from 'three';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { ActionType } from '@core/enums/actions/ActionType';
import { AttackResult } from '@core/enums/combat/AttackResult';
import { BaseItemType } from '@core/enums/combat/BaseItemType';
import { CombatActionType } from '@core/enums/combat/CombatActionType';
import {
  CombatMode,
  COMBAT_MODE_ACTIVITY_BIT,
  COMBAT_MODE_ACTIVITY_MASK,
} from '@core/enums/combat/CombatMode';
import { WeaponType } from '@core/enums/combat/WeaponType';
import { WeaponWield } from '@core/enums/combat/WeaponWield';
import { GameEffectDurationType } from '@core/enums/effects/GameEffectDurationType';
import { GameEffectSetStateType } from '@core/enums/effects/GameEffectSetStateType';
import { GameEffectType } from '@core/enums/effects/GameEffectType';
import { ModuleCreatureAmbientState } from '@core/enums/module/ModuleCreatureAmbientState';
import { AILevel } from '@core/enums/module/AILevel';
import { ModuleCreatureAnimState } from '@core/enums/module/ModuleCreatureAnimState';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { GameObjectType } from '@core/enums/module/GameObjectType';
import { SSFType } from '@core/enums/resource/SSFType';
import { BitWise } from '@core/utility/BitWise';
import type { Action } from '@engine/actions/Action';
import {
  CombatRound,
  CombatRoundAction,
  resolveAnimations2DARow,
} from '@engine/combat';
import {
  COMBAT_STATE_DURATION_MS,
  ExcitedDurationRow,
  getExcitedDurationMs,
  hasLivingCombatTarget,
  setClientCombatMode,
  updateClientCombatMode,
} from '@engine/combat/combat-engagement';
import {
  isChoreographedMeleeWeapon,
  resolveChoreographedState,
} from '@engine/combat/combat-dueling';
import { ensureCombatDispatcher } from '@engine/combat/ensure-combat-dispatcher';
import { getNearestEnemy } from '@engine/combat/nearest-enemy';
import { queueAttackActions } from '@engine/combat/queue-attack-actions';
import { getActiveSetStateType } from '@engine/effects/set-state';
import { resolveOverlayStopFlags } from '@engine/module/animation/resolvePlaybackMode';
import { TalentFeat } from '@engine/talents/TalentFeat';
import { TalentObject } from '@engine/talents/TalentObject';
import { TalentSpell } from '@engine/talents/TalentSpell';
import { TalentObjectType } from '@engine/enums/engine/TalentObjectType';
import { UIIconTimerType } from '@engine/enums/engine/UIIconTimerType';
import { OdysseyModelAnimation } from '@engine/odyssey';
import { GameState } from '@engine/runtime/GameState';
import type { Creature } from '@engine/module/Creature';
import { GameObject } from '@engine/module/GameObject';
import { isCreature } from '@engine/module/guards/isCreature';
import type { Item } from '@engine/module/Item';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class CreatureCombatService {
  constructor(
    private readonly host: Creature,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  /**
   * Apply delayed damage entries (pain SSF). May reduce HP to death mid-tick.
   */
  processDamageList(delta = 0){
    let elLen = this.host.damageList.length - 1;
    for(let i = elLen; i >= 0; i--){
      this.host.damageList[i].delay -= delta;
      if(this.host.damageList[i].delay <= 0){
        this.host.subtractHP(this.host.damageList[i].amount);

        let painsound = THREE.MathUtils.randInt(0, 1);
        switch(painsound){
          case 1:
            this.host.playSoundSet(SSFType.PAIN_2);
          break;
          default:
            this.host.playSoundSet(SSFType.PAIN_1);
          break;
        }

        this.host.damageList.splice(i, 1);
      }
    }
  }

  /**
   * Combat-side AI tick: timers, client combat mode, combat/casting.
   */
  updateCombatTick(delta = 0){
    this.updateCombatStateTimer(delta);
    this.updateExcitedDuration(delta);
    updateClientCombatMode(this.host);
    this.updateCombat(delta);
    this.updateCasting(delta);
  }

  /**
   * AIUpdate AI-level self-adjustment.
   * Party/PC → VERY_HIGH; combat → NORMAL; else LOW (area occupied) or VERY_LOW.
   */
  adjustAILevel(){
    const scheduler = this.runtime.getAiScheduler();
    if(!scheduler) return;

    // Party / PC always VERY_HIGH
    if((this.host.isPlayer || this.host.isPM || this.host.isPartyMember()) && this.host.aiLevel !== AILevel.VERY_HIGH){
      scheduler.setAILevel(this.host, AILevel.VERY_HIGH);
      return;
    }

    if(this.host.isPlayer || this.host.isPM || this.host.isPartyMember()) return;

    if(this.host.combatData?.combatState){
      if(this.host.aiLevel !== AILevel.NORMAL && this.host.aiLevel !== AILevel.VERY_HIGH){
        scheduler.setAILevel(this.host, AILevel.NORMAL);
      }
      return;
    }

    // Demote non-combat NORMAL → LOW/VERY_LOW based on players in area
    if(this.host.aiLevel === AILevel.NORMAL){
      const party = this.runtime.getParty?.() ?? [];
      const areaOccupied = (this.host.area as any)?.playersInArea > 0 ||
        (party.length > 0 && this.host.area === this.runtime.getModule()?.area);
      scheduler.setAILevel(this.host, areaOccupied ? AILevel.LOW : AILevel.VERY_LOW);
    }
  }

  updateCombat(delta = 0){
    // this.host.combatData.update(delta);
    this.host.combatRound.update(delta);

    // Schedule with pending work but no ActionCombat (WAITING-splice /
    // ClearAllActions keep-schedule) — restore the dispatcher so drain can resume.
    ensureCombatDispatcher(this.host);

    if(this.host.combatData.lastAttackTarget instanceof GameObject && this.host.combatData.lastAttackTarget.isDead()){
      this.host.combatData.clearTarget(this.host.combatData.lastAttackTarget);
    }

    if(this.host.combatData.lastAttacker instanceof GameObject && this.host.combatData.lastAttacker.isDead())
      this.host.combatData.lastAttacker = undefined;

    if(this.host.combatData.lastAttemptedAttackTarget instanceof GameObject && this.host.combatData.lastAttemptedAttackTarget.isDead())
      this.host.combatData.lastAttemptedAttackTarget = undefined;

    if(this.host.combatData.lastAttemptedSpellTarget instanceof GameObject && this.host.combatData.lastAttemptedSpellTarget.isDead())
      this.host.combatData.lastAttemptedSpellTarget = undefined;

    if(this.host.combatData.lastDamager instanceof GameObject && this.host.combatData.lastDamager.isDead())
      this.host.combatData.lastDamager = undefined;

    if(this.host.combatData.lastHostileActor instanceof GameObject && this.host.combatData.lastHostileActor.isDead())
      this.host.assignHostileActor(undefined, true);

    if(this.host.combatData.lastSpellAttacker instanceof GameObject && this.host.combatData.lastSpellAttacker.isDead())
      this.host.combatData.lastSpellAttacker = undefined;

    if(this.host.isDead()){
      this.host.clearTarget();
      this.host.combatRound.clearActions();
    }

    // Auto-requeue only for hostile Damage engagement — not flourish (SpellCast reason).
    // QueueAttackActions prefers combat-round sticky / keeps queued
    // actions; never retarget to lastAttacker (who just hit the PC).
    if(this.host.isHostileCombatEngaged()){
      if(this.runtime.getCurrentPlayer?.() == this.host){
        if(!this.host.combatRound.scheduledActionList.length && !this.host.combatRound.action){
          queueAttackActions(this.host);
        }
      }
    }else if(!this.host.combatData.combatState){
      if(this.host.animationState.index == ModuleCreatureAnimState.READY){
        this.host.setAnimationState(ModuleCreatureAnimState.PAUSE);
      }
    }
  }

  updateCasting(delta = 0){
    // Live spell casts are owned by area.spellInstances (ticked/disposed in Area).
    // The legacy per-creature casting array is never populated; nothing to tick here.
  }

  clearTarget(){
    this.host.combatData.lastAttackTarget = undefined;
    this.host.combatData.lastDamager = undefined;
  }

  setCombatEngaged(reason: ExcitedDurationRow = ExcitedDurationRow.Damage){
    const wasCombat = this.host.combatData.combatState;
    this.host.setCombatState(true, reason);
    this.host.setExcitedState(reason);
    // ActionMenuAttack / engage → client SetCombatMode(1)
    setClientCombatMode(this.host, true);
    // RemoveCombatInvisibilityEffects on hostile engagement
    if(!wasCombat){
      this.host.removeCombatInvisibilityEffects();
    }
  }

  broadcastCombatStateToParty(other?: GameObject){
    const otherCreature = isCreature(other)
      ? (other as Creature)
      : undefined;

    const combatReasonFor = (subject: Creature): ExcitedDurationRow => {
      if(!otherCreature){
        return ExcitedDurationRow.SpellCast;
      }
      // BroadcastCombatStateToParty
      // reason 1 (Damage) when other's last attack/spell target is subject.
      const data = otherCreature.combatData;
      if(
        data.lastAttackTarget === subject ||
        data.lastSpellTarget === subject ||
        data.lastAttemptedAttackTarget === subject ||
        data.lastAttemptedSpellTarget === subject
      ){
        return ExcitedDurationRow.Damage;
      }
      return ExcitedDurationRow.SpellCast;
    };

    const selfOrMissing = !other || other === this.host;
    const hostileToOther = !!other && this.host.getReputation(other) < 11;
    if(selfOrMissing || hostileToOther){
      this.host.setCombatState(true, combatReasonFor(this.host));
    }

    if(this.host.plot){
      return;
    }

    const members: Creature[] = (this.host.isPartyMember() || this.host.faction?.id === 0)
      ? (this.runtime.getParty?.() ?? [])
      : (this.host.faction?.creatures ?? []);

    for(let i = 0; i < members.length; i++){
      const member = members[i];
      if(!member || member.isDead()){
        continue;
      }

      const range = typeof member.getPerceptionRangePrimary === 'function'
        ? member.getPerceptionRangePrimary()
        : this.host.getPerceptionRangePrimary();
      const dx = this.host.position.x - member.position.x;
      const dy = this.host.position.y - member.position.y;
      const dz = this.host.position.z - member.position.z;
      if(dx * dx + dy * dy + dz * dz > range * range){
        continue;
      }

      // : GetReputation(member, arg1) < 11 — skip when other is self/friendly
      if(other && member.getReputation(other) >= 11){
        continue;
      }
      if(!other){
        continue;
      }

      member.setCombatState(true, combatReasonFor(member));
      member.setExcitedState(ExcitedDurationRow.Damage);
    }
  }

  resolveInitiative(){
    // Party / player-UI creatures  → 0; others → 1
    this.host.combatAiRefreshPending = (this.runtime.getParty?.() ?? [])?.indexOf(this.host) < 0;
    if(!this.host.combatData.combatState){
      this.host.setCombatState(true, ExcitedDurationRow.SpellCast);
    }
  }

  resetExcitedDuration(){
    this.host.setCombatEngaged(ExcitedDurationRow.Damage);
  }

  setCombatState(active: boolean, reason: number = ExcitedDurationRow.Damage){
    if(!active){
      this.host.combatData.combatState = false;
      this.host.combatStateTimer = 0;
      this.host.combatStateReason = 0;
      // SetCombatState(0) clears attempted/current attack+spell targets
      this.host.combatData.lastAttemptedAttackTarget = undefined;
      this.host.combatData.lastAttackTarget = undefined;
      this.host.combatData.lastAttemptedSpellTarget = undefined;
      this.host.combatData.lastSpellTarget = undefined;
      // SetCombatState(0): ClearAllAttacks + RemoveAllActions, then
      // end combat round if a round is in progress. Mirrors combat-round teardown here.
      if(this.host.combatRound){
        if(this.host.combatRound.specialAttackList){
          this.host.combatRound.specialAttackList.length = 0;
        }
        this.host.combatRound.clearActions();
        if(this.host.combatRound.roundStarted){
          this.host.combatRound.endCombatRound({ skipQueueAttackActions: true });
        }
      }
      // Client combat camera follows SetCombatMode, not SetCombatState.
      return;
    }
    this.host.combatData.combatState = true;
    this.host.combatStateTimer = COMBAT_STATE_DURATION_MS;
    // : Damage reason (1) sticks; SpellCast (2) does not overwrite it.
    if(this.host.combatStateReason !== ExcitedDurationRow.Damage){
      this.host.combatStateReason = reason;
    }
  }

  setExcitedState(row: ExcitedDurationRow | number){
    const duration = getExcitedDurationMs(row);
    if(duration <= this.host.excitedDuration){
      return;
    }
    this.host.excitedDuration = duration;
    // : GetClientObjectByObjectId must succeed (controlled PC)
    if(this.host !== this.runtime.getCurrentPlayer?.()){
      return;
    }
    const area = this.host.area;
    if(!area){
      return;
    }
    // GetNearestEnemy(this.host, 30.0, OBJECT_INVALID, OBJECT_INVALID)
    if(getNearestEnemy(this.host, 30)){
      area.playBattleMusic(true);
    }
  }

  removeCombatInvisibilityEffects(){
    const effects = this.host.effects ? this.host.effects.slice() : [];
    for(let i = 0; i < effects.length; i++){
      const e = effects[i];
      if(!e) continue;
      if(e.type === GameEffectType.EffectInvisibility && e.getInt(0) === 1){
        this.host.removeEffect(e);
      }else if(e.type === GameEffectType.EffectSanctuary){
        this.host.removeEffect(e);
      }
    }
    if(this.host.stealthMode){
      this.host.stealthMode = false;
    }
  }

  cancelExcitedDuration(){
    const hadExcited = this.host.excitedDuration > 0;
    this.host.excitedDuration = 0;
    if(hadExcited && this.host === this.runtime.getCurrentPlayer?.() && this.host.area){
      this.host.area.playBattleMusic(false);
    }
  }

  updateCombatStateTimer(delta = 0){
    if(this.host.instantItemCooldownMs > 0){
      this.host.instantItemCooldownMs = Math.max(0, this.host.instantItemCooldownMs - (1000 * delta));
    }
    if(this.host.isDead()){
      if(this.host.combatData.combatState){
        this.host.cancelCombat();
      }
      return;
    }
    if(!this.host.combatData.combatState) return;
    this.host.combatStateTimer -= (1000 * delta);
    if(this.host.combatStateTimer <= 0){
      if(this.host.isActivelyPursuingCombatTarget()){
        this.host.combatStateTimer = COMBAT_STATE_DURATION_MS;
        return;
      }
      this.host.setCombatState(false, this.host.combatStateReason);
      if(this.host.animationState.index == ModuleCreatureAnimState.READY){
        this.host.setAnimationState(ModuleCreatureAnimState.PAUSE);
      }
      this.host.weaponPowered(false);
    }
  }

  isActivelyPursuingCombatTarget(): boolean {
    if(!hasLivingCombatTarget(this.host)){
      return false;
    }
    if(this.host.combatRound?.action?.target && !this.host.combatRound.action.target.isDead?.()){
      return true;
    }
    const queue = this.host.actionQueue;
    if(!queue?.length){
      return false;
    }
    for(let i = 0; i < queue.length; i++){
      const action = queue[i];
      if(!action) continue;
      if(action.type === ActionType.ActionPhysicalAttacks){
        return true;
      }
      if(action.type === ActionType.ActionMoveToPoint){
        const moveTarget = action.getParameter?.(4);
        if(
          moveTarget &&
          (
            moveTarget === this.host.combatData.lastAttackTarget ||
            moveTarget === this.host.combatData.lastAttemptedAttackTarget ||
            moveTarget === this.host.combatRound?.action?.target ||
            moveTarget === this.host.combatRound?.attackTarget ||
            moveTarget === this.host.combatRound?.newAttackTarget
          )
        ){
          return true;
        }
      }
    }
    return false;
  }

  updateExcitedDuration(delta = 0){
    if(this.host.isDead()){
      if(this.host.excitedDuration > 0){
        this.host.excitedDuration = 0;
        if(this.host === this.runtime.getCurrentPlayer?.() && this.host.area){
          this.host.area.playBattleMusic(false);
        }
      }
      return;
    }
    if(this.host.excitedDuration > 0){
      this.host.excitedDuration -= (1000 * delta);
      if(this.host.excitedDuration <= 0){
        this.host.excitedDuration = 0;
        if(this.host === this.runtime.getCurrentPlayer?.() && this.host.area){
          this.host.area.playBattleMusic(false);
        }
      }
    }
  }

  isDueling(): boolean {
    if(!(BitWise.InstanceOf(this.host.combatData.lastAttackTarget?.objectType, GameObjectType.Creature))) return false;
    const target = this.host.combatData.lastAttackTarget as Creature;
    if(target.combatData.lastAttackTarget != this.host) return false;
    return resolveChoreographedState(this.host, target);
  }

  isDuelingWeaponEquipped(){
    return isChoreographedMeleeWeapon(this.host);
  }

  isDuelingObject( oObject: GameObject ){
    if(!(oObject instanceof GameObject)) return false;
    if(this.host.combatData.lastAttackTarget != oObject) return false;
    if(oObject.combatData.lastAttackTarget != this.host) return false;
    return resolveChoreographedState(this.host, oObject);
  }

  /**
   * Player attack input: queue the attack, then retarget the attempted
   * attack target when the order is for a different enemy.
   */
  playerAttackCreature(target: GameObject, feat?: TalentFeat){
    if(!target || target.isDead()) return;
    this.attackCreature(target, feat);
    this.host.combatData.setAttemptedAttackTargetFromPlayerInput(target);
  }

  attackCreature(
    target: GameObject, feat?: TalentFeat, _isCutsceneAttack = false,
    attackDamage = 0, attackAnimation?: number | string, attackResult?: AttackResult
  ){
    // Legacy CutsceneAttack callers still pass the 3rd-arg true path
    if(_isCutsceneAttack){
      const animRow = typeof attackAnimation === 'number'
        ? attackAnimation
        : -1;
      this.host.addCutsceneAttackActions(
        target,
        animRow,
        attackResult ?? AttackResult.MISS,
        attackDamage
      );
      return;
    }

    if(target == undefined)
      return;

    if(target == this.host)
      target = (this.runtime.getParty?.() ?? [])[0];

    if(target.isDead())
      return;

    // AddAttackActions — sticky GetAttemptedAttackTarget
    this.host.combatData.setAttemptedAttackTargetIfInvalid(target);

    let combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.ATTACK;
    combatAction.target = target;
    combatAction.animation = ModuleCreatureAnimState.ATTACK;
    combatAction.animationTime = 1500;

    if(feat){
      combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
      combatAction.setFeat(feat);
    }

    this.host.combatRound.addAction(combatAction);

    // AddAttackActions → BroadcastCombatStateToParty(this.host, this.host.id)
    this.host.broadcastCombatStateToParty(this.host);
    // ActionMenuAttack → SetCombatMode(1) on the attacker
    setClientCombatMode(this.host, true);

    if(!this.host.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = getDefaultRuntimeContext().createAction('ActionCombat', 0xFFFF);
      this.host.actionQueue.add(action);
    }

  }

  addCutsceneAttackActions(
    target: GameObject,
    animationRow: number,
    attackResult: AttackResult,
    damage: number
  ){
    // passes oTarget through; ResolveAttack filters creature/door/placeable
    if(!target){
      return;
    }

    this.host.combatData.setAttemptedAttackTargetIfInvalid(target);

    const combatAction = new CombatRoundAction(this.host);
    combatAction.actionType = CombatActionType.ATTACK;
    combatAction.target = target;
    // animation_id = 0x2719 (ATTACK)
    combatAction.animation = ModuleCreatureAnimState.ATTACK;
    // (combatStretch + 3000) / 2 — stretch defaults to 0
    combatAction.animationTime = Math.floor((0 + CombatRound.ROUND_LENGTH) / 2);
    combatAction.resultsCalculated = true;
    combatAction.attackAnimation = animationRow | 0;
    combatAction.attackResult = attackResult;
    combatAction.attackDamage = damage | 0;

    const row = resolveAnimations2DARow(combatAction.attackAnimation);
    if(row?.name){
      combatAction.animationName = String(row.name);
      combatAction.swAnimation = OdysseyModelAnimation.GetAnimation2DA(combatAction.animationName);
    }

    this.host.combatRound.addAction(combatAction);

    // : no BroadcastCombatStateToParty on cutscene path
    // internal field==0 (PC) + client object: transient AI refresh + ClearAllActions(1)
    if(this.host.isPC){
      this.host.refreshTransientAIState();
      this.host.clearAllActions(true);
    }

    if(!this.host.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = getDefaultRuntimeContext().createAction('ActionCombat', 0xFFFF);
      this.host.actionQueue.add(action);
    }
  }

  addCutsceneMoveActions(
    destObject: GameObject | undefined,
    position: { x: number; y: number; z: number },
    shouldRun: number
  ){
    const combatAction = new CombatRoundAction(this.host);
    combatAction.actionType = CombatActionType.ATTACK_CUTSCENE_MOVE;
    combatAction.target = destObject;
    combatAction.moveToPosition = {
      x: position.x,
      y: position.y,
      z: position.z,
    };
    combatAction.shouldRun = shouldRun ? 1 : 0;

    this.host.combatRound.addAction(combatAction);

    // AddCutsceneMoveActions — same PC ClearAllActions(1) gate as attack
    if(this.host.isPC){
      this.host.refreshTransientAIState();
      this.host.clearAllActions(true);
    }

    if(!this.host.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = getDefaultRuntimeContext().createAction('ActionCombat', 0xFFFF);
      this.host.actionQueue.add(action);
    }
  }

  refreshTransientAIState(){
    // Placeholder for transient AI field reset + action walk.
  }

  useTalent(talent: TalentObject, oTarget: GameObject): Action {
    let action: Action;
    if(!(talent instanceof TalentObject)){
      return action;
    }

    if((talent.objectType & TalentObjectType.TalentSpell) !== 0){
      (talent as TalentSpell).useTalentOnObject(oTarget, this.host);
      return action;
    }

    if((talent.objectType & TalentObjectType.TalentFeat) !== 0){
      const combatAction = new CombatRoundAction();
      combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
      combatAction.target = oTarget;
      combatAction.setFeat(talent as TalentFeat);
      this.host.combatRound.addAction(combatAction);
      if(!this.host.actionQueue.actionTypeExists(ActionType.ActionCombat)){
        this.host.actionQueue.add(getDefaultRuntimeContext().createAction('ActionCombat', 0xFFFF));
      }
      return action;
    }

    if((talent.objectType & TalentObjectType.TalentSkill) !== 0){
      if(talent.id == 6){ //Security
        action = getDefaultRuntimeContext().createAction('ActionUnlockObject');
        action.setParameter(0, ActionParameterType.DWORD, oTarget.id || GameObjectConstant.OBJECT_INVALID);
        this.host.actionQueue.add(action);
      }
    }
    return action;
  }

  cancelCombat(){
    this.host.clearAllActions(true);
    // Heavy SetCombatState(0) already clears combat-round attacks/actions + ends the round.
    this.host.setCombatState(false);
    this.host.clearTarget();
    // assign hostile actor(INVALID, force)
    this.host.assignHostileActor(undefined, true);
    // ClearHostileActionsVersus(null): drop every queued hostile action group.
    this.host.clearHostileActionsVersus(undefined);
    if(this.host.combatRound){
      if(this.host.combatRound.roundStarted){
        this.host.combatRound.endCombatRound({ skipQueueAttackActions: true });
      }
      this.host.combatRound.clearActions();
    }
    // Client SetCombatMode(0) — UI/camera bit (distinct from stance clearCombatMode).
    setClientCombatMode(this.host, false);
    // Stance / CounterSpell activity bits.
    this.host.clearCombatMode();
    this.host.resetOverlayAnimationState();
    if(this.host.animationState.index == ModuleCreatureAnimState.READY){
      this.host.setAnimationState(ModuleCreatureAnimState.PAUSE);
    }
  }

  surrenderToEnemies(retainSelfBuffs: boolean = false){
    this.host.cancelCombat();
    this.host.clearAllEffects(retainSelfBuffs);

    // walks area game_objects (GetCreatureByGameObjectID). Party members
    // are removed from area.creatures on join — include them like GetObjectsInShape.
    const nearby = (this.host.constructor as typeof import("@engine/module/Creature").Creature).collectSurrenderNearbyCreatures(
      this.host.area?.creatures,
      (this.runtime.getParty?.() ?? []),
    );

    if(nearby.length){
      const origin = this.host.position;
      const radiusSq = 250 * 250; // 62500 — not the NWScript 10m comment
      for(let i = 0; i < nearby.length; i++){
        const other = nearby[i];
        if(!other || other === this.host) continue;
        const dx = other.position.x - origin.x;
        const dy = other.position.y - origin.y;
        const dz = other.position.z - origin.z;
        if(dx * dx + dy * dy + dz * dz > radiusSq) continue;
        // GetReputation(self, other) < 11
        if(this.host.getReputation(other) >= 11) continue;
        other.cancelCombat();
        other.clearAllEffects(retainSelfBuffs);
      }
    }

    // AddMember to FactionManager's primary faction (repute row 0 = Player)
    const playerFaction = GameState.FactionManager?.factions?.get(0);
    if(playerFaction && this.host.faction !== playerFaction){
      this.host.faction?.removeMember?.(this.host);
      this.host.faction = playerFaction;
      this.host.factionId = playerFaction.id;
      playerFaction.addMember(this.host);
    }
  }

  clearVisibleList(){
    this.host.perceptionList = [];
    // Force UpdateVisibleList on next tick (bypass 3s throttle)
    this.host.perceptionTimer = 3;
    this.host.updatePerceptionList(0);
  }

  clearHostileActionsVersus(versus?: Creature){
    if(!this.host.actionQueue?.length) return;
    const hostileTypes = [
      ActionType.ActionPhysicalAttacks,
      ActionType.ActionCastSpell,
      ActionType.ActionItemCastSpell,
    ];
    const groups = new Set<number>();
    for(let i = 0; i < this.host.actionQueue.length; i++){
      const action = this.host.actionQueue[i];
      if(!action) continue;
      if(!hostileTypes.includes(action.type)) continue;
      if(!versus){
        groups.add(action.groupId);
        continue;
      }
      if(!action.parameters?.length) continue;
      for(let p = 0; p < action.parameters.length; p++){
        if(action.getParameter(p) === versus){
          groups.add(action.groupId);
          break;
        }
      }
    }
    if(!groups.size) return;
    for(let i = this.host.actionQueue.length - 1; i >= 0; i--){
      if(groups.has(this.host.actionQueue[i].groupId)){
        this.host.actionQueue.splice(i, 1);
      }
    }
  }

  pacifyCreature(){
    const area = this.host.area;
    if(!area?.creatures?.length) return;

    for(let i = 0; i < area.creatures.length; i++){
      const other = area.creatures[i];
      if(!other || other === this.host) continue;

      const cd = other.combatData;
      const engaged =
        cd.lastAttackTarget === this.host ||
        cd.lastAttemptedAttackTarget === this.host ||
        cd.lastAttacker === this.host ||
        cd.lastDamager === this.host ||
        cd.lastHostileActor === this.host ||
        cd.lastSpellTarget === this.host ||
        cd.lastAttemptedSpellTarget === this.host ||
        cd.lastSpellAttacker === this.host;

      if(!engaged) continue;

      other.setCombatState(false);
      if(cd.lastAttackTarget === this.host || cd.lastAttemptedAttackTarget === this.host){
        other.clearTarget();
      }
      if(cd.lastAttacker === this.host) cd.lastAttacker = undefined;
      if(cd.lastDamager === this.host) cd.lastDamager = undefined;
      if(cd.lastHostileActor === this.host) other.assignHostileActor(undefined, true);
      if(cd.lastSpellTarget === this.host) cd.lastSpellTarget = undefined;
      if(cd.lastAttemptedSpellTarget === this.host) cd.lastAttemptedSpellTarget = undefined;
      if(cd.lastSpellAttacker === this.host) cd.lastSpellAttacker = undefined;
      other.clearHostileActionsVersus(this.host);
    }
  }

  flourish(){
    // PlayerFlourishWeapons: PowerItem + SetCombatState(1, 2);
    // moving → SetOverlayAnimation(MELEE_WIELD 0x27ad); standing → InsertFireForget(MELEE_COMBAT_WIELD 0x27ae).
    this.host.setCombatState(true, ExcitedDurationRow.SpellCast);
    let isSimple = this.host.isSimpleCreature();
    let weaponType = this.host.getCombatAnimationWeaponType();
    
    if(isSimple || !weaponType){ return; }

    this.host.weaponPowered(true);
    const moving = this.host.isFlourishMoving();

    if(moving){
      // Body/head overlay (G*F1, overlay=1) — drive keeps walk/run on base slot.
      const wieldOverlay = this.host.animationConstantToAnimation(ModuleCreatureAnimState.MELEE_WIELD);
      if(wieldOverlay?.name){
        this.host.overlayAnimationState = {
          animationIndex: ModuleCreatureAnimState.MELEE_WIELD,
          animationName: wieldOverlay.name.toLowerCase(),
          animation: wieldOverlay,
          started: false,
          speed: 1,
          stopFlag: resolveOverlayStopFlags(ModuleCreatureAnimState.MELEE_WIELD),
        };
      }
      // does not play body g*w1 clips on weapon MDLs here — PowerItem only.
      return;
    }

    // Standing: fire-forget body gesture (InsertFireForgetAnimation MELEE_COMBAT_WIELD, 0x5dc).
    const combatWield = this.host.animationConstantToAnimation(ModuleCreatureAnimState.MELEE_COMBAT_WIELD);
    const duration = 1.5;
    this.host.setAnimationState(ModuleCreatureAnimState.MELEE_COMBAT_WIELD);
    // Ensure clip resolves even if setAnimationState left animation undefined for edge types.
    if(!this.host.animationState.animation && combatWield){
      this.host.animationState.animation = combatWield;
      this.host.animationState.started = false;
    }
    this.host.gestureState = {
      serverId: ModuleCreatureAnimState.MELEE_COMBAT_WIELD,
      animation: combatWield || this.host.animationState.animation,
      started: false,
      remaining: duration,
      active: true,
    };
  }

  playDrawAnimation(){
    if(this.host.isSimpleCreature()){ return; }
    const weaponType = this.host.getCombatAnimationWeaponType();
    if(!weaponType){ return; }

    // EquipItem → SetCombatState(1, 2) for hand slots when not instant.
    this.host.setCombatState(true, ExcitedDurationRow.SpellCast);
    this.host.weaponPowered(true);

    const draw = this.host.animationConstantToAnimation(ModuleCreatureAnimState.FLOURISH);
    // PlayDrawAnimation always uses 1500ms (0x5dc), not clip length.
    const duration = 1.5;
    this.host.setAnimationState(ModuleCreatureAnimState.FLOURISH);
    if(!this.host.animationState.animation && draw){
      this.host.animationState.animation = draw;
      this.host.animationState.started = false;
    }
    this.host.gestureState = {
      serverId: ModuleCreatureAnimState.FLOURISH,
      animation: draw || this.host.animationState.animation,
      started: false,
      remaining: duration,
      active: true,
    };
  }

  isHostileCombatEngaged(): boolean {
    return !!(this.host.combatData.combatState && this.host.combatStateReason === ExcitedDurationRow.Damage);
  }

  weaponPowered(on: boolean = false): void {
    const weaponType = this.host.getCombatAnimationWeaponType();
    const isSimple = this.host.isSimpleCreature();
    if(isSimple || !weaponType){ return; }

    this.host.equipment.LEFTHAND?.setPowered(on);
    this.host.equipment.RIGHTHAND?.setPowered(on);
  }

  isStealthCapable(): boolean {
    if(this.host.area?.restrictMode) return false;
    if(this.host.getSkillLevel(2) < 1) return false; // SkillType.STEALTH
    const belt = this.host.equipment?.BELT;
    const hide = this.host.equipment?.HIDE;
    const isStealthDevice = (item: Item) =>
      !!item && (
        item.baseItemId === BaseItemType.STEALTH_UNIT ||
        item.baseItem?.itemType === 0x2c
      );
    if(isStealthDevice(belt)) return true;
    if(isStealthDevice(hide)) return true;
    return false;
  }

  setStealthMode(enabled: boolean){
    const next = !!enabled;
    if(this.host.stealthMode === next) return;
    this.host.stealthMode = next;
    if(next){
      const effect = new GameState.GameEffectFactory.EffectInvisibility();
      effect.setCreator(this.host);
      effect.setDurationType(GameEffectDurationType.PERMANENT);
      // INVISIBILITY_TYPE_NORMAL = 1 — stripped on combat engagement
      effect.setInt(0, 1);
      this.host.addEffect(effect);
    }else{
      const effects = this.host.effects ? this.host.effects.slice() : [];
      for(let i = 0; i < effects.length; i++){
        if(effects[i]?.type === GameEffectType.EffectInvisibility){
          this.host.removeEffect(effects[i]);
        }
      }
    }
  }

  setDetectMode(enabled: boolean){
    const next = !!enabled;
    if(this.host.detectMode === next) return;
    this.host.detectMode = next;
  }

  setActivity(bits: number, enable: boolean, _param3: number = 0){
    const mask = bits | 0;
    if(!mask) return;
    if(enable && (this.host.activity & mask) === mask){
      return;
    }

    // Entering / clearing a combat-mode bit clears other unlocked combat-mode bits
    if(
      ((mask & COMBAT_MODE_ACTIVITY_MASK) !== 0 && enable) ||
      (mask === COMBAT_MODE_ACTIVITY_MASK && !enable)
    ){
      for(const bit of [0x100, 0x200, 0x400, 0x800, 0x1000, 0x2000]){
        if((this.host.activity & bit) !== 0 && (this.host.activityLocked & bit) === 0 && (mask & bit) === 0){
          this.host.setActivity(bit, false, 0);
        }
      }
    }

    // Skill-mode group 0xf8 exclusivity (simplified)
    if(((mask & 0xf8) !== 0 && enable) || (mask === 0xf8 && !enable)){
      for(const bit of [0x08, 0x10, 0x20, 0x40, 0x80]){
        if((this.host.activity & bit) !== 0 && (this.host.activityLocked & bit) === 0 && (mask & bit) === 0){
          this.host.setActivity(bit, false, 0);
        }
      }
    }

    if(enable){
      this.host.activity |= mask;
    }else{
      this.host.activity &= ~mask;
    }

    if((mask & 1) !== 0){
      if(enable){
        if((this.host.activity & 0xc) === 0){
          this.host.setStealthMode(true);
        }else{
          this.host.activity &= ~1;
        }
      }else{
        this.host.setStealthMode(false);
      }
    }
    if((mask & 2) !== 0){
      this.host.setDetectMode(enable);
    }
    // dialog-stop (4) left as no-op beyond the bit itself (StopDialog on clear)
  }

  activityManager(reason: number){
    if(reason === 4){
      if((this.host.activity & 1) !== 0 && (this.host.activityLocked & 1) === 0){
        this.host.activity &= ~1;
        this.host.setStealthMode(false);
      }
      if((this.host.activity & 4) !== 0 && (this.host.activityLocked & 4) === 0){
        this.host.activity &= ~4;
      }
      if((this.host.activity & 8) !== 0 && (this.host.activityLocked & 8) === 0){
        this.host.activity &= ~8;
      }
      return;
    }

    if((this.host.activityLocked & COMBAT_MODE_ACTIVITY_MASK) !== COMBAT_MODE_ACTIVITY_MASK){
      for(const bit of [0x100, 0x200, 0x400, 0x800, 0x1000, 0x2000]){
        if((this.host.activity & bit) !== 0 && (this.host.activityLocked & bit) === 0){
          this.host.setActivity(bit, false, 0);
        }
      }
      this.host.activity &= ~COMBAT_MODE_ACTIVITY_MASK;
    }

    if(reason === 1){
      if((this.host.activity & 1) !== 0 && (this.host.activityLocked & 1) === 0){
        this.host.activity &= ~1;
        this.host.setStealthMode(false);
      }
      if((this.host.activity & 4) !== 0 && (this.host.activityLocked & 4) === 0){
        this.host.activity &= ~4;
      }
      for(const bit of [0x08, 0x10, 0x20, 0x40, 0x80]){
        if((this.host.activity & bit) !== 0 && (this.host.activityLocked & bit) === 0){
          this.host.activity &= ~bit;
        }
      }
    }
  }

  setCombatMode(mode: number, forceImmediate: boolean = false){
    const next = (mode | 0) as CombatMode;

    if(!forceImmediate && next === this.host.combatMode){
      return;
    }

    if(!forceImmediate && next !== CombatMode.COUNTERSPELL && this.host.combatRound?.roundStarted){
      this.host.pendingCombatMode = next;
      return;
    }

    const prev = this.host.combatMode;
    this.host.combatMode = next;
    this.applyCombatModeActivityTransition(prev, next);
  }

  private applyCombatModeActivityTransition(prev: CombatMode, next: CombatMode){
    if(next === CombatMode.MODE_1){
      this.host.setActivity(0x400, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_1){
      this.host.setActivity(0x400, false, 0);
      // stops here when leaving mode 1; still apply next when forced
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_2){
      this.host.setActivity(0x100, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_2){
      this.host.setActivity(0x100, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_3){
      this.host.setActivity(0x200, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_3){
      this.host.setActivity(0x200, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.COUNTERSPELL){
      this.host.setActivity(0x800, true, 0);
      return;
    }
    if(prev === CombatMode.COUNTERSPELL){
      this.host.setActivity(0x800, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_5){
      this.host.setActivity(0x1000, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_5){
      this.host.setActivity(0x1000, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_6){
      this.host.setActivity(0x2000, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_6){
      this.host.setActivity(0x2000, false, 0);
    }
  }

  enterCounterSpellMode(){
    this.host.activityManager(4);
    if(this.host.combatMode === CombatMode.COUNTERSPELL){
      return;
    }
    const prev = this.host.combatMode;
    this.host.combatMode = CombatMode.COUNTERSPELL;
    if(prev === CombatMode.MODE_1){
      this.host.setActivity(0x400, false, 0);
    }else if(prev === CombatMode.MODE_2){
      this.host.setActivity(0x100, false, 0);
    }else if(prev === CombatMode.MODE_3){
      this.host.setActivity(0x200, false, 0);
    }else{
      this.host.setActivity(0x800, true, 0);
    }
  }

  clearCombatMode(){
    this.host.pendingCombatMode = -1;
    if(this.host.combatMode === CombatMode.NONE) return;
    const prev = this.host.combatMode;
    this.host.combatMode = CombatMode.NONE;
    this.applyCombatModeActivityTransition(prev, CombatMode.NONE);
  }

  toggleStealthMode(){
    if(!this.host.isStealthCapable()) return false;
    this.host.setStealthMode(!this.host.stealthMode);
    return this.host.stealthMode;
  }

  getDebilitatedState(): number {
    // Prefer highest SetState (priority).
    if(isCreature(this.host)){
      const highest = getActiveSetStateType(this.host as Creature);
      if(highest > 0) return highest;
      // ambient_animation_state = 9 while force-pushed.
      const ambient = (this.host as Creature).ambientAnimState | 0;
      if(ambient === ModuleCreatureAmbientState.PRONE_FORCE_PUSHED){
        return GameEffectSetStateType.FORCEPUSH;
      }
    }
    const e = this.host.effects.find(eff => eff?.type == GameEffectType.EffectSetState);
    return e ? (e.getInt(0) | 0) : 0;
  }

  isDebilitated(){
    return this.host.isConfused()
      || this.host.isStunned()
      || this.host.isDroidStunned()
      || this.host.isParalyzed()
      || this.host.isFrightened()
      || this.host.isSleeping()
      || this.host.isChoking()
      || this.host.isForcePushed()
      || this.host.isHorrified()
      || this.host.isWhirlwind()
      || this.host.isCrushed()
      || this.host.isHeld()
      || this.host.isMindTricked()
      || this.host.isDroidScrambled()
      || this.host.isKnockedDown();
  }

  getEquippedWeaponType(){
    let lWeapon = this.host.equipment.LEFTHAND;
    let rWeapon = this.host.equipment.RIGHTHAND;
    let claw1 = this.host.equipment.CLAW1;
    let claw2 = this.host.equipment.CLAW2;
    let claw3 = this.host.equipment.CLAW3;

    if(rWeapon){
      return (rWeapon.getWeaponType());
    }

    if(lWeapon){
      return (lWeapon.getWeaponType());
    }

    if(claw1){
      return (claw1.getWeaponType());
    }

    if(claw2){
      return (claw2.getWeaponType());
    }

    if(claw3){
      return (claw3.getWeaponType());
    }

    return 0;
  }

  isRangedEquipped(){
    if(this.host.equipment.RIGHTHAND){
      return this.host.equipment.RIGHTHAND.isRangedWeapon();
    }

    if(this.host.equipment.LEFTHAND){
      return this.host.equipment.LEFTHAND.isRangedWeapon();
    }

    if(this.host.equipment.CLAW1){
      return this.host.equipment.CLAW1.isRangedWeapon();
    }

    if(this.host.equipment.CLAW2){
      return this.host.equipment.CLAW2.isRangedWeapon();
    }

    if(this.host.equipment.CLAW3){
      return this.host.equipment.CLAW3.isRangedWeapon();
    }

    return false;
  }
}
