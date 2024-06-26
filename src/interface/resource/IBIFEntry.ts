/**
 * IBIFEntry interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IBIFEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IBIFEntry {
  fileSize: number;
  filenameOffset: number;
  filenameSize: number;
  drives: number;
  filename: string;
}