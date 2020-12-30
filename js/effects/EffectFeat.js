class EffectFeat extends GameEffect {
  constructor(nFeat = 0){
    super();
    this.type = GameEffect.Type.EffectFeat;
    this.nFeat = nFeat;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectFeat;