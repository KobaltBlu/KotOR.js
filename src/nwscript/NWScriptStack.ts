import { GameEffectFactory } from "../effects/GameEffectFactory";
import EngineLocation from "../engine/EngineLocation";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
// import { ModuleObjectManager } from "../managers";
// import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
// import { TalentFeat, TalentSkill, TalentSpell } from "../talents";
import { NWScriptEventFactory } from "./events/NWScriptEventFactory";
import { NWScriptStackVariable } from "./NWScriptStackVariable";

const STACK_PACKET_CONSTANTS = {
  STACK_ELEMENT_SIZE: 8,
  HEADER_SIZE: 16
}

/**
 * NWScriptStack class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptStack.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptStack {
  stack: NWScriptStackVariable[];
  pointer: number;
  basePointer: number;
  _storeState: {
    localStack: any; //stack.reverse(),
    globalStack: any; //globalStack.reverse(),
    pointer: any; basePointer: any;
  };
  oldBP: number;
  stackSize: number;


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

      if(type === undefined && type != NWScriptDataType.OBJECT)
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

    struct.addField( new GFFField(GFFDataType.INT, 'BasePointer') ).setValue(this.basePointer);

    let stack = struct.addField( new GFFField(GFFDataType.LIST, 'Stack') ).setValue(this.pointer);
    for(let i = 0; i < this.stack.length; i++){
      let element = this.stack[i];
      let elementStruct = new GFFStruct(i);

      elementStruct.addField( new GFFField(GFFDataType.CHAR, 'Type') ).setValue( element.type );
      switch(element.type){
        case NWScriptDataType.OBJECT:
          elementStruct.addField( new GFFField(GFFDataType.DWORD, 'Value') ).setValue( typeof element.value === 'object' ? element.value.id : 2130706432 );
        break;
        case NWScriptDataType.INTEGER:
          elementStruct.addField( new GFFField(GFFDataType.INT, 'Value') ).setValue( element.value );
        break;
        case NWScriptDataType.FLOAT:
          elementStruct.addField( new GFFField(GFFDataType.FLOAT, 'Value') ).setValue( element.value );
        break;
        case NWScriptDataType.STRING:
          elementStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Value') ).setValue( element.value );
        break;
        case NWScriptDataType.EFFECT:
          let gameDefinedStruct = new GFFStruct(0);
        break;
      }
      stack.addChildStruct(elementStruct);
    }

    struct.addField( new GFFField(GFFDataType.INT, 'StackPointer') ).setValue(this.pointer);
    struct.addField( new GFFField(GFFDataType.INT, 'StackPointer') ).setValue(this.stackSize);
  
    return struct;
  }

  static FromActionStruct = function( struct: GFFStruct, object_self?: any ){

    let stack = new NWScriptStack();
  
    stack.basePointer = struct.getFieldByLabel('BasePointer').getValue() * 4;
    stack.pointer = struct.getFieldByLabel('StackPointer').getValue() * 4;
    let stackSize = struct.getFieldByLabel('TotalSize').getValue();
  
    if(stackSize){
      let stackStructs = struct.getFieldByLabel('Stack').getChildStructs();
  
      for(let i = 0, len = stackStructs.length; i < len; i++){
  
        let stackElement = stackStructs[i];
        if(stackElement.hasField('Value')){
          let type = stackElement.getFieldByLabel('Value').getType();
          let value = stackElement.getFieldByLabel('Value').getValue();
          switch(type){
            case 4: //Object
              let obj = GameState.ModuleObjectManager.GetObjectById(value);
              
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
        }else if(stackElement.hasField('GameDefinedStrct')){
          let gameStruct = stackElement.getFieldByLabel('GameDefinedStrct').getChildStructs()[0];
  
          switch(gameStruct.getType()){
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
    let talentType = struct.getFieldByLabel('Type').getValue();
    let talent = undefined;
    switch(talentType){
      case 0:
        talent = new GameState.TalentSpell(struct.getFieldByLabel('ID').getValue());
      break;
      case 1:
        talent = new GameState.TalentFeat(struct.getFieldByLabel('ID').getValue());
      break;
      case 2:
        talent = new GameState.TalentSkill(struct.getFieldByLabel('ID').getValue());
      break;
    }
  
    talent.setItem( GameState.ModuleObjectManager.GetObjectById( struct.getFieldByLabel('Item').getValue() ) );
    talent.setItemPropertyIndex( struct.getFieldByLabel('ItemPropertyIndex').getValue() );
    talent.setCasterLevel( struct.getFieldByLabel('CasterLevel').getValue() );
    talent.setMetaType( struct.getFieldByLabel('MetaType').getValue() );
  
    return talent;
  }
  
  static LocationFromStruct = function( struct: GFFStruct ){
    return new EngineLocation(
      struct.getFieldByLabel('PositionX').getValue(),
      struct.getFieldByLabel('PositionY').getValue(),
      struct.getFieldByLabel('PositionZ').getValue(),
      struct.getFieldByLabel('OrientationX').getValue(),
      struct.getFieldByLabel('OrientationY').getValue(),
      struct.getFieldByLabel('OrientationZ').getValue(),
    );
  }
  
  static EventFromStruct = function( struct: GFFStruct ){
    let event = NWScriptEventFactory.EventFromStruct(struct);
    console.log('EventFromStruct', event, struct);
    return event;
  }
  
  static EffectFromStruct = function( struct: GFFStruct ){
  
    //https://github.com/nwnxee/unified/blob/master/NWNXLib/API/Constants/Effect.hpp
    return GameEffectFactory.EffectFromStruct( struct );
  
  }
  
  static FromEventQueueStruct = function( struct: GFFStruct ){
  
    let stack = new NWScriptStack();
  
    stack.basePointer = struct.getFieldByLabel('BasePointer').getValue() * 4;
    stack.pointer = struct.getFieldByLabel('StackPointer').getValue() * 4;
    let stackSize = struct.getFieldByLabel('TotalSize').getValue();
  
    if(stackSize){
      if(struct.hasField('Stack')){
        let stackStructs = struct.getFieldByLabel('Stack').getChildStructs();
  
        for(let i = 0, len = stackStructs.length; i < len; i++){
  
          let stackElement = stackStructs[i];
          let type = stackElement.getFieldByLabel('Type').getValue();
          let value = stackElement.getFieldByLabel('Value').getValue();
          switch(type){
            case NWScriptDataType.OBJECT: //Object
              let obj = GameState.ModuleObjectManager.GetObjectById(value);
  
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

  /**
   * Saves the stack for debugging
   * @returns The stack data
   */
  saveForDebugger(){
    const stackDataSize = (this.stack.length * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE);

    let stringCount = 0;
    let stringDataSize = 0;
    let stringPacker = [];
    for(let i = 0; i < this.stack.length; i++){
      if(this.stack[i].type != NWScriptDataType.STRING){ continue; }
      stringCount++;
      stringPacker.push(this.stack[i].value);
      stringDataSize += 4 + this.stack[i].value.length;
    }

    const totalPacketSize = STACK_PACKET_CONSTANTS.HEADER_SIZE + stackDataSize + stringDataSize;

    const stackDataOffset = STACK_PACKET_CONSTANTS.HEADER_SIZE;
    
    const data = new Uint8Array(totalPacketSize);
    const dataView = new DataView(data.buffer);

    /**
     * Write the stack header data to the packet
     */
    dataView.setInt32(0, this.basePointer, true);
    dataView.setInt32(4, this.pointer, true);
    dataView.setInt32(8, this.stack.length, true);
    dataView.setInt32(12, stringPacker.length, true);

    let stringPackerIndex = 0;
    /**
     * Write the stack element data to the packet
     */
    for(let i = 0; i < this.stack.length; i++){
      const element = this.stack[i];
      dataView.setInt32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE), element.type, true);
      if(element.type == NWScriptDataType.STRING){
        dataView.setUint32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, stringPackerIndex++, true);
      }else if(element.type == NWScriptDataType.OBJECT){
        dataView.setUint32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, (typeof element.value === 'object' ? element.value.id : 2130706432), true);
      }else if(element.type == NWScriptDataType.FLOAT){
        dataView.setFloat32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, element.value, true);
      }else{
        dataView.setInt32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, element.value, true);
      }
    }

    /**
     * Write the string data to the packet
     * We have to write these values seperately because of the variable length of the strings
     */
    let stringDataOffset = STACK_PACKET_CONSTANTS.HEADER_SIZE + stackDataSize;
    for(let i = 0; i < stringPacker.length; i++){
      const str = stringPacker[i];
      dataView.setInt32(stringDataOffset, str.length, true);
      stringDataOffset += 4;
      const chars = str.split('');
      for(let i = 0; i < chars.length; i++){
        data[stringDataOffset++] = chars[i].charCodeAt(0) & 0xFF;
      }
    }

    return data;
  }

  static FromDebuggerPacket( data: Uint8Array ): NWScriptStack {
    const dataView = new DataView(data.buffer);

    const basePointer = dataView.getInt32(0, true);
    const pointer = dataView.getInt32(4, true);
    const stackLength = dataView.getInt32(8, true);
    const stringCount = dataView.getInt32(12, true);

    const stack = new NWScriptStack();
    stack.basePointer = basePointer;
    stack.pointer = pointer;

    const stackDataSize = (stackLength * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE);
    const stackDataOffset = STACK_PACKET_CONSTANTS.HEADER_SIZE;
    const stackStringOffset = STACK_PACKET_CONSTANTS.HEADER_SIZE + stackDataSize;

    /**
     * Read the strings from the packet
     */
    const stringDataArray = [];
    const stringDecoder = new TextDecoder();
    let stringDataOffset = stackStringOffset;
    for(let i = 0; i < stringCount; i++){
      const stringLength = dataView.getInt32(stringDataOffset, true);
      const string = stringDecoder.decode(data.subarray(stringDataOffset + 4, stringDataOffset + 4 + stringLength));
      stringDataOffset += 4 + stringLength;
      stringDataArray.push(string);
    }

    /**
     * Read the stack elements from the packet
     */
    for(let i = 0; i < stackLength; i++){
      const elementType = dataView.getInt32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE), true);
      let elementValue = undefined;

      if(elementType == NWScriptDataType.STRING){
        elementValue = stringDataArray[dataView.getUint32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, true)];
      }else if(elementType == NWScriptDataType.OBJECT){
        elementValue = dataView.getUint32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, true);
      }else if(elementType == NWScriptDataType.FLOAT){
        elementValue = dataView.getFloat32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, true);
      }else{
        elementValue = dataView.getInt32(stackDataOffset + (i * STACK_PACKET_CONSTANTS.STACK_ELEMENT_SIZE) + 4, true);
      }
      stack.stack.push(new NWScriptStackVariable({ type: elementType, value: elementValue }));
    }

    return stack;
  }

}
