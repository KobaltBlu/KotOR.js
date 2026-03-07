import type { TalkVolume } from "../../enums/engine/TalkVolume";
import type { ModuleObject } from "../../module/ModuleObject";

/**
 * IHeardString interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IHeardString.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export interface IHeardString {
  speaker: ModuleObject;
  string: string;
  volume: TalkVolume;
}