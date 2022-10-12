export class EffectFeat extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectFeat;
    
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

