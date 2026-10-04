import { GameState } from "@engine/runtime/GameState";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffect } from "@engine/effects/GameEffect";
import type { SWForceShield } from "@engine/rules/SWForceShield";

/**
 * EffectForceShield class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectForceShield.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectForceShield extends GameEffect {
  forceShield: SWForceShield;
  /** Child VFX + damage resistance spawned by onApply — torn down together. */
  private children: GameEffect[] = [];

  constructor(){
    super();
    this.type = GameEffectType.EffectForceShield;

    //intList[0] : ForceShield 2da id
    
  }

  initialize(){
    super.initialize();

    this.forceShield = GameState.SWRuleSet.forceShields[this.getInt(0)];

    return this;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    
    let eVisualEffect = new GameState.GameEffectFactory.EffectVisualEffect();
    eVisualEffect.setCreator(this.getCreator());
    eVisualEffect.setSpellId(this.getSpellId());
    eVisualEffect.setSubTypeUnMasked(this.getSubTypeUnMasked());
    eVisualEffect.setDuration(this.duration);
    eVisualEffect.setExpireDay(this.expireDay);
    eVisualEffect.setExpireTime(this.expireTime);
    eVisualEffect.setInt(0, this.forceShield.visualeffectdef);
    eVisualEffect.initialize();
    this.object.addEffect(eVisualEffect);
    eVisualEffect.setSkipOnLoad(true);
    this.children.push(eVisualEffect);

    let eDamageResistEffect = new GameState.GameEffectFactory.EffectDamageResistance();
    eDamageResistEffect.setCreator(this.getCreator());
    eDamageResistEffect.setSpellId(this.getSpellId());
    eDamageResistEffect.setSubTypeUnMasked(this.getSubTypeUnMasked());
    eDamageResistEffect.setDuration(this.duration);
    eDamageResistEffect.setExpireDay(this.expireDay);
    eDamageResistEffect.setExpireTime(this.expireTime);
    eDamageResistEffect.initialize();
    this.object.addEffect(eDamageResistEffect);
    eDamageResistEffect.setSkipOnLoad(true);
    this.children.push(eDamageResistEffect);

    eDamageResistEffect.setInt(0, this.forceShield.damageflags);
    eDamageResistEffect.setInt(1, this.forceShield.resistance);
    eDamageResistEffect.setInt(2, this.forceShield.amount);
    eDamageResistEffect.setInt(3, this.forceShield.vulnerflags);

  }

  onRemove(){
    super.onRemove();
    const object = this.object;
    const children = this.children;
    this.children = [];
    if(!object || !children.length) return;
    for(let i = 0; i < children.length; i++){
      object.removeEffect(children[i]);
    }
  }

}

