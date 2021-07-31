class EffectSlow extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectSlow;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectSlow;