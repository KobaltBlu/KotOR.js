import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@core/enums/effects/GameEffectSubType";
import { Dice } from "@core/utility/Dice";
import { DiceType } from "@core/enums/combat/DiceType";
import type { ModuleCreature } from "@engine/module/ModuleCreature";

import { isObject } from "@engine/module/guards/isObject";

/**
 * EffectDispelMagicAll — onApply.
 * Eligible: MAGICAL + (TEMPORARY|PERMANENT). One roll per spellId group:
 * succeed if effectCreatorLevel + 11 < casterLevel + d20.
 *
 * @file EffectDispelMagicAll.ts
 */
export class EffectDispelMagicAll extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDispellMagic;
    // int[0] : caster level override (NWScript nCasterLevel; 0 = use creator level)
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(!isObject(this.object)){
      return;
    }

    const casterLvl = this.resolveCasterLevel();
    if(casterLvl < 0) return;

    const effects = this.object.effects ? this.object.effects.slice() : [];
    const tried = new Set<number>();

    for(let i = 0; i < effects.length; i++){
      const e = effects[i];
      if(!isDispelEligible(e)) continue;

      const groupKey = e.spellId >= 0 ? e.spellId : (-1000 - i);
      if(tried.has(groupKey)) continue;
      tried.add(groupKey);

      const effectLvl = getCreatorLevel(e);
      const roll = Dice.roll(1, DiceType.d20);
      if(effectLvl + 11 < roll + casterLvl){
        // Remove all in group
        for(let j = 0; j < effects.length; j++){
          const e2 = effects[j];
          if(!e2 || !isDispelEligible(e2)) continue;
          if(e.spellId >= 0){
            if(e2.spellId === e.spellId) this.object.removeEffect(e2);
          }else if(e2 === e){
            this.object.removeEffect(e2);
          }
        }
      }
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

export function isDispelEligible(e: GameEffect | undefined): boolean {
  if(!e) return false;
  if(e.type === GameEffectType.EffectDispellMagic) return false;
  if(e.type === GameEffectType.EffectDispellMagicBest) return false;
  if(e.type === GameEffectType.EffectLink) return false;
  const dur = e.getDurationType();
  if(dur !== GameEffectDurationType.TEMPORARY && dur !== GameEffectDurationType.PERMANENT){
    return false;
  }
  return (e.getSubType() & GameEffectSubType.MASK) === GameEffectSubType.MAGICAL;
}

export function getCreatorLevel(e: GameEffect): number {
  const c = e.creator as ModuleCreature;
  if(c && typeof c.getTotalClassLevel === 'function'){
    return c.getTotalClassLevel() & 0xff;
  }
  return 0;
}
