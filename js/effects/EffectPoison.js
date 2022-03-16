class EffectPoison extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectPoison;
    this.time = 0;

    //intList[0] : poison.2da id
    //intList[1] : nLastDayApplied
    //intList[2] : nLastTimeApplied
    //intList[3] : nLastDayApplied ?Last Ticked
    //intList[4] : nLastTimeApplied ?Last Ticked
    //intList[5] : nPoisonDuration
    //intList[6] : nPosionPeriod
    //intList[7] : 
    
    //floatList[0] : tick count

  }

  initialize(){
    super.initialize();

    this.poison = Global.kotor2DA.poison.rows[this.getPoisionId()];

    return this;
  }

  onApply(){
    if(this.applied)
      return;

    //Poison Visual Effect
    let eVisualEffect = new EffectVisualEffect();
    eVisualEffect.setCreator(this.getCreator());
    eVisualEffect.setSpellId(this.getSpellId());
    eVisualEffect.setSubTypeUnMasked(this.getSubTypeUnMasked());
    eVisualEffect.setDuration(this.duration);
    eVisualEffect.setExpireDay(this.expireDay);
    eVisualEffect.setExpireTime(this.expireTime);
    eVisualEffect.setInt(0, 1003);
    eVisualEffect.initialize();
    this.object.addEffect(eVisualEffect);
    eVisualEffect.setSkipOnLoad(true);

      
    super.onApply();
  }

  getPoisionId(){
    return this.intList[0];
  }

  update(delta = 0){
    
  }

}

module.exports = EffectPoison;