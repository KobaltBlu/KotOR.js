import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TwoDAManager } from "./TwoDAManager";
import { JournalCategory } from "../engine/JournalCategory";
import { JournalEntry } from "../engine/JournalEntry";
import { UIIconTimerType } from "../enums/engine/UIIconTimerType";
import { GameState } from "../GameState";
import * as path from "path";
import { GameFileSystem } from "../utility/GameFileSystem";

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

  static GetJournalEntryByTag(tag: string = ''): JournalEntry {
    return JournalManager.Entries.find( (entry: JournalEntry) => {
      return entry.plot_id.toLocaleLowerCase() == tag.toLocaleLowerCase();
    });
  }

  static GetJournalEntryState(szPlotID: string = ''): number {
    const entry = JournalManager.GetJournalEntryByTag(szPlotID);
    if(entry){
      return entry.state;
    }
    return 0;
  }

  static GetJournalQuestExperience(szPlotID: string = ''): number {
    const plotTable = TwoDAManager.datatables.get('plot');
    const plot = plotTable.getRowByColumnAndValue('label', szPlotID.toLocaleLowerCase());
    if(plot){
      return parseInt(plot.xp);
    }
    return 0;
  }

  static AddJournalQuestEntry(szPlotID: string = '', state: number = 0, allowOverrideHigher: boolean = false): boolean {
    if(JournalManager.PlotExists(szPlotID)){
      GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.JOURNAL_ENTRY_ADDED);
      let entry = JournalManager.GetJournalEntryByTag(szPlotID);
      if(entry){
        // Only update state if the new state is higher, OR if allowOverrideHigher allows going lower
        if(state > entry.state || allowOverrideHigher){
          entry.state = state;
          entry.load();
        }
      }else{
        entry = new JournalEntry();
        entry.plot_id = szPlotID;
        entry.state = state;
        entry.date = GameState.module?.timeManager?.pauseDay ?? 0;
        entry.time = GameState.module?.timeManager?.pauseTime ?? 0;
        entry.load();
        JournalManager.Entries.push(entry);
      }
      return true;
    }
    return false;
  }

  static RemoveJournalQuestEntry(szPlotID: string = ''): boolean {
    const entry = JournalManager.GetJournalEntryByTag(szPlotID);
    const index = JournalManager.Entries.indexOf(entry);
    if(index >= 0){
      JournalManager.Entries.splice(index, 1);
      return true;
    }
    return false;
  }

  static PlotExists(szPlotID: string = ''): boolean {
    const plotTable = TwoDAManager.datatables.get('plot');
    const plot = plotTable.getRowByColumnAndValue('label', szPlotID.toLocaleLowerCase());
    if(plot){
      return true;
    }
    return false;
  }

  /**
   * Exports the current journal entries to a journal.res GFF file in the given
   * save-game directory.  Called by SaveGame during every save operation so that
   * quest progress is persisted across save/load cycles.
   */
  static async ExportJournal(directory: string): Promise<void> {
    try {
      const jnl = new GFFObject();
      jnl.FileType = 'JNL ';

      const entryList = jnl.RootNode.addField(new GFFField(GFFDataType.LIST, 'JournalEntry'));
      for(let i = 0; i < JournalManager.Entries.length; i++){
        entryList.addChildStruct(JournalManager.Entries[i].toStruct(i));
      }

      await jnl.export(path.join(directory, 'journal.res'));
    } catch(e) {
      console.error('JournalManager.ExportJournal failed', e);
    }
  }

  /**
   * Loads journal entries from a journal.res file in the given save-game
   * directory.  Called by SaveGame.load() so that quest progress is restored
   * when a save game is loaded.
   */
  static async LoadJournalFromSave(directory: string): Promise<void> {
    try {
      const data = await GameFileSystem.readFile(path.join(directory, 'journal.res'));
      const jnl = new GFFObject(data);

      // Only clear entries after the file has been successfully read; this
      // preserves existing entries when journal.res is absent in older saves.
      const loaded: JournalEntry[] = [];
      if(jnl.RootNode.hasField('JournalEntry')){
        const structs = jnl.RootNode.getFieldByLabel('JournalEntry').getChildStructs();
        for(let i = 0; i < structs.length; i++){
          try {
            const entry = JournalEntry.FromStruct(structs[i]);
            loaded.push(entry);
          } catch(e) {
            console.warn('JournalManager.LoadJournalFromSave: failed to load entry', i, e);
          }
        }
      }
      JournalManager.Entries = loaded;
    } catch(e) {
      // journal.res may not exist in older saves – non-fatal
      console.warn('JournalManager.LoadJournalFromSave: journal.res not found or unreadable (non-fatal)', e);
    }
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