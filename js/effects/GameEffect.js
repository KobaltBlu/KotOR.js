class GameEffect {
  constructor(){
    this.durationType = null;
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
  EffectBeam:         21,
  EffectDeath:        99999,
  EffectDisguise:     62,
  EffectVisualEffect: 75
};

module.exports = GameEffect;