import { FeebackMessageColor } from "../enums/engine/FeedbackMessageColor";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * FeedbackMessageEntry class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file FeedbackMessageEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FeedbackMessageEntry {
  color: FeebackMessageColor = FeebackMessageColor.INFO;
  message: string = '';
  type: number = 0;

  constructor(){
    
  }

  toStruct(){
    const struct = new GFFStruct(0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'PT_FB_MSG_COLOR', this.color));
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'PT_FB_MSG_MSG', this.message));
    struct.addField(new GFFField(GFFDataType.DWORD, 'PT_FB_MSG_TYPE', this.type));
    return struct;
  }

  static FromStruct(struct: GFFStruct): FeedbackMessageEntry {
    const entry = new FeedbackMessageEntry();
    if(struct instanceof GFFStruct){
      if(struct.hasField('PT_FB_MSG_COLOR')) entry.color = struct.getFieldByLabel('PT_FB_MSG_COLOR')?.getValue();
      if(struct.hasField('PT_FB_MSG_MSG')) entry.message = struct.getFieldByLabel('PT_FB_MSG_MSG')?.getValue();
      if(struct.hasField('PT_FB_MSG_TYPE')) entry.type = struct.getFieldByLabel('PT_FB_MSG_TYPE')?.getValue();
    }
    return entry;
  }

}