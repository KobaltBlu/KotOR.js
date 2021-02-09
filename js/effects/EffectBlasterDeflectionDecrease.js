class EffectBlasterDeflectionDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectBlasterDeflectionDecrease;

    //intList[0] : nChange
    //intList[1] : ???
    
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