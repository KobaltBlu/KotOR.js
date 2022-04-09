class EffectForceResisted extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectForceResisted;
    
    //objectList[0] : oTarget
    
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

module.exports = EffectForceResisted;