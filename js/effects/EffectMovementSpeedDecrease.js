class EffectMovementSpeedDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectMovementSpeedDecrease;
    
    //intList[0] : nPercentChange

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