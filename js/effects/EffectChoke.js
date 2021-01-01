class EffectChoke extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectChoke;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectChoke;