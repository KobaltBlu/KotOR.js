class EffectFrightened extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectFrightened;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectFrightened;