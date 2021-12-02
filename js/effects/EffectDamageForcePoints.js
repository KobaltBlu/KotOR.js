class EffectDamageForcePoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDamageForcePoints;
    
    //intList[0] : damage amount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    this.object.subFP(this.getAmount());
  }

  getAmount(){
    return this.getInt(0);
  }

}

module.exports = EffectDamageForcePoints;