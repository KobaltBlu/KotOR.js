class EffectImmunity extends GameEffect {
  constructor(nImmunityType = 0){
    super();
    this.type = GameEffect.Type.EffectImmunity;
    this.nImmunityType = nImmunityType;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectImmunity;