class EffectSavingThrowIncrease extends GameEffect {
  constructor(nPercentChange = 0){
    super();
    this.type = GameEffect.Type.EffectSavingThrowIncrease;
    this.nPercentChange = nPercentChange;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    
    if(this.object instanceof ModuleObject){
      //
    }

    this.applied = true;
  }

}

module.exports = EffectSavingThrowIncrease;