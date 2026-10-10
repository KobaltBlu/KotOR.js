import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { Dice } from "@core/utility/Dice";
import { DiceType } from "@core/enums/combat/DiceType";
import type { Creature } from "@engine/module/Creature";
import { isDispelEligible } from "@engine/effects/EffectDispelMagicAll";

import { isGameObject } from "@engine/module/guards/isGameObject";

/**
 * EffectDispelMagicBest — onApply.
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

    if(!isGameObject(this.object)){
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
        const creator = e.creator as Creature | undefined;
        if(creator && typeof creator.getTotalClassLevel === 'function'){
          if((creator.getTotalClassLevel() & 0xff) === 0) continue;
        }
        // No creator → treat like picking creatoreless for attempt
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
    const creator = this.creator as Creature;
    if(creator && typeof creator.getTotalClassLevel === 'function'){
      return creator.getTotalClassLevel() & 0xff;
    }
    return -1;
  }
}
