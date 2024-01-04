/**
 * IRIMResource interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IRIMResource.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IRIMResource {
  resRef: string;
  resType: number;
  unused: number;
  resId: number;
  offset: number;
  size: number;
}