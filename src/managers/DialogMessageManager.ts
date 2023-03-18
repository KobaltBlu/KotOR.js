import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

export class DialogMessageManager {
  static Entries: DialogMessageEntry[] = [];

  static AddEntry(entry: DialogMessageEntry){
    DialogMessageManager.Entries.push(entry);
  }

  static ClearEntries(){
    DialogMessageManager.Entries = [];
  }

}

export class DialogMessageEntry {
  message: string = '';
  speaker: string = '';

  constructor(spearker: string = '', message: string = ''){
    this.speaker = spearker;
    this.message = message;
  }

  toStruct(){
    const struct = new GFFStruct(0);
    struct.AddField(new GFFField(GFFDataType.CEXOSTRING, 'PT_DLG_MSG_MSG', this.message));
    struct.AddField(new GFFField(GFFDataType.CEXOSTRING, 'PT_DLG_MSG_SPKR', this.speaker));
    return struct;
  }

  static FromStruct(struct: GFFStruct): DialogMessageEntry {
    const entry = new DialogMessageEntry();
    if(struct instanceof GFFStruct){
      if(struct.HasField('PT_DLG_MSG_MSG')) entry.message = struct.GetFieldByLabel('PT_DLG_MSG_MSG')?.GetValue();
      if(struct.HasField('PT_DLG_MSG_SPKR')) entry.speaker = struct.GetFieldByLabel('PT_DLG_MSG_SPKR')?.GetValue();
    }
    return entry;
  }

}
