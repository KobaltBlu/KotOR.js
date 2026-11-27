import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import type { Creature } from "@engine/module/Creature";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectResurrection — onApply.
 * Clamp HP to ≥1, clear actions, strip HitPointChangeWhenDying (temp), refresh anim.
 * Recompute ambient → PAUSE (10000), never GET_UP_DEAD.
 * Instant apply returns 1 (freed — not kept on EffectList).
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

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as Creature;

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

    // Recompute ambient → SetAnimation(10000) → PAUSE.
    // Do not force GET_UP_DEAD (scripts often rez living party before cutscenes).
    if(!creature.isDead()){
      creature.setAnimationState(ModuleCreatureAnimState.PAUSE);
    }
  }
}
