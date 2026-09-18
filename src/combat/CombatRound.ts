import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { Dice } from "@/utility/Dice";
import { OdysseyModelAnimation } from "@/odyssey";
import { CombatActionType } from "@/enums/combat/CombatActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { TextSprite3DType } from "@/enums/engine/TextSprite3DType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { AttackResult } from "@/enums/combat/AttackResult";
import { LightsaberForm } from "@/enums/combat/LightsaberForm";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { ActionType } from "@/enums/actions/ActionType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { WeaponType } from "@/enums/combat/WeaponType";
import { DiceType } from "@/enums/combat/DiceType";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { FeedbackOption } from "@/enums/engine/FeedbackOption";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { TextSprite3D } from "@/engine/TextSprite3D";
import { CombatAttackData } from "@/combat/CombatAttackData";
import type { CombatRoundAction } from "@/combat/CombatRoundAction";
import { CombatRoundAction as CombatRoundActionClass } from "@/combat/CombatRoundAction";
import { queueAttackActions } from "@/combat/queue-attack-actions";
import { duelLog, duelWho } from "@/combat/duel-debug";
import { shouldEndRoundOnPauseExpiry, shouldSnapCombatReady } from "@/combat/combat-round-pause";
import { getProjectileImpactPosition, spawnCombatProjectile } from "@/combat/combat-projectile";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  spawnWorldImpactVfx,
  VFX_COM_BLASTER_IMPACT_GROUND,
} from "@/combat/ranged-impact-vfx";
import { hasVisualLos } from "@/engine/pathfinding/visual-los";
import { GameState } from "@/GameState";
import { getAttackEffectBonus } from "@/effects/effect-bonuses";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import type { TalentFeat } from "@/talents";
import { formatAttackSummaryFeedback, AttackSummaryStrRef } from "@/combat/attack-summary-feedback";
import {
  lookupCombatObjectById,
  normalizeCombatObjectId,
} from "@/combat/resolve-combat-object-id";
import * as THREE from 'three';

import { isCreature } from "@/module/guards/isCreature";
import { isItem } from "@/module/guards/isItem";

/** reaxn_delay ≈ distance * (1000/42) ms. */
export const PROJECTILE_TRAVEL_MS_PER_UNIT = 1000 / 42;

/** VFX_COM_PARRY — ResolveOnHitVisuals int 0xFB7 for attack_result 8..10. */
export const VFX_COM_PARRY_DEFLECT = 0xfb7; // 4023

export type PrunableCombatAction = {
  actionType: CombatActionType | number;
  target?: { isDead?: () => boolean } | null;
};

export type MeleeReactionPlayback =
  | { mode: 'mapped' }
  | { mode: 'setAnimationState' };

export type WeaponDischargeInfo = {
  rowLabel: string;
  shots: number;
  hits: number;
  switchMask: string;
  /** Per-shot muzzle times in ms (shot1..shotN). */
  shotTimes: number[];
};

/**
 * ResolveRangedAttack packs every discharge into sub_attacks;
 * shots without an AttackList roll are visual-only (ResolveRangedMiss).
 */
export type PendingDischargeVisual = {
  /** ms until muzzle spawn (counts down). */
  muzzleRemainingMs: number;
  /** Projectile flight duration after muzzle. */
  travelMs: number;
  weaponAttackType: number;
  attackWeapon?: ModuleItem;
  rangedTargetX: number;
  rangedTargetY: number;
  rangedTargetZ: number;
  reactObject?: ModuleObject;
};

const SPELL_FORCE_DEFLECTION = 162;
const SPELL_FORCE_REDIRECTION = 163;
const CLASS_JEDI_WEAPONMASTER = 11;

/**
 * CombatRound class.
 *
 * The CombatRound class manages a single combat round for a ModuleObject (typically a ModuleCreature)
 * It handles the timing and execution of combat actions, including attack rolls, damage calculations, and animations.
 * It also manages the dueling/engagement state between creatures, as well as the pause/resume mechanics.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CombatRound.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CombatRound {
  /**
   * The length of a combat round in milliseconds
   */
  static ROUND_LENGTH: number = 3000;

  /** damagehitvisual loop skips BLUDGEONING/PIERCING/SLASHING (0..2). */
  private static DAMAGE_HIT_VISUAL_TYPE_COUNT = 14;

  static filterLiveAttackActions<T extends PrunableCombatAction>(
    list: T[]
  ): T[] {
    return list.filter((action) => {
      if(
        action.actionType !== CombatActionType.ATTACK &&
        action.actionType !== CombatActionType.ATTACK_USE_FEAT
      ){
        return true;
      }
      const t = action.target;
      if(!t) return false;
      if(typeof t.isDead === 'function' && t.isDead()) return false;
      return true;
    });
  }

  /**
   * Melee damage floaty gate:
   * AddFloatyText only when attacker/damager is GetPlayerCreatureId.
   * DEBUG_COMBAT_FLOATY_ALL_ATTACKERS restores pre-alignment (any attacker).
   */
  static shouldShowCombatFloaty(attacker: ModuleObject | undefined): boolean {
    if(!attacker) return false;
    if(!GameState.FeedbackMessageManager.GetFeedbackTypeEnabled(FeedbackOption.FloatingNumbers)){
      return false;
    }
    if(GameState.DEBUG_COMBAT_FLOATY_ALL_ATTACKERS){
      return true;
    }
    const player = GameState.getCurrentPlayer();
    return !!player && attacker === player;
  }

  /**
   * ResolveMeleeAnimations reaction gate:
   * target has combatRound && attacker.engaged &&
   * (CheckActionLengthAtTime || resultsCalculated).
   */
  static canSyncMeleeReaction(opts: {
    engaged: boolean;
    resultsCalculated: boolean;
    hasTargetCombatRound: boolean;
    checkActionLengthOk: boolean;
  }): boolean {
    return !!(
      opts.hasTargetCombatRound &&
      opts.engaged &&
      (opts.checkActionLengthOk || opts.resultsCalculated)
    );
  }

  /**
   * ResolveRangedAnimations play gate:
   * CheckActionLengthAtTime && attacker.engaged.
   */
  static canSyncRangedReaction(opts: {
    attackerEngaged: boolean;
    hasTargetCombatRound: boolean;
    checkActionLengthOk: boolean;
  }): boolean {
    return !!(
      opts.hasTargetCombatRound &&
      opts.attackerEngaged &&
      opts.checkActionLengthOk
    );
  }

  static pickMeleeReaction(result: AttackResult): number {
    if(
      result === AttackResult.HIT_SUCCESSFUL ||
      result === AttackResult.CRITICAL_HIT ||
      result === AttackResult.AUTOMATIC_HIT
    ){
      return ModuleCreatureAnimState.DAMAGE;
    }
    if(
      result === AttackResult.PARRIED ||
      result === AttackResult.DEFLECTED
    ){
      return ModuleCreatureAnimState.PARRY;
    }
    if(
      result === AttackResult.MISS ||
      result === AttackResult.ATTACK_RESISTED ||
      result === AttackResult.ATTACK_FAILED
    ){
      return ModuleCreatureAnimState.DODGE;
    }
    return ModuleCreatureAnimState.READY;
  }

  static pickRangedReaction(opts: {
    anyHit: boolean;
    targetLightsaberEquipped: boolean;
    targetCastingBusy: boolean;
    targetEngaged: boolean;
  }): number {
    if(
      !opts.anyHit &&
      !opts.targetLightsaberEquipped &&
      !opts.targetCastingBusy &&
      opts.targetEngaged
    ){
      return ModuleCreatureAnimState.DODGE;
    }
    return ModuleCreatureAnimState.READY;
  }

  static rangedAttackHadLandingHit(
    results: Array<AttackResult | number | undefined | null>
  ): boolean {
    for(let i = 0; i < results.length; i++){
      const r = results[i];
      if(
        r === AttackResult.HIT_SUCCESSFUL ||
        r === AttackResult.CRITICAL_HIT ||
        r === AttackResult.AUTOMATIC_HIT
      ){
        return true;
      }
    }
    return false;
  }

  static isRangedDodgeBlockedAnimation(anim: number): boolean {
    const param = anim | 0;
    if(param < 0x2758){
      if(param < 0x2756){
        if(param < 0x271f){
          return false;
        }
        if(param > 0x2724 && param !== 0x274d){
          return false;
        }
      }
      return true;
    }
    if(param !== 0x28a1 && param !== 11000){
      return false;
    }
    return true;
  }

  static resolveMeleeReactionPlayback(
    mappedClip: unknown
  ): MeleeReactionPlayback {
    return mappedClip ? { mode: 'mapped' } : { mode: 'setAnimationState' };
  }

  private static parseIntCell(raw: unknown, fallback: number = 0): number {
    if(raw === null || raw === undefined || raw === '****') return fallback;
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Map combat animation name (e.g. b5a1) → weapondischarge row label.
   * GetWeaponDischargeRow.
   */
  static getWeaponDischargeRowLabel(
    creature: ModuleCreature,
    animName: string
  ): string | undefined {
    if(!animName) return undefined;

    const animRow = CombatRound.OdysseyModelAnimationGetRow(animName);
    if(!animRow) return undefined;

    const baseLabel = String(animRow.__rowlabel ?? animRow.__index ?? '');
    if(!baseLabel) return undefined;

    const table = GameState.TwoDAManager?.datatables?.get('weapondischarge');
    if(!table) return baseLabel;

    const baseRow = CombatRound.findDischargeRow(table, baseLabel);
    const droidFlag = baseRow
      ? CombatRound.parseIntCell(baseRow.droid ?? baseRow.Droid, 0)
      : 0;

    if(droidFlag !== 0){
      const race = String(creature?.getAppearance?.()?.race ?? '').replace(/\0[\s\S]*$/g, '').trim();
      if(race && race !== '****'){
        const prefix = CombatRound.getDroidDischargePrefix(race, baseLabel);
        if(prefix){
          return `${prefix}_${baseLabel}`;
        }
      }
    }else if(creature?.appearance === 3){
      const prefixed = `3_${baseLabel}`;
      if(CombatRound.findDischargeRow(table, prefixed)){
        return prefixed;
      }
    }

    return baseLabel;
  }

  /** droiddischarge.2da: row = appearance.race, column = anim row label → numeric prefix. */
  private static getDroidDischargePrefix(
    race: string,
    animLabel: string
  ): string | undefined {
    const table: any = GameState.TwoDAManager?.datatables?.get('droiddischarge');
    if(!table) return undefined;

    let row = table.getByID?.(race);
    if(!row){
      for(let i = 0, len = table.RowCount || 0; i < len; i++){
        const r = table.rows[i];
        if(r && String(r.__rowlabel).toLowerCase() === race.toLowerCase()){
          row = r;
          break;
        }
      }
    }
    if(!row) return undefined;

    const raw = row[animLabel] ?? row[String(animLabel)];
    if(raw === null || raw === undefined || raw === '****') return undefined;
    const prefix = String(raw).trim();
    return prefix || undefined;
  }

  private static OdysseyModelAnimationGetRow(name: string): any {
    const animations2DA = GameState.TwoDAManager?.datatables?.get('animations');
    if(!animations2DA) return undefined;
    for(let i = 0, len = animations2DA.RowCount; i < len; i++){
      const row = animations2DA.rows[i];
      if(row?.name?.toLowerCase?.() === name.toLowerCase()){
        return row;
      }
    }
    return undefined;
  }

  private static findDischargeRow(table: any, label: string): any {
    if(!table) return undefined;
    const byId = table.getByID?.(label) || table.getByID?.(Number(label));
    if(byId) return byId;
    for(let i = 0, len = table.RowCount || 0; i < len; i++){
      const row = table.rows[i];
      if(row && String(row.__rowlabel) === String(label)){
        return row;
      }
    }
    return undefined;
  }

  static getWeaponDischargeInfo(
    creature: ModuleCreature,
    animName: string
  ): WeaponDischargeInfo | undefined {
    const rowLabel = CombatRound.getWeaponDischargeRowLabel(creature, animName);
    if(!rowLabel) return undefined;

    const table = GameState.TwoDAManager?.datatables?.get('weapondischarge');
    const row = CombatRound.findDischargeRow(table, rowLabel);
    if(!row) return undefined;

    const shots = Math.max(0, CombatRound.parseIntCell(row.shots ?? row.Shots, 0));
    const hits = Math.max(0, CombatRound.parseIntCell(row.hits ?? row.Hits, 0));
    const switchMask = String(row.switchmask ?? row.SwitchMask ?? '');
    const shotTimes: number[] = [];
    for(let i = 1; i <= Math.max(shots, 12); i++){
      const key = `shot${i}`;
      const raw = row[key] ?? row[`Shot${i}`];
      if(raw === null || raw === undefined || raw === '****'){
        if(i > shots) break;
        shotTimes.push(0);
        continue;
      }
      shotTimes.push(CombatRound.parseIntCell(raw, 0));
    }

    if(shots <= 0){
      return undefined;
    }

    return { rowLabel, shots, hits, switchMask, shotTimes };
  }

  static pickAttackShotIndices(shots: number, attackCount: number): number[] {
    const indices: number[] = [];
    let remainingShots = Math.max(0, shots);
    let remainingAttacks = Math.max(0, attackCount);
    for(let i = 0; i < shots; i++){
      if(remainingShots <= 0) break;
      if(remainingAttacks > 0 && (Math.floor(Math.random() * remainingShots) < remainingAttacks)){
        remainingAttacks--;
        indices.push(i);
      }
      remainingShots--;
    }
    return indices;
  }

  /** ResolveRangedHit / Miss: reaxn_delay = |Δpos| * 23.809525 */
  static getProjectileTravelDelayMs(
    from: THREE.Vector3,
    to: THREE.Vector3
  ): number {
    const dist = from.distanceTo(to);
    return Math.max(0, Math.floor(dist * PROJECTILE_TRAVEL_MS_PER_UNIT));
  }

  /**
   * ResolveProjectileMissLocation
   * lateral miss beside target (perspace * 2/3), optional wide scatter when
   * attack_result == 10, then eye→far ray with visual LOS / hasVisualLos.
   */
  static getProjectileMissLocation(
    attacker: ModuleObject,
    target: ModuleObject,
    attackResult?: number
  ): THREE.Vector3 {
    if(!target){
      return attacker.position.clone();
    }

    // defaults when target is not a creature
    let lateralScale = 0.40002003;
    let scatterMul = 1.0;

    if(isCreature(target)){
      lateralScale = getPathPersonalSpace(target) * 0.6667;
      // attack_result == '\n' (10) → sum of three rand%3
      if((attackResult | 0) === 10){
        scatterMul =
          (Math.floor(Math.random() * 3)) +
          (Math.floor(Math.random() * 3)) +
          (Math.floor(Math.random() * 3));
      }
    }

    // Direction target → attacker, then cross(up) for a side miss
    const toAttacker = new THREE.Vector3().subVectors(attacker.position, target.position);
    const distSq = toAttacker.lengthSq();
    if(distSq > 1e-8){
      toAttacker.normalize();
    }else{
      toAttacker.set(1, 0, 0);
    }
    const perp = new THREE.Vector3().crossVectors(toAttacker, new THREE.Vector3(0, 0, 1));
    // : flip when (rand & 1) != 0
    if((Math.floor(Math.random() * 2) & 1) !== 0){
      perp.negate();
    }
    perp.multiplyScalar(scatterMul);

    const missBeside = new THREE.Vector3(
      target.position.x + perp.x * lateralScale,
      target.position.y + perp.y * lateralScale,
      target.position.z + perp.z * lateralScale
    );

    // Z variance from distance² * 0.015
    const zRange = distSq * 0.015;
    const eye = new THREE.Vector3(
      attacker.position.x,
      attacker.position.y,
      attacker.position.z + 1.5
    );
    const dir = new THREE.Vector3(
      missBeside.x - eye.x,
      missBeside.y - eye.y,
      ((1.5 - zRange * (2 / 3)) + Math.random() * zRange * 0.75 + missBeside.z) - eye.z
    );
    if(dir.lengthSq() > 1e-8){
      dir.normalize();
    }else{
      dir.set(px, py, 0);
    }
    const far = eye.clone().addScaledVector(dir, 1000);

    const hitPoint = new THREE.Vector3();
    const area = attacker.area;
    if(area && typeof hasVisualLos === 'function'){
      const clear = hasVisualLos(area, eye, far, {
        ignoreSource: attacker,
        ignoreObject: target,
        eyeHeight: 0,
        hitPoint,
      });
      if(clear){
        return far;
      }
      if(hitPoint.lengthSq() > 0){
        return hitPoint;
      }
    }

    // No LOS helper / no hit — use the beside-target miss point
    return missBeside;
  }

  /** SwitchMask digit for discharge hand (0/1) at shot index. */
  static getWeaponDischargeHand(switchMask: string, shotIndex: number): number {
    if(!switchMask || switchMask === '****') return 0;
    const ch = switchMask.charAt(shotIndex);
    const n = parseInt(ch, 10);
    return Number.isFinite(n) ? n : 0;
  }

  private static readDamageHitVisualId(
    damageTypeIndex: number,
    ranged: boolean
  ): number {
    const table = GameState.TwoDAManager?.datatables?.get('damagehitvisual');
    const row = table?.getByID?.(damageTypeIndex) || table?.rows?.[damageTypeIndex];
    if(!row) return 0;

    const raw = ranged
      ? (row.rangedeffect ?? row.RangedEffect)
      : (row.visualeffect ?? row.VisualEffect);
    if(raw === null || raw === undefined || raw === '****') return 0;

    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private static applyInstantVisualEffect(
    target: ModuleObject,
    vfxId: number,
    creator?: ModuleObject
  ): void {
    if(!target || !vfxId || !GameState.GameEffectFactory?.EffectVisualEffect) return;
    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    if(creator) vfx.setCreator(creator);
    vfx.setDurationType(GameEffectDurationType.INSTANT);
    vfx.setInt(0, vfxId);
    vfx.initialize();
    target.addEffect(vfx, GameEffectDurationType.INSTANT, 0);
  }

  /**
   * ResolveOnHitVisuals + ranged miss impact.
   * Call from CombatRound.signalAttackResult for every attack.
   */
  static resolveOnHitVisuals(
    attack: CombatAttackData,
    owner: ModuleCreature
  ): void {
    if(!attack) return;

    const target = attack.reactObject;
    const ranged = !!attack.rangedAttack;

    // Per damage channel (skip physical 0..2) — VisualEffect / RangedEffect
    if(target){
      for(let i = 0; i < CombatRound.DAMAGE_HIT_VISUAL_TYPE_COUNT; i++){
        if(i === 0 || i === 1 || i === 2) continue;
        const amount = attack.damageList[i]?.damageValue ?? -1;
        if(amount <= 0) continue;

        const vfxId = CombatRound.readDamageHitVisualId(i, ranged);
        if(vfxId > 0){
          CombatRound.applyInstantVisualEffect(target, vfxId, owner);
        }
      }
    }

    // attack_result 8..10 → VFX 0xFB7 (PARRIED / DEFLECTED / result 10)
    const result = attack.attackResult as number;
    if(target && result >= AttackResult.PARRIED && result <= 10){
      CombatRound.applyInstantVisualEffect(target, VFX_COM_PARRY_DEFLECT, target);
    }

    // Ranged miss ground splat (ResolveProjectileMissImpact)
    if(ranged && attack.attackResult === AttackResult.MISS){
      const pos = new THREE.Vector3(
        attack.rangedTargetX,
        attack.rangedTargetY,
        attack.rangedTargetZ
      );
      spawnWorldImpactVfx(VFX_COM_BLASTER_IMPACT_GROUND, pos, owner?.context);
    }
  }

  owner: ModuleObject;

  roundStarted: boolean = false;
  attackID: number = 0;
  attackGroup: number = 0;
  spellCastRound: boolean = false;
  deflectArrow: boolean = true;
  weaponSucks: boolean = false;
  dodgeTarget: ModuleObject;
  /** Saved DodgeTarget DWORD for deferred resolve. */
  dodgeTargetObjectId: number = 0;
  newAttackTarget: ModuleObject; //the new target to switch to after this combat round has ended
  /** Saved NewAttackTarget DWORD for deferred resolve. */
  newAttackTargetObjectId: number = 0;
  engaged: boolean = false; // ResolveEngagedState / StartCombatRound
  master: boolean = false; // ResolveMasterState — drives duel pair
  masterID: ModuleObject; // creature that owns this duel group
  /** Saved MasterID DWORD for deferred resolve. */
  masterIDObjectId: number = 0;
  /** Duel slave when this round is master. */
  duelPartner: ModuleObject;
  /** Saved DuelPartner DWORD (TSL) for deferred resolve. */
  duelPartnerObjectId: number = 0;

  roundPaused: boolean = false;
  roundPausedBy: ModuleObject;
  /** Saved RoundPausedBy DWORD for deferred resolve. */
  roundPausedByObjectId: number = 0;
  infinitePause: boolean = false;
  /** True when the round started from a scripted (CutsceneAttack) action. */
  resultsCalculated: boolean = false;
  pauseTimer: number = 0;
  timer: number = 0;
  roundLength: number = 0;
  overlapAmount: number = 0;
  bleedTimer: number = 0;

  currentAttack: number = 0;
  parryIndex: number = 0;
  numAOOs: number = 1; //Attacks of Opportunity - unused (AOO stub)
  numCleaves: number = 1; //Cleave Attacks - unused (AOO stub)
  onHandAttacks: number = 0;
  offHandAttacks: number = 0;
  /**
   * Discharge-only visual bolts (shots without AttackList rolls).
   * Heavy / rifle weapondischarge rows fire Shots > attack count.
   */
  pendingDischargeVisuals: PendingDischargeVisual[] = [];
  /** @deprecated Prefer onHandAttacks (CalculateOnHandAttacks). Kept for save compat. */
  additionalAttacks: number = 0;
  effectAttacks: number = 0;
  parryActions: number = 0;
  offHandTaken: boolean = false;
  extraTaken: boolean = false;

  attackList: CombatAttackData[] = [];
  specialAttackList: any[] = []; // (?)
  /** special_attack_id_list (SpecAttackIdList GFF). */
  specialAttackIdList: number[] = [];
  scheduledActionList: CombatRoundAction[] = [];
  action: CombatRoundAction;

  /** Last position while PhysicalAttacks held on blocked LOS. */
  losStuckPosition: THREE.Vector3 | undefined;

  constructor(owner: ModuleObject){
    this.owner = owner;
    this.initialize();
  }

  /**
   * Initialize the combat round
   */
  initialize(){
    this.roundStarted = false;
    this.spellCastRound = false;
    this.deflectArrow = true;
    this.weaponSucks = false;
    this.dodgeTarget = undefined;
    this.dodgeTargetObjectId = 0;
    this.newAttackTarget = undefined;
    this.newAttackTargetObjectId = 0;
    this.engaged = false;
    this.master = false;
    this.masterID = undefined;
    this.masterIDObjectId = 0;
    this.duelPartner = undefined;
    this.duelPartnerObjectId = 0;
    this.roundPaused = false;
    this.roundPausedBy = undefined;
    this.roundPausedByObjectId = 0;
    this.infinitePause = false;
    this.resultsCalculated = false;
    this.pauseTimer = 0;
    this.timer = 0;
    this.roundLength = CombatRound.ROUND_LENGTH;
    this.overlapAmount = 0;
    this.bleedTimer = 0;
    this.currentAttack = 0;
    this.attackID = 0;
    this.attackGroup = 0;
    this.parryIndex = 0;
    this.numAOOs = 1;
    this.numCleaves = 1;
    this.onHandAttacks = 1;
    this.offHandAttacks = 0;
    this.additionalAttacks = 0;
    this.effectAttacks = 0;
    this.parryActions = 0;
    this.offHandTaken = false;
    this.extraTaken = false;
    this.pendingDischargeVisuals.length = 0;
    this.attackList = new Array(5);
    for(let i = 0; i < 5; i++){
      this.attackList[i] = new CombatAttackData();
    }
  }

  /**
   * Master releases duel slave — clears infinitePause / engaged link.
   * Shared by endCombatRound and startCombatRound role changes so a stolen
   * master cannot leave a prior slave paused forever.
   */
  releaseDuelSlave(){
    if(!this.master || !this.duelPartner?.combatRound){
      return;
    }
    duelLog(this.owner, 'round:release-slave', { slave: duelWho(this.duelPartner) });
    const slave = this.duelPartner.combatRound;
    slave.roundPaused = false;
    slave.roundPausedBy = undefined;
    slave.infinitePause = false;
    slave.pauseTimer = 0;
    slave.engaged = false;
    slave.masterID = undefined;
    slave.duelPartner = undefined;
    slave.master = false;
  }

  /**
   * StartCombatRound.
   * @param target - Attack target (also dodge_target / lock orientation)
   * @param engaged - ResolveEngagedState result
   * @param master - ResolveMasterState result
   * @param featId - combat feat id for CalculateOnHandAttacks
   */
  startCombatRound(
    target: ModuleObject | undefined,
    engaged: boolean = false,
    master: boolean = false,
    featId: number = 0
  ){
    if(!isCreature(this.owner)) return;

    const owner: ModuleCreature = this.owner as any;

    // Release any prior duel slave before overwriting master/engaged.
    // Otherwise becoming someone else's slave clears master first and
    // endCombatRound skips release — orphaning infinitePause on the old slave.
    // Skip when duelPartner already is the new target: either the same duel
    // restart, or a new master already linked us (and released our old slave).
    if(this.master && this.duelPartner?.combatRound && this.duelPartner !== target){
      this.releaseDuelSlave();
      this.duelPartner = undefined;
    }

    this.engaged = !!engaged;
    this.master = !!master;

    duelLog(owner, 'round:start', {
      target: duelWho(target),
      engaged: this.engaged,
      master: this.master,
      featId,
      cutscene: !!this.action?.resultsCalculated,
    });

    // : engaged slave re-enters via end combat round mid-start.
    // endCombatRound clears engaged/master, so re-apply the slave flags —
    // otherwise the master's ResolveMeleeAnimations sees engaged=false later.
    if(this.engaged && !this.master){
      const savedAction = this.action;
      this.endCombatRound({ skipQueueAttackActions: true });
      this.action = savedAction;
      this.engaged = true;
      this.master = false;
    }

    if(!this.master){
      this.masterID = target;
      // Slave re-entry endCombatRound clears duelPartner; re-link to master.
      this.duelPartner = this.engaged && target ? target : undefined;
    }else{
      this.masterID = owner;
      if(this.engaged && target){
        const partnerRound = target.combatRound;
        // Master start runs before the target's slave startCombatRound.
        // If the target is still master of someone else, release that slave
        // before we overwrite target.duelPartner (otherwise they stay infinitePaused).
        if(
          partnerRound?.master &&
          partnerRound.duelPartner &&
          partnerRound.duelPartner !== owner
        ){
          partnerRound.releaseDuelSlave();
          partnerRound.duelPartner = undefined;
        }
        this.duelPartner = target;
        if(partnerRound){
          partnerRound.masterID = this.masterID;
          // Slave's partner is the master (owner), not the slave themselves.
          partnerRound.duelPartner = owner;
          partnerRound.timer = 0;
        }
      }
    }

    this.roundStarted = true;
    this.timer = 0;
    this.roundPaused = false;
    this.pauseTimer = 0;
    this.roundPausedBy = undefined;
    // Scripted (CutsceneAttack) rounds skip the
    // ResetCombatAnimations READY snap so cutscene poses are preserved.
    this.resultsCalculated = !!this.action?.resultsCalculated;
    this.spellCastRound = false;
    this.roundLength = CombatRound.ROUND_LENGTH;
    this.offHandTaken = false;
    this.extraTaken = false;
    this.deflectArrow = true;
    this.weaponSucks = false;
    this.dodgeTarget = target;
    this.pendingDischargeVisuals.length = 0;

    // StartCombatRound — NewAttackTarget (0xb20) sticky:
    // set to attack target, or INVALID when targeting self.
    if(target && target !== owner){
      this.newAttackTarget = target;
    }else{
      this.newAttackTarget = undefined;
    }

    for(let i = 0; i < 5; i++){
      this.attackList[i]?.reset?.();
    }

    const combatData = owner.combatData;
    if(this.action){
      if(this.action.actionType == CombatActionType.ATTACK){
        combatData.lastAttackTarget = this.action.target || target;
      }else if(
        this.action.actionType == CombatActionType.CAST_SPELL ||
        this.action.actionType == CombatActionType.ITEM_CAST_SPELL
      ){
        this.spellCastRound = true;
      }else if(this.action.actionType == CombatActionType.ATTACK_USE_FEAT){
        // AC penalties at round start; on-hit stun queued in calculateWeaponAttack
        this.action.feat?.impactCaster?.(owner);
        featId = this.action.featId || featId;
      }
    }else if(target){
      combatData.lastAttackTarget = target;
    }

    this.calculateOnHandAttacks(featId);
    this.calculateOffHandAttacks(owner);
  }

  /**
   * @deprecated Prefer startCombatRound(target, engaged, master, featId).
   * Kept for spell/item cast paths that only need a fresh round shell.
   */
  beginCombatRound(){
    const target = this.action?.target;
    let featId = 0;
    if(this.action?.actionType == CombatActionType.ATTACK_USE_FEAT){
      featId = this.action.featId || 0;
    }
    this.startCombatRound(target, false, true, featId);
  }

    /**
   * CalculateOnHandAttacks.
   * Always 1 + effect_attacks; +1 for Flurry / Rapid Shot feat ids.
   */
  calculateOnHandAttacks(featId = 0): number {
    const effectBonus = Math.max(0, Math.min(2, this.effectAttacks | 0));
    let count = 1 + effectBonus;
    switch(featId){
      case CombatFeatType.FLURRY:
      case CombatFeatType.IMPROVED_FLURRY:
      case CombatFeatType.MASTER_FLURRY:
      case CombatFeatType.RAPID_SHOT:
      case CombatFeatType.IMPROVED_RAPID_SHOT:
      case CombatFeatType.MASTER_RAPID_SHOT:
        count += 1;
      break;
    }
    this.onHandAttacks = count;
    this.additionalAttacks = Math.max(0, count - 1);
    return this.onHandAttacks;
  }

  /**
   * CalculateOffHandAttacks.
   * Dual-wield when MH weapon size ≤ creature size and OH is a real weapon;
   * else oversized MELEE_TWO_HAND gets one bonus main-hand-style slot.
   */
  calculateOffHandAttacks(creature: ModuleCreature): number {
    this.offHandAttacks = 0;
    if(!creature || creature.isSimpleCreature()){
      return 0;
    }

    const mainHand = creature.equipment.RIGHTHAND;
    if(!mainHand){
      return 0;
    }

    const creatureSize = this.getCreatureSize(creature);
    const mhBase = mainHand.getBaseItem();
    const mhSize = (mhBase?.weaponSize as number) || 0;

    // MH size ≤ creature size: eligible for dual-wield off-hand
    if(mhSize <= creatureSize){
      const offHand = creature.equipment.LEFTHAND;
      if(offHand){
        if(
          offHand.getWeaponType() != WeaponType.INVALID &&
          offHand.getWeaponWield() != WeaponWield.INVALID
        ){
          this.offHandAttacks = 1;
          return 1;
        }
      }
      return 0;
    }

    // MH larger than creature: 2H melee gets a bonus attack slot
    if(mainHand.getWeaponWield() == WeaponWield.TWO_HANDED_SWORD){
      this.offHandAttacks = 1;
      return 1;
    }

    return 0;
  }

  /** Appearance sizecategory (defaults to MEDIUM=3). */
  getCreatureSize(creature: ModuleCreature): number {
    return creature.getAppearance()?.sizecategory || 3;
  }

  /** Total attacks this round (on + off). Caps at AttackList length. */
  getTotalAttacks(): number {
    return Math.min(5, (this.onHandAttacks || 0) + (this.offHandAttacks || 0));
  }

  /**
   * End the combat round.
   * end combat round — master clears slave engaged link.
   */
  endCombatRound(options?: { skipQueueAttackActions?: boolean }){
    duelLog(this.owner, 'round:end', {
      engaged: this.engaged,
      master: this.master,
      slave: duelWho(this.duelPartner),
      reentry: !!options?.skipQueueAttackActions,
    });
    const shouldAutoPause = (
      !options?.skipQueueAttackActions &&
      !!this.action &&
      this.owner === GameState.getCurrentPlayer() &&
      !this.owner.isDead()
    );
    this.roundStarted = false;
    const combatData = this.owner.combatData;
    combatData.lastCombatFeatUsed = undefined;
    combatData.lastForcePowerUsed = undefined;

    if(this.action){
      if(
        this.action.actionType == CombatActionType.ATTACK ||
        this.action.actionType == CombatActionType.ATTACK_USE_FEAT
      ){
        combatData.lastAttackAction = ActionType.ActionPhysicalAttacks;
        combatData.lastAttackResult = this.action.attackResult;
        if(this.action.feat){
          combatData.lastCombatFeatUsed = this.action.feat;
        }
      }else if(this.action.actionType == CombatActionType.CAST_SPELL){
        combatData.lastAttackAction = ActionType.ActionCastSpell;
        combatData.lastAttemptedSpellTarget = this.action.target;
        if(this.action.spell){
          combatData.lastForcePowerUsed = this.action.spell;
        }
      }else if(this.action.actionType == CombatActionType.ITEM_CAST_SPELL){
        combatData.lastAttackAction = ActionType.ActionItemCastSpell;
        combatData.lastAttemptedSpellTarget = this.action.target;
        if(this.action.spell){
          combatData.lastForcePowerUsed = this.action.spell;
        }
      }
    }

    // Master ends → release duel slave
    this.releaseDuelSlave();

    this.roundPaused = false;
    this.roundPausedBy = undefined;
    this.pauseTimer = 0;
    this.bleedTimer = 0;
    this.infinitePause = false;
    this.extraTaken = false;
    this.attackID = 0;
    this.overlapAmount = 0;
    this.parryIndex = 0;
    this.roundLength = CombatRound.ROUND_LENGTH;
    this.weaponSucks = false;
    this.spellCastRound = false;
    this.deflectArrow = true;
    this.action = undefined;
    this.timer = 0;
    this.engaged = false;
    this.master = false;
    this.masterID = undefined;
    this.duelPartner = undefined;
    for(let i = 0; i < 5; i++){
      this.attackList[i].reset();
    }
    this.owner.onCombatRoundEnd();

    // Body Fuel at end combat round: temporary FP = max FP
    if(this.owner.bodyFuel){
      this.owner.temporaryForce = this.owner.getMaxFP();
    }

    // Drop scheduled physical attacks whose target is already dead/invalid so
    // end combat round can QueueAttackActions (sticky-target clear).
    this.pruneDeadAttackActions();

    // end combat round: if NewAttackTarget sticky died, force GetNearestEnemy.
    // Alive sticky keeps focus.
    let forceNearest = false;
    const sticky = this.newAttackTarget;
    if(sticky){
      const stickyDead = typeof (sticky as ModuleCreature).isDead === 'function'
        ? !!(sticky as ModuleCreature).isDead()
        : false;
      if(stickyDead){
        this.newAttackTarget = undefined;
        forceNearest = true;
      }
    }

    // end combat round auto-pause fires before QueueAttackActions.
    if(shouldAutoPause){
      GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.CombatRoundEnd);
    }

    // end combat round → QueueAttackActions for controlled PC.
    // QueueAttackActions itself keeps a non-empty schedule when sticky lives.
    if(
      !options?.skipQueueAttackActions &&
      isCreature(this.owner)
    ){
      const creature = this.owner as ModuleCreature;
      if(
        GameState.getCurrentPlayer() === creature &&
        !creature.isDead()
      ){
        queueAttackActions(creature, { forceNearest });
      }
    }
  }

  /**
   * Remove ATTACK / ATTACK_USE_FEAT sched entries whose target is dead or missing.
   * Prevents a backlog of dead-target swings from blocking QueueAttackActions.
   */
  pruneDeadAttackActions(){
    if(!this.scheduledActionList.length) return;
    this.scheduledActionList = CombatRound.filterLiveAttackActions(this.scheduledActionList);
  }

    /**
   * Reset the combat round
   */
  reset(){
    //
  }

  /**
   * Update the combat round
   * @param delta - The delta time to update the round for
   */
  update(delta: number = 0){
    if(!this.roundStarted) return;

    const deltaMs = delta * 1000;
    this.processPendingDamage(deltaMs);

    if(this.roundPaused){
      const pauseTimerBefore = this.pauseTimer;
      this.pauseTimer -= deltaMs;
      if(this.pauseTimer < 0) this.pauseTimer = 0;
      if(this.pauseTimer <= 0 && !this.infinitePause){
        this.flushPendingDamage();
        // UpdateCombatRoundTimer — the expired pause resets the
        // combat animations (both duel partners when master) and the round keeps
        // running until the timer reaches roundLength. Only a dead/invalid target
        // ends the round early.
        const overshoot = Math.max(0, deltaMs - pauseTimerBefore);
        this.resetCombatAnimations(overshoot);
        if(this.master && this.duelPartner?.combatRound){
          this.duelPartner.combatRound.resetCombatAnimations(overshoot);
        }
        const target = this.dodgeTarget || this.action?.target;
        const targetInvalid = shouldEndRoundOnPauseExpiry({
          hasTarget: !!target,
          targetDead: !!target?.isDead?.(),
        });
        duelLog(this.owner, 'round:pause-expired', {
          overshoot,
          target: duelWho(target),
          targetInvalid,
          master: this.master,
        });
        if(targetInvalid){
          this.endCombatRound();
        }
      }
    }else{
      this.timer += deltaMs;
      if(this.timer >= this.roundLength){
        this.flushPendingDamage();
        this.endCombatRound();
      }
    }
  }

  /**
   * Advance pending damage timers and apply hits that are ready.
   * At muzzle time (remaining delay ≤ reaxnDelay) spawn bolt + ShotSound.
   */
  processPendingDamage(deltaMs: number = 0){
    for(let i = 0; i < this.currentAttack; i++){
      const attack = this.attackList[i];
      if(!attack || attack.damageApplied || attack.damageApplyDelay < 0) continue;

      const after = attack.damageApplyDelay - deltaMs;
      if(
        attack.rangedAttack &&
        !attack.projectileSpawned &&
        after <= (attack.reaxnDelay || 0)
      ){
        spawnCombatProjectile(this.owner as ModuleCreature, attack);
        attack.projectileSpawned = true;
      }

      attack.damageApplyDelay = after;
      if(attack.damageApplyDelay <= 0){
        this.signalAttackResult(attack);
      }
    }

    this.processPendingDischargeVisuals(deltaMs);
  }

  /**
   * Spawn discharge-only bolts (Shots without AttackList rolls).
   */
  processPendingDischargeVisuals(deltaMs: number = 0){
    if(!this.pendingDischargeVisuals.length) return;
    for(let i = this.pendingDischargeVisuals.length - 1; i >= 0; i--){
      const shot = this.pendingDischargeVisuals[i];
      shot.muzzleRemainingMs -= deltaMs;
      if(shot.muzzleRemainingMs > 0) continue;
      this.spawnDischargeVisualProjectile(shot);
      this.pendingDischargeVisuals.splice(i, 1);
    }
  }

  spawnDischargeVisualProjectile(shot: PendingDischargeVisual){
    const fake = new CombatAttackData();
    fake.rangedAttack = true;
    fake.attackWeapon = shot.attackWeapon as any;
    fake.weaponAttackType = shot.weaponAttackType;
    fake.reaxnDelay = shot.travelMs;
    fake.rangedTargetX = shot.rangedTargetX;
    fake.rangedTargetY = shot.rangedTargetY;
    fake.rangedTargetZ = shot.rangedTargetZ;
    fake.reactObject = shot.reactObject;
    spawnCombatProjectile(this.owner as ModuleCreature, fake);
  }

  /**
   * Apply any remaining deferred hits before the round ends.
   */
  flushPendingDamage(){
    for(let i = 0; i < this.currentAttack; i++){
      const attack = this.attackList[i];
      if(!attack || attack.damageApplied || attack.damageApplyDelay < 0) continue;
      if(attack.rangedAttack && !attack.projectileSpawned){
        spawnCombatProjectile(this.owner as ModuleCreature, attack);
        attack.projectileSpawned = true;
      }
      this.signalAttackResult(attack);
    }

    while(this.pendingDischargeVisuals.length){
      this.spawnDischargeVisualProjectile(this.pendingDischargeVisuals.pop()!);
    }
  }

  /**
   * Apply one attack's damage and floating-text feedback.
   */
  signalAttackResult(attack: CombatAttackData){
    if(!attack || attack.damageApplied) return;
    attack.damageApplyDelay = -1;

    const owner = this.owner as ModuleCreature;
    const scripted = !!this.resultsCalculated;
    // ResolveOnHitVisuals — skipped on resultsCalculated (ResolveDamage scripted)
    if(!scripted){
      CombatRound.resolveOnHitVisuals(attack, owner);
    }

    // Melee damage — floaty only for player attacker
    const showFloaty = CombatRound.shouldShowCombatFloaty(owner);

    const tlkFloaty = (strRef: number) =>
      GameState.TLKManager.GetStringById(strRef)?.getDisplayText?.() ||
      GameState.TLKManager.GetStringById(strRef)?.Value ||
      '';

    if(
      attack.attackResult == AttackResult.HIT_SUCCESSFUL ||
      attack.attackResult == AttackResult.CRITICAL_HIT ||
      attack.attackResult == AttackResult.AUTOMATIC_HIT
    ){
      attack.applyDamageEffectToCreature(
        owner,
        attack.reactObject as ModuleCreature,
        { scriptedResults: scripted }
      );
      if(attack.reactObject && showFloaty){
        TextSprite3D.CreateOnObject(attack.reactObject, attack.getTotalDamage().toString(), TextSprite3DType.HOSTILE, 1500);
      }
    }else if(attack.attackResult == AttackResult.MISS && attack.reactObject){
      if(showFloaty){
        TextSprite3D.CreateOnObject(attack.reactObject, tlkFloaty(AttackSummaryStrRef.MISS) || 'Miss', TextSprite3DType.NEUTRAL, 1500);
      }
      attack.damageApplied = true;
    }else if(attack.attackResult == AttackResult.PARRIED && attack.reactObject){
      // attack_result 8 floaty uses Deflected! (0xa5ab)
      if(showFloaty){
        TextSprite3D.CreateOnObject(attack.reactObject, tlkFloaty(AttackSummaryStrRef.DEFLECTED) || 'Deflected!', TextSprite3DType.NEUTRAL, 1500);
      }
      attack.damageApplied = true;
    }else if(attack.attackResult == AttackResult.DEFLECTED && attack.reactObject){
      // attack_result 9 floaty uses Returned! (0xa5b5)
      if(showFloaty){
        TextSprite3D.CreateOnObject(attack.reactObject, tlkFloaty(AttackSummaryStrRef.RETURNED) || 'Returned!', TextSprite3DType.NEUTRAL, 1500);
      }
      attack.damageApplied = true;
    }else{
      attack.damageApplied = true;
    }
  }

  /**
   * GetSpellActionPending
   * true when a cast is in progress or a CAST_SPELL is still scheduled.
   * (list check uses action-type byte; KotOR Combat uses CAST_SPELL=9.)
   */
  getSpellActionPending(): boolean {
    if(this.spellCastRound) return true;
    for(let i = 0; i < this.scheduledActionList.length; i++){
      const t = this.scheduledActionList[i]?.actionType;
      if(t === CombatActionType.CAST_SPELL || t === CombatActionType.ITEM_CAST_SPELL){
        return true;
      }
    }
    return false;
  }

  /**
   * SetSpellCastRound
   * marks this round as a spell cast and stores the spell id on the creature.
   */
  setSpellCastRound(_spellId: number = -1, _metaFlag: number = 0){
    this.spellCastRound = true;
  }

  /**
   * RemoveSpellAction
   * drop pending spell/item-cast entries (action-type byte 2 covers both)
   * from the scheduled list and clear the active round action when it is a cast.
   */
  removeSpellAction(){
    this.scheduledActionList = this.scheduledActionList.filter(
      (a) => {
        const t = a?.actionType;
        return t !== CombatActionType.CAST_SPELL && t !== CombatActionType.ITEM_CAST_SPELL;
      }
    );
    this.spellCastRound = false;
    const cur = this.action?.actionType;
    if(cur === CombatActionType.CAST_SPELL || cur === CombatActionType.ITEM_CAST_SPELL){
      this.action = undefined;
    }
  }

  /**
   * RemoveSpellActionFromRound.
   */
  removeSpellActionFromRound(){
    if(this.getSpellActionPending()){
      this.removeSpellAction();
    }else{
      this.spellCastRound = false;
    }
  }

  /**
   * CheckActionLengthAtTime
   * whether the target's round can absorb a reaction of `actionLengthMs`.
   */
  checkActionLengthAtTime(
    pausedBy: ModuleObject | undefined,
    actionLengthMs: number,
    delayMs: number = 0
  ): boolean {
    if(
      this.roundPaused &&
      this.roundPausedBy &&
      pausedBy &&
      this.roundPausedBy !== pausedBy &&
      (this.timer + delayMs) < (this.pauseTimer + this.timer)
    ){
      return false;
    }
    if(this.roundStarted){
      const remaining =
        ((this.roundLength - this.overlapAmount) - this.timer) - delayMs + 1000;
      return actionLengthMs <= remaining;
    }
    return true;
  }

  /**
   * DecrementRoundLength (simplified)
   * shrink remaining round by attack/reaction animation length.
   */
  decrementRoundLength(amountMs: number){
    if(!this.roundStarted || !(amountMs > 0)) return;
    const prev = this.roundLength || CombatRound.ROUND_LENGTH;
    const next = prev - amountMs;
    if(next < 0){
      this.roundLength = amountMs;
      this.overlapAmount = Math.max(0, this.overlapAmount);
    }else{
      if(prev > 0){
        this.timer = Math.floor((this.timer / prev) * next);
      }
      this.roundLength = next;
    }
  }

  /**
   * Pause the round for the given pause owner and pause timer.
   * SetRoundPaused + SetPauseTimer — infinitePause holds slave until master ends.
   */
  pauseRound(pauseOwner: ModuleObject, pauseTimer: number = 0, infinitePause: boolean = false){
    duelLog(this.owner, 'round:pause', {
      by: duelWho(pauseOwner),
      timer: pauseTimer,
      infinite: !!infinitePause,
    });
    this.roundPaused = true;
    this.roundPausedBy = pauseOwner;
    this.infinitePause = !!infinitePause;
    if(this.infinitePause){
      this.pauseTimer = pauseTimer;
    }else if(pauseTimer === 0){
      this.pauseTimer = 0;
    }else if(this.pauseTimer > 0){
      this.pauseTimer += pauseTimer;
    }else{
      this.pauseTimer = pauseTimer;
    }
  }

  /**
   * Unpause the round for the given pause owner
   * @param pauseOwner - The pause owner to unpause the round for
   */
  unpauseRound(pauseOwner: ModuleObject){
    if(this.roundPausedBy == pauseOwner){
      this.roundPaused = false;
      this.pauseTimer = 0;
    }
  }

  /**
   * ResetCombatAnimations
   * clear the pause, carry the overshoot into the round timer, and drop the
   * owner into combat READY for the remainder of the round (cinematic duel
   * stance). Scripted rounds (resultsCalculated) keep their posed animation.
   */
  resetCombatAnimations(overshootMs: number = 0){
    this.roundPaused = false;
    this.roundPausedBy = undefined;
    this.infinitePause = false;
    this.pauseTimer = 0;
    this.timer += Math.max(0, overshootMs);

    const owner = this.owner as ModuleCreature;
    const animIndex = owner?.animationState?.index;
    const scriptedDead = !owner?.isDead?.() && (
      animIndex === ModuleCreatureAnimState.DEAD ||
      animIndex === ModuleCreatureAnimState.DEAD1 ||
      animIndex === ModuleCreatureAnimState.DIE ||
      animIndex === ModuleCreatureAnimState.DIE1
    );
    const ready = typeof owner?.setAnimationState === 'function' && shouldSnapCombatReady({
      dead: !!owner.isDead?.(),
      debilitated: !!owner.isDebilitated?.(),
      resultsCalculated: this.resultsCalculated,
      scriptedDead,
    });
    if(ready){
      owner.setAnimationState(ModuleCreatureAnimState.READY);
    }
    duelLog(this.owner, 'round:reset-anims', {
      overshoot: Math.max(0, overshootMs),
      ready,
      timer: this.timer,
      roundLength: this.roundLength,
    });
  }

  /**
   * Add an action to the scheduled action list
   * @param action - The action to add
   */
  addAction(action: CombatRoundAction){
    // AddAction — reject when count > 3 (max 4).
    if(this.scheduledActionList.length > 3){
      return;
    }
    action.owner = this.owner;
    this.scheduledActionList.push(action);
  }

  /**
   * AddEquipAction
   * queue ITEM_EQUIP at list head (deferred while casting / combat busy).
   */
  addEquipAction(item: ModuleItem, slot: number, instant: boolean = false){
    if(!item) return;
    this.decrementRoundLength(1500);
    const action = new CombatRoundActionClass(this.owner);
    action.actionType = CombatActionType.ITEM_EQUIP;
    action.actionTimer = 0;
    action.animationTime = 1500;
    action.item = item;
    action.inventorySlot = slot | 0;
    action.equipInstant = !!instant;
    this.scheduledActionList.unshift(action);
  }

  /**
   * AddUnequipAction.
   */
  addUnequipAction(item: ModuleItem, instant: boolean = false){
    if(!item) return;
    this.decrementRoundLength(1500);
    const action = new CombatRoundActionClass(this.owner);
    action.actionType = CombatActionType.ITEM_UNEQUIP;
    action.actionTimer = 0;
    action.animationTime = 1500;
    action.item = item;
    action.target = item;
    action.equipInstant = !!instant;
    this.scheduledActionList.unshift(action);
  }

  /**
   * GetActionPending
   * head scheduled action's timer has elapsed.
   */
  getActionPending(): boolean {
    const head = this.scheduledActionList[0];
    if(!head) return false;
    return (head.actionTimer || 0) <= (this.timer || 0);
  }

  /**
   * ProcessPendingCombatActions
   * promote deferred ITEM_EQUIP / ITEM_UNEQUIP onto the creature action queue
   * (called after CastSpell fail/complete).
   */
  processPendingCombatActions(){
    if(!this.getActionPending()) return;
    const owner = this.owner as ModuleCreature;
    if(!owner?.actionQueue) return;

    for(let i = this.scheduledActionList.length - 1; i >= 0; i--){
      const ca = this.scheduledActionList[i];
      if(!ca) continue;

      if(ca.actionType === CombatActionType.ITEM_EQUIP){
        const item = ca.item || (
          isItem(ca.target)
            ? ca.target as ModuleItem
            : undefined
        );
        if(item){
          const equipAction = new GameState.ActionFactory.ActionEquipItem();
          equipAction.setParameter(0, ActionParameterType.DWORD, item);
          equipAction.setParameter(1, ActionParameterType.INT, ca.inventorySlot | 0);
          equipAction.setParameter(2, ActionParameterType.INT, ca.equipInstant ? 1 : 0);
          owner.actionQueue.addFront(equipAction);
        }
        this.scheduledActionList.splice(i, 1);
      }else if(ca.actionType === CombatActionType.ITEM_UNEQUIP){
        const item = ca.item || (
          isItem(ca.target)
            ? ca.target as ModuleItem
            : undefined
        );
        if(item){
          const unequipAction = new GameState.ActionFactory.ActionUnequipItem();
          unequipAction.setParameter(0, ActionParameterType.DWORD, item);
          unequipAction.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
          unequipAction.setParameter(2, ActionParameterType.INT, ca.equipInstant ? 1 : 0);
          owner.actionQueue.addFront(unequipAction);
        }
        this.scheduledActionList.splice(i, 1);
      }
    }
  }

  /**
   * ClearAllAttacks
   * reset AttackList[5] swing data. Does **not** clear the scheduled action list.
   */
  clearAllAttacks(){
    for(let i = 0; i < this.attackList.length; i++){
      this.attackList[i]?.reset?.();
    }
  }

  /**
   * Clear the last scheduled combat-round action.
   * RemoveLastAction (RemoveTail).
   * @returns True if an action was removed
   */
  removeLastAction(): boolean {
    if(!this.scheduledActionList.length){
      return false;
    }
    this.scheduledActionList.pop();
    return true;
  }

  /**
   * Clear all scheduled combat-round actions (and the current action).
   * RemoveAllActions.
   */
  clearActions(){
    this.action = undefined;
    this.scheduledActionList = [];
  }

  /**
   * Clear the action for the given combat action
   * @param action - The action to clear
   * @returns True if the action was cleared, false otherwise
   */
  clearAction(action: CombatRoundAction){
    let index = this.scheduledActionList.indexOf(action);
    if(index >= 0){
      this.scheduledActionList.splice( index, 1 );
      return true;
    }
    return false;
  }

  /**
   * Clear the actions by target
   * @param target - The target to clear the actions for
   */
  clearActionsByTarget(target: ModuleObject){
    let index = this.scheduledActionList.length;
    while(index--){
      const action = this.scheduledActionList[index];
      if(action && action.target == target){
        this.scheduledActionList.splice(index, 1);
      }
    }
  }

  /**
   * Set the attack target for the given combat action
   * @param target - The target to set the attack target for
   * @returns True if the attack target was set, false otherwise
   */
  /**
   * Retarget scheduled *attack* actions only.
   * InitializeNewAttackTarget / QueueAttackActions must not rewrite
   * CAST_SPELL / ITEM_CAST_SPELL targets (personal menu stamps the caster).
   */
  setAttackTarget(target: ModuleObject): boolean {
    if(!target) return false;
    const attackTypes = [
      CombatActionType.ATTACK,
      CombatActionType.ATTACK_USE_FEAT,
      CombatActionType.ATTACK_CUTSCENE_MOVE,
    ];
    for(let i = 0, len = this.scheduledActionList.length; i < len; i++){
      const action = this.scheduledActionList[i];
      if(!action) continue;
      if(attackTypes.indexOf(action.actionType) >= 0){
        action.target = target;
      }
    }
    return true;
  }

  /**
   * ResolveAttack entry — melee vs ranged by main-hand weapon.
   * Fills AttackList slots (JS flattens sub_attacks into attackList[5]).
   * @param creature - The creature to calculate the attack damage for
   * @param combatAction - The combat action to calculate the attack damage for
   */
  calculateAttackDamage(creature: ModuleCreature, combatAction: CombatRoundAction){
    this.resolveAttack(creature, combatAction);
  }

  /**
   * ResolveAttack 
   */
  resolveAttack(creature: ModuleCreature, combatAction: CombatRoundAction){
    if(!combatAction || combatAction.resolved)
      return;

    creature.weaponPowered(true);

    combatAction.resolved = true;
    // ResolveAttack — ActivityManager(4) clears stealth/dialog soft modes
    creature.activityManager?.(4);
    // ResolveAttack — GetAttackTarget = attackee
    if(combatAction.target){
      creature.combatData.lastAttackTarget = combatAction.target;
    }
    // GetLastWeaponUsed / GetLastAttackType / GetLastAttackMode writers
    creature.combatData.lastWeaponUsed =
      creature.equipment?.RIGHTHAND ||
      creature.equipment?.CLAW1 ||
      undefined;
    creature.combatData.lastAttackType = combatAction.feat?.id ?? combatAction.featId ?? 0;
    if(creature.combatData.lastAttackType < 0){
      creature.combatData.lastAttackType = 0;
    }
    creature.combatData.lastAttackMode = creature.combatMode | 0;
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);
    this.currentAttack = 0;
    this.offHandTaken = false;
    this.pendingDischargeVisuals.length = 0;

    // ResolveAttack — always branch melee/ranged.
    // resultsCalculated only short-circuits roll/damage dice inside those paths.
    if(!combatAction.resultsCalculated){
      combatAction.attackResult = (hasAssuredHit) ? AttackResult.AUTOMATIC_HIT : AttackResult.MISS;
      combatAction.attackDamage = 0;
    }

    if(creature && creature.isSimpleCreature()){
      this.resolveSimpleCreatureAttacks(creature, combatAction);
    }else if(creature){
      const mainWeapon = creature.equipment.RIGHTHAND;
      if(mainWeapon?.isRangedWeapon?.()){
        this.resolveRangedAttack(creature, combatAction);
      }else{
        this.resolveMeleeAttack(creature, combatAction);
      }
    }

    if(combatAction.target){
      combatAction.target.combatData.lastAttacker = creature;
      creature.combatData.lastAttackResult = combatAction.attackResult;
      combatAction.target.onAttacked(combatAction.actionType);
    }

    this.calculateRoundAnimations(creature, combatAction);

    let attackAnimation = creature.model?.odysseyAnimationMap?.get?.(
      (combatAction.animationName || '').toLowerCase().trim()
    );
    let attackDamageDelay = attackAnimation?.getDamageDelay?.() || 0;

    // Schedule damage for the animation Hit event instead of applying instantly
    const damageDelayMs = Math.max(0, (attackDamageDelay || 0.5) * 1000);

    for(let i = 0; i < this.currentAttack; i++){
      const attack = this.attackList[i];
      if(!attack) continue;
      // Ranged resolveRangedAttack already set discharge + travel delays
      if(attack.damageApplyDelay >= 0) continue;
      // Stagger multi-attacks slightly (GetWeaponImpactTime per swing)
      attack.damageApplyDelay = damageDelayMs + (i * 200);
    }
  }

  /**
   * ResolveMeleeAttack — loop GetTotalAttacks, SetOffHandAttack by index.
   */
  resolveMeleeAttack(creature: ModuleCreature, combatAction: CombatRoundAction){
    const maxSlots = this.attackList.length;
    const onHand = Math.max(0, this.onHandAttacks || 0);
    const offHand = Math.max(0, this.offHandAttacks || 0);
    const total = Math.min(maxSlots, onHand + offHand);
    const mainWeapon = creature.equipment.RIGHTHAND;
    const offWeapon = creature.equipment.LEFTHAND;

    for(let swing = 0; swing < total && this.currentAttack < maxSlots; swing++){
      const isOffHand = swing >= onHand;
      this.offHandTaken = isOffHand;

      let weapon = mainWeapon;
      let slot = ModuleCreatureArmorSlot.RIGHTHAND;
      if(isOffHand){
        if(
          offWeapon &&
          offWeapon.getWeaponType() != WeaponType.INVALID &&
          offWeapon.getWeaponWield() != WeaponWield.INVALID
        ){
          weapon = offWeapon;
          slot = ModuleCreatureArmorSlot.LEFTHAND;
        }else if(mainWeapon?.getWeaponWield() == WeaponWield.TWO_HANDED_SWORD){
          weapon = mainWeapon;
          slot = ModuleCreatureArmorSlot.RIGHTHAND;
        }else{
          continue;
        }
      }

      this.calculateWeaponAttack(creature, weapon, slot, combatAction);
    }
  }

  /**
   * ResolveRangedAttack
   * weapondischarge.2da Shots/Hits + random attack-shot assignment + travel delay.
   * Every discharge shot fires a bolt; only randomly assigned shots get AttackList rolls.
   */
  resolveRangedAttack(creature: ModuleCreature, combatAction: CombatRoundAction){
    const maxSlots = this.attackList.length;
    const onHand = Math.max(0, this.onHandAttacks || 0);
    const offHand = Math.max(0, this.offHandAttacks || 0);
    const totalAttacks = Math.min(maxSlots, onHand + offHand);
    const mainWeapon = creature.equipment.RIGHTHAND;
    const offWeapon = creature.equipment.LEFTHAND;

    this.attackGroup = (this.attackGroup + 1) & 0xff;
    this.pendingDischargeVisuals.length = 0;

    // ResolveRangedAttack: when resultsCalculated, GetWeaponDischargeShots uses
    // the designer animations.2da row; otherwise GetClientRangedAnimation.
    let animName: string;
    if(combatAction.resultsCalculated){
      combatAction.calculateAttackAnimation();
      animName = combatAction.animationName || '';
    }else{
      const attackKey = creature.getCombatAnimationAttackType() || 'b';
      const weaponWield = creature.getCombatAnimationWeaponType() || 5;
      let attackType = 1;
      if(combatAction.feat){
        const fid = combatAction.feat.id;
        if(fid === CombatFeatType.RAPID_SHOT || fid === CombatFeatType.IMPROVED_RAPID_SHOT || fid === CombatFeatType.MASTER_RAPID_SHOT){
          attackType = 2;
        }else if(fid === CombatFeatType.SNIPER_SHOT || fid === CombatFeatType.IMPROVED_SNIPER_SHOT || fid === CombatFeatType.MASTER_SNIPER_SHOT){
          attackType = 3;
        }else if(fid === CombatFeatType.POWER_BLAST || fid === CombatFeatType.IMPROVED_POWER_BLAST || fid === CombatFeatType.MASTER_POWER_BLAST){
          attackType = 4;
        }
      }
      animName = `${attackKey}${weaponWield}a${attackType}`;
      combatAction.animationName = animName;
    }

    const discharge = CombatRound.getWeaponDischargeInfo(creature, animName);
    const shots = discharge?.shots ?? totalAttacks;
    const attackShotIndices = CombatRound.pickAttackShotIndices(shots, totalAttacks);
    const attackShotSet = new Set(attackShotIndices);

    let attackRollIndex = 0;
    for(let shot = 0; shot < shots; shot++){
      const dischargeHand = CombatRound.getWeaponDischargeHand(discharge?.switchMask ?? '', shot);
      const isOffHand = attackShotSet.has(shot)
        ? (attackRollIndex >= onHand)
        : (dischargeHand !== 0 && !!offWeapon);
      const weapon = isOffHand && offWeapon ? offWeapon : mainWeapon;
      const slot = isOffHand && offWeapon
        ? ModuleCreatureArmorSlot.LEFTHAND
        : ModuleCreatureArmorSlot.RIGHTHAND;
      const muzzleMs = discharge?.shotTimes[shot] ?? (shot * 200);
      const weaponAttackType = dischargeHand !== 0 ? 2 : (slot === ModuleCreatureArmorSlot.LEFTHAND ? 2 : 1);

      if(!attackShotSet.has(shot)){
        // : discharge-only → ResolveRangedMiss + sub_attack (no AttackList roll)
        if(this.pendingDischargeVisuals.length >= 16) continue;
        const impactPos = CombatRound.getProjectileMissLocation(creature, combatAction.target, AttackResult.MISS);
        const travelMs = CombatRound.getProjectileTravelDelayMs(creature.position, impactPos);
        this.pendingDischargeVisuals.push({
          muzzleRemainingMs: muzzleMs,
          travelMs,
          weaponAttackType,
          attackWeapon: weapon,
          rangedTargetX: impactPos.x,
          rangedTargetY: impactPos.y,
          rangedTargetZ: impactPos.z,
          reactObject: combatAction.target,
        });
        continue;
      }

      if(this.currentAttack >= maxSlots){
        attackRollIndex++;
        continue;
      }

      this.offHandTaken = isOffHand;
      const slotBefore = this.currentAttack;
      this.calculateWeaponAttack(creature, weapon, slot, combatAction);
      const attack = this.attackList[slotBefore];
      if(!attack){
        attackRollIndex++;
        continue;
      }

      attack.attackGroup = this.attackGroup;
      attack.rangedAttack = true;
      attack.weaponAttackType = weaponAttackType;

      const hit =
        attack.attackResult === AttackResult.HIT_SUCCESSFUL ||
        attack.attackResult === AttackResult.CRITICAL_HIT ||
        attack.attackResult === AttackResult.AUTOMATIC_HIT ||
        attack.attackResult === AttackResult.DEFLECTED ||
        attack.attackResult === AttackResult.PARRIED;

      let impactPos: THREE.Vector3;
      if(hit){
        // ResolveRangedHit — impact node or body z+1.25 (projectile)
        impactPos = getProjectileImpactPosition(combatAction.target);
        attack.rangedTargetX = impactPos.x;
        attack.rangedTargetY = impactPos.y;
        attack.rangedTargetZ = impactPos.z;
      }else{
        impactPos = CombatRound.getProjectileMissLocation(creature, combatAction.target, attack.attackResult);
        attack.rangedTargetX = impactPos.x;
        attack.rangedTargetY = impactPos.y;
        attack.rangedTargetZ = impactPos.z;
      }

      const travelMs = CombatRound.getProjectileTravelDelayMs(creature.position, impactPos);
      attack.reaxnDelay = travelMs;
      attack.damageApplyDelay = muzzleMs + travelMs;

      attackRollIndex++;
    }

    // Fallback if discharge table missing / no shots assigned
    if(this.currentAttack === 0){
      for(let swing = 0; swing < totalAttacks && this.currentAttack < maxSlots; swing++){
        const isOffHand = swing >= onHand;
        this.offHandTaken = isOffHand;
        const weapon = isOffHand && offWeapon ? offWeapon : mainWeapon;
        const slot = isOffHand && offWeapon
          ? ModuleCreatureArmorSlot.LEFTHAND
          : ModuleCreatureArmorSlot.RIGHTHAND;
        this.calculateWeaponAttack(creature, weapon, slot, combatAction);
      }
    }
  }

  resolveSimpleCreatureAttacks(creature: ModuleCreature, combatAction: CombatRoundAction){
    if(creature.equipment.CLAW1){
      this.calculateWeaponAttack(creature, creature.equipment.CLAW1, ModuleCreatureArmorSlot.CLAW1, combatAction);
    }
    if(creature.equipment.CLAW2){
      this.calculateWeaponAttack(creature, creature.equipment.CLAW2, ModuleCreatureArmorSlot.CLAW2, combatAction);
    }
    if(creature.equipment.CLAW3){
      this.calculateWeaponAttack(creature, creature.equipment.CLAW3, ModuleCreatureArmorSlot.CLAW3, combatAction);
    }
  }

  /**
   * ResolveMeleeAttack coup_de_grace gate:
   * target creature debilitated/dying, total level < 5, not party-UI path → Automatic Hit.
   */
  shouldCoupDeGrace(target: ModuleCreature): boolean {
    if(!target) return false;
    if(GameState.PartyManager?.party?.indexOf(target) >= 0) return false;
    if(target.getTotalClassLevel() >= 5) return false;
    return !!(target.isDebilitated?.() || (typeof target.getHP === 'function' && target.getHP() <= 0));
  }

  /**
   * Roll a natural d20.
   */
  rollD20(): number {
    return Dice.roll(1, DiceType.d20);
  }

  /**
   * Ability modifier for attack rolls. Ranged uses DEX; melee uses STR unless
   * TSL Finesse feats allow the better of STR/DEX.
   */
  getAttackAbilityModifier(creature: ModuleCreature, weapon: ModuleItem | undefined): number {
    const strMod = CombatRound.GetMod(creature.getSTR());
    const dexMod = CombatRound.GetMod(creature.getDEX());
    if(weapon?.isRangedWeapon()){
      return dexMod;
    }
    // TSL Finesse: Lightsabers / Melee Weapons — use higher of STR/DEX
    if(weapon && (weapon.baseItemId == 8 || weapon.baseItemId == 9 || weapon.baseItemId == 10)){
      if(creature.getHasFeat(CombatFeatType.FINESSE_LIGHTSABERS)){
        return Math.max(strMod, dexMod);
      }
      return strMod;
    }
    if(creature.getHasFeat(CombatFeatType.FINESSE_MELEE_WEAPONS)){
      return Math.max(strMod, dexMod);
    }
    return strMod;
  }

  /**
   * Full to-hit modifier vs target.
   */
  getAttackModifierVersus(
    creature: ModuleCreature,
    weapon: ModuleItem | undefined,
    weaponSlot: ModuleCreatureArmorSlot,
    combatAction: CombatRoundAction
  ): number {
    let modifier = creature.getBaseAttackBonus();
    modifier += this.getAttackAbilityModifier(creature, weapon);
    modifier += weapon?.getAttackBonus() || 0;

    if(this.isDualWielding(creature)){
      if(
        weaponSlot == ModuleCreatureArmorSlot.RIGHTHAND ||
        weaponSlot == ModuleCreatureArmorSlot.LEFTHAND
      ){
        modifier += this.calculateTwoWeaponModifier(creature, weaponSlot);
      }
    }else if(
      weaponSlot == ModuleCreatureArmorSlot.RIGHTHAND &&
      weapon &&
      !weapon.isRangedWeapon() &&
      !creature.equipment.LEFTHAND &&
      (weapon.getWeaponWield() == WeaponWield.ONE_HANDED_SWORD ||
        weapon.getWeaponWield() == WeaponWield.BLASTER_PISTOL ||
        weapon.getWeaponWield() == WeaponWield.STUN_BATON)
    ){
      // Dueling feats with a free off-hand
      if(creature.getHasFeat(CombatFeatType.MASTER_DUELING)){
        modifier += 3;
      }else if(creature.getHasFeat(CombatFeatType.ADVANCED_DUELING)){
        modifier += 2;
      }else if(creature.getHasFeat(CombatFeatType.DUELING)){
        modifier += 1;
      }
    }

    // Special-attack feat to-hit penalty
    if(combatAction.feat){
      modifier -= combatAction.feat.getAttackPenalty() || 0;
    }

    // Melee vs target holding a ranged weapon (+10)
    if(
      weapon && !weapon.isRangedWeapon() &&
      isCreature(combatAction.target)
    ){
      const target = combatAction.target as ModuleCreature;
      const targetWeapon = target.equipment?.RIGHTHAND;
      if(targetWeapon?.isRangedWeapon()){
        modifier += 10;
      }
    }

    // EffectAttackIncrease / EffectAttackDecrease
    modifier += getAttackEffectBonus(creature);

    return modifier;
  }

  /**
   * Minimum natural d20 that threatens a critical.
   * Threat width = base (+Keen) + Critical Strike / Sniper extras.
   * TSL: Soresu raises the threshold; Ataru lowers it while a saber is equipped.
   */
  getCriticalThreatRoll(
    weapon: ModuleItem | undefined = undefined,
    feat?: TalentFeat,
    attacker?: ModuleCreature
  ): number {
    const baseThreat = weapon?.baseItem?.criticalThreat || 1;
    let width = weapon ? baseThreat : 0;
    if(weapon?.hasKeen()){
      width += baseThreat;
    }

    const featId = feat?.id;
    if(
      featId == CombatFeatType.CRITICAL_STRIKE ||
      featId == CombatFeatType.SNIPER_SHOT
    ){
      width += baseThreat;
    }else if(
      featId == CombatFeatType.IMPROVED_CRITICAL_STRIKE ||
      featId == CombatFeatType.IMPROVED_SNIPER_SHOT
    ){
      width += baseThreat * 2;
    }else if(
      featId == CombatFeatType.MASTER_CRITICAL_STRIKE ||
      featId == CombatFeatType.MASTER_SNIPER_SHOT
    ){
      width += baseThreat * 3;
    }

    let threshold = 21 - width;

    if(
      GameState.GameKey == GameEngineType.TSL &&
      attacker &&
      this.isLightsaberEquipped(attacker)
    ){
      const form = attacker.getCurrentForm();
      if(form == LightsaberForm.SORESU && threshold < 20){
        threshold += 1;
      }else if(form == LightsaberForm.ATARU && threshold > 1){
        threshold -= 1;
      }
    }

    return threshold;
  }

  /**
   * Whether a natural d20 threatens a critical.
   */
  isCriticalThreat(
    naturalRoll: number,
    weapon: ModuleItem | undefined = undefined,
    feat?: TalentFeat,
    attacker?: ModuleCreature
  ): boolean {
    if(naturalRoll >= 20) return true;
    if(!weapon) return false;
    return naturalRoll >= this.getCriticalThreatRoll(weapon, feat, attacker);
  }

  /**
   * Critical hit damage multiplier.
   * TSL: Power Attack family +1; Shien form +1 while lightsaber equipped.
   */
  getCriticalHitMultiplier(
    weapon: ModuleItem | undefined,
    feat?: TalentFeat,
    attacker?: ModuleCreature
  ): number {
    let mult = weapon?.baseItem?.criticalHitMultiplier || 2;

    if(GameState.GameKey == GameEngineType.TSL){
      const featId = feat?.id;
      if(
        featId == CombatFeatType.IMPROVED_POWER_ATTACK ||
        featId == CombatFeatType.IMPROVED_POWER_BLAST ||
        featId == CombatFeatType.POWER_ATTACK ||
        featId == CombatFeatType.POWER_BLAST ||
        featId == CombatFeatType.MASTER_POWER_ATTACK ||
        featId == CombatFeatType.MASTER_POWER_BLAST
      ){
        mult += 1;
      }
      if(
        attacker &&
        this.isLightsaberEquipped(attacker) &&
        attacker.getCurrentForm() == LightsaberForm.SHIEN
      ){
        mult += 1;
      }
    }

    return mult;
  }

  /** @deprecated Prefer isCriticalThreat(naturalRoll, weapon, feat). */
  isCritical(attackRoll: number, weapon: ModuleItem | undefined = undefined): boolean {
    return this.isCriticalThreat(attackRoll, weapon);
  }

  /**
   * Check if the creature is dual-wielding (CalculateOffHandAttacks dual path).
   */
  isDualWielding(creature: ModuleCreature): boolean {
    const rightHand = creature.equipment.RIGHTHAND;
    const leftHand = creature.equipment.LEFTHAND;
    if(!rightHand || !leftHand) return false;
    if(leftHand.getWeaponType() == WeaponType.INVALID) return false;
    if(leftHand.getWeaponWield() == WeaponWield.INVALID) return false;
    if(rightHand.getWeaponWield() == WeaponWield.STUN_BATON) return false;
    const creatureSize = this.getCreatureSize(creature);
    const mhSize = (rightHand.getBaseItem()?.weaponSize as number) || 0;
    return mhSize <= creatureSize;
  }

  /**
   * Two-weapon fighting to-hit modifier.
   * TSL Superior Two-Weapon Fighting I/II/III replace Master penalties when present.
   */
  calculateTwoWeaponModifier(creature: ModuleCreature, slot: ModuleCreatureArmorSlot.RIGHTHAND|ModuleCreatureArmorSlot.LEFTHAND): number {
    if(!creature || creature.isSimpleCreature()) return 0;
    if(!this.isDualWielding(creature)) return 0;

    const leftHand = creature.equipment.LEFTHAND;
    const creatureSize = this.getCreatureSize(creature);
    const offhandRelativeSize = leftHand
      ? (leftHand.getBaseItem().weaponSize as number) - creatureSize
      : 0;
    const lightOffhand = offhandRelativeSize == -1;

    // TSL Superior Two-Weapon Fighting (requires Master as prereq in rules)
    if(creature.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_2_WEAPON_III)){
      if(slot == ModuleCreatureArmorSlot.RIGHTHAND) return lightOffhand ? 2 : 0;
      if(slot == ModuleCreatureArmorSlot.LEFTHAND) return -1;
    }else if(creature.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_2_WEAPON_II)){
      if(slot == ModuleCreatureArmorSlot.RIGHTHAND) return lightOffhand ? 2 : 0;
      if(slot == ModuleCreatureArmorSlot.LEFTHAND) return -2;
    }else if(creature.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_2_WEAPON_I)){
      if(slot == ModuleCreatureArmorSlot.RIGHTHAND) return lightOffhand ? 1 : -1;
      if(slot == ModuleCreatureArmorSlot.LEFTHAND) return -2;
    }

    if(slot == ModuleCreatureArmorSlot.RIGHTHAND){
      let modifier = lightOffhand ? -4 : -6;
      if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_MASTERY)){
        modifier += 4;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_ADVANCED)){
        modifier += 2;
      }
      return modifier;
    }

    if(slot == ModuleCreatureArmorSlot.LEFTHAND){
      let modifier = -10;
      if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_MASTERY)){
        modifier += 8;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_ADVANCED)){
        modifier += 6;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_FIGHTING)){
        modifier += 4;
      }
      return modifier;
    }

    return 0;
  }

  /**
   * @deprecated Use calculateTwoWeaponModifier
   */
  calculateTwoWeaponPenalty(creature: ModuleCreature, slot: ModuleCreatureArmorSlot.RIGHTHAND|ModuleCreatureArmorSlot.LEFTHAND){
    return Math.max(0, -this.calculateTwoWeaponModifier(creature, slot));
  }

  isLightsaberEquipped(creature: ModuleCreature): boolean {
    const right = creature.equipment?.RIGHTHAND;
    const left = creature.equipment?.LEFTHAND;
    return !!(right?.isLightsaber() || left?.isLightsaber());
  }

  /**
   * Whether two creatures are oriented toward each other (facing-dot ≤ 0).
   */
  areFacingEachOther(attacker: ModuleCreature, target: ModuleCreature): boolean {
    const aFace = attacker.getFacingVector?.() || new THREE.Vector3(0, 1, 0);
    const tFace = target.getFacingVector?.() || new THREE.Vector3(0, 1, 0);
    return aFace.dot(tFace) <= 0;
  }

  /**
   * Whether a ranged attack can be parried/deflected.
   * Requires Jedi Defense + lightsaber (or TSL Force Deflection/Redirection),
   * and the defender facing the attacker. outCanDeflect distinguishes return-fire
   * deflects from parry-only results.
   */
  isProjectileParryable(
    attacker: ModuleCreature,
    target: ModuleCreature,
    rangedAttack: boolean,
    outCanDeflect?: { value: boolean }
  ): boolean {
    if(!rangedAttack || !target) return false;
    if(target.isDead?.()) return false;
    if(outCanDeflect) outCanDeflect.value = true;

    const hasJediDefense =
      target.getHasFeat(CombatFeatType.JEDI_DEFENSE) ||
      target.getHasFeat(CombatFeatType.ADVANCED_JEDI_DEFENSE) ||
      target.getHasFeat(CombatFeatType.MASTER_JEDI_DEFENSE);

    if(
      hasJediDefense &&
      this.isLightsaberEquipped(target) &&
      this.areFacingEachOther(attacker, target)
    ){
      return true;
    }

    // TSL: Force Deflection / Redirection known spell path
    if(GameState.GameKey == GameEngineType.TSL){
      const hasDeflection = target.getHasSpell(SPELL_FORCE_DEFLECTION);
      const hasRedirection = target.getHasSpell(SPELL_FORCE_REDIRECTION);
      if(
        (hasDeflection || hasRedirection) &&
        this.areFacingEachOther(attacker, target)
      ){
        // Force Deflection alone can parry but not return fire (deflect)
        if(outCanDeflect && hasDeflection && !hasRedirection){
          outCanDeflect.value = false;
        }
        return true;
      }
    }

    return false;
  }

  /**
   * TSL lightsaber form deflection modifiers for the defender.
   */
  getLightsaberFormDeflectionBonus(creature: ModuleCreature): number {
    if(!this.isLightsaberEquipped(creature)) return 0;
    switch(creature.getCurrentForm()){
      case LightsaberForm.MAKASHI: return -5;
      case LightsaberForm.SORESU: return 4;
      case LightsaberForm.ATARU: return -4;
      case LightsaberForm.SHIEN: return 2;
      case LightsaberForm.NIMAN: return 1;
      default: return 0;
    }
  }

  /**
   * TSL Precise Shot I–V on the attacker reduce the defender's opposed roll.
   */
  getPreciseShotDeflectionPenalty(attacker: ModuleCreature): number {
    if(attacker.getHasFeat(CombatFeatType.PRECISE_SHOT_V)) return 10;
    if(attacker.getHasFeat(CombatFeatType.PRECISE_SHOT_IV)) return 8;
    if(attacker.getHasFeat(CombatFeatType.PRECISE_SHOT_III)) return 6;
    if(attacker.getHasFeat(CombatFeatType.PRECISE_SHOT_II)) return 4;
    if(attacker.getHasFeat(CombatFeatType.PRECISE_SHOT_I)) return 2;
    return 0;
  }

  /**
   * TSL DEFLECT feat (Weapon Master): +(classLevel+1)/2 while lightsaber equipped.
   */
  getWeaponMasterDeflectBonus(creature: ModuleCreature): number {
    if(!creature.getHasFeat(CombatFeatType.DEFLECT)) return 0;
    if(!this.isLightsaberEquipped(creature)) return 0;
    const level = creature.getClassLevel(CLASS_JEDI_WEAPONMASTER);
    if(level <= 0) return 0;
    return Math.floor((level + 1) / 2);
  }

  getBlasterDeflectionBonus(creature: ModuleCreature): number {
    let bonus = 0;
    for(let i = 0; i < creature.effects.length; i++){
      const effect = creature.effects[i];
      if(
        effect.type == GameEffectType.EffectBlasterDeflectionIncrease ||
        effect.type == GameEffectType.EffectBlasterDeflectionDecrease
      ){
        const amount = effect.getInt(1) || effect.getInt(0) || 0;
        if(effect.type == GameEffectType.EffectBlasterDeflectionIncrease){
          bonus += amount;
        }else{
          bonus -= amount;
        }
      }
    }
    return bonus;
  }

  /**
   * Opposed deflect/parry check vs ranged attacks.
   * Returns true if the attack was stopped (result written to attack/combatAction).
   */
  resolveDefensiveEffects(
    attacker: ModuleCreature,
    target: ModuleCreature,
    attack: CombatAttackData,
    combatAction: CombatRoundAction,
    attackTotal: number,
    wouldHit: boolean
  ): boolean {
    if(!isCreature(target)) return false;

    const canDeflect = { value: true };
    if(!this.isProjectileParryable(attacker, target, attack.rangedAttack, canDeflect)){
      return false;
    }

    // Assured Deflection skips the opposed roll
    if(target.hasEffect(GameEffectType.EffectAssuredDeflection)){
      const assured = target.getEffect(GameEffectType.EffectAssuredDeflection);
      const returnDamage = assured?.getInt(0) ? true : false;
      combatAction.attackResult = returnDamage ? AttackResult.DEFLECTED : AttackResult.PARRIED;
      attack.attackResult = combatAction.attackResult;
      attack.attackDeflected = combatAction.attackResult;
      return true;
    }

    // Opposed roll: d20 + BAB + DEX + Jedi Defense (+3/+6) + deflection effects
    let defenderRoll = this.rollD20();
    defenderRoll += target.getBaseAttackBonus();
    defenderRoll += CombatRound.GetMod(target.getDEX());
    defenderRoll += this.getBlasterDeflectionBonus(target);

    if(target.getHasFeat(CombatFeatType.MASTER_JEDI_DEFENSE)){
      defenderRoll += 6;
    }else if(target.getHasFeat(CombatFeatType.ADVANCED_JEDI_DEFENSE)){
      defenderRoll += 3;
    }

    if(GameState.GameKey == GameEngineType.TSL){
      if(target.getHasSpell(SPELL_FORCE_REDIRECTION)){
        defenderRoll += 3;
      }
      defenderRoll += this.getWeaponMasterDeflectBonus(target);
      defenderRoll += this.getLightsaberFormDeflectionBonus(target);
      defenderRoll -= this.getPreciseShotDeflectionPenalty(attacker);
    }

    if(defenderRoll < attackTotal){
      return false;
    }

    // Beat the attack by 6+ to deflect (return fire); otherwise parry.
    // TSL Force Deflection alone cannot return fire.
    if(canDeflect.value && defenderRoll >= attackTotal + 6 && wouldHit){
      combatAction.attackResult = AttackResult.DEFLECTED;
    }else{
      combatAction.attackResult = AttackResult.PARRIED;
    }
    attack.attackResult = combatAction.attackResult;
    attack.attackDeflected = combatAction.attackResult;
    return true;
  }

  /**
   * GetEffectImmunity.
   * Combat uses 30 (sneak) and 31 (critical hits).
   * @param versus - optional attacker for race / alignment filters on the effect
   */
  hasEffectImmunity(
    creature: ModuleCreature,
    immunityType: number,
    versus?: ModuleCreature
  ): boolean {
    if(!creature || immunityType <= 0 || immunityType >= 0x21) return false;
    const raceCount = GameState.SWRuleSet?.racialTypeCount ?? 0;
    let versusRace = raceCount;
    let versusAlign = 0xffffffff;
    if(versus){
      versusRace = versus.getRace?.() ?? versus.race ?? raceCount;
      const ge = versus.getGoodEvil?.() ?? 50;
      // : <41 evil(3), >59 good(2), else neutral(1)
      versusAlign = ge < 41 ? 3 : (ge > 59 ? 2 : 1);
    }
    for(let i = 0; i < creature.effects.length; i++){
      const effect = creature.effects[i];
      if(effect.type != GameEffectType.EffectImmunity) continue;
      const type = effect.getInt(0);
      const race = effect.getInt(1);
      const align = effect.getInt(2);
      if(type != 0 && type != immunityType) continue;
      if(race != raceCount && race != versusRace) continue;
      if(align != 0 && align != versusAlign) continue;
      return true;
    }
    return false;
  }

  /**
   * Resolve sneak-attack eligibility (flank / rear / ranged proximity).
   */
  resolveSneakAttack(attacker: ModuleCreature, target: ModuleCreature, attack: CombatAttackData): boolean {
    if(!target || !isCreature(target)) return false;

    let dice = 0;
    for(let i = CombatFeatType.SNEAK_ATTACK_10D6; i >= CombatFeatType.SNEAK_ATTACK_1D6; i--){
      if(attacker.getHasFeat(i)){
        dice = i - CombatFeatType.SNEAK_ATTACK_1D6 + 1;
        break;
      }
    }
    if(dice <= 0) return false;

    // Sneak / critical immunities block sneak application (vs attacker race/align)
    if(
      this.hasEffectImmunity(target, 30, attacker) ||
      this.hasEffectImmunity(target, 31, attacker)
    ){
      return false;
    }

    // Ranged sneak max distance
    if(attack.rangedAttack){
      const dist = attacker.position.distanceTo(target.position);
      if(dist > 10) return false;
    }

    // Front cone: if target faces the attacker (dot >= ~0.707), no sneak
    const toAttacker = attacker.position.clone().sub(target.position);
    if(toAttacker.lengthSq() > 0){
      toAttacker.normalize();
      const targetFacing = target.getFacingVector?.() || new THREE.Vector3(0, 1, 0);
      if(toAttacker.dot(targetFacing) >= 0.707){
        return false;
      }
    }

    attack.sneakAttack = true;
    return true;
  }

  getMissChancePercent(creature: ModuleCreature): number {
    let percent = 0;
    for(let i = 0; i < creature.effects.length; i++){
      const effect = creature.effects[i];
      if(effect.type == GameEffectType.EffectMissChance){
        percent = Math.max(percent, effect.getInt(0) || 0);
      }
    }
    return Math.min(100, Math.max(0, percent));
  }

  getConcealmentPercent(creature: ModuleCreature): number {
    let percent = 0;
    for(let i = 0; i < creature.effects.length; i++){
      const effect = creature.effects[i];
      if(effect.type == GameEffectType.EffectConcealment){
        percent = Math.max(percent, effect.getInt(0) || 0);
      }
    }
    return Math.min(100, Math.max(0, percent));
  }

  /**
   * Resolve a weapon attack roll and its damage.
   * @param swingIndex - ResolveMeleeAttack loop index (for impact timing / OH gate)
   */
  calculateWeaponAttack(
    creature: ModuleCreature,
    weapon: ModuleItem | undefined = undefined,
    weaponSlot: ModuleCreatureArmorSlot,
    combatAction: CombatRoundAction
  ) {
    if(this.currentAttack >= this.attackList.length){
      return;
    }
    const swingIndex = this.currentAttack;
    const attack = this.attackList[this.currentAttack];
    let isCritical = false;

    attack.reactObject = combatAction.target;
    attack.attackWeapon = weapon;
    attack.attackGroup = this.attackGroup;
    attack.rangedAttack = !!(weapon?.isRangedWeapon());
    attack.sneakAttack = false;
    attack.coupDeGrace = false;
    attack.weaponAttackType = weaponSlot == ModuleCreatureArmorSlot.LEFTHAND ? 2 : 1;

    // ResolveAttackRoll / ResolveDamage when resultsCalculated:
    // stamp designer result + SetBaseDamage/SetDamage(scripted); skip dice and on-hit.
    if(combatAction.resultsCalculated){
      attack.attackResult = combatAction.attackResult;
      if(
        attack.attackResult == AttackResult.HIT_SUCCESSFUL ||
        attack.attackResult == AttackResult.CRITICAL_HIT ||
        attack.attackResult == AttackResult.AUTOMATIC_HIT
      ){
        attack.setScriptedCutsceneDamage(combatAction.attackDamage, weapon);
      }
      this.logAttackResult(
        creature,
        weapon,
        combatAction,
        attack.attackResult == AttackResult.CRITICAL_HIT,
        false
      );
      this.currentAttack++;
      return;
    }

    const naturalRoll = this.rollD20();
    const attackMod = this.getAttackModifierVersus(creature, weapon, weaponSlot, combatAction);
    const attackTotal = naturalRoll + attackMod;
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);

    const targetCreature = isCreature(combatAction.target)
      ? combatAction.target as ModuleCreature
      : undefined;
    // ResolveAttackRoll — AC only via GetArmorClassVersus on creatures; else 0
    const targetAC = targetCreature
      ? targetCreature.getArmorClassVersus(creature, false)
      : 0;

    attack.toHitTotal = attackTotal;
    attack.targetDefense = targetAC;

    if(targetCreature){
      this.resolveSneakAttack(creature, targetCreature, attack);
      if(this.shouldCoupDeGrace(targetCreature)){
        attack.coupDeGrace = true;
      }
    }

    // Coup de grace → Automatic Hit (ResolveAttackRoll)
    if(attack.coupDeGrace){
      combatAction.attackResult = AttackResult.AUTOMATIC_HIT;
      attack.attackResult = AttackResult.AUTOMATIC_HIT;
      attack.calculateDamage(creature, false, combatAction.feat);
      this.logAttackResult(creature, weapon, combatAction, false, false);
      this.queueFeatSpecialAttackOnHit(creature, combatAction, attack, swingIndex);
      this.currentAttack++;
      return;
    }

    // Attacker MissChance (Blindness child MissChance 50%)
    if(!hasAssuredHit){
      const missChance = this.getMissChancePercent(creature);
      if(missChance > 0){
        const roll = Math.floor(Math.random() * 100) + 1;
        if(roll <= missChance){
          combatAction.attackResult = AttackResult.MISS;
          attack.attackResult = AttackResult.MISS;
          attack.concealment = true;
          this.logAttackResult(creature, weapon, combatAction, false, hasAssuredHit);
          this.currentAttack++;
          return;
        }
      }
    }

    // Target Concealment
    if(targetCreature && !hasAssuredHit){
      const conceal = this.getConcealmentPercent(targetCreature);
      if(conceal > 0){
        const roll = Math.floor(Math.random() * 100) + 1;
        if(roll <= conceal){
          combatAction.attackResult = AttackResult.MISS;
          attack.attackResult = AttackResult.MISS;
          attack.concealment = true;
          this.logAttackResult(creature, weapon, combatAction, false, hasAssuredHit);
          this.currentAttack++;
          return;
        }
      }
    }

    if(hasAssuredHit){
      combatAction.attackResult = AttackResult.AUTOMATIC_HIT;
      attack.attackResult = AttackResult.AUTOMATIC_HIT;
      attack.calculateDamage(creature, false, combatAction.feat);
    }else if(naturalRoll == 1){
      combatAction.attackResult = AttackResult.MISS;
      attack.attackResult = AttackResult.MISS;
    }else{
      const threatens = this.isCriticalThreat(naturalRoll, weapon, combatAction.feat, creature);
      const wouldHit = naturalRoll == 20 || attackTotal >= targetAC;

      if(
        targetCreature &&
        this.resolveDefensiveEffects(creature, targetCreature, attack, combatAction, attackTotal, wouldHit)
      ){
        // Deflected / parried — no damage
      }else if(!wouldHit){
        combatAction.attackResult = AttackResult.MISS;
        attack.attackResult = AttackResult.MISS;
      }else if(threatens){
        let confirmRoll = this.rollD20();
        // TSL Juyo: +4 on critical confirmation while lightsaber equipped
        if(
          GameState.GameKey == GameEngineType.TSL &&
          this.isLightsaberEquipped(creature) &&
          creature.getCurrentForm() == LightsaberForm.JUYO
        ){
          confirmRoll += 4;
        }
        const confirmed = (confirmRoll + attackMod) >= targetAC;
        // Crit immunity converts a confirmed crit into a normal hit
        isCritical = confirmed && !(
          targetCreature && this.hasEffectImmunity(targetCreature, 31, creature)
        );
        combatAction.attackResult = isCritical ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
        attack.attackResult = combatAction.attackResult;
        attack.calculateDamage(creature, isCritical, combatAction.feat);
      }else{
        combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
        attack.attackResult = AttackResult.HIT_SUCCESSFUL;
        attack.calculateDamage(creature, false, combatAction.feat);
      }
    }

    this.logAttackResult(creature, weapon, combatAction, isCritical, hasAssuredHit);
    this.queueFeatSpecialAttackOnHit(creature, combatAction, attack, swingIndex);
    this.currentAttack++;
  }

  /**
   * ResolveMeleeSpecialAttack / ResolveRangedSpecialAttack
   * on first swing only: queue Crit Strike / Sniper SETSTATE stun when the attack hits.
   * (AC penalties are applied earlier via TalentFeat.impactCaster.)
   */
  queueFeatSpecialAttackOnHit(
    creature: ModuleCreature,
    combatAction: CombatRoundAction,
    attack: CombatAttackData,
    swingIndex: number
  ){
    if(swingIndex !== 0 || !combatAction?.feat || !attack) return;
    const result = attack.attackResult;
    if(
      result !== AttackResult.HIT_SUCCESSFUL &&
      result !== AttackResult.CRITICAL_HIT &&
      result !== AttackResult.AUTOMATIC_HIT
    ){
      return;
    }
    const onHit = combatAction.feat.impactTarget?.(creature, combatAction.target);
    if(onHit){
      attack.pendingOnHitEffects.push(onHit);
    }
  }

  /**
   * Calculate the round animations for the given creature and combat action.
   * ResolveMeleeAnimations / ResolveRangedAnimations
   * engaged duels sync target reaction when CheckActionLengthAtTime.
   * Ranged dodge requires the *target* round engaged (not merely the shooter),
   * so a melee PC closing distance does not dodge-slide mid-sprint.
   */
  calculateRoundAnimations(creature: ModuleCreature, combatAction: CombatRoundAction){
    if(!combatAction) return;

    let attackKey = creature.getCombatAnimationAttackType();
    let weaponWield = creature.getCombatAnimationWeaponType();
    let attackType = 1;

    // Engaged melee choreography uses c*aN attack set (duel anims).
    // Do NOT gate on predicted killingBlow — only checks actual death
    // (GetDeadTemp) later in ResolveMeleeAnimations, so hits/crits still duel.
    if(attackKey == 'm' && this.engaged){
      attackKey = 'c';
      attackType = Math.round(Math.random()*4)+1;
    }

    // Prefer anim name already chosen by resolveRangedAttack (feat-aware + discharge
    // row), or GetClientMeleeAnimation via calculateAttackAnimation for cutscene
    // rows / live melee feats (Power Attack → f*a3, Flurry → f*a2, Crit → f*a1).
    // Basic engaged choreography (c*aN) stays below when no feat stamped a name.
    if(
      combatAction.resultsCalculated ||
      (combatAction.feat && !combatAction.animationName)
    ){
      combatAction.calculateAttackAnimation();
    }
    if(combatAction.animationName){
      this.action.animationName = combatAction.animationName;
    }else{
      this.action.animationName = attackKey+weaponWield+'a'+attackType;
    }
    this.action.swAnimation = OdysseyModelAnimation.GetAnimation2DA(this.action.animationName);
    if(combatAction.resultsCalculated && combatAction.swAnimation){
      this.action.swAnimation = combatAction.swAnimation;
    }

    const animLength = Math.max(
      1,
      combatAction.animationTime || 1500
    );

    // Stamp AttackList[0] reaction metadata (GetAttack(current))
    const primary = this.attackList[0];
    if(primary){
      primary.animationLength = animLength;
    }
    this.decrementRoundLength(animLength);

    const isRanged = !!(
      primary?.rangedAttack ||
      creature.equipment?.RIGHTHAND?.isRangedWeapon?.()
    );

    const attackAnim = this.engaged && combatAction.animation === ModuleCreatureAnimState.ATTACK_DUELING
      ? ModuleCreatureAnimState.ATTACK_DUELING
      : ModuleCreatureAnimState.ATTACK;

    if(creature){
      duelLog(creature, 'anim:attack', {
        name: this.action.animationName,
        hasClip: !!(combatAction.swAnimation || this.action.swAnimation),
        length: animLength,
        result: AttackResult[combatAction.attackResult] ?? combatAction.attackResult,
        engaged: this.engaged,
        ranged: isRanged,
        dueling: attackAnim === ModuleCreatureAnimState.ATTACK_DUELING,
        cutscene: !!combatAction.resultsCalculated,
      });
      creature.playTwoDAAnimation( combatAction.swAnimation || this.action.swAnimation );
      creature.animationState.index = attackAnim;
    }

    const target = isCreature(combatAction.target)
      ? combatAction.target as ModuleCreature
      : undefined;

    // ResolveMelee/RangedAnimations gates only on the target being actually
    // dead (GetDeadTemp), never on predicted killingBlow — hits must react.
    if(target && !target.isDead?.()){
      let reaction: number;
      let shouldReact: boolean;
      const checkActionLengthOk = !!target.combatRound?.checkActionLengthAtTime(
        creature,
        animLength,
        0
      );

      if(isRanged){
        // ResolveRangedAnimations 
        const rolled: AttackResult[] = [];
        for(let i = 0; i < this.currentAttack; i++){
          const r = this.attackList[i]?.attackResult;
          if(typeof r === 'number') rolled.push(r);
        }
        if(!rolled.length && typeof combatAction.attackResult === 'number'){
          rolled.push(combatAction.attackResult);
        }
        reaction = CombatRound.pickRangedReaction({
          anyHit: CombatRound.rangedAttackHadLandingHit(rolled),
          targetLightsaberEquipped: this.isLightsaberEquipped(target),
          targetCastingBusy: CombatRound.isRangedDodgeBlockedAnimation(
            target.animationState?.index ?? 0
          ),
          targetEngaged: !!target.combatRound?.engaged,
        });
        shouldReact = CombatRound.canSyncRangedReaction({
          attackerEngaged: this.engaged,
          hasTargetCombatRound: !!target.combatRound,
          checkActionLengthOk,
        });
      }else{
        reaction = CombatRound.pickMeleeReaction(combatAction.attackResult);
        // ResolveMeleeAnimations:
        // engaged && (CheckActionLengthAtTime || resultsCalculated).
        shouldReact = CombatRound.canSyncMeleeReaction({
          engaged: this.engaged,
          resultsCalculated: !!combatAction.resultsCalculated,
          hasTargetCombatRound: !!target.combatRound,
          checkActionLengthOk,
        });
      }

      // stamps reaction metadata; do not wipe ranged travel delay
      // (ResolveRangedHit/Miss reaxn_delay) used for bolt flight.
      if(primary){
        primary.reaxnAnimation = reaction;
        primary.reaxnAnimLength = animLength;
        if(!primary.rangedAttack){
          primary.reaxnDelay = 0;
        }
      }

      if(shouldReact && reaction !== ModuleCreatureAnimState.READY){
        // Prefer combatanimations-mapped clip; if missing, SetAnimation(reaction)
        // so hits never leave a stale ATTACK clip (playTwoDAAnimation no-ops on undefined).
        let mapped: ReturnType<ModuleCreature['getDamageAnimation']> | undefined;
        if(reaction === ModuleCreatureAnimState.DAMAGE){
          mapped = target.getDamageAnimation( this.action.animationName );
        }else if(reaction === ModuleCreatureAnimState.PARRY){
          mapped = target.getParryAnimation( this.action.animationName );
        }else if(reaction === ModuleCreatureAnimState.DODGE){
          mapped = target.getDodgeAnimation( this.action.animationName );
        }
        duelLog(creature, 'anim:reaction', {
          target: duelWho(target),
          reaction: ModuleCreatureAnimState[reaction] ?? reaction,
          playback: mapped ? `mapped:${(mapped as any)?.name ?? '?'}` : 'setAnimationState',
          attackAnim: this.action.animationName,
          ranged: isRanged,
        });
        if(CombatRound.resolveMeleeReactionPlayback(mapped).mode === 'mapped'){
          target.playTwoDAAnimation(mapped);
          target.animationState.index = reaction;
        }else{
          target.setAnimationState(reaction);
        }
        // always decrements defender round length when reaction plays
        if(target.combatRound){
          target.combatRound.decrementRoundLength(animLength);
        }
      }else if(primary){
        duelLog(creature, 'anim:reaction-skip', {
          target: duelWho(target),
          reaction: ModuleCreatureAnimState[reaction] ?? reaction,
          shouldReact,
          engaged: this.engaged,
          targetEngaged: !!target.combatRound?.engaged,
          ranged: isRanged,
          cutscene: !!combatAction.resultsCalculated,
          checkActionLengthOk,
        });
        // else path: reaxn_animation = READY (0x2711)
        primary.reaxnAnimation = ModuleCreatureAnimState.READY;
      }
    }else{
      duelLog(creature, 'anim:reaction-blocked', {
        hasTarget: !!target,
        dead: !!target?.isDead?.(),
        killingBlow: this.attacksIncludeKillingBlow(),
      });
    }

  }

  /**
   * Check if the attacks include a killing blow
   * @returns True if the attacks include a killing blow, false otherwise
   */
  attacksIncludeKillingBlow(){
    for(let i = 0; i < 5; i++){
      if(this.attackList[i].killingBlow) return true;
    }
    return false;
  }

  /**
   * Convert the combat round to a GFF struct
   * SaveCombatRound (struct type 0xCADA)
   * @param structIdx - The index of the struct
   * @returns The GFF struct
   */
  toStruct(structIdx: number = 0xCADA){
    const struct = new GFFStruct(structIdx);
    const objId = (o: ModuleObject | undefined) =>
      o?.id ?? ModuleObjectConstant.OBJECT_INVALID;

    struct.addField(new GFFField(GFFDataType.BYTE, 'RoundStarted')).setValue(this.roundStarted ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'SpellCastRound')).setValue(this.spellCastRound ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'DeflectArrow')).setValue(this.deflectArrow ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'WeaponSucks')).setValue(this.weaponSucks ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'DodgeTarget')).setValue(objId(this.dodgeTarget));
    struct.addField(new GFFField(GFFDataType.DWORD, 'NewAttackTarget')).setValue(objId(this.newAttackTarget));
    struct.addField(new GFFField(GFFDataType.INT, 'Engaged')).setValue(this.engaged ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.INT, 'Master')).setValue(this.master ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'MasterID')).setValue(objId(this.masterID));
    // DuelPartner is not written by K1 SaveCombatRound 
    if(GameState.GameKey == GameEngineType.TSL){
      struct.addField(new GFFField(GFFDataType.DWORD, 'DuelPartner')).setValue(objId(this.duelPartner));
    }
    struct.addField(new GFFField(GFFDataType.BYTE, 'RoundPaused')).setValue(this.roundPaused ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'RoundPausedBy')).setValue(objId(this.roundPausedBy));
    struct.addField(new GFFField(GFFDataType.BYTE, 'InfinitePause')).setValue(this.infinitePause ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.INT, 'PauseTimer')).setValue(this.pauseTimer || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'Timer')).setValue(this.timer || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'RoundLength')).setValue(this.roundLength || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'OverlapAmount')).setValue(this.overlapAmount || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'BleedTimer')).setValue(this.bleedTimer || 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'CurrentAttack')).setValue(this.currentAttack || 0);
    struct.addField(new GFFField(GFFDataType.WORD, 'AttackID')).setValue(this.attackID || 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'AttackGroup')).setValue(this.attackGroup || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'ParryIndex')).setValue(this.parryIndex || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'NumAOOs')).setValue(this.numAOOs || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'NumCleaves')).setValue(this.numCleaves || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'OnHandAttacks')).setValue(this.onHandAttacks || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'OffHandAttacks')).setValue(this.offHandAttacks || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'AdditAttacks')).setValue(this.additionalAttacks || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'EffectAttacks')).setValue(this.effectAttacks || 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'ParryActions')).setValue(this.parryActions || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'OffHandTaken')).setValue(this.offHandTaken ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.INT, 'ExtraTaken')).setValue(this.extraTaken ? 1 : 0);

    const attackList = struct.addField(new GFFField(GFFDataType.LIST, 'AttackList'));
    for(let i = 0; i < 5; i++){
      attackList.addChildStruct(this.attackList[i].toStruct(0xAAEE));
    }

    const specAttackList = struct.addField(new GFFField(GFFDataType.LIST, 'SpecAttackList'));
    for(let i = 0; i < this.specialAttackList.length; i++){
      const spec = new GFFStruct(0xDAEE);
      const val = typeof this.specialAttackList[i] === 'number'
        ? this.specialAttackList[i]
        : 0;
      spec.addField(new GFFField(GFFDataType.WORD, 'SpecialAttack')).setValue(val);
      specAttackList.addChildStruct(spec);
    }

    // SpecAttackIdList — special_attack_id_list at SaveCombatRound
    const specAttackIdList = struct.addField(new GFFField(GFFDataType.LIST, 'SpecAttackIdList'));
    for(let i = 0; i < this.specialAttackIdList.length; i++){
      const spec = new GFFStruct(0xDAAE);
      spec.addField(new GFFField(GFFDataType.WORD, 'SpecialAttackId')).setValue(
        this.specialAttackIdList[i] | 0
      );
      specAttackIdList.addChildStruct(spec);
    }

    const schedList = struct.addField(new GFFField(GFFDataType.LIST, 'SchedActionList'));
    // actions linked-list includes the in-flight head; JS keeps that on `action`
    // after ActionCombat.shift — prepend so mid-combat saves do not drop it.
    if(this.action){
      schedList.addChildStruct(this.action.toStruct(0xDAEA));
    }
    for(let i = 0; i < this.scheduledActionList.length; i++){
      schedList.addChildStruct(this.scheduledActionList[i].toStruct(0xDAEA));
    }

    return struct;
  }

  /**
   * LoadCombatRound
   * only restores when RoundStarted is non-zero.
   */
  fromStruct(struct: GFFStruct): boolean {
    if(!struct || !struct.hasField('RoundStarted')){
      return false;
    }
    const get = (label: string, fallback: number = 0) =>
      struct.hasField(label) ? struct.getFieldByLabel(label).getValue() : fallback;

    this.roundStarted = !!get('RoundStarted');
    if(!this.roundStarted){
      return false;
    }

    this.spellCastRound = !!get('SpellCastRound');
    this.deflectArrow = !!get('DeflectArrow', 1);
    this.weaponSucks = !!get('WeaponSucks');
    this.dodgeTargetObjectId = normalizeCombatObjectId(
      get('DodgeTarget', ModuleObjectConstant.OBJECT_INVALID)
    );
    this.newAttackTargetObjectId = normalizeCombatObjectId(
      get('NewAttackTarget', ModuleObjectConstant.OBJECT_INVALID)
    );
    this.dodgeTarget = lookupCombatObjectById(this.dodgeTargetObjectId);
    this.newAttackTarget = lookupCombatObjectById(this.newAttackTargetObjectId);
    this.roundPaused = !!get('RoundPaused');
    this.roundPausedByObjectId = normalizeCombatObjectId(
      get('RoundPausedBy', ModuleObjectConstant.OBJECT_INVALID)
    );
    this.roundPausedBy = lookupCombatObjectById(this.roundPausedByObjectId);
    this.infinitePause = false; // clears after load
    this.pauseTimer = get('PauseTimer');
    this.engaged = !!get('Engaged');
    this.master = !!get('Master');
    this.masterIDObjectId = normalizeCombatObjectId(
      get('MasterID', ModuleObjectConstant.OBJECT_INVALID)
    );
    this.masterID = lookupCombatObjectById(this.masterIDObjectId);
    this.duelPartnerObjectId = normalizeCombatObjectId(
      get('DuelPartner', ModuleObjectConstant.OBJECT_INVALID)
    );
    this.duelPartner = lookupCombatObjectById(this.duelPartnerObjectId);
    this.timer = get('Timer');
    this.roundLength = get('RoundLength', CombatRound.ROUND_LENGTH);
    this.overlapAmount = get('OverlapAmount');
    this.bleedTimer = get('BleedTimer');
    this.currentAttack = get('CurrentAttack');
    this.attackID = get('AttackID');
    this.attackGroup = get('AttackGroup');
    this.parryIndex = get('ParryIndex');
    this.numAOOs = get('NumAOOs', 1);
    this.numCleaves = get('NumCleaves', 1);
    this.onHandAttacks = get('OnHandAttacks');
    this.offHandAttacks = get('OffHandAttacks');
    this.additionalAttacks = get('AdditAttacks');
    this.effectAttacks = 0; // zeroes EffectAttacks on load
    this.parryActions = get('ParryActions');
    this.offHandTaken = !!get('OffHandTaken');
    this.extraTaken = !!get('ExtraTaken');

    if(struct.hasField('AttackList')){
      const list = struct.getFieldByLabel('AttackList').getChildStructs();
      for(let i = 0; i < 5; i++){
        if(!this.attackList[i]) this.attackList[i] = new CombatAttackData();
        if(list[i]) this.attackList[i].fromStruct(list[i]);
      }
    }

    this.specialAttackList = [];
    if(struct.hasField('SpecAttackList')){
      const list = struct.getFieldByLabel('SpecAttackList').getChildStructs();
      for(let i = 0; i < list.length; i++){
        if(list[i]?.hasField('SpecialAttack')){
          this.specialAttackList.push(list[i].getFieldByLabel('SpecialAttack').getValue());
        }
      }
    }

    this.specialAttackIdList = [];
    if(struct.hasField('SpecAttackIdList')){
      const list = struct.getFieldByLabel('SpecAttackIdList').getChildStructs();
      for(let i = 0; i < list.length; i++){
        if(list[i]?.hasField('SpecialAttackId')){
          this.specialAttackIdList.push(list[i].getFieldByLabel('SpecialAttackId').getValue());
        }
      }
    }

    this.scheduledActionList = [];
    if(struct.hasField('SchedActionList')){
      const list = struct.getFieldByLabel('SchedActionList').getChildStructs();
      for(let i = 0; i < list.length; i++){
        const action = new CombatRoundActionClass(this.owner);
        action.fromStruct(list[i], this.owner);
        this.scheduledActionList.push(action);
      }
    }

    // AttackList has no damageApplyDelay — resume unapplied swings from CurrentAttack
    this.restorePendingDamageTimers();

    return true;
  }

  /**
   * Re-resolve CombatRound object refs after all creatures/party are registered.
   * Mirrors PerceptionList deferred resolve — fromStruct may run before partners exist.
   */
  resolveObjectReferences(){
    if(this.dodgeTargetObjectId && !this.dodgeTarget){
      this.dodgeTarget = lookupCombatObjectById(this.dodgeTargetObjectId);
    }
    if(this.newAttackTargetObjectId && !this.newAttackTarget){
      this.newAttackTarget = lookupCombatObjectById(this.newAttackTargetObjectId);
    }
    if(this.roundPausedByObjectId && !this.roundPausedBy){
      this.roundPausedBy = lookupCombatObjectById(this.roundPausedByObjectId);
    }
    if(this.masterIDObjectId && !this.masterID){
      this.masterID = lookupCombatObjectById(this.masterIDObjectId);
    }
    if(this.duelPartnerObjectId && !this.duelPartner){
      this.duelPartner = lookupCombatObjectById(this.duelPartnerObjectId);
    }

    for(let i = 0; i < this.attackList.length; i++){
      this.attackList[i]?.resolveObjectReferences?.();
    }
    if(this.action){
      this.action.resolveObjectReferences();
    }
    for(let i = 0; i < this.scheduledActionList.length; i++){
      this.scheduledActionList[i]?.resolveObjectReferences();
    }

    // K1 does not persist DuelPartner; reconstruct from MasterID / targets when engaged.
    if(this.engaged && !this.duelPartner){
      if(!this.master && this.masterID){
        this.duelPartner = this.masterID;
      }else if(this.master){
        this.duelPartner =
          this.dodgeTarget ||
          this.action?.target ||
          this.scheduledActionList[0]?.target;
      }
    }

    this.wireBidirectionalDuelLinks();
    this.rehydrateCombatTargets();
  }

  /**
   * After individual resolve: ensure master ↔ slave duelPartner / masterID agree
   * so end combat round can release the slave.
   */
  wireBidirectionalDuelLinks(){
    if(!this.engaged || !this.owner){
      return;
    }
    if(this.master && this.duelPartner?.combatRound){
      const slave = this.duelPartner.combatRound;
      if(!slave.duelPartner){
        slave.duelPartner = this.owner;
      }
      if(!slave.masterID){
        slave.masterID = this.owner;
      }
      slave.engaged = true;
      slave.master = false;
    }else if(!this.master && this.masterID?.combatRound){
      const masterRound = this.masterID.combatRound;
      if(masterRound.engaged && masterRound.master && !masterRound.duelPartner){
        masterRound.duelPartner = this.owner;
      }
    }
  }

  /**
   * After load resolve: if the round is started but every attack sched target is
   * missing, retarget from DodgeTarget/NewAttackTarget or end the round so
   * OnEndRound / QueueAttackActions can requeue.
   */
  recoverEmptyOrInvalidScheduleAfterLoad(){
    if(!this.roundStarted){
      return;
    }

    const attackTypes = [
      CombatActionType.ATTACK,
      CombatActionType.ATTACK_USE_FEAT,
    ];
    const sched = this.scheduledActionList;
    const attackActions = sched.filter(
      (a) => a && attackTypes.indexOf(a.actionType) >= 0
    );

    // Non-attack sched (spell/equip) still present — leave alone.
    if(sched.length && !attackActions.length){
      return;
    }

    const hasValidAttackTarget = attackActions.some(
      (a) => !!(a.target?.id && a.target.id !== ModuleObjectConstant.OBJECT_INVALID)
    );
    if(hasValidAttackTarget){
      return;
    }

    // Empty schedule, or attack entries with no resolvable targets.
    const fallback =
      this.newAttackTarget ||
      this.dodgeTarget ||
      (this.owner as ModuleCreature)?.combatData?.lastAttackTarget ||
      this.duelPartner ||
      (!this.master ? this.masterID : undefined);

    if(fallback && fallback.id && fallback.id !== ModuleObjectConstant.OBJECT_INVALID){
      for(let i = sched.length - 1; i >= 0; i--){
        const a = sched[i];
        if(
          attackTypes.indexOf(a.actionType) >= 0 &&
          !(a.target?.id && a.target.id !== ModuleObjectConstant.OBJECT_INVALID)
        ){
          sched.splice(i, 1);
        }
      }
      if(!sched.length && isCreature(this.owner)){
        const creature = this.owner as ModuleCreature;
        creature.combatData.lastAttackTarget = fallback;
        creature.combatData.lastAttemptedAttackTarget = fallback;
        this.newAttackTarget = fallback;
        this.setAttackTarget(fallback);
        queueAttackActions(creature);
      }
      return;
    }

    this.endCombatRound();
  }

  /**
   * Seed CombatData attack targets from resolved CombatRound refs.
   * does not GFF-persist lastAttackTarget — reconstruct after load.
   */
  rehydrateCombatTargets(){
    if(!this.roundStarted || !this.owner){
      return;
    }
    const cd = (this.owner as ModuleCreature).combatData;
    if(!cd){
      return;
    }
    const target =
      this.newAttackTarget ||
      this.dodgeTarget ||
      this.action?.target ||
      this.scheduledActionList[0]?.target ||
      (!this.master ? this.masterID : undefined) ||
      this.duelPartner;
    if(!target){
      return;
    }
    if(!cd.lastAttackTarget){
      cd.lastAttackTarget = target;
    }
    if(!cd.lastAttemptedAttackTarget){
      cd.lastAttemptedAttackTarget = target;
    }
  }

  /**
   * After LoadCombatRound: attacks already past CurrentAttack are done; remaining
   * AttackList entries with rolled damage resume via ReaxnDelay (or immediate).
   */
  private restorePendingDamageTimers(){
    const current = this.currentAttack | 0;
    for(let i = 0; i < 5; i++){
      const attack = this.attackList[i];
      if(!attack) continue;
      if(i < current){
        attack.damageApplied = true;
        attack.damageApplyDelay = -1;
        continue;
      }
      let hasDamage = false;
      for(let d = 0; d < 15; d++){
        const v = attack.damageList[d]?.damageValue;
        if(typeof v === 'number' && v >= 0){
          hasDamage = true;
          break;
        }
      }
      if(hasDamage && !attack.damageApplied){
        attack.damageApplyDelay = Math.max(0, attack.reaxnDelay | 0);
      }
    }
  }

  /**
   * Log the attack result to the Messages feedback buffer.
   * matches engine behavior SendAttackSummaryFeedback → CC 0x12 TLK assembly.
   */
  /**
   * Log the attack result to the Messages feedback buffer.
   * matches engine behavior SendAttackSummaryFeedback → CC 0x12 TLK assembly.
   */
  logAttackResult(creature: ModuleCreature, _weapon: ModuleItem | undefined, combatAction: CombatRoundAction, isCritical: boolean, hasAssuredHit: boolean) {
    const { FeedbackMessageManager } = GameState;

    const attack = this.currentAttack < this.attackList.length
      ? this.attackList[this.currentAttack]
      : undefined;

    const critical =
      isCritical ||
      combatAction.attackResult === AttackResult.CRITICAL_HIT ||
      (!!attack && attack.attackResult === AttackResult.CRITICAL_HIT);

    const { message, color } = formatAttackSummaryFeedback({
      attacker: creature,
      defender: combatAction.target ?? attack?.reactObject,
      attackResult: combatAction.attackResult,
      toHitTotal: attack?.toHitTotal ?? 0,
      targetDefense: attack?.targetDefense ?? (combatAction.target?.getAC?.() ?? 0),
      damage: attack?.getTotalDamage?.() ?? combatAction.attackDamage ?? 0,
      feat: combatAction.feat,
      critical,
      sneakAttack: !!attack?.sneakAttack,
      coupDeGrace: !!attack?.coupDeGrace,
      automaticHit: hasAssuredHit && !attack?.coupDeGrace,
      automaticMiss: false,
    });

    FeedbackMessageManager.AddMessage(message, color);
  }

  /**
   * Calculate the ability modifier for the given value
   * @param val - The value to calculate the modifier for
   * @returns The ability modifier
   */
  static GetMod(val=0){
    return Math.floor( ( val - 10 ) / 2 );
  }

}
