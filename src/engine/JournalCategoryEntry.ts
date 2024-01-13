import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

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