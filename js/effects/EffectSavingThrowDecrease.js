class EffectSavingThrowDecrease extends GameEffect {
  constructor(nPercentChange = 0){
    super();
    this.type = GameEffect.Type.EffectSavingThrowDecrease;
    this.nPercentChange = nPercentChange;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectSavingThrowDecrease;