export class EffectSpellImmunity extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSpellImmunity;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

