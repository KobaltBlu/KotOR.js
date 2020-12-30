class EffectSkillIncrease extends GameEffect {
  constructor(nSkill = 0, nValue = 0){
    super();
    this.type = GameEffect.Type.EffectSkillIncrease;
    this.nSkill = nSkill;
    this.nValue = nValue;
  }

  onApply(){
    if(this.object instanceof ModuleObject){
      //
    }
  }

}

module.exports = EffectSkillIncrease;