class EffectDamageReduction extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDamageReduction;

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

module.exports = EffectDamageReduction;