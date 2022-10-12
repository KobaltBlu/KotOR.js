import { GameEngineType } from "../enums/engine/GameEngineType";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { NWScriptDefK1 } from "./NWScriptDefK1";
import { NWScriptDefK2 } from "./NWScriptDefK2";
import { NWScriptStack } from "./NWScriptStack";

export class NWScriptInstance {
  name: any;
  instructions: any;
  talent: any;
  actionsMap: any;
  globalCache: any;
  _disposed: boolean;
  isStoreState: any;
  nwscript: any;
  caller: any;
  scriptVar: number;
  onComplete: any;
  subRoutines: any[];
  subRoutine: any;
  enteringObject: any;
  exitingObject: any;
  listenPatternNumber: number;
  debugging: boolean;
  debug: { action: boolean; build: boolean; equal: boolean; nequal: boolean; };
  state: any[];
  var1: any;
  var2: any;
  var3: any;
  struct1: any;
  struct2: any;
  params: number[];
  paramString: string;
  verified: boolean;
  stack: NWScriptStack;
  delayCommands: any[];
  lastSpeaker: any;
  persistentObjectIdx: number;
  firstLoop: boolean;
  address: any;
  lastPerceived: any;
  offset: any;

  constructor( args: any = {} ){

    args = Object.assign({
      name: '',
      instructions: []
    }, args);

    this.name = args.name;
    this.instructions = args.instructions;
    this.talent = undefined;
    this.actionsMap = undefined;

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
    this.onComplete = undefined;

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
      this.caller = ModuleObject.GetObjectById(this.caller);
    }
  }

  getSpellId(){
    if(this.talent instanceof TalentObject){
      return this.talent.id;
    }else{
      return -1;
    }
  }

  run(caller: any = null, scriptVar = 0, onComplete?: Function){
    return new Promise( (resolve, reject) => {
      this.caller = caller;
      this.scriptVar = scriptVar;
      this.onComplete = onComplete;

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
        
        this.runScript({
          instr: this.globalCache.instr,
          seek: null,
          onComplete: ( value = 0 ) => {
            if(typeof onComplete === 'function')
              onComplete(value);
            
            resolve(value)
          }
        });
      }else{
        this.runScript({
          instr: this.instructions.values().next().value,
          seek: null,
          onComplete: ( value = 0 ) => {
            if(typeof onComplete === 'function')
              onComplete(value);
              
            resolve(value)
          }
        });
      }
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


  //BeginLoop should be merged with runscript and possibly renamed
  //The code base will need to be refactored to deal with this change
  beginLoop(data: any){
    this.runScript(data);
  }

  async runScript(scope: any = {}){

    scope = Object.assign({
      running: true,
      prevByteCode: -1,
      seek: null,
      prevInstr: null,
      instr: null,
      onComplete: null
    }, scope);
    this.delayCommands = [];

    scope.iterations = 0;

    while(scope.running && !this._disposed){

      if(scope.instr)
        scope.prevByteCode = scope.instr.code;
      
      if( scope.seek != null ) {
        scope.instr = this.getInstrAtOffset( scope.seek );
        this.firstLoop = false;
      }else{
        if(!scope.instr.eof){
          if(scope.instr.nextInstr != null){
            scope.instr = this.firstLoop ? scope.instr : scope.instr.nextInstr;
            this.firstLoop = false;
          }
        }else{ }
      }

      this.address = scope.instr.address;

      scope.seek = null;
      //Run the instruction's run method
      await NWScript.ByteCodes[scope.instr.code].run.call(this, scope);
      //await this.runInstr(scope.instr, scope);

      // scope.iterations++;
      // if(scope.iterations >= 100){
      //   await this.delay(100);
      //   scope.iterations = 0;
      // }

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

    if(typeof scope.onComplete === 'function'){
      scope.onComplete(returnValue);
    }

  }

  async runInstr ( instr, scope ) {

    if(this.isDebugging()){
      console.log('NWScript: '+this.name,  'runInstr', instr.index, NWScript.ByteCodes[instr.code], instr );
    }

    //Run the instruction's run method
    await NWScript.ByteCodes[instr.code].run.call(this, scope);
    
    if(this.isDebugging()){
      console.log('NWScript: '+this.name, 'STACK_LEN', this.stack.stack.length);
    }

  }

  executeScript(script: any, scope: any, args: any){
    return new Promise( async (resolve, reject) => {
      //console.log('executeScript', args);
      script.lastPerceived = scope.lastPerceived;
      script.debug = scope.debug;
      script.debugging = scope.debugging;
      script.listenPatternNumber = scope.listenPatternNumber;
      script.listenPatternSpeaker = scope.listenPatternSpeaker;
      script.talent = scope.talent;

      let val = await script.run( args[1], args[2]);
      resolve(val);
    });
  }

  locationCompare(loc1: any, loc2: any){
    return loc1.position.x == loc2.position.x && loc1.position.y == loc2.position.y && loc1.position.z == loc2.position.z && loc1.facing == loc2.facing;
  }

  pushVectorToStack(vector: any){
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

    scriptSituation.AddField( new GFFField(GFFDataType.DWORD, 'CRC' ) ).SetValue(0);
    scriptSituation.AddField( new GFFField(GFFDataType.VOID, 'Code' ) ).SetData( this.nwscript.code );
    scriptSituation.AddField( new GFFField(GFFDataType.INT, 'CodeSize' ) ).SetValue( this.nwscript.progSize );
    scriptSituation.AddField( new GFFField(GFFDataType.INT, 'InstructionPtr' ) ).SetValue(this.address);
    scriptSituation.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Name' ) ).SetValue( this.name );
    scriptSituation.AddField( new GFFField(GFFDataType.INT, 'SecondaryPtr' ) ).SetValue(0);

    let stack = scriptSituation.AddField( new GFFField(GFFDataType.STRUCT, 'Stack') );
    stack.AddChildStruct( this.stack.saveForEventSituation() );

    return scriptSituation;
  }

}
