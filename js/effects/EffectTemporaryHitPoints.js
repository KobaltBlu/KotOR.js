class EffectTemporaryHitPoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectTemporaryHitPoints;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.addHP(this.getAmount(), true);
  }

}

module.exports = EffectTemporaryHitPoints;