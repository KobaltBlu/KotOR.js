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

    if(CombatEngine.combatants.length){

      //combatGroups is an array of combatGroups (Arrays) that group object in combat eith eachother
      let combatGroups = [];

      //Loop through the active combatants and group them
      for(let i = 0, len = CombatEngine.combatants.length; i < len; i++){
        let combatant = CombatEngine.combatants[i];
        combatant.combatOrder = i;
        let group = undefined;

        //Update the combatant's combatAction if needed
        if(combatant.combatQueue.length && combatant.combatAction == undefined){
          combatant.combatAction = combatant.combatQueue.shift();
        }

        //Find the correct combat list to add the combatant to
        for(let j = 0, len2 = combatGroups.length; j < len2; j++){
          if(combatGroups[j].indexOf(combatant) >= 0){
            group = combatGroups[j];
          }else{
            //Check to see if the combatant's target in in this group
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

      CombatEngine.combatGroups = combatGroups;
      
      //Loop through the active combatant groups
      for(let i = 0, len = combatGroups.length; i < len; i++){
        //Sort the combatGroup to make sure the combatants stay in the correct order
        combatGroups[i].sort(CombatEngine.GroupSort);

        //Get the first combatant of the group
        let combatant = combatGroups[i][0];
        if(!combatant.isDead()){

          if(combatant.combatRoundTimer == 0){
            if(combatant.combatAction){
              if(combatant.actionInRange(combatant.combatAction)){
                combatant.combatAction.ready = true;
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

        }else{
          //Remove dead combatants from the initiative order
          CombatEngine.combatants.splice(0, 1);
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
      //Add the combatant to the list respectful of it's initiative
      CombatEngine.combatants.splice(index, 0, combatant);
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
      var atkToHit = CombatEngine.GetMod(creature.getDEX());
      return 10 + atkToHit;
    }
    return 10;
  }

  static GetCreatureAttackDice(creature = null){
    if(creature instanceof ModuleCreature){

      if(!creature.isSimpleCreature()){

        let rWeapon = creature.equipment.RIGHTHAND;

        if(rWeapon){

          rWeapon.dietoroll

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
          for(let i =0; i < wProps.length; i++){
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
    return ( ( val - 10 ) / 2 );
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