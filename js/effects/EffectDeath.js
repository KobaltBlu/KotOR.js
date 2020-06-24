class EffectDeath extends GameEffect {
  constructor(spectacularDeath = false){
    super();
    this.type = GameEffect.Type.EffectDeath;
    this.spectacularDeath = spectacularDeath;
  }

  onApply(){
    this.object.setHP(-11);
    if(this.spectacularDeath){
      this.object.animState = ModuleCreature.AnimState.DEAD;
    }else{
      this.object.animState = ModuleCreature.AnimState.DEAD;
    }
  }

}

module.exports = EffectDeath;