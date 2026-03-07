import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { JournalCategoryEntry } from "./JournalCategoryEntry";

/**
 * JournalCategory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file JournalCategory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
    }) as any
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