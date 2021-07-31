class EffectStunned extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectStunned;
  }

  onApply(){
    if(this.applied)
      return;
      
    //Stun Effect
    let eVisualEffect = new EffectVisualEffect(2002);
    eVisualEffect.setCreator(this.getCreator());
    eVisualEffect.setSpellId(this.getSpellId());
    eVisualEffect.setSubTypeUnMasked(this.getSubTypeUnMasked());
    eVisualEffect.setDuration(this.duration);
    eVisualEffect.setExpireDay(this.expireDay);
    eVisualEffect.setExpireTime(this.expireTime);
    eVisualEffect.setInt(0, 2002);
    eVisualEffect.initialize();
    this.object.addEffect(eVisualEffect);
    eVisualEffect.setSkipOnLoad(true);

    super.onApply();
  }

}

module.exports = EffectStunned;