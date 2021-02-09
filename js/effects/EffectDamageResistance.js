class EffectDamageResistance extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDamageResistance;
    
    //intList[0] : nDamageType
    //intList[1] : nDamageLimit
    //intList[2] : nDamageLimit
    //intList[3] : nVulnerabilityFlags ???

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectDamageResistance;