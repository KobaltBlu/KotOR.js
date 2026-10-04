import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameState } from "@engine/runtime/GameState";
import { AttackSummaryStrRef } from "@engine/combat/attack-summary-feedback";
import { FeebackMessageColor } from "@engine/enums/engine/FeedbackMessageColor";

import { isCreature } from "@engine/module/guards/isCreature";
import { isObject } from "@engine/module/guards/isObject";

/**
 * EffectForceResisted — onApply.
 * Spawns temporary VFX 0xFC5 on the target and status-summary
 * "<CUSTOM0> Force Resisted!" (TLK 38598). Scripts also call
 * DisplayFeedBackText for the short Resisted/Immune/Saved floaty.
 *
 * @file EffectForceResisted.ts
 */
export class EffectForceResisted extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceResisted;
    // objectList[0] : oTarget 
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!isObject(this.object)){
      return;
    }

    try{
      const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
      vfx.setCreator(this.getCreator() || this.creator);
      vfx.setInt(0, 0xFC5);
      this.object.addEffect(vfx, GameEffectDurationType.INSTANT);
    }catch(_e){
      // VFX table may not have 0xFC5 in all contexts
    }

    const target = this.getObject(0) || this.object;
    const name = target?.getName?.() || '';
    GameState.FeedbackMessageManager.AddStrRef(
      AttackSummaryStrRef.FORCE_RESISTED,
      [name],
      FeebackMessageColor.INFO,
    );

    // GetWasForcePowerSuccessful — clear on caster (effect creator)
    const creator = this.getCreator?.() || this.creator;
    if(isCreature(creator)){
      const cd = (creator as any).combatData;
      if(cd){
        cd.lastForcePowerSuccess = false;
      }
    }
  }
}
