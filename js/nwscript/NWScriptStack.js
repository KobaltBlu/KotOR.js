class NWScriptStackVariable {

  constructor(args = {}){
    const {value, type} = args;
    this.value = value;
    this.type = type;

    if(this.value == undefined && this.type == NWScript.DATATYPE.STRING){
      this.value = ''; console.warn('NWScriptStackVariable', 'Undefined STRING');
    }

    if(this.value == undefined && this.type == NWScript.DATATYPE.INTEGER){
      this.value = 0; console.warn('NWScriptStackVariable', 'Undefined INTEGER');
    }

  }

}

class NWScriptStack {


  constructor(){
    this.stack = [];
    this.pointer = 0;
    this.basePointer = 0;
  }

  //Data pushed to the stack must be no longer and no shorter than 4 bytes
  push(data, type = null){
    if(data instanceof NWScriptStackVariable){
      this.stack.push( data );
    }else{
      if(type === null)
        console.warn('NWScriptStack', data, type);
        //throw 'Cannot push data to the stack with a type of NULL';

      if(type === undefined)
        console.warn('NWScriptStack', data, type);

      if(type == NWScript.DATATYPE.VECTOR){
        if(typeof data == 'object'){
          this.stack.push( new NWScriptStackVariable({ value: data.z || 0.0, type: NWScript.DATATYPE.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: data.y || 0.0, type: NWScript.DATATYPE.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: data.x || 0.0, type: NWScript.DATATYPE.FLOAT }) );
          //Increase the pointer by 8 to account for Y and X
          this.pointer += 8;
        }else{
          this.stack.push( new NWScriptStackVariable({ value: 0.0, type: NWScript.DATATYPE.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: 0.0, type: NWScript.DATATYPE.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: 0.0, type: NWScript.DATATYPE.FLOAT }) );
          //Increase the pointer by 8 to account for Y and X
          this.pointer += 8;
        }
      }else{
        this.stack.push( new NWScriptStackVariable({ value: data, type: type }) );
      }
    }
    this.pointer += 4;
  }

  pop(){
    
    this.pointer -= 4;
    return this.stack.pop();
  }

  peek(offset = 0){
    return this.stack[ ( (this.pointer - 4) - offset)  / 4];
  }

  getPointerPositionRelative(relPos = -4){
    return (this.pointer + relPos) / 4;
  }

  getAtPointer(index = -4){
    return this.stack[this.getPointerPositionRelative(index)];
  }

  getAtTop(index = -4){
    return this.stack[((this.stack.length*4) + index) / 4];
  }

  getAtBasePointer(index = -4){
    return this.stack[(this.basePointer + index) / 4];
  }

  copyAtBasePointer(index = -4, copyLength = 4){
    return this.stack.slice((this.basePointer + index) / 4, ((this.basePointer + index) / 4) + (copyLength / 4));
  }

  copyAtPointer(index = -4, copyLength = 4){
    return this.stack.slice((this.pointer + index) / 4, ((this.pointer + index) / 4) + (copyLength / 4));
  }

  replace(index = -4, data){

    /*if(!(data instanceof Uint8Array))
      throw 'Data is not of type Uint8Array';

    if(data.length != 4)
      throw 'Data is not 4Bytes in length. All data pushed to the stack must be 4Bytes in length.';*/

    /*index = index / 4; //This is always a negative value

    if(index > -1)
      throw 'Index cannot be greater than -1.';

    console.log('STACK_LEN', this.stack.length, index, (this.stack.length*4) + index)

    this.stack[this.stack.length + index] = data;*/

    //index = index / 4; //This is always a negative value
    
    //if(index > -1)
    //  throw 'Index cannot be greater than -1.';

    this.stack[((this.pointer + index)/4)] = data;

  }

  replaceBP(index = -4, data){
    
    /*if(!(data instanceof Uint8Array))
      throw 'Data is not of type Uint8Array';

    if(data.length != 4)
      throw 'Data is not 4Bytes in length. All data pushed to the stack must be 4Bytes in length.';*/

    //index = index / 4; //This is always a negative value

    /*if(index > -4)
      throw 'Index cannot be greater than -4.';

    this.stack[(this.basePointer*4) + index] = data;*/

    //index = index / 4; //This is always a negative value
    
    //if(index > -1)
    //  throw 'Index cannot be greater than -1.';
    this.stack[(this.basePointer + index)/4] = data;

  }

  getSize(){

  }

  getPointer(){
    return this.pointer;
  }

  setPointer(pos){
    this.pointer += pos;
  }

  setBasePointer(pos){
    this.basePointer += pos;
  }

  storeState(bpO, spO){

    let stack = [];
    for(let i = 0; i < spO; i++){
      let tmpPointer = (this.pointer - i);
      stack.push(this.stack[tmpPointer])
    }

    this._storeState = {
      localStack: this.stack,//stack.reverse(),
      globalStack: this.stack,//globalStack.reverse(),
      pointer: this.pointer,
      basePointer: this.basePointer
    };
    //TODO:: Actually implement this properly

  }

  restoreState(){
    this.stack = this._storeState.localStack;
    this.stack = this._storeState.globalStack;
    this.pointer = this._storeState.pointer;
    this.basePointer = this._storeState.basePointer;
    //TODO:: Actually implement this properly
  }

  saveBP() {
    this.oldBP = this.basePointer;
    this.basePointer = this.pointer;
    //this.pointer = 0;
  }

  restoreBP() {
    //alert('restore BP');
    //this.basePointer = this.oldBP;
  }

  dispose(){
    this.stack = [];
    this.pointer = 0;
    this.basePointer = 0;
  }

  saveForEventSituation(){
    let struct = new Struct();

    struct.AddField( new Field(GFFDataTypes.INT, 'BasePointer') ).SetValue(this.basePointer);

    let stack = struct.AddField( new Field(GFFDataTypes.LIST, 'Stack') ).SetValue(this.pointer);
    for(let i = 0; i < this.stack.length; i++){
      let element = this.stack[i];
      let elementStruct = new Struct(i);

      elementStruct.AddField( new Field(GFFDataTypes.CHAR, 'Type') ).SetValue( element.type );
      switch(element.type){
        case NWScript.DATATYPE.OBJECT:
          elementStruct.AddField( new Field(GFFDataTypes.DWORD, 'Value') ).SetValue( element.value instanceof ModuleObject ? element.value.id : 2130706432 );
        break;
        case NWScript.DATATYPE.INTEGER:
          elementStruct.AddField( new Field(GFFDataTypes.INT, 'Value') ).SetValue( element.value );
        break;
        case NWScript.DATATYPE.FLOAT:
          elementStruct.AddField( new Field(GFFDataTypes.FLOAT, 'Value') ).SetValue( element.value );
        break;
        case NWScript.DATATYPE.STRING:
          elementStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Value') ).SetValue( element.value );
        break;
        case NWScript.DATATYPE.NWScript.DATATYPE.EFFECT:
          let gameDefinedStruct = new Struct(0);
        break;
      }
      stack.AddChildStruct(elementStruct);
    }

    struct.AddField( new Field(GFFDataTypes.INT, 'StackPointer') ).SetValue(this.pointer);
    struct.AddField( new Field(GFFDataTypes.INT, 'StackPointer') ).SetValue(this.stackSize);
  
    return struct;
  }

}

NWScriptStack.FromActionStruct = function( struct, object_self = undefined ){

  let stack = new NWScriptStack();

  stack.basePointer = struct.GetFieldByLabel('BasePointer').GetValue() * 4;
  stack.pointer = struct.GetFieldByLabel('StackPointer').GetValue() * 4;
  let stackSize = struct.GetFieldByLabel('TotalSize').GetValue();

  if(stackSize){
    let stackStructs = struct.GetFieldByLabel('Stack').GetChildStructs();

    for(let i = 0, len = stackStructs.length; i < len; i++){

      let stackElement = stackStructs[i];
      if(stackElement.HasField('Value')){
        let type = stackElement.GetFieldByLabel('Value').GetType();
        let value = stackElement.GetFieldByLabel('Value').GetValue();
        switch(type){
          case 4: //Object
            let obj = ModuleObject.GetObjectById(value);
            
            //0x7f000000 is 2130706432
            if(value == 0x7f000000) //I can confirm that this is INVALID_OBJECT_ID or OBJECT_INVALID as stated in the Bioware_Aurora_Store_Format.pdf on the old nwn.bioware.com site
              obj = undefined;

            stack.stack.push( new NWScriptStackVariable({ value: obj, type: NWScript.DATATYPE.OBJECT }) );
          break;
          case 5: //int
            stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScript.DATATYPE.INTEGER }) );
          break;
          case 8: //float
            stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScript.DATATYPE.FLOAT }) );
          break;
          case 10: //String
            stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScript.DATATYPE.STRING }) );
          break;
          default:
            console.error('Unknown stack element', stackElement);
          break;
        }
      }else if(stackElement.HasField('GameDefinedStrct')){
        let gameStruct = stackElement.GetFieldByLabel('GameDefinedStrct').GetChildStructs()[0];

        switch(gameStruct.GetType()){
          case 0: //Effect
            stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.EffectFromStruct(gameStruct), type: NWScript.DATATYPE.EFFECT }));
          break;
          case 1: //Event
            stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.EventFromStruct(gameStruct), type: NWScript.DATATYPE.EVENT }));
          break;
          case 2: //Location
            stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.LocationFromStruct(gameStruct), type: NWScript.DATATYPE.LOCATION }));
          break;
          case 3: //Talent
            stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.TalentFromStruct(gameStruct), type: NWScript.DATATYPE.TALENT }));
          break;
        }

      }

    }
  }

  return stack;

};

NWScriptStack.TalentFromStruct = function( struct ){
  let talentType = struct.GetFieldByLabel('Type').GetValue();
  let talent = undefined;
  switch(talentType){
    case 0:
      talent = new TalentSpell(struct.GetFieldByLabel('ID').GetValue());
    break;
    case 1:
      talent = new TalentFeat(struct.GetFieldByLabel('ID').GetValue());
    break;
    case 2:
      talent = new TalentSkill(struct.GetFieldByLabel('ID').GetValue());
    break;
  }

  talent.setItem( ModuleObject.GetObjectById( struct.GetFieldByLabel('Item').GetValue() ) );
  talent.setItemPropertyIndex( struct.GetFieldByLabel('ItemPropertyIndex').GetValue() );
  talent.setCasterLevel( struct.GetFieldByLabel('CasterLevel').GetValue() );
  talent.setMetaType( struct.GetFieldByLabel('MetaType').GetValue() );

  return talent;
}

NWScriptStack.LocationFromStruct = function( struct ){
  return new Game.Location(
    struct.GetFieldByLabel('PositionX').GetValue(),
    struct.GetFieldByLabel('PositionY').GetValue(),
    struct.GetFieldByLabel('PositionZ').GetValue(),
    struct.GetFieldByLabel('OrientationX').GetValue(),
    struct.GetFieldByLabel('OrientationY').GetValue(),
    struct.GetFieldByLabel('OrientationZ').GetValue(),
  );
}

NWScriptStack.EventFromStruct = function( struct ){
  let event = NWScriptEvent.EventFromStruct(struct);
  console.log('EventFromStruct', event, struct);
  return event;
}

NWScriptStack.EffectFromStruct = function( struct ){

  //https://github.com/nwnxee/unified/blob/master/NWNXLib/API/Constants/Effect.hpp
  return GameEffect.EffectFromStruct( struct );

}

NWScriptStack.FromEventQueueStruct = function( struct ){

  let stack = new NWScriptStack();

  stack.basePointer = struct.GetFieldByLabel('BasePointer').GetValue() * 4;
  stack.pointer = struct.GetFieldByLabel('StackPointer').GetValue() * 4;
  let stackSize = struct.GetFieldByLabel('TotalSize').GetValue();

  if(stackSize){
    if(struct.HasField('Stack')){
      let stackStructs = struct.GetFieldByLabel('Stack').GetChildStructs();

      for(let i = 0, len = stackStructs.length; i < len; i++){

        let stackElement = stackStructs[i];
        let type = stackElement.GetFieldByLabel('Type').GetValue();
        let value = stackElement.GetFieldByLabel('Value').GetValue();
        switch(type){
          case NWScript.DATATYPE.OBJECT: //Object
            let obj = ModuleObject.GetObjectById(value);

            if(value == 2130706432) //this is either OBJECT_INVALID or OBJECT_SELF
              obj = undefined;

            stack.stack.push( new NWScriptStackVariable({ value: obj, type: NWScript.DATATYPE.OBJECT }) );
          break;
          case NWScript.DATATYPE.INTEGER: //int
            stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScript.DATATYPE.INTEGER }) );
          break;
          case NWScript.DATATYPE.FLOAT: //float
            stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScript.DATATYPE.FLOAT }) );
          break;
          case NWScript.DATATYPE.STRING: //String
            stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScript.DATATYPE.STRING }) );
          break;
          default:
            console.error('Unknown stack ele', stackElement);
          break;
        }

      }
    }
  }

  return stack;

};

module.exports = NWScriptStack;