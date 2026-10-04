import { GameState } from "@engine/runtime/GameState";
import { GameEventType } from "@core/enums/events/GameEventType";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import type { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { GFFField } from "@core/resource/GFFField";
import { GFFStruct } from "@core/resource/GFFStruct";
import { GameEvent } from "@engine/events/GameEvent";

/**
 * EventTimedEvent class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventTimedEvent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
    if(!script){ return; }
    this.script = script;
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      let nwscript = new GameState.NWScript();
      nwscript.name = struct.getFieldByLabel('Name').getValue();
      nwscript.init(
        struct.getFieldByLabel('Code').getVoid(),
        struct.getFieldByLabel('CodeSize').getValue()
      );

      this.script = nwscript.newInstance();
      this.script.isStoreState = true;

      let stackStruct = struct.getFieldByLabel('Stack').getChildStructs()[0];
      this.script.stack = GameState.NWScript.NWScriptStack.FromActionStruct(stackStruct);
      this.offset = struct.getFieldByLabel('InstructionPtr').getValue();
    }
  }

  execute(){
    if(!this.script){ return; }
    this.script.setCaller(this.getCaller());
    this.script.seekTo(this.offset);
    this.script.runScript();
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.exportCallerId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    eventData.addChildStruct( this.script.saveEventSituation() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.exportObjectId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

