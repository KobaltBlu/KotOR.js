export class EventSpawnBodyBag extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventSpawnBodyBag;
    this.bodyBagId = 0;
    this.position = new THREE.Vector3;

  }

  eventDataFromStruct(struct){
    if(struct instanceof GFFStruct){
      this.bodyBagId  = struct.GetFieldByLabel('BodyBagId').GetValue();
      this.position.x = struct.GetFieldByLabel('PositionX').GetValue();
      this.position.y = struct.GetFieldByLabel('PositionY').GetValue();
      this.position.z = struct.GetFieldByLabel('PositionZ').GetValue();
    }
  }

  execute(){

  }

  saveEventData(){
    let struct = new GFFStruct(0x5555);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'BodyBagId' ) ).SetValue(this.bodyBagId);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'PositionX' ) ).SetValue(this.position.x);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'PositionY' ) ).SetValue(this.position.y);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'PositionZ' ) ).SetValue(this.position.z);
    return struct;
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.AddField( new GFFField(GFFDataType.DWORD, 'CallerId') ).SetValue( this.callerId );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    eventData.AddChildStruct( this.saveEventData() );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue( this.objectId );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

