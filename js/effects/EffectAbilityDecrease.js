class EffectAbilityDecrease extends GameEffect {
  constructor(nAbility = 0, nPenalty = 0){
    super();
    this.type = GameEffect.Type.EffectAbilityDecrease;
    this.nAbility = nAbility;
    this.nPenalty = nPenalty;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectAbilityDecrease;