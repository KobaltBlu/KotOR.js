class EffectDisease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDisease;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

  update(delta = 0){
    this.object.animState = ModuleCreature.AnimState.PAUSE_DRUNK;
  }

}

module.exports = EffectDisease;