export class EffectForceResisted extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceResisted;
    
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

