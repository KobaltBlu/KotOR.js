import type { ModuleCreature, ModuleItem, ModuleObject } from "../module";
import { GFFStruct } from "../resource/GFFStruct";
import { Dice } from "../utility/Dice";
import { OdysseyModelAnimation } from "../odyssey";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { TextSprite3DType } from "../enums/engine/TextSprite3DType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { CombatFeatType } from "../enums/combat/CombatFeatType";
import { AttackResult } from "../enums/combat/AttackResult";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { ActionType } from "../enums/actions/ActionType";
import { WeaponSize } from "../enums/combat/WeaponSize";
import { DamageType } from "../enums/combat/DamageType";
import { DiceType } from "../enums/combat/DiceType";
import { TextSprite3D } from "../engine/TextSprite3D";
import { BitWise } from "../utility/BitWise";
import { CombatAttackData } from "./CombatAttackData";
import type { CombatRoundAction } from "./CombatRoundAction";

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

    if(this.roundPaused){
      this.pauseTimer -= (delta * 1000);
      if(this.pauseTimer < 0) this.pauseTimer = 0;
      if(this.pauseTimer <= 0 && !this.infinitePause){
        this.roundPaused = false;
        this.pauseTimer = 0;
        this.endCombatRound();
      }
    }else{
      this.timer += (delta * 1000);
      if(this.timer >= this.roundLength){
        this.endCombatRound();
      }
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
    const index = this.scheduledActionList.indexOf(action);
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

    const attackAnimation = creature.model.odysseyAnimationMap.get(combatAction.animationName.toLowerCase().trim());
    const attackDamageDelay = attackAnimation?.getDamageDelay() || 0;

    if(combatAction.isCutsceneAttack){
      const attack = this.attackList[0];
      if(attack){
        attack.attackResult = combatAction.attackResult;
        if(
          attack.attackResult == AttackResult.HIT_SUCCESSFUL || 
          attack.attackResult == AttackResult.CRITICAL_HIT || 
          attack.attackResult == AttackResult.AUTOMATIC_HIT 
        ){
          attack.attackWeapon = creature.equipment.RIGHTHAND;
          attack.attackResult = combatAction.attackResult
          attack.damageList[DamageType.BASE].damageValue = combatAction.attackDamage;
          attack.applyDamageEffectToCreature(creature, this.action.target as ModuleCreature);
        }
      }
    }else{
      //process attack results
      for(let i = 0; i < this.currentAttack; i++){
        const attack = this.attackList[i];
        if(!attack) 
          continue;

        if(
          attack.attackResult == AttackResult.HIT_SUCCESSFUL || 
          attack.attackResult == AttackResult.CRITICAL_HIT || 
          attack.attackResult == AttackResult.AUTOMATIC_HIT 
        ){
          attack.applyDamageEffectToCreature(creature, this.action.target as ModuleCreature);
          TextSprite3D.CreateOnObject(this.action.target, attack.getTotalDamage().toString(), TextSprite3DType.HOSTILE, 1500);
        }else if(attack.attackResult == AttackResult.MISS){
          TextSprite3D.CreateOnObject(this.action.target, 'miss', TextSprite3DType.NEUTRAL, 1500);
        }
      }
    }

  }

  /**
   * Calculate the attack roll for the given creature and weapon
   * @param creature - The creature to calculate the attack roll for
   * @param weapon - The weapon to calculate the attack roll for
   * @returns The attack roll
   */
  calculateAttackRoll(creature: ModuleCreature, weapon: ModuleItem){
    return Dice.roll(1, DiceType.d20, creature.getBaseAttackBonus() + (weapon?.getAttackBonus() || 0));
  }

  /**
   * Check if the attack roll is a critical hit
   * @param attackRoll - The attack roll to check
   * @param weapon - The weapon to check the critical hit for
   * @returns True if the attack roll is a critical hit, false otherwise
   */
  isCritical(attackRoll: number, weapon: ModuleItem | undefined = undefined): boolean {
    if(!weapon) return attackRoll == 20;
    return (attackRoll > weapon.getCriticalThreatRangeMin() && attackRoll <= 20);
  }

  /**
   * Check if the creature is dual-wielding
   * @param creature - The creature to check if it is dual-wielding
   * @returns True if the creature is dual-wielding, false otherwise
   */
  isDualWielding(creature: ModuleCreature): boolean {
    const rightHand = creature.equipment.RIGHTHAND;
    const leftHand = creature.equipment.LEFTHAND;
    return (
      rightHand && ( rightHand.getBaseItem().weaponWield != WeaponWield.STUN_BATON ) && 
      leftHand && ( leftHand.getBaseItem().weaponWield != WeaponWield.STUN_BATON )
    );
  }

  /**
   * Calculate the two-weapon penalty for the given creature and slot
   * @param creature - The creature to calculate the penalty for
   * @param slot - The slot to calculate the penalty for
   * @returns The two-weapon penalty
   */
  calculateTwoWeaponPenalty(creature: ModuleCreature, slot: ModuleCreatureArmorSlot.RIGHTHAND|ModuleCreatureArmorSlot.LEFTHAND){
    if(!creature) return 0;
    if(creature.isSimpleCreature()) return 0;

    const rightHand = creature.equipment.RIGHTHAND;
    const leftHand = creature.equipment.LEFTHAND;

    /**
     * Main Hand Penalty
     */
    if(slot == ModuleCreatureArmorSlot.RIGHTHAND){
      let penalty = 6;
      if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_MASTERY)){
        penalty = 2;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_ADVANCED)){
        penalty = 4;
      }
      if(
        rightHand.getBaseItem().weaponWield == WeaponWield.TWO_HANDED_SWORD || 
        rightHand.getBaseItem().weaponWield == WeaponWield.BLASTER_PISTOL
      ){
        penalty -= 2;
      }
      return Math.max(penalty, 0);
    }
    
    /**
     * Off Hand Penalty
     */
    if(slot == ModuleCreatureArmorSlot.LEFTHAND){
      let penalty = 10;
      if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_MASTERY)){
        penalty = 2;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_ADVANCED)){
        penalty = 4;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_FIGHTING)){
        penalty = 6;
      }
      if(leftHand.getBaseItem().weaponSize == WeaponSize.SMALL){
        penalty -= 2;
      }
      return Math.max(penalty, 0);
    }

    return 0;
  }

  /**
   * Calculate the weapon attack for the given creature and weapon
   * @param creature - The creature to calculate the attack for
   * @param weapon - The weapon to calculate the attack for
   * @param weaponSlot - The slot of the weapon
   * @param combatAction - The combat action to calculate the attack for
   */
  calculateWeaponAttack(creature: ModuleCreature, weapon: ModuleItem | undefined = undefined, weaponSlot: ModuleCreatureArmorSlot, combatAction: CombatRoundAction) {
    //Roll to hit
    let attackRoll = this.calculateAttackRoll(creature, weapon);
    const isDualWielding = this.isDualWielding(creature);
    const isMainHand = weapon && weaponSlot == ModuleCreatureArmorSlot.RIGHTHAND;
    const isOffHand = weapon && weaponSlot == ModuleCreatureArmorSlot.LEFTHAND;
    if(isDualWielding && (isMainHand || isOffHand)){
      const penalty = this.calculateTwoWeaponPenalty(creature, weaponSlot);
      attackRoll -= penalty;
    }
    const isCritical = this.isCritical(attackRoll, weapon);
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);
    const attack = this.attackList[this.currentAttack];
    if(hasAssuredHit || isCritical || attackRoll > combatAction.target.getAC()){
      combatAction.attackResult = (!hasAssuredHit && isCritical) ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
      attack.reactObject = combatAction.target;
      attack.attackWeapon = weapon;
      attack.attackResult = combatAction.attackResult;
      attack.calculateDamage(creature, !hasAssuredHit && isCritical, combatAction.feat);
    }else{
      combatAction.attackResult = AttackResult.MISS;
      attack.reactObject = combatAction.target;
      attack.attackWeapon = weapon;
      attack.attackResult = combatAction.attackResult;
    }

    // TODO: Log to combat menu

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
    const weaponWield = creature.getCombatAnimationWeaponType();
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
        combatAction.attackResult == AttackResult.CRITICAL_HIT
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
   * Calculate the ability modifier for the given value
   * @param val - The value to calculate the modifier for
   * @returns The ability modifier
   */
  static GetMod(val=0){
    return Math.floor( ( val - 10 ) / 2 );
  }

}