class EffectHeal extends GameEffect {
  constructor(nHeal = 0){
    super();
    this.type = GameEffect.Type.EffectHeal;
    this.nHeal = nHeal;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.addHP(this.nHeal);
  }

}

module.exports = EffectHeal;