class EffectRegenerate extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectRegenerate;

    //intList[0] : nAmount
    //intList[1] : fIntervalSeconds
    //intList[2] : nLastDayApplied
    //intList[3] : nLastTimeApplied
    //intList[4] : nItemPropsDef index

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    this.setInt(2, Game.module.timeManager.pauseDay);
    this.setInt(3, Game.module.timeManager.pauseTime);
    
    if(this.object instanceof ModuleCreature){
      //
    }
  }

  update(delta = 0){
    super.update(delta);

    const milliseconds_elapsed = Game.module.timeManager.getMilisecondsElapsed(this.getInt(2), this.getInt(3));
    if(milliseconds_elapsed >= this.getInt(1) * 1000){

      //tick regen
      if(this.getInt(4) == 54){
        //apply force heal
        const eHealFP = new EffectHealForcePoints();
        eHealFP.setCreator(this.getCreator());
        eHealFP.setSpellId(this.getSpellId());
        eHealFP.setSubTypeUnMasked(GameEffect.DurationType.INSTANT | this.getSubTypeUnMasked() & GameEffect.DurationType.MASK);
        eHealFP.setDuration(0);
        eHealFP.setExpireDay(0);
        eHealFP.setExpireTime(0);
        eHealFP.setInt(0, this.getInt(0));
        eHealFP.initialize();
        this.object.addEffect(eHealFP);
        eHealFP.setSkipOnLoad(true);
      }else{
        //apply heal
        const eHeal = new EffectHeal();
        eHeal.setCreator(this.getCreator());
        eHeal.setSpellId(this.getSpellId());
        eHeal.setSubTypeUnMasked(GameEffect.DurationType.INSTANT | this.getSubTypeUnMasked() & GameEffect.DurationType.MASK);
        eHeal.setDuration(0);
        eHeal.setExpireDay(0);
        eHeal.setExpireTime(0);
        eHeal.setInt(0, this.getInt(0));
        eHeal.initialize();
        this.object.addEffect(eHeal);
        eHeal.setSkipOnLoad(true);
      }

      this.setInt(2, Game.module.timeManager.pauseDay);
      this.setInt(3, Game.module.timeManager.pauseTime);
    }
    
  }

}

module.exports = EffectRegenerate;