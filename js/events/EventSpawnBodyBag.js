class EventSpawnBodyBag extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEvent.Type.EventSpawnBodyBag;
    this.bodyBagId = 0;
    this.position = new THREE.Vector3;

  }

  eventDataFromStruct(struct){
    if(struct instanceof Struct){
      this.bodyBagId  = struct.GetFieldByLabel('BodyBagId').GetValue();
      this.position.x = struct.GetFieldByLabel('PositionX').GetValue();
      this.position.y = struct.GetFieldByLabel('PositionY').GetValue();
      this.position.z = struct.GetFieldByLabel('PositionZ').GetValue();
    }
  }

  execute(){

  }

  saveEventData(){
    let struct = new Struct(0x5555);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'BodyBagId' ) ).SetValue(this.bodyBagId);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'PositionX' ) ).SetValue(this.position.x);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'PositionY' ) ).SetValue(this.position.y);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'PositionZ' ) ).SetValue(this.position.z);
    return struct;
  }

  export(){
    let struct = new Struct( 0xABCD );

    struct.AddField( new Field(GFFDataTypes.DWORD, 'CallerId') ).SetValue( this.callerId );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new Field(GFFDataTypes.STRUCT, 'EventData') );
    eventData.AddChildStruct( this.saveEventData() );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue( this.objectId );
    struct.AddField( new Field(GFFDataTypes.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

module.exports = EventSpawnBodyBag;