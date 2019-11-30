/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The NWScript class.
 */

class NWScript {

  constructor ( dataOrFile = null, onComplete = null, decompile = true ){

    this.instrIdx = 0;
    this._lastOffset = -1;

    this.subscripts = new Map();

    this.subRoutines = [];
    this.objectPointers = []; //OBJECT_SELF is objectPointer[0] //OBJECT_INVALID is objectPointer[1]
    this.stringPointers = [];
    this.integerPointers = [0, 1]; //0 and 1 are predefined for FALSE & TRUE vaules respectively
    this.floatPointers = [];
    this.locationPointers = [];
    this.effectPointers = [];
    this.eventPointers = [];
    this.actionPointers = [];
    this.talentPointers = [];
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
    }
    this.name = '';
    this.state = [];

    this.params = [0, 0, 0, 0, 0];
    this.paramString = '';
    this.verified = false;

    this.delayCommandQueue = [];

    if( dataOrFile != null ) {

      if( typeof dataOrFile === 'string' ){

        fs.readFile(dataOrFile, (err, binary) => {
          this.decompile(binary);
          if(typeof onComplete === 'function')
            onComplete(this);
        });

      }else if ( dataOrFile instanceof Buffer ){
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

  init (data = null, progSize = null){

    
    if(this.isDebugging()){
      console.log('NWScript: '+this.name, 'NWScript', 'Run');
    }
    //Lists store information of decoded data like variables and functions.
    //The index if the offset of the item that it resides in the stack.
    //If the item is in the stack we only need to retrieve it's name e.g var1, var2, object1, object2,
    //If it is not in the list we will need to create a new item in the appropriate list
    this.prevByteCode = 0;
    if(GameKey == 'TSL'){
      this.Definition = NWScriptDefK2;
    }else{
      this.Definition = NWScriptDefK1;
    }
    this.instructions = new Map();
    let reader = new BinaryReader(data);
    reader.endians = BinaryReader.Endians.BIG;

    this.eofFound = false;

    if(!progSize){
      reader.Skip(8);
      this.prog = reader.ReadByte();
      this.progSize = reader.ReadUInt32(); //This includes the initial 8Bytes of the NCS V1.0 header and the previous byte
    }else{
      this.progSize = progSize;
    }

    //PASS 1: Create a listing of all of the instructions in order as they occur
    
    if(this.isDebugging()){
      console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Started');
    }

    while ( reader.position < this.progSize ){
      this.parseIntr(reader);
    };
    
    if(this.isDebugging()){
      console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Complete');
    }
    reader.position = 0;

    this.delayCommandQueue = [];

  }

  clone(){
    let script = new NWScript();
    script.name = this.name;
    script.Definition = this.Definition;
    script.instructions = new Map(this.instructions);
    return script;
  }

  setCaller(obj){
    this.caller = obj;
    this.objectPointers[0] = obj;
  }

  run(caller = null, scriptVar = 0, onComplete = null){
    this.caller = caller;
    this.scriptVar = scriptVar;
    this.onComplete = onComplete;

    this.delayCommandQueue = [];

    this.subRoutines = [];
    this.objectPointers = [this.caller, undefined]; //OBJECT_SELF is objectPointer[0] //OBJECT_INVALID is objectPointer[1]
    this.stringPointers = [];
    this.integerPointers = [0, 1]; //0 and 1 are predefined for FALSE & TRUE vaules respectively
    this.floatPointers = [];
    this.locationPointers = [];
    this.effectPointers = [];
    this.eventPointers = [];
    this.actionPointers = [];
    this.talentPointers = [];
    this.stack = new NWScriptStack();
    this.state = [];

    this.lastSpeaker = undefined;

    this.persistentObjectIdx = 0;
    
    this.firstLoop = true;

    if(this.globalCache != null){
      //I'm trying to cache instructions from the global scope so they are not processed again when the script is run again.
      //Need to test the performance impact to see if it helps
      this.caller = this.globalCache.caller;
      this.enteringObject = this.globalCache.enteringObject;
      this.subRoutines = this.globalCache.subRoutines.slice();
      this.objectPointers = this.globalCache.objectPointers.slice();
      this.stringPointers = this.globalCache.stringPointers.slice();
      this.integerPointers = this.globalCache.integerPointers.slice();
      this.floatPointers = this.globalCache.floatPointers.slice();
      this.locationPointers = this.globalCache.locationPointers.slice();
      this.effectPointers = this.globalCache.effectPointers.slice();
      this.eventPointers = this.globalCache.eventPointers.slice();
      this.actionPointers = this.globalCache.actionPointers.slice();

      this.stack.basePointer = this.globalCache.stack.basePointer;
      this.stack.pointer = this.globalCache.stack.pointer;
      this.stack.stack = this.globalCache.stack.stack.slice();
      
      this.runScript({
        instr: this.globalCache.instr,
        seek: null,
        onComplete: this.onComplete
      });
    }else{
      this.runScript({
        instr: this.instructions.values().next().value,
        seek: null,
        onComplete: this.onComplete
      });
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

  getInstrAtOffset( offset ){
    return this.instructions.get(offset);
  }

  parseIntr( reader ) {

    let _pos = reader.position;// - 13;

    let instr = new NWScriptInstruction({
      code: reader.ReadByte(),
      type: reader.ReadByte(),
      address: _pos,
      prevInstr: ( this._lastOffset > 0 ? this.instructions.get(this._lastOffset) : null ),
      eof: false,
      isArg: false,
      index: this.instrIdx++
    });

    //If we already have parsed an instruction set the property of nextInstr on the previous instruction to the current one
    if(this._lastOffset > 0){
      this.instructions.get(this._lastOffset).nextInstr = instr;
    }

    //Run the instruction's parse method
    NWScript.ByteCodes[instr.code].parse.call(this, instr, reader);
    
    //this.instructions.push(instr);
    this.instructions.set(instr.address, instr);
    this._lastOffset = instr.address;
  }

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

    while(scope.running){

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

      scope.seek = null;
      //Run the instruction's run method
      await NWScript.ByteCodes[scope.instr.code].run.call(this, scope);
      //await this.runInstr(scope.instr, scope);

    }

    //SCRIPT DONE

    //onScriptEND
    if(this.isDebugging()){
      console.log('onScriptEND', this)
    }else{
      //console.log('onScriptEND', this.name)
    }

    if(typeof scope.onComplete === 'function'){
      scope.onComplete(this.getReturnValue());
    }

    this.subRoutines = [];
    this.objectPointers = [];
    this.stringPointers = [];
    this.integerPointers = [];
    this.floatPointers = [];
    this.locationPointers = [];
    this.effectPointers = [];
    this.eventPointers = [];
    this.actionPointers = [];
    this.talentPointers = [];
    this.stack = undefined;
    this.state = [];

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

  executeScript(script, args, onComplete){
    
    script.lastPerceived = this.lastPerceived;
    script.debug = this.debug;

    script.debugging = this.debugging;
    script.listenPatternNumber = this.listenPatternNumber;
    script.listenPatternSpeaker = this.listenPatternSpeaker;
    script.run(
      args[1],
      args[2],
      (val) => {
        
        if(typeof onComplete == 'function')
          onComplete(val);

      }
    )

  }

  verifyNCS (reader){
    reader.Seek(0);
    if(this.verified || reader.ReadChars(8) == 'NCS V1.0')
      return this.verified = true;

    return false;
  }

  locationCompare(loc1, loc2){
    return loc1.position.x == loc2.position.x && loc1.position.y == loc2.position.y && loc1.position.z == loc2.position.z && loc1.facing == loc2.facing;
  }

  pushVectorToStack(vector){
    //Push Z to the stack
    this.stack.push(vector.z, NWScript.DATATYPE.FLOAT);
    //Push Y to the stack
    this.stack.push(vector.y, NWScript.DATATYPE.FLOAT);
    //Push X to the stack
    this.stack.push(vector.x, NWScript.DATATYPE.FLOAT);
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

}

NWScript.ByteCodesEnum = {
  'CPDOWNSP':       1,
  'RSADD':          2, //Reserve Space On Stack
  'CPTOPSP':        3,
  'CONST':          4, //Constant Type is declared by the next byte x03, x04, x05, x06
  'ACTION':         5,
  'LOGANDII':       6,
  'LOGORII':        7,
  'INCORII':        8,
  'EXCORII':        9,
  'BOOLANDII':      10,
  'EQUAL':          11, //Constant Type is declared by the next byte x03, x04, x05, x06
  'NEQUAL':         12, //Constant Type is declared by the next byte x03, x04, x05, x06
  'GEQ':            13, //Constant Type is declared by the next byte x03, x04
  'GT':             14, //Constant Type is declared by the next byte x03, x04
  'LT':             15, //Constant Type is declared by the next byte x03, x04
  'LEQ':            16, //Constant Type is declared by the next byte x03, x04
  'SHLEFTII':       17,
  'SHRIGHTII':      18,
  'USHRIGHTII':     19,
  'ADD':            20,
  'SUB':            21,
  'MUL':            22,
  'DIV':            23,
  'MOD':            24,
  'NEG':            25,
  'COMPI':          26,
  'MOVSP':          27,
  'STORE_STATEALL': 28,
  'JMP':            29,
  'JSR':            30,
  'JZ':             31,
  'RETN':           32,
  'DESTRUCT':       33,
  'NOTI':           34,
  'DECISP':         35,
  'INCISP':         36,
  'JNZ':            37,
  'CPDOWNBP':       38,
  'CPTOPBP':        39,
  'DECIBP':         40,
  'INCIBP':         41,
  'SAVEBP':         42,
  'RESTOREBP':      43,
  'STORE_STATE':    44,
  'NOP':            45,
  'T':              46,
};

Object.freeze(NWScript.ByteCodesEnum);

NWScript.ByteCodes = {
  1 : { 
    name: 'CPDOWNSP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.pointer)
        console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.getAtPointer(scope.instr.offset), this.stack.peek());
      }

      this.stack.replace(scope.instr.offset, this.stack.peek());
      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.getAtPointer(scope.instr.offset), this.stack.peek());
      }
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
      instr.size = reader.ReadUInt16();
    }
  },
  2 : { 
    name: 'RSADD', 
    run: function( scope = {} ){

      switch(scope.instr.type){
        case 3:
          this.stack.push(0, NWScript.DATATYPE.INTEGER);
        break;
        case 4:
          this.stack.push(0.0, NWScript.DATATYPE.FLOAT);
        break;
        case 5:
          this.stack.push('', NWScript.DATATYPE.STRING);
        break;
        case 6:
          this.stack.push(undefined, NWScript.DATATYPE.OBJECT);
        break;
        case 16:
        case 17:
        case 18:
        case 19:
          this.stack.push(0, NWScript.DATATYPE.INTEGER);
        break;
        default:
          console.log(scope.instr);
          throw 'unknown type '+scope.instr.type;
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Reserve Space On Stack
  3 : { 
    name: 'CPTOPSP', 
    run: function( scope = {} ){
      var var1 = this.stack.getAtPointer( scope.instr.pointer );
      try{
        this.stack.push( var1.value, var1.type );
      }catch(e){
        //console.error(e);
        //console.log(var1, scope, this);
      }
    }, 
    parse: function( instr, reader ){
      instr.pointer = reader.ReadUInt32();
      instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
      instr.data = null;
    }
  },
  4 : { 
    name: 'CONST', 
    run: function( scope = {} ){
      switch(scope.instr.type){
        case 3:
          this.stack.push(scope.instr.integer, NWScript.DATATYPE.INTEGER);
        break;
        case 4:
          this.stack.push(scope.instr.float, NWScript.DATATYPE.FLOAT);
        break;
        case 5:
          this.stack.push(scope.instr.string, NWScript.DATATYPE.STRING);
        break;
        case 6:
          if(scope.instr.object == 0){
            this.stack.push(this.caller, NWScript.DATATYPE.OBJECT);
          }else{
            this.stack.push(undefined, NWScript.DATATYPE.OBJECT);
          }
        break;
        case 12:
          this.stack.push(scope.instr.string, NWScript.DATATYPE.LOCATION);
        break;
      }
    }, 
    parse: function( instr, reader ){
      switch(instr.type){
        case 3:
          instr.integer = parseInt(reader.ReadUInt32());
        break;
        case 4:
          instr.float = parseFloat(reader.ReadSingle());
        break;
        case 5:
          instr.strLen = reader.ReadUInt16();
          instr.string = reader.ReadChars(instr.strLen);
        break;
        case 6:
          instr.object = reader.ReadUInt32();
        break;
      }
    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  5 : { 
    name: 'ACTION', 
    run: async function( scope = {} ){
      let action = this.Definition.Actions[scope.instr.action];

      let args = [];

      for(let i = 0; i < action.args.length; i++){
        switch(action.args[i]){
          case 'object':
            args.push(
              this.stack.pop().value
            )
          break;
          case 'string':
            args.push(
              this.stack.pop().value
            )
          break;
          case 'int':
            args.push(
              this.stack.pop().value
            )
          break;
          case 'float':
            args.push(
              this.stack.pop().value
            )
          break;
          case 'effect':
            args.push(
              this.stack.pop().value
            )
          break;
          case 'action':
            args.push(
              this.state.pop()
            )
          break;
          case 'event':
            args.push(
              this.stack.pop().value
            )
          break;
          case 'location':
            args.push(
              this.stack.pop().value
            )
          break;
          case 'vector':
            args.push({
              x: this.stack.pop().value,
              y: this.stack.pop().value,
              z: this.stack.pop().value
            })
          break;
          case 'talent':
            args.push(
              this.stack.pop().value
            );
          break;
          default:
            //Pop the function variables off the stack after we are done with them
            args.push(this.stack.pop().value);
            console.log('UKNOWN ARG', action, args);
          break;
        }
        
      }

      let actionValue = undefined;

      if(this.isDebugging('action')){
        //console.log('action', action.name, args);
      }

      if(typeof action.action === 'function'){
        actionValue = await action.action.call(this, args, scope.instr, action);
      }else{
        console.warn('NWScript Action '+action.name+' not found', action);
      }

      if(action.type != NWScript.DATATYPE.VOID && action.type != NWScript.DATATYPE.VECTOR){
        if(actionValue == undefined && action.type != NWScript.DATATYPE.OBJECT){
          //console.warn('undefined value', action, args, this.name, scope.instr);
        }

        if(actionValue != undefined || action.type == NWScript.DATATYPE.OBJECT){
          this.stack.push( actionValue, action.type );
        }
      }

      /*if(actionValue != undefined){
        this.stack.push((returnObject.value));
      }else if(action.type != 'void' && action.type != 'vector'){
        //console.log(action, args, this);
        this.stack.push((0));
        //console.error('Action '+action.name+' didn\'t return a value');
      }*/
    }, 
    parse: function( instr, reader ){
      instr.action = reader.ReadUInt16();
      instr.argCount = reader.ReadByte();
    }
  },
  6 : { 
    name: 'LOGANDII', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      if(var1 && var2)
        this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
      else
        this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  7 : { 
    name: 'LOGORII', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      if(var1 || var2)
        this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
      else
        this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  8 : { 
    name: 'INCORII', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      if( (var1 && var2) || (var1 || var2) )
        this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
      else
        this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  9 : { 
    name: 'EXCORII', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      if( ( var1 && !var2 ) || ( !var1 && var2 ) )
        this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
      else
        this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  10 : { 
    name: 'BOOLANDII', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      if(var1 && var2)
        this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
      else
        this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  11 : { 
    name: 'EQUAL', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(var1 == var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(var1 == var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'OO':
          if(var1 == var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'SS':
          if(var1.toLowerCase() == var2.toLowerCase())
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'LOCLOC':
          if(this.locationCompare(var1, var2)){
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          }else{
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//TRUE
          }
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  12 : { 
    name: 'NEQUAL', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(var1 != var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(var1 != var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'OO':
          if(var1 != var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'SS':
          if(var1.toLowerCase() != var2.toLowerCase())
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'LOCLOC':
          if(!this.locationCompare(var1, var2)){
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          }else{
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//TRUE
          }
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  13 : { 
    name: 'GEQ', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(var1 >= var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(var1 >= var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  14 : { 
    name: 'GT', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(var1 > var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(var1 > var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  15 : { 
    name: 'LT', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(var1 < var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(var1 < var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  16 : { 
    name: 'LEQ', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(var1 <= var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(var1 <= var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  17 : { 
    name: 'SHLEFTII', 
    run: function( scope = {} ){

    }, 
    parse: function( instr, reader ){

    }
  },
  18 : { 
    name: 'SHRIGHTII', 
    run: function( scope = {} ){

    }, 
    parse: function( instr, reader ){

    }
  },
  19 : { 
    name: 'USHRIGHTII', 
    run: function( scope = {} ){

    }, 
    parse: function( instr, reader ){

    }
  },
  20 : { 
    name: 'ADD', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop().value);
      var var1 = (this.stack.pop().value);

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( var1 + var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( var1 + var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( var1 + var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( var1 + var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'SS':
          this.stack.push( var1 + var2, NWScript.DATATYPE.STRING );
        break;
        case 'VV':
          var var3 = this.stack.pop().value;
          this.stack.push( var1 + this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( var2 + this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( var3 + this.stack.pop().value, NWScript.DATATYPE.FLOAT );
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  21 : { 
    name: 'SUB', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( var1 - var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( var1 - var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( var1 - var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( var1 - var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VV':
          var var3 = this.stack.pop().value;
          this.stack.push( var1 - this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( var2 - this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( var3 - this.stack.pop().value, NWScript.DATATYPE.FLOAT );
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  22 : { 
    name: 'MUL', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( var1 * var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( var1 * var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( var1 * var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( var1 * var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VF':
          this.stack.push( var1 * var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( this.stack.pop().value * var2, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( this.stack.pop().value * var2, NWScript.DATATYPE.FLOAT ); //X
        break;
        case 'FV':
          this.stack.push( var1 * var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( var1 * this.stack.pop().value, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( var1 * this.stack.pop().value, NWScript.DATATYPE.FLOAT ); //X
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  23 : { 
    name: 'DIV', 
    run: function( scope = {} ){

      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( var1 / var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( var1 / var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( var1 / var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( var1 / var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VF':
          this.stack.push( var1 / var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( this.stack.pop().value / var2, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( this.stack.pop().value / var2, NWScript.DATATYPE.FLOAT ); //X
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  24 : { 
    name: 'MOD', 
    run: function( scope = {} ){
      var var2 = this.stack.pop().value;
      var var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( var1%var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( var1%var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( var1%var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( var1%var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VF':
          this.stack.push( var1 % var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( this.stack.pop().value % var2, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( this.stack.pop().value % var2, NWScript.DATATYPE.FLOAT ); //X
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  25 : { 
    name: 'NEG', 
    run: function( scope = {} ){
      switch(NWScript.Types[scope.instr.type]){
        case 'I':
          this.stack.push( -this.stack.pop().value, NWScript.DATATYPE.INTEGER );
        break;
        case 'F':
          this.stack.push( -this.stack.pop().value, NWScript.DATATYPE.FLOAT );
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  26 : { 
    name: 'COMPI', 
    run: function( scope = {} ){
      throw 'Unsupported code: COMPI';
    }, 
    parse: function( instr, reader ){

    }
  },
  27 : { 
    name: 'MOVSP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'MOVSP', this.stack.pointer)
        console.log('NWScript: '+this.name, 'MOVSP', this.stack.getAtPointer(scope.instr.offset), this.stack.getPointer());
      }

      //this.stack.setPointer(scope.instr.offset);
      if(this.isDebugging()){
        console.log('MOVSP', this.stack.pointer, this.stack.length, scope.instr.offset, Math.abs(scope.instr.offset)/4);
      }

      for(let i = 0, len = (Math.abs(scope.instr.offset)/4); i < len; i++){
        this.stack.stack.splice((this.stack.pointer -= 4) / 4, 1)[0];
      }
      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'MOVSP', this.stack.getAtPointer(scope.instr.offset), this.stack.getPointer());
      }
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
    }
  },
  28 : { 
    name: 'STORE_STATEALL', 
    run: function( scope = {} ){
      //OBSOLETE NOT SURE IF USED IN KOTOR
    }, 
    parse: function( instr, reader ){

    }
  },
  29 : { 
    name: 'JMP', 
    run: function( scope = {} ){
      scope.seek = scope.instr.address + scope.instr.offset;
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
    }
  },
  30 : { 
    name: 'JSR', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'JSR');
      }
      let pos = scope.instr.address;
      scope.seek = pos + scope.instr.offset;
      this.subRoutines.push(scope.instr.nextInstr.address); //Where to return to after the subRoutine is done

      if(this.subRoutines.length > 1000)
        throw 'JSR seems to be looping endlessly';
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
    }
  },
  31 : { 
    name: 'JZ', 
    run: function( scope = {} ){
      let popped = this.stack.pop().value;
      if(popped == 0){
        scope.seek = scope.instr.address + scope.instr.offset;
      }
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
    }
  },
  32 : { 
    name: 'RETN', 
    run: function( scope = {} ){
      
      if(this.subRoutines.length){
        let _subRout = this.subRoutines.pop();
        if(_subRout == -1){
          if(this.isDebugging()){
            console.error('RETN');
          }
          scope.seek = null;
          scope.instr.eof = true;
        }else{
          if(this.isDebugging()){
            console.log('NWScript: '+this.name, 'RETN', _subRout, this.subRoutines.length);
          }
          scope.seek = _subRout; //Resume the code just after our pervious jump
          if(!scope.seek){
            if(this.isDebugging()){
              console.log('NWScript: seek '+this.name, scope.seek, 'RETN');
            }
          }
        }
      }else{
        if(this.isDebugging()){
          console.log('NWScript: '+this.name, 'RETN', 'END')
        }
        let _subRout = this.subRoutines.pop();
        //scope.seek = _subRout;
        scope.instr.eof = true;
        scope.running = false;
        if(this.isDebugging()){
          console.log('NWScript: '+this.name, scope.instr)
        }
      }
    }, 
    parse: function( instr, reader ){
      if(!this.eofFound){
        instr.eof = true;
        this.eofFound = true;
      }
    }
  },
  33 : { 
    name: 'DESTRUCT', 
    run: function( scope = {} ){
      // sizeOfElementToSave
      // sizeToDestroy
      // offsetToSaveElement

      let destroyed = [];
      for(let i = 0, len = (Math.abs(scope.instr.sizeToDestroy)/4); i < len; i++){
        destroyed.push(this.stack.stack.splice((this.stack.pointer -= 4) / 4, 1)[0]);
      }

      let saved = destroyed[scope.instr.offsetToSaveElement/scope.instr.sizeOfElementToSave];
      this.stack.push( saved.value, saved.type );

      //console.log('DESTRUCT', destroyed, saved);
    }, 
    parse: function( instr, reader ){
      instr.sizeToDestroy = reader.ReadInt16();
      instr.offsetToSaveElement = reader.ReadInt16();
      instr.sizeOfElementToSave = reader.ReadInt16();
    }
  },
  34 : { 
    name: 'NOTI', 
    run: function( scope = {} ){
      if(!this.stack.pop().value)
        this.stack.push(NWScript.TRUE, NWScript.DATATYPE.INTEGER);//TRUE
      else
        this.stack.push(NWScript.FALSE, NWScript.DATATYPE.INTEGER)//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  35 : { 
    name: 'DECISP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'DECISP', this.stack.getAtPointer( scope.instr.offset));
      }
      var var1 = (this.stack.getAtPointer( scope.instr.offset));
      var1.value -= 1;
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadInt32();
    }
  },
  36 : { 
    name: 'INCISP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'INCISP', this.stack.getAtPointer( scope.instr.offset));
      }
      var var1 = (this.stack.getAtPointer( scope.instr.offset));
      var1.value += 1;
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadInt32();
    }
  },
  37 : { 
    name: 'JNZ', //I believe this is used in SWITCH statements
    run: function( scope = {} ){
      let jnzTOS = this.stack.pop().value
      if(this.isDebugging()){
        console.log('JNZ', jnzTOS, scope.instr.address + scope.instr.offset);
      }
      if(jnzTOS != 0){
        scope.seek = scope.instr.address + scope.instr.offset;
      }
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadInt32();
    }
  },
  38 : { 
    name: 'CPDOWNBP', 
    run: function( scope = {} ){
      this.stack.replaceBP(scope.instr.offset, this.stack.peek());
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
      instr.size = reader.ReadUInt16();
    }
  },
  39 : { 
    name: 'CPTOPBP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'CPTOPBP', scope.instr);
      }
      let stackBaseEle = this.stack.getAtBasePointer( scope.instr.pointer );
      this.stack.push( stackBaseEle );
    }, 
    parse: function( instr, reader ){
      instr.pointer = reader.ReadUInt32();
      instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
      instr.data = null;
    }
  },
  40 : { 
    name: 'DECIBP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'DECIBP', this.stack.getAtBasePointer( scope.instr.offset));
      }
      var var1 = (this.stack.getAtBasePointer( scope.instr.offset));
      var1.value -= 1;
    }, 
    parse: function( instr, reader ){

    }
  },
  41 : { 
    name: 'INCIBP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'INCIBP', this.stack.getAtBasePointer( scope.instr.offset));
      }
      var var1 = (this.stack.getAtBasePointer( scope.instr.offset));
      var1.value += 1;
    }, 
    parse: function( instr, reader ){

    }
  },
  42 : { 
    name: 'SAVEBP', 
    run: function( scope = {} ){
      this.stack.saveBP();
      this.currentBlock = 'global';

      /*this.globalCache = {
        scope.instr: scope.instr.nextInstr,
        caller: this.caller,
        enteringObject: this.enteringObject,
        subRoutines: this.subRoutines.slice(),
        objectPointers: this.objectPointers.slice(),
        stringPointers: this.stringPointers.slice(),
        integerPointers: this.integerPointers.slice(),
        floatPointers: this.floatPointers.slice(),
        locationPointers: this.locationPointers.slice(),
        effectPointers: this.effectPointers.slice(),
        eventPointers: this.eventPointers.slice(),
        actionPointers: this.actionPointers.slice(),
        stack: {
          basePointer: this.stack.basePointer,
          pointer: this.stack.pointer,
          stack: this.stack.stack.slice()
        }
      };*/
    }, 
    parse: function( instr, reader ){

    }
  },
  43 : { 
    name: 'RESTOREBP', 
    run: function( scope = {} ){
      this.stack.restoreBP();
    }, 
    parse: function( instr, reader ){

    }
  },
  44 : { 
    name: 'STORE_STATE', 
    run: function( scope = {} ){

      let state = {
        offset: scope.instr.nextInstr.nextInstr.address,
        base: [],//this.stack.stack.slice(0, (instr.bpOffset/4)),
        local: [],//this.stack.stack.slice(this.stack.stack.length-(instr.spOffset/4), this.stack.stack.length)
        instr: scope.instr
      };

      //console.log('STORE_STATE', this.stack.stack.length, this.stack.basePointer);

      state.script = new NWScript();
      state.script.name = this.name;
      state.script.prevByteCode = 0;
      state.script.Definition = this.Definition;
      state.script.instructions = this.instructions;//.slice();
      state.script.subRoutines = [];
      state.script.objectPointers = this.objectPointers.slice();
      state.script.stringPointers = this.stringPointers.slice();
      state.script.integerPointers = this.integerPointers.slice();
      state.script.floatPointers = this.floatPointers.slice();
      state.script.locationPointers = this.locationPointers.slice();
      state.script.effectPointers = this.effectPointers.slice();
      state.script.eventPointers = this.eventPointers.slice();
      state.script.actionPointers = this.actionPointers.slice();
      state.script.talentPointers = this.talentPointers.slice();
      state.script.stack = new NWScriptStack();

      state.script.stack.stack = this.stack.stack.slice();
      state.script.stack.basePointer = this.stack.basePointer;
      state.script.stack.pointer = this.stack.pointer;
      state.script.caller = this.caller;
      state.script.enteringObject = this.enteringObject;
      state.script.listenPatternNumber = this.listenPatternNumber;
      state.script.listenPatternSpeaker = this.listenPatternSpeaker;
      this.state.push(state);
      state.script.state = this.state.slice();
    }, 
    parse: function( instr, reader ){
      instr.bpOffset = reader.ReadUInt32();
      instr.spOffset = reader.ReadUInt32();
    }
  },
  45 : { 
    name: 'NOP', 
    run: function( scope = {} ){

    }, 
    parse: function( instr, reader ){

    }
  },
  46 : { 
    name: 'T', 
    run: function( scope = {} ){

    }, 
    parse: function( instr, reader ){
      reader.position -= 2; //We need to go back 2bytes because this instruction
      //doesn't have a int16 type arg. We then need to read the 4Byte Int32 size arg
      instr.size = reader.ReadInt32();
    }
  },

  getKeyByValue: function( value ) {
      for( let prop in NWScript.ByteCodes ) {
          if( NWScript.ByteCodes.hasOwnProperty( prop ) ) {
                if( NWScript.ByteCodes[ prop ] === value )
                    return prop;
          }
      }
  }
}

NWScript.DATATYPE = {
  VOID: 0x00,
  INTEGER: 0x03,
  FLOAT: 0x04,
  STRING: 0x05,
  OBJECT: 0x06,

  EFFECT: 0x10,
  EVENT: 0x11,
  LOCATION: 0x12,
  TALENT: 0x13,
  VECTOR: 0x14,
}

NWScript.Types = {
  3: 'I',
  4: 'F',
  5: 'S',
  6: 'O',
  12: 'LOC',
  16: 'Effect',
  17: 'Event',
  18: 'Location',
  19: 'Talent',

  32: 'II',
  33: 'FF',
  34: 'OO',
  35: 'SS',
  36: 'TT',
  37: 'IF',
  38: 'FI',

  48: 'EFEF', //Effect Effect
  49: 'EVEV', //Event Event
  50: 'LOCLOC', //Location Location
  51: 'TALTAL', //TALENT TALENT

  58: 'VV',
  59: 'VF',
  60: 'FV',

}

NWScript.TRUE = 1;
NWScript.FALSE = 0;

class NWScriptEffect {
  constructor(args={}){
    const {name, value} = args;
    this.name = name;
    this.value = value;
  }
}

class NWScriptEvent {
  constructor(args={}){
    const {name, value} = args;
    this.name = name;
    this.value = value;
  }
}

module.exports = { NWScript: NWScript, NWScriptEffect: NWScriptEffect, NWScriptEvent: NWScriptEvent };