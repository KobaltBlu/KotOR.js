import { GameEngineType } from "../enums/engine/GameEngineType";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import type { EventTimedEvent } from "../events";
import { GameState } from "../GameState";
import type { PerceptionInfo } from "../interface/engine/PerceptionInfo";
import type { NWScriptDefAction } from "../interface/nwscript/NWScriptDefAction";
import type { NWScriptStoreState } from "../interface/nwscript/NWScriptStoreState";
import { ModuleObjectManager } from "../managers";
import type { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentObject, TalentSpell } from "../talents";
import type { NWScript } from "./NWScript";
import { NWScriptDefK1 } from "./NWScriptDefK1";
import { NWScriptDefK2 } from "./NWScriptDefK2";
import type { NWScriptInstruction } from "./NWScriptInstruction";
import { NWScriptStack } from "./NWScriptStack";
import type { NWScriptStackVariable } from "./NWScriptStackVariable";
import type { NWScriptSubroutine } from "./NWScriptSubroutine";

export class NWScriptInstance {
  name: string;
  instructions: Map<number, NWScriptInstruction> = new Map();
  actionsMap: { [key: number]: NWScriptDefAction; };
  globalCache: any = null;
  _disposed: boolean = false;
  isStoreState: boolean = false;
  nwscript: NWScript;
  caller: ModuleObject;
  scriptVar: number;
  subRoutines: NWScriptSubroutine[] = [];
  subRoutine: NWScriptSubroutine;
  debugging: boolean;
  debug: any = {};
  state: NWScriptStoreState[] = [];
  var1: any;
  var2: any;
  var3: any;
  struct1: NWScriptStackVariable[] = [];
  struct2: NWScriptStackVariable[] = [];
  params: number[];
  paramString: string;
  verified: boolean;
  stack: NWScriptStack;
  delayCommands: EventTimedEvent[] = [];
  firstLoop: boolean;
  address: number;
  offset: number;
  
  lastPerceived: PerceptionInfo;

  lastSpeaker: ModuleObject;
  object: ModuleObject;

  running: boolean = false;
  currentInstruction: NWScriptInstruction;
  prevByteCode: number;
  seek: number;
  iterations: number = 0;

  enteringObject: ModuleObject;
  exitingObject: ModuleObject;

  //ListenPattern
  listenPatternNumber: number = -1;
  listenPatternSpeaker: ModuleObject = undefined;

  talent: TalentObject;

  //Spell
  lastSpellCaster: ModuleObject;
  lastSpellAttacker: ModuleObject;
  lastSpell: TalentSpell;
  lastSpellHarmful: boolean;

  //MiniGame
  mgFollower: ModuleObject;
  mgObstacle: ModuleObject;
  mgBullet: ModuleObject;

  //ITERATE POINTERS
  objectsInShapeIdx: number = 0;
  _effectPointer: number = 0;
  persistentObjectIdx: number = 0;
  creatureFactionIdx: number = 0;
  attackerIndex: number = 0;
  inventoryIndex: number = 0;

  constructor( instructions: Map<number, NWScriptInstruction> ){

    this.instructions = instructions;
    this.talent = undefined;

    this.init();
    this.globalCache = null;
    this._disposed = false;

  }

  //Dispose of this NWScriptInstance and any currently running code so it can hopefully be garbage collected
  dispose(){
    this._disposed = true;

    //This is used to dispose of STORE_STATE instances once they complete
    if(this.isStoreState){
      this.nwscript.disposeInstance(this);
    }

    this.nwscript = undefined;
    this.instructions = undefined;
    this.init();
  }

  init(){

    this.caller = undefined;
    this.scriptVar = 0;

    this.subRoutines = [];
    this.subRoutine = undefined;

    this.enteringObject = undefined;
    this.exitingObject = undefined;
    this.listenPatternNumber = 1;
    this.debugging = false;
    this.debug = {
      'action': false,
      'build': false,
      'equal': false,
      'nequal': false
    }

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

    this.stack = undefined;

    
    if(GameState.GameKey == GameEngineType.TSL){
      this.actionsMap = NWScriptDefK2.Actions;
    }else{
      this.actionsMap = NWScriptDefK1.Actions;
    }

  }

  setCaller(obj: any){
    this.caller = obj;
    if(typeof this.caller == 'number'){
      this.caller = ModuleObjectManager.GetObjectById(this.caller);
    }
  }

  getSpellId(){
    if(this.talent instanceof TalentObject){
      return this.talent.id;
    }else{
      return -1;
    }
  }

  run(caller: any = null, scriptVar = 0){
    this.caller = caller;
    this.scriptVar = scriptVar;

    this.subRoutines = [];
    this.stack = new NWScriptStack();
    this.state = [];
    this.delayCommands = [];

    this.lastSpeaker = undefined;
    this.persistentObjectIdx = 0;
    this.firstLoop = true;

    if(this.globalCache != null){
      //I'm trying to cache instructions from the global scope so they are not processed again when the script is run again.
      //Need to test the performance impact to see if it helps
      //this.caller = this.globalCache.caller;
      this.enteringObject = this.globalCache.enteringObject;
      this.subRoutines = this.globalCache.subRoutines.slice();

      this.stack.basePointer = this.globalCache.stack.basePointer;
      this.stack.pointer = this.globalCache.stack.pointer;
      this.stack.stack = this.globalCache.stack.stack.slice();
      
      return this.runScript({
        instruction: this.globalCache.instr,
        seek: null,
      });
    }else{
      return this.runScript({
        instruction: this.instructions.values().next().value,
        seek: null,
      });
    }
  }

  runAsync(caller: any = null, scriptVar = 0){
    return new Promise<any>( (resolve, reject) => {
      const result = this.run(caller, scriptVar);
      resolve(result);
    });
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

  runScript(scope: {
    seek?: number,
    instruction?: NWScriptInstruction
  } = {}){

    scope = Object.assign({
      seek: null,
      instruction: null,
    }, scope);

    this.running = true;

    if(scope.instruction){
      this.currentInstruction = scope.instruction;
      this.firstLoop = true;
    }else if(scope.seek != null){
      this.currentInstruction = this.getInstrAtOffset( scope.seek );
      this.firstLoop = false;
    }
    
    //If the currentInstruction is empty start at the first instruction
    if(!this.currentInstruction){
      this.currentInstruction = this.getInstrAtOffset( 0 );
      this.firstLoop = true;
    }

    this.delayCommands = [];

    this.iterations = 0;

    while(this.running && !this._disposed){

      if(this.currentInstruction)
        this.prevByteCode = this.currentInstruction.code;

      if(this.seek != null){
        this.currentInstruction = this.getInstrAtOffset( this.seek );
        this.seek = null;
      }

      if(!this.currentInstruction) break;

      this.address = this.currentInstruction.address;

      //Run the instruction's run method
      if(this.currentInstruction.break_point) debugger;
      this.currentInstruction.opCall.call(this, this.currentInstruction);

      this.currentInstruction = this.currentInstruction.nextInstr;
      this.firstLoop = false;
    }

    //Stop early if disposed
    if(this._disposed)
      return;

    //SCRIPT DONE

    //onScriptEND
    if(this.isDebugging()){
      console.log('onScriptEND', this)
    }else{
      //console.log('onScriptEND', this.name)
    }

    let returnValue = this.getReturnValue();
    for(let i = 0, len = this.delayCommands.length; i < len; i++){
      GameState.module.eventQueue.push(this.delayCommands[i]);
    }
    this.init();

    if(this.isStoreState){
      this.dispose();
    }

    return returnValue;

  }

  executeScript(instance: NWScriptInstance, parentInstance: NWScriptInstance, args: any[] = []){
    //console.log('executeScript', args);
    instance.lastPerceived = parentInstance.lastPerceived;
    instance.debug = parentInstance.debug;
    instance.debugging = parentInstance.debugging;
    instance.listenPatternNumber = parentInstance.listenPatternNumber;
    instance.listenPatternSpeaker = parentInstance.listenPatternSpeaker;
    instance.talent = parentInstance.talent;
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

  isDebugging(type = ''){
    if(type){
      return GameState.Flags.LogScripts || this.debugging || this.debug[type];
    }else{
      return GameState.Flags.LogScripts || this.debugging;
    }
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
