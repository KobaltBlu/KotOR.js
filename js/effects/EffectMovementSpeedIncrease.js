class EffectMovementSpeedIncrease extends GameEffect {
  constructor(nPercentChange = 0){
    super();
    this.type = GameEffect.Type.EffectMovementSpeedIncrease;
    this.nPercentChange = nPercentChange;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectMovementSpeedIncrease;