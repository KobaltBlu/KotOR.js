export class EffectBlasterDeflectionDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectBlasterDeflectionDecrease;

    //intList[0] : nChange
    //intList[1] : ???
    
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
