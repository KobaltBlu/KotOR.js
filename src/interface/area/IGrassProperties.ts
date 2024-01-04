/**
 * IGrassProperties interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IGrassProperties.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGrassProperties {
  ambient: number;
  density: number;
  diffuse: number;
  probability: {
    lowerLeft: number;
    lowerRight:  number;
    upperLeft:  number;
    upperRight:  number;
  }
  quadSize: number;
  textureName: string;
}