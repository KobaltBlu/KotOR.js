

class EventTimedEvent extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEvent.Type.EventTimedEvent;

    //NWScript Instance
    this.script = undefined;

    //InstructionPtr
    this.offset = 0;
  }

  setInstructionPtr(ptr = 0){
    this.offset = ptr;
  }

  setNWScript(script = undefined){
    if(script instanceof NWScriptInstance){
      this.script = script;
    }
  }

  eventDataFromStruct(struct){
    if(struct instanceof Struct){
      let nwscript = new NWScript();
      nwscript.name = struct.GetFieldByLabel('Name').GetValue();
      nwscript.init(
        struct.GetFieldByLabel('Code').GetVoid(),
        struct.GetFieldByLabel('CodeSize').GetValue()
      );

      this.script = nwscript.newInstance();
      this.script.isStoreState = true;

      let stackStruct = struct.GetFieldByLabel('Stack').GetChildStructs()[0];
      this.script.stack = NWScriptStack.FromActionStruct(stackStruct);
      this.offset = struct.GetFieldByLabel('InstructionPtr').GetValue();
    }
  }

  execute(){
    if(this.script instanceof NWScriptInstance){
      this.script.setCaller(this.getCaller());
      this.script.beginLoop({
        _instr: null, 
        index: -1, 
        seek: this.offset,
        onComplete: () => { 
          //console.log('ScriptEvent: complete', this); 
        }
      });
    }
  }

  export(){
    let struct = new Struct( 0xABCD );

    struct.AddField( new Field(GFFDataTypes.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new Field(GFFDataTypes.STRUCT, 'EventData') );
    eventData.AddChildStruct( this.script.saveEventSituation() );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

module.exports = EventTimedEvent;