import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { hasImmunityType } from "@/effects/haste-slow";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";

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
    const creature = this.object as ModuleCreature;
    if(creature.plot) return;

    const creator = this.getCreator();
    const versus = isCreature(creator)
      ? creator as ModuleCreature
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
    const creature = this.object as ModuleCreature;
    const still = (creature.effects || []).some((e) =>
      e !== this && (
        e?.type === GameEffectType.EffectSilence ||
        e?.type === GameEffectType.EffectPsychicStatic
      )
    );
    if(!still) creature.silenced = false;
  }
}
