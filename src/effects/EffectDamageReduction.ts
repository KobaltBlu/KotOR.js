export class EffectDamageReduction extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageReduction;

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

