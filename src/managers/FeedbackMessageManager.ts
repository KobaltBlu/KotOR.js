import { FeedbackMessageEntry } from "../engine/FeedbackMessageEntry";

/**
 * FeedbackMessageManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file FeedbackMessageManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FeedbackMessageManager {
  static Entries: FeedbackMessageEntry[] = [];

  static AddEntry(entry: FeedbackMessageEntry){
    FeedbackMessageManager.Entries.push(entry);
  }

  static ClearEntries(){
    FeedbackMessageManager.Entries = [];
  }

}