import type { SWAnimation } from "@engine/rules/SWAnimation";

/**
 * Standing fire-forget body gesture that may share the base slot when not driving.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IGestureAnimationState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGestureAnimationState {
  serverId: number;
  animation: SWAnimation;
  started: boolean;
  remaining: number;
  active: boolean;
}
