class EffectDamageResistance extends GameEffect {
  constructor(nDamageType = 0, nAmount = 0, nDamageLimit = 0){
    super();
    this.type = GameEffect.Type.EffectDamageResistance;
    this.nAmount = nAmount;
    this.nDamageType = nDamageType;
    this.nDamageLimit = nDamageLimit;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectDamageResistance;