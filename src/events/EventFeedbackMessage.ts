export class EventFeedbackMessage extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventFeedbackMessage;
    this.messageType = 0;
    this.intList = [];
    this.floatList = [];
    this.objectList = [];
    this.stringList = [];

  }

  eventDataFromStruct(struct){
    if(struct instanceof GFFStruct){
      
    }
  }

  execute(){
    
  }

  saveMessageData(){
    let struct = new GFFStruct(0xCCCC);
    struct.AddField( new GFFField(GFFDataType.BYTE, 'Type') ).SetValue(this.messageType);

    //Export message ints
    let intList = struct.AddField( new GFFField(GFFDataType.LIST, 'IntList') );
    for(let i = 0; i < this.intList.length; i++){
      let intStruct = new GFFStruct(0xBAAD);
      intStruct.AddField( new GFFField(GFFDataType.INT, 'IntegerValue') ).SetValue(this.intList[i]);
      intList.AddChildStruct( intStruct );
    }

    //Export message floats
    let floatList = struct.AddField( new GFFField(GFFDataType.LIST, 'FloatList') );
    for(let i = 0; i < this.floatList.length; i++){
      let floatStruct = new GFFStruct(0xBAAD);
      floatStruct.AddField( new GFFField(GFFDataType.FLOAT, 'FloatValue') ).SetValue(this.floatList[i]);
      floatList.AddChildStruct( floatStruct );
    }

    //Export message objects
    let objectList = struct.AddField( new GFFField(GFFDataType.LIST, 'ObjectList') );
    for(let i = 0; i < this.objectList.length; i++){
      let objectStruct = new GFFStruct(0xBAAD);
      objectStruct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectValue') ).SetValue(this.objectList[i]);
      objectList.AddChildStruct( objectStruct );
    }

    //Export message strings
    let stringList = struct.AddField( new GFFField(GFFDataType.LIST, 'StringList') );
    for(let i = 0; i < this.stringList.length; i++){
      let stringStruct = new GFFStruct(0xBAAD);
      stringStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'StringValue') ).SetValue(this.stringList[i]);
      stringList.AddChildStruct( stringStruct );
    }
    return struct;
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.AddField( new GFFField(GFFDataType.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new GFFField(GFFDataType.STRUCT, 'EventData') );
        eventData.AddChildStruct( this.script.saveMessageData() );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

