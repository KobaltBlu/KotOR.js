import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectResurrection — effect apply.
 * Clamp HP to ≥1, clear actions, strip HitPointChangeWhenDying (temp), refresh anim.
 * K2: int[0] may be % of max HP to restore (when > 0).
 *
 * @file EffectResurrection.ts
 */
export class EffectResurrection extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectResurrection;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;

    const pct = this.getInt(0) || 0;
    if(pct > 0 && creature.getMaxHP()){
      const targetHp = Math.max(1, Math.floor(creature.getMaxHP() * (pct / 100)));
      creature.setHP(targetHp);
    }else if(creature.getHP() < 1){
      creature.setHP(1);
    }

    creature.clearAllActions?.(true);
    // restores listening / ambient anim authority; clear our death pipeline flags
    // and any KeepCorpse shell so AIUpdate (excited timer, movement) runs again.
    creature.deathStarted = false;
    creature.deathAnimationPlayed = false;
    creature.getUpAnimationPlayed = false;
    creature.clearCorpseDestroyState?.();

    // Strip temporary HitPointChangeWhenDying (subtype dur TEMPORARY == 1)
    const effects = creature.effects ? creature.effects.slice() : [];
    for(let i = 0; i < effects.length; i++){
      const e = effects[i];
      if(!e) continue;
      if(
        e.type === GameEffectType.EffectHitPointChangeWhenDying &&
        e.getDurationType() === 1
      ){
        creature.removeEffect(e);
      }
    }

    if(!creature.isDead()){
      creature.setAnimationState(ModuleCreatureAnimState.GET_UP_DEAD);
    }
  }
}
