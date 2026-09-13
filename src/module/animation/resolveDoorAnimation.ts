/**
 * Door animation-constant → animations.2da resolution via animationIdMap.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file resolveDoorAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import { ModuleDoorAnimState } from '@/enums/module/ModuleDoorAnimState';
import type { SWAnimation } from '@/engine/rules/SWAnimation';

/**
 * Resolve a door animation constant using animationIdMap (keyed by 2DA
 * `__rowlabel` / animationId), not the animations array row index.
 */
export function resolveDoorAnimation(
  animationConstant: number,
  animationIdMap: ReadonlyMap<number, SWAnimation>,
): SWAnimation | undefined {
  switch(animationConstant){
    case ModuleDoorAnimState.DEFAULT:       // 10000, //327 -
      return animationIdMap.get(327);
    case ModuleDoorAnimState.OPENED1:       // 10050, //331 -
      return animationIdMap.get(331);
    case ModuleDoorAnimState.OPENED2:       // 10051, //332 -
      return animationIdMap.get(332);
    case ModuleDoorAnimState.CLOSED:        // 10022, //333 -
      return animationIdMap.get(333);
    case ModuleDoorAnimState.OPENING1:      // 10052, //334 -
      return animationIdMap.get(334);
    case ModuleDoorAnimState.OPENING2:      // 10053, //335 -
      return animationIdMap.get(335);
    case ModuleDoorAnimState.CLOSING1:      // 10054, //336 -
      return animationIdMap.get(336);
    case ModuleDoorAnimState.CLOSING2:      // 10055, //337 -
      return animationIdMap.get(337);
    case ModuleDoorAnimState.BUSTED:        // 10153, //366 -
      return animationIdMap.get(366);
    case ModuleDoorAnimState.TRANS:         // 10269, //344 -
      return animationIdMap.get(344);
  }

  return undefined;
}
