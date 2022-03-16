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
    
  }

}

module.exports = EffectDisease;