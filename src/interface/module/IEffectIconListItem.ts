import { OdysseyTexture } from "../../three/odyssey/OdysseyTexture";

/**
 * IEffectIconListItem interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IEffectIconListItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IEffectIconListItem {
  id: number;
  resref: string;
  texture?: OdysseyTexture;
  priority: number;
  good: boolean;
}