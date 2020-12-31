class EffectAttackIncrease extends GameEffect {
  constructor(nBonus = 0, nDamageType = 0){
    super();
    this.type = GameEffect.Type.EffectAttackIncrease;
    this.nBonus = nBonus;
    this.nDamageType = nDamageType;
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