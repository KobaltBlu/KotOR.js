class EffectParalyze extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectParalyze;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectParalyze;