import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TwoDAManager } from "./TwoDAManager";

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

  static LoadJournal(){
    return new Promise<void>( (resolve, reject) => {
      ResourceLoader.loadResource(ResourceTypes.jrl, 'global', (buffer: Buffer) => {
        JournalManager.gff = new GFFObject(buffer);
        if(JournalManager.gff.RootNode.HasField('Categories')){
          JournalManager.Categories = [];
          const categories = JournalManager.gff.RootNode.GetFieldByLabel('Categories').GetChildStructs();
          for(let i = 0; i < categories.length; i++){
            const struct = categories[i];
            JournalManager.Categories.push( JournalCategory.FromStruct(struct) );
          }
        }
        resolve();
      }, (err: any) => {
        console.warn(`Failed to load global.jrl`);
        console.error(err);
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
    return this.category.name.GetTLKValue().Value;
  }

  getEntryText(): string {
    return this.entry.text.GetTLKValue().Value;
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
    struct.AddField(new GFFField(GFFDataType.DWORD, 'JNL_Date', this.date));
    struct.AddField(new GFFField(GFFDataType.DWORD, 'JNL_Time', this.time));
    struct.AddField(new GFFField(GFFDataType.CEXOSTRING, 'JNL_PlotID', this.category.tag));
    struct.AddField(new GFFField(GFFDataType.INT, 'JNL_State', this.entry.id));
    return struct;
  }

  static FromStruct(struct: GFFStruct): JournalEntry {
    const entry = new JournalEntry();
    if(struct instanceof GFFStruct){
      if(struct.HasField('JNL_Date'))   entry.date    = struct.GetFieldByLabel('JNL_Date')?.GetValue();
      if(struct.HasField('JNL_PlotID')) entry.plot_id = struct.GetFieldByLabel('JNL_PlotID')?.GetValue();
      if(struct.HasField('JNL_State'))  entry.state   = struct.GetFieldByLabel('JNL_State')?.GetValue();
      if(struct.HasField('JNL_Time'))   entry.time    = struct.GetFieldByLabel('JNL_Time')?.GetValue();

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
    struct.AddField(new GFFField(GFFDataType.WORD, 'Comment', this.comment));
    struct.AddField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Name', this.name));
    struct.AddField(new GFFField(GFFDataType.DWORD, 'PlanetID', this.planet_id));
    struct.AddField(new GFFField(GFFDataType.DWORD, 'PlotIndex', this.plot_index));
    struct.AddField(new GFFField(GFFDataType.DWORD, 'Priority', this.priority));
    struct.AddField(new GFFField(GFFDataType.DWORD, 'Tag', this.tag));
    return struct;
  }

  static FromStruct(struct: GFFStruct): JournalCategory {
    const category = new JournalCategory();
    if(struct instanceof GFFStruct){
      if(struct.HasField('Comment'))    category.comment     = struct.GetFieldByLabel('Comment')?.GetValue();
      if(struct.HasField('Name'))       category.name        = struct.GetFieldByLabel('Name')?.GetCExoLocString();
      if(struct.HasField('PlanetID'))   category.planet_id   = struct.GetFieldByLabel('PlanetID')?.GetValue();
      if(struct.HasField('PlotIndex'))  category.plot_index  = struct.GetFieldByLabel('PlotIndex')?.GetValue();
      if(struct.HasField('Priority'))   category.priority    = struct.GetFieldByLabel('Priority')?.GetValue();
      if(struct.HasField('Tag'))        category.tag         = struct.GetFieldByLabel('Tag')?.GetValue();

      if(struct.HasField('EntryList')){
        const categories = struct.GetFieldByLabel('EntryList').GetChildStructs();
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
    struct.AddField(new GFFField(GFFDataType.WORD, 'End', this.end));
    struct.AddField(new GFFField(GFFDataType.DWORD, 'ID', this.id));
    struct.AddField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text', this.text));
    struct.AddField(new GFFField(GFFDataType.FLOAT, 'XP_Percentage', this.xp_percentage));
    return struct;
  }

  static FromStruct(struct: GFFStruct): JournalCategoryEntry {
    const entry = new JournalCategoryEntry();
    if(struct instanceof GFFStruct){
      if(struct.HasField('End'))            entry.end           = struct.GetFieldByLabel('End')?.GetValue();
      if(struct.HasField('ID'))             entry.id            = struct.GetFieldByLabel('ID')?.GetValue();
      if(struct.HasField('Text'))           entry.text          = struct.GetFieldByLabel('Text')?.GetCExoLocString();
      if(struct.HasField('XP_Percentage'))  entry.xp_percentage = struct.GetFieldByLabel('XP_Percentage')?.GetValue();
    }
    return entry;
  }
}
