import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { JournalCategory } from "@/engine/JournalCategory";
import { JournalEntry } from "@/engine/JournalEntry";
import { UIIconTimerType } from "@/enums/engine/UIIconTimerType";
import { GameState } from "@/GameState";
import { ModuleCalendar } from "@/module/ModuleCalendar";

/** module world-notice entry (AddJournalWorldEntry*). */
export interface JournalWorldEntry {
  id: number;
  text: string;
  title: string;
  date: number;
  time: number;
  /** Present when created via AddJournalWorldEntryStrref. */
  strref?: number;
  titleStrref?: number;
}

/**
 * JournalManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file JournalManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class JournalManager {
  static Categories: JournalCategory[] = [];
  static Entries: JournalEntry[] = [];
  /** world notices (script-visible; MenuJournal UI not wired yet). */
  static WorldEntries: JournalWorldEntry[] = [];
  static SortOrder: number = 0;
  static gff: GFFObject;

  static AddEntry(entry: JournalEntry){
    JournalManager.Entries.push(entry);
  }

  static ClearEntries(){
    JournalManager.Entries = [];
  }

  static GetCategoryByTag(tag: string = ''): JournalCategory {
    return JournalManager.Categories.find( (cat: JournalCategory) => {
      return cat.tag.toLocaleLowerCase() == tag.toLocaleLowerCase();
    });
  }

  static GeJournalEntryByTag(tag: string = ''): JournalEntry {
    return JournalManager.Entries.find( (entry: JournalEntry) => {
      return entry.plot_id.toLocaleLowerCase() == tag.toLocaleLowerCase();
    });
  }

  static GetJournalEntryState(szPlotID: string = ''): number {
    const entry = JournalManager.GeJournalEntryByTag(szPlotID);
    if(entry){
      return entry.state;
    }
    return 0;
  }

  static GetJournalQuestExperience(szPlotID: string = ''): number {
    return GameState.SWRuleSet.GetPlotByLabel(szPlotID)?.xp || 0;
  }

  /** Stamp JNL_Date / JNL_Time from module calendar (Mod_PauseDay / Mod_PauseTime). */
  static stampEntryTime(entry: JournalEntry){
    const tm = GameState.module?.timeManager;
    entry.date = tm?.pauseDay ?? 0;
    entry.time = tm?.pauseTime ?? 0;
  }

  /**
   * Compare journal entries by received calendar time (pauseDay, then pauseTime).
   * Negative when a is earlier than b.
   */
  static compareReceived(a: JournalEntry, b: JournalEntry): number {
    return ModuleCalendar.comparePauseDayTime(a.date, a.time, b.date, b.time);
  }

  static AddJournalQuestEntry(szPlotID: string = '', state: number = 0, allowOverrideHigher: boolean = false): boolean {
    if(!JournalManager.PlotExists(szPlotID)){
      return false;
    }

    GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.JOURNAL_ENTRY_ADDED);
    let entry = JournalManager.GeJournalEntryByTag(szPlotID);
    if(entry){
      // : advance state unless new state is lower without allowOverrideHigher
      if(state >= entry.state || allowOverrideHigher){
        entry.state = state;
        JournalManager.stampEntryTime(entry);
        entry.load();
      }
      return true;
    }

    entry = new JournalEntry();
    entry.plot_id = szPlotID;
    entry.state = state;
    JournalManager.stampEntryTime(entry);
    entry.load();
    JournalManager.AddEntry(entry);
    return true;
  }

  static RemoveJournalQuestEntry(szPlotID: string = ''): boolean {
    const entry = JournalManager.GeJournalEntryByTag(szPlotID);
    const index = JournalManager.Entries.indexOf(entry);
    if(index >= 0){
      JournalManager.Entries.splice(index, 1);
      return true;
    }
    return false;
  }

  static PlotExists(szPlotID: string = ''): boolean {
    return !!GameState.SWRuleSet.GetPlotByLabel(szPlotID);
  }

  static stampWorldEntryTime(entry: JournalWorldEntry){
    const tm = GameState.module?.timeManager;
    entry.date = tm?.pauseDay ?? 0;
    entry.time = tm?.pauseTime ?? 0;
  }

  /** AddWorldJournalEntry — replace existing id if present. */
  static AddWorldEntry(id: number, text: string = '', title: string = ''): void {
    const entryId = id | 0;
    let entry = JournalManager.WorldEntries.find((e) => e.id === entryId);
    if(!entry){
      entry = { id: entryId, text: '', title: '', date: 0, time: 0 };
      JournalManager.WorldEntries.push(entry);
    }
    entry.text = String(text ?? '');
    entry.title = String(title ?? '');
    delete entry.strref;
    delete entry.titleStrref;
    JournalManager.stampWorldEntryTime(entry);
  }

  /** AddWorldJournalEntryStrref. */
  static AddWorldEntryStrref(strrefText: number, strrefTitle: number): void {
    const textRef = strrefText | 0;
    const titleRef = strrefTitle | 0;
    const text = GameState.TLKManager?.GetStringById?.(textRef)?.Value
      ?? GameState.TLKManager?.GetStringById?.(textRef)?.getDisplayText?.()
      ?? '';
    const title = GameState.TLKManager?.GetStringById?.(titleRef)?.Value
      ?? GameState.TLKManager?.GetStringById?.(titleRef)?.getDisplayText?.()
      ?? '';
    // Use text strref as id so DeleteWorldEntryStrref can find it
    let entry = JournalManager.WorldEntries.find((e) => e.strref === textRef || e.id === textRef);
    if(!entry){
      entry = { id: textRef, text: '', title: '', date: 0, time: 0 };
      JournalManager.WorldEntries.push(entry);
    }
    entry.id = textRef;
    entry.text = String(text ?? '');
    entry.title = String(title ?? '');
    entry.strref = textRef;
    entry.titleStrref = titleRef;
    JournalManager.stampWorldEntryTime(entry);
  }

  static DeleteAllWorldEntries(): void {
    JournalManager.WorldEntries.length = 0;
  }

  static DeleteWorldEntry(id: number): void {
    const entryId = id | 0;
    JournalManager.WorldEntries = JournalManager.WorldEntries.filter((e) => e.id !== entryId);
  }

  static DeleteWorldEntryStrref(strref: number): void {
    const ref = strref | 0;
    JournalManager.WorldEntries = JournalManager.WorldEntries.filter(
      (e) => e.strref !== ref && e.id !== ref
    );
  }

  static LoadJournal(){
    return new Promise<void>( (resolve, reject) => {
      ResourceLoader.loadResource(ResourceTypes.jrl, 'global').then((buffer: Uint8Array) => {
        JournalManager.gff = new GFFObject(buffer);
        if(JournalManager.gff.RootNode.hasField('Categories')){
          JournalManager.Categories = [];
          const categories = JournalManager.gff.RootNode.getFieldByLabel('Categories').getChildStructs();
          for(let i = 0; i < categories.length; i++){
            const struct = categories[i];
            JournalManager.Categories.push( JournalCategory.FromStruct(struct) );
          }
        }
        resolve();
      }).catch( (e) => {
        console.warn(`Failed to load global.jrl`);
        console.error(e);
        resolve();
      });
    });

  }

}
