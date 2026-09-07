import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { hasImmunityType } from "@/effects/haste-slow";
import type { ModuleCreature } from "@/module/ModuleCreature";

/** IMMUNITY_TYPE_SILENCE */
const IMMUNITY_SILENCE = 0x0b;

/**
 * EffectSilence — effect apply / effect remove.
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
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;
    if(creature.plot) return;

    const creator = this.getCreator();
    const versus = BitWise.InstanceOfObject(creator, ModuleObjectType.ModuleCreature)
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
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)) return;
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
