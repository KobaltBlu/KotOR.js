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

  verifyNCS (reader){
    reader.Seek(0);
    if(this.verified || reader.ReadChars(8) == 'NCS V1.0')
      return this.verified = true;

    return false;
  }

  init (data = null, progSize = null){

    
    if(this.isDebugging()){
      console.log('NWScript: '+this.name, 'NWScript', 'Run');
    }

    this.prevByteCode = 0;
    this.instructions = new Map();
    let reader = new BinaryReader(data);
    reader.endians = BinaryReader.Endians.BIG;

    this.eofFound = false;

    if(!progSize){
      reader.Skip(8);
      this.prog = reader.ReadByte();
      this.progSize = reader.ReadUInt32(); //This includes the initial 8Bytes of the NCS V1.0 header and the previous byte
      
      //Store a binary code of the code for exporting ScriptSituations
      this.code = data.slice( 13, this.progSize );
      this.progSize = this.code.length;
      
      reader = new BinaryReader(this.code);
      reader.endians = BinaryReader.Endians.BIG;
    }else{
       //Store a binary code of the code for exporting ScriptSituations
      this.code = data;
      this.progSize = progSize;
    }

    //PASS 1: Create a listing of all of the instructions in order as they occur
    
    if(this.isDebugging()){
      console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Started');
    }

    this._lastOffset = -1;
    while ( reader.position < this.progSize ){
      this.parseIntr(reader);
    };
    
    if(this.isDebugging()){
      console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Complete');
    }
    reader.position = 0;

  }

  parseIntr( reader ) {

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
      return Game.Flags.LogScripts || this.debugging || this.debug[type];
    }else{
      return Game.Flags.LogScripts || this.debugging;
    }
  }

  //newInstance
  //When loading a new script always return a NWScriptInstance which will share large data from the parent NWScript
  //like the instruction array, but will have it's own NWScriptStack
  //This whould reduse memory overhead because only one instance of the large data is created per script
  newInstance(scope = undefined){

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
    return new Promise( ( resolve, reject ) => {
      if( NWScript.scripts.has( scriptName ) ){
        let script = NWScript.scripts.get( scriptName );

        //Create a new instance of the script and return it
        resolve( script.newInstance() );
      }else{
        if(scriptName){
          //Fetch the script from the game resource list
          ResourceLoader.loadResource(ResourceTypes['ncs'], scriptName, ( buffer ) => {
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

  disposeInstance( instance = undefined ){
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

}

//Holds references the the NWScripts that are stored in memory
NWScript.scripts = new Map();

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

      //this.stack.replace(scope.instr.offset, this.stack.peek());
      
      //Calculate the number of stack elements that are going to be copied down
      let count = scope.instr.size / 4;
      for(let i = 0; i < count; i++){
        //Replace the target stack element with the appropriate element relative to the top of the stack
        this.stack.replace(scope.instr.offset + (4 * i), this.stack.peek(4 * i));
      }
      
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
          this.stack.push(undefined, NWScript.DATATYPE.EFFECT);
        break;
        case 17:
          this.stack.push(undefined, NWScript.DATATYPE.EVENT);
        break;
        case 18:
          this.stack.push(undefined, NWScript.DATATYPE.LOCATION);
        break;
        case 19:
          this.stack.push(undefined, NWScript.DATATYPE.TALENT);
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
      let tmp_values = [];
      //Calculate the number of stack elements that are going to be copied to the top of the stack
      let count = scope.instr.size / 4;
      for(let i = 0; i < count; i++){
        tmp_values.push(
          this.stack.getAtPointer( scope.instr.pointer + (4 * i) )
        );
      }     
      
      for(let i = 0; i < tmp_values.length; i++){
        this.stack.push(tmp_values[i].value, tmp_values[i].type);
      }

      //this.var1 = this.stack.getAtPointer( scope.instr.pointer );
      //this.stack.push( this.var1.value, this.var1.type );
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
        default:
          console.warning('CONST', scope.instr.type, scope.instr);
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

      let action = undefined;//NWScript.Definition.Actions[scope.instr.action];
      if(GameKey == 'TSL'){
        action = NWScriptDefK2.Actions[scope.instr.action];
      }else{
        action = NWScriptDefK1.Actions[scope.instr.action];
      }

      let args = [];

      for(let i = 0, len = action.args.length; i < len; i++){
        switch(action.args[i]){
          case 'object':
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
            console.warn('UKNOWN ARG', action, args);
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

      if(action.type != NWScript.DATATYPE.VOID){
        this.stack.push( actionValue, action.type );
      }

    }, 
    parse: function( instr, reader ){
      instr.action = reader.ReadUInt16();
      instr.argCount = reader.ReadByte();
    }
  },
  6 : { 
    name: 'LOGANDII', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      if(this.var1 && this.var2)
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
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      if(this.var1 || this.var2)
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
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      this.stack.push( this.var1 | this.var2, NWScript.DATATYPE.INTEGER );
    }, 
    parse: function( instr, reader ){

    }
  },
  9 : { 
    name: 'EXCORII', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;
      this.stack.push( this.var1 ^ this.var2, NWScript.DATATYPE.INTEGER );
    }, 
    parse: function( instr, reader ){

    }
  },
  10 : { 
    name: 'BOOLANDII', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      this.stack.push( this.var1 & this.var2, NWScript.DATATYPE.INTEGER );
    }, 
    parse: function( instr, reader ){

    }
  },
  11 : { 
    name: 'EQUAL', 
    run: function( scope = {} ){
      if(scope.instr.type == NWScript.DATATYPE.STRUCTURE){
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

        console.log('EQUALTT', struct1, struct2);

        let areStructuresEqual = true;
        //Check for equality between the structures variables
        for(let i = 0; i < count; i++){
          if(this.struct1[i] != this.struct2[i]){
            areStructuresEqual = false;
          }
        }

        if(areStructuresEqual)
          this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
        else
          this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE

      }else{
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;

        switch(NWScript.Types[scope.instr.type]){
          case 'II':
            if(this.var1 == this.var2)
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'FF':
            if(this.var1 == this.var2)
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'OO':
            if(this.var1 == this.var2)
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'SS':
            if(this.var1.toLowerCase() == this.var2.toLowerCase())
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'LOCLOC':
            if(this.locationCompare(this.var1, this.var2)){
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            }else{
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//TRUE
            }
          break;
          default:
            console.warn('EQUAL: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
          break;
        }
      }
    }, 
    parse: function( instr, reader ){
      if(instr.type == NWScript.DATATYPE.STRUCTURE){
        instr.sizeOfStructure = parseInt(reader.ReadUInt16());
      }
    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  12 : { 
    name: 'NEQUAL', 
    run: function( scope = {} ){
      if(scope.instr.type == NWScript.DATATYPE.STRUCTURE){
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

        console.log('NEQUALTT', struct1, struct2);

        let areStructuresNEqual = false;
        //Check for non equality between the structures variables
        for(let i = 0; i < count; i++){
          if(this.struct1[i] != this.struct2[i]){
            areStructuresEqual = true;
          }
        }

        if(areStructuresNEqual)
          this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
        else
          this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE

      }else{
        this.var2 = this.stack.pop().value;
        this.var1 = this.stack.pop().value;

        switch(NWScript.Types[scope.instr.type]){
          case 'II':
            if(this.var1 != this.var2)
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'FF':
            if(this.var1 != this.var2)
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'OO':
            if(this.var1 != this.var2)
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'SS':
            if(this.var1.toLowerCase() != this.var2.toLowerCase())
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            else
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
          break;
          case 'LOCLOC':
            if(!this.locationCompare(this.var1, this.var2)){
              this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
            }else{
              this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//TRUE
            }
          break;
          default:
            console.warn('NEQUAL: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
          break;
        }
      }
    }, 
    parse: function( instr, reader ){
      if(instr.type == NWScript.DATATYPE.STRUCTURE){
        instr.sizeOfStructure = parseInt(reader.ReadUInt16());
      }
    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  13 : { 
    name: 'GEQ', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(this.var1 >= this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(this.var1 >= this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        default:
          console.warn('GEQ: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  14 : { 
    name: 'GT', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(this.var1 > this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(this.var1 > this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        default:
          console.warn('GT: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  15 : { 
    name: 'LT', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(this.var1 < this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(this.var1 < this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        default:
          console.warn('LT: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  16 : { 
    name: 'LEQ', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          if(this.var1 <= this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        case 'FF':
          if(this.var1 <= this.var2)
            this.stack.push( NWScript.TRUE, NWScript.DATATYPE.INTEGER )//TRUE
          else
            this.stack.push( NWScript.FALSE, NWScript.DATATYPE.INTEGER )//FALSE
        break;
        default:
          console.warn('LEQ: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
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
      this.var2 = (this.stack.pop().value);
      this.var1 = (this.stack.pop().value);

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( this.var1 + this.var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( this.var1 + this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( this.var1 + this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( this.var1 + this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'SS':
          this.stack.push( this.var1 + this.var2, NWScript.DATATYPE.STRING );
        break;
        case 'VV':
          this.var3 = this.stack.pop().value;
          this.stack.push( this.var1 + this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( this.var2 + this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( this.var3 + this.stack.pop().value, NWScript.DATATYPE.FLOAT );
        break;
        default:
          console.warn('ADD: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  21 : { 
    name: 'SUB', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( this.var1 - this.var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( this.var1 - this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( this.var1 - this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( this.var1 - this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VV':
          this.var3 = this.stack.pop().value;
          this.stack.push( this.var1 - this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( this.var2 - this.stack.pop().value, NWScript.DATATYPE.FLOAT );
          this.stack.push( this.var3 - this.stack.pop().value, NWScript.DATATYPE.FLOAT );
        break;
        default:
          console.warn('SUB: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  22 : { 
    name: 'MUL', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( this.var1 * this.var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( this.var1 * this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( this.var1 * this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( this.var1 * this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VF':
          this.stack.push( this.var1 * this.var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( this.stack.pop().value * this.var2, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( this.stack.pop().value * this.var2, NWScript.DATATYPE.FLOAT ); //X
        break;
        case 'FV':
          this.stack.push( this.var1 * this.var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( this.var1 * this.stack.pop().value, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( this.var1 * this.stack.pop().value, NWScript.DATATYPE.FLOAT ); //X
        break;
        default:
          console.warn('MUL: Missing Type', scope.instr.type, NWScript.Types[scope.instr.type]);
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  23 : { 
    name: 'DIV', 
    run: function( scope = {} ){

      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( this.var1 / this.var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( this.var1 / this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( this.var1 / this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( this.var1 / this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VF':
          this.stack.push( this.var1 / this.var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( this.stack.pop().value / this.var2, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( this.stack.pop().value / this.var2, NWScript.DATATYPE.FLOAT ); //X
        break;
      }
    }, 
    parse: function( instr, reader ){

    }
  },
  24 : { 
    name: 'MOD', 
    run: function( scope = {} ){
      this.var2 = this.stack.pop().value;
      this.var1 = this.stack.pop().value;

      switch(NWScript.Types[scope.instr.type]){
        case 'II':
          this.stack.push( this.var1 % this.var2, NWScript.DATATYPE.INTEGER );
        break;
        case 'IF':
          this.stack.push( this.var1 % this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FI':
          this.stack.push( this.var1 % this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'FF':
          this.stack.push( this.var1 % this.var2, NWScript.DATATYPE.FLOAT );
        break;
        case 'VF':
          this.stack.push( this.var1 % this.var2, NWScript.DATATYPE.FLOAT ); //Z
          this.stack.push( this.stack.pop().value % this.var2, NWScript.DATATYPE.FLOAT ); //Y
          this.stack.push( this.stack.pop().value % this.var2, NWScript.DATATYPE.FLOAT ); //X
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
      this.subRoutine = new NWScriptSubroutine(scope.instr.nextInstr.address);
      this.subRoutines.push( this.subRoutine ); //Where to return to after the subRoutine is done

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
        let subRoutine = this.subRoutines.pop();
        subRoutine.onEnd();

        this.subRoutine = this.subRoutines[this.subRoutines.length - 1];

        if(subRoutine.returnAddress == -1){
          if(this.isDebugging()){
            console.error('RETN');
          }
          scope.seek = null;
          scope.instr.eof = true;
        }else{
          if(this.isDebugging()){
            console.log('NWScript: '+this.name, 'RETN', subRoutine.returnAddress, this.subRoutines.length);
          }
          scope.seek = subRoutine.returnAddress; //Resume the code just after our pervious jump
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
        //let subRoutine = this.subRoutines.pop();
        //scope.seek = subRoutine.returnAddress;
        this.subRoutine = this.subRoutines[this.subRoutines.length - 1];
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
      this.var1 = (this.stack.getAtPointer( scope.instr.offset));
      this.var1.value -= 1;
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
      this.var1 = (this.stack.getAtPointer( scope.instr.offset));
      this.var1.value += 1;
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
      //this.stack.replaceBP(scope.instr.offset, this.stack.peek());
      //Calculate the number of stack elements that are going to be copied down
      let count = scope.instr.size / 4;
      for(let i = 0; i < count; i++){
        //Replace the target stack element with the appropriate element relative to the top of the stack
        this.stack.replaceBP(scope.instr.offset + (4 * i), this.stack.peek(4 * i));
      }
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
      let tmp_values = [];
      //Calculate the number of stack elements that are going to be copied to the top of the stack
      let count = scope.instr.size / 4;
      for(let i = 0; i < count; i++){
        tmp_values.push(
          this.stack.getAtBasePointer( scope.instr.pointer + (4 * i) )
        );
      }     
      
      for(let i = 0; i < tmp_values.length; i++){
        this.stack.push(tmp_values[i].value, tmp_values[i].type);
      }

      // let stackBaseEle = this.stack.getAtBasePointer( scope.instr.pointer );
      // if(stackBaseEle == null){
      //   let i = 0;
      // }
      // this.stack.push( stackBaseEle );
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
      this.var1 = (this.stack.getAtBasePointer( scope.instr.offset));
      this.var1.value -= 1;
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
    }
  },
  41 : { 
    name: 'INCIBP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'INCIBP', this.stack.getAtBasePointer( scope.instr.offset));
      }
      this.var1 = (this.stack.getAtBasePointer( scope.instr.offset));
      this.var1.value += 1;
    }, 
    parse: function( instr, reader ){
      instr.offset = reader.ReadUInt32();
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
  STRUCTURE: 0x24
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

module.exports = { NWScript: NWScript };