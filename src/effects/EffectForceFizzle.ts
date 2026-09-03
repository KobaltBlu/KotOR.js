import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";

/**
 * EffectForceFizzle class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectForceFizzle.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectForceFizzle extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceFizzle;
    
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    // Retail GetWasForcePowerSuccessful — fizzle clears caster success flag
    const creator = this.getCreator?.() || this.creator;
    if(BitWise.InstanceOfObject(creator, ModuleObjectType.ModuleCreature)){
      const cd = (creator as any).combatData;
      if(cd){
        cd.lastForcePowerSuccess = false;
      }
    }
  }

}

