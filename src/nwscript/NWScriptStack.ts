import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { NWScriptEvent } from "./events/NWScriptEvent";
import { NWScriptStackVariable } from "./NWScriptStackVariable";

export class NWScriptStack {
  stack: any[];
  pointer: number;
  basePointer: number;
  _storeState: {
    localStack: any; //stack.reverse(),
    globalStack: any; //globalStack.reverse(),
    pointer: any; basePointer: any;
  };
  oldBP: any;


  constructor(){
    this.stack = [];
    this.pointer = 0;
    this.basePointer = 0;
  }

  //Data pushed to the stack must be no longer and no shorter than 4 bytes
  push(data: any, type?: any){
    if(data instanceof NWScriptStackVariable){
      this.stack.push( data );
    }else{
      if(type === null)
        console.warn('NWScriptStack', data, type);
        //throw 'Cannot push data to the stack with a type of NULL';

      if(type === undefined)
        console.warn('NWScriptStack', data, type);

      if(type == NWScriptDataType.VECTOR){
        if(typeof data == 'object'){
          this.stack.push( new NWScriptStackVariable({ value: data.z || 0.0, type: NWScriptDataType.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: data.y || 0.0, type: NWScriptDataType.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: data.x || 0.0, type: NWScriptDataType.FLOAT }) );
          //Increase the pointer by 8 to account for Y and X
          this.pointer += 8;
        }else{
          this.stack.push( new NWScriptStackVariable({ value: 0.0, type: NWScriptDataType.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: 0.0, type: NWScriptDataType.FLOAT }) );
          this.stack.push( new NWScriptStackVariable({ value: 0.0, type: NWScriptDataType.FLOAT }) );
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

  replace(index = -4, data?: any){

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

  replaceBP(index = -4, data?: any){
    
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

  setPointer(pos: number = 0){
    this.pointer += pos;
  }

  setBasePointer(pos: number = 0){
    this.basePointer += pos;
  }

  storeState(bpO: number = 0, spO: number = 0){

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
    let struct = new GFFStruct();

    struct.AddField( new GFFField(GFFDataType.INT, 'BasePointer') ).SetValue(this.basePointer);

    let stack = struct.AddField( new GFFField(GFFDataType.LIST, 'Stack') ).SetValue(this.pointer);
    for(let i = 0; i < this.stack.length; i++){
      let element = this.stack[i];
      let elementStruct = new GFFStruct(i);

      elementStruct.AddField( new GFFField(GFFDataType.CHAR, 'Type') ).SetValue( element.type );
      switch(element.type){
        case NWScriptDataType.OBJECT:
          elementStruct.AddField( new GFFField(GFFDataType.DWORD, 'Value') ).SetValue( element.value instanceof ModuleObject ? element.value.id : 2130706432 );
        break;
        case NWScriptDataType.INTEGER:
          elementStruct.AddField( new GFFField(GFFDataType.INT, 'Value') ).SetValue( element.value );
        break;
        case NWScriptDataType.FLOAT:
          elementStruct.AddField( new GFFField(GFFDataType.FLOAT, 'Value') ).SetValue( element.value );
        break;
        case NWScriptDataType.STRING:
          elementStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Value') ).SetValue( element.value );
        break;
        case NWScriptDataType.EFFECT:
          let gameDefinedStruct = new GFFStruct(0);
        break;
      }
      stack.AddChildStruct(elementStruct);
    }

    struct.AddField( new GFFField(GFFDataType.INT, 'StackPointer') ).SetValue(this.pointer);
    struct.AddField( new GFFField(GFFDataType.INT, 'StackPointer') ).SetValue(this.stackSize);
  
    return struct;
  }
  stackSize(stackSize: any) {
    throw new Error("Method not implemented.");
  }

  static FromActionStruct = function( struct: GFFStruct, object_self?: any ){

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
  
              stack.stack.push( new NWScriptStackVariable({ value: obj, type: NWScriptDataType.OBJECT }) );
            break;
            case 5: //int
              stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScriptDataType.INTEGER }) );
            break;
            case 8: //float
              stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScriptDataType.FLOAT }) );
            break;
            case 10: //String
              stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScriptDataType.STRING }) );
            break;
            default:
              console.error('Unknown stack element', stackElement);
            break;
          }
        }else if(stackElement.HasField('GameDefinedStrct')){
          let gameStruct = stackElement.GetFieldByLabel('GameDefinedStrct').GetChildStructs()[0];
  
          switch(gameStruct.GetType()){
            case 0: //Effect
              stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.EffectFromStruct(gameStruct), type: NWScriptDataType.EFFECT }));
            break;
            case 1: //Event
              stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.EventFromStruct(gameStruct), type: NWScriptDataType.EVENT }));
            break;
            case 2: //Location
              stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.LocationFromStruct(gameStruct), type: NWScriptDataType.LOCATION }));
            break;
            case 3: //Talent
              stack.stack.push( new NWScriptStackVariable({ value: NWScriptStack.TalentFromStruct(gameStruct), type: NWScriptDataType.TALENT }));
            break;
          }
  
        }
  
      }
    }
  
    return stack;
  
  };
  
  static TalentFromStruct = function( struct: GFFStruct ){
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
  
  static LocationFromStruct = function( struct: GFFStruct ){
    return new EngineLocation(
      struct.GetFieldByLabel('PositionX').GetValue(),
      struct.GetFieldByLabel('PositionY').GetValue(),
      struct.GetFieldByLabel('PositionZ').GetValue(),
      struct.GetFieldByLabel('OrientationX').GetValue(),
      struct.GetFieldByLabel('OrientationY').GetValue(),
      struct.GetFieldByLabel('OrientationZ').GetValue(),
    );
  }
  
  static EventFromStruct = function( struct: GFFStruct ){
    let event = NWScriptEvent.EventFromStruct(struct);
    console.log('EventFromStruct', event, struct);
    return event;
  }
  
  static EffectFromStruct = function( struct: GFFStruct ){
  
    //https://github.com/nwnxee/unified/blob/master/NWNXLib/API/Constants/Effect.hpp
    return GameEffect.EffectFromStruct( struct );
  
  }
  
  static FromEventQueueStruct = function( struct: GFFStruct ){
  
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
            case NWScriptDataType.OBJECT: //Object
              let obj = ModuleObject.GetObjectById(value);
  
              if(value == 2130706432) //this is either OBJECT_INVALID or OBJECT_SELF
                obj = undefined;
  
              stack.stack.push( new NWScriptStackVariable({ value: obj, type: NWScriptDataType.OBJECT }) );
            break;
            case NWScriptDataType.INTEGER: //int
              stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScriptDataType.INTEGER }) );
            break;
            case NWScriptDataType.FLOAT: //float
              stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScriptDataType.FLOAT }) );
            break;
            case NWScriptDataType.STRING: //String
              stack.stack.push( new NWScriptStackVariable({ value: value, type: NWScriptDataType.STRING }) );
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

}
