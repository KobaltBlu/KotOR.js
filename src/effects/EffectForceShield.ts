import { EffectDamageResistance, EffectVisualEffect, GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { TwoDAManager } from "../managers/TwoDAManager";
import { ModuleObject } from "../module";

export class EffectForceShield extends GameEffect {
  forceShield: any;
  constructor(){
    super();
    this.type = GameEffectType.EffectForceShield;

    //intList[0] : ForceShield 2da id
    
  }

  async initialize(){
    super.initialize();

    const forceShield2DA = TwoDAManager.datatables.get('forceshields');
    if(forceShield2DA){
      this.forceShield = forceShield2DA.rows[this.getInt(0)];
    }

    return this;
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();
    
    let eVisualEffect = new EffectVisualEffect();
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

    let eDamageResistEffect = new EffectDamageResistance();
    eDamageResistEffect.setCreator(this.getCreator());
    eDamageResistEffect.setSpellId(this.getSpellId());
    eDamageResistEffect.setSubTypeUnMasked(this.getSubTypeUnMasked());
    eDamageResistEffect.setDuration(this.duration);
    eDamageResistEffect.setExpireDay(this.expireDay);
    eDamageResistEffect.setExpireTime(this.expireTime);
    eDamageResistEffect.initialize();
    this.object.addEffect(eDamageResistEffect);
    eDamageResistEffect.setSkipOnLoad(true);

    eDamageResistEffect.setInt(0, this.forceShield.damageflags);
    eDamageResistEffect.setInt(1, this.forceShield.resistance);
    eDamageResistEffect.setInt(2, this.forceShield.amount);
    eDamageResistEffect.setInt(3, this.forceShield.vulnerflags);

  }

}

