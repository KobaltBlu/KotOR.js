export class EffectAttackIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectAttackIncrease;

    //intList[0] : nBonus
    //intList[1] : nDamageType

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
