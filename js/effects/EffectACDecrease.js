class EffectACDecrease extends GameEffect {
  constructor(nValue = 0, nModifyType = 0, nDamageType = 0){
    super();
    this.type = GameEffect.Type.EffectACDecrease;
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

module.exports = EffectACDecrease;