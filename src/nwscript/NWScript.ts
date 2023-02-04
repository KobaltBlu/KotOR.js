/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from "fs";
import isBuffer from "is-buffer";
import { BinaryReader } from "../BinaryReader";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { NWScriptTypes } from "../enums/nwscript/NWScriptTypes";
import { Endians } from "../enums/resource/Endians";
import { GameState } from "../GameState";
import { ModuleObject } from "../module";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameFileSystem } from "../utility/GameFileSystem";
import { NWScriptInstance } from "./NWScriptInstance";
import { NWScriptInstruction } from "./NWScriptInstruction";
import { NWScriptStack } from "./NWScriptStack";
import { NWScriptSubroutine } from "./NWScriptSubroutine";

/* @file
 * The NWScript class.
 */

export class NWScript {

  static readonly TRUE  = 1;
  static readonly FALSE = 0;
  
  name: string;

  instrIdx: number;
  _lastOffset: number;
  subscripts: Map<any, any>;
  instances: any[];
  global: boolean;
  subRoutines: any[];
  stack: NWScriptStack;
  state: any[];
  enteringObject: any;
  exitingObject: any;
  listenPatternNumber: number;
  debugging: boolean;
  debug: { action: boolean; build: boolean; equal: boolean; nequal: boolean; };
  params: number[];
  paramString: string;
  verified: boolean;
  globalCache: any;
  prevByteCode: number;
  instructions: Map<any, any>;
  eofFound: boolean;
  prog: number;
  progSize: number;
  code: any;

  constructor ( dataOrFile: any = null, onComplete?: Function, decompile = true ){

    this.instrIdx = 0;
    this._lastOffset = -1;

    this.subscripts = new Map();
    this.instances = [];
    this.global = false;

    this.subRoutines = [];
    this.stack = new NWScriptStack();
    this.state = [];

    this.enteringObject = undefined;
    this.exitingObject = undefined;
    this.listenPatternNumber = 1;
    this.debugging = false;
    this.debug = {
      'action': false,
      'build': false,
      'equal': false,
      'nequal': false
    };
    this.name = '';
    this.state = [];

    this.params = [0, 0, 0, 0, 0];
    this.paramString = '';
    this.verified = false;

    if( dataOrFile != null ) {

      if( typeof dataOrFile === 'string' ){

        GameFileSystem.readFile(dataOrFile).then( (buffer) => {
          this.decompile(buffer);
          if(typeof onComplete === 'function')
            onComplete(this);
        });

      }else if ( isBuffer(dataOrFile) ){
        if(dataOrFile.slice(0, 8).toString() == 'NCS V1.0'){
          this.init(dataOrFile);
        }
        if(typeof onComplete === 'function')
            onComplete(this);
      }

    }else{
      //init empty / new nwscript
    }

    this.globalCache = null;

  }
  
  decompile(binary: Buffer) {
    throw new Error("Method not implemented.");
  }

  verifyNCS (reader: BinaryReader){
    reader.Seek(0);
    if(this.verified || reader.ReadChars(8) == 'NCS V1.0')
      return this.verified = true;

    return false;
  }

  init (data: Buffer, progSize?: number){
    this.prevByteCode = 0;
    this.instructions = new Map();
    let reader = new BinaryReader(data);
    reader.endians = Endians.BIG;

    this.eofFound = false;

    if(!progSize){
      reader.Skip(8);
      this.prog = reader.ReadByte();
      this.progSize = reader.ReadUInt32(); //This includes the initial 8Bytes of the NCS V1.0 header and the previous byte
      
      //Store a binary code of the code for exporting ScriptSituations
      this.code = data.slice( 13, this.progSize );
      this.progSize = this.code.length;
      
      reader = new BinaryReader(this.code);
      reader.endians = Endians.BIG;
    }else{
       //Store a binary code of the code for exporting ScriptSituations
      this.code = data;
      this.progSize = progSize;
    }

    //PASS 1: Create a listing of all of the instructions in order as they occur

    this._lastOffset = -1;
    while ( reader.position < this.progSize ){
      this.parseIntr(reader);
    };
    
    reader.position = 0;

  }

  parseIntr( reader: BinaryReader ) {

    let _pos = reader.position;

    let instr = new NWScriptInstruction({
      code: reader.ReadByte(),
      type: reader.ReadByte(),
      address: _pos,
      prevInstr: ( this._lastOffset >= 0 ? this.instructions.get(this._lastOffset) : null ),
      eof: false,
      isArg: false,
      index: this.instrIdx++
    });

    //If we already have parsed an instruction set the property of nextInstr on the previous instruction to the current one
    if(this._lastOffset >= 0){
      this.instructions.get(this._lastOffset).nextInstr = instr;
    }

    if(typeof NWScript.ByteCodes[instr.code] === 'undefined'){
      console.error('Unhandled NWScript Instruction');
      console.log(this, instr);
    }

    //Run the instruction's parse method
    NWScript.ByteCodes[instr.code].parse.call(this, instr, reader);
    
    //this.instructions.push(instr);
    this.instructions.set(instr.address, instr);
    this._lastOffset = instr.address;
  }

  clone(){
    let script = new NWScript();
    script.name = this.name;
    //script.Definition = this.Definition;
    script.instructions = new Map(this.instructions);
    return script;
  }

  isDebugging(type = ''){
    if(type){
      return GameState.Flags.LogScripts || this.debugging || (this.debug as any)[type];
    }else{
      return GameState.Flags.LogScripts || this.debugging;
    }
  }

  //newInstance
  //When loading a new script always return a NWScriptInstance which will share large data from the parent NWScript
  //like the instruction array, but will have it's own NWScriptStack
  //This whould reduse memory overhead because only one instance of the large data is created per script
  newInstance(scope?: any){

    let script = new NWScriptInstance({
      name: this.name,
      instructions: this.instructions
    });

    script.nwscript = this;

    //Add the new instance to the instances array
    this.instances.push(script);

    if(scope instanceof NWScriptInstance){
      script.debug = scope.debug;
      script.debugging = scope.debugging;
      script.lastPerceived = scope.lastPerceived;
      script.listenPatternNumber = scope.listenPatternNumber;
    }

    return script;
  }

  static SetGlobalScript( scriptName = '', isGlobal = true ){
    if( NWScript.scripts.has( scriptName ) ){
      let script = NWScript.scripts.get( scriptName );
      script.global = isGlobal;
    }
  }

  static Load( scriptName = '', returnInstance = true ){
    return new Promise<NWScriptInstance>( ( resolve, reject ) => {
      if( NWScript.scripts.has( scriptName ) ){
        let script = NWScript.scripts.get( scriptName );

        //Create a new instance of the script and return it
        resolve( script.newInstance() );
      }else{
        if(scriptName){
          //Fetch the script from the game resource list
          ResourceLoader.loadResource(ResourceTypes['ncs'], scriptName, ( buffer: Buffer ) => {
            //Pass the buffer to a new script object
            let script = new NWScript( buffer );
            script.name = scriptName;
            //Store a refernece to the script object inside the static "scripts" variable
            NWScript.scripts.set( scriptName, script );

            //Create a new instance of the script and return it
            if(returnInstance){
              resolve( script.newInstance() );
            }else{
              resolve( undefined );
            }
          }, () => {
            //console.warn('NWScript.ExecuteScript failed to find', executeScript.name);
            resolve( undefined );
          });
        }else{
          //console.warn(`NWScript.ExecuteScript (${this.name}) failed because a script name wasn't supplied -> ${args[0]}`);
          resolve( undefined );
        }
      }
    });
  }

  disposeInstance( instance: NWScriptInstance ){
    if(instance instanceof NWScriptInstance){
      let idx = this.instances.indexOf(instance);
      if(idx >= 0){
        this.instances.splice(idx, 1);
        instance.dispose();
      }
    }
  }

  disposeInstances(){
    let i = this.instances.length;
    while(i--){
      let instance = this.instances.splice(i, 1)[0];
      if(instance instanceof NWScriptInstance){
        instance.dispose();
      }
    }
  }

  static Reload(){
    NWScript.scripts.forEach( (script,key,map) => {
      //Only dispose of non global scripts
      //global scripts would be like the ones attached to Game Menus
      if(!script.global){
        script.disposeInstances();
        NWScript.scripts.delete(key);
      }
    });
  }

  static ByteCodes: any = {
    1 : { 
      name: 'CPDOWNSP', 
      run: function( scope: any = {} ){
        //Replace the target stack element with the appropriate element relative to the top of the stack
        this.stack.stack.copyWithin(
          (this.stack.pointer + scope.instr.offset)/4,
          (this.stack.pointer - scope.instr.size)/4,
        );
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadUInt32();
        instr.size = reader.ReadUInt16();
      }
    },
    2 : { 
      name: 'RSADD', 
      run: function( scope: any = {} ){
  
        switch(scope.instr.type){
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
            console.log(scope.instr);
            throw 'unknown type '+scope.instr.type;
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    }, //Reserve Space On Stack
    3 : { 
      name: 'CPTOPSP', 
      run: function( scope: any = {} ){
        const elements = this.stack.copyAtPointer( scope.instr.pointer, scope.instr.size );
        if(elements.length == (scope.instr.size / 4)){
          this.stack.stack.push( ...elements );
          this.stack.pointer += scope.instr.size;
        }else{
          throw new Error(`CPTOPSP: copy size miss-match, expected: ${scope.instr.size} | received: ${elements.length*4}`);
        }
      }, 
      parse: function( instr: any, reader: any ){
        instr.pointer = reader.ReadUInt32();
        instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
        instr.data = null;
      }
    },
    4 : { 
      name: 'CONST', 
      run: function( scope: any = {} ){
        switch(scope.instr.type){
          case 3:
            this.stack.push(scope.instr.integer, NWScriptDataType.INTEGER);
          break;
          case 4:
            this.stack.push(scope.instr.float, NWScriptDataType.FLOAT);
          break;
          case 5:
            this.stack.push(scope.instr.string, NWScriptDataType.STRING);
          break;
          case 6:
            if(scope.instr.object == 0){
              this.stack.push(this.caller, NWScriptDataType.OBJECT);
            }else{
              this.stack.push(undefined, NWScriptDataType.OBJECT);
            }
          break;
          case 12:
            this.stack.push(scope.instr.string, NWScriptDataType.LOCATION);
          break;
          default:
            console.warn('CONST', scope.instr.type, scope.instr);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
        switch(instr.type){
          case 3:
            instr.integer = parseInt(reader.ReadInt32());
          break;
          case 4:
            instr.float = parseFloat(reader.ReadSingle());
          break;
          case 5:
            instr.strLen = reader.ReadUInt16();
            instr.string = reader.ReadChars(instr.strLen);
          break;
          case 6:
            instr.object = reader.ReadInt32();
          break;
        }
      }
    }, //Constant Type is declared by the next byte x03, x04, x05, x06
    5 : { 
      name: 'ACTION', 
      run: async function( scope: any = {} ){
  
        const action = this.actionsMap[scope.instr.action];
        const args = [];
        for(let i = 0, len = action.args.length; i < len; i++){
          switch(action.args[i]){
            case 'object':
              args.push( this.stack.pop().value );
              //Test for and fix instances where an object id is pushed instead of an object reference
              if(typeof args[i] == 'number') args[i] = ModuleObject.GetObjectById(args[i]);
            break;
            case 'string':
            case 'int':
            case 'float':
            case 'effect':
            case 'event':
            case 'location':
            case 'talent':
              args.push( this.stack.pop().value );
            break;
            case 'action':
              args.push( this.state.pop() );
            break;
            case 'vector':
              args.push({
                x: this.stack.pop().value,
                y: this.stack.pop().value,
                z: this.stack.pop().value
              })
            break;
            default:
              //Pop the function variables off the stack after we are done with them
              args.push(this.stack.pop().value);
              console.warn('UNKNOWN ARG', action, args);
            break;
          }
        }
  
        if(typeof action.action === 'function'){
          const actionValue = await action.action.call(this, args);
          if(action.type != NWScriptDataType.VOID){
            this.stack.push( actionValue, action.type );
          }
        }else{
          console.warn('NWScript Action '+action.name+' not found', action);
        }
  
      }, 
      parse: function( instr: any, reader: any ){
        instr.action = reader.ReadUInt16();
        instr.argCount = reader.ReadByte();
        instr.arguments = [];
      }
    },
    6 : { 
      name: 'LOGANDII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        if(this.var1 && this.var2)
          this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    7 : { 
      name: 'LOGORII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        if(this.var1 || this.var2)
          this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
        else
          this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    8 : { 
      name: 'INCORII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        this.stack.push( this.var1 | this.var2, NWScriptDataType.INTEGER );
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    9 : { 
      name: 'EXCORII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
        this.stack.push( this.var1 ^ this.var2, NWScriptDataType.INTEGER );
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    10 : { 
      name: 'BOOLANDII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        this.stack.push( this.var1 & this.var2, NWScriptDataType.INTEGER );
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    11 : { 
      name: 'EQUAL', 
      run: function( scope: any = {} ){
        if(scope.instr.type == NWScriptDataType.STRUCTURE){
          this.struct2 = [];
          this.struct1 = [];
  
          let count = scope.instr.sizeOfStructure / 4;
          //populate structure2's variables
          for(let i = 0; i < count; i++){
            this.struct2.push(this.stack.pop().value);
          }
          //populate structure1's variables
          for(let i = 0; i < count; i++){
            this.struct1.push(this.stack.pop().value);
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
            this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
  
        }else{
          this.var2 = this.stack.pop().value;
          this.var1 = this.stack.pop().value;
  
          switch(scope.instr.type){
            case NWScriptTypes.II:
              if(this.var1 == this.var2)
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.FF:
              if(this.var1 == this.var2)
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.OO:
              if(this.var1 == this.var2)
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.SS:
              if(this.var1.toLowerCase() == this.var2.toLowerCase())
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.LOCLOC:
              if(this.locationCompare(this.var1, this.var2)){
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              }else{
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//TRUE
              }
            break;
            default:
              console.warn('EQUAL: Missing Type', scope.instr.type);
            break;
          }
        }
      }, 
      parse: function( instr: any, reader: any ){
        if(instr.type == NWScriptDataType.STRUCTURE){
          instr.sizeOfStructure = parseInt(reader.ReadUInt16());
        }
      }
    }, //Constant Type is declared by the next byte x03, x04, x05, x06
    12 : { 
      name: 'NEQUAL', 
      run: function( scope: any = {} ){
        if(scope.instr.type == NWScriptDataType.STRUCTURE){
          this.struct2 = [];
          this.struct1 = [];
  
          let count = scope.instr.sizeOfStructure / 4;
  
          //populate structure2's variables
          for(let i = 0; i < count; i++){
            this.struct2.push(this.stack.pop().value);
          }
          //populate structure1's variables
          for(let i = 0; i < count; i++){
            this.struct1.push(this.stack.pop().value);
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
            this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
  
        }else{
          this.var2 = this.stack.pop().value;
          this.var1 = this.stack.pop().value;
  
          switch(scope.instr.type){
            case NWScriptTypes.II:
              if(this.var1 != this.var2)
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.FF:
              if(this.var1 != this.var2)
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.OO:
              if(this.var1 != this.var2)
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.SS:
              if(this.var1.toLowerCase() != this.var2.toLowerCase())
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              else
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
            break;
            case NWScriptTypes.LOCLOC:
              if(!this.locationCompare(this.var1, this.var2)){
                this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
              }else{
                this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//TRUE
              }
            break;
            default:
              console.warn('NEQUAL: Missing Type', scope.instr.type);
            break;
          }
        }
      }, 
      parse: function( instr: any, reader: any ){
        if(instr.type == NWScriptDataType.STRUCTURE){
          instr.sizeOfStructure = parseInt(reader.ReadUInt16());
        }
      }
    }, //Constant Type is declared by the next byte x03, x04, x05, x06
    13 : { 
      name: 'GEQ', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
          case NWScriptTypes.II:
            if(this.var1 >= this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          case NWScriptTypes.FF:
            if(this.var1 >= this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          default:
            console.warn('GEQ: Missing Type', scope.instr.type);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    }, //Constant Type is declared by the next byte x03, x04
    14 : { 
      name: 'GT', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
          case NWScriptTypes.II:
            if(this.var1 > this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          case NWScriptTypes.FF:
            if(this.var1 > this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          default:
            console.warn('GT: Missing Type', scope.instr.type);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    }, //Constant Type is declared by the next byte x03, x04
    15 : { 
      name: 'LT', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
          case NWScriptTypes.II:
            if(this.var1 < this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          case NWScriptTypes.FF:
            if(this.var1 < this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          default:
            console.warn('LT: Missing Type', scope.instr.type);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    }, //Constant Type is declared by the next byte x03, x04
    16 : { 
      name: 'LEQ', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
          case NWScriptTypes.II:
            if(this.var1 <= this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          case NWScriptTypes.FF:
            if(this.var1 <= this.var2)
              this.stack.push( NWScript.TRUE, NWScriptDataType.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScriptDataType.INTEGER )//FALSE
          break;
          default:
            console.warn('LEQ: Missing Type', scope.instr.type);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    }, //Constant Type is declared by the next byte x03, x04
    17 : { 
      name: 'SHLEFTII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
        this.stack.push( this.var1 << this.var2, NWScriptDataType.INTEGER );
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    18 : { 
      name: 'SHRIGHTII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
        this.stack.push( this.var1 >> this.var2, NWScriptDataType.INTEGER );
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    19 : { 
      name: 'USHRIGHTII', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
        this.stack.push( this.var1 >>> this.var2, NWScriptDataType.INTEGER );
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    20 : { 
      name: 'ADD', 
      run: function( scope: any = {} ){
        this.var2 = (this.stack.pop().value);
        this.var1 = (this.stack.pop().value);
  
        switch(scope.instr.type){
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
            this.var3 = this.stack.pop().value;
            this.stack.push( this.var1 + this.stack.pop().value, NWScriptDataType.FLOAT );
            this.stack.push( this.var2 + this.stack.pop().value, NWScriptDataType.FLOAT );
            this.stack.push( this.var3 + this.stack.pop().value, NWScriptDataType.FLOAT );
          break;
          default:
            console.warn('ADD: Missing Type', scope.instr.type);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    21 : { 
      name: 'SUB', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
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
            this.var3 = this.stack.pop().value;
            this.stack.push( this.var1 - this.stack.pop().value, NWScriptDataType.FLOAT );
            this.stack.push( this.var2 - this.stack.pop().value, NWScriptDataType.FLOAT );
            this.stack.push( this.var3 - this.stack.pop().value, NWScriptDataType.FLOAT );
          break;
          default:
            console.warn('SUB: Missing Type', scope.instr.type);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    22 : { 
      name: 'MUL', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
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
            this.stack.push( this.stack.pop().value * this.var2, NWScriptDataType.FLOAT ); //Y
            this.stack.push( this.stack.pop().value * this.var2, NWScriptDataType.FLOAT ); //X
          break;
          case NWScriptTypes.FV:
            this.stack.push( this.var1 * this.var2, NWScriptDataType.FLOAT ); //Z
            this.stack.push( this.var1 * this.stack.pop().value, NWScriptDataType.FLOAT ); //Y
            this.stack.push( this.var1 * this.stack.pop().value, NWScriptDataType.FLOAT ); //X
          break;
          default:
            console.warn('MUL: Missing Type', scope.instr.type);
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    23 : { 
      name: 'DIV', 
      run: function( scope: any = {} ){
  
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
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
            this.stack.push( this.stack.pop().value / this.var2, NWScriptDataType.FLOAT ); //Y
            this.stack.push( this.stack.pop().value / this.var2, NWScriptDataType.FLOAT ); //X
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    24 : { 
      name: 'MOD', 
      run: function( scope: any = {} ){
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;
  
        switch(scope.instr.type){
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
            this.stack.push( this.stack.pop().value % this.var2, NWScriptDataType.FLOAT ); //Y
            this.stack.push( this.stack.pop().value % this.var2, NWScriptDataType.FLOAT ); //X
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    25 : { 
      name: 'NEG', 
      run: function( scope: any = {} ){
        switch(scope.instr.type){
          case NWScriptTypes.I:
            this.stack.push( -this.stack.pop().value, NWScriptDataType.INTEGER );
          break;
          case NWScriptTypes.F:
            this.stack.push( -this.stack.pop().value, NWScriptDataType.FLOAT );
          break;
        }
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    26 : { 
      name: 'COMPI', 
      run: function( scope: any = {} ){
        this.stack.push( ~this.stack.pop().value, NWScriptDataType.INTEGER );
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    27 : { 
      name: 'MOVSP', 
      run: function( scope: any = {} ){
        this.stack.stack.splice(
          (this.stack.pointer += scope.instr.offset) / 4, 
          (Math.abs(scope.instr.offset)/4)
        );
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadInt32();
      }
    },
    28 : { 
      name: 'STORE_STATEALL', 
      run: function( scope: any = {} ){
        //OBSOLETE NOT SURE IF USED IN KOTOR
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    29 : { 
      name: 'JMP', 
      run: function( scope: any = {} ){
        scope.seek = scope.instr.address + scope.instr.offset;
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadUInt32();
      }
    },
    30 : { 
      name: 'JSR', 
      run: function( scope: any = {} ){
        let pos = scope.instr.address;
        scope.seek = pos + scope.instr.offset;
        this.subRoutine = new NWScriptSubroutine(scope.instr.nextInstr.address);
        this.subRoutines.push( this.subRoutine ); //Where to return to after the subRoutine is done
  
        if(this.subRoutines.length > 1000)
          throw 'JSR seems to be looping endlessly';
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadUInt32();
      }
    },
    31 : { 
      name: 'JZ', 
      run: function( scope: any = {} ){
        let popped = this.stack.pop().value;
        if(popped == 0){
          scope.seek = scope.instr.address + scope.instr.offset;
        }
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadUInt32();
      }
    },
    32 : { 
      name: 'RETN', 
      run: function( scope: any = {} ){
        
        if(this.subRoutines.length){
          const subRoutine = this.subRoutines.pop();
          subRoutine.onEnd();
  
          this.subRoutine = this.subRoutines[this.subRoutines.length - 1];
  
          if(subRoutine.returnAddress == -1){
            scope.seek = null;
            scope.instr.eof = true;
          }else{
            scope.seek = subRoutine.returnAddress; //Resume the code just after our pervious jump
            if(!scope.seek){
              //
            }
          }
        }else{
          //let subRoutine = this.subRoutines.pop();
          //scope.seek = subRoutine.returnAddress;
          this.subRoutine = this.subRoutines[this.subRoutines.length - 1];
          scope.instr.eof = true;
          scope.running = false;
        }
      }, 
      parse: function( instr: any, reader: any ){
        if(!this.eofFound){
          instr.eof = true;
          this.eofFound = true;
        }
      }
    },
    33 : { 
      name: 'DESTRUCT', 
      run: function( scope: any = {} ){
        //retrieve the elements to save from the stack by popping them off of the stack
        const elements = this.stack.stack.splice(
          //offset of the first element to retrieve
          ( ( this.stack.pointer - scope.instr.sizeToDestroy ) + scope.instr.offsetToSaveElement ) / 4,
          //count of elements to save
          scope.instr.sizeOfElementToSave / 4
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
          ( this.stack.pointer - scope.instr.sizeToDestroy ) / 4,
          //count of elements to destroy
          ( scope.instr.sizeToDestroy - scope.instr.sizeOfElementToSave ) / 4
        )
        
        //Adjust the stack pointer accoringly
        this.stack.pointer -= (scope.instr.sizeToDestroy - scope.instr.sizeOfElementToSave);
      }, 
      parse: function( instr: any, reader: any ){
        instr.sizeToDestroy = reader.ReadInt16();
        instr.offsetToSaveElement = reader.ReadInt16();
        instr.sizeOfElementToSave = reader.ReadInt16();
      }
    },
    34 : { 
      name: 'NOTI', 
      run: function( scope: any = {} ){
        if(!this.stack.pop().value)
          this.stack.push(NWScript.TRUE, NWScriptDataType.INTEGER);//TRUE
        else
          this.stack.push(NWScript.FALSE, NWScriptDataType.INTEGER)//FALSE
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    35 : { 
      name: 'DECISP', 
      run: function( scope: any = {} ){
        this.var1 = (this.stack.getAtPointer( scope.instr.offset));
        this.var1.value -= 1;
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadInt32();
      }
    },
    36 : { 
      name: 'INCISP', 
      run: function( scope: any = {} ){
        this.var1 = (this.stack.getAtPointer( scope.instr.offset));
        this.var1.value += 1;
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadInt32();
      }
    },
    37 : { 
      name: 'JNZ', //I believe this is used in SWITCH statements
      run: function( scope: any = {} ){
        let jnzTOS = this.stack.pop().value
        if(jnzTOS != 0){
          scope.seek = scope.instr.address + scope.instr.offset;
        }
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadInt32();
      }
    },
    38 : { 
      name: 'CPDOWNBP', 
      run: function( scope: any = {} ){
        this.stack.stack.copyWithin(
          (this.stack.basePointer + scope.instr.offset)/4,
          (this.stack.pointer     - scope.instr.size)/4,
        );
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadInt32();
        instr.size = reader.ReadUInt16();
      }
    },
    39 : { 
      name: 'CPTOPBP', 
      run: function( scope: any = {} ){
        const elements = this.stack.copyAtBasePointer( scope.instr.pointer, scope.instr.size );
        if(elements.length == (scope.instr.size / 4)){
          this.stack.stack.push( ...elements );
          this.stack.pointer += scope.instr.size;
        }else{
          throw new Error(`CPTOPBP: copy size miss-match, expected: ${scope.instr.size} | received: ${elements.length*4}`);
        }
      }, 
      parse: function( instr: any, reader: any ){
        instr.pointer = reader.ReadUInt32();
        instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
        instr.data = null;
      }
    },
    40 : { 
      name: 'DECIBP', 
      run: function( scope: any = {} ){
        this.var1 = (this.stack.getAtBasePointer( scope.instr.offset));
        this.var1.value -= 1;
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadUInt32();
      }
    },
    41 : { 
      name: 'INCIBP', 
      run: function( scope: any = {} ){
        this.var1 = (this.stack.getAtBasePointer( scope.instr.offset));
        this.var1.value += 1;
      }, 
      parse: function( instr: any, reader: any ){
        instr.offset = reader.ReadUInt32();
      }
    },
    42 : { 
      name: 'SAVEBP', 
      run: function( scope: any = {} ){
        this.stack.saveBP();
        this.currentBlock = 'global';
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    43 : { 
      name: 'RESTOREBP', 
      run: function( scope: any = {} ){
        this.stack.restoreBP();
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    44 : { 
      name: 'STORE_STATE', 
      run: function( scope: any = {} ){
  
        let state: any = {
          offset: scope.instr.nextInstr.nextInstr.address,
          base: [],//this.stack.stack.slice(0, (instr.bpOffset/4)),
          local: [],//this.stack.stack.slice(this.stack.stack.length-(instr.spOffset/4), this.stack.stack.length)
          instr: scope.instr
        };
  
        //console.log('STORE_STATE', this.stack.stack.length, this.stack.basePointer);
  
        state.script = new NWScriptInstance();
        state.script.address = state.offset;
        state.script.offset = state.offset;
        state.script.nwscript = this.nwscript;
        state.script.isStoreState = true;
        state.script.name = this.name;
        state.script.prevByteCode = 0;
        //state.script.Definition = this.Definition;
        state.script.instructions = this.instructions;//.slice();
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
  
      }, 
      parse: function( instr: any, reader: any ){
        instr.bpOffset = reader.ReadUInt32();
        instr.spOffset = reader.ReadUInt32();
      }
    },
    45 : { 
      name: 'NOP', 
      run: function( scope: any = {} ){
  
      }, 
      parse: function( instr: any, reader: any ){
  
      }
    },
    46 : { 
      name: 'T', 
      run: function( scope: any = {} ){
  
      }, 
      parse: function( instr: any, reader: any ){
        reader.position -= 2; //We need to go back 2bytes because this instruction
        //doesn't have a int16 type arg. We then need to read the 4Byte Int32 size arg
        instr.size = reader.ReadInt32();
      }
    },
  
    getKeyByValue: function( value: any ) {
      for( let prop in NWScript.ByteCodes ) {
        if( NWScript.ByteCodes.hasOwnProperty( prop ) ) {
          if( NWScript.ByteCodes[ prop ] === value )
            return prop;
        }
      }
    }
  };

  static scripts: Map<any, any> = new Map();

}

//Holds references the the NWScripts that are stored in memory
NWScript.scripts = new Map();
