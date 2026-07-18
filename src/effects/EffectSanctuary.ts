import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectSanctuary — retail OnApplySanctuary @ 004e3d10.
 * int[4] = Will DC. Hostile observers must fail Will to see the target.
 * Full vis-node cache is approximated via stealth-detection GetInvisible path.
 *
 * @file EffectSanctuary.ts
 */
export class EffectSanctuary extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSanctuary;
    // intList[4] : Will DC (retail)
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      const self = this.object as ModuleCreature;
      self.perceptionTimer = 3;
      const area = self.area;
      if(area?.creatures){
        for(let i = 0; i < area.creatures.length; i++){
          area.creatures[i].perceptionTimer = 3;
        }
      }
    }
  }

  getWillDC(): number {
    return this.getInt(4) || 0;
  }
}
