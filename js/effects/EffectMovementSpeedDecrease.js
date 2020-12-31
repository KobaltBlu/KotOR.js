class EffectMovementSpeedDecrease extends GameEffect {
  constructor(nPercentChange = 0){
    super();
    this.type = GameEffect.Type.EffectMovementSpeedDecrease;
    this.nPercentChange = nPercentChange;
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

module.exports = EffectMovementSpeedDecrease;