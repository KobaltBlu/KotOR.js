export class EffectEntangle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectEntangle;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

