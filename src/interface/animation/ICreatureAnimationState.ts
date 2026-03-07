import type { ModuleCreatureAnimState } from "../../enums/module/ModuleCreatureAnimState";
import type { ITwoDAAnimation } from "../twoDA/ITwoDAAnimation";

/**
 * ICreatureAnimationState interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ICreatureAnimationState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ICreatureAnimationState {
  index: ModuleCreatureAnimState;
  animation: ITwoDAAnimation;
  started: boolean;
  speed: number;
}