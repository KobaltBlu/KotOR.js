import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectACDecrease extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectACDecrease;

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
