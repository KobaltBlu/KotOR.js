class EffectForceShield extends GameEffect {
  constructor(nShield = 0){
    super();
    this.type = GameEffect.Type.EffectForceShield;
    this.nShield = nShield;
  }

  onApply(){
    
  }

}

module.exports = EffectForceShield;