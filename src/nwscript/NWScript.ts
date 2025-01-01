import { BinaryReader } from "../BinaryReader";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { Endians } from "../enums/resource/Endians";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameFileSystem } from "../utility/GameFileSystem";
import { NWScriptInstance } from "./NWScriptInstance";
import { NWScriptInstruction } from "./NWScriptInstruction";
import { NWScriptStack } from "./NWScriptStack";

import {
  OP_CPDOWNSP, OP_RSADD, OP_CPTOPSP, OP_CONST, OP_ACTION, OP_LOGANDII, OP_LOGORII, OP_INCORII, OP_EXCORII,
  OP_BOOLANDII, OP_EQUAL, OP_NEQUAL, OP_GEQ, OP_GT, OP_LT, OP_LEQ, OP_SHLEFTII, OP_SHRIGHTII, OP_USHRIGHTII,
  OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MODII, OP_NEG, OP_COMPI, OP_MOVSP, OP_STORE_STATEALL, OP_JMP, OP_JSR,
  OP_JZ, OP_RETN, OP_DESTRUCT, OP_NOTI, OP_DECISP, OP_INCISP, OP_JNZ, OP_CPDOWNBP, OP_CPTOPBP, OP_DECIBP, OP_INCIBP,
  OP_SAVEBP, OP_RESTOREBP, OP_STORE_STATE, OP_NOP, OP_T
} from './NWScriptOPCodes';

import {
  CALL_CPDOWNSP, CALL_RSADD, CALL_CPTOPSP, CALL_CONST, CALL_ACTION, CALL_LOGANDII, CALL_LOGORII, CALL_INCORII, CALL_EXCORII,
  CALL_BOOLANDII, CALL_EQUAL, CALL_NEQUAL, CALL_GEQ, CALL_GT, CALL_LT, CALL_LEQ, CALL_SHLEFTII, CALL_SHRIGHTII, CALL_USHRIGHTII,
  CALL_ADD, CALL_SUB, CALL_MUL, CALL_DIV, CALL_MOD, CALL_NEG, CALL_COMPI, CALL_MOVSP, CALL_STORE_STATEALL, CALL_JMP,   CALL_JSR,
  CALL_JZ, CALL_RETN, CALL_DESTRUCT, CALL_NOTI, CALL_DECISP, CALL_INCISP, CALL_JNZ, CALL_CPDOWNBP, CALL_CPTOPBP, CALL_DECIBP, CALL_INCIBP,
  CALL_SAVEBP, CALL_RESTOREBP, CALL_STORE_STATE, CALL_NOP
} from './NWScriptInstructionSet';
import { IPCMessageType } from "../enums/server/ipc/IPCMessageType";
import type { ModuleObject } from "../module/ModuleObject";
import { GameState } from "../GameState";
import { GameEngineType } from "../enums/engine/GameEngineType";
import { INWScriptDefAction } from "../interface/nwscript/INWScriptDefAction";
import { NWScriptDefK2 } from "./NWScriptDefK2";
import { NWScriptDefK1 } from "./NWScriptDefK1";

/**
 * NWScript class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScript.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScript {

  static NWScriptInstance: typeof NWScriptInstance = NWScriptInstance;
  static NWScriptStack: typeof NWScriptStack = NWScriptStack;
  static NWScriptInstanceMap: Map<string, NWScriptInstance> = new Map();

  actionsMap: { [key: number]: INWScriptDefAction; };
  
  name: string;

  instrIdx: number;
  lastOffset: number;
  instances: NWScriptInstance[];
  instanceUUIDMap: Map<string, NWScriptInstance> = new Map();
  global: boolean;
  stack: NWScriptStack;
  state: any[];
  params: number[];
  paramString: string;
  verified: boolean;
  prevByteCode: number;
  instructions: Map<number, NWScriptInstruction>;
  eofFound: boolean;
  prog: number;
  progSize: number;
  code: Uint8Array;
  owner: ModuleObject;

  constructor ( dataOrFile?: string|Uint8Array ){
    if(GameState.GameKey == GameEngineType.TSL){
      this.actionsMap = NWScriptDefK2.Actions;
    }else{
      this.actionsMap = NWScriptDefK1.Actions;
    }

    this.instrIdx = 0;
    this.lastOffset = -1;

    this.instances = [];
    this.global = false;

    this.stack = new NWScriptStack();
    this.name = '';

    this.params = [0, 0, 0, 0, 0];
    this.paramString = '';
    this.verified = false;

    if( !dataOrFile ) {
      return;
    }

    if( typeof dataOrFile === 'string' ){
      GameFileSystem.readFile(dataOrFile).then( (buffer) => {
        this.decompile(buffer);
      });
    }else if ( dataOrFile instanceof Uint8Array ){
      const textDecoder = new TextDecoder();
      if(textDecoder.decode(dataOrFile.slice(0, 8)) == 'NCS V1.0'){
        this.init(dataOrFile);
      }
    }

  }
  
  decompile(binary: Uint8Array) {
    throw new Error("Method not implemented.");
  }

  verifyNCS (reader: BinaryReader){
    reader.seek(0);
    if(this.verified || reader.readChars(8) == 'NCS V1.0')
      return this.verified = true;

    return false;
  }

  init (data: Uint8Array, progSize?: number){
    this.prevByteCode = 0;
    this.instructions = new Map();
    let reader = new BinaryReader(data, Endians.BIG);

    this.eofFound = false;

    if(!progSize){
      reader.skip(8);
      this.prog = reader.readByte();
      //This includes the initial 8Bytes of the NCS V1.0 header and the previous byte
      this.progSize = reader.readUInt32(); 
      
      //Store a copy of the code for exporting ScriptSituations
      this.code = data.slice( 13, this.progSize );
      this.progSize = this.code.length;
      
      reader = new BinaryReader(this.code, Endians.BIG);
    }else{
      //Store a copy of the code for exporting ScriptSituations
      this.code = data;
      this.progSize = progSize;
    }

    //PASS 1: Create a listing of all of the instructions in order as they occur

    this.lastOffset = -1;
    while ( reader.position < this.progSize ){
      this.parseIntruction(reader);
    };
    
    reader.position = 0;

  }

  parseIntruction( reader: BinaryReader ) {

    const position = reader.position;

    let instruction = new NWScriptInstruction({
      code: reader.readByte(),
      type: reader.readByte(),
      address: position,
      prevInstr: ( this.lastOffset >= 0 ? this.instructions.get(this.lastOffset) : null ),
      eof: false,
      isArg: false,
      index: this.instrIdx++
    });

    //If we already have parsed an instruction set the property of nextInstr on the previous instruction to the current one
    if(this.lastOffset >= 0){
      this.instructions.get(this.lastOffset).nextInstr = instruction;
    }

    switch(instruction.code){
      case OP_CPDOWNSP:
        instruction.opCall = CALL_CPDOWNSP;
        instruction.offset = reader.readInt32();
        instruction.size = reader.readInt16();
        if(instruction.offset == undefined){
          console.warn('CPDOWNSP', instruction.offset, instruction.size, reader.position);
        }
        if(instruction.size == undefined){
          console.warn('CPDOWNSP', instruction.offset, instruction.size, reader.position);
        }
      break;
      case OP_RSADD:
        instruction.opCall = CALL_RSADD;
      break;
      case OP_CPTOPSP:
        instruction.opCall = CALL_CPTOPSP;
        instruction.offset = reader.readInt32();
        instruction.size = reader.readInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
        if(instruction.offset == undefined){
          console.warn('CPTOPSP', instruction.offset, instruction.size, reader.position);
        }
        if(instruction.size == undefined){
          console.warn('CPTOPSP', instruction.pointer, instruction.size, reader.position);
        }
      break;
      case OP_CONST:
        instruction.opCall = CALL_CONST;
        switch(instruction.type){
          case 3:
            instruction.integer = reader.readInt32();
          break;
          case 4:
            instruction.float = reader.readSingle();
          break;
          case 5:
            instruction.string = reader.readChars(reader.readUInt16());
          break;
          case 6:
            instruction.object = reader.readInt32();
          break;
        }
      break;
      case OP_ACTION:
        instruction.opCall = CALL_ACTION;
        instruction.action = reader.readUInt16();
        instruction.argCount = reader.readByte();
        instruction.arguments = [];
        instruction.actionDefinition = this.actionsMap[instruction.action];
      break;
      case OP_LOGANDII:
        instruction.opCall = CALL_LOGANDII;
      break;
      case OP_LOGORII:
        instruction.opCall = CALL_LOGORII;
      break;
      case OP_INCORII:
        instruction.opCall = CALL_INCORII;
      break;
      case OP_EXCORII:
        instruction.opCall = CALL_EXCORII;
      break;
      case OP_BOOLANDII:
        instruction.opCall = CALL_BOOLANDII;
      break;
      case OP_BOOLANDII:
        instruction.opCall = CALL_BOOLANDII;
      break;
      case OP_EQUAL:
        instruction.opCall = CALL_EQUAL;
        if(instruction.type == NWScriptDataType.STRUCTURE){
          instruction.sizeOfStructure = reader.readUInt16();
        }
      break;
      case OP_NEQUAL:
        instruction.opCall = CALL_NEQUAL;
        if(instruction.type == NWScriptDataType.STRUCTURE){
          instruction.sizeOfStructure = reader.readUInt16();
        }
      break;
      case OP_GEQ:
        instruction.opCall = CALL_GEQ;
      break;
      case OP_GT:
        instruction.opCall = CALL_GT;
      break;
      case OP_LT:
        instruction.opCall = CALL_LT;
      break;
      case OP_LEQ:
        instruction.opCall = CALL_LEQ;
      break;
      case OP_SHLEFTII:
        instruction.opCall = CALL_SHLEFTII;
      break;
      case OP_SHRIGHTII:
        instruction.opCall = CALL_SHRIGHTII;
      break;
      case OP_USHRIGHTII:
        instruction.opCall = CALL_USHRIGHTII;
      break;
      case OP_ADD:
        instruction.opCall = CALL_ADD;
      break;
      case OP_SUB:
        instruction.opCall = CALL_SUB;
      break;
      case OP_MUL:
        instruction.opCall = CALL_MUL;
      break;
      case OP_DIV:
        instruction.opCall = CALL_DIV;
      break;
      case OP_MODII:
        instruction.opCall = CALL_MOD;
      break;
      case OP_NEG:
        instruction.opCall = CALL_NEG;
      break;
      case OP_COMPI:
        instruction.opCall = CALL_COMPI;
      break;
      case OP_MOVSP:
        instruction.opCall = CALL_MOVSP;
        instruction.offset = reader.readInt32();
      break;
      case OP_STORE_STATEALL:
        instruction.opCall = CALL_NOP;
      break;
      case OP_JMP:
        instruction.opCall = CALL_JMP;
        instruction.offset = reader.readInt32();
      break;
      case OP_JSR:
        instruction.opCall = CALL_JSR;
        instruction.offset = reader.readInt32();
      break;
      case OP_JZ:
        instruction.opCall = CALL_JZ;
        instruction.offset = reader.readInt32();
      break;
      case OP_RETN:
        instruction.opCall = CALL_RETN;
        if(!this.eofFound){
          instruction.eof = true;
          this.eofFound = true;
        }
      break;
      case OP_DESTRUCT:
        instruction.opCall = CALL_DESTRUCT;
        instruction.sizeToDestroy = reader.readInt16();
        instruction.offsetToSaveElement = reader.readInt16();
        instruction.sizeOfElementToSave = reader.readInt16();
      break;
      case OP_NOTI:
        instruction.opCall = CALL_NOTI;
      break;
      case OP_DECISP:
        instruction.opCall = CALL_DECISP;
        instruction.offset = reader.readInt32();
      break;
      case OP_INCISP:
        instruction.opCall = CALL_INCISP;
        instruction.offset = reader.readInt32();
      break;
      case OP_JNZ:
        instruction.opCall = CALL_JNZ;
        instruction.offset = reader.readInt32();
      break;
      case OP_CPDOWNBP:
        instruction.opCall = CALL_CPDOWNBP;
        instruction.offset = reader.readInt32();
        instruction.size = reader.readInt16();
        if(instruction.offset == undefined){
          console.warn('CPDOWNBP', instruction.offset, instruction.size, reader.position);
        }
        if(instruction.size == undefined){
          console.warn('CPDOWNBP', instruction.offset, instruction.size, reader.position);
        }
      break;
      case OP_CPTOPBP:
        instruction.opCall = CALL_CPTOPBP;
        instruction.offset = reader.readInt32();
        instruction.size = reader.readInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
      break;
      case OP_DECIBP:
        instruction.opCall = CALL_DECIBP;
        instruction.offset = reader.readInt32();
      break;
      case OP_INCIBP:
        instruction.opCall = CALL_INCIBP;
        instruction.offset = reader.readInt32();
      break;
      case OP_SAVEBP:
        instruction.opCall = CALL_SAVEBP;
      break;
      case OP_RESTOREBP:
        instruction.opCall = CALL_RESTOREBP;
      break;
      case OP_STORE_STATE:
        instruction.opCall = CALL_STORE_STATE;
        instruction.bpOffset = reader.readInt32();
        instruction.spOffset = reader.readInt32();
      break;
      case OP_T:
        instruction.opCall = CALL_NOP;
        reader.position -= 2; //We need to go back 2bytes because this instruction
        //doesn't have a int16 type arg. We then need to read the 4Byte Int32 size arg
        instruction.size = reader.readInt32();
      break;
      case OP_NOP:
        instruction.opCall = CALL_NOP;
      break;
      default:
        console.error('Unhandled NWScript Instruction');
        console.log(this, instruction);
      break;
    }
    
    //this.instructions.push(instr);
    this.instructions.set(instruction.address, instruction);
    this.lastOffset = instruction.address;
  }

  clone(){
    let script = new NWScript();
    script.name = this.name;
    //script.Definition = this.Definition;
    script.instructions = new Map(this.instructions);
    return script;
  }

  //newInstance
  //When loading a new script always return a NWScriptInstance which will share large data from the parent NWScript
  //like the instruction array, but will have it's own NWScriptStack
  //This whould reduse memory overhead because only one instance of the large data is created per script
  newInstance(parentInstance?: NWScriptInstance){

    let instance = new NWScriptInstance(
      this.instructions
    );

    instance.name = this.name;

    instance.nwscript = this;


    //Add the new instance to the instances array
    this.instances.push(instance);

    if(parentInstance instanceof NWScriptInstance){
      instance.parentUUID = parentInstance.uuid;
      instance.lastPerceived = parentInstance.lastPerceived;
      instance.listenPatternNumber = parentInstance.listenPatternNumber;
    }

    instance.sendToDebugger(IPCMessageType.CreateScript);

    NWScript.NWScriptInstanceMap.set(instance.uuid, instance);
    this.instanceUUIDMap.set(instance.uuid, instance);
    instance.addEventListener('dispose', (uuid: string) => {
      this.instanceUUIDMap.delete(uuid);
      NWScript.NWScriptInstanceMap.delete(uuid);
    });
    
    return instance;
  }

  static SetGlobalScript( scriptName = '', isGlobal = true ){
    if( NWScript.scripts.has( scriptName ) ){
      let script = NWScript.scripts.get( scriptName );
      script.global = isGlobal;
    }
  }

  static Load( scriptName = '', returnInstance = true, parentInstance?: NWScriptInstance ): NWScriptInstance {
    if( NWScript.scripts.has( scriptName ) ){
      let script = NWScript.scripts.get( scriptName );
      //Create a new instance of the script and return it
      return script.newInstance(parentInstance)
    }else{
      if(scriptName){
        //Fetch the script from the game resource list
        const buffer = ResourceLoader.loadCachedResource(ResourceTypes['ncs'], scriptName);
        if(buffer){
          //Pass the buffer to a new script object
          let script = new NWScript( buffer );
          script.name = scriptName;
          //Store a refernece to the script object inside the static "scripts" variable
          NWScript.scripts.set( scriptName, script );

          //Create a new instance of the script and return it
          if(returnInstance){
            return script.newInstance(parentInstance);
          }else{
            return undefined;
          }
        }else{
          return undefined;
        }
      }else{
        return undefined;
      }
    }
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

  static scripts: Map<string, NWScript> = new Map();

}

//Holds references the the NWScripts that are stored in memory
NWScript.scripts = new Map();
