import { GameState } from "@/GameState";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { JournalCategory } from "@/engine/JournalCategory";
import { JournalCategoryEntry } from "@/engine/JournalCategoryEntry";

/**
 * JournalEntry class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file JournalEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
    return this.category?.name?.getTLKValue?.() || this.plot_id || '';
  }

  getEntryText(): string {
    return this.entry?.text?.getTLKValue?.() || this.getName();
  }

  getPriority(): number {
    return Number(this.category?.priority) || 0;
  }

  getPlanetId(): number {
    return Number(this.category?.planet_id) || 0;
  }

  getReceivedSortValue(): number {
    return Number(this.date) || Number(this.time) || 0;
  }

  isCompleted(): boolean {
    return !!this.entry?.end;
  }

  load(): void {
    this.plot_id = GameState.JournalManager.NormalizePlotID(this.plot_id);
    this.category = undefined;
    this.entry = undefined;
    this.plot = undefined;

    this.category = GameState.JournalManager.GetCategoryByTag(this.plot_id);
    if(this.category){
      this.entry = this.category.getEntryById(this.state);
      if(!this.entry){
        console.warn(`JournalEntry.load: Invalid State "${this.state}"`);
      }
    }else{
      console.warn(`JournalEntry.load: Invalid Category "${this.plot_id}"`);
    }

    const plot = GameState.JournalManager.GetPlotRowByTag(this.plot_id);
    if(!plot){
      return;
    }

    this.plot = plot;
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
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'JNL_PlotID', this.category?.tag || this.plot_id));
    struct.addField(new GFFField(GFFDataType.INT, 'JNL_State', this.entry?.id ?? this.state));
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
