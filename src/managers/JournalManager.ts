import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TwoDAManager } from "./TwoDAManager";

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
      ResourceLoader.loadResource(ResourceTypes.jrl, 'global').then((buffer: Buffer) => {
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

export class JournalEntry {
  date: number = 0;
  plot_id: string = '';
  state: number = 0;
  time: number = 0;

  category: JournalCategory;
  entry: JournalCategoryEntry;
  plot: any;

  constructor(){

  }

  getName(): string {
    return this.category.name.getTLKValue().Value;
  }

  getEntryText(): string {
    return this.entry.text.getTLKValue().Value;
  }

  load(): void{
    this.category = JournalManager.GetCategoryByTag(this.plot_id);
    if(this.category){
      this.entry = this.category.getEntryById(this.state);
      if(!this.entry){
        console.warn(`JournalEntry.load: Invalid State "${this.state}"`);
      }
    }else{
      console.warn(`JournalEntry.load: Invalid Category "${this.plot_id}"`);
    }
    const plotTable = TwoDAManager.datatables.get('plot');
    const plot = plotTable.getRowByColumnAndValue('label', this.plot_id.toLocaleLowerCase());
    if(plot){
      this.plot = plot;
    }
  }

  getExperience(): number {
    if(this.plot){
      return parseInt(this.plot.xp);
    }
    return 0;
  }

  toStruct(id: number = 0){
    const struct = new GFFStruct(id);
    struct.addField(new GFFField(GFFDataType.DWORD, 'JNL_Date', this.date));
    struct.addField(new GFFField(GFFDataType.DWORD, 'JNL_Time', this.time));
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'JNL_PlotID', this.category.tag));
    struct.addField(new GFFField(GFFDataType.INT, 'JNL_State', this.entry.id));
    return struct;
  }

  static FromStruct(struct: GFFStruct): JournalEntry {
    const entry = new JournalEntry();
    if(struct instanceof GFFStruct){
      if(struct.hasField('JNL_Date'))   entry.date    = struct.getFieldByLabel('JNL_Date')?.getValue();
      if(struct.hasField('JNL_PlotID')) entry.plot_id = struct.getFieldByLabel('JNL_PlotID')?.getValue();
      if(struct.hasField('JNL_State'))  entry.state   = struct.getFieldByLabel('JNL_State')?.getValue();
      if(struct.hasField('JNL_Time'))   entry.time    = struct.getFieldByLabel('JNL_Time')?.getValue();

      entry.load();

    }
    return entry;
  }

}

export class JournalCategory {
  comment: string = '';
  entries: JournalCategoryEntry[] = [];
  name: CExoLocString = new CExoLocString();
  planet_id: number = 0;
  plot_index: number = 0;
  priority: number = 0;
  tag: string = '';

  getEntryById(id: number = 0): JournalCategoryEntry {
    return this.entries.find( (entry) => {
      return entry.id == id;
    })
  }

  toStruct(id: number = 0): GFFStruct {
    const struct = new GFFStruct(id);
    struct.addField(new GFFField(GFFDataType.WORD, 'Comment', this.comment));
    struct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Name', this.name));
    struct.addField(new GFFField(GFFDataType.DWORD, 'PlanetID', this.planet_id));
    struct.addField(new GFFField(GFFDataType.DWORD, 'PlotIndex', this.plot_index));
    struct.addField(new GFFField(GFFDataType.DWORD, 'Priority', this.priority));
    struct.addField(new GFFField(GFFDataType.DWORD, 'Tag', this.tag));
    return struct;
  }

  static FromStruct(struct: GFFStruct): JournalCategory {
    const category = new JournalCategory();
    if(struct instanceof GFFStruct){
      if(struct.hasField('Comment'))    category.comment     = struct.getFieldByLabel('Comment')?.getValue();
      if(struct.hasField('Name'))       category.name        = struct.getFieldByLabel('Name')?.getCExoLocString();
      if(struct.hasField('PlanetID'))   category.planet_id   = struct.getFieldByLabel('PlanetID')?.getValue();
      if(struct.hasField('PlotIndex'))  category.plot_index  = struct.getFieldByLabel('PlotIndex')?.getValue();
      if(struct.hasField('Priority'))   category.priority    = struct.getFieldByLabel('Priority')?.getValue();
      if(struct.hasField('Tag'))        category.tag         = struct.getFieldByLabel('Tag')?.getValue();

      if(struct.hasField('EntryList')){
        const categories = struct.getFieldByLabel('EntryList').getChildStructs();
        for(let i = 0; i < categories.length; i++){
          category.entries.push(
            JournalCategoryEntry.FromStruct(categories[i])
          );
        }
      }
    }
    return category;
  }

}

export class JournalCategoryEntry {
  end: number = 0;
  id: number = 0;
  text: CExoLocString = new CExoLocString();
  xp_percentage: number = 0;

  toStruct(id: number = 0): GFFStruct {
    const struct = new GFFStruct(id);
    struct.addField(new GFFField(GFFDataType.WORD, 'End', this.end));
    struct.addField(new GFFField(GFFDataType.DWORD, 'ID', this.id));
    struct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text', this.text));
    struct.addField(new GFFField(GFFDataType.FLOAT, 'XP_Percentage', this.xp_percentage));
    return struct;
  }

  static FromStruct(struct: GFFStruct): JournalCategoryEntry {
    const entry = new JournalCategoryEntry();
    if(struct instanceof GFFStruct){
      if(struct.hasField('End'))            entry.end           = struct.getFieldByLabel('End')?.getValue();
      if(struct.hasField('ID'))             entry.id            = struct.getFieldByLabel('ID')?.getValue();
      if(struct.hasField('Text'))           entry.text          = struct.getFieldByLabel('Text')?.getCExoLocString();
      if(struct.hasField('XP_Percentage'))  entry.xp_percentage = struct.getFieldByLabel('XP_Percentage')?.getValue();
    }
    return entry;
  }
}
