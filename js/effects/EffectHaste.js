class EffectHaste extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectHaste;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
  }

}

module.exports = EffectHaste;