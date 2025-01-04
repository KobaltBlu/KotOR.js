import { GameEngineType } from "../enums/engine/GameEngineType";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { DebuggerState } from "../enums/server/DebuggerState";
import { IPCDataType } from "../enums/server/ipc/IPCDataType";
import { IPCMessageType } from "../enums/server/ipc/IPCMessageType";
import type { EventTimedEvent } from "../events";
import { GameState } from "../GameState";
import type { IPerceptionInfo } from "../interface/engine/IPerceptionInfo";
// import type { INWScriptDefAction } from "../interface/nwscript/INWScriptDefAction";
import type { INWScriptStoreState } from "../interface/nwscript/INWScriptStoreState";
// import { ModuleObjectManager } from "../managers";
import type { ModuleObject } from "../module";
import type { DLGObject } from "../resource/DLGObject";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import type { TalentObject, TalentSpell } from "../talents";
import type { NWScript } from "./NWScript";
// import { NWScriptDefK1 } from "./NWScriptDefK1";
// import { NWScriptDefK2 } from "./NWScriptDefK2";
import type { NWScriptInstruction } from "./NWScriptInstruction";
import { NWScriptStack } from "./NWScriptStack";
import type { NWScriptStackVariable } from "./NWScriptStackVariable";
import type { NWScriptSubroutine } from "./NWScriptSubroutine";

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

  breakPoints: Map<number, boolean> = new Map<number, boolean>();

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
      this.dispatchEvent('breakpoint', address, true);
    }
  }

  removeBreakpoint(address: number){
    if(this.breakPoints.has(address)) {  
      this.breakPoints.delete(address);
      this.dispatchEvent('breakpoint', address, false);
    }
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

  runScript(ignoreBreakPoint: boolean = false){
    let executionHalted = false;
    let stepOver = false;

    if(GameState.debugMode && GameState.Debugger.state == DebuggerState.IntructionStepOver){
      stepOver = true;
    }

    this.running = true;
    
    //If the currentInstruction is empty start at the first instruction
    if(!this.currentInstruction){
      this.currentInstruction = this.getInstrAtOffset( 0 );
    }

    this.delayCommands = [];

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
      if(GameState.debugMode && (this.breakPoints.get(this.currentInstruction.address) && !ignoreBreakPoint) && !stepOver){
        GameState.Debugger.currentScript = this;
        GameState.Debugger.currentInstruction = this.currentInstruction;
        GameState.Debugger.state = DebuggerState.Paused;

        this.sendToDebugger(IPCMessageType.UpdateScriptState);
        executionHalted = true;
        this.running = false;
        break;
      }

      /**
       * Run the current instruction's logic function
       */
      this.currentInstruction.opCall.call(this, this.currentInstruction);

      /**
       * If we are in debug mode and we are in stepOver mode, 
       * Pause execution and send the script's state to the debugger
       */
      if(stepOver){
        stepOver = false;
        GameState.Debugger.currentScript = this;
        if(this.seek){
          GameState.Debugger.currentInstruction = this.getInstrAtOffset(this.seek);
        }else{
          GameState.Debugger.currentInstruction = this.currentInstruction.nextInstr;
        }
        GameState.Debugger.state = DebuggerState.Paused;

        this.sendToDebugger(IPCMessageType.UpdateScriptState);
        executionHalted = true;
        this.running = false;
        break;
      }

      this.currentInstruction = this.currentInstruction.nextInstr;
      ignoreBreakPoint = false;
    }

    //Stop early if disposed or execution was halted
    if(this._disposed || executionHalted)
      return;

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
      // this.dispose();
    // }

    return returnValue;
  }

  executeScript(instance: NWScriptInstance, parentInstance: NWScriptInstance, args: any[] = []){
    //console.log('executeScript', args);
    // instance.name = parentInstance.name;
    instance.parentUUID = parentInstance.uuid;
    instance.lastPerceived = parentInstance.lastPerceived;
    instance.listenPatternNumber = parentInstance.listenPatternNumber;
    instance.listenPatternSpeaker = parentInstance.listenPatternSpeaker;
    instance.talent = parentInstance.talent;
    instance.isStoreState = true;
    return instance.run( args[1], args[2] );
  }

  locationCompare(loc1: any, loc2: any){
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
    //STORE_STATE
    let scriptSituation = new GFFStruct(0x7777);

    scriptSituation.addField( new GFFField(GFFDataType.DWORD, 'CRC' ) ).setValue(0);
    scriptSituation.addField( new GFFField(GFFDataType.VOID, 'Code' ) ).setData( this.nwscript.code );
    scriptSituation.addField( new GFFField(GFFDataType.INT, 'CodeSize' ) ).setValue( this.nwscript.progSize );
    scriptSituation.addField( new GFFField(GFFDataType.INT, 'InstructionPtr' ) ).setValue(this.address);
    scriptSituation.addField( new GFFField(GFFDataType.CEXOSTRING, 'Name' ) ).setValue( this.name );
    scriptSituation.addField( new GFFField(GFFDataType.INT, 'SecondaryPtr' ) ).setValue(0);

    let stack = scriptSituation.addField( new GFFField(GFFDataType.STRUCT, 'Stack') );
    stack.addChildStruct( this.stack.saveForEventSituation() );

    return scriptSituation;
  }

}
