import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { SSFType } from "@/enums/resource/SSFType";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectDeath class.
 *
 * onApply:
 * plot → ignore; Min1HP → clamp to 1; else SetCurrentHitPoints(-11) + death pipeline.
 *
 * @file EffectDeath.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDeath extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDeath;

    //intList[0] : isSpectacularDeath
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!this.object) return;

    // onApply plot / Min1HP early-outs
    if((this.object as ModuleCreature).plot){
      return;
    }
    if(this.object.min1HP){
      this.object.setHP(1);
      return;
    }

    // Absolute HP — ModuleCreature.setHP must invert the same formula as getHP
    // (beast/wookiee subrace uses hitPoints+currentHitPoints).
    this.object.setHP(-11);

    if(
      isCreature(this.object) &&
      this.object.isDead() &&
      !(this.object as ModuleCreature).deathStarted
    ){
      // Kick the same deathStarted path ModuleCreature.update uses so OnDeath /
      // corpse schedule run even if the next update is skipped (dialog, etc.).
      const creature = this.object as ModuleCreature;
      creature.deathAnimationPlayed = false;
      creature.deathStarted = true;
      creature.clearAllActions();
      creature.onDeath();
      creature.playAppearanceDeathVFX?.();
      creature.playSoundSet?.(SSFType.DEAD);
      creature.resetOverlayAnimationState?.();
      creature.setAnimationState?.(ModuleCreatureAnimState.DIE);
    }
  }

  isSpeactacular(){
    return this.getInt(0);
  }

}
