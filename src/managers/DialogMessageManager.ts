import { DialogMessageEntry } from "../engine/DialogMessageEntry";

/**
 * DialogMessageManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file DialogMessageManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class DialogMessageManager {
  static Entries: DialogMessageEntry[] = [];

  static AddEntry(entry: DialogMessageEntry){
    DialogMessageManager.Entries.push(entry);
  }

  static ClearEntries(){
    DialogMessageManager.Entries = [];
  }

}
