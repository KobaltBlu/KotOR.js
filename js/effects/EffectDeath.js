class EffectDeath extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectDeath;
    
    //intList[0] : isSpectacularDeath

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.setHP(-11);
    if(this.isSpeactacular()){
      this.object.animState = ModuleCreature.AnimState.DEAD;
    }else{
      this.object.animState = ModuleCreature.AnimState.DEAD;
    }
  }

  isSpeactacular(){
    return this.getInt(0);
  }

}

module.exports = EffectDeath;