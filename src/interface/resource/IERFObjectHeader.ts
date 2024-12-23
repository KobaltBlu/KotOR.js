/**
 * IERFObjectHeader interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IERFObjectHeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IERFObjectHeader {
  fileType: string;
  fileVersion: string;
  languageCount: number;
  localizedStringSize: number;
  entryCount: number;
  offsetToLocalizedString: number;
  offsetToKeyList: number;
  offsetToResourceList: number;
  buildYear: number;
  buildDay: number;
  DescriptionStrRef: number;
  reserved: Uint8Array;
}