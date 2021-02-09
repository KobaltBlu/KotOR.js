class EffectFeat extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectFeat;
    
    //intList[0] : feat.2da id
    
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

module.exports = EffectFeat;