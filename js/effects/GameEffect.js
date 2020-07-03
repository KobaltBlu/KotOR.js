class GameEffect {
  constructor(){
    this.creator = undefined;
    this.durationType = 0;
    this.duration = 0;
  }

  initialize(){
    return this;
  }

  setDurationType(durationType = 0){
    this.durationType = durationType;
  }

  setDuration(duration = 0){
    this.duration = duration;
  }

  setObject(obj = undefined){
    this.object = obj;
  }

  setCreator(oCreator = undefined){
    this.creator = oCreator;
  }

  update(delta){}

  ///////////////
  // Effect Events
  ///////////////

  //Called when the effect is applied ingame
  onApply(){
    
  }

  //When the effect is removed ingame
  onRemove(){

  }
  
  //When the effect duration has expired
  onDurationEnd(){
    if(this.object instanceof ModuleObject){
      this.object.RemoveEffect(this);
    }else{
      this.onRemove();
    }
  }

}

GameEffect.DurationType = {
  INSTANT:   0,
  TEMPORARY: 1,
  PERMANENT: 2,
};

GameEffect.Type = {
  EffectAbilityIncrease: 38,
  EffectAssuredHit:   74,
  EffectBeam:         21,
  EffectDamage:       42,
  EffectDamageResistance: 1,
  EffectDeath:        99999,
  EffectDisguise:     62,
  EffectLink:         99997,
  EffectHeal:         99998,
  EffectResurrection:  14,
  EffectVisualEffect: 75
};

module.exports = GameEffect;