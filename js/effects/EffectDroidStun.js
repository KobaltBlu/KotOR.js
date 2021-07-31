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

  update(delta = 0){
    this.object.animState = ModuleCreature.AnimState.DEACTIVATE;
  }

}

module.exports = EffectDroidStun;