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
    eVisualEffect.setCreator(this.object);
    eVisualEffect.setSpellId(this.getSpellId());
    eVisualEffect.setDurationType(this.durationType);
    eVisualEffect.setDuration(this.duration);
    eVisualEffect.setExpireDay(this.expireDay);
    eVisualEffect.setExpireTime(this.expireTime);
    eVisualEffect.initialize();
    this.object.AddEffect(eVisualEffect);
    eVisualEffect.setSkipOnLoad(true);

    super.onApply();
  }

}

module.exports = EffectStunned;