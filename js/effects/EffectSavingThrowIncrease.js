class EffectSavingThrowIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectSavingThrowIncrease;
    
    //intList[0] : 
    //intList[1] : SAVING_THROW_*
    //intList[2] : SAVING_THROW_TYPE_*
    //intList[3] : racialtypes.2da rowcount

  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    
    if(this.object instanceof ModuleObject){
      //
    }

    this.applied = true;
  }

}

module.exports = EffectSavingThrowIncrease;