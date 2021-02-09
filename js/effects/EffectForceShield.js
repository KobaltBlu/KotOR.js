class EffectForceShield extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectForceShield;

    //intList[0] : ForceShield 2da id
    
  }

  initialize(){
    super.initialize();

    this.forceShield = Global.kotor2DA.forceshields.rows[this.getInt(0)];

    return this;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    
    let eVisualEffect = new EffectVisualEffect();
    eVisualEffect.setCreator(this.getCreator());
    eVisualEffect.setSpellId(this.getSpellId());
    eVisualEffect.setSubType(this.getSubType());
    eVisualEffect.setDuration(this.duration);
    eVisualEffect.setExpireDay(this.expireDay);
    eVisualEffect.setExpireTime(this.expireTime);
    eVisualEffect.setInt(0, this.forceShield.visualeffectdef);
    eVisualEffect.initialize();
    this.object.addEffect(eVisualEffect);
    eVisualEffect.setSkipOnLoad(true);

    let eDamageResistEffect = new EffectDamageResistance(this.forceShield.damageflags, this.forceShield.resistance, this.forceShield.amount, this.forceShield.vulnerflags);
    eDamageResistEffect.setCreator(this.getCreator());
    eDamageResistEffect.setSpellId(this.getSpellId());
    eDamageResistEffect.setSubType(this.getSubType());
    eDamageResistEffect.setDuration(this.duration);
    eDamageResistEffect.setExpireDay(this.expireDay);
    eDamageResistEffect.setExpireTime(this.expireTime);
    eDamageResistEffect.initialize();
    this.object.addEffect(eDamageResistEffect);
    eDamageResistEffect.setSkipOnLoad(true);

  }

}

module.exports = EffectForceShield;