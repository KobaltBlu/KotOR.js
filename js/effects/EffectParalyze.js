class EffectParalyze extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectParalyze;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

  update(delta = 0){
    this.object.animState = ModuleCreature.AnimState.PARALYZED;
  }

}

module.exports = EffectParalyze;