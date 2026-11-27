/**
 * ILIPHeader interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ILIPHeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ILIPHeader {
  FileType: string,
  FileVersion: string,
  Length: number,
  EntryCount: number
}