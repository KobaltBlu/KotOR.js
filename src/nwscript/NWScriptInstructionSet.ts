import * as THREE from "three";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { INWScriptDefAction } from "../interface/nwscript/INWScriptDefAction";
// import { ModuleObjectManager } from "../managers/ModuleObjectManager";
import type { NWScriptInstance } from "./NWScriptInstance";
import { NWScriptTypes } from "../enums/nwscript/NWScriptTypes";
import { NWScriptSubroutine } from "./NWScriptSubroutine";
import { NWScriptStack } from "./NWScriptStack";
import { NW_FALSE, NW_TRUE } from "./NWScriptConstants";
import type { INWScriptStoreState } from "../interface/nwscript/INWScriptStoreState";
import type { NWScriptInstruction } from "./NWScriptInstruction";
import { GameState } from "../GameState";

/**
 * CALL_CPDOWNSP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_CPDOWNSP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  //Replace the target stack element with the appropriate element relative to the top of the stack
  this.stack.stack.copyWithin(
    Math.max((this.stack.pointer + instruction.offset) / 4, 0),
    (this.stack.pointer - instruction.size)/4,
    (this.stack.pointer)/4,
  );
}

/**
 * CALL_RSADD
 * 
 * Reserve Space On Stack
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_CPTOPSP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_CPTOPSP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const elements = this.stack.copyAtPointer( instruction.offset, instruction.size );
  if(elements.length == (instruction.size / 4)){
    this.stack.stack.push( ...elements );
    this.stack.pointer += instruction.size;
  }else{
    throw new Error(`CPTOPSP: copy size miss-match, expected: ${instruction.size} | received: ${elements.length*4}`);
  }
}

/**
 * CALL_CONST
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_ACTION
 * 
 * Constant Type is declared by the next byte x03, x04, x05, x06
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_ACTION = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const action_definition: INWScriptDefAction = instruction.actionDefinition;
  const args: any[] = [];

  for(let i = 0, len = action_definition.args.length; i < len; i++){
    switch(action_definition.args[i]){
      case NWScriptDataType.OBJECT:
        args.push( this.stack.pop()?.value );
        //Test for and fix instances where an object id is pushed instead of an object reference
        if(typeof args[i] == 'number') args[i] = GameState.ModuleObjectManager.GetObjectById(args[i]);
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
      if(typeof actionValue == 'undefined' && action_definition.type != NWScriptDataType.OBJECT){
        console.warn(`${action_definition.name} returned undefined`);
      }
      this.stack.push( actionValue, action_definition.type );
    }
  }else{
    console.warn(`NWScript Action ${action_definition.name} not found`, action_definition);
  }

}

/**
 * CALL_LOGANDII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_LOGANDII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  if(this.var1 && this.var2)
    this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
  else
    this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
}

/**
 * CALL_LOGORII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_LOGORII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  if(this.var1 || this.var2)
    this.stack.push( NW_TRUE, NWScriptDataType.INTEGER )//TRUE
  else
    this.stack.push( NW_FALSE, NWScriptDataType.INTEGER )//FALSE
}

/**
 * CALL_INCORII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_INCORII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  this.stack.push( this.var1 | this.var2, NWScriptDataType.INTEGER );
}

/**
 * CALL_EXCORII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_EXCORII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 ^ this.var2, NWScriptDataType.INTEGER );
}

/**
 * CALL_BOOLANDII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_BOOLANDII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;

  this.stack.push( this.var1 & this.var2, NWScriptDataType.INTEGER );
}

/**
 * CALL_EQUAL
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_EQUAL= function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(instruction.type == NWScriptDataType.STRUCTURE){
    this.struct2 = [];
    this.struct1 = [];

    const count = instruction.sizeOfStructure / 4;
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

/**
 * CALL_NEQUAL
 * 
 * Constant Type is declared by the next byte x03, x04, x05, x06
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_NEQUAL = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(instruction.type == NWScriptDataType.STRUCTURE){
    this.struct2 = [];
    this.struct1 = [];

    const count = instruction.sizeOfStructure / 4;

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

/**
 * CALL_GEQ
 * 
 * Constant Type is declared by the next byte x03, x04, x05, x06
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_GT
 * 
 * Constant Type is declared by the next byte x03, x04
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_LT
 * 
 * Constant Type is declared by the next byte 0x03, 0x04
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_LEQ
 * 
 * Constant Type is declared by the next byte 0x03, 0x04
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_SHLEFTII
 * 
 * Constant Type is declared by the next byte 0x03, 0x04
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_SHLEFTII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 << this.var2, NWScriptDataType.INTEGER );
}

/**
 * CALL_SHRIGHTII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_SHRIGHTII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 >> this.var2, NWScriptDataType.INTEGER );
}

/**
 * CALL_USHRIGHTII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_USHRIGHTII = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var2 = this.stack.pop()?.value;
  this.var1 = this.stack.pop()?.value;
  this.stack.push( this.var1 >>> this.var2, NWScriptDataType.INTEGER );
}

/**
 * CALL_ADD
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_SUB
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_MUL
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_DIV
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_MOD
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_NEG
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

/**
 * CALL_COMPI
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_COMPI = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.push( ~this.stack.pop()?.value, NWScriptDataType.INTEGER );
}

/**
 * CALL_MOVSP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_MOVSP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.stack.splice(
    (this.stack.pointer += instruction.offset) / 4, 
    (Math.abs(instruction.offset)/4)
  );
}

/**
 * CALL_STORE_STATEALL
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @deprecated
 */
export const CALL_STORE_STATEALL = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  //OBSOLETE NOT SURE IF USED IN KOTOR
}

/**
 * CALL_JMP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_JMP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.seek = instruction.address + instruction.offset;
}

/**
 * CALL_JSR
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_JSR = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.seek = instruction.address + instruction.offset;
  this.subRoutine = new NWScriptSubroutine(instruction.nextInstr.address);
  this.subRoutines.push( this.subRoutine ); //Where to return to after the subRoutine is done

  if(this.subRoutines.length > 1000)
    throw 'JSR seems to be looping endlessly';
}

/**
 * CALL_JZ
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_JZ = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const popped = this.stack.pop()?.value;
  if(popped == 0){
    this.seek = instruction.address + instruction.offset;
  }
}

/**
 * CALL_RETN
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_RETN = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(!this.subRoutines.length){
    this.subRoutine = undefined;
    instruction.eof = true;
    this.running = false;
    return;
  }
  
  const subRoutine = this.subRoutines.pop();
  subRoutine.onEnd();

  this.subRoutine = this.subRoutines[this.subRoutines.length - 1];

  if(subRoutine.returnAddress == -1){
    this.seek = null;
    instruction.eof = true;
  }else{
    this.seek = subRoutine.returnAddress;
  }
}

/**
 * CALL_DESTRUCT
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
    //offset of the first element to destroy
    ( this.stack.pointer - instruction.sizeToDestroy ) / 4,
    //count of elements to destroy
    ( instruction.sizeToDestroy - instruction.sizeOfElementToSave ) / 4
  )
  
  //Adjust the stack pointer accoringly
  this.stack.pointer -= (instruction.sizeToDestroy - instruction.sizeOfElementToSave);
}

/**
 * CALL_NOTI
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_NOTI = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  if(!this.stack.pop()?.value)
    this.stack.push(NW_TRUE, NWScriptDataType.INTEGER);//TRUE
  else
    this.stack.push(NW_FALSE, NWScriptDataType.INTEGER)//FALSE
}

/**
 * CALL_DECISP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_DECISP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtPointer( instruction.offset));
  this.var1.value -= 1;
}

/**
 * CALL_INCISP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_INCISP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtPointer( instruction.offset));
  this.var1.value += 1;
}

/**
 * CALL_JNZ
 * 
 * I believe this is used in SWITCH statements
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_JNZ = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const jnzTOS = this.stack.pop()?.value;
  if(jnzTOS != 0){
    this.seek = instruction.address + instruction.offset;
  }
}

/**
 * CALL_CPDOWNBP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_CPDOWNBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.stack.copyWithin(
    (this.stack.basePointer + instruction.offset)/4,
    (this.stack.pointer     - instruction.size)/4,
  );
}

/**
 * CALL_CPTOPBP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_CPTOPBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const elements = this.stack.copyAtBasePointer( instruction.offset, instruction.size );
  if(elements.length == (instruction.size / 4)){
    this.stack.stack.push( ...elements );
    this.stack.pointer += instruction.size;
  }else{
    throw new Error(`CPTOPBP: copy size miss-match, expected: ${instruction.size} | received: ${elements.length*4}`);
  }
}

/**
 * CALL_DECIBP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_DECIBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtBasePointer( instruction.offset));
  this.var1.value -= 1;
}

/**
 * CALL_INCIBP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_INCIBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.var1 = (this.stack.getAtBasePointer( instruction.offset));
  this.var1.value += 1;
}

/**
 * CALL_SAVEBP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_SAVEBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.saveBP();
}

/**
 * CALL_RESTOREBP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_RESTOREBP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  this.stack.restoreBP();
}

/**
 * CALL_STORE_STATE
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_STORE_STATE = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  const state: INWScriptStoreState = {
    offset: instruction.nextInstr.nextInstr.address,
    base:   [], //this.stack.stack.slice(0, (instr.bpOffset/4)),
    local:  [], //this.stack.stack.slice(this.stack.stack.length-(instr.spOffset/4), this.stack.stack.length)
    instr:  instruction,
    script: this.nwscript.newInstance()
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

/**
 * CALL_NOP
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const CALL_NOP = function( this: NWScriptInstance, instruction: NWScriptInstruction ){
  //NO Operation
}