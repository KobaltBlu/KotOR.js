/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CombatEngine class.
 */

class CombatEngine {

  static combatants = [];

  constructor(args = {}){

  }

  static Update(delta = 0){
    //CombatEngine.combatants = [].concat(Game.module.area.creatures).concat(PartyManager.party);
    if(CombatEngine.combatants.length){

      //combatGroups is an array of combatGroups (Arrays) that group objects in combat with each other
      let combatGroups = [];

      //Loop through the active combatants and group them
      for(let i = 0, len = CombatEngine.combatants.length; i < len; i++){
        let combatant = CombatEngine.combatants[i];

        if(!combatant.combatQueue.length && combatant.combatAction == undefined){
          //continue;
        }

        combatant.combatOrder = i;
        let group = undefined;

        //Update the combatant's combatAction if needed
        if(combatant.combatQueue.length && combatant.combatAction == undefined){
          combatant.combatAction = combatant.combatQueue.shift();

          if(typeof combatant.combatAction != 'undefined'){
            if(combatant.combatAction.type == ModuleCreature.ACTION.ATTACKOBJECT){
              combatant.lastCombatFeatUsed = combatant.combatAction.feat;
            }

            if(combatant.combatAction.type == ModuleCreature.ACTION.CASTSPELL){
              combatant.lastForcePowerUsed = combatant.combatAction.spell;
              combatant.lastSpellTarget = combatant.combatAction.target;
              if(combatant.combatAction.target != combatant){
                combatant.lastAttemptedSpellTarget = combatant.combatAction.target;
              }
              combatant.casting.push(combatant.combatAction);
              console.log('CombatEngine: Adding spell to casting', combatant.combatAction, combatant);
            }
          }
        }

        //Find the correct combat list to add the combatant to
        for(let j = 0, len2 = combatGroups.length; j < len2; j++){
          if(combatGroups[j].indexOf(combatant) >= 0){
            group = combatGroups[j];
          }else{
            //Check to see if the combatant's target is in this group
            if(combatant.lastAttemptedAttackTarget){
              if(combatGroups[j].indexOf(combatant.lastAttemptedAttackTarget) >= 0){
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
          if(combatant.lastAttemptedAttackTarget){
            if(group.indexOf(combatant.lastAttemptedAttackTarget) == -1)
              group.push(combatant.lastAttemptedAttackTarget);
          }
        }else{
          if(group.indexOf(combatant) == -1){
            group.push(combatant);
          }
        }
      }

      for (var i = CombatEngine.combatants.length - 1; i >= 0; i--){
        let combatant = CombatEngine.combatants[i];
        if(!combatant.combatQueue.length && combatant.combatAction == undefined){
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
            if(combatant.combatRoundTimer == 0){
              if(combatant.combatAction){
                if(combatant.actionInRange(combatant.combatAction)){
                  combatant.combatAction.ready = true;
                  CombatEngine.CalculateAttackDamage(combatant.combatAction, combatant);
                }else{
                  //Continue to the next combatant in the group since this one can't act yet
                  continue;
                }
              }
            }

            if(combatant.combatRoundTimer >= 1.5){
              //Get the index of the current combatant from the combatants list
              let index = CombatEngine.combatants.indexOf(combatant);
              //Remove the combatant from the combatants list
              CombatEngine.combatants.splice(index, 1);
              //And push it to the end of the combatants list
              CombatEngine.combatants.push( combatant );
              //Reset the combatant's roundTimer
              combatant.combatRoundTimer = 0;
              //Call the combatant's onCombatRoundEnd script
              combatant.onCombatRoundEnd();
            }else{
              //Increment the combatant's roundTimer since it hasn't ended yet
              combatant.combatRoundTimer += delta;
            }

            //Break the loop now that a combatant in the group was updated
            break;
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

    /*if(!CombatEngine.active || Game.Mode != Game.MODES.INGAME){
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
      for(let i = 0, len = Game.module.area.creatures.length; i < len; i++){
        Game.module.area.creatures[i].onCombatRoundEnd();
      }

      for(let i = 0, len = PartyManager.party.length; i < len; i++){
        PartyManager.party[i].onCombatRoundEnd();
      }
      CombatEngine.timer = 0;
    }*/
    
  }

  static CalculateAttackDamage(combatAction = undefined, creature = undefined){

    if(!combatAction || combatAction.damageCalculated)
      return;

    combatAction.damageCalculated = true;

    if(!combatAction.isCutsceneAttack){

      combatAction.hits = 0;
      combatAction.damage = 0;

      if(!creature.isSimpleCreature()){

        if(creature.equipment.RIGHTHAND instanceof ModuleItem){
          //Roll to hit
          let hits = CombatEngine.DiceRoll(1, 'd20', creature.getBaseAttackBonus() + creature.equipment.RIGHTHAND.getAttackBonus()) > CombatEngine.GetArmorClass(combatAction.target);
          if(hits){
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
          if(hits){
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
          if(hits){
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
          if(hits){
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
          if(hits){
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
      
      combatAction.target.lastAttacker = this;
      combatAction.target.onAttacked();
    }

    let attackAnimation = creature.model.getAnimationByName(combatAction.animation);

    creature.setFacing(
      Math.atan2(
        creature.position.y - combatAction.target.position.y,
        creature.position.x - combatAction.target.position.x
      ) + Math.PI/2,
      false
    );

    let attack_sound = THREE.Math.randInt(0, 2);
    switch(attack_sound){
      case 1:
        creature.PlaySoundSet(SSFObject.TYPES.ATTACK_2);
      break;
      case 2:
        creature.PlaySoundSet(SSFObject.TYPES.ATTACK_3);
      break;
      default:
        creature.PlaySoundSet(SSFObject.TYPES.ATTACK_1);
      break;
    }

    if(combatAction.isCutsceneAttack){

      creature.getModel().playAnimation(combatAction.animation, false);
      //combatAction.target.actionPlayAnimation(combatAction.target.getDamageAnimation(), false);
      combatAction.target.overlayAnimation = combatAction.target.getDamageAnimation();

      let painsound = THREE.Math.randInt(0, 1);
      switch(painsound){
        case 1:
          combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_2);
        break;
        default:
          combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_1);
        break;
      }

      if(combatAction.damage)
        combatAction.target.subtractHP(combatAction.damage);

      setTimeout( () => {
        creature.actionQueue.shift();
      }, attackAnimation.length * 500);

    }else{
      //Roll to hit
      if(combatAction.hits){
        
        creature.getModel().playAnimation(combatAction.animation, false);
        //combatAction.target.overlayAnimation = combatAction.target.getDamageAnimation();

        let painsound = THREE.Math.randInt(0, 1);
        switch(painsound){
          case 1:
            combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_2);
          break;
          default:
            combatAction.target.PlaySoundSet(SSFObject.TYPES.PAIN_1);
          break;
        }

        /*setTimeout( () => {
          combatAction.target.damage(combatAction.damage, this);
        }, attackAnimation.length * 500)*/
        
      }else{
        combatAction.target.lastAttacker = this;
        creature.getModel().playAnimation(combatAction.animation, false);
        combatAction.target.overlayAnimation = combatAction.target.getDodgeAnimation();
        //combatAction.target.getModel().playAnimation(combatAction.target.getDodgeAnimation(), false);
      }
    }

  }

  static InitiativeSort(a, b){
    return a.initiative - b.initiative;
  }

  static GroupSort(a, b){
    return a.combatOrder - b.combatOrder;
  }

  static CombatActive(){
    return CombatEngine.combatants.length;
  }

  static IsActiveCombatant(combatant = undefined){
    return CombatEngine.combatants.indexOf(combatant) >= 0;
  }

  static AddCombatant(combatant = undefined){
    //console.log('AddCombatant', combatant);
    if(!CombatEngine.IsActiveCombatant(combatant)){
      combatant.initiative = CombatEngine.DiceRoll(1, 'd20');
      combatant.combatRoundTimer = 0;
      let index = 0;
      for(let i = 0, len = CombatEngine.combatants.length; i < len; i++){
        if(CombatEngine.combatants[i].initiative < combatant.initiative){
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

  static RemoveCombatant(combatant = undefined){
    let index = CombatEngine.combatants.indexOf(combatant);
    if(index >= 0){
      CombatEngine.combatants.splice(index, 1);
    }
  }

  static GetArmorClass(creature = null){
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

  static GetCreatureAttackDice(creature = null){
    if(creature instanceof ModuleCreature){

      if(!creature.isSimpleCreature()){

        let rWeapon = creature.equipment.RIGHTHAND;

        if(rWeapon){
          return {
            num: parseInt(rWeapon.getBaseItem().numdice),
            type: 'd'+rWeapon.getBaseItem().dietoroll
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
              let _2daName = Global.kotor2DA['iprp_costtable'].rows[19].name;

              let cost = Global.kotor2DA[_2daName.toLowerCase()].rows[costTableValue];
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

CombatEngine.active = true;
CombatEngine.timer = 0;
CombatEngine.roundLength = 3;
CombatEngine.roundType = 0;

CombatEngine.ROUNDTYPES = {
  NONE: 0,
  PLAYER: 1,
  CREATURE: 2
};

module.exports = CombatEngine;