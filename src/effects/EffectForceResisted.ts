import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { GameState } from "@/GameState";
import { AttackSummaryStrRef } from "@/combat/attack-summary-feedback";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";

/**
 * EffectForceResisted — retail OnApplyForceResisted.
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
    // objectList[0] : oTarget (retail)
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleObject)){
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

    // Retail GetWasForcePowerSuccessful — clear on caster (effect creator)
    const creator = this.getCreator?.() || this.creator;
    if(BitWise.InstanceOfObject(creator, ModuleObjectType.ModuleCreature)){
      const cd = (creator as any).combatData;
      if(cd){
        cd.lastForcePowerSuccess = false;
      }
    }
  }
}
