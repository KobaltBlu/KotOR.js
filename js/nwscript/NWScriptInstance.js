class NWScriptInstance {

  constructor( args = {} ){

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

    
    if(GameKey == 'TSL'){
      this.actionsMap = NWScriptDefK2.Actions;
    }else{
      this.actionsMap = NWScriptDefK1.Actions;
    }

  }

  setCaller(obj){
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

  run(caller = null, scriptVar = 0, onComplete = null){
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

  getInstrAtOffset( offset ){
    return this.instructions.get(offset);
  }


  //BeginLoop should be merged with runscript and possibly renamed
  //The code base will need to be refactored to deal with this change
  beginLoop(data){
    this.runScript(data);
  }

  async runScript(scope = {}){

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
      Game.module.eventQueue.push(this.delayCommands[i]);
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

  executeScript(script, scope, args){
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

  locationCompare(loc1, loc2){
    return loc1.position.x == loc2.position.x && loc1.position.y == loc2.position.y && loc1.position.z == loc2.position.z && loc1.facing == loc2.facing;
  }

  pushVectorToStack(vector){
    //Push Z to the stack
    this.stack.push(vector.z || 0.0, NWScript.DATATYPE.FLOAT);
    //Push Y to the stack
    this.stack.push(vector.y || 0.0, NWScript.DATATYPE.FLOAT);
    //Push X to the stack
    this.stack.push(vector.x || 0.0, NWScript.DATATYPE.FLOAT);
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
      return Game.Flags.LogScripts || this.debugging || this.debug[type];
    }else{
      return Game.Flags.LogScripts || this.debugging;
    }
  }

  saveEventSituation(){
    //STORE_STATE
    let scriptSituation = new Struct(0x7777);

    scriptSituation.AddField( new Field(GFFDataTypes.DWORD, 'CRC' ) ).SetValue(0);
    scriptSituation.AddField( new Field(GFFDataTypes.VOID, 'Code' ) ).SetData( this.nwscript.code );
    scriptSituation.AddField( new Field(GFFDataTypes.INT, 'CodeSize' ) ).SetValue( this.nwscript.progSize );
    scriptSituation.AddField( new Field(GFFDataTypes.INT, 'InstructionPtr' ) ).SetValue(this.address);
    scriptSituation.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Name' ) ).SetValue( this.name );
    scriptSituation.AddField( new Field(GFFDataTypes.INT, 'SecondaryPtr' ) ).SetValue(0);

    let stack = scriptSituation.AddField( new Field(GFFDataTypes.STRUCT, 'Stack') );
    stack.AddChildStruct( this.stack.saveForEventSituation() );

    return scriptSituation;
  }

}

module.exports = NWScriptInstance;