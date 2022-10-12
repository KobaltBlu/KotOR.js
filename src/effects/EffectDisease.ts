export class EffectDisease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDisease;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

  update(delta = 0){
    
  }

}

