class EffectHorrified extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectHorrified;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
  }

}

module.exports = EffectHorrified;