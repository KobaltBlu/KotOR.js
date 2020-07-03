class EffectDamage extends GameEffect {
  constructor(nAmount = 0, nDamageType = 0, nDamagePower = 0){
    super();
    this.type = GameEffect.Type.EffectDamage;
    this.nAmount = nAmount;
    this.nDamageType = nDamageType;
    this.nDamagePower = nDamagePower;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      this.object.subtractHP(this.nAmount);
    }
  }

}

module.exports = EffectDamage;