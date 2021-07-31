class EffectHorrified extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectHorrified;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
  }

  update(delta = 0){
    this.object.animState = ModuleCreature.AnimState.HORROR;
  }

}

module.exports = EffectHorrified;