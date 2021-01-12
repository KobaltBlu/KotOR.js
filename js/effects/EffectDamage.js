class EffectDamage extends GameEffect {
  constructor(nAmount = 0, nDamageType = 0, nDamagePower = 0){
    super();
    this.type = GameEffect.Type.EffectDamage;
    this.nAmount = Math.min(Math.max(nAmount, 1), 10000);
    this.nDamageType = nDamageType;
    this.nDamagePower = nDamagePower;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.object instanceof ModuleObject){
      this.object.subtractHP(this.nAmount);
      this.object.lastDamager = this.creator;
      this.object.lastAttacker = this.creator;
    }
  }

}

module.exports = EffectDamage;