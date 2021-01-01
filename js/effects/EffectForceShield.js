class EffectForceShield extends GameEffect {
  constructor(nShield = 0){
    super();
    this.type = GameEffect.Type.EffectForceShield;
    this.nShield = nShield;
    this.forceShield = Global.kotor2DA.forceshields.rows[nShield];
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    
    let eVisualEffect = new EffectVisualEffect(this.forceShield.visualeffectdef);
    eVisualEffect.setCreator(this.object);
    eVisualEffect.setSpellId(this.getSpellId());
    eVisualEffect.setDurationType(this.durationType);
    eVisualEffect.setDuration(this.duration);
    eVisualEffect.setExpireDay(this.expireDay);
    eVisualEffect.setExpireTime(this.expireTime);
    eVisualEffect.initialize();
    this.object.addEffect(eVisualEffect);
    eVisualEffect.setSkipOnLoad(true);

    let eDamageResistEffect = new EffectDamageResistance(this.forceShield.damageflags, this.forceShield.resistance, this.forceShield.amount, this.forceShield.vulnerflags);
    eDamageResistEffect.setCreator(this.object);
    eDamageResistEffect.setSpellId(this.getSpellId());
    eDamageResistEffect.setDurationType(this.durationType);
    eDamageResistEffect.setDuration(this.duration);
    eDamageResistEffect.setExpireDay(this.expireDay);
    eDamageResistEffect.setExpireTime(this.expireTime);
    eDamageResistEffect.initialize();
    this.object.addEffect(eDamageResistEffect);
    eDamageResistEffect.setSkipOnLoad(true);
  }

}

module.exports = EffectForceShield;