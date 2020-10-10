class EffectForcePushed extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectForcePushed;
    //Distance away to push the creature
    this.pushDistance = 5;
    //Amount of force to push the creature with
    this.pushForce = 1;
  }

  update(delta){
    super.update(delta);



  }

  onApply(){
    
  }

}

module.exports = EffectForcePushed;