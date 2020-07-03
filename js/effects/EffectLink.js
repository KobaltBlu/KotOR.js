class EffectLink extends GameEffect {
  constructor(effect1 = undefined, effect2 = undefined){
    super();
    this.type = GameEffect.Type.EffectLink;
    this.effect1 = effect1;
    this.effect2 = effect2;
  }

  onApply(){
    if(this.effect1 instanceof GameEffect){
      this.effect1.setObject(this.object);
      this.effect1.onApply(this.object)
    }
    if(this.effect2 instanceof GameEffect){
      this.effect2.setObject(this.object);
      this.effect2.onApply(this.object)
    }
  }

  update(delta = 0){
    if(this.effect1 instanceof GameEffect){
      this.effect1.update(delta)
    }
    if(this.effect2 instanceof GameEffect){
      this.effect2.update(delta)
    }
  }

}

module.exports = EffectLink;