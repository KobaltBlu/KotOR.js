class EffectIcon extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectIcon;
    
    //intList[0] : icon id

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

module.exports = EffectIcon;