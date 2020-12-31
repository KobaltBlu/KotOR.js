class EffectDamageDecrease extends GameEffect {
  constructor(nPenalty = 0, nDamageType = 0){
    super();
    this.type = GameEffect.Type.EffectDamageDecrease;
    this.nPenalty = nPenalty;
    this.nDamageType = nDamageType;
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

module.exports = EffectDamageDecrease;