export class EffectImmunity extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectImmunity;
    
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

