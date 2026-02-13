import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import type { ITwoDARowData } from "../resource/TwoDAObject";
import { createScopedLogger, LogScope } from "../utility/Logger";

import { JournalCategory } from "./JournalCategory";
import { JournalCategoryEntry } from "./JournalCategoryEntry";

const log = createScopedLogger(LogScope.Game);

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
  plot: ITwoDARowData | undefined;

  constructor(){

  }

  getName(): string {
    return this.category.name.getTLKValue();
  }

  getEntryText(): string {
    return this.entry.text.getTLKValue();
  }

  load(): void {
    this.category = GameState.JournalManager.GetCategoryByTag(this.plot_id);
    if(this.category){
      this.entry = this.category.getEntryById(this.state);
      if(!this.entry){
        log.warn(`JournalEntry.load: Invalid State "${this.state}"`);
      }
    }else{
      log.warn(`JournalEntry.load: Invalid Category "${this.plot_id}"`);
    }
    const plotTable = GameState.TwoDAManager.datatables.get('plot');
    if(!plotTable){ return; }

    const plot = plotTable.getRowByColumnAndValue('label', this.plot_id.toLocaleLowerCase());
    if(!plot){ return; }

    this.plot = plot;
  }

  getExperience(): number {
    if(this.plot){
      return parseInt(String(this.plot.xp ?? 0), 10);
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
      if(struct.hasField('JNL_Date'))   entry.date    = struct.getNumberByLabel('JNL_Date');
      if(struct.hasField('JNL_PlotID')) entry.plot_id = struct.getStringByLabel('JNL_PlotID');
      if(struct.hasField('JNL_State'))  entry.state   = struct.getNumberByLabel('JNL_State');
      if(struct.hasField('JNL_Time'))   entry.time    = struct.getNumberByLabel('JNL_Time');

      entry.load();

    }
    return entry;
  }

}
