import type EngineLocation from "@/engine/EngineLocation";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";

/**
 * Retail CSWSArea::PlayVisualEffect @ 00507e20 (NWScript PlayVisualAreaEffect,
 * ExecuteCommandPlayVisualAreaEffect @ 00541280) — fire a visualeffects.2da
 * row at a world location. Grenade / mine impact scripts use this for the
 * explosion visual and its soundimpact.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file play-visual-area-effect.ts
 */
export function playVisualAreaEffect(
  visualEffectId: number,
  location: EngineLocation,
  creator?: ModuleObject
): void {
  console.log('[ItemCast]', 'PlayVisualAreaEffect', {
    visualEffectId,
    pos: location?.position
      ? {
          x: location.position.x,
          y: location.position.y,
          z: location.position.z,
        }
      : undefined,
    hasModule: !!GameState.module,
  });
  if(!location || !GameState.module) return;

  const effect = new GameState.GameEffectFactory.EffectVisualEffect();
  effect.setCreator(creator);
  effect.setInt(0, visualEffectId | 0);
  effect.setDurationType(GameEffectDurationType.INSTANT);
  effect.setDuration(0);
  effect.initialize();

  GameState.module.addEffect(effect, location);
}
