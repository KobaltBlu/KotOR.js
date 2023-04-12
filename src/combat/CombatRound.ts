import { ModuleCreature, ModuleItem, ModuleObject } from "../module";
import { CombatAttackData, CombatEngine, CombatRoundAction } from ".";
import { GFFStruct } from "../resource/GFFStruct";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { ActionType } from "../enums/actions/ActionType";
import * as THREE from "three";
import { SSFObjectType } from "../interface/resource/SSFType";
import { AttackResult } from "../enums/combat/AttackResult";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { Dice } from "../utility/Dice";
import { DiceType } from "../enums/combat/DiceType";

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
  numAOOs: number = 1;
  numCleaves: number = 1;
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
    if(!(this.owner instanceof ModuleCreature)) return;

    this.roundStarted = true;

    this.onHandAttacks = this.owner.equipment.LEFTHAND instanceof ModuleItem ? 1 : 0;
    this.offHandTaken = false;

    this.spellCastRound = false;
    this.deflectArrow = true;

    const combatData = this.owner.combatData;

    combatData.lastAttackTarget = undefined;
    combatData.lastSpellTarget = undefined;

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
            }
          }
        }
      }else if(this.action.actionType == CombatActionType.CAST_SPELL){
        this.spellCastRound = true;
      }
    }
  }

  endCombatRound(){
    this.roundStarted = false;
    const combatData = this.owner.combatData;
    combatData.lastCombatFeatUsed = undefined;
    combatData.lastForcePowerUsed = undefined;

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

    if(!combatAction.isCutsceneAttack){
      combatAction.attackResult = AttackResult.MISS
      combatAction.attackDamage = 0;
      if(creature instanceof ModuleCreature){
        if(!creature.isSimpleCreature()){

          if(creature.equipment.RIGHTHAND instanceof ModuleItem){
            //Roll to hit
            let hits = Dice.roll(1, DiceType.d20, creature.getBaseAttackBonus() + creature.equipment.RIGHTHAND.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
              //Roll damage
              combatAction.attackDamage += creature.equipment.RIGHTHAND.getBaseDamage() + creature.equipment.RIGHTHAND.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.RIGHTHAND.getWeaponType() == 1){
                combatAction.attackDamage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creature.equipment.LEFTHAND instanceof ModuleItem){
            //Roll to hit
            let hits = Dice.roll(1, DiceType.d20, creature.getBaseAttackBonus() + creature.equipment.LEFTHAND.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
              //Roll damage
              combatAction.attackDamage += creature.equipment.LEFTHAND.getBaseDamage() + creature.equipment.LEFTHAND.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.LEFTHAND.getWeaponType() == 1){
                combatAction.attackDamage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }
          
          //TOOD: Bonus attacks

        }else{

          if(creature.equipment.CLAW1 instanceof ModuleItem){
            //Roll to hit
            let hits = Dice.roll(1, DiceType.d20, creature.getBaseAttackBonus() + creature.equipment.CLAW1.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
              //Roll damage
              combatAction.attackDamage += creature.equipment.CLAW1.getMonsterDamage() + creature.equipment.CLAW1.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.CLAW1.getWeaponType() == 1){
                combatAction.attackDamage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creature.equipment.CLAW2 instanceof ModuleItem){
            //Roll to hit
            let hits = Dice.roll(1, DiceType.d20, creature.getBaseAttackBonus() + creature.equipment.CLAW2.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
              //Roll damage
              combatAction.attackDamage += creature.equipment.CLAW2.getMonsterDamage() + creature.equipment.CLAW2.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.CLAW2.getWeaponType() == 1){
                combatAction.attackDamage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creature.equipment.CLAW3 instanceof ModuleItem){
            //Roll to hit
            let hits = Dice.roll(1, DiceType.d20, creature.getBaseAttackBonus() + creature.equipment.CLAW3.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
              //Roll damage
              combatAction.attackDamage += creature.equipment.CLAW3.getMonsterDamage() + creature.equipment.CLAW3.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.CLAW3.getWeaponType() == 1){
                combatAction.attackDamage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }
        }
      }
    }
    combatAction.target.combatData.lastAttacker = creature;
    combatAction.target.onAttacked();

    let attackAnimation = creature.model.getAnimationByName(combatAction.animationName);
    let attackDamageDelay = attackAnimation?.getDamageDelay() || 0;

    creature.combatData.lastAttackResult = combatAction.attackResult;

    if(combatAction.isCutsceneAttack){
      
      if(creature instanceof ModuleCreature){
        creature.playTwoDAAnimation(combatAction.twoDAAnimation);
        creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        console.log('attacker', creature.animationState.animation, creature.animationState);
      }

      if(combatAction.target instanceof ModuleCreature){
        switch(combatAction.attackResult){
          case AttackResult.HIT_SUCCESSFUL:
          case AttackResult.CRITICAL_HIT:
          case AttackResult.AUTOMATIC_HIT:
            combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animationName ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
            console.log('attackee', combatAction.target.animationState.animation, combatAction.target.animationState);
          break;
          case AttackResult.PARRIED:
            combatAction.target.playTwoDAAnimation( combatAction.target.getParryAnimation( combatAction.animationName ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.PARRY;
            console.log('attackee', combatAction.target.animationState.animation, combatAction.target.animationState);
          break;
          default:
            combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animationName ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
            console.log('attackee', combatAction.target.animationState.animation, combatAction.target.animationState);
          break;
        }
      }

      if(combatAction.attackDamage){
        combatAction.target.damage(combatAction.attackDamage, undefined, attackDamageDelay);
      }

    }else{

      if(hasAssuredHit){
        combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
      }
      
      //Roll to hit
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
            // let targetAnimation = OdysseyModelAnimation.GetAnimation2DA(combatAction.target.overlayAnimation);
            if(/*!targetAnimation ||*/ combatAction.target.combatData.lastAttackTarget == creature && combatAction.target instanceof ModuleCreature){
              //if(!targetAnimation || (!targetAnimation.attack)){
                if(combatAction.target instanceof ModuleCreature){
                  combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animationName ) );
                  combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
                }
              //}
            }
          }
        }

        combatAction.target.damage(combatAction.attackDamage, creature, attackDamageDelay);
        
      }else{

        combatAction.target.combatData.lastAttacker = creature;
        if(creature instanceof ModuleCreature){
          creature.playTwoDAAnimation( combatAction.twoDAAnimation );
          creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(combatAction.target instanceof ModuleCreature){
          if(
            combatAction.target.animationState.index == ModuleCreatureAnimState.IDLE || 
            combatAction.target.animationState.index == ModuleCreatureAnimState.READY
          ){
            // let targetAnimation = OdysseyModelAnimation.GetAnimation2DA(combatAction.target.overlayAnimation);
            if(/*!targetAnimation ||*/ combatAction.target.combatData.lastAttackTarget == creature){
              //if(!targetAnimation || (!targetAnimation.attack)){
                if(combatAction.target instanceof ModuleCreature){
                  combatAction.target.playTwoDAAnimation( combatAction.target.getDodgeAnimation( combatAction.animationName ) );
                  combatAction.target.animationState.index = ModuleCreatureAnimState.DODGE;
                }
              //}
            }
          }
        }
      }
    }

  }

  toStruct(structIdx: number = 0xCADA){
    const struct = new GFFStruct(structIdx);

    return struct;
  }

}