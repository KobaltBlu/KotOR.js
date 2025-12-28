import { BinaryReader } from "../utility/binary/BinaryReader";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { Endians } from "../enums/resource/Endians";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameFileSystem } from "../utility/GameFileSystem";
import { NWScriptInstance } from "./NWScriptInstance";
import { NWScriptInstruction } from "./NWScriptInstruction";
import { NWScriptStack } from "./NWScriptStack";

import {
  OP_CPDOWNSP, OP_CPTOPSP, OP_CONST, OP_ACTION, OP_EQUAL, OP_NEQUAL, OP_MOVSP, OP_JMP, OP_JSR, OP_JZ, OP_RETN, 
  OP_DESTRUCT, OP_DECISP, OP_INCISP, OP_JNZ, OP_CPDOWNBP, OP_CPTOPBP, OP_DECIBP, OP_INCIBP, OP_STORE_STATE, OP_T
} from './NWScriptOPCodes';

import { IPCMessageType } from "../enums/server/ipc/IPCMessageType";
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

  /**
   * Holds references the loaded NWScripts that are stored in memory
   */
  static scripts: Map<string, NWScript> = new Map();

  /**
   * Class references to the NWScriptInstance, NWScriptStack, and NWScriptInstanceMap
   */
  static NWScriptInstance: typeof NWScriptInstance = NWScriptInstance;
  static NWScriptStack: typeof NWScriptStack = NWScriptStack;
  static NWScriptInstanceMap: Map<string, NWScriptInstance> = new Map();

  /**
   * Maps the action numbers to the action definitions
   */
  actionsMap: { [key: number]: INWScriptDefAction; };
  
  /**
   * The name of the script
   */
  name: string;

  instrIdx: number;
  lastOffset: number;
  instances: NWScriptInstance[];
  instanceUUIDMap: Map<string, NWScriptInstance> = new Map();
  global: boolean = false;
  verified: boolean = false;
  instructions: Map<number, NWScriptInstruction>;
  
  /**
   * The program type of the script
   * 
   * should always be OP_T (0x42)
   */
  prog: number = OP_T;
  
  /**
   * The size of the program
   */
  progSize: number = 0;
  
  /**
   * The code of the script
   */
  code: Uint8Array = new Uint8Array();

  constructor ( dataOrFile?: string|Uint8Array ){
    this.actionsMap = (GameState.GameKey == GameEngineType.TSL) ? 
      NWScriptDefK2.Actions : NWScriptDefK1.Actions;

    this.instrIdx = 0;
    this.lastOffset = -1;

    this.instances = [];
    this.global = false;

    this.name = '';
    
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

  /**
   * Verify the NCS header
   * 
   * @param {BinaryReader} reader
   * @returns {boolean}
   */
  verifyNCS (reader: BinaryReader){
    reader.seek(0);
    if(this.verified || reader.readChars(8) == 'NCS V1.0')
      return this.verified = true;

    return false;
  }

  /**
   * Initialize the script
   * 
   * @param {Uint8Array} data
   * @param {number} progSize - The size of the program, will only be provided if the script is a ScriptSituation
   */
  init (data: Uint8Array, progSize?: number){
    this.instructions = new Map();
    let reader = new BinaryReader(data, Endians.BIG);

    if(!progSize){

      reader.skip(8);
      this.prog = reader.readByte();
      if(this.prog != OP_T){
        throw new Error(`Invalid program type, expected OP_T (0x42) but got ${this.prog}`);
      }
      //This includes the initial 8Bytes of the NCS V1.0 header and the previous byte
      this.progSize = reader.readUInt32();
      reader = reader.slice(13, this.progSize);

      //Store a copy of the code for exporting ScriptSituations
      this.code = reader.buffer;
      this.progSize = this.code.length;
    }else{
      //Store a copy of the code for exporting ScriptSituations
      this.prog = OP_T
      this.code = data;
      this.progSize = progSize;
    }

    this.lastOffset = -1;
    while ( reader.position < this.progSize ){
      this.parseIntruction(reader);
    };
    
    reader.position = 0;
    reader = null;
  }

  /**
   * Parse an instruction from the binary data
   * 
   * @param {BinaryReader} reader
   */
  parseIntruction( reader: BinaryReader ) {
    const instructionAddress = reader.position;
    const opCode = reader.readByte();
    const opType = opCode != OP_T ? reader.readByte() : reader.readInt32();

    const instruction = new NWScriptInstruction(opCode, opType, instructionAddress);
    
    instruction.prevInstr = ( this.lastOffset >= 0 ? this.instructions.get(this.lastOffset) : null );
    instruction.index = this.instrIdx++;

    //If we already have parsed an instruction set the property of nextInstr on the previous instruction to the current one
    if(this.lastOffset >= 0){
      this.instructions.get(this.lastOffset).nextInstr = instruction;
    }

    switch(opCode){
      case OP_CPDOWNSP:
      case OP_CPTOPSP:
        instruction.offset = reader.readInt32();
        instruction.size = reader.readInt16();
        if(instruction.offset == undefined){
          console.warn(OP_CPDOWNSP == opCode ? 'CPDOWNSP' : 'CPTOPSP', instruction.offset, instruction.size, reader.position);
        }
        if(instruction.size == undefined){
          console.warn(OP_CPDOWNSP == opCode ? 'CPDOWNSP' : 'CPTOPSP', instruction.offset, instruction.size, reader.position);
        }
      break;
      case OP_CONST:
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
        instruction.action = reader.readUInt16();
        instruction.argCount = reader.readByte();
        instruction.actionDefinition = this.actionsMap[instruction.action];
      break;
      case OP_EQUAL:
      case OP_NEQUAL:
        if(instruction.type == NWScriptDataType.STRUCTURE){
          instruction.sizeOfStructure = reader.readUInt16();
        }
      break;
      case OP_MOVSP:
      case OP_JMP:
      case OP_JSR:
      case OP_JZ:
      case OP_DECISP:
      case OP_INCISP:
      case OP_JNZ:
      case OP_DECIBP:
      case OP_INCIBP:
        instruction.offset = reader.readInt32();
      break;
      case OP_DESTRUCT:
        instruction.sizeToDestroy = reader.readInt16();
        instruction.offsetToSaveElement = reader.readInt16();
        instruction.sizeOfElementToSave = reader.readInt16();
      break;
      case OP_CPDOWNBP:
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
        instruction.offset = reader.readInt32();
        instruction.size = reader.readInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
      break;
      case OP_STORE_STATE:
        instruction.bpOffset = reader.readInt32();
        instruction.spOffset = reader.readInt32();
      break;
      case OP_T:
        instruction.size = opType
      break;
    }

    //Calculate the size of the instruction
    instruction.instructionSize = reader.position - instructionAddress;

    this.instructions.set(instruction.address, instruction);
    this.lastOffset = instruction.address;
  }

  /**
   * Clone the script
   * 
   * @returns {NWScript}
   */
  clone(){
    const script = new NWScript();
    script.name = this.name;
    script.instructions = new Map(this.instructions);
    return script;
  }

  /**
   * Create a new instance of the script
   * 
   * When loading a new script always return a NWScriptInstance which will share large data from the parent NWScript
   * like the instruction array, but will have it's own NWScriptStack
   * This whould reduse memory overhead because only one instance of the large data is created per script
   */
  newInstance(parentInstance?: NWScriptInstance){
    const instance = new NWScriptInstance(this.instructions);
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

  /**
   * Set a script as global or not
   */
  static SetGlobalScript( scriptName = '', isGlobal = true ){
    if( !scriptName || !NWScript.scripts.has( scriptName ) ){
      return;
    }

    const script = NWScript.scripts.get( scriptName );
    script.global = isGlobal;
  }

  /**
   * Load a script from the game resources into memory and return an instance of the script
   */
  static Load( scriptName = '', returnInstance = true, parentInstance?: NWScriptInstance ): NWScriptInstance {
    //If the script name is empty, return undefined
    if(!scriptName){ 
      return undefined; 
    }

    //If the script is already loaded, create a new instance and return it
    if( NWScript.scripts.has( scriptName ) ){
      const script = NWScript.scripts.get( scriptName );
      return script.newInstance(parentInstance)
    }

    //Fetch the script from the game resource list
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['ncs'], scriptName);
    if(!buffer){ 
      return undefined;
    }
    
    //Pass the buffer to a new script object
    const script = new NWScript( buffer );
    script.name = scriptName;
    //Store a refernece to the script object inside the static "scripts" variable
    NWScript.scripts.set( scriptName, script );

    //Create a new instance of the script and return it
    return returnInstance ? script.newInstance(parentInstance) : undefined;
  }

  /**
   * Reload all scripts
   */
  static Reload(){
    NWScript.scripts.forEach( (script, key) => {
      //Only dispose of non global scripts
      //global scripts would be like the ones attached to Game Menus
      if(script.global){  return; }
      script.disposeInstances();
      NWScript.scripts.delete(key);
    });
  }

  /**
   * Dispose of an instance of the script
   */
  disposeInstance( instance: NWScriptInstance ){
    if(instance instanceof NWScriptInstance){
      let idx = this.instances.indexOf(instance);
      if(idx >= 0){
        this.instances.splice(idx, 1);
        instance.dispose();
      }
    }
  }

  /**
   * Dispose of all instances of the script
   */
  disposeInstances(){
    let i = this.instances.length;
    while(i--){
      let instance = this.instances.splice(i, 1)[0];
      if(instance instanceof NWScriptInstance){
        instance.dispose();
      }
    }
  }
  
  /**
   * Decompile the script
   * 
   * @param {Uint8Array} binary
   * @returns {string}
   */
  decompile(binary: Uint8Array): string {
    throw new Error("Method not implemented.");
  }

  /**
   * Convert the script to assembly text format
   * Output format similar to disassembler output
   */
  toAssembly(): string {
    if (!this.instructions || this.instructions.size === 0) {
      return '';
    }

    const sortedInstructions = Array.from(this.instructions.values())
      .sort((a, b) => a.address - b.address);
      
    return sortedInstructions.map(instr => instr.toAssemblyString()).join('\n');
  }

}
