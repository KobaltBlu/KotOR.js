export class EffectAssuredHit extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAssuredHit;
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
