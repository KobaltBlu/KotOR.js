class EffectIcon extends GameEffect {
  constructor(nIcon = 0){
    super();
    this.type = GameEffect.Type.EffectIcon;
    this.nIcon = nIcon;
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