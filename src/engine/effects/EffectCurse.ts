import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameState } from "@engine/runtime/GameState";
import { hasImmunityType } from "@engine/effects/haste-slow";
import type { Creature } from "@engine/module/Creature";
import { isCreature } from "@engine/module/guards/isCreature";

/** IMMUNITY_TYPE_CURSED */
const IMMUNITY_CURSE = 0x11;

/**
 * EffectCurse — onApply.
 * int[0..5] = STR/DEX/CON/INT/WIS/CHA penalties; spawns AbilityDecrease children.
 *
 * @file EffectCurse.ts
 */
export class EffectCurse extends GameEffect {
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectCurse;
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
    const creature = this.object as Creature;
    if(creature.plot) return;

    const creator = this.getCreator();
    const versus = isCreature(creator)
      ? creator as Creature
      : undefined;
    if(hasImmunityType(creature, IMMUNITY_CURSE, versus)){
      return;
    }

    super.onApply();
    for(let ability = 0; ability < 6; ability++){
      const penalty = this.getInt(ability) || 0;
      if(penalty <= 0) continue;
      const dec = new GameState.GameEffectFactory.EffectAbilityDecrease();
      this.stampChild(dec);
      dec.setInt(0, ability);
      dec.setInt(1, penalty);
      creature.addEffect(dec, this.getDurationType(), this.duration);
      this.children.push(dec);
    }
  }

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)) return;
    const creature = this.object as Creature;
    for(let i = 0; i < this.children.length; i++){
      creature.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
  }
}
