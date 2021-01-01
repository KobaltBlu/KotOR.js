class EffectDroidStun extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDroidStun;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectDroidStun;