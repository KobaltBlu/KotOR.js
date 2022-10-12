export class EffectForceFizzle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceFizzle;
    
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

