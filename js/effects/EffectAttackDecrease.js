class EffectAttackDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectAttackDecrease;

    //intList[0] : nPenalty
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

module.exports = EffectAttackDecrease;