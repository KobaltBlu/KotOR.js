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
    
    if(this.getInt(0) <= 99){
      if(this.object)
        this.object.updateMovementSpeed();
    }
  }

  onRemove(){
    super.onRemove();
    if(this.object)
      this.object.updateMovementSpeed();
  }

}

module.exports = EffectMovementSpeedDecrease;