

class EventRemoveFromArea extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEvent.Type.EventRemoveFromArea;
    this.value = 0;

  }

  eventDataFromStruct(struct){
    if(struct instanceof Struct){
      this.value = struct.GetFieldByLabel('Value').GetValue();
    }
  }

  execute(){
    
  }

  saveEventData(){
    let struct = new Struct(0x9999);
    struct.AddField( new Field(GFFDataTypes.BYTE, 'Value' ) ).SetValue(this.value);
    return struct;
  }

  export(){
    let struct = new Struct( 0x9999 );

    struct.AddField( new Field(GFFDataTypes.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new Field(GFFDataTypes.STRUCT, 'EventData') );
        eventData.AddChildStruct( this.script.saveEventData() );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

module.exports = EventRemoveFromArea;