class EffectRacialType extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectRacialType;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectRacialType;