class EffectBlasterDeflectionIncrease extends GameEffect {
  constructor(nChange = 0){
    super();
    this.type = GameEffect.Type.EffectBlasterDeflectionIncrease;
    this.nChange = nChange;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectBlasterDeflectionIncrease;