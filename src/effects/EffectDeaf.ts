import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameState } from "@/GameState";
import { hasImmunityType } from "@/effects/haste-slow";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";

/** IMMUNITY_TYPE_DEAFNESS */
const IMMUNITY_DEAF = 8;

/**
 * EffectDeaf — onApply.
 * Spawns ArcaneSpellFailure 20%; blocked by immunity type 8 / plot.
 *
 * @file EffectDeaf.ts
 */
export class EffectDeaf extends GameEffect {
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectDeaf;
  }

  private stampChild(child: GameEffect){
    child.setCreator(this.getCreator() || this.creator);
    child.setSpellId(this.getSpellId());
    child.setSkipOnLoad(true);
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
    if(hasImmunityType(creature, IMMUNITY_DEAF, versus)){
      return;
    }

    super.onApply();
    creature.deaf = true;

    // ARCANESPELLFAILURE int[0]=0x14 (20%)
    const fail = new GameState.GameEffectFactory.EffectArcaneSpellFailure();
    this.stampChild(fail);
    fail.setInt(0, 0x14);
    creature.addEffect(fail, this.getDurationType(), this.duration);
    this.children.push(fail);
  }

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)) return;
    const creature = this.object as ModuleCreature;
    for(let i = 0; i < this.children.length; i++){
      creature.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
    const still = (creature.effects || []).some(
      (e) => e !== this && e?.type === GameEffectType.EffectDeaf
    );
    if(!still) creature.deaf = false;
  }
}
