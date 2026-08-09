import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { SWAnimation } from "@/engine/rules/SWAnimation";

/**
 * IDialogAnimationState interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IDialogAnimationState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IDialogAnimationState {
  animationIndex: number;
  animation: OdysseyModelAnimation;
  data: SWAnimation,
  started: boolean;
}