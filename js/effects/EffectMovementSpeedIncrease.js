class EffectMovementSpeedIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectMovementSpeedIncrease;
    
    //intList[0] : nPercentChange

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.getInt(0) < 100){
      this.setInt(0, this.getInt(0) + 100);
    }
    if(this.object)
      this.object.updateMovementSpeed();
  }

  onRemove(){
    super.onRemove();
    if(this.object)
      this.object.updateMovementSpeed();
  }

}

module.exports = EffectMovementSpeedIncrease;