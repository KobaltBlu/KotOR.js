import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { hasImmunityType } from "@engine/effects/haste-slow";
import type { Creature } from "@engine/module/Creature";
import { isCreature } from "@engine/module/guards/isCreature";

/** IMMUNITY_TYPE_SILENCE */
const IMMUNITY_SILENCE = 0x0b;

/**
 * EffectSilence — onApply / onRemove.
 * Sets creature.silenced; blocks Force / spell casts.
 *
 * @file EffectSilence.ts
 */
export class EffectSilence extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSilence;
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
