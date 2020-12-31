class EffectSkillDecrease extends GameEffect {
  constructor(nSkill = 0, nValue = 0){
    super();
    this.type = GameEffect.Type.EffectSkillDecrease;
    this.nSkill = nSkill;
    this.nValue = nValue;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectSkillDecrease;