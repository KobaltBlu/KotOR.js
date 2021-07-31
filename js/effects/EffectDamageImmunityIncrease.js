class EffectDamageImmunityIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDamageImmunityIncrease;

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

module.exports = EffectDamageImmunityIncrease;