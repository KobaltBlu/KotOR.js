class EffectAbilityIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectAbilityIncrease;

    //intList[0] : nAbility
    //intList[1] : nAmount

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

module.exports = EffectAbilityIncrease;