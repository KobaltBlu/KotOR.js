import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameState } from "@engine/runtime/GameState";
import { hasImmunityType } from "@engine/effects/haste-slow";
import type { ModuleCreature } from "@engine/module/ModuleCreature";

import { isCreature } from "@engine/module/guards/isCreature";

/** IMMUNITY_TYPE_NEGATIVE_LEVEL */
const IMMUNITY_NEGATIVE_LEVEL = 0x1d;

/**
 * EffectNegativeLevel — onApply / onRemove.
 * int[0] = levels drained (< 101); int[1] = class index hit (set on apply).
 * Spawns Attack/Save/Skill decreases; tracks class.negativeLevels; death at effective 0;
 * creator gains permanent THP = levels×5.
 *
 * @file EffectNegativeLevel.ts
 */
export class EffectNegativeLevel extends GameEffect {
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectNegativeLevel;
    // intList[0] : levels
    // intList[1] : class index (written on apply)
  }

  private stampChild(child: GameEffect){
    child.setCreator(this.getCreator() || this.creator);
    child.setSpellId(this.getSpellId());
    child.setDurationType(this.getDurationType() || GameEffectDurationType.TEMPORARY);
    child.setDuration(this.duration);
    child.setExpireDay(this.expireDay);
    child.setExpireTime(this.expireTime);
    child.setSkipOnLoad(true);
  }

  onApply(){
    if(this.applied) return;

    const levels = this.getInt(0) || 0;
    if(levels < 0 || levels >= 0x65) return;

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;

    const creatorObj = this.getCreator();
    const versus = isCreature(creatorObj)
      ? creatorObj as ModuleCreature
      : undefined;
    if(hasImmunityType(creature, IMMUNITY_NEGATIVE_LEVEL, versus)){
      return;
    }

    super.onApply();

    const raceCount = GameState.SWRuleSet?.racialTypeCount || 0;

    // ATTACKDECREASE: amount=levels, damageType=0, race=any
    const atk = new GameState.GameEffectFactory.EffectAttackDecrease();
    this.stampChild(atk);
    atk.setInt(0, levels);
    atk.setInt(1, 0);
    atk.setInt(2, raceCount);
    creature.addEffect(atk, this.getDurationType(), this.duration);
    this.children.push(atk);

    // SAVINGTHROWDECREASE: amount=levels, save=ALL(0), race=any
    const save = new GameState.GameEffectFactory.EffectSavingThrowDecrease();
    this.stampChild(save);
    save.setInt(0, levels);
    save.setInt(1, 0);
    save.setInt(3, raceCount);
    creature.addEffect(save, this.getDurationType(), this.duration);
    this.children.push(save);

    // SKILLDECREASE: skill=0xff (all), amount=levels
    const skill = new GameState.GameEffectFactory.EffectSkillDecrease();
    this.stampChild(skill);
    skill.setInt(0, 0xff);
    skill.setInt(1, levels);
    skill.setInt(2, raceCount);
    creature.addEffect(skill, this.getDurationType(), this.duration);
    this.children.push(skill);

    // Highest raw class level (GetClassLevel idx, 0 = ignore negatives)
    let bestIdx = -1;
    let bestLevel = 0;
    for(let i = 0; i < creature.classes.length; i++){
      const raw = creature.classes[i].level || 0;
      if(raw > bestLevel){
        bestLevel = raw;
        bestIdx = i;
      }
    }
    if(bestIdx >= 0 && bestLevel > 0){
      const cls = creature.classes[bestIdx];
      cls.negativeLevels = (cls.negativeLevels || 0) + levels;
      this.setInt(1, bestIdx);

      if(creature.getTotalClassLevel(true) <= 0){
        const death = new GameState.GameEffectFactory.EffectDeath();
        death.setCreator(this.getCreator() || this.creator);
        death.setInt(0, 1);
        death.setInt(1, 1);
        death.setDurationType(GameEffectDurationType.INSTANT);
        creature.addEffect(death, GameEffectDurationType.INSTANT);
        this.children.push(death);
      }
    }

    // Creator gains permanent THP = levels × 5 (subtype | 2)
    if(versus && levels > 0){
      const thp = new GameState.GameEffectFactory.EffectTemporaryHitPoints();
      thp.setCreator(this.getCreator() || this.creator);
      thp.setSpellId(this.getSpellId());
      thp.setDurationType(GameEffectDurationType.PERMANENT);
      thp.setInt(0, levels * 5);
      thp.setSkipOnLoad(true);
      versus.addEffect(thp, GameEffectDurationType.PERMANENT);
    }
  }

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)) return;
    const creature = this.object as ModuleCreature;
    const classIdx = this.getInt(1) || 0;
    const levels = this.getInt(0) || 0;
    if(classIdx >= 0 && classIdx < creature.classes.length && levels > 0){
      const cls = creature.classes[classIdx];
      cls.negativeLevels = Math.max(0, (cls.negativeLevels || 0) - levels);
    }
    for(let i = 0; i < this.children.length; i++){
      creature.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
  }
}
