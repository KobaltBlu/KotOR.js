import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * EffectSlowInternal — retail OnApplySlowInternal.
 * Spawns MSD(50), AC−2, AB−2, Saves−2, LimitMovementSpeed.
 *
 * @file EffectSlowInternal.ts
 */
export class EffectSlowInternal extends GameEffect {
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectSlowInternal;
  }

  onApply(){
    if(this.applied)
      return;
    super.onApply();

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;
    creature.isHasted = false;
    creature.isSlowed = true;

    const raceCount = GameState.SWRuleSet?.racialTypeCount || 0;

    const msd = new GameState.GameEffectFactory.EffectMovementSpeedDecrease();
    this.stampChild(msd);
    msd.setInt(0, 0x32); // 50%
    creature.addEffect(msd, this.getDurationType(), this.duration);
    this.children.push(msd);

    const ac = new GameState.GameEffectFactory.EffectACDecrease();
    this.stampChild(ac);
    ac.setInt(0, 0);
    ac.setInt(1, 2);
    ac.setInt(2, raceCount);
    ac.setInt(5, 0x4007);
    creature.addEffect(ac, this.getDurationType(), this.duration);
    this.children.push(ac);

    const ab = new GameState.GameEffectFactory.EffectAttackDecrease();
    this.stampChild(ab);
    ab.setInt(0, 2);
    ab.setInt(1, 0);
    ab.setInt(2, raceCount);
    creature.addEffect(ab, this.getDurationType(), this.duration);
    this.children.push(ab);

    const saves = new GameState.GameEffectFactory.EffectSavingThrowDecrease();
    this.stampChild(saves);
    saves.setInt(0, 2); // amount
    saves.setInt(1, 0); // ALL
    saves.setInt(2, 0);
    saves.setInt(3, raceCount);
    creature.addEffect(saves, this.getDurationType(), this.duration);
    this.children.push(saves);

    const limit = new GameState.GameEffectFactory.EffectLimitMovementSpeed();
    this.stampChild(limit);
    limit.setInt(0, 0);
    creature.addEffect(limit, this.getDurationType(), this.duration);
    this.children.push(limit);
  }

  onRemove(){
    super.onRemove();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      (this.object as ModuleCreature).isSlowed = false;
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
