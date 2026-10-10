import type { TalkVolume } from "@engine/enums/engine/TalkVolume";
import type { GameObject } from "@engine/module/GameObject";

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
  speaker: GameObject;
  string: string;
  volume: TalkVolume;
}