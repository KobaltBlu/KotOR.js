import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@core/enums/effects/GameEffectSubType";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectHasteInternal — onApply / onRemove.
 * Spawns MovementSpeedIncrease(150) + ACIncrease(+4); tears them down onRemove.
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
    const creature = this.object as Creature;
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
      (this.object as Creature).isHasted = false;
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
