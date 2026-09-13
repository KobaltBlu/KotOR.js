/**
 * Placeable animation-constant → animations.2da resolution via animationIdMap.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file resolvePlaceableAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import { ModulePlaceableAnimState } from '@/enums/module/ModulePlaceableAnimState';
import type { SWAnimation } from '@/engine/rules/SWAnimation';

/**
 * Resolve a placeable animation constant using animationIdMap (keyed by 2DA
 * `__rowlabel` / animationId), not the animations array row index.
 * Returns undefined for unknown constants so callers can fall through to
 * resolveCreatureAnimation (placeables can play creature clips).
 */
export function resolvePlaceableAnimation(
  animationConstant: number,
  animationIdMap: ReadonlyMap<number, SWAnimation>,
): SWAnimation | undefined {
  switch(animationConstant){
    case ModulePlaceableAnimState.DEFAULT:        // 10000, //304 -
      return animationIdMap.get(304);
    case ModulePlaceableAnimState.DAMAGE:         // 10014, //305 - damage
      return animationIdMap.get(305);
    case ModulePlaceableAnimState.DEAD:           // 10072, //307
      return animationIdMap.get(307);
    case ModulePlaceableAnimState.ACTIVATE:       // 10073, //308 - NWSCRIPT Constant: 200
      return animationIdMap.get(308);
    case ModulePlaceableAnimState.DEACTIVATE:     // 10074, //309 - NWSCRIPT Constant: 201
      return animationIdMap.get(309);
    case ModulePlaceableAnimState.OPEN:           // 10075, //310 - NWSCRIPT Constant: 202
      return animationIdMap.get(310);
    case ModulePlaceableAnimState.CLOSE:          // 10076, //311 - NWSCRIPT Constant: 203
      return animationIdMap.get(311);
    case ModulePlaceableAnimState.CLOSE_OPEN:     // 10077, //312
      return animationIdMap.get(312);
    case ModulePlaceableAnimState.OPEN_CLOSE:     // 10078, //313
      return animationIdMap.get(313);
    case ModulePlaceableAnimState.ANIMLOOP01:     // 10106, //316 - NWSCRIPT Constant: 204
      return animationIdMap.get(316);
    case ModulePlaceableAnimState.ANIMLOOP02:     // 10107, //317 - NWSCRIPT Constant: 205
      return animationIdMap.get(317);
    case ModulePlaceableAnimState.ANIMLOOP03:     // 10108, //318 - NWSCRIPT Constant: 206
      return animationIdMap.get(318);
    case ModulePlaceableAnimState.ANIMLOOP04:     // 10110, //319 - NWSCRIPT Constant: 207
      return animationIdMap.get(319);
    case ModulePlaceableAnimState.ANIMLOOP05:     // 10111, //320 - NWSCRIPT Constant: 208
      return animationIdMap.get(320);
    case ModulePlaceableAnimState.ANIMLOOP06:     // 10112, //321 - NWSCRIPT Constant: 209
      return animationIdMap.get(321);
    case ModulePlaceableAnimState.ANIMLOOP07:     // 10113, //322 - NWSCRIPT Constant: 210
      return animationIdMap.get(322);
    case ModulePlaceableAnimState.ANIMLOOP08:     // 10114, //323 - NWSCRIPT Constant: 211
      return animationIdMap.get(323);
    case ModulePlaceableAnimState.ANIMLOOP09:     // 10115, //324 - NWSCRIPT Constant: 212
      return animationIdMap.get(324);
    case ModulePlaceableAnimState.ANIMLOOP10:     // 10116, //325 - NWSCRIPT Constant: 213
      return animationIdMap.get(325);
  }

  return undefined;
}
