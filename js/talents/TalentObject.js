class TalentObject {

  constructor( id = -1 ){
    this.id = id;
    this.item = undefined;
    this.itemPropertyIndex = -1;
    this.casterLevel = 0;
    this.metaMagic = 0;
  }

  getId(){
    return this.id;
  }

  useTalentOnObject(oTarget, oCaster){
    this.oCaster = oCaster;
    this.oTarget = oTarget;
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

  setItem( item = undefined ){
    this.item = item;
  }

  setItemPropertyIndex( itemPropertyIndex = -1 ){
    this.itemPropertyIndex = itemPropertyIndex;
  }

  setCasterLevel( casterLevel = 0 ){
    this.casterLevel = casterLevel;
  }

  setMetaType( metaMagic = 0 ){
    this.metaMagic = metaMagic;
  }

}

module.exports = TalentObject;