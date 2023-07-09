import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObject } from "../module";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScriptStack } from "../nwscript/NWScriptStack";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { GameEvent } from "./GameEvent";


export class EventTimedEvent extends GameEvent {
  offset: number;

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventTimedEvent;

    //NWScript Instance
    this.script = undefined;

    //InstructionPtr
    this.offset = 0;
  }

  setInstructionPtr(ptr = 0){
    this.offset = ptr;
  }

  setNWScript(script: NWScriptInstance){
    if(script instanceof NWScriptInstance){
      this.script = script;
    }
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      let nwscript = new NWScript();
      nwscript.name = struct.getFieldByLabel('Name').getValue();
      nwscript.init(
        struct.getFieldByLabel('Code').getVoid(),
        struct.getFieldByLabel('CodeSize').getValue()
      );

      this.script = nwscript.newInstance();
      this.script.isStoreState = true;

      let stackStruct = struct.getFieldByLabel('Stack').getChildStructs()[0];
      this.script.stack = NWScriptStack.FromActionStruct(stackStruct);
      this.offset = struct.getFieldByLabel('InstructionPtr').getValue();
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
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    eventData.addChildStruct( this.script.saveEventSituation() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

