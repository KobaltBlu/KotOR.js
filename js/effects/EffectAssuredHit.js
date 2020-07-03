class EffectAssuredHit extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectAssuredHit;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectAssuredHit;