import { ITwoDAAnimation } from "../twoDA/ITwoDAAnimation";

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
  animation: ITwoDAAnimation;
  started: boolean;
  speed: number;
}