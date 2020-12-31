class EffectRegenerate extends GameEffect {
  constructor(nAmount = 0, fIntervalSeconds){
    super();
    this.type = GameEffect.Type.EffectRegenerate;
    this.nAmount = nAmount;
    this.fIntervalSeconds = fIntervalSeconds;
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