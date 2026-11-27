import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { TwoDAManager } from "@/managers/TwoDAManager";
import { JournalCategory } from "@/engine/JournalCategory";
import { JournalEntry } from "@/engine/JournalEntry";
import { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import { UIIconTimerType } from "@/enums/engine/UIIconTimerType";
import { GameState } from "@/GameState";

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
  static WORLD_ENTRY_TYPE_BASE: number = 1000000;

  static NormalizePlotID(tag: string = ''): string {
    return `${tag || ''}`.replace(/\0[\s\S]*$/g,'').trim();
  }

  static GetPlotRowByTag(szPlotID: string = ''): any {
    const normalizedTag = JournalManager.NormalizePlotID(szPlotID).toLocaleLowerCase();
    if(!normalizedTag){
      return undefined;
    }

    const plotTable = TwoDAManager.datatables.get('plot');
    if(!plotTable){
      return undefined;
    }

    return Object.values(plotTable.rows).find((row: any) => {
      const label = `${row?.label || ''}`.replace(/\0[\s\S]*$/g,'').trim().toLocaleLowerCase();
      return label == normalizedTag;
    });
  }

  static AddEntry(entry: JournalEntry){
    if(!(entry instanceof JournalEntry)){
      return;
    }

    const plotId = entry?.plot_id?.toLocaleLowerCase?.();
    if(!plotId){
      JournalManager.Entries.push(entry);
      return;
    }

    const existingIndex = JournalManager.Entries.findIndex((existing) => {
      return existing?.plot_id?.toLocaleLowerCase?.() == plotId;
    });

    if(existingIndex >= 0){
      JournalManager.Entries[existingIndex] = entry;
      return;
    }

    JournalManager.Entries.push(entry);
  }

  static ClearEntries(){
    JournalManager.Entries = [];
  }

  static GetNextReceivedOrder(): number {
    return JournalManager.Entries.reduce((max, entry) => {
      return Math.max(max, Number(entry?.date) || 0, Number(entry?.time) || 0);
    }, 0) + 1;
  }

  static FormatWorldEntryMessage(title: string = '', body: string = ''): string {
    title = `${title || ''}`.trim();
    body = `${body || ''}`.trim();

    if(title && body){
      return `${title}: ${body}`;
    }

    return title || body;
  }

  static IsWorldEntryType(type: number = 0): boolean {
    return Number(type) >= JournalManager.WORLD_ENTRY_TYPE_BASE;
  }

  static GetWorldEntryType(index: number = 0): number {
    return JournalManager.WORLD_ENTRY_TYPE_BASE + Math.max(0, Math.floor(Number(index) || 0));
  }

  static GetCategoryByTag(tag: string = ''): JournalCategory {
    tag = JournalManager.NormalizePlotID(tag);
    return JournalManager.Categories.find( (cat: JournalCategory) => {
      return JournalManager.NormalizePlotID(cat.tag).toLocaleLowerCase() == tag.toLocaleLowerCase();
    });
  }

  static GetCategoryByPlotIndex(plotIndex: number = -1): JournalCategory {
    return JournalManager.Categories.find((cat: JournalCategory) => {
      return Number(cat?.plot_index) === Number(plotIndex);
    });
  }

  static GeJournalEntryByTag(tag: string = ''): JournalEntry {
    tag = JournalManager.NormalizePlotID(tag);
    return JournalManager.Entries.find( (entry: JournalEntry) => {
      return JournalManager.NormalizePlotID(entry.plot_id).toLocaleLowerCase() == tag.toLocaleLowerCase();
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
    const plot = JournalManager.GetPlotRowByTag(szPlotID);
    if(plot){
      const experience = parseInt(plot.xp, 10);
      return isNaN(experience) ? 0 : experience;
    }
    return 0;
  }

  static AwardPlotXPByTag(szPlotID: string = '', percentage: number = 0): number {
    szPlotID = JournalManager.NormalizePlotID(szPlotID);
    percentage = Number(percentage) || 0;

    if(!szPlotID || percentage <= 0 || !GameState.PartyManager){
      return 0;
    }

    const experience = JournalManager.GetJournalQuestExperience(szPlotID);
    if(experience <= 0){
      return 0;
    }

    const amount = Math.max(0, Math.floor(experience * percentage));
    if(amount <= 0){
      return 0;
    }

    GameState.PartyManager.GiveXP(amount);
    return amount;
  }

  static AwardPlotXPByIndex(plotIndex: number = -1, percentage: number = 0): number {
    const category = JournalManager.GetCategoryByPlotIndex(plotIndex);
    if(!category?.tag){
      return 0;
    }

    return JournalManager.AwardPlotXPByTag(category.tag, percentage);
  }

  static AddJournalQuestEntry(szPlotID: string = '', state: number = 0, allowOverrideHigher: boolean = false): boolean {
    szPlotID = JournalManager.NormalizePlotID(szPlotID);

    if(!JournalManager.PlotExists(szPlotID)){
      console.warn(`JournalManager.AddJournalQuestEntry: Unknown quest tag "${szPlotID}"`);
      return false;
    }

    let entry = JournalManager.GeJournalEntryByTag(szPlotID);
    if(entry){
      if(entry.state > state && !allowOverrideHigher){
        return false;
      }

      if(entry.state === state){
        return true;
      }

      const receivedOrder = JournalManager.GetNextReceivedOrder();
      entry.state = state;
      entry.date = receivedOrder;
      entry.time = receivedOrder;
      entry.load();
    }else{
      const receivedOrder = JournalManager.GetNextReceivedOrder();
      entry = new JournalEntry();
      entry.plot_id = szPlotID;
      entry.state = state;
      entry.date = receivedOrder;
      entry.time = receivedOrder;
      entry.load();
      JournalManager.AddEntry(entry);
    }

    if(GameState.UINotificationManager){
      GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.JOURNAL_ENTRY_ADDED);
    }

    JournalManager.AwardPlotXPByTag(entry.plot_id, entry.entry?.xp_percentage || 0);

    return true;
  }

  static AddJournalWorldEntry(nIndex: number = 0, sTitle: string = '', sBody: string = ''): boolean {
    if(!GameState.FeedbackMessageManager){
      return false;
    }

    const message = JournalManager.FormatWorldEntryMessage(sTitle, sBody);
    if(!message){
      return false;
    }

    const entry = new FeedbackMessageEntry();
    entry.color = FeebackMessageColor.INFO;
    entry.type = JournalManager.GetWorldEntryType(nIndex);
    entry.message = message;

    const existingIndex = GameState.FeedbackMessageManager.Entries.findIndex((existingEntry) => {
      return existingEntry?.type === entry.type;
    });

    if(existingIndex >= 0){
      GameState.FeedbackMessageManager.Entries[existingIndex] = entry;
    }else{
      GameState.FeedbackMessageManager.AddEntry(entry);
    }

    return true;
  }

  static AddJournalWorldEntryStrref(nIndex: number = 0, nStrRef: number = 0): boolean {
    const message = GameState.TLKManager?.GetStringById(nStrRef)?.Value || '';
    return JournalManager.AddJournalWorldEntry(nIndex, '', message);
  }

  static DeleteJournalWorldAllEntries(): boolean {
    if(!GameState.FeedbackMessageManager){
      return false;
    }

    const entryCount = GameState.FeedbackMessageManager.Entries.length;
    GameState.FeedbackMessageManager.Entries = GameState.FeedbackMessageManager.Entries.filter((entry) => {
      return !JournalManager.IsWorldEntryType(entry?.type);
    });
    return GameState.FeedbackMessageManager.Entries.length != entryCount;
  }

  static DeleteJournalWorldEntry(nIndex: number = 0): boolean {
    if(!GameState.FeedbackMessageManager){
      return false;
    }

    const entryType = JournalManager.GetWorldEntryType(nIndex);
    const existingIndex = GameState.FeedbackMessageManager.Entries.findIndex((entry) => {
      return entry?.type === entryType;
    });

    if(existingIndex < 0){
      return false;
    }

    GameState.FeedbackMessageManager.Entries.splice(existingIndex, 1);
    return true;
  }

  static DeleteJournalWorldEntryStrref(nStrRef: number = 0): boolean {
    if(!GameState.FeedbackMessageManager){
      return false;
    }

    const message = GameState.TLKManager?.GetStringById(nStrRef)?.Value || '';
    const existingIndex = GameState.FeedbackMessageManager.Entries.findIndex((entry) => {
      return JournalManager.IsWorldEntryType(entry?.type) && entry?.message === message;
    });

    if(existingIndex < 0){
      return false;
    }

    GameState.FeedbackMessageManager.Entries.splice(existingIndex, 1);
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
    const hasCategory = !!JournalManager.GetCategoryByTag(szPlotID);
    const hasPlot = !!JournalManager.GetPlotRowByTag(szPlotID);
    return hasCategory || hasPlot;
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