class EffectConfused extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectConfused;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectConfused;