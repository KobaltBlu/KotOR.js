class EffectStunned extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectStunned;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectStunned;