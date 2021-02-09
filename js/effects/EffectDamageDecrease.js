class EffectDamageDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDamageDecrease;

    //intList[0] : nPenalty
    //intList[1] : DamageType
    //intList[2] : racialtypes.2da rowcount

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectDamageDecrease;