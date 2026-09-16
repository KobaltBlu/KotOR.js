import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectHasteInternal — onApply.
 * Spawns MovementSpeedIncrease(150) + ACIncrease(+4).
 *
 * @file EffectHasteInternal.ts
 */
export class EffectHasteInternal extends GameEffect {
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectHasteInternal;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;
    creature.isHasted = true;
    creature.isSlowed = false;

    const raceCount = GameState.SWRuleSet?.racialTypeCount || 0;

    const msi = new GameState.GameEffectFactory.EffectMovementSpeedIncrease();
    this.stampChild(msi);
    msi.setInt(0, 0x96); // 150%
    creature.addEffect(msi, this.getDurationType(), this.duration);
    this.children.push(msi);

    const ac = new GameState.GameEffectFactory.EffectACIncrease();
    this.stampChild(ac);
    ac.setInt(0, 0); // dodges/type
    ac.setInt(1, 4);
    ac.setInt(2, raceCount);
    ac.setInt(5, 0x4007);
    creature.addEffect(ac, this.getDurationType(), this.duration);
    this.children.push(ac);
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      (this.object as ModuleCreature).isHasted = false;
    }
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
