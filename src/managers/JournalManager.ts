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
      let entry = JournalManager.GeJournalEntryByTag(szPlotID);
      if(entry){
        if(entry.state > state && allowOverrideHigher){
          entry.state = state;
        }else {
          entry.state = state;
        }
        // entry.date; //TODO
        // entry.time ; //TODO
        entry.load();
      }else{
        entry = new JournalEntry();
        entry.plot_id = szPlotID;
        entry.state = state;
        entry.date = 0; //TODO
        entry.time = 0; //TODO
        entry.load();
      }
    }
    return false;
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
    const plotTable = TwoDAManager.datatables.get('plot');
    const plot = plotTable.getRowByColumnAndValue('label', szPlotID.toLocaleLowerCase());
    if(plot){
      return true;
    }
    return false;
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