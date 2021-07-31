class EffectFrightened extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectFrightened;
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

module.exports = EffectFrightened;