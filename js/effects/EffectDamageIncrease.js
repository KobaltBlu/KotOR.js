class EffectDamageIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDamageIncrease;

    //intList[0] : nBonus
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

module.exports = EffectDamageIncrease;