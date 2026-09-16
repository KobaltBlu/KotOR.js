import { GameEffect } from "@/effects/GameEffect";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

/** Force Jump leap VFX (retail 0x3EA). */
export const FORCE_JUMP_VFX = 0x3ea;
/** Delay before EffectForceJumpDelayed apply (retail AddEventDeltaTime 300 ms). */
export const FORCE_JUMP_DELAY_SEC = 0.3;

/**
 * EffectForceJump — type 0x66.
 * Locks facing to target, schedules ForceJumpDelayed in 300 ms, applies VFX 0x3EA.
 *
 * @file EffectForceJump.ts
 */
export class EffectForceJump extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceJump;
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }

    const jumper = this.object as ModuleCreature;
    const target = this.getObject(0);
    if(!isCreature(target)){
      return;
    }

    super.onApply();

    jumper.setFacingObject?.(target);

    const delayed = new GameState.GameEffectFactory.EffectForceJumpDelayed();
    delayed.setDurationType(GameEffectDurationType.TEMPORARY);
    delayed.setCreator(this.getCreator() || jumper);
    delayed.setSpellId(this.getSpellId());
    delayed.setSkipOnLoad(true);
    delayed.setObject(0, target);
    delayed.setInt(0, this.getInt(0) | 0);
    delayed.initialize();

    this.scheduleDelayedApply(jumper, delayed, FORCE_JUMP_DELAY_SEC);

    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setDurationType(GameEffectDurationType.INSTANT);
    vfx.setInt(0, FORCE_JUMP_VFX);
    vfx.setCreator(this.getCreator() || jumper);
    vfx.setSpellId(this.getSpellId());
    vfx.setSkipOnLoad(true);
    vfx.initialize();
    jumper.addEffect(vfx);
  }

  private scheduleDelayedApply(
    jumper: ModuleCreature,
    effect: GameEffect,
    delaySec: number
  ){
    if(!GameState.module || !isObject(jumper)) return;
    const future = GameState.module.timeManager.getFutureTimeFromSeconds(
      Math.max(0, delaySec)
    );
    const event = new GameState.GameEventFactory.EventApplyEffect();
    event.setEffect(effect);
    event.setCaller(this.getCreator() || jumper);
    event.setObject(jumper);
    event.setDay(future.pauseDay);
    event.setTime(future.pauseTime);
    GameState.module.addEvent(event);
  }
}
