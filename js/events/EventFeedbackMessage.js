class EventFeedbackMessage extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEvent.Type.EventFeedbackMessage;
    this.messageType = 0;
    this.intList = [];
    this.floatList = [];
    this.objectList = [];
    this.stringList = [];

  }

  eventDataFromStruct(struct){
    if(struct instanceof Struct){
      
    }
  }

  execute(){
    
  }

  saveMessageData(){
    let struct = new Struct(0xCCCC);
    struct.AddField( new Field(GFFDataTypes.BYTE, 'Type') ).SetValue(this.messageType);

    //Export message ints
    let intList = struct.AddField( new Field(GFFDataTypes.LIST, 'IntList') );
    for(let i = 0; i < this.intList.length; i++){
      let intStruct = new Struct(0xBAAD);
      intStruct.AddField( new Field(GFFDataTypes.INT, 'IntegerValue') ).SetValue(this.intList[i]);
      intList.AddChildStruct( intStruct );
    }

    //Export message floats
    let floatList = struct.AddField( new Field(GFFDataTypes.LIST, 'FloatList') );
    for(let i = 0; i < this.floatList.length; i++){
      let floatStruct = new Struct(0xBAAD);
      floatStruct.AddField( new Field(GFFDataTypes.FLOAT, 'FloatValue') ).SetValue(this.floatList[i]);
      floatList.AddChildStruct( floatStruct );
    }

    //Export message objects
    let objectList = struct.AddField( new Field(GFFDataTypes.LIST, 'ObjectList') );
    for(let i = 0; i < this.objectList.length; i++){
      let objectStruct = new Struct(0xBAAD);
      objectStruct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectValue') ).SetValue(this.objectList[i]);
      objectList.AddChildStruct( objectStruct );
    }

    //Export message strings
    let stringList = struct.AddField( new Field(GFFDataTypes.LIST, 'StringList') );
    for(let i = 0; i < this.stringList.length; i++){
      let stringStruct = new Struct(0xBAAD);
      stringStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'StringValue') ).SetValue(this.stringList[i]);
      stringList.AddChildStruct( stringStruct );
    }
    return struct;
  }

  export(){
    let struct = new Struct( 0xABCD );

    struct.AddField( new Field(GFFDataTypes.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new Field(GFFDataTypes.STRUCT, 'EventData') );
        eventData.AddChildStruct( this.script.saveMessageData() );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

module.exports = EventFeedbackMessage;