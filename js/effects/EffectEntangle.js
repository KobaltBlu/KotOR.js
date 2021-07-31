class EffectEntangle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectEntangle;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectEntangle;