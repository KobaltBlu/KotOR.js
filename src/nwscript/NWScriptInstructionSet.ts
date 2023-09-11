import * as THREE from "three";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { NWScriptDefAction } from "../interface/nwscript/NWScriptDefAction";
import { ModuleObjectManager } from "../managers/ModuleObjectManager";
import { NWScriptInstance } from "./NWScriptInstance";
import { NWScriptTypes } from "../enums/nwscript/NWScriptTypes";
import { NWScriptSubroutine } from "./NWScriptSubroutine";
import { NWScriptStack } from "./NWScriptStack";
import { NW_FALSE, NW_TRUE } from "./NWScriptConstants";
import type { NWScriptStoreState } from "../interface/nwscript/NWScriptStoreState";
import type { NWScriptInstruction } from "./NWScriptInstruction";

export const CALL_CPDOWNSP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  //Replace the target stack element with the appropriate element relative to the top of the stack
  this.stack.stack.copyWithin(
    Math.max((this.stack.pointer + instruction.offset) / 4, 0),
    (this.stack.pointer - instruction.size)/4,
    (this.stack.pointer)/4,
  );
}
  
export const CALL_RSADD = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  switch(instruction.type){
    case 3:
      this.stack.push(0, NWScriptDataType.INTEGER);
    break;
    case 4:
      this.stack.push(0.0, NWScriptDataType.FLOAT);
    break;
    case 5:
      this.stack.push('', NWScriptDataType.STRING);
    break;
    case 6:
      this.stack.push(undefined, NWScriptDataType.OBJECT);
    break;
    case 16:
      this.stack.push(undefined, NWScriptDataType.EFFECT);
    break;
    case 17:
      this.stack.push(undefined, NWScriptDataType.EVENT);
    break;
    case 18:
      this.stack.push(undefined, NWScriptDataType.LOCATION);
    break;
    case 19:
      this.stack.push(undefined, NWScriptDataType.TALENT);
    break;
    default:
      console.log(instruction);
      throw 'unknown type '+instruction.type;
    break;
  }
}
//Reserve Space On Stack

export const CALL_CPTOPSP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const elements = this.stack.copyAtPointer( instruction.pointer, instruction.size );
  if(elements.length == (instruction.size / 4)){
    this.stack.stack.push( ...elements );
    this.stack.pointer += instruction.size;
  }else{
    throw new Error(`CPTOPSP: copy size miss-match, expected: ${instruction.size} | received: ${elements.length*4}`);
  }
}

export const CALL_CONST = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  switch(instruction.type){
    case 3:
      this.stack.push(instruction.integer, NWScriptDataType.INTEGER);
    break;
    case 4:
      this.stack.push(instruction.float, NWScriptDataType.FLOAT);
    break;
    case 5:
      this.stack.push(instruction.string, NWScriptDataType.STRING);
    break;
    case 6:
      if(instruction.object == 0){
        this.stack.push(this.caller, NWScriptDataType.OBJECT);
      }else{
        this.stack.push(undefined, NWScriptDataType.OBJECT);
      }
    break;
    case 12:
      this.stack.push(instruction.string, NWScriptDataType.LOCATION);
    break;
    default:
      console.warn('CONST', instruction.type, instruction);
    break;
  }
}

//Constant Type is declared by the next byte x03, x04, x05, x06
export const CALL_ACTION = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const action_definition: NWScriptDefAction = this.actionsMap[instruction.action];
  const args: any[] = [];

  for(let i = 0, len = action_definition.args.length; i < len; i++){
    switch(action_definition.args[i]){
      case NWScriptDataType.OBJECT:
        args.push( this.stack.pop()?.value );
        //Test for and fix instances where an object id is pushed instead of an object reference
        if(typeof args[i] == 'number') args[i] = ModuleObjectManager.GetObjectById(args[i]);
      break;
      case NWScriptDataType.STRING:
      case NWScriptDataType.INTEGER:
      case NWScriptDataType.FLOAT:
      case NWScriptDataType.EFFECT:
      case NWScriptDataType.EVENT:
      case NWScriptDataType.LOCATION:
      case NWScriptDataType.TALENT:
        args.push( this.stack.pop()?.value );
      break;
      case NWScriptDataType.ACTION:
        args.push( this.state.pop() );
      break;
      case NWScriptDataType.VECTOR:
        args.push(new THREE.Vector3(
          this.stack.pop()?.value,
          this.stack.pop()?.value,
          this.stack.pop()?.value
        ))
      break;
      default:
        //Pop the function variables off the stack after we are done with them
        args.push(this.stack.pop()?.value);
        console.warn('UNKNOWN ARG', action_definition, args);
      break;
    }
  }

  if(typeof action_definition.action === 'function'){
    const actionValue = action_definition.action.call(this, args);
    if(action_definition.type != NWScriptDataType.VOID){
      this.stack.push( actionValue, action_definition.type );
    }
  }else{
    console.warn(`NWScript Action ${action_definition.name} not found`, action_definition);
  }

}

export const CALL_LOGANDII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  if(this.var1 && this.var2)
    this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
  else
    this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
}

export const CALL_LOGORII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  if(this.var1 || this.var2)
    this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
  else
    this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
}

export const CALL_INCORII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  this.stack.push( this.var1 | this.var2, NWScriptDataType.INTEGER );
}

export const CALL_EXCORII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 ^ this.var2, NWScriptDataType.INTEGER );
}

export const CALL_BOOLANDII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  this.stack.push( this.var1 & this.var2, NWScriptDataType.INTEGER );
}
  
export const CALL_EQUAL= function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(instruction.type == NWScriptDataType.STRUCTURE){
    this.struct2 = [];
    this.struct1 = [];

    let count = instruction.sizeOfStructure / 4;
    //populate structure2's variables
    for(let i = 0; i < count; i++){
      this.struct2.push(this.stack.pop()?.value);
    }
    //populate structure1's variables
    for(let i = 0; i < count; i++){
      this.struct1.push(this.stack.pop()?.value);
    }

    let areStructuresEqual = true;
    //Check for equality between the structures variables
    for(let i = 0; i < count; i++){
      if(this.struct1[i] != this.struct2[i]){
        areStructuresEqual = false;
      }
    }

    // console.log('EQUALTT', areStructuresEqual, this.struct1, this.struct2);

    if(areStructuresEqual)
      this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
    else
      this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE

  }else{
    this.var2 = this.stack.pop()?.value;
    this.var1 = this.stack.pop()?.value;

    switch(instruction.type){
      case NWScriptTypes.II:
        if(this.var1 == this.var2)
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.FF:
        if(this.var1 == this.var2)
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.OO:
        if(this.var1 == this.var2)
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.SS:
        if(this.var1.toLowerCase() == this.var2.toLowerCase())
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.LOCLOC:
        if(this.locationCompare(this.var1, this.var2)){
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        }else{
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//TRUE
        }
      break;
      default:
        console.warn('EQUAL: Missing Type', instruction.type);
      break;
    }
  }
}

//Constant Type is declared by the next byte x03, x04, x05, x06
export const CALL_NEQUAL = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(instruction.type == NWScriptDataType.STRUCTURE){
    this.struct2 = [];
    this.struct1 = [];

    let count = instruction.sizeOfStructure / 4;

    //populate structure2's variables
    for(let i = 0; i < count; i++){
      this.struct2.push(this.stack.pop()?.value);
    }
    //populate structure1's variables
    for(let i = 0; i < count; i++){
      this.struct1.push(this.stack.pop()?.value);
    }

    let areStructuresEqual = true;
    //Check for equality between the structures variables
    for(let i = 0; i < count; i++){
      if(this.struct1[i] != this.struct2[i]){
        areStructuresEqual = false;
      }
    }

    // console.log('NEQUALTT', !areStructuresEqual, this.struct1, this.struct2);

    if(!areStructuresEqual)
      this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
    else
      this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE

  }else{
    this.var2 = this.stack.pop()?.value;
    this.var1 = this.stack.pop()?.value;

    switch(instruction.type){
      case NWScriptTypes.II:
        if(this.var1 != this.var2)
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.FF:
        if(this.var1 != this.var2)
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.OO:
        if(this.var1 != this.var2)
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.SS:
        if(this.var1.toLowerCase() != this.var2.toLowerCase())
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
      break;
      case NWScriptTypes.LOCLOC:
        if(!this.locationCompare(this.var1, this.var2)){
          this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
        }else{
          this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//TRUE
        }
      break;
      default:
        console.warn('NEQUAL: Missing Type', instruction.type);
      break;
    }
  }
}

//Constant Type is declared by the next byte x03, x04, x05, x06
export const CALL_GEQ = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      if(this.var1 >= this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    case NWScriptTypes.FF:
      if(this.var1 >= this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    default:
      console.warn('GEQ: Missing Type', instruction.type);
    break;
  }
}

//Constant Type is declared by the next byte x03, x04
export const CALL_GT = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      if(this.var1 > this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    case NWScriptTypes.FF:
      if(this.var1 > this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    default:
      console.warn('GT: Missing Type', instruction.type);
    break;
  }
}

//Constant Type is declared by the next byte x03, x04
export const CALL_LT = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      if(this.var1 < this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    case NWScriptTypes.FF:
      if(this.var1 < this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    default:
      console.warn('LT: Missing Type', instruction.type);
    break;
  }
}

//Constant Type is declared by the next byte x03, x04
export const CALL_LEQ = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      if(this.var1 <= this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    case NWScriptTypes.FF:
      if(this.var1 <= this.var2)
        this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
      else
        this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
    break;
    default:
      console.warn('LEQ: Missing Type', instruction.type);
    break;
  }
}

//Constant Type is declared by the next byte x03, x04
export const CALL_SHLEFTII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 << this.var2, NWScriptDataType.INTEGER );
}

export const CALL_SHRIGHTII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 >> this.var2, NWScriptDataType.INTEGER );
}

export const CALL_USHRIGHTII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 >>> this.var2, NWScriptDataType.INTEGER );
}

export const CALL_ADD = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = (this.stack.pop()?.value);
  this.var1 = (this.stack.pop()?.value);

  switch(instruction.type){
    case NWScriptTypes.II:
      this.stack.push( this.var1 + this.var2, NWScriptDataType.INTEGER );
    break;
    case NWScriptTypes.IF:
      this.stack.push( this.var1 + this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FI:
      this.stack.push( this.var1 + this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FF:
      this.stack.push( this.var1 + this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.SS:
      this.stack.push( this.var1 + this.var2, NWScriptDataType.STRING );
    break;
    case NWScriptTypes.VV:
      this.var3 = this.stack.pop()?.value;
      this.stack.push( this.var1 + this.stack.pop()?.value, NWScriptDataType.FLOAT );
      this.stack.push( this.var2 + this.stack.pop()?.value, NWScriptDataType.FLOAT );
      this.stack.push( this.var3 + this.stack.pop()?.value, NWScriptDataType.FLOAT );
    break;
    default:
      console.warn('ADD: Missing Type', instruction.type);
    break;
  }
}
 
export const CALL_SUB = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      this.stack.push( this.var1 - this.var2, NWScriptDataType.INTEGER );
    break;
    case NWScriptTypes.IF:
      this.stack.push( this.var1 - this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FI:
      this.stack.push( this.var1 - this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FF:
      this.stack.push( this.var1 - this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.VV:
      this.var3 = this.stack.pop()?.value;
      this.stack.push( this.var1 - this.stack.pop()?.value, NWScriptDataType.FLOAT );
      this.stack.push( this.var2 - this.stack.pop()?.value, NWScriptDataType.FLOAT );
      this.stack.push( this.var3 - this.stack.pop()?.value, NWScriptDataType.FLOAT );
    break;
    default:
      console.warn('SUB: Missing Type', instruction.type);
    break;
  }
}
 
export const CALL_MUL = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      this.stack.push( this.var1 * this.var2, NWScriptDataType.INTEGER );
    break;
    case NWScriptTypes.IF:
      this.stack.push( this.var1 * this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FI:
      this.stack.push( this.var1 * this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FF:
      this.stack.push( this.var1 * this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.VF:
      this.stack.push( this.var1 * this.var2, NWScriptDataType.FLOAT ); //Z
      this.stack.push( this.stack.pop()?.value * this.var2, NWScriptDataType.FLOAT ); //Y
      this.stack.push( this.stack.pop()?.value * this.var2, NWScriptDataType.FLOAT ); //X
    break;
    case NWScriptTypes.FV:
      this.stack.push( this.var1 * this.var2, NWScriptDataType.FLOAT ); //Z
      this.stack.push( this.var1 * this.stack.pop()?.value, NWScriptDataType.FLOAT ); //Y
      this.stack.push( this.var1 * this.stack.pop()?.value, NWScriptDataType.FLOAT ); //X
    break;
    default:
      console.warn('MUL: Missing Type', instruction.type);
    break;
  }
}
 
export const CALL_DIV = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      this.stack.push( (this.var1 / this.var2) | 0, NWScriptDataType.INTEGER );
    break;
    case NWScriptTypes.IF:
      this.stack.push( this.var1 / this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FI:
      this.stack.push( this.var1 / this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FF:
      this.stack.push( this.var1 / this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.VF:
      this.stack.push( this.var1 / this.var2, NWScriptDataType.FLOAT ); //Z
      this.stack.push( this.stack.pop()?.value / this.var2, NWScriptDataType.FLOAT ); //Y
      this.stack.push( this.stack.pop()?.value / this.var2, NWScriptDataType.FLOAT ); //X
    break;
  }
}
 
export const CALL_MOD = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  switch(instruction.type){
    case NWScriptTypes.II:
      this.stack.push( this.var1 % this.var2, NWScriptDataType.INTEGER );
    break;
    case NWScriptTypes.IF:
      this.stack.push( this.var1 % this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FI:
      this.stack.push( this.var1 % this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.FF:
      this.stack.push( this.var1 % this.var2, NWScriptDataType.FLOAT );
    break;
    case NWScriptTypes.VF:
      this.stack.push( this.var1 % this.var2, NWScriptDataType.FLOAT ); //Z
      this.stack.push( this.stack.pop()?.value % this.var2, NWScriptDataType.FLOAT ); //Y
      this.stack.push( this.stack.pop()?.value % this.var2, NWScriptDataType.FLOAT ); //X
    break;
  }
}
 
export const CALL_NEG = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  switch(instruction.type){
    case NWScriptTypes.I:
      this.stack.push( -this.stack.pop()?.value, NWScriptDataType.INTEGER );
    break;
    case NWScriptTypes.F:
      this.stack.push( -this.stack.pop()?.value, NWScriptDataType.FLOAT );
    break;
  }
}
 
export const CALL_COMPI = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.push( ~this.stack.pop()?.value, NWScriptDataType.INTEGER );
}
 
export const CALL_MOVSP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.stack.splice(
    (this.stack.pointer += instruction.offset) / 4, 
    (Math.abs(instruction.offset)/4)
  );
}
 
export const CALL_STORE_STATEALL = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  //OBSOLETE NOT SURE IF USED IN KOTOR
}
 
export const CALL_JMP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.seek = instruction.address + instruction.offset;
}
 
export const CALL_JSR = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  let pos = instruction.address;
  this.seek = pos + instruction.offset;
  this.subRoutine = new NWScriptSubroutine(instruction.nextInstr.address);
  this.subRoutines.push( this.subRoutine ); //Where to return to after the subRoutine is done

  if(this.subRoutines.length > 1000)
    throw 'JSR seems to be looping endlessly';
}
 
export const CALL_JZ = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  let popped = this.stack.pop()?.value;
  if(popped == 0){
    this.seek = instruction.address + instruction.offset;
  }
}
 
export const CALL_RETN = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(this.subRoutines.length){
    const subRoutine = this.subRoutines.pop();
    subRoutine.onEnd();

    this.subRoutine = this.subRoutines[this.subRoutines.length - 1];

    if(subRoutine.returnAddress == -1){
      this.seek = null;
      instruction.eof = true;
    }else{
      this.seek = subRoutine.returnAddress;
    }
  }else{
    this.subRoutine = this.subRoutines[this.subRoutines.length - 1];
    instruction.eof = true;
    this.running = false;
  }
}
 
export const CALL_DESTRUCT = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  //retrieve the elements to save from the stack by popping them off of the stack
  const elements = this.stack.stack.splice(
    //offset of the first element to retrieve
    ( ( this.stack.pointer - instruction.sizeToDestroy ) + instruction.offsetToSaveElement ) / 4,
    //count of elements to save
    instruction.sizeOfElementToSave / 4
  );
  //push the saved elements back onto the stack
  this.stack.stack.push(
    //the spread operator (...) merges the returned array elements back onto the stack array instead 
    //of pushing the array itself back onto the stack 
    ...elements
  );
  
  //destroy the remaing elements off the stack
  this.stack.stack.splice(
    //offset of the first element to destory
    ( this.stack.pointer - instruction.sizeToDestroy ) / 4,
    //count of elements to destroy
    ( instruction.sizeToDestroy - instruction.sizeOfElementToSave ) / 4
  )
  
  //Adjust the stack pointer accoringly
  this.stack.pointer -= (instruction.sizeToDestroy - instruction.sizeOfElementToSave);
}
 
export const CALL_NOTI = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(!this.stack.pop()?.value)
    this.stack.push(NW_TRUE, NWScriptDataType.INTEGER);//TRUE
  else
    this.stack.push(NW_FALSE, NWScriptDataType.INTEGER)//FALSE
}
 
export const CALL_DECISP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtPointer( instruction.offset));
  this.var1.value -= 1;
}
 
export const CALL_INCISP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtPointer( instruction.offset));
  this.var1.value += 1;
}
 
//I believe this is used in SWITCH statements
export const CALL_JNZ = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  let jnzTOS = this.stack.pop()?.value
  if(jnzTOS != 0){
    this.seek = instruction.address + instruction.offset;
  }
}
 
export const CALL_CPDOWNBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.stack.copyWithin(
    (this.stack.basePointer + instruction.offset)/4,
    (this.stack.pointer     - instruction.size)/4,
  );
}
 
export const CALL_CPTOPBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const elements = this.stack.copyAtBasePointer( instruction.pointer, instruction.size );
  if(elements.length == (instruction.size / 4)){
    this.stack.stack.push( ...elements );
    this.stack.pointer += instruction.size;
  }else{
    throw new Error(`CPTOPBP: copy size miss-match, expected: ${instruction.size} | received: ${elements.length*4}`);
  }
}
 
export const CALL_DECIBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtBasePointer( instruction.offset));
  this.var1.value -= 1;
}
 
export const CALL_INCIBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtBasePointer( instruction.offset));
  this.var1.value += 1;
}
 
export const CALL_SAVEBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.saveBP();
}
 
export const CALL_RESTOREBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.restoreBP();
}
 
export const CALL_STORE_STATE = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  let state: NWScriptStoreState = {
    offset: instruction.nextInstr.nextInstr.address,
    base:   [], //this.stack.stack.slice(0, (instr.bpOffset/4)),
    local:  [], //this.stack.stack.slice(this.stack.stack.length-(instr.spOffset/4), this.stack.stack.length)
    instr:  instruction,
    script: new NWScriptInstance( this.instructions )
  };

  //console.log('STORE_STATE', this.stack.stack.length, this.stack.basePointer);
  state.script.address = state.offset;
  state.script.offset = state.offset;
  state.script.nwscript = this.nwscript;
  state.script.isStoreState = true;
  state.script.name = this.name;
  state.script.prevByteCode = 0;
  //state.script.Definition = this.Definition;
  state.script.subRoutines = [];
  state.script.stack = new NWScriptStack();

  state.script.stack.stack = this.stack.stack.slice();
  state.script.stack.basePointer = this.stack.basePointer;
  state.script.stack.pointer = this.stack.pointer;
  state.script.caller = this.caller;
  state.script.enteringObject = this.enteringObject;
  state.script.listenPatternNumber = this.listenPatternNumber;
  state.script.listenPatternSpeaker = this.listenPatternSpeaker;
  state.script.scriptVar = this.scriptVar;
  this.state.push(state);
  state.script.state = this.state.slice();

  //console.log('STORE_STATE', state.script);

}

export const CALL_NOP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  //NO Operation
}