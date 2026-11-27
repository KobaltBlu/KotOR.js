import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { hasImmunityType } from "@engine/effects/haste-slow";
import type { Creature } from "@engine/module/Creature";

import { isCreature } from "@engine/module/guards/isCreature";

/** Same immunity gate as Silence (Force powers blocked). */
const IMMUNITY_SILENCE = 0x0b;

/**
 * EffectPsychicStatic — KotOR Force silence field (type 0x63).
 * Mirrors Silence: sets creature.silenced while active.
 *
 * @file EffectPsychicStatic.ts
 */
export class EffectPsychicStatic extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectPsychicStatic;
  }

  onApply(){
    if(this.applied) return;
    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as Creature;
    if(creature.plot) return;

    const creator = this.getCreator();
    const versus = isCreature(creator)
      ? creator as Creature
      : undefined;
    if(hasImmunityType(creature, IMMUNITY_SILENCE, versus)){
      return;
    }

    super.onApply();
    creature.silenced = true;
  }

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)) return;
    const creature = this.object as Creature;
    const still = (creature.effects || []).some((e) =>
      e !== this && (
        e?.type === GameEffectType.EffectSilence ||
        e?.type === GameEffectType.EffectPsychicStatic
      )
    );
    if(!still) creature.silenced = false;
  }
}
