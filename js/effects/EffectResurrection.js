class EffectResurrection extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectResurrection;
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

module.exports = EffectResurrection;