import { BinaryReader } from "@/utility/binary/BinaryReader";
import { Endians } from "@/enums/resource/Endians";
import { ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptStack } from "@/nwscript/NWScriptStack";
import { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import { NWScriptDecompiler } from "@/nwscript/decompiler/NWScriptDecompiler";
import { parseNcsInstruction } from "@/nwscript/parseNcsInstruction";
import { OP_T } from "@/nwscript/NWScriptOPCodes";

import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { GameState } from "@/GameState";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import { NWScriptDefK2 } from "@/nwscript/NWScriptDefK2";
import { NWScriptDefK1 } from "@/nwscript/NWScriptDefK1";

export interface NWScriptLoadOptions {
  /** Explicit bytecode dialect. Defaults to the active game for runtime compatibility. */
  game?: GameEngineType;
  /** Optional action table override for tools that run without GameState. */
  actionsMap?: { [key: number]: INWScriptDefAction };
}

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

  /**
   * The instances of the script
   */
  instances: NWScriptInstance[];
  
  /**
   * The map of the instances of the script
   */
  instanceUUIDMap: Map<string, NWScriptInstance> = new Map();

  /**
   * Shared runner for ExecuteScript / one-off script fires (not object event slots).
   * Reused when not already mid-run; re-entrant calls clone with disposeAfterRun.
   */
  executeInstance: NWScriptInstance | undefined;

  /**
   * The instructions of the script
   */
  instructions: Map<number, NWScriptInstruction>;
  
  /**
   * Whether the script is a global script
   *
   * Global scripts are scripts that are attached to Game Menus and are not part of the game world runtime
   */
  isGlobal: boolean = false;
  
  /**
   * Whether the script is verified
   *
   * This is used to verify that the script is a valid NCS file
   * Cannot be used to verify ScriptSituations, because they do not have a header
   */
  isVerified: boolean = false;

  /**
   * The control flow graph of the script
   */
  controlFlowGraph: NWScriptControlFlowGraph | null = null;

  constructor ( dataOrFile?: string|Uint8Array, options: NWScriptLoadOptions = {} ){
    const game = options.game ?? GameState.GameKey;
    this.actionsMap = options.actionsMap ?? (
      game === GameEngineType.TSL ? NWScriptDefK2.Actions : NWScriptDefK1.Actions
    );

    this.instances = [];
    this.isGlobal = false;

    this.name = '';
    
    this.isVerified = false;

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
   * This is used to verify that the script is a valid NCS file
   * Cannot be used to verify ScriptSituations, because they do not have a header
   * @param {BinaryReader} reader
   * @returns {boolean}
   */
  verifyNCS (reader: BinaryReader){
    reader.seek(0);
    if(this.isVerified || reader.readChars(8) == 'NCS V1.0')
      return this.isVerified = true;

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

    //Initialize the program type and code
    this.prog = OP_T
    this.code = data;
    this.progSize = progSize;

    //If the program size is not provided, parse the program type and size from the data
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
    }

    let instrIdx = 0;
    let lastInstruction: NWScriptInstruction = null;
    while ( reader.position < this.progSize ){
      lastInstruction = this.parseIntruction(reader, lastInstruction, instrIdx++);
    };
    
    reader.position = 0;
    reader = null;
  }

  /**
   * Parse an instruction from the binary data
   *
   * @param {BinaryReader} reader
   */
  parseIntruction( reader: BinaryReader, lastInstruction: NWScriptInstruction, index: number ): NWScriptInstruction {
    const instruction = parseNcsInstruction(reader, lastInstruction, index, this.actionsMap);
    this.instructions.set(instruction.address, instruction);
    return instruction;
  }

  /**
   * Clone the script
   *
   * @returns {NWScript}
   */
  clone(){
    const script = new NWScript(undefined, { actionsMap: this.actionsMap });
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
      instance.listenPatternSpeaker = parentInstance.listenPatternSpeaker;
      instance.copyOwnerFrom(parentInstance);
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
   * Instance for ExecuteScript / ad-hoc runs: reuse a dedicated runner when idle,
   * otherwise clone and mark disposeAfterRun for nested re-entry.
   */
  getInstanceForExecute(parentInstance?: NWScriptInstance): NWScriptInstance {
    if(
      this.executeInstance &&
      !this.executeInstance._disposed &&
      !this.executeInstance.running
    ){
      if(parentInstance instanceof NWScriptInstance){
        this.executeInstance.parentUUID = parentInstance.uuid;
      }
      return this.executeInstance;
    }

    if(this.executeInstance && this.executeInstance.running){
      const nested = this.newInstance(parentInstance);
      nested.disposeAfterRun = true;
      return nested;
    }

    this.executeInstance = this.newInstance(parentInstance);
    return this.executeInstance;
  }

  /**
   * Ensure the named script is parsed into the cache (no new object-slot instance).
   */
  static Ensure(scriptName = ''): NWScript | undefined {
    if(!scriptName){ return undefined; }
    if(NWScript.scripts.has(scriptName)){
      return NWScript.scripts.get(scriptName);
    }
    NWScript.Load(scriptName, false);
    return NWScript.scripts.get(scriptName);
  }

  /**
   * Run a script by name on a reusable execute instance (not an object event slot).
   */
  static Run(scriptName: string, caller: any, scriptVar = 0, parentInstance?: NWScriptInstance){
    const script = NWScript.Ensure(scriptName);
    if(!script){ return undefined; }
    const instance = script.getInstanceForExecute(parentInstance);
    return instance.run(caller, scriptVar);
  }

  /**
   * Set a script as global or not
   */
  static SetGlobalScript( scriptName = '', isGlobal = true ){
    if( !scriptName || !NWScript.scripts.has( scriptName ) ){
      return;
    }

    const script = NWScript.scripts.get( scriptName );
    script.isGlobal = isGlobal;
  }

  /**
   * Load a script from the game resources into memory and return an instance of the script.
   *
   * - No parentInstance: always newInstance (object loadScripts / slot assignment).
   * - With parentInstance (ExecuteScript): reuse getInstanceForExecute (disposeAfterRun if re-entrant).
   */
  static Load( scriptName = '', returnInstance = true, parentInstance?: NWScriptInstance ): NWScriptInstance {
    //If the script name is empty, return undefined
    if(!scriptName){ 
      return undefined; 
    }

    //If the script is already loaded, create a new instance and return it
    if( NWScript.scripts.has( scriptName ) ){
      const script = NWScript.scripts.get( scriptName );
      if(!returnInstance){ return undefined; }
      if(parentInstance instanceof NWScriptInstance){
        return script.getInstanceForExecute(parentInstance);
      }
      return script.newInstance()
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

    if(!returnInstance){ return undefined; }
    if(parentInstance instanceof NWScriptInstance){
      return script.getInstanceForExecute(parentInstance);
    }
    return script.newInstance();
  }

  /**
   * Reload all scripts
   */
  static Reload(){
    NWScript.scripts.forEach( (script, key) => {
      //Only dispose of non global scripts
      //global scripts would be like the ones attached to Game Menus
      if(script.isGlobal){  return; }
      script.executeInstance = undefined;
      script.disposeInstances();
      NWScript.scripts.delete(key);
    });
  }

  /**
   * Dispose of an instance of the script
   */
  disposeInstance( instance: NWScriptInstance ){
    if(instance instanceof NWScriptInstance){
      instance.dispose();
    }
  }

  /**
   * Dispose of all instances of the script
   */
  disposeInstances(){
    let i = this.instances.length;
    while(i--){
      let instance = this.instances[i];
      if(instance instanceof NWScriptInstance){
        instance.dispose();
      }
    }
    this.executeInstance = undefined;
  }
  
  /**
   * Decompile the script
   *
   * @param {Uint8Array} binary
   * @returns {string}
   */
  decompile(binary: Uint8Array): string {
    // If instructions haven't been parsed yet, parse them first
    if (!this.instructions || this.instructions.size === 0) {
      this.init(binary);
    }

    // Use the decompiler to convert NCS to NSS
    const decompiler = new NWScriptDecompiler(this);
    return decompiler.decompile();
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
