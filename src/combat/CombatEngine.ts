/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ActionType } from "../enums/actions/ActionType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { SSFObjectType } from "../interface/resource/SSFType";
import { ModuleCreature, ModuleItem, ModuleObject } from "../module";

import * as THREE from "three";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { OdysseyModelAnimation } from "../odyssey";
import { TwoDAManager } from "../managers/TwoDAManager";
import { CombatAction } from "../interface/combat/CombatAction";
import { AttackResult } from "../enums/combat/AttackResult";

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

        const duelingCreatures: ModuleObject[] = [];

        for(let j = 0, jlen = combatGroups[i].length; j < jlen; j++){

          //Get the current combatant in the group
          const combatant = combatGroups[i][j];
          if(combatant.isDead()) continue;
          if(!combatant.combatData.combatAction) continue;
          const combatAction = combatant.combatData.combatAction;

          //check for dueling creatures
          if( combatant.isDueling() ){
            const target = combatAction.target;
            if( !combatant.isDebilitated() && !target.isDebilitated() ){
              if( 
                combatant.actionInRange(combatAction.action) && 
                target.actionInRange(target.combatData.combatAction.action) 
              ){
                duelingCreatures.push(combatant);
                continue;
              }
            }
          }

          //Combat action is ready
          if(!combatAction.ready){
            if(!combatant.isDebilitated() && combatant.actionInRange(combatAction.action)){
              combatAction.ready = true;
            }
          }

          //Progress the combatant's combatRoundTimer
          if(combatAction.ready){
            if(!combatAction.damageCalculated){
              console.log('CalculateAttackDamage', 'generic');
              CombatEngine.CalculateAttackDamage(combatAction, combatant as ModuleCreature);
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
              console.log('onCombatRoundEnd', 'generic');
              combatant.onCombatRoundEnd();
              combatant.clearCombatAction(combatAction);
            }else{
              //Increment the combatant's roundTimer since it hasn't ended yet
              combatant.combatData.combatActionTimer += delta;
            }
          }

        }

        //DuelingCreatures Logic
        if(duelingCreatures.length){
          if(duelingCreatures.length == 2){
            const attaker = duelingCreatures[0];
            const target = duelingCreatures[1];
            if(attaker && target){
              const attakerCombatAction = attaker.combatData.combatAction;
              const targetCombatAction = target.combatData.combatAction;
              //Combat action is ready
              target.combatData.combatActionTimer = attaker.combatData.combatActionTimer;
              if(!attakerCombatAction.ready && attaker.combatData.combatActionTimer >= 0.0){
                attakerCombatAction.ready = true;
              }

              if(!targetCombatAction.ready && target.combatData.combatActionTimer >= 1.5){
                targetCombatAction.ready = true;
              }

              //Progress the attacker's combatRoundTimer
              if(attakerCombatAction.ready){
                if(!attakerCombatAction.damageCalculated){
                  console.log('CalculateAttackDamage', 'attacker');
                  CombatEngine.CalculateAttackDamage(attakerCombatAction, attaker as ModuleCreature);
                }
                if(attaker.combatData.combatActionTimer >= 3.0){
                  //Get the index of the current combatant from the combatants list
                  let index = CombatEngine.combatants.indexOf(attaker);
                  //Remove the combatant from the combatants list
                  CombatEngine.combatants.splice(index, 1);
                  //And push it to the end of the combatants list
                  CombatEngine.combatants.push( attaker );
                  //Reset the combatant's roundTimer
                  attaker.combatData.combatActionTimer = 0;
                  //Call the combatant's onCombatRoundEnd script
                  console.log('onCombatRoundEnd', 'attacker');
                  attaker.onCombatRoundEnd();
                  attaker.clearCombatAction(attakerCombatAction);
                }else{
                  //Increment the combatant's roundTimer since it hasn't ended yet
                  attaker.combatData.combatActionTimer += delta;
                }
              }

              //Progress the target's combatRoundTimer
              if(targetCombatAction.ready){
                if(!targetCombatAction.damageCalculated){
                  console.log('CalculateAttackDamage', 'target');
                  CombatEngine.CalculateAttackDamage(targetCombatAction, target as ModuleCreature);
                }
                if(target.combatData.combatActionTimer >= 3.0){
                  //Get the index of the current combatant from the combatants list
                  let index = CombatEngine.combatants.indexOf(target);
                  //Remove the combatant from the combatants list
                  CombatEngine.combatants.splice(index, 1);
                  //And push it to the end of the combatants list
                  CombatEngine.combatants.push( target );
                  //Reset the combatant's roundTimer
                  target.combatData.combatActionTimer = 0;
                  //Call the combatant's onCombatRoundEnd script
                  console.log('onCombatRoundEnd', 'target');
                  target.onCombatRoundEnd();
                  target.clearCombatAction(targetCombatAction);
                }
              }
            }
          }else if(duelingCreatures.length > 2){
            console.warn('Too many creatures dueling the same target', duelingCreatures);
          }else if(duelingCreatures.length < 2){
            console.warn('Not enough creatures dueling the same target', duelingCreatures);
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
    
  }

  static CalculateAttackDamage(combatAction: CombatAction, creature: ModuleCreature){
    if(!combatAction || combatAction.damageCalculated)
      return;

    combatAction.damageCalculated = true;
    const hasAssuredHit = creature.hasEffect(GameEffectType.EffectAssuredHit);

    if(!combatAction.isCutsceneAttack){

      combatAction.hits = false;
      combatAction.damage = 0;
      if(creature instanceof ModuleCreature){
        if(!creature.isSimpleCreature()){

          if(creature.equipment.RIGHTHAND instanceof ModuleItem){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creature.getBaseAttackBonus() + creature.equipment.RIGHTHAND.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creature.equipment.RIGHTHAND.getBaseDamage() + creature.equipment.RIGHTHAND.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.RIGHTHAND.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creature.equipment.LEFTHAND instanceof ModuleItem){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creature.getBaseAttackBonus() + creature.equipment.LEFTHAND.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creature.equipment.LEFTHAND.getBaseDamage() + creature.equipment.LEFTHAND.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.LEFTHAND.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }
          
          //TOOD: Bonus attacks

        }else{

          if(creature.equipment.CLAW1 instanceof ModuleItem){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creature.getBaseAttackBonus() + creature.equipment.CLAW1.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creature.equipment.CLAW1.getMonsterDamage() + creature.equipment.CLAW1.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.CLAW1.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creature.equipment.CLAW2 instanceof ModuleItem){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creature.getBaseAttackBonus() + creature.equipment.CLAW2.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creature.equipment.CLAW2.getMonsterDamage() + creature.equipment.CLAW2.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.CLAW2.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creature.getSTR() - 10) / 2);
              }
            }
            //TOOD: Log to combat menu
          }

          if(creature.equipment.CLAW3 instanceof ModuleItem){
            //Roll to hit
            let hits = CombatEngine.DiceRoll(1, 'd20', creature.getBaseAttackBonus() + creature.equipment.CLAW3.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
            if(hits || hasAssuredHit){
              combatAction.hits = true;
              //Roll damage
              combatAction.damage += creature.equipment.CLAW3.getMonsterDamage() + creature.equipment.CLAW3.getDamageBonus();
              //Add strength MOD to melee damage
              if(creature.equipment.CLAW3.getWeaponType() == 1){
                combatAction.damage += Math.floor(( creature.getSTR() - 10) / 2);
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
        creature.PlaySoundSet(SSFObjectType.ATTACK_2);
      break;
      case 2:
        creature.PlaySoundSet(SSFObjectType.ATTACK_3);
      break;
      default:
        creature.PlaySoundSet(SSFObjectType.ATTACK_1);
      break;
    }

    if(combatAction.isCutsceneAttack){

      if(hasAssuredHit){
        combatAction.attackResult = AttackResult.HIT_SUCCESSFUL;
      }
      
      if(creature instanceof ModuleCreature){
        creature.playTwoDAAnimation(combatAction.animation);
        creature.animationState.index = ModuleCreatureAnimState.ATTACK;
        console.log('attacker', creature.animationState.animation, creature.animationState);
      }

      if(combatAction.target instanceof ModuleCreature){
        switch(combatAction.attackResult){
          case AttackResult.HIT_SUCCESSFUL:
          case AttackResult.CRITICAL_HIT:
          case AttackResult.AUTOMATIC_HIT:
            combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animation.name ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
            console.log('attackee', combatAction.target.animationState.animation, combatAction.target.animationState);
          break;
          case AttackResult.PARRIED:
            combatAction.target.playTwoDAAnimation( combatAction.target.getParryAnimation( combatAction.animation.name ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.PARRY;
            console.log('attackee', combatAction.target.animationState.animation, combatAction.target.animationState);
          break;
          default:
            combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animation.name ) );
            combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
            console.log('attackee', combatAction.target.animationState.animation, combatAction.target.animationState);
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

        if(creature instanceof ModuleCreature){
          creature.playTwoDAAnimation( combatAction.animation );
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
                  combatAction.target.playTwoDAAnimation( combatAction.target.getDamageAnimation( combatAction.animation.name ) );
                  combatAction.target.animationState.index = ModuleCreatureAnimState.DAMAGE;
                }
              //}
            }
          }
        }

        combatAction.target.damage(combatAction.damage, creature, attackDamageDelay);
        
      }else{
        creature.combatData.lastAttackResult = AttackResult.MISS;

        combatAction.target.combatData.lastAttacker = creature;
        if(creature instanceof ModuleCreature){
          creature.playTwoDAAnimation( combatAction.animation );
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
                  combatAction.target.playTwoDAAnimation( combatAction.target.getDodgeAnimation( combatAction.animation.name ) );
                  combatAction.target.animationState.index = ModuleCreatureAnimState.DODGE;
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
    if(creature instanceof ModuleCreature){
      return creature.getAC();
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
    if(creature instanceof ModuleCreature){

      if(!creature.isSimpleCreature()){

        let rWeapon = creature.equipment.RIGHTHAND;

        if(rWeapon){
          return {
            num: rWeapon._baseItem.numDice,
            type: 'd'+rWeapon._baseItem.dieToRoll
          };
        }

      }else{
        
        let claw1 = creature.equipment.CLAW1;
        let claw2 = creature.equipment.CLAW2;
        let claw3 = creature.equipment.CLAW3;

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
