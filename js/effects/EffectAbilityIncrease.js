class EffectAbilityIncrease extends GameEffect {
  constructor(nAbility = 0, nAmount = 0){
    super();
    this.type = GameEffect.Type.EffectAbilityIncrease;
    this.nAbility = nAbility;
    this.nAmount = nAmount;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectAbilityIncrease;