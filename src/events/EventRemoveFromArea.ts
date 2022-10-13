

export class EventRemoveFromArea extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventRemoveFromArea;
    this.value = 0;

  }

  eventDataFromStruct(struct){
    if(struct instanceof GFFStruct){
      this.value = struct.GetFieldByLabel('Value').GetValue();
    }
  }

  execute(){
    
  }

  saveEventData(){
    let struct = new GFFStruct(0x9999);
    struct.AddField( new GFFField(GFFDataType.BYTE, 'Value' ) ).SetValue(this.value);
    return struct;
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.AddField( new GFFField(GFFDataType.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new GFFField(GFFDataType.STRUCT, 'EventData') );
        eventData.AddChildStruct( this.script.saveEventData() );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

