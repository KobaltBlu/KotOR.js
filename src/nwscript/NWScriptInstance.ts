import type EngineLocation from "@/engine/EngineLocation";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { DebuggerState } from "@/enums/server/DebuggerState";
import { IPCDataType } from "@/enums/server/ipc/IPCDataType";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import type { EventTimedEvent } from "@/events";
import { GameState } from "@/GameState";
import type { IPerceptionInfo } from "@/interface/engine/IPerceptionInfo";
import type { INWScriptStoreState } from "@/interface/nwscript/INWScriptStoreState";
import type { ModuleObject } from "@/module";
import type { DLGObject } from "@/resource/DLGObject";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import type { TalentObject, TalentSpell } from "@/talents";
import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptStack } from "@/nwscript/NWScriptStack";
import type { NWScriptStackVariable } from "@/nwscript/NWScriptStackVariable";
import type { NWScriptSubroutine } from "@/nwscript/NWScriptSubroutine";

/**
 * NWScriptInstance class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file NWScriptInstance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptInstance {
  uuid: string = crypto.randomUUID();
  parentUUID: string;
  name: string;
  instructions: Map<number, NWScriptInstruction> = new Map();
  globalCache: any = null;
  _disposed: boolean = false;
  isStoreState: boolean = false;
  nwscript: NWScript;
  caller: ModuleObject;
  scriptVar: number;
  subRoutines: NWScriptSubroutine[] = [];
  subRoutine: NWScriptSubroutine;
  state: INWScriptStoreState[] = [];
  var1: any;
  var2: any;
  var3: any;
  struct1: NWScriptStackVariable[] = [];
  struct2: NWScriptStackVariable[] = [];
  params: number[];
  paramString: string;
  verified: boolean;
  stack: NWScriptStack = new NWScriptStack();
  delayCommands: EventTimedEvent[] = [];
  address: number;
  offset: number;
  
  lastPerceived: IPerceptionInfo;

  lastSpeaker: ModuleObject;
  object: ModuleObject;

  running: boolean = false;
  currentInstruction: NWScriptInstruction;
  prevByteCode: number;
  seek: number;

  enteringObject: ModuleObject;
  exitingObject: ModuleObject;

  //ListenPattern
  listenPatternNumber: number = -1;
  listenPatternSpeaker: ModuleObject = undefined;
  conversation: DLGObject;

  talent: TalentObject;

  //Spell
  lastSpellCaster: ModuleObject;
  lastSpellAttacker: ModuleObject;
  lastSpell: TalentSpell;
  lastSpellHarmful: boolean;
  healTarget: ModuleObject;

  lastDisturbed: ModuleObject;

  //MiniGame
  mgFollower: ModuleObject;
  mgObstacle: ModuleObject;
  mgBullet: ModuleObject;

  //ITERATE POINTERS
  persistentObjectIndex: Map<number, number> = new Map<number, number>();
  objectInventoryIndex: Map<number, number> = new Map<number, number>();
  creatureEffectIndex: Map<number, number> = new Map<number, number>();
  creatureAttackerIndex: Map<number, number> = new Map<number, number>();
  factionMemberIndex: Map<number, number> = new Map<number, number>();
  objectInSphapeIndex: Map<number, number> = new Map<number, number>();
  objectInShapeResults: ModuleObject[] = [];

  breakPoints: Map<number, boolean> = new Map<number, boolean>();
  /** True while halted at a debugger breakpoint / step; Cleared when run completes. */
  suspended: boolean = false;
  /** Return addresses for debugger call-stack display (filled on UpdateScriptState). */
  debugCallStack: number[] = [];
  /** Breakpoint map version — bump to force UI remount of gutters. */
  breakPointVersion: number = 0;

  #eventListener: { [key: string]: Function[] } = {};

  constructor( instructions: Map<number, NWScriptInstruction> ){
    this.instructions = instructions;
    this.talent = undefined;

    this.init();
    this.globalCache = null;
    this._disposed = false;
  }

  newInstance(){
    return this.nwscript.newInstance();
  }

  /**
   * Adds an event listener to the debugger.
   * @param event The event to listen for.
   * @param listener The listener to add.
   */
  addEventListener(event: string, listener: Function) {
    if(!Array.isArray(this.#eventListener[event])) {
      this.#eventListener[event] = [];
    }
    if(typeof listener !== 'function') return;
    const index = this.#eventListener[event].indexOf(listener);
    if(index == -1) {
      this.#eventListener[event].push(listener);
    }
  }

  /**
   * Removes an event listener from the debugger.
   * @param event The event to remove the listener from.
   * @param listener The listener to remove.
   */
  removeEventListener(event: string, listener: Function) {
    if(!Array.isArray(this.#eventListener[event])) {
      this.#eventListener[event] = [];
    }
    const index = this.#eventListener[event].indexOf(listener);
    if(index >= 0) {
      this.#eventListener[event].splice(index, 1);
    }
  }

  /**
   * Dispatches an event to the debugger.
   * @param event The event to dispatch.
   * @param args The arguments to pass to the event.
   */
  dispatchEvent(event: string, ...args: any) {
    if(!Array.isArray(this.#eventListener[event])) {
      return;
    }
    this.#eventListener[event].forEach((listener: Function) => listener(...args));
  }

  toggleBreakpoint(address: number){
    if(!this.breakPoints.has(address)) {
      this.setBreakpoint(address);
    }else{
      this.removeBreakpoint(address);
    }
  }

  setBreakpoint(address: number){
    if(!this.breakPoints.has(address)) {  
      this.breakPoints.set(address, true);
      this.breakPointVersion++;
      this.dispatchEvent('breakpoint', address, true);
    }
  }

  removeBreakpoint(address: number){
    if(this.breakPoints.has(address)) {  
      this.breakPoints.delete(address);
      this.breakPointVersion++;
      this.dispatchEvent('breakpoint', address, false);
    }
  }

  clearBreakpoints(){
    const addresses = [...this.breakPoints.keys()];
    for(const address of addresses){
      this.removeBreakpoint(address);
    }
  }

  packCallStackForDebugger(): Uint8Array {
    const frames = this.subRoutines.map((sub) => sub.returnAddress);
    const data = new Uint8Array(4 + frames.length * 4);
    const view = new DataView(data.buffer);
    view.setInt32(0, frames.length, true);
    for(let i = 0; i < frames.length; i++){
      view.setInt32(4 + i * 4, frames[i], true);
    }
    return data;
  }

  static unpackCallStackFromDebugger(data: Uint8Array): number[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const count = view.getInt32(0, true);
    const frames: number[] = [];
    for(let i = 0; i < count; i++){
      frames.push(view.getInt32(4 + i * 4, true));
    }
    return frames;
  }
  
  sendToDebugger(type: IPCMessageType){
    if(!GameState.debugMode) return;
    const ipcMessage = new GameState.Debugger.IPCMessage(type);
    ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.STRING, this.uuid));
    ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.STRING, this.parentUUID));
    ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.STRING, this.nwscript?.name));
    if(type == IPCMessageType.CreateScript && !!this.nwscript){
      ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.INTEGER, this.nwscript?.progSize));
      ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.VOID, this.nwscript?.code));
    }
    if(type == IPCMessageType.UpdateScriptState){
      ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.INTEGER, this.currentInstruction.address));
      ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.VOID, this.stack.saveForDebugger()));
      ipcMessage.addParam(new GameState.Debugger.IPCMessageParam(IPCDataType.VOID, this.packCallStackForDebugger()));
    }
    GameState.Debugger.send(ipcMessage);
  }

  //Dispose of this NWScriptInstance and any currently running code so it can hopefully be garbage collected
  dispose(){
    if(this._disposed) return;
    this._disposed = true;

    this.sendToDebugger(IPCMessageType.DestroyScript);

    //This is used to dispose of STORE_STATE instances once they complete
    if(this.isStoreState){
      this.nwscript.disposeInstance(this);
    }

    // this.nwscript = undefined;
    this.instructions = undefined;
    this.init();
    this.dispatchEvent('dispose', this.uuid);
  }

  init(){

    this.caller = undefined;
    this.scriptVar = 0;

    this.subRoutines = [];
    this.subRoutine = undefined;
    this.suspended = false;
    this.debugCallStack = [];

    this.enteringObject = undefined;
    this.exitingObject = undefined;
    this.listenPatternNumber = 1;

    this.state = [];

    this.var1 = undefined;
    this.var2 = undefined;
    this.var3 = undefined;
    this.struct1 = undefined;
    this.struct2 = undefined;

    this.params = [0, 0, 0, 0, 0];
    this.paramString = '';
    this.verified = false;

    if(this.stack instanceof NWScriptStack)
      this.stack.dispose();

    this.persistentObjectIndex.clear()
    this.objectInventoryIndex.clear()
    this.creatureEffectIndex.clear()
    this.creatureAttackerIndex.clear()
    this.factionMemberIndex.clear()
    this.objectInSphapeIndex.clear()
    this.objectInShapeResults = [];

    this.mgBullet = undefined;
    this.mgFollower = undefined;
    this.mgObstacle = undefined;

  }

  setCaller(obj: any){
    this.caller = obj;
    if(typeof this.caller == 'number'){
      this.caller = GameState.ModuleObjectManager.GetObjectById(this.caller);
    }
  }

  getSpellId(){
    if(!this.talent){ return -1; }
    return this.talent.id;
  }

  run(caller: any = null, scriptVar = 0){
    this.caller = caller;
    this.scriptVar = scriptVar;

    this.subRoutines = [];
    this.stack = new NWScriptStack();
    this.state = [];
    this.delayCommands = [];

    this.lastSpeaker = undefined;

    this.persistentObjectIndex = new Map<number, number>();
    this.objectInventoryIndex = new Map<number, number>();
    this.creatureEffectIndex = new Map<number, number>();
    this.creatureAttackerIndex = new Map<number, number>();
    this.factionMemberIndex = new Map<number, number>();
    this.objectInSphapeIndex = new Map<number, number>();
    this.objectInShapeResults = [];

    if(this.globalCache != null){
      //I'm trying to cache instructions from the global scope so they are not processed again when the script is run again.
      //Need to test the performance impact to see if it helps
      //this.caller = this.globalCache.caller;
      this.enteringObject = this.globalCache.enteringObject;
      this.subRoutines = this.globalCache.subRoutines.slice();

      this.stack.basePointer = this.globalCache.stack.basePointer;
      this.stack.pointer = this.globalCache.stack.pointer;
      this.stack.stack = this.globalCache.stack.stack.slice();
      
      this.seekTo(this.globalCache.instr.address);
      return this.runScript();
    }else{
      this.seekTo(0);
      return this.runScript();
    }
  }

  getReturnValue(){
    //For some reason this is needed for some conditional scripts because the stack pointer is getting set back too far could be a problem with MOVSP?
    try{
      if(this.stack.stack[-1] ? true : false){
        let _ret = (this.stack.stack[-1]);
        delete this.stack.stack[-1];
        return _ret.value ? 1 : 0;
      }else if(this.stack.stack.length){
        let _ret = (this.stack.pop());
        return _ret.value ? 1 : 0;
      }else{
        return false;
      }
    }catch(e){
      console.error(e, this);
    }
  }

  getInstrAtOffset( offset: number ){
    return this.instructions.get(offset);
  }

  seekTo(address: number){
    this.seek = address;
    this.currentInstruction = this.getInstrAtOffset(address);
  }

  /**
   * Execute bytecode until end, or until a debugger halt.
   *
   * When halted at a breakpoint / step, returns early without flushing DelayCommands or
   * calling init. Sync callers still receive undefined for that early return — a full
   * async invocation rewrite is required to hold the original caller's return value.
   */
  runScript(ignoreBreakPoint: boolean = false){
    let executionHalted = false;
    let stepOneInstruction = false;
    let stepOverDepth: number | undefined;
    let stepOutDepth: number | undefined;

    const dbgState = GameState.Debugger.state;
    if(GameState.debugMode){
      if(
        dbgState == DebuggerState.InstructionStepOver ||
        dbgState == DebuggerState.IntructionStepOver
      ){
        stepOneInstruction = true;
      }else if(dbgState == DebuggerState.InstructionStepInto){
        stepOneInstruction = true;
      }else if(dbgState == DebuggerState.InstructionStepOut){
        stepOutDepth = this.subRoutines.length;
      }
    }

    this.running = true;
    
    //If the currentInstruction is empty start at the first instruction
    if(!this.currentInstruction){
      this.currentInstruction = this.getInstrAtOffset( 0 );
    }

    // Preserve DelayCommands when resuming a suspended debug halt.
    if(!this.suspended && !ignoreBreakPoint){
      this.delayCommands = [];
    }

    while(this.running && !this._disposed){

      if(this.currentInstruction)
        this.prevByteCode = this.currentInstruction.code;

      if(this.seek != null){
        this.seekTo(this.seek);
        this.seek = null;
      }

      if(!this.currentInstruction) break;

      this.address = this.currentInstruction.address;

      /**
       * If we are in debug mode and the current instruction has a breakpoint, kill the script and send the state to the debugger
       */
      if(GameState.debugMode && (this.breakPoints.get(this.currentInstruction.address) && !ignoreBreakPoint) && !stepOneInstruction){
        this.haltForDebugger();
        executionHalted = true;
        break;
      }

      const depthBefore = this.subRoutines.length;
      const isJsr = this.currentInstruction.code === 0x1E; // OP_JSR
      if(
        GameState.debugMode &&
        (dbgState == DebuggerState.InstructionStepOver || dbgState == DebuggerState.IntructionStepOver) &&
        isJsr &&
        stepOverDepth === undefined &&
        stepOneInstruction
      ){
        // True step-over: run the callee until we return to this depth.
        stepOverDepth = depthBefore;
        stepOneInstruction = false;
      }

      /**
       * Run the current instruction's logic function
       */
      try{
        this.currentInstruction.opCall.call(this, this.currentInstruction);
      }catch(error){
        console.error('[NWScript VM] instruction failed', {
          script: this.name,
          address: this.currentInstruction.address,
          opcode: this.currentInstruction.codeName || this.currentInstruction.code,
          pointer: this.stack?.pointer,
          stackLength: this.stack?.stack?.length,
          storedStates: this.state?.length,
          error,
        });
        throw error;
      }

      const depthAfter = this.subRoutines.length;

      /**
       * Debugger step modes
       */
      if(GameState.debugMode){
        let shouldPause = false;
        if(stepOneInstruction){
          shouldPause = true;
          stepOneInstruction = false;
        }else if(stepOverDepth !== undefined && depthAfter <= stepOverDepth){
          shouldPause = true;
          stepOverDepth = undefined;
        }else if(stepOutDepth !== undefined && depthAfter < stepOutDepth){
          shouldPause = true;
          stepOutDepth = undefined;
        }

        if(shouldPause){
          if(this.seek){
            GameState.Debugger.currentInstruction = this.getInstrAtOffset(this.seek);
          }else{
            GameState.Debugger.currentInstruction = this.currentInstruction.nextInstr;
          }
          if(GameState.Debugger.currentInstruction){
            this.haltForDebugger(GameState.Debugger.currentInstruction);
          }else{
            // Fell off end after step — treat as normal completion path below
            this.suspended = false;
            GameState.Debugger.state = DebuggerState.Idle;
            GameState.Debugger.currentScript = undefined as any;
            GameState.Debugger.currentInstruction = undefined as any;
          }
          if(this.suspended){
            executionHalted = true;
            break;
          }
        }
      }

      this.currentInstruction = this.currentInstruction.nextInstr;
      ignoreBreakPoint = false;
    }

    //Stop early if disposed or execution was halted
    if(this._disposed || executionHalted)
      return;

    this.suspended = false;
    const returnValue = this.getReturnValue();

    /**
     * Add DelayCommand actions to the module's EventQueue
     */
    for(let i = 0, len = this.delayCommands.length; i < len; i++){
      GameState.module.eventQueue.push(this.delayCommands[i]);
    }

    /**
     * Reset the script state by reinitializing it
     */
    this.init();

    /**
     * If this instance was generated from a StoreState,
     * then dispose of it as it won't be used again
     */
    // if(this.isStoreState){
      // this.dispose;
    // }

    return returnValue;
  }

  private haltForDebugger(instruction = this.currentInstruction){
    this.suspended = true;
    this.running = false;
    GameState.Debugger.currentScript = this;
    GameState.Debugger.currentInstruction = instruction;
    GameState.Debugger.state = DebuggerState.Paused;
    this.seek = instruction?.address ?? this.address;
    this.sendToDebugger(IPCMessageType.UpdateScriptState);
  }

  executeScript(instance: NWScriptInstance, parentInstance: NWScriptInstance, args: any[] = []){
    //console.log('executeScript', args);
    // instance.name = parentInstance.name;
    instance.parentUUID = parentInstance.uuid;
    instance.lastPerceived = parentInstance.lastPerceived;
    instance.listenPatternNumber = parentInstance.listenPatternNumber;
    instance.listenPatternSpeaker = parentInstance.listenPatternSpeaker;
    instance.conversation = parentInstance.conversation;
    instance.lastSpeaker = parentInstance.lastSpeaker;
    instance.lastSpellCaster = parentInstance.lastSpellCaster;
    instance.lastSpellAttacker = parentInstance.lastSpellAttacker;
    instance.lastSpell = parentInstance.lastSpell;
    instance.lastSpellHarmful = parentInstance.lastSpellHarmful;
    instance.healTarget = parentInstance.healTarget;
    instance.lastDisturbed = parentInstance.lastDisturbed;
    instance.mgFollower = parentInstance.mgFollower;
    instance.mgObstacle = parentInstance.mgObstacle;
    instance.mgBullet = parentInstance.mgBullet;
    instance.talent = parentInstance.talent;
    instance.enteringObject = parentInstance.enteringObject;
    instance.exitingObject = parentInstance.exitingObject;
    return instance.run( args[1], args[2] );
  }

  locationCompare(loc1: EngineLocation, loc2: EngineLocation){
    return loc1.position.x == loc2.position.x && loc1.position.y == loc2.position.y && loc1.position.z == loc2.position.z && loc1.facing == loc2.facing;
  }

  pushVectorToStack(vector: {x: number, y: number; z: number}){
    //Push Z to the stack
    this.stack.push(vector.z || 0.0, NWScriptDataType.FLOAT);
    //Push Y to the stack
    this.stack.push(vector.y || 0.0, NWScriptDataType.FLOAT);
    //Push X to the stack
    this.stack.push(vector.x || 0.0, NWScriptDataType.FLOAT);
  }

  setScriptParam(idx = 1, value = 0){
    switch(idx){
      case 2:
        this.params[1] = value;
      break;
      case 3:
        this.params[2] = value;
      break;
      case 4:
        this.params[3] = value;
      break;
      case 5:
        this.params[4] = value;
      break;
      default:
        this.params[0] = value;
      break;
    }
  }

  setScriptStringParam(value=''){
    this.paramString = value;
  }

  saveEventSituation(){
    // SaveActionQueue case 5: AddStructToStruct("Value", 2) then SaveScriptSituation
    let scriptSituation = new GFFStruct(2);

    scriptSituation.addField( new GFFField(GFFDataType.DWORD, 'CRC' ) ).setValue(0);
    scriptSituation.addField( new GFFField(GFFDataType.VOID, 'Code' ) ).setData( this.nwscript.code );
    scriptSituation.addField( new GFFField(GFFDataType.INT, 'CodeSize' ) ).setValue( this.nwscript.progSize );
    scriptSituation.addField( new GFFField(GFFDataType.INT, 'InstructionPtr' ) ).setValue(this.address);
    scriptSituation.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name' ) ).setValue( this.name );
    scriptSituation.addField( new GFFField(GFFDataType.INT, 'SecondaryPtr' ) ).setValue(0);
    // SaveScriptSituation writes StackSize before nested Stack STRUCT
    scriptSituation.addField( new GFFField(GFFDataType.INT, 'StackSize' ) ).setValue( this.stack?.stack?.length ?? 0 );

    let stack = scriptSituation.addField( new GFFField(GFFDataType.STRUCT, 'Stack') );
    stack.addChildStruct( this.stack.saveForEventSituation() );

    return scriptSituation;
  }

}
