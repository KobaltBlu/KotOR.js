class EffectAttackIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectAttackIncrease;

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

module.exports = EffectAttackIncrease;