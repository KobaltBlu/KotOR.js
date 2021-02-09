class EffectImmunity extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectImmunity;
    
    //intList[0] : immunityType

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

module.exports = EffectImmunity;