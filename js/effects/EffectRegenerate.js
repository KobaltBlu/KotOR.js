class EffectRegenerate extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectRegenerate;

    //intList[0] : nAmount
    //intList[1] : fIntervalSeconds

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

module.exports = EffectRegenerate;