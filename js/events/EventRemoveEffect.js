class EventRemoveEffect extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEvent.Type.EventRemoveEffect;

    this.effect = undefined;

  }

  setEffect(effect){
    if(effect instanceof GameEffect){
      this.effect = effect;
    }
  }

  getEffect(){
    return this.effect;
  }

  eventDataFromStruct(struct){
    if(struct instanceof Struct){
      
    }
  }

  execute(){
    
  }

  export(){
    let struct = new Struct( 0xABCD );

    struct.AddField( new Field(GFFDataTypes.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new Field(GFFDataTypes.STRUCT, 'EventData') );
    if(this.effect instanceof GameEffect){
      let effectStruct = this.effect.save();
      effectStruct.SetType(0x1111);
      eventData.AddChildStruct( effectStruct );
    }
    struct.AddField( new Field(GFFDataTypes.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

module.exports = EventRemoveEffect;