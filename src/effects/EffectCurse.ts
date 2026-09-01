import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { GameState } from "@/GameState";
import { hasImmunityType } from "@/effects/haste-slow";
import type { ModuleCreature } from "@/module/ModuleCreature";

/** IMMUNITY_TYPE_CURSED */
const IMMUNITY_CURSE = 0x11;

/**
 * EffectCurse — retail OnApplyCurse.
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
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;
    if(creature.plot) return;

    const creator = this.getCreator();
    const versus = BitWise.InstanceOfObject(creator, ModuleObjectType.ModuleCreature)
      ? creator as ModuleCreature
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
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)) return;
    const creature = this.object as ModuleCreature;
    for(let i = 0; i < this.children.length; i++){
      creature.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
  }
}
