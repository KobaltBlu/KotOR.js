/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CombatEngine class.
 */

class CombatEngine {

  constructor(args = {}){

  }

  static Update(delta = 0){

    if(!CombatEngine.active){
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