class EffectLink extends GameEffect {
  constructor(effect1 = undefined, effect2 = undefined){
    super();
    this.type = GameEffect.Type.EffectLink;
    this.effect1 = effect1;
    this.effect2 = effect2;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectLink;