class EffectACIncrease extends GameEffect {
  constructor(nValue = 0, nModifyType = 0, nDamageType = 0){
    super();
    this.type = GameEffect.Type.EffectACIncrease;
    this.nValue = nValue;
    this.nModifyType = nModifyType;
    this.nDamageType = nDamageType;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectACIncrease;