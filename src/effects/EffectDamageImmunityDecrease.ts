export class EffectDamageImmunityDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamageImmunityDecrease;

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
