class EffectAttackDecrease extends GameEffect {
  constructor(nPenalty = 0, nDamageType = 0){
    super();
    this.type = GameEffect.Type.EffectAttackDecrease;
    this.nPenalty = nPenalty;
    this.nDamageType = nDamageType;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectAttackDecrease;