class EffectChoke extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectChoke;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

  update(delta = 0){
    this.object.animState = ModuleCreature.AnimState.CHOKE;
  }

}

module.exports = EffectChoke;