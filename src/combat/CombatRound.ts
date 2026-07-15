import type { ModuleCreature, ModuleItem, ModuleObject } from "@/module";
import { GFFStruct } from "@/resource/GFFStruct";
import { Dice } from "@/utility/Dice";
import { OdysseyModelAnimation } from "@/odyssey";
import { CombatActionType } from "@/enums/combat/CombatActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { TextSprite3DType } from "@/enums/engine/TextSprite3DType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { AttackResult } from "@/enums/combat/AttackResult";
import { LightsaberForm } from "@/enums/combat/LightsaberForm";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { ActionType } from "@/enums/actions/ActionType";
import { DamageType } from "@/enums/combat/DamageType";
import { DiceType } from "@/enums/combat/DiceType";
import { WeaponType } from "@/enums/combat/WeaponType";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { TextSprite3D } from "@/engine/TextSprite3D";
import { BitWise } from "@/utility/BitWise";
import { CombatAttackData } from "@/combat/CombatAttackData";
import type { CombatRoundAction } from "@/combat/CombatRoundAction";
import { GameState } from "@/GameState";
import { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import type { TalentFeat } from "@/talents";
import * as THREE from 'three';

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
  owner: ModuleObject;

  roundStarted: boolean = false;
  attackID: number = 0;
  attackGroup: number = 0;
  spellCastRound: boolean = false;
  deflectArrow: boolean = true;
  weaponSucks: boolean = false;
  dodgeTarget: ModuleObject;
  newAttackTarget: ModuleObject; //the new target to switch to after this combat round has ended
  engaged: boolean = false; //dueling(?)
  master: boolean = false; //is this combatround group owned by this creature
  masterID: ModuleObject; //the creature that owns this combat group

  roundPaused: boolean = false;
  roundPausedBy: ModuleObject;
  infinitePause: boolean = false;
  pauseTimer: number = 0;
  timer: number = 0;
  roundLength: number = 0;
  overlapAmount: number = 0;
  bleedTimer: number = 0;

  currentAttack: number = 0;
  parryIndex: number = 0;
  numAOOs: number = 1; //Attacks of Opportunity - unused (?)
  numCleaves: number = 1; //Cleave Attacks - unused (?)
  onHandAttacks: number = 0;
  additionalAttacks: number = 0;
  effectAttacks: number = 0;
  parryActions: number = 0;
  offHandTaken: boolean = false;
  extraTaken: boolean = false;

  attackList: CombatAttackData[] = [];
  specialAttackList: any[] = []; // (?)
  scheduledActionList: CombatRoundAction[] = [];
  action: CombatRoundAction;

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
    this.newAttackTarget = undefined;
    this.engaged = false;
    this.master = false;
    this.masterID = undefined;
    this.roundPaused = false;
    this.roundPausedBy = undefined;
    this.infinitePause = false;
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
    this.additionalAttacks = 0;
    this.effectAttacks = 0;
    this.parryActions = 0;
    this.offHandTaken = false;
    this.extraTaken = false;
    this.attackList = new Array(5);
    for(let i = 0; i < 5; i++){
      this.attackList[i] = new CombatAttackData();
    }
  }

  /**
   * Begin the combat round
   */
  beginCombatRound(){
    console.log('beginCombatRound', this.owner.tag);
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;

    const owner: ModuleCreature = this.owner as any;

    this.roundStarted = true;
    this.roundLength = CombatRound.ROUND_LENGTH;

    this.onHandAttacks = owner.equipment.RIGHTHAND ? 1 : 0;
    this.additionalAttacks = 0;
    this.offHandTaken = false;
    this.extraTaken = false;

    this.spellCastRound = false;
    this.deflectArrow = true;

    const combatData = owner.combatData;

    combatData.lastAttackTarget = undefined;
    combatData.lastSpellTarget = undefined;
    this.timer = 0;

    if(this.action){
      const target = this.action.target;
      const targetCombatRound = target.combatRound;
      if(this.action.actionType == CombatActionType.ATTACK){
        combatData.lastAttackTarget = target;
        if(BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature) && BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)){
          if(owner.isDuelingObject(target)){
            this.engaged = true;
            if(!this.masterID && !targetCombatRound.masterID){
              this.masterID = targetCombatRound.masterID = owner;
              this.master = true;
              targetCombatRound.master = false;
            }else if(!this.masterID){
              this.masterID = targetCombatRound.masterID;
              this.master = false;
            }
          }
        }else if(BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature) && BitWise.InstanceOfObject(target, ModuleObjectType.ModuleObject)){
          this.master = true;
          targetCombatRound.master = !this.master;
        }
      }else if(
        this.action.actionType == CombatActionType.CAST_SPELL ||
        this.action.actionType == CombatActionType.ITEM_CAST_SPELL
      ){
        this.spellCastRound = true;
      }else if(this.action.actionType == CombatActionType.ATTACK_USE_FEAT){
        this.action.feat.impactCaster(owner);
        this.action.feat.impactTarget(this.action.target);
        switch(this.action.featId){
          case CombatFeatType.FLURRY:
          case CombatFeatType.IMPROVED_FLURRY:
          case CombatFeatType.MASTER_FLURRY:
          case CombatFeatType.RAPID_SHOT:
          case CombatFeatType.IMPROVED_RAPID_SHOT:
          case CombatFeatType.MASTER_RAPID_SHOT:
            if(owner.equipment.RIGHTHAND){
              this.additionalAttacks += 1;
            }
          break;
        }
      }
    }
  }

  /**
   * End the combat round
   */
  endCombatRound(){
    console.log('endCombatRound', this.owner.tag);
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
    for(let i = 0; i < 5; i++){
      this.attackList[i].reset();
    }
    this.owner.onCombatRoundEnd();
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
      this.pauseTimer -= deltaMs;
      if(this.pauseTimer < 0) this.pauseTimer = 0;
      if(this.pauseTimer <= 0 && !this.infinitePause){
        this.flushPendingDamage();
        this.roundPaused = false;
        this.pauseTimer = 0;
        this.endCombatRound();
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
   */
  processPendingDamage(deltaMs: number = 0){
    for(let i = 0; i < this.currentAttack; i++){
      const attack = this.attackList[i];
      if(!attack || attack.damageApplied || attack.damageApplyDelay < 0) continue;
      attack.damageApplyDelay -= deltaMs;
      if(attack.damageApplyDelay <= 0){
        this.signalAttackResult(attack);
      }
    }
  }

  /**
   * Apply any remaining deferred hits before the round ends.
   */
  flushPendingDamage(){
    for(let i = 0; i < this.currentAttack; i++){
      const attack = this.attackList[i];
      if(!attack || attack.damageApplied || attack.damageApplyDelay < 0) continue;
      this.signalAttackResult(attack);
    }
  }

  /**
   * Apply one attack's damage and floating-text feedback.
   */
  signalAttackResult(attack: CombatAttackData){
    if(!attack || attack.damageApplied) return;
    attack.damageApplyDelay = -1;

    if(
      attack.attackResult == AttackResult.HIT_SUCCESSFUL ||
      attack.attackResult == AttackResult.CRITICAL_HIT ||
      attack.attackResult == AttackResult.AUTOMATIC_HIT
    ){
      const owner = this.owner as ModuleCreature;
      attack.applyDamageEffectToCreature(owner, attack.reactObject as ModuleCreature);
      if(attack.reactObject){
        TextSprite3D.CreateOnObject(attack.reactObject, attack.getTotalDamage().toString(), TextSprite3DType.HOSTILE, 1500);
      }
    }else if(attack.attackResult == AttackResult.MISS && attack.reactObject){
      TextSprite3D.CreateOnObject(attack.reactObject, 'miss', TextSprite3DType.NEUTRAL, 1500);
      attack.damageApplied = true;
    }else if(attack.attackResult == AttackResult.PARRIED && attack.reactObject){
      TextSprite3D.CreateOnObject(attack.reactObject, 'parry', TextSprite3DType.NEUTRAL, 1500);
      attack.damageApplied = true;
    }else if(attack.attackResult == AttackResult.DEFLECTED && attack.reactObject){
      TextSprite3D.CreateOnObject(attack.reactObject, 'deflect', TextSprite3DType.NEUTRAL, 1500);
      attack.damageApplied = true;
    }else{
      attack.damageApplied = true;
    }
  }

  /**
   * Pause the round for the given pause owner and pause timer
   * @param pauseOwner - The pause owner to pause the round for
   * @param pauseTimer - The pause timer to pause the round for
   */
  pauseRound(pauseOwner: ModuleObject, pauseTimer: number = 0){
    this.roundPaused = true;
    this.roundPausedBy = pauseOwner;
    this.pauseTimer = pauseTimer;
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
   * Add an action to the scheduled action list
   * @param action - The action to add
   */
  addAction(action: CombatRoundAction){
    action.owner = this.owner;
    this.scheduledActionList.push(action);
  }

  /**
   * Clear all actions
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
  setAttackTarget(target: ModuleObject): boolean {
    if(!target) return false;
    for(let i = 0, len = this.scheduledActionList.length; i < len; i++){
      this.scheduledActionList[i].target = target;
    }
  }

  /**
   * Calculate the attack damage for the given creature and combat action
   * @param creature - The creature to calculate the attack damage for
   * @param combatAction - The combat action to calculate the attack damage for
   */
  calculateAttackDamage(creature: ModuleCreature, combatAction: CombatRoundAction){
    if(!combatAction || combatAction.resultsCalculated)
      return;

      creature.weaponPowered(true);

    combatAction.resultsCalculated = true;
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);
    this.currentAttack = 0;

    if(!combatAction.isCutsceneAttack){
      combatAction.attackResult = (hasAssuredHit) ? AttackResult.AUTOMATIC_HIT : AttackResult.MISS;
      combatAction.attackDamage = 0;
      if(creature && !creature.isSimpleCreature()){
        /**
         * Unarmed Strike
         */
        if(!creature.equipment.RIGHTHAND && !creature.equipment.LEFTHAND){
          this.calculateWeaponAttack(creature, undefined, ModuleCreatureArmorSlot.RIGHTHAND, combatAction);
        }

        /**
         * Main Hand Attack
         */
        if(creature.equipment.RIGHTHAND){
          this.calculateWeaponAttack(creature, creature.equipment.RIGHTHAND, ModuleCreatureArmorSlot.RIGHTHAND, combatAction);
        }

        /**
         * Off Hand Attack
         */
        if(creature.equipment.LEFTHAND){
          this.calculateWeaponAttack(creature, creature.equipment.LEFTHAND, ModuleCreatureArmorSlot.LEFTHAND, combatAction);
        }

        /**
         * Additional Attacks
         */
        if(this.additionalAttacks > 0){
          for(let i = 0; i < this.additionalAttacks; i++){
            if(!creature.equipment.RIGHTHAND){ continue; }
            this.calculateWeaponAttack(creature, creature.equipment.RIGHTHAND, ModuleCreatureArmorSlot.RIGHTHAND, combatAction);
          }
        }
      }else if(creature && creature.isSimpleCreature()){
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
    }

    combatAction.target.combatData.lastAttacker = creature;
    creature.combatData.lastAttackResult = combatAction.attackResult;
    combatAction.target.onAttacked(combatAction.actionType);

    this.calculateRoundAnimations(creature, combatAction);

    let attackAnimation = creature.model.odysseyAnimationMap.get(combatAction.animationName.toLowerCase().trim());
    let attackDamageDelay = attackAnimation?.getDamageDelay() || 0;

    // Schedule damage for the animation Hit event instead of applying instantly
    const damageDelayMs = Math.max(0, (attackDamageDelay || 0.5) * 1000);

    if(combatAction.isCutsceneAttack){
      const attack = this.attackList[0];
      if(attack){
        attack.attackResult = combatAction.attackResult;
        attack.reactObject = this.action.target;
        if(
          attack.attackResult == AttackResult.HIT_SUCCESSFUL ||
          attack.attackResult == AttackResult.CRITICAL_HIT ||
          attack.attackResult == AttackResult.AUTOMATIC_HIT
        ){
          attack.attackWeapon = creature.equipment.RIGHTHAND;
          attack.attackResult = combatAction.attackResult;
          attack.damageList[DamageType.BASE].damageValue = combatAction.attackDamage;
        }
        attack.damageApplyDelay = damageDelayMs;
        this.currentAttack = Math.max(this.currentAttack, 1);
      }
    }else{
      for(let i = 0; i < this.currentAttack; i++){
        const attack = this.attackList[i];
        if(!attack) continue;
        // Stagger multi-attacks slightly
        attack.damageApplyDelay = damageDelayMs + (i * 200);
      }
    }

  }

  /**
   * Roll a natural d20.
   */
  rollD20(): number {
    return Dice.roll(1, DiceType.d20);
  }

  /**
   * Ability modifier for attack rolls. Ranged uses DEX; lightsabers use the
   * better of STR and DEX; other melee uses STR.
   */
  getAttackAbilityModifier(creature: ModuleCreature, weapon: ModuleItem | undefined): number {
    const strMod = CombatRound.GetMod(creature.getSTR());
    const dexMod = CombatRound.GetMod(creature.getDEX());
    if(weapon?.isRangedWeapon()){
      return dexMod;
    }
    // Lightsaber base items 8/9/10 use the higher of STR/DEX
    if(weapon && (weapon.baseItemId == 8 || weapon.baseItemId == 9 || weapon.baseItemId == 10)){
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
      BitWise.InstanceOfObject(combatAction.target, ModuleObjectType.ModuleCreature)
    ){
      const target = combatAction.target as ModuleCreature;
      const targetWeapon = target.equipment?.RIGHTHAND;
      if(targetWeapon?.isRangedWeapon()){
        modifier += 10;
      }
    }

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
   * Check if the creature is dual-wielding
   */
  isDualWielding(creature: ModuleCreature): boolean {
    const rightHand = creature.equipment.RIGHTHAND;
    const leftHand = creature.equipment.LEFTHAND;
    if(!rightHand || !leftHand) return false;
    if(leftHand.getWeaponType() == WeaponType.INVALID) return false;
    if(leftHand.getWeaponWield() == WeaponWield.INVALID) return false;
    return rightHand.getWeaponWield() != WeaponWield.STUN_BATON;
  }

  /**
   * Two-weapon fighting to-hit modifier.
   */
  calculateTwoWeaponModifier(creature: ModuleCreature, slot: ModuleCreatureArmorSlot.RIGHTHAND|ModuleCreatureArmorSlot.LEFTHAND): number {
    if(!creature || creature.isSimpleCreature()) return 0;

    const leftHand = creature.equipment.LEFTHAND;
    const creatureSize = 3;
    const offhandRelativeSize = leftHand
      ? (leftHand.getBaseItem().weaponSize as number) - creatureSize
      : 0;
    const lightOffhand = offhandRelativeSize == -1;

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
    if(!BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)) return false;

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
   * Whether the creature has the given effect immunity type.
   * Combat uses 30 (sneak) and 31 (critical hits).
   */
  hasEffectImmunity(creature: ModuleCreature, immunityType: number): boolean {
    for(let i = 0; i < creature.effects.length; i++){
      const effect = creature.effects[i];
      if(effect.type != GameEffectType.EffectImmunity) continue;
      const type = effect.getInt(0);
      if(type == 0 || type == immunityType){
        return true;
      }
    }
    return false;
  }

  /**
   * Resolve sneak-attack eligibility (flank / rear / ranged proximity).
   */
  resolveSneakAttack(attacker: ModuleCreature, target: ModuleCreature, attack: CombatAttackData): boolean {
    if(!target || !BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)) return false;

    let dice = 0;
    for(let i = CombatFeatType.SNEAK_ATTACK_10D6; i >= CombatFeatType.SNEAK_ATTACK_1D6; i--){
      if(attacker.getHasFeat(i)){
        dice = i - CombatFeatType.SNEAK_ATTACK_1D6 + 1;
        break;
      }
    }
    if(dice <= 0) return false;

    // Sneak / critical immunities block sneak application
    if(
      this.hasEffectImmunity(target, 30) ||
      this.hasEffectImmunity(target, 31)
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

  getConcealmentPercent(creature: ModuleCreature): number {
    let percent = 0;
    for(let i = 0; i < creature.effects.length; i++){
      const effect = creature.effects[i];
      if(
        effect.type == GameEffectType.EffectConcealment ||
        effect.type == GameEffectType.EffectMissChance
      ){
        percent = Math.max(percent, effect.getInt(0) || 0);
      }
    }
    return Math.min(100, Math.max(0, percent));
  }

  /**
   * Resolve a weapon attack roll and its damage.
   */
  calculateWeaponAttack(creature: ModuleCreature, weapon: ModuleItem | undefined = undefined, weaponSlot: ModuleCreatureArmorSlot, combatAction: CombatRoundAction) {
    const naturalRoll = this.rollD20();
    const attackMod = this.getAttackModifierVersus(creature, weapon, weaponSlot, combatAction);
    const attackTotal = naturalRoll + attackMod;
    const targetAC = combatAction.target.getAC();
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);
    const attack = this.attackList[this.currentAttack];
    let isCritical = false;

    attack.reactObject = combatAction.target;
    attack.attackWeapon = weapon;
    attack.rangedAttack = !!(weapon?.isRangedWeapon());
    attack.sneakAttack = false;

    const targetCreature = BitWise.InstanceOfObject(combatAction.target, ModuleObjectType.ModuleCreature)
      ? combatAction.target as ModuleCreature
      : undefined;

    if(targetCreature){
      this.resolveSneakAttack(creature, targetCreature, attack);
    }

    // Concealment / miss chance: d100 > percent means attack proceeds
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
          targetCreature && this.hasEffectImmunity(targetCreature, 31)
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
    this.currentAttack++;
  }

  /**
   * Calculate the round animations for the given creature and combat action
   * @param creature - The creature to calculate the animations for
   * @param combatAction - The combat action to calculate the animations for
   */
  calculateRoundAnimations(creature: ModuleCreature, combatAction: CombatRoundAction){
    if(!combatAction) return;

    let attackKey = creature.getCombatAnimationAttackType();
    let weaponWield = creature.getCombatAnimationWeaponType();
    let attackType = 1;

    //Get random basic melee attack in combat with another melee creature that is targeting you
    if(attackKey == 'm'){
      if(this.engaged && !this.attacksIncludeKillingBlow()){
        attackKey = 'c';
        attackType = Math.round(Math.random()*4)+1;
      }
    }

    this.action.animationName = attackKey+weaponWield+'a'+attackType;
    this.action.twoDAAnimation = OdysseyModelAnimation.GetAnimation2DA(this.action.animationName);

    if(combatAction.isCutsceneAttack){

      if(creature){
        creature.playTwoDAAnimation(combatAction.twoDAAnimation);
        creature.animationState.index = ModuleCreatureAnimState.ATTACK;
      }

      if(combatAction.target){
        const target: ModuleCreature = combatAction.target as any;
        switch(combatAction.attackResult){
          case AttackResult.HIT_SUCCESSFUL:
          case AttackResult.CRITICAL_HIT:
          case AttackResult.AUTOMATIC_HIT:
            target.playTwoDAAnimation( target.getDamageAnimation( combatAction.animationName ) );
            target.animationState.index = ModuleCreatureAnimState.DAMAGE;
          break;
          case AttackResult.PARRIED:
            target.playTwoDAAnimation( target.getParryAnimation( combatAction.animationName ) );
            target.animationState.index = ModuleCreatureAnimState.PARRY;
          break;
          default:
            target.playTwoDAAnimation( target.getDamageAnimation( combatAction.animationName ) );
            target.animationState.index = ModuleCreatureAnimState.DAMAGE;
          break;
        }
      }

    }else{

      if(
        combatAction.attackResult == AttackResult.HIT_SUCCESSFUL ||
        combatAction.attackResult == AttackResult.CRITICAL_HIT ||
        combatAction.attackResult == AttackResult.AUTOMATIC_HIT
      ){

        if(creature){
          creature.playTwoDAAnimation( combatAction.twoDAAnimation );
          creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(combatAction.target && BitWise.InstanceOfObject(combatAction.target, ModuleObjectType.ModuleCreature)){
          const target: ModuleCreature = combatAction.target as any;
          if(
            target.animationState.index == ModuleCreatureAnimState.IDLE ||
            target.animationState.index == ModuleCreatureAnimState.READY
          ){
            if(target.combatData.lastAttackTarget == creature){
              if(!this.attacksIncludeKillingBlow()){
                target.playTwoDAAnimation( target.getDamageAnimation( combatAction.animationName ) );
                target.animationState.index = ModuleCreatureAnimState.DAMAGE;
              }
            }
          }
        }

      }else if(
        combatAction.attackResult == AttackResult.PARRIED ||
        combatAction.attackResult == AttackResult.DEFLECTED
      ){

        if(creature){
          creature.playTwoDAAnimation( combatAction.twoDAAnimation );
          creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(combatAction.target && BitWise.InstanceOfObject(combatAction.target, ModuleObjectType.ModuleCreature)){
          const target: ModuleCreature = combatAction.target as any;
          if(!this.attacksIncludeKillingBlow()){
            target.playTwoDAAnimation( target.getParryAnimation( combatAction.animationName ) );
            target.animationState.index = ModuleCreatureAnimState.PARRY;
          }
        }

      }else{

        if(creature){
          creature.playTwoDAAnimation( combatAction.twoDAAnimation );
          creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(combatAction.target && BitWise.InstanceOfObject(combatAction.target, ModuleObjectType.ModuleCreature)){
          const target: ModuleCreature = combatAction.target as any;
          if(
            target.animationState.index == ModuleCreatureAnimState.IDLE ||
            target.animationState.index == ModuleCreatureAnimState.READY
          ){
            if(combatAction.target.combatData.lastAttackTarget == creature){
              if(!this.attacksIncludeKillingBlow()){
                target.playTwoDAAnimation( target.getDodgeAnimation( combatAction.animationName ) );
                target.animationState.index = ModuleCreatureAnimState.DODGE;
              }
            }
          }
        }
      }
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
   * @param structIdx - The index of the struct
   * @returns The GFF struct
   */
  toStruct(structIdx: number = 0xCADA){
    const struct = new GFFStruct(structIdx);

    return struct;
  }

  /**
   * Log the attack result to the combat feedback system
   * @param creature - The creature performing the attack
   * @param weapon - The weapon used in the attack
   * @param combatAction - The combat action containing the result
   * @param isCritical - Whether the attack was a critical hit
   * @param hasAssuredHit - Whether the attack had assured hit effect
   */
  logAttackResult(creature: ModuleCreature, weapon: ModuleItem | undefined, combatAction: CombatRoundAction, isCritical: boolean, hasAssuredHit: boolean) {
    const { FeedbackMessageManager } = GameState;

    let message = '';
    let color = FeebackMessageColor.ATTACK;

    // Get weapon name for display
    const weaponName = weapon ? weapon.getName() : 'Unarmed';

    // Format message based on attack result
    switch (combatAction.attackResult) {
      case AttackResult.CRITICAL_HIT:
        if (hasAssuredHit) {
          message = `${creature.getName()}: *Assured Hit* Critical Hit with ${weaponName}!`;
        } else {
          message = `${creature.getName()}: Critical Hit with ${weaponName}!`;
        }
        break;

      case AttackResult.HIT_SUCCESSFUL:
        if (hasAssuredHit) {
          message = `${creature.getName()}: *Assured Hit* Hit with ${weaponName}!`;
        } else {
          message = `${creature.getName()}: Hit with ${weaponName}!`;
        }
        break;

      case AttackResult.AUTOMATIC_HIT:
        message = `${creature.getName()}: Automatic Hit with ${weaponName}!`;
        break;

      case AttackResult.MISS:
        message = `${creature.getName()}: Miss with ${weaponName}!`;
        color = FeebackMessageColor.INFO; // Use info color for misses
        break;

      case AttackResult.ATTACK_RESISTED:
        message = `${creature.getName()}: Attack Resisted with ${weaponName}!`;
        color = FeebackMessageColor.INFO;
        break;

      case AttackResult.ATTACK_FAILED:
        message = `${creature.getName()}: Attack Failed with ${weaponName}!`;
        color = FeebackMessageColor.INFO;
        break;

      case AttackResult.PARRIED:
        message = `${creature.getName()}: Attack Parried with ${weaponName}!`;
        color = FeebackMessageColor.INFO;
        break;

      case AttackResult.DEFLECTED:
        message = `${creature.getName()}: Attack Deflected with ${weaponName}!`;
        color = FeebackMessageColor.INFO;
        break;

      default:
        message = `${creature.getName()}: Unknown attack result with ${weaponName}!`;
        color = FeebackMessageColor.INFO;
        break;
    }

    // Create and add the feedback message entry
    const entry = new FeedbackMessageEntry();
    entry.message = message;
    entry.color = color;
    entry.type = 0; // Standard combat feedback type

    FeedbackMessageManager.AddEntry(entry);

    // Also log to console for debugging
    console.log(`Combat Log: ${message}`);
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
