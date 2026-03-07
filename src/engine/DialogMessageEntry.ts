import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * DialogMessageEntry class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file DialogMessageEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class DialogMessageEntry {
  message: string = '';
  speaker: string = '';

  constructor(spearker: string = '', message: string = ''){
    this.speaker = spearker;
    this.message = message;
  }

  toStruct(){
    const struct = new GFFStruct(0);
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'PT_DLG_MSG_MSG', this.message));
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'PT_DLG_MSG_SPKR', this.speaker));
    return struct;
  }

  static FromStruct(struct: GFFStruct): DialogMessageEntry {
    const entry = new DialogMessageEntry();
    if(struct instanceof GFFStruct){
      if(struct.hasField('PT_DLG_MSG_MSG')) entry.message = struct.getFieldByLabel('PT_DLG_MSG_MSG')?.getValue();
      if(struct.hasField('PT_DLG_MSG_SPKR')) entry.speaker = struct.getFieldByLabel('PT_DLG_MSG_SPKR')?.getValue();
    }
    return entry;
  }

}