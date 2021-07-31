class EffectSpellImmunity extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectSpellImmunity;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

module.exports = EffectSpellImmunity;