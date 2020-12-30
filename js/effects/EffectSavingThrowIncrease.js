class EffectSavingThrowIncrease extends GameEffect {
  constructor(nPercentChange = 0){
    super();
    this.type = GameEffect.Type.EffectSavingThrowIncrease;
    this.nPercentChange = nPercentChange;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectSavingThrowIncrease;