class EffectForceFizzle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectForceFizzle;
    
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

module.exports = EffectForceFizzle;