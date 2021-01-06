class TalentObject {

  constructor(properties = {}){
    this.properties = properties;
    this.id = properties.id;
  }

  useTalentOnObject(oTarget, oCaster){
    //console.log('useTalentOnObject', oCaster, this, oTarget);
  }

  talentCombatRoundEnd(oTarget, oCaster){
    //console.log('talentCombatRoundEnd', oCaster, this, oTarget);
  }

  update(oTarget, oCaster, combatAction, delta){

  }

  inRange(oTarget, oCaster){
    return true;
  }

  getCastRange(){
    return 1;
  }

}

module.exports = TalentObject;