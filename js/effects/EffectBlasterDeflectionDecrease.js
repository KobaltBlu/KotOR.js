class EffectBlasterDeflectionDecrease extends GameEffect {
  constructor(nChange = 0){
    super();
    this.type = GameEffect.Type.EffectBlasterDeflectionDecrease;
    this.nChange = nChange;
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

module.exports = EffectBlasterDeflectionDecrease;