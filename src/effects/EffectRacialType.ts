export class EffectRacialType extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectRacialType;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

