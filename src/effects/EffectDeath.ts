export class EffectDeath extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDeath;
    
    //intList[0] : isSpectacularDeath

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    this.object.setHP(-11);
    if(this.isSpeactacular()){
      //this.object.animState = ModuleCreatureAnimState.DEAD;
    }else{
      this.object.animState = ModuleCreatureAnimState.DEAD;
    }
  }

  isSpeactacular(){
    return this.getInt(0);
  }

}

