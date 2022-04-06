class EffectSetState extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectSetState;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

  }

}

module.exports = EffectSetState;