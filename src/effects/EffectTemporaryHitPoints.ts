export class EffectTemporaryHitPoints extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectTemporaryHitPoints;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.addHP(this.getAmount(), true);
  }

}

