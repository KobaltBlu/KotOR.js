class EffectTemporaryHitPoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectTemporaryHitPoints;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectTemporaryHitPoints;