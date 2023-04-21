import { ModuleCreature, ModuleItem, ModuleObject } from "../module";
import { CombatAttackData, CombatRoundAction } from ".";
import { GFFStruct } from "../resource/GFFStruct";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { ActionType } from "../enums/actions/ActionType";
import { AttackResult } from "../enums/combat/AttackResult";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { Dice } from "../utility/Dice";
import { DiceType } from "../enums/combat/DiceType";
import { OdysseyModelAnimation } from "../odyssey";
import { DamageType } from "../enums/combat/DamageType";
import { CombatFeatType } from "../enums/combat/CombatFeatType";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { WeaponSize } from "../enums/combat/WeaponSize";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { TextSprite3D } from "../engine/TextSprite3D";
import { TextSprite3DType } from "../enums/engine/TextSprite3DType";

export class CombatRound {
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

  beginCombatRound(){
    console.log('beginCombatRound', this.owner.tag);
    if(!(this.owner instanceof ModuleCreature)) return;

    this.roundStarted = true;

    this.onHandAttacks = this.owner.equipment.LEFTHAND instanceof ModuleItem ? 1 : 0;
    this.additionalAttacks = 0;
    this.offHandTaken = false;
    this.extraTaken = false;

    this.spellCastRound = false;
    this.deflectArrow = true;

    const combatData = this.owner.combatData;

    combatData.lastAttackTarget = undefined;
    combatData.lastSpellTarget = undefined;
    this.timer = 0;

    if(this.action){
      const target = this.action.target;
      const targetCombatRound = target.combatRound;
      if(this.action.actionType == CombatActionType.ATTACK){
        combatData.lastAttackTarget = target;
        if(this.owner instanceof ModuleCreature && target instanceof ModuleCreature){
          if(this.owner.isDuelingObject(target)){
            this.engaged = true;
            if(!this.masterID && !targetCombatRound.masterID){
              this.masterID = targetCombatRound.masterID = this.owner;
              this.master = true;
              targetCombatRound.master = false;
            }else if(!this.masterID){
              this.masterID = targetCombatRound.masterID;
              this.master = false;
            }
          }
        }
      }else if(
        this.action.actionType == CombatActionType.CAST_SPELL ||
        this.action.actionType == CombatActionType.ITEM_CAST_SPELL
      ){
        this.spellCastRound = true;
      }else if(this.action.actionType == CombatActionType.ATTACK_USE_FEAT){
        this.action.feat.impactCaster(this.owner);
        this.action.feat.impactTarget(this.action.target);
        switch(this.action.featId){
          case CombatFeatType.FLURRY:
          case CombatFeatType.IMPROVED_FLURRY:
          case CombatFeatType.MASTER_FLURRY:
          case CombatFeatType.RAPID_SHOT:
          case CombatFeatType.IMPROVED_RAPID_SHOT:
          case CombatFeatType.MASTER_RAPID_SHOT:
            if(this.owner.equipment.RIGHTHAND instanceof ModuleItem){
              this.additionalAttacks += 1;
            }
          break;
        }
      }
    }
  }

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

  reset(){
    //
  }

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

  pauseRound(pauseOwner: ModuleObject, pauseTimer: number = 0){
    this.roundPaused = true;
    this.roundPausedBy = pauseOwner;
    this.pauseTimer = pauseTimer;
  }

  unpauseRound(pauseOwner: ModuleObject){
    if(this.roundPausedBy == pauseOwner){
      this.roundPaused = false;
      this.pauseTimer = 0;
    }
  }

  addAction(action: CombatRoundAction){
    action.owner = this.owner;
    this.scheduledActionList.push(action);
  }

  clearActions(){
    this.action = undefined;
    this.scheduledActionList = [];
  }

  clearAction(action: CombatRoundAction){
    let index = this.scheduledActionList.indexOf(action);
    if(index >= 0){
      this.scheduledActionList.splice( index, 1 );
      return true;
    }
    return false;
  }

  clearActionsByTarget(target: ModuleObject){
    let index = this.scheduledActionList.length;
    while(index--){
      const action = this.scheduledActionList[index];
      if(action && action.target == target){
        this.scheduledActionList.splice(index, 1);
      }
    }
  }

  setAttackTarget(target: ModuleObject): boolean {
    if(!target) return false;
    for(let i = 0, len = this.scheduledActionList.length; i < len; i++){
      this.scheduledActionList[i].target = target;
    }
  }

  calculateAttackDamage(creature: ModuleCreature, combatAction: CombatRoundAction){
    if(!combatAction || combatAction.resultsCalculated)
      return;

      creature.weaponPowered(true);

    combatAction.resultsCalculated = true;
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);
    this.currentAttack = 0;

    if(!combatAction.isCutsceneAttack){
      combatAction.attackResult = AttackResult.MISS
      combatAction.attackDamage = 0;
      if(creature instanceof ModuleCreature){
        const bab = creature.getBaseAttackBonus();
        if(!creature.isSimpleCreature()){

          let isDualWielding = (
            creature.equipment.RIGHTHAND && (
              // !creature.equipment.RIGHTHAND.getBaseItem().rangedWeapon && 
              creature.equipment.RIGHTHAND.getBaseItem().weaponWield != WeaponWield.STUN_BATON 
            ) && 
            creature.equipment.LEFTHAND && ( 
              // !creature.equipment.LEFTHAND.getBaseItem().rangedWeapon && 
              creature.equipment.LEFTHAND.getBaseItem().weaponWield != WeaponWield.STUN_BATON
            )
          );

          if(creature.equipment.RIGHTHAND instanceof ModuleItem){
            //Roll to hit
            let attackRoll = Dice.roll(1, DiceType.d20, bab + creature.equipment.RIGHTHAND.getAttackBonus());
            let isCritical = (attackRoll > creature.equipment.RIGHTHAND.getCriticalThreatRangeMin() && attackRoll <= 20);
            if(hasAssuredHit || isCritical || attackRoll > 1){
              if(isDualWielding){
                attackRoll -= this.calculateTwoWeaponPenalty(creature, creature.equipment.RIGHTHAND, ModuleCreatureArmorSlot.RIGHTHAND);
              }
              let hits = hasAssuredHit || isCritical || attackRoll > combatAction.target.getAC();
              if(hits){
                combatAction.attackResult = (!hasAssuredHit && isCritical) ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.RIGHTHAND;
                this.attackList[this.currentAttack].attackResult = combatAction.attackResult;
                this.attackList[this.currentAttack].calculateDamage(creature, !hasAssuredHit && isCritical, combatAction.feat);
                this.currentAttack++;
              }else{
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.RIGHTHAND;
                this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
                this.currentAttack++;
              }
            }else{
              this.attackList[this.currentAttack].reactObject = combatAction.target;
              this.attackList[this.currentAttack].attackWeapon = creature.equipment.RIGHTHAND;
              this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
              this.currentAttack++;
            }
            //TODO: Log to combat menu
          }

          if(creature.equipment.LEFTHAND instanceof ModuleItem){
            //Roll to hit
            let attackRoll = Dice.roll(1, DiceType.d20, bab) + creature.equipment.LEFTHAND.getAttackBonus();
            let isCritical = (attackRoll > creature.equipment.LEFTHAND.getCriticalThreatRangeMin() && attackRoll <= 20);
            if(hasAssuredHit || isCritical || attackRoll > 1){
              if(isDualWielding){
                attackRoll -= this.calculateTwoWeaponPenalty(creature, creature.equipment.LEFTHAND, ModuleCreatureArmorSlot.LEFTHAND);
              }
              let hits = hasAssuredHit || isCritical || attackRoll > combatAction.target.getAC();
              if(hits){
                combatAction.attackResult = (!hasAssuredHit && isCritical) ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.LEFTHAND;
                this.attackList[this.currentAttack].attackResult = combatAction.attackResult;
                this.attackList[this.currentAttack].calculateDamage(creature, !hasAssuredHit && isCritical, combatAction.feat);
                this.currentAttack++;
              }else{
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.LEFTHAND;
                this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
                this.currentAttack++;
              }
            }else{
              this.attackList[this.currentAttack].reactObject = combatAction.target;
              this.attackList[this.currentAttack].attackWeapon = creature.equipment.LEFTHAND;
              this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
              this.currentAttack++;
            }
            //TODO: Log to combat menu
          }
          
          if(this.additionalAttacks > 0){
            for(let i = 0; i < this.additionalAttacks; i++){
              if(creature.equipment.RIGHTHAND instanceof ModuleItem){
                //Roll to hit
                let attackRoll = Dice.roll(1, DiceType.d20, bab + creature.equipment.RIGHTHAND.getAttackBonus());
                let isCritical = (attackRoll > creature.equipment.RIGHTHAND.getCriticalThreatRangeMin() && attackRoll <= 20);
                if(hasAssuredHit || isCritical || attackRoll > 1){
                  if(isDualWielding){
                    attackRoll -= this.calculateTwoWeaponPenalty(creature, creature.equipment.RIGHTHAND, ModuleCreatureArmorSlot.RIGHTHAND);
                  }
                  let hits = hasAssuredHit || isCritical || attackRoll > combatAction.target.getAC();
                  if(hits){
                    combatAction.attackResult = (!hasAssuredHit && isCritical) ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
                    this.attackList[this.currentAttack].reactObject = combatAction.target;
                    this.attackList[this.currentAttack].attackWeapon = creature.equipment.RIGHTHAND;
                    this.attackList[this.currentAttack].attackResult = combatAction.attackResult;
                    this.attackList[this.currentAttack].calculateDamage(creature, !hasAssuredHit && isCritical, combatAction.feat);
                    this.currentAttack++;
                  }else{
                    this.attackList[this.currentAttack].reactObject = combatAction.target;
                    this.attackList[this.currentAttack].attackWeapon = creature.equipment.RIGHTHAND;
                    this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
                    this.currentAttack++;
                  }
                }else{
                  this.attackList[this.currentAttack].reactObject = combatAction.target;
                  this.attackList[this.currentAttack].attackWeapon = creature.equipment.RIGHTHAND;
                  this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
                  this.currentAttack++;
                }
                // TODO: Log to combat menu
              }
            }
          }

        }else{

          if(creature.equipment.CLAW1 instanceof ModuleItem){
            //Roll to hit
            let attackRoll = Dice.roll(1, DiceType.d20, bab + creature.equipment.CLAW1.getAttackBonus());
            let isCritical = (attackRoll > creature.equipment.CLAW1.getCriticalThreatRangeMin() && attackRoll <= 20);
            if(hasAssuredHit || isCritical || attackRoll > 1){
              let hits = hasAssuredHit || isCritical || attackRoll > combatAction.target.getAC()
              if(hits){
                combatAction.attackResult = (!hasAssuredHit && isCritical) ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW1;
                this.attackList[this.currentAttack].attackResult = combatAction.attackResult;
                this.attackList[this.currentAttack].calculateDamage(creature, !hasAssuredHit && isCritical);
                this.currentAttack++;
              }else{
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW1;
                this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
                this.currentAttack++;
              }
            }else{
              this.attackList[this.currentAttack].reactObject = combatAction.target;
              this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW1;
              this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
              this.currentAttack++;
            }
            // TODO: Log to combat menu
          }

          if(creature.equipment.CLAW2 instanceof ModuleItem){
            //Roll to hit
            let attackRoll = Dice.roll(1, DiceType.d20, bab + creature.equipment.CLAW2.getAttackBonus());
            let isCritical = (attackRoll > creature.equipment.CLAW2.getCriticalThreatRangeMin() && attackRoll <= 20);
            if(hasAssuredHit || isCritical || attackRoll > 1){
              let hits = hasAssuredHit || isCritical || attackRoll > combatAction.target.getAC();
              if(hits){
                combatAction.attackResult = (!hasAssuredHit && isCritical) ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW2;
                this.attackList[this.currentAttack].attackResult = combatAction.attackResult;
                this.attackList[this.currentAttack].calculateDamage(creature, !hasAssuredHit && isCritical);
                this.currentAttack++;
              }else{
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW2;
                this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
                this.currentAttack++;
              }
            }else{
              this.attackList[this.currentAttack].reactObject = combatAction.target;
              this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW2;
              this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
              this.currentAttack++;
            }
            // TODO: Log to combat menu
          }

          if(creature.equipment.CLAW3 instanceof ModuleItem){
            //Roll to hit
            let attackRoll = Dice.roll(1, DiceType.d20, bab + creature.equipment.CLAW3.getAttackBonus());
            let isCritical = (attackRoll > creature.equipment.CLAW3.getCriticalThreatRangeMin() && attackRoll <= 20);
            if(hasAssuredHit || isCritical || attackRoll > 1){
              let hits = hasAssuredHit || isCritical || attackRoll > combatAction.target.getAC();
              if(hits){
                combatAction.attackResult = (!hasAssuredHit && isCritical) ? AttackResult.CRITICAL_HIT : AttackResult.HIT_SUCCESSFUL;
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW3;
                this.attackList[this.currentAttack].attackResult = combatAction.attackResult;
                this.attackList[this.currentAttack].calculateDamage(creature, !hasAssuredHit && isCritical);
                this.currentAttack++;
              }else{
                this.attackList[this.currentAttack].reactObject = combatAction.target;
                this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW3;
                this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
                this.currentAttack++;
              }
            }else{
              this.attackList[this.currentAttack].reactObject = combatAction.target;
              this.attackList[this.currentAttack].attackWeapon = creature.equipment.CLAW3;
              this.attackList[this.currentAttack].attackResult = AttackResult.MISS;
              this.currentAttack++;
            }
            // TODO: Log to combat menu
          }
        }
      }
    }

    if(hasAssuredHit && !combatAction.isCutsceneAttack){
      combatAction.attackResult = AttackResult.AUTOMATIC_HIT;
    }

    combatAction.target.combatData.lastAttacker = creature;
    creature.combatData.lastAttackResult = combatAction.attackResult;
    combatAction.target.onAttacked();

    this.calculateRoundAnimations(creature, combatAction);

    let attackAnimation = creature.model.getAnimationByName(combatAction.animationName);
    let attackDamageDelay = attackAnimation?.getDamageDelay() || 0;

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
        if(attack){
          if(
            attack.attackResult == AttackResult.HIT_SUCCESSFUL || 
            attack.attackResult == AttackResult.CRITICAL_HIT || 
            attack.attackResult == AttackResult.AUTOMATIC_HIT 
          ){
            attack.applyDamageEffectToCreature(creature, this.action.target as ModuleCreature);
            const floatingText = TextSprite3D.CreateOnObject(this.action.target, attack.getTotalDamage().toString(), TextSprite3DType.HOSTILE, 1500);
            floatingText.container.position.z += 0.25 + (0.1 * i);
          }else if(attack.attackResult == AttackResult.MISS){
            const floatingText = TextSprite3D.CreateOnObject(this.action.target, 'miss', TextSprite3DType.NEUTRAL, 1500);
            floatingText.container.position.z += 0.25 + (0.1 * i);
          }
        }
      }
    }

  }

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
      
      if(creature instanceof ModuleCreature){
        creature.playTwoDAAnimation(combatAction.twoDAAnimation);
        creature.animationState.index = ModuleCreatureAnimState.ATTACK;
      }

      if(combatAction.target instanceof ModuleCreature){
        switch(combatAction.attackResult){
          case AttackResult.HIT_SUCCESSFUL:
          case AttackResult.CRITICAL_HIT:
          case AttackResult.AUTOMATIC_HIT:
            combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animationName ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
          break;
          case AttackResult.PARRIED:
            combatAction.target.playTwoDAAnimation( combatAction.target.getParryAnimation( combatAction.animationName ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.PARRY;
          break;
          default:
            combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animationName ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
          break;
        }
      }

    }else{
      
      if(
        combatAction.attackResult == AttackResult.HIT_SUCCESSFUL || 
        combatAction.attackResult == AttackResult.CRITICAL_HIT
      ){

        if(creature instanceof ModuleCreature){
          creature.playTwoDAAnimation( combatAction.twoDAAnimation );
          creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(combatAction.target instanceof ModuleCreature){
          if(
            combatAction.target.animationState.index == ModuleCreatureAnimState.IDLE || 
            combatAction.target.animationState.index == ModuleCreatureAnimState.READY
          ){
            if(combatAction.target.combatData.lastAttackTarget == creature && combatAction.target instanceof ModuleCreature){
              if(!this.attacksIncludeKillingBlow() && combatAction.target instanceof ModuleCreature){
                combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animationName ) );
                combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
              }
            }
          }
        }
        
      }else{
        
        if(creature instanceof ModuleCreature){
          creature.playTwoDAAnimation( combatAction.twoDAAnimation );
          creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(combatAction.target instanceof ModuleCreature){
          if(
            combatAction.target.animationState.index == ModuleCreatureAnimState.IDLE || 
            combatAction.target.animationState.index == ModuleCreatureAnimState.READY
          ){
            if(combatAction.target.combatData.lastAttackTarget == creature){
              if(!this.attacksIncludeKillingBlow() && combatAction.target instanceof ModuleCreature){
                combatAction.target.playTwoDAAnimation( combatAction.target.getDodgeAnimation( combatAction.animationName ) );
                combatAction.target.animationState.index = ModuleCreatureAnimState.DODGE;
              }
            }
          }
        }
      }
    }

  }

  calculateTwoWeaponPenalty(creature: ModuleCreature, weapon: ModuleItem, slot: ModuleCreatureArmorSlot.RIGHTHAND|ModuleCreatureArmorSlot.LEFTHAND){
    let penalty = 0;
    if(!creature) return penalty;
    if(creature.isSimpleCreature()) return penalty;
    if(slot == ModuleCreatureArmorSlot.RIGHTHAND){
      if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_FIGHTING)){
        penalty += 6;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_ADVANCED)){
        penalty += 4;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_MASTERY)){
        penalty += 2;
      }else{
        penalty += 6;
      }
      if(
        creature.equipment.RIGHTHAND.getBaseItem().weaponWield == WeaponWield.TWO_HANDED_SWORD || 
        creature.equipment.RIGHTHAND.getBaseItem().weaponWield == WeaponWield.BLASTER_PISTOL
      ){
        penalty -= 2;
      }
    }else{
      if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_FIGHTING)){
        penalty += 6;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_ADVANCED)){
        penalty += 4;
      }else if(creature.getHasFeat(CombatFeatType.TWO_WEAPON_MASTERY)){
        penalty += 2;
      }else{
        penalty += 10;
      }
      if(creature.equipment.LEFTHAND.getBaseItem().weaponSize == WeaponSize.SMALL){
        penalty -= 2;
      }
    }
    return penalty;
  }

  attacksIncludeKillingBlow(){
    for(let i = 0; i < 5; i++){
      if(this.attackList[i].killingBlow) return true;
    }
    return false;
  }

  toStruct(structIdx: number = 0xCADA){
    const struct = new GFFStruct(structIdx);

    return struct;
  }

  static GetMod(val=0){
    return Math.floor( ( val - 10 ) / 2 );
  }

}