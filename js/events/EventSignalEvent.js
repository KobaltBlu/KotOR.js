class EventSignalEvent extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEvent.Type.EventSignalEvent;

    this.event = undefined;

  }

  setEvent(event = undefined){
    if(event instanceof NWScriptEvent){
      this.event = event;
    }
  }

  eventDataFromStruct(struct){
    if(struct instanceof Struct){
      this.event = NWScriptEvent.EventFromStruct(struct);
    }
  }

  execute(){
    
  }

  export(){
    let struct = new Struct( 0xABCD );

    struct.AddField( new Field(GFFDataTypes.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new Field(GFFDataTypes.STRUCT, 'EventData') );
    if(this.event instanceof NWScriptEvent){
      let eStruct = this.event.save();
      eStruct.SetType(0x4444);
      eventData.AddChildStruct( eStruct );
    }
    struct.AddField( new Field(GFFDataTypes.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

module.exports = EventSignalEvent;