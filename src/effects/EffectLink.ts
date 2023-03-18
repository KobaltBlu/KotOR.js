import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObject } from "../module";

export class EffectLink extends GameEffect {
  effect1: GameEffect;
  effect2: GameEffect;
  constructor(effect1: GameEffect = undefined, effect2: GameEffect = undefined){
    super();
    this.type = GameEffectType.EffectLink;
    this.effect1 = effect1;
    this.effect2 = effect2;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

}

