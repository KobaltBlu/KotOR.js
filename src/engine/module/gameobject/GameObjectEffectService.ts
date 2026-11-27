import { DiceType } from '@core/enums/combat/DiceType';
import { GameEffectType } from '@core/enums/effects/GameEffectType';
import { Dice } from '@core/utility/Dice';
import type { EffectLink } from '@engine/effects';
import { getForceResistanceBonus } from '@engine/effects/effect-bonuses';
import type { GameEffect } from '@engine/effects/GameEffect';
import type { GameObject } from '@engine/module/GameObject';
import { isCreature } from '@engine/module/guards/isCreature';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class GameObjectEffectService {
  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  initEffects(){
    for(let i = this.host.effects.length - 1; i >= 0; i--){
      if(this.host.effects[i]?.type === GameEffectType.EffectDamage){
        this.host.effects.splice(i, 1);
      }
    }
    for(const effect of this.host.effects){
      if(!effect) continue;
      effect.initialize();
      effect.setAttachedObject(this.host);
      effect.onApply(this.host);
    }
  }

  resolveEffectObjectReferences(){
    for(const effect of this.host.effects) effect?.resolveObjectReferences?.();
  }

  addEffect(effect: GameEffect, type = 0, duration = 0){
    if(!effect){
      console.warn('AddEffect', 'Invalid GameEffect', effect);
      return;
    }
    if(effect.type == GameEffectType.EffectLink){
      const linked = effect as EffectLink;
      for(const child of [linked.effect1, linked.effect2]){
        if(!child) continue;
        child.setDurationType(type);
        child.setDuration(duration);
        // Children share the link's expiry; without it a temporary child never counts down.
        child.setExpireDay(linked.expireDay);
        child.setExpireTime(linked.expireTime);
        this.host.addEffect(child, type, duration);
      }
      return;
    }
    if(!effect.initialized) effect.initialize();
    if(!effect.id && this.runtime.getModule()){
      effect.setId(this.runtime.nextEffectId());
    }
    effect.setAttachedObject(this.host);
    effect.loadModel();
    effect.onApply(this.host);
    if(!effect.applied || effect.discardAfterApply) return;
    if(
      effect.type === GameEffectType.EffectDamage ||
      effect.type === GameEffectType.EffectResurrection ||
      effect.type === GameEffectType.EffectHeal
    ) return;
    this.host.effects.push(effect);
  }

  getEffect(type = -1){
    return this.host.effects.find((effect) => effect.type == type);
  }

  hasEffect(type = -1){
    return !!this.host.getEffect(type);
  }

  removeEffectsByCreator(creator: GameObject){
    if(!creator) return;
    for(let i = this.host.effects.length - 1; i >= 0; i--){
      const effect = this.host.effects[i];
      if(effect?.getCreator() == creator){
        this.host.effects.splice(i, 1)[0].onRemove();
      }
    }
  }

  clearAllEffects(retainSelfBuffs: boolean = false){
    for(const effect of this.host.effects.slice()){
      if(!effect) continue;
      const duration = effect.getDurationType?.() ?? (effect.subType & 0x07);
      if(duration === 3 || duration === 4 || effect.type === 0x09) continue;
      if(retainSelfBuffs && effect.creator === this.host) continue;
      this.host.removeEffect(effect);
    }
  }

  clearEffectsOnDeath(){
    for(const effect of this.host.effects.slice()){
      if(!effect) continue;
      const duration = effect.getDurationType?.() ?? (effect.subType & 0x07);
      if(duration === 3 || duration === 4 || effect.type === 0x09) continue;
      if(this.host.isEffectToIgnoreOnDeath(effect)) continue;
      this.host.removeEffect(effect);
    }
  }

  isEffectToIgnoreOnDeath(effect: GameEffect): boolean {
    if(!effect) return false;
    if(effect.type === GameEffectType.EffectDisguise) return true;
    if(effect.type === GameEffectType.EffectBeam) return true;
    return effect.type === GameEffectType.EffectVisualEffect &&
      (effect as any).visualEffect?.type_fd === 'B';
  }

  removeEffectsByType(type: number = -1){
    let effect = this.host.getEffect(type);
    while(effect){
      const index = this.host.effects.indexOf(effect);
      if(index >= 0) this.host.effects.splice(index, 1)[0].onRemove();
      effect = this.host.getEffect(type);
    }
  }

  removeEffect(effect: GameEffect){
    if(!effect) return;
    const index = this.host.effects.indexOf(effect);
    if(index >= 0) this.host.effects.splice(index, 1)[0].onRemove();
  }

  resistForce(caster: GameObject){
    if(isCreature(this.host) && isCreature(caster)){
      const bonus = getForceResistanceBonus(this.host);
      const roll = Dice.roll(1, DiceType.d20, (this.host as any).getTotalClassLevel() + bonus);
      return roll > 10 + (caster as any).getTotalClassLevel();
    }
    return 0;
  }
}
