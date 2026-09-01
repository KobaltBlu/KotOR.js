import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { Dice } from "@/utility/Dice";
import { DiceType } from "@/enums/combat/DiceType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isDispelEligible } from "@/effects/EffectDispelMagicAll";

/**
 * EffectDispelMagicBest — retail OnApplyDispelBestMagic.
 * Tries effects until one succeeds: d20+casterLevel >= 12 removes that effect and stops.
 * Skips creator-level 0 effects when a creature creator exists.
 *
 * @file EffectDispelMagicBest.ts
 */
export class EffectDispelMagicBest extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDispellMagicBest;
    // int[0] : caster level override
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleObject)){
      return;
    }

    const casterLvl = this.resolveCasterLevel();
    if(casterLvl < 0) return;

    const tried = new Set<GameEffect>();
    let safety = 64;

    while(safety-- > 0){
      const effects = this.object.effects || [];
      let candidate: GameEffect | undefined;

      for(let i = 0; i < effects.length; i++){
        const e = effects[i];
        if(!isDispelEligible(e) || tried.has(e)) continue;
        const creator = e.creator as ModuleCreature | undefined;
        if(creator && typeof creator.getTotalClassLevel === 'function'){
          if((creator.getTotalClassLevel() & 0xff) === 0) continue;
        }
        // No creator → treat like retail picking creatoreless for attempt
        candidate = e;
        break;
      }

      if(!candidate) break;

      const roll = Dice.roll(1, DiceType.d20);
      if(roll + casterLvl < 12){
        tried.add(candidate);
        continue;
      }

      this.object.removeEffect(candidate);
      break;
    }
  }

  private resolveCasterLevel(): number {
    const override = this.getInt(0) || 0;
    if(override > 0) return override & 0xff;
    const creator = this.creator as ModuleCreature;
    if(creator && typeof creator.getTotalClassLevel === 'function'){
      return creator.getTotalClassLevel() & 0xff;
    }
    return -1;
  }
}
