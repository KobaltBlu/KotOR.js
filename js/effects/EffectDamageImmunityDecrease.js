class EffectDamageImmunityDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDamageImmunityDecrease;

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

module.exports = EffectDamageImmunityDecrease;