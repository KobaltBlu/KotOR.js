/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ActionType } from "../enums/actions/ActionType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { SSFObjectType } from "../interface/resource/SSFType";
import type { ModuleCreature, ModuleObject } from "../module";

import * as THREE from "three";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { OdysseyModelAnimation } from "../odyssey";
import { CombatAction } from "../interface/combat/CombatAction";
import { AttackResult } from "../enums/combat/AttackResult";
import { TwoDAManager } from "../managers";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";

/* @file
 * The CombatEngine class.
 */

export class CombatEngine {

  

  static active = true;
  static timer = 0;
  static roundLength = 3;
  static roundType = 0;
  static combatants: ModuleObject[] = [];
  static combatGroups: ModuleObject[][] = [];

  constructor(args = {}){

  }

  static Update(delta = 0){
    //CombatEngine.combatants = [].concat(GameState.module.area.creatures).concat(PartyManager.party);
    if(CombatEngine.combatants.length){

      //combatGroups is an array of combatGroups (Arrays) that group objects in combat with each other
      let combatGroups: ModuleObject[][] = [];

      //Loop through the active combatants and group them
      for(let i = 0, len = CombatEngine.combatants.length; i < len; i++){
        let combatant = CombatEngine.combatants[i];

        if(!combatant.combatData.combatQueue.length && combatant.combatData.combatAction == undefined){
          //continue;
          // if(combatant.action && combatant.action.combatAction && combatant.action.combatAction.isCutsceneAttack){
          //   if(combatant.combatData.combatAction != combatant.action.combatAction){
          //     combatant.clearCombatAction(combatant.combatData.combatAction);
          //     combatant.combatData.setCombatAction(combatant.action.combatAction);
          //   }
          // }
        }

        combatant.combatOrder = i;
        let group = undefined;

        //Update the combatant's combatAction if needed
        if(combatant.combatData.combatQueue.length && combatant.combatData.combatAction == undefined){
          combatant.clearCombatAction(combatant.combatData.combatAction);
          combatant.combatData.setCombatAction(combatant.combatData.combatQueue.shift());

          //Make sure the action is in the actionQueue
          if(combatant.combatData.combatAction?.action){
            if(combatant.actionQueue.indexOf(combatant.combatData.combatAction.action)){
              combatant.actionQueue.add(combatant.combatData.combatAction.action);
            }
          }

          if(typeof combatant.combatData.combatAction != 'undefined'){
            if(combatant.combatData.combatAction.type == ActionType.ActionPhysicalAttacks){
              combatant.combatData.lastCombatFeatUsed = combatant.combatData.combatAction.feat;
            }

            if(combatant.combatData.combatAction.type == ActionType.ActionCastSpell){
              combatant.combatData.lastForcePowerUsed = combatant.combatData.combatAction.spell;
              combatant.combatData.lastSpellTarget = combatant.combatData.combatAction.target;
              if(combatant.combatData.combatAction.target != combatant){
                combatant.combatData.lastAttemptedSpellTarget = combatant.combatData.combatAction.target;
              }
              combatant.casting.push(combatant.combatData.combatAction);
              //console.log('CombatEngine: Adding spell to casting', combatant.combatAction, combatant);
            }
          }
        }

        //Find the correct combat list to add the combatant to
        for(let j = 0, len2 = combatGroups.length; j < len2; j++){
          if(combatGroups[j].indexOf(combatant) >= 0){
            group = combatGroups[j];
          }else{
            //Check to see if the combatant's target is in this group
            if(combatant.combatData.lastAttemptedAttackTarget){
              if(combatGroups[j].indexOf(combatant.combatData.lastAttemptedAttackTarget) >= 0 ){// && combatant.isDuelingObject(combatant.lastAttemptedAttackTarget) ){
                group = combatGroups[j];
              }
            }
          }
        }

        //Create a new combat group if one was not found or add the combatant to the found group
        if(group === undefined){
          group = [combatant];
          combatGroups.push(group);

          //Add the combatant's current target to the group
          if(combatant.combatData.lastAttemptedAttackTarget ){// && combatant.isDuelingObject(combatant.lastAttemptedAttackTarget)){
            if(group.indexOf(combatant.combatData.lastAttemptedAttackTarget) == -1)
              group.push(combatant.combatData.lastAttemptedAttackTarget);
          }
        }else{
          if(group.indexOf(combatant) == -1){
            group.push(combatant);
          }
        }
      }

      for (let i = CombatEngine.combatants.length - 1; i >= 0; i--){
        let combatant = CombatEngine.combatants[i];
        if(!combatant.combatData.combatQueue.length && combatant.combatData.combatAction == undefined){
          //CombatEngine.RemoveCombatant(combatant);
        }
      }

      CombatEngine.combatGroups = combatGroups;
      
      //Loop through the active combatant groups
      for(let i = 0, len = combatGroups.length; i < len; i++){
        //Sort the combatGroup to make sure the combatants stay in the correct order
        combatGroups[i].sort(CombatEngine.GroupSort);

        for(let j = 0, jlen = combatGroups[i].length; j < jlen; j++){

          //Get the first combatant of the group
          let combatant = combatGroups[i][j];
          if(!combatant.isDead()){

            if(combatant.combatData.combatAction){
              //BEGIN: DUELING SYNC
              if(!combatant.combatData.combatAction.ready){
                //Check to see if the combatant is dueling it's target. If so make sure the target's combatRoundTimer is synced properly
                if(combatant.isDueling() && combatant.combatData.combatAction){
                  // combatant.combatData.combatAction.target.combatRoundTimer = 1.5 - delta;
                }
              }
              //END: DUELING SYNC

              //Combat action is ready
              if(!combatant.combatData.combatAction.ready){
                if(!combatant.isDebilitated() && combatant.actionInRange(combatant.combatData.combatAction.action)){
                  combatant.combatData.combatAction.ready = true;
                }
              }

              //Progress the combatant's combatRoundTimer
              if(combatant.combatData.combatAction.ready){
                if(!combatant.combatData.combatAction.damageCalculated){
                  CombatEngine.CalculateAttackDamage(combatant.combatData.combatAction, combatant);
                }
                if(combatant.combatData.combatActionTimer >= 3.0){
                  //Get the index of the current combatant from the combatants list
                  let index = CombatEngine.combatants.indexOf(combatant);
                  //Remove the combatant from the combatants list
                  CombatEngine.combatants.splice(index, 1);
                  //And push it to the end of the combatants list
                  CombatEngine.combatants.push( combatant );
                  //Reset the combatant's roundTimer
                  combatant.combatData.combatActionTimer = 0;
                  //Call the combatant's onCombatRoundEnd script
                  combatant.onCombatRoundEnd();
                  combatant.clearCombatAction(combatant.combatData.combatAction);
                }else{
                  //Increment the combatant's roundTimer since it hasn't ended yet
                  combatant.combatData.combatActionTimer += delta;
                }
              }

              //Break the loop now that a combatant in the group was updated
              //break;
            }

          }

        }

        //Remove dead combatants from the initiative order
        for (let j = combatGroups[i].length - 1; j >= 0; j--){
          let combatant = combatGroups[i][j];
          if(combatant.isDead()){
            CombatEngine.combatants.splice(0, 1);
          }
        }

      }
    }

    /*if(!CombatEngine.active || GameState.Mode != EngineMode.INGAME){
      CombatEngine.timer = 0;
      return;
    }

    CombatEngine.timer += delta;

    if(CombatEngine.timer >= 0 && CombatEngine.timer < (CombatEngine.roundLength/2)){
      CombatEngine.roundType = CombatEngine.ROUNDTYPES.PLAYER;
    }
    
    if(CombatEngine.timer >= (CombatEngine.roundLength/2) && CombatEngine.timer <= CombatEngine.roundLength){
      CombatEngine.roundType = CombatEngine.ROUNDTYPES.CREATURE;
    }

    if(CombatEngine.timer >= CombatEngine.roundLength){
      for(let i = 0, len = GameState.module.area.creatures.length; i < len; i++){
        GameState.module.area.creatures[i].onCombatRoundEnd();
      }

      for(let i = 0, len = PartyManager.party.length; i < len; i++){
        PartyManager.party[i].onCombatRoundEnd();
      }
      CombatEngine.timer = 0;
    }*/
    
  }

  static CalculateAttackDamage(combatAction: CombatAction, creature: ModuleObject){
    if(!combatAction || combatAction.damageCalculated)
      return;

    combatAction.damageCalculated = true;
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);
    const creatureInstance: ModuleCreature = BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature);
    const targetCreatureInstance: ModuleCreature = BitWise.InstanceOfObject(combatAction.target, ModuleObjectType.ModuleCreature);

    if(!combatAction.isCutsceneAttack){

      combatAction.hits = false;
      combatAction.damage = 0;
      if(creatureInstance){
        if(!creatureInstance.isSimpleCreature()){

          if(creatureInstance.equipment.RIGHTHAND){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creatureInstance.getBaseAttackBonus() + creatureInstance.equipment.RIGHTHAND.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creatureInstance.equipment.RIGHTHAND.getBaseDamage() + creatureInstance.equipment.RIGHTHAND.getDamageBonus();
              //Add strength MOD to melee damage
              if(creatureInstance.equipment.RIGHTHAND.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creatureInstance.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creatureInstance.equipment.LEFTHAND){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creatureInstance.getBaseAttackBonus() + creatureInstance.equipment.LEFTHAND.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creatureInstance.equipment.LEFTHAND.getBaseDamage() + creatureInstance.equipment.LEFTHAND.getDamageBonus();
              //Add strength MOD to melee damage
              if(creatureInstance.equipment.LEFTHAND.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creatureInstance.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }
          
          //TOOD: Bonus attacks

        }else{

          if(creatureInstance.equipment.CLAW1){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creatureInstance.getBaseAttackBonus() + creatureInstance.equipment.CLAW1.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creatureInstance.equipment.CLAW1.getMonsterDamage() + creatureInstance.equipment.CLAW1.getDamageBonus();
              //Add strength MOD to melee damage
              if(creatureInstance.equipment.CLAW1.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creatureInstance.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creatureInstance.equipment.CLAW2){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creatureInstance.getBaseAttackBonus() + creatureInstance.equipment.CLAW2.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creatureInstance.equipment.CLAW2.getMonsterDamage() + creatureInstance.equipment.CLAW2.getDamageBonus();
              //Add strength MOD to melee damage
              if(creatureInstance.equipment.CLAW2.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creatureInstance.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creatureInstance.equipment.CLAW3){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creatureInstance.getBaseAttackBonus() + creatureInstance.equipment.CLAW3.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creatureInstance.equipment.CLAW3.getMonsterDamage() + creatureInstance.equipment.CLAW3.getDamageBonus();
              //Add strength MOD to melee damage
              if(creatureInstance.equipment.CLAW3.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creatureInstance.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }
        }
      }
    }
    combatAction.target.combatData.lastAttacker = creature;
    combatAction.target.onAttacked();

    let attackAnimation = creature.model.getAnimationByName(combatAction.animation.name);
    let attackDamageDelay = attackAnimation?.getDamageDelay() || 0;

    creature.setFacing(
      Math.atan2(
        creature.position.y - combatAction.target.position.y,
        creature.position.x - combatAction.target.position.x
      ) + Math.PI/2,
      false
    );

    let attack_sound = THREE.MathUtils.randInt(0, 2);
    switch(attack_sound){
      case 1:
        creature.playSoundSet(SSFObjectType.ATTACK_2);
      break;
      case 2:
        creature.playSoundSet(SSFObjectType.ATTACK_3);
      break;
      default:
        creature.playSoundSet(SSFObjectType.ATTACK_1);
      break;
    }

    if(combatAction.isCutsceneAttack){

      if(hasAssuredHit){
        combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
      }
      
      if(creatureInstance){
        creatureInstance.playTwoDAAnimation(combatAction.animation);
        creatureInstance.animationState.index = ModuleCreatureAnimState.ATTACK;
        console.log('attacker', creatureInstance.animationState.animation, creatureInstance.animationState);
      }

      if(targetCreatureInstance){
        switch(combatAction.attackResult){
          case AttackResult.HIT_SUCCESSFUL:
          case AttackResult.CRITICAL_HIT:
          case AttackResult.AUTOMATIC_HIT:
            targetCreatureInstance.playTwoDAAnimation( targetCreatureInstance.getDamageAnimation( combatAction.animation.name ) );
            targetCreatureInstance.animationState.index = ModuleCreatureAnimState.DAMAGE;
            console.log('attackee', targetCreatureInstance.animationState.animation, targetCreatureInstance.animationState);
          break;
          case AttackResult.PARRIED:
            targetCreatureInstance.playTwoDAAnimation( targetCreatureInstance.getParryAnimation( combatAction.animation.name ) );
            targetCreatureInstance.animationState.index = ModuleCreatureAnimState.PARRY;
            console.log('attackee', targetCreatureInstance.animationState.animation, targetCreatureInstance.animationState);
          break;
          default:
            targetCreatureInstance.playTwoDAAnimation( targetCreatureInstance.getDamageAnimation( combatAction.animation.name ) );
            targetCreatureInstance.animationState.index = ModuleCreatureAnimState.DAMAGE;
            console.log('attackee', targetCreatureInstance.animationState.animation, targetCreatureInstance.animationState);
          break;
        }
      }

      if(combatAction.damage){
        combatAction.target.damage(combatAction.damage, undefined, attackDamageDelay);
      }

    }else{
      
      //Roll to hit
      if(combatAction.hits){
        creature.combatData.lastAttackResult = AttackResult.HIT_SUCCESSFUL;

        if(creatureInstance){
          creatureInstance.playTwoDAAnimation( combatAction.animation );
          creatureInstance.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(targetCreatureInstance){
          if(
            targetCreatureInstance.animationState.index == ModuleCreatureAnimState.IDLE || 
            targetCreatureInstance.animationState.index == ModuleCreatureAnimState.READY
          ){
            // let targetAnimation = OdysseyModelAnimation.GetAnimation2DA(targetCreatureInstance.overlayAnimation);
            if(/*!targetAnimation ||*/ targetCreatureInstance.combatData.lastAttackTarget == creature){
              //if(!targetAnimation || (!targetAnimation.attack)){
                if(targetCreatureInstance){
                  targetCreatureInstance.playTwoDAAnimation( targetCreatureInstance.getDamageAnimation( combatAction.animation.name ) );
                  targetCreatureInstance.animationState.index = ModuleCreatureAnimState.DAMAGE;
                }
              //}
            }
          }
        }

        combatAction.target.damage(combatAction.damage, creature, attackDamageDelay);
        
      }else{
        creature.combatData.lastAttackResult = AttackResult.MISS;

        combatAction.target.combatData.lastAttacker = creature;
        if(creatureInstance){
          creatureInstance.playTwoDAAnimation( combatAction.animation );
          creatureInstance.animationState.index = ModuleCreatureAnimState.ATTACK;
        }

        if(targetCreatureInstance){
          if(
            targetCreatureInstance.animationState.index == ModuleCreatureAnimState.IDLE || 
            targetCreatureInstance.animationState.index == ModuleCreatureAnimState.READY
          ){
            // let targetAnimation = OdysseyModelAnimation.GetAnimation2DA(targetCreatureInstance.overlayAnimation);
            if(/*!targetAnimation ||*/ targetCreatureInstance.combatData.lastAttackTarget == creature){
              //if(!targetAnimation || (!targetAnimation.attack)){
                if(targetCreatureInstance){
                  targetCreatureInstance.playTwoDAAnimation( targetCreatureInstance.getDodgeAnimation( combatAction.animation.name ) );
                  targetCreatureInstance.animationState.index = ModuleCreatureAnimState.DODGE;
                }
              //}
            }
          }
        }
      }
    }

  }

  static InitiativeSort(a: any, b: any){
    return a.initiative - b.initiative;
  }

  static GroupSort(a: any, b: any){
    return a.combatOrder - b.combatOrder;
  }

  static CombatActive(){
    return CombatEngine.combatants.length;
  }

  static IsActiveCombatant(combatant: ModuleObject){
    return CombatEngine.combatants.indexOf(combatant) >= 0;
  }

  static AddCombatant(combatant: ModuleObject){
    //console.log('AddCombatant', combatant);
    if(!CombatEngine.IsActiveCombatant(combatant)){
      combatant.combatData.initiative = CombatEngine.DiceRoll(1, 'd20');
      combatant.combatData.combatActionTimer = 0;
      let index = 0;
      for(let i = 0, len = CombatEngine.combatants.length; i < len; i++){
        if(CombatEngine.combatants[i].combatData.initiative < combatant.combatData.initiative){
          index = i;
          return;
        }
      }
      //console.log('AddCombatant.index', index, combatant);
      //Add the combatant to the list respectful of it's initiative
      CombatEngine.combatants.splice(index, 0, combatant);
      //Call the combatant's onCombatRoundEnd script
      combatant.onCombatRoundEnd();
    }
  }

  static RemoveCombatant(combatant: ModuleObject){
    let index = CombatEngine.combatants.indexOf(combatant);
    if(index >= 0){
      CombatEngine.combatants.splice(index, 1);
    }
  }

  static GetArmorClass(creature: ModuleObject){
    //console.log(creature);
    const creatureInstance: ModuleCreature = BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature);
    if(creatureInstance){
      return creatureInstance.getAC();
      /*let dexMod = CombatEngine.GetMod(creature.getDEX());
      let baseAC = 10;
      let bonus = 0;
      if(creature.equipment.ARMOR){
        //Base AC bonus applied by the armor if there is one
        bonus += creature.equipment.ARMOR.getACBonus();

        //Dex Bonus Restriction if there is one
        if(dexMod > creature.equipment.ARMOR.getDexBonus()){
          dexMod = creature.equipment.ARMOR.getDexBonus();
        }
      }
      return baseAC + dexMod + bonus;*/
    }
    return 10;
  }

  static GetCreatureAttackDice(creature: ModuleObject){
    const creatureInstance: ModuleCreature = BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature);
    if(creatureInstance){
      if(!creature.isSimpleCreature()){

        let rWeapon = creatureInstance.equipment.RIGHTHAND;

        if(rWeapon){
          return {
            num: rWeapon._baseItem.numDice,
            type: 'd'+rWeapon._baseItem.dieToRoll
          };
        }

      }else{
        let claw1 = creatureInstance.equipment.CLAW1;
        let claw2 = creatureInstance.equipment.CLAW2;
        let claw3 = creatureInstance.equipment.CLAW3;

        if(claw1 || claw2 || claw3){

          let claw = null;

          if(claw1)
            claw = claw1;

          if(claw2)
            claw = claw2;

          if(claw3)
            claw = claw3;

          let wProps = claw.template.GetFieldByLabel('PropertiesList').GetChildStructs();
          for(let i = 0; i < wProps.length; i++){
            let prop = wProps[i];
            let propName = prop.GetFieldByLabel('PropertyName');
            if(propName && propName.GetValue() == 51){
              let costTableIdx = prop.GetFieldByLabel('CostTable').GetValue();
              let costTableValue = prop.GetFieldByLabel('CostValue').GetValue();
              let iprp_costtable2DA = TwoDAManager.datatables.get('iprp_costtable');
              if(iprp_costtable2DA){
                let _2daName = iprp_costtable2DA.rows[19].name;
                let cost2DA = TwoDAManager.datatables.get(_2daName.toLowerCase());
                if(cost2DA){
                  let cost = cost2DA.rows[costTableValue];
                  if(cost){
                    return {
                      num: parseInt(cost.numdice),
                      type: 'd'+cost.die
                    };
                  }
                }
              }
              
            }
          }
        }
      }
    }

    return {
      num: 0,
      type: 'd'+0
    };

  }

  static DiceRoll(num = 1, type = 'd20', mod = 0){
    let total = 0;
    for(let i = 0; i < num; i++){
      switch(type){
        case 'd100':
          total += Math.floor(Math.random() * 100 + 1);
        break;
        case 'd20':
          total += Math.floor(Math.random() * 20 + 1);
        break;
        case 'd12':
          total += Math.floor(Math.random() * 12 + 1);
        break;
        case 'd10':
          total += Math.floor(Math.random() * 10 + 1);
        break;
        case 'd8':
          total += Math.floor(Math.random() * 8 + 1);
        break;
        case 'd6':
          total += Math.floor(Math.random() * 6 + 1);
        break;
        case 'd4':
          total += Math.floor(Math.random() * 4 + 1);
        break;
      }
    }
    //console.log('CombatEngine', 'Rolled a '+type+' '+num+' times for a total of '+total);
    return total + mod;
  }

  static GetMod(val=0){
    return Math.floor( ( val - 10 ) / 2 );
  }

  static Reset(){
    CombatEngine.combatants = [];
  }

}
