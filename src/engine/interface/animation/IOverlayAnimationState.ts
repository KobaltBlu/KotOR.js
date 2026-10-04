import type { SWAnimation } from "@engine/rules/SWAnimation";

/**
 * IOverlayAnimationState interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOverlayAnimationState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOverlayAnimationState {
  animationIndex: number;
  animationName: string;
  animation: SWAnimation;
  started: boolean;
  speed: number;
  /** Aurora stop flag from resolveOverlayStopFlags (0x80 or 0x400). */
  stopFlag: number;
}