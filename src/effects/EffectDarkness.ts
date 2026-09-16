import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { VISION_FLAG_DARKNESS_BLIND } from "@/effects/EffectBlindness";
import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectDarkness — onApply.
 * Spawns Invisibility(mode 2) + Blindness(int[0]=8). Typically AOE-applied.
 *
 * @file EffectDarkness.ts
 */
export class EffectDarkness extends GameEffect {
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectDarkness;
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;
    super.onApply();

    const raceCount = GameState.SWRuleSet?.racialTypeCount || 0;

    const invis = new GameState.GameEffectFactory.EffectInvisibility();
    this.stampChild(invis);
    invis.setInt(0, 2); // darkness invis mode
    invis.setInt(1, raceCount);
    creature.addEffect(invis, this.getDurationType(), this.duration);
    this.children.push(invis);

    const blind = new GameState.GameEffectFactory.EffectBlindness();
    this.stampChild(blind);
    blind.setInt(0, VISION_FLAG_DARKNESS_BLIND);
    creature.addEffect(blind, this.getDurationType(), this.duration);
    this.children.push(blind);
  }

  onRemove(){
    super.onRemove();
    for(let i = 0; i < this.children.length; i++){
      this.object?.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
  }

  private stampChild(child: GameEffect){
    child.setCreator(this.getCreator() || this.creator);
    child.setSpellId(this.getSpellId());
    child.setDurationType(this.getDurationType() || GameEffectDurationType.TEMPORARY);
    child.setDuration(this.duration);
    child.setExpireDay(this.expireDay);
    child.setExpireTime(this.expireTime);
    child.setSubType(GameEffectSubType.MAGICAL);
    child.setSkipOnLoad(true);
  }
}
