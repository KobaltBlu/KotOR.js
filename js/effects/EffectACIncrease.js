class EffectACIncrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectACIncrease;

    //intList[0] : Modify Type
    //intList[1] : Amount
    //intList[2] : racialtypes.2da rowcount
    //intList[5] : Damage Type

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

module.exports = EffectACIncrease;