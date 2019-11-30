/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The NWScript class.
 */

class NWScript {

  constructor ( dataOrFile = null, onComplete = null, decompile = true ){

    this._instrIdx = 0;
    this._lastOffset = -1;

    this.subscripts = new Map();

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

    this.delayCommandQueue = [];

    if( dataOrFile != null ) {

      if( typeof dataOrFile === 'string' ){

        fs.readFile(dataOrFile, (err, binary) => {
          this.decompile(binary);
          if(typeof onComplete === 'function')
            onComplete(this);
        });

      }else if ( dataOrFile instanceof Buffer ){
        this.init(dataOrFile);
        if(typeof onComplete === 'function')
            onComplete(this);
      }

    }else{
      //init empty / new nwscript
    }

    this.globalCache = null;

  }

  init (data = null, ctx = null){

    
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

    if(this._VerifyNCS(reader)){

      this.eofFound = false;

      let prog = reader.ReadByte();
      let progSize = reader.ReadUInt32(); //This includes the initial 8Bytes of the NCS V1.0 header and the previous byte

      //PASS 1: Create a listing of all of the instructions in order as the occur
      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Started');
      }
      while ( reader.position < progSize ){
        this._ParseInstruction(reader);
      };
      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Complete');
      }
      reader.position = 0;

    }

    this.delayCommandQueue = [];

  }

  clone(){
    let script = new NWScript();
    script.name = this.name;
    script.Definition = this.Definition;
    script.instructions = new Map(this.instructions);
    return script;
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
      
      this.beginLoop({
        _instr: this.globalCache._instr,
        seek: null,
        onComplete: this.onComplete
      });
    }else{
      this.beginLoop({
        _instr: this.instructions.values().next().value,
        seek: null,
        onComplete: this.onComplete
      });
    }

  }

  beginLoop(data){
    let completed = false;

    let promiseWhile = function(condition, action) {
      let resolver = Promise.defer();
  
      let loop = function() {
        if (!condition()) return resolver.resolve();
        return Promise.cast(action())
          .then(loop)
          .catch(resolver.reject);
      };
  
      loop();
  
      return resolver.promise;
    };

    promiseWhile( () => {
      // Condition for stopping
      return !completed;
    }, () => {
        // Action to run, should return a promise
        return new Promise( (resolve, reject) => {

          if(data._instr)
            this.prevByteCode = data._instr.code;
          
          if( data.seek != null ) {
            let __nextInstr = this._getInstructionAtOffset( data.seek );
            this._RunInstruction(__nextInstr, (newData={}) => {
              this.firstLoop = false;
              let oldCallback = data.onComplete;
              data = newData;
              data.onComplete = oldCallback;
              resolve();   
            });
          }else{
            if(!data._instr.eof){
              if(data._instr.nextInstr != null){
                //If we are not at the last instruction which should be a RETN
                this._RunInstruction(this.firstLoop ? data._instr : data._instr.nextInstr, (newData={}) => {
                  this.firstLoop = false;
                  let oldCallback = data.onComplete;
                  data = newData;
                  data.onComplete = oldCallback;
                  resolve();   
                });
              }
            }else{
              completed = true;
              resolve();
            }
          }
        })
    }).then(() => {
      //onScriptEND
      if(this.isDebugging()){
        console.log('onScriptEND', this)
      }else{
        //console.log('onScriptEND', this.name)
      }

      /*while(this.delayCommandQueue.length){
        var delayCommand = this.delayCommandQueue.pop();
        setTimeout( delayCommand.method, delayCommand.delay);
      }*/

      if(typeof data.onComplete === 'function'){
        data.onComplete(this.getReturnValue());
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

    });

  }

  getReturnValue(){
    //For some reason this is needed for some conditional scripts because the stack pointer is getting set back too far could be a problem with MOVSP?
    if(this.stack.stack[-1] ? true : false){
      let _ret = (this.stack.stack[-1]);
      delete this.stack.stack[-1];
      return this.integerPointers[_ret] ? 1 : 0;
    }else if(this.stack.stack.length){
      let _ret = (this.stack.pop());
      return this.integerPointers[_ret] ? 1 : 0;
    }else{
      return false;
    }
  }

  _ParseInstruction( reader ) {

    let _pos = reader.position - 6;
    
    if(this.isDebugging()){
      //console.log('NWScript: '+this.name, _pos);
    }

    let _instr = new NWScriptInstruction({
      code: reader.ReadByte(),
      type: reader.ReadByte(),
      address: _pos,
      prevInstr: ( this._lastOffset > 0 ? this.instructions.get(this._lastOffset) : null ),
      eof: false,
      isArg: false,
      index: this._instrIdx++
    });

    //If we already have parsed an instruction set the property of nextInstr on the previous instruction to the current one
    if(this._lastOffset > 0){
      this.instructions.get(this._lastOffset).nextInstr = _instr;
    }

    switch(_instr.code){
      case NWScript.ByteCodesEnum.CPDOWNSP:
        _instr.offset = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16();
      break;
      case NWScript.ByteCodesEnum.RSADD:

      break;
      case NWScript.ByteCodesEnum.CPTOPSP:
        _instr.pointer = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
        _instr.data = null;
      break;
      case NWScript.ByteCodesEnum.CONST:
        switch(_instr.type){
          case 3:
            _instr.integer = parseInt(reader.ReadUInt32());
          break;
          case 4:
            _instr.float = parseFloat(reader.ReadSingle());
          break;
          case 5:
            _instr.strLen = reader.ReadUInt16();
            _instr.string = reader.ReadChars(_instr.strLen);
          break;
          case 6:
            _instr.object = reader.ReadUInt32();
          break;
        }
      break;
      case NWScript.ByteCodesEnum.ACTION:
        _instr.action = reader.ReadUInt16();
        _instr.argCount = reader.ReadByte();

        //for(let i = _instr.argCount; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.LOGANDII:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.LOGORII:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.INCORII:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

        break;
      case NWScript.ByteCodesEnum.EXCORII:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.BOOLANDII:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.EQUAL:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

        //If the second arg is reserved on the stack then we need to go back one
        //more instruction to get to the first arg
        //if( this.instructions[this.instructions.length-1].prevInstr.code == 2 )
        //  this.instructions[this.instructions.length-3].isArg = true;

      break;
      case NWScript.ByteCodesEnum.NEQUAL:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.GEQ:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.GT:

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case NWScript.ByteCodesEnum.LT:
        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;
      break;
      case NWScript.ByteCodesEnum.LEQ:
        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;
      break;
      case NWScript.ByteCodesEnum.SHLEFTII:

      break;
      case NWScript.ByteCodesEnum.SHRIGHTII:

      break;
      case NWScript.ByteCodesEnum.USHRIGHTII:

      break;
      case NWScript.ByteCodesEnum.ADD:

      break;
      case NWScript.ByteCodesEnum.SUB:

      break;
      case NWScript.ByteCodesEnum.MUL:

      break;
      case NWScript.ByteCodesEnum.DIV:

      break;
      case NWScript.ByteCodesEnum.MOD:

      break;
      case NWScript.ByteCodesEnum.NEG:

        /*switch(_instr.type){
          case 3:
            _instr.prevInstr.integer = _instr.prevInstr.integer *-1;
          break;
          case 4:
            _instr.prevInstr.float = _instr.prevInstr.float *-1;
          break;
        }*/

      break;
      case NWScript.ByteCodesEnum.COMPI:

      break;
      case NWScript.ByteCodesEnum.MOVSP:
        _instr.offset = reader.ReadUInt32();
      break;
      case NWScript.ByteCodesEnum.STORE_STATEALL:

      break;
      case NWScript.ByteCodesEnum.JMP:
        _instr.offset = reader.ReadUInt32();
      break;
      case NWScript.ByteCodesEnum.JSR:
        _instr.offset = reader.ReadUInt32();
      break;
      case NWScript.ByteCodesEnum.JZ:
        _instr.offset = reader.ReadInt32();
      break;
      case NWScript.ByteCodesEnum.JNZ:
        _instr.offset = reader.ReadInt32();
      break;
      case NWScript.ByteCodesEnum.RETN:
        if(!this.eofFound){
          _instr.eof = true;
          this.eofFound = true;
        }
      break;
      case NWScript.ByteCodesEnum.DESTRUCT:
        
        _instr.sizeToDestroy = reader.ReadInt16();
        _instr.offsetToSaveElement = reader.ReadInt16();
        _instr.sizeOfElementToSave = reader.ReadInt16();
      break;
      case NWScript.ByteCodesEnum.NOTI:

      break;
      case NWScript.ByteCodesEnum.DECISP:
        _instr.offset = reader.ReadInt32();
      break;
      case NWScript.ByteCodesEnum.INCISP:
        _instr.offset = reader.ReadInt32();
      break;
      case NWScript.ByteCodesEnum.CPDOWNBP:
        _instr.offset = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16();
      break;
      case NWScript.ByteCodesEnum.CPTOPBP:
        _instr.pointer = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
        _instr.data = null;
      break;
      case NWScript.ByteCodesEnum.DECIBP:

      break;
      case NWScript.ByteCodesEnum.INCIBP:

      break;
      case NWScript.ByteCodesEnum.SAVEBP:

      break;
      case NWScript.ByteCodesEnum.RESTOREBP:

      break;
      case NWScript.ByteCodesEnum.STORE_STATE:
        _instr.bpOffset = reader.ReadUInt32();
        _instr.spOffset = reader.ReadUInt32();
      break;
      case NWScript.ByteCodesEnum.NOP:

      break;
      case NWScript.ByteCodesEnum.T:
        reader.position -= 2; //We need to go back 2bytes because this instruction
        //doesn't have a int16 type arg. We then need to read the 4Byte Int32 size arg
        _instr.size = reader.ReadInt32();
      break;
    }
    //this.instructions.push(_instr);
    this.instructions.set(_instr.address, _instr);
    this._lastOffset = _instr.address;
  }

  _getInstructionAtOffset( offset ){
    return this.instructions.get(offset);
  }

  _RunInstruction ( _instr, resolve = null ) {
    try{
      //return new Promise( (resolve, reject) => {
      
        if(this.isDebugging()){
          console.log('NWScript: '+this.name,  '_RunInstruction', _instr.index, NWScript.ByteCodes[_instr.code], _instr );
        }

        let seek = null;
        let delay = false;
        let var1, var2, newValue = 0;

        switch(_instr.code){
          case NWScript.ByteCodesEnum.CPDOWNSP:
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.pointer)
              console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.getAtPointer(_instr.offset), this.stack.peek());
            }
            this.stack.replace(_instr.offset, this.stack.peek());
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.getAtPointer(_instr.offset), this.stack.peek());
            }
          break;
          case NWScript.ByteCodesEnum.RSADD:
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'RADD', _instr.address, this.stack.pointer * 4);
            }
            //this.stack.push(0);
            switch(_instr.type){
              case 3:
                this.stack.push(
                  (
                    this.integerPointers.push(0) - 1
                  )
                );
              break;
              case 4:
                this.stack.push(
                  (
                    this.floatPointers.push(0.0) - 1
                  )
                );
              break;
              case 5:
                this.stack.push(
                  (
                    this.stringPointers.push('') - 1
                  )
                );
              break;
              case 6:
                this.stack.push(
                  (
                    this.objectPointers.push(undefined) - 1
                  )
                );
              break;
              case 16:
              case 17:
              case 18:
              case 19:
                this.stack.push(0);
              break;
              default:
                //this.stack.push(0);
              break;
            }
            
          break;
          case NWScript.ByteCodesEnum.CPTOPSP:
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'CPTOPSP', _instr.pointer, this.stack.stack );
            }
            this.stack.push( this.stack.getAtPointer( _instr.pointer ) );
          break;
          case NWScript.ByteCodesEnum.CONST:
            switch(_instr.type){
              case 3:
                let ipIdx = this.integerPointers.push(
                  _instr.integer
                )-1;
                
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, 'ipIdx', ipIdx);
                }
                this.stack.push((ipIdx));
              break;
              case 4:
                this.floatPointers.push(_instr.float);
                let fpIdx = this.floatPointers.length-1;
                
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, 'fpIdx', fpIdx);
                }
                this.stack.push((fpIdx));
              break;
              case 5:
                this.stringPointers.push(_instr.string);
                let spIdx = this.stringPointers.length-1;
                
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, 'spIdx', spIdx);
                }
                this.stack.push((spIdx));
              break;
              case 6:
                this.objectPointers.push(this.objectPointers[_instr.object]); //Default the initialization to OBJECT_SELF?
                let opIdx = this.objectPointers.length-1;
                
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, 'opIdx', opIdx);
                }
                this.stack.push((opIdx));
              break;
              case 12:
                this.locationPointers.push(_instr.string);
                let lpIdx = this.locationPointers.length-1;
                
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, 'lpIdx', lpIdx);
                }
                this.stack.push((lpIdx));
              break;
            }
          break;
          case NWScript.ByteCodesEnum.ACTION:
            
            let action = this.Definition.Actions[_instr.action];

            let args = [];
            let returnObject = {value: undefined, delay: delay};

            for(let i = 0; i < action.args.length; i++){
              switch(action.args[i]){
                case 'object':
                  args.push(
                    this.objectPointers[(this.stack.pop()|0)]
                  )
                break;
                case 'string':
                  args.push(
                    this.stringPointers[(this.stack.pop()|0)]
                  )
                break;
                case 'int':
                  args.push(
                    this.integerPointers[(this.stack.pop()|0)]
                  )
                break;
                case 'float':
                  args.push(
                    this.floatPointers[(this.stack.pop()|0)]
                  )
                break;
                case 'effect':
                  args.push(
                    this.effectPointers[(this.stack.pop()|0)]
                  )
                break;
                case 'action':
                  args.push(
                    this.state.pop()
                  )
                break;
                case 'event':
                  args.push(
                    this.eventPointers[(this.stack.pop()|0)]
                  )
                break;
                case 'location':
                  args.push(
                    this.locationPointers[(this.stack.pop()|0)]
                  )
                break;
                case 'vector':
                  args.push({
                    x: this.floatPointers[(this.stack.pop()|0)],
                    y: this.floatPointers[(this.stack.pop()|0)],
                    z: this.floatPointers[(this.stack.pop()|0)]
                  })
                break;
                case 'talent':
                  args.push(
                    this.talentPointers[(this.stack.pop()|0)]
                  );
                break;
                default:
                  //Pop the function variables off the stack after we are done with them
                  args.push(this.stack.pop());
                  console.log('UKNOWN ARG', action, args);
                break;
              }
              
            }

            /*if(this.isDebugging('action')){
              console.log('NWScript: '+this.name, 'ACTION', action.name, args, action.args, _instr.argCount);
            }*/

            if(typeof action.action === 'function'){
              returnObject = action.action.call(this, args, _instr, seek, resolve, returnObject);
            }/*else if(NWScriptDef.Actions[_instr.action].action === 'function'){
              returnObject = NWScriptDef.Actions[_instr.action].action.call(this, args, _instr, seek, resolve, returnObject);
            }*/else{
              console.warn('NWScript Action '+action.name+' not found', action);
            }

            delay = returnObject.delay;

            if(returnObject.value != undefined){
              this.stack.push((returnObject.value));
            }else if(!delay && action.type != 'void' && action.type != 'vector'){
              //console.log(action, args, this);
              this.stack.push((0));
              //console.error('Action '+action.name+' didn\'t return a value');
            }

          break;
          case NWScript.ByteCodesEnum.LOGANDII:

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'LOGANDII', var2, var1);
            }

            if(this.integerPointers[var1] && this.integerPointers[var2]){
              if(this.isDebugging()){
                console.log('NWScript: '+this.name, 'LOGANDII TRUE', this.integerPointers[var1], this.integerPointers[var2])
              }
              this.stack.push(NWScript.TRUE)//TRUE
            }else{
              if(this.isDebugging()){
                console.log('NWScript: '+this.name, 'LOGANDII FALSE', this.integerPointers[var1], this.integerPointers[var2])
              }
              this.stack.push(NWScript.FALSE)//FALSE
            }

          break;
          case NWScript.ByteCodesEnum.LOGORII:

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'LOGORII', var2, var1);
            }

            if(this.integerPointers[var1] || this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case NWScript.ByteCodesEnum.INCORII:

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'INCORII', var2, var1);
            }

            if(this.integerPointers[var1] || this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case NWScript.ByteCodesEnum.EXCORII:

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'EXCORII', var2, var1);
            }

            if(this.integerPointers[var1] || this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case NWScript.ByteCodesEnum.BOOLANDII:

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'BOOLANDII', var2, var1);
            }

            if(this.integerPointers[var1] && this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case NWScript.ByteCodesEnum.EQUAL:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            switch(NWScript.Types[_instr.type]){
              case 'II':
                if(this.isDebugging() || this.isDebugging('equal')){
                  console.log('NWScript: '+this.name, 'EQUAL', this.integerPointers[var2], this.integerPointers[var1]);
                }
                if(this.integerPointers[var1] == this.integerPointers[var2])
                  this.stack.push((1))//TRUE
                else
                  this.stack.push((0))//FALSE
              break;
              case 'FF':
                if(this.isDebugging() || this.isDebugging('equal')){
                  console.log('NWScript: '+this.name, 'EQUAL', this.floatPointers[var2], this.floatPointers[var1]);
                }
                if(this.floatPointers[var1] == this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'OO':
                if(this.isDebugging() || this.isDebugging('equal')){
                  console.log('NWScript: '+this.name, 'EQUAL', this.objectPointers[var2], this.objectPointers[var1]);
                }
                if(this.objectPointers[var1] == this.objectPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'SS':
                if(this.isDebugging() || this.isDebugging('equal')){
                  console.log('NWScript: '+this.name, 'EQUAL', this.stringPointers[var2], this.stringPointers[var1]);
                }
                if(this.stringPointers[var1].toLowerCase() == this.stringPointers[var2].toLowerCase())
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'LOCLOC':
                if(this.isDebugging() || this.isDebugging('equal')){
                  console.log('NWScript: '+this.name, 'EQUAL', this.locationPointers[var2], this.locationPointers[var1]);
                }
                if(this.locationCompare(this.locationPointers[var1], this.locationPointers[var2])){
                  this.stack.push(NWScript.TRUE)//TRUE
                }else{
                  this.stack.push(NWScript.FALSE)//TRUE
                }
              break;
            }

          break;
          case NWScript.ByteCodesEnum.NEQUAL:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            switch(NWScript.Types[_instr.type]){
              case 'II':
                if(this.isDebugging() || this.isDebugging('nequal')){
                  console.log('NWScript: '+this.name, 'NEQUAL', this.integerPointers[var2], this.integerPointers[var1]);
                }
                if(this.integerPointers[var1] != this.integerPointers[var2])
                  this.stack.push((1))//TRUE
                else
                  this.stack.push((0))//FALSE
              break;
              case 'FF':
                if(this.isDebugging() || this.isDebugging('nequal')){
                  console.log('NWScript: '+this.name, 'NEQUAL', this.floatPointers[var2], this.floatPointers[var1]);
                }
                if(this.floatPointers[var1] != this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'OO':
                if(this.isDebugging() || this.isDebugging('nequal')){
                  console.log('NWScript: '+this.name, 'NEQUAL', this.objectPointers[var2], this.objectPointers[var1]);
                }
                if(this.objectPointers[var1] != this.objectPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'SS':
                if(this.isDebugging() || this.isDebugging('nequal')){
                  console.log('NWScript: '+this.name, 'NEQUAL', this.stringPointers[var2], this.stringPointers[var1]);
                }
                if(this.stringPointers[var1].toLowerCase() != this.stringPointers[var2].toLowerCase())
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'LOCLOC':
                if(this.isDebugging() || this.isDebugging('nequal')){
                  console.log('NWScript: '+this.name, 'NEQUAL', this.locationPointers[var2], this.locationPointers[var1]);
                }
                if(!this.locationCompare(this.locationPointers[var1], this.locationPointers[var2])){
                  this.stack.push(NWScript.TRUE)//TRUE
                }else{
                  this.stack.push(NWScript.FALSE)//TRUE
                }
              break;
            }
          break;
          case NWScript.ByteCodesEnum.GEQ:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            switch(NWScript.Types[_instr.type]){
              case 'II':
                if(this.integerPointers[var1] >= this.integerPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'FF':
                if(this.floatPointers[var1] >= this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
            }
          break;
          case NWScript.ByteCodesEnum.GT:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            switch(NWScript.Types[_instr.type]){
              case 'II':
                
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, this.integerPointers[var1], this.integerPointers[var2]);
                }
                if(this.integerPointers[var1] > this.integerPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'FF':
                if(this.floatPointers[var1] > this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
            }
          break;
          case NWScript.ByteCodesEnum.LT:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            switch(NWScript.Types[_instr.type]){
              case 'II':
                if(this.integerPointers[var1] < this.integerPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'FF':
                if(this.floatPointers[var1] < this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
            }
          break;
          case NWScript.ByteCodesEnum.LEQ:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            switch(NWScript.Types[_instr.type]){
              case 'II':
                if(this.integerPointers[var1] <= this.integerPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'FF':
                if(this.floatPointers[var1] <= this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
            }
          break;
          case NWScript.ByteCodesEnum.SHLEFTII:
            
          break;
          case NWScript.ByteCodesEnum.SHRIGHTII:

          break;
          case NWScript.ByteCodesEnum.USHRIGHTII:

          break;
          case NWScript.ByteCodesEnum.ADD:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            newValue = 0;

            switch(NWScript.Types[_instr.type]){
              case 'II':
                newValue = this.integerPointers[var1]+this.integerPointers[var2];
                this.integerPointers.push(newValue);
                this.stack.push((this.integerPointers.length-1));
              break;
              case 'IF':
                newValue = this.integerPointers[var1]+this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.floatPointers[var1]+this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FF':
                newValue = this.floatPointers[var1]+this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'SS':
                newValue = this.stringPointers[var1]+this.stringPointers[var2];
                this.stack.push(
                  this.stringPointers.push(newValue) - 1
                );
              break;
              case 'vv':
                this.pushVectorToStack({
                  x: var1.x + var2.x,
                  y: var1.y + var2.y,
                  z: var1.z + var2.z
                });
              break;
            }
          break;
          case NWScript.ByteCodesEnum.SUB:

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            newValue = 0;

            switch(NWScript.Types[_instr.type]){
              case 'II':
                newValue = this.integerPointers[var1]-this.integerPointers[var2];
                this.integerPointers.push(newValue);
                this.stack.push((this.integerPointers.length-1));
              break;
              case 'IF':
                newValue = this.integerPointers[var1]-this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.floatPointers[var1]-this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FF':
                newValue = this.floatPointers[var1]-this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'vv':
                this.pushVectorToStack({
                  x: var1.x - var2.x,
                  y: var1.y - var2.y,
                  z: var1.z - var2.z
                });
              break;
            }

          break;
          case NWScript.ByteCodesEnum.MUL:
            
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            newValue = 0;
            if(this.isDebugging()){
              console.log('MUL', var2, var1);
            }
            switch(NWScript.Types[_instr.type]){
              case 'II':
                newValue = this.integerPointers[var1]*this.integerPointers[var2];
                this.integerPointers.push(newValue);
                this.stack.push((this.integerPointers.length-1));
              break;
              case 'IF':
                newValue = this.integerPointers[var1]*this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.floatPointers[var1]*this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FF':
                newValue = this.floatPointers[var1]*this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'VF':
                this.stack.push((var2*var1));
              break;
              case 'FV':
                this.stack.push((var2*var1));
              break;
            }

          break;
          case NWScript.ByteCodesEnum.DIV:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            newValue = 0;

            switch(NWScript.Types[_instr.type]){
              case 'II':
                newValue = this.integerPointers[var1] / this.integerPointers[var2];
                this.integerPointers.push(newValue);
                this.stack.push((this.integerPointers.length-1));
              break;
              case 'IF':
                newValue = this.integerPointers[var1]/this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.floatPointers[var1]/this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FF':
                newValue = this.floatPointers[var1]/this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'vv':
                this.stack.push((var1/var2));
              break;
            }
          break;
          case NWScript.ByteCodesEnum.MOD:
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            newValue = 0;

            switch(NWScript.Types[_instr.type]){
              case 'II':
                newValue = this.integerPointers[var1]%this.integerPointers[var2];
                this.integerPointers.push(newValue);
                this.stack.push((this.integerPointers.length-1));
              break;
              case 'IF':
                newValue = this.integerPointers[var1]%this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.floatPointers[var1]%this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FF':
                newValue = this.floatPointers[var1]%this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'vv':
                this.stack.push((var1%var2));
              break;
            }
          break;
          case NWScript.ByteCodesEnum.NEG:
            var1 = (this.stack.pop());

            newValue = 0;

            switch(NWScript.Types[_instr.type]){
              case 'I':
                newValue = -this.integerPointers[var1];
                this.stack.push((this.integerPointers.push(newValue)-1));
              break;
              case 'F':
                newValue = -this.floatPointers[var1];
                this.stack.push((this.floatPointers.push(newValue)-1));
              break;
            }
          break;
          case NWScript.ByteCodesEnum.COMPI:
            throw 'Unsupported code: COMPI';
          break;
          case NWScript.ByteCodesEnum.MOVSP:
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'MOVSP', this.stack.pointer)
              console.log('NWScript: '+this.name, 'MOVSP', this.stack.getAtPointer(_instr.offset), this.stack.getPointer());
            }

            //this.stack.setPointer(_instr.offset);
            if(this.isDebugging()){
              console.log('MOVSP', this.stack.pointer, this.stack.length, _instr.offset, Math.abs(_instr.offset)/4);
            }
            for(let i = 0; i < (Math.abs(_instr.offset)/4); i++){
              this.stack.stack.splice((this.stack.pointer -= 4) / 4, 1)[0];
            }
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'MOVSP', this.stack.getAtPointer(_instr.offset), this.stack.getPointer());
            }
          break;
          case NWScript.ByteCodesEnum.STORE_STATEALL:
            //OBSOLETE NOT SURE IF USED IN KOTOR
          break;
          case NWScript.ByteCodesEnum.JMP:
            seek = _instr.address + _instr.offset;
          break;
          case NWScript.ByteCodesEnum.JSR:
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'JSR');
            }
            let pos = _instr.address;
            seek = pos + _instr.offset;
            this.subRoutines.push(_instr.nextInstr.address); //Where to return to after the subRoutine is done

            if(this.subRoutines.length > 1000)
              throw 'JSR seems to be looping endlessly';

          break;
          case NWScript.ByteCodesEnum.JZ:
            let popped = this.integerPointers[(this.stack.pop())];
            if(popped == 0){
              seek = _instr.address + _instr.offset;
            }
          break;
          case NWScript.ByteCodesEnum.JNZ: //I believe this is used in SWITCH statements
            let jnzTOS = this.integerPointers[(this.stack.pop())];
            if(this.isDebugging()){
              console.log('JNZ', jnzTOS, _instr.address + _instr.offset);
            }
            if(jnzTOS != 0){
              seek = _instr.address + _instr.offset;
            }
          break;
          case NWScript.ByteCodesEnum.RETN:
            //console.log('RETN', this.subRoutines, this.subRoutines[0]);
            //try{
              if(this.subRoutines.length){
                let _subRout = this.subRoutines.pop();
                if(_subRout == -1){
                  if(this.isDebugging()){
                    console.error('RETN');
                  }
                  seek = null;
                  _instr.eof = true;
                }else{
                  if(this.isDebugging()){
                    console.log('NWScript: '+this.name, 'RETN', _subRout, this.subRoutines.length);
                  }
                  seek = _subRout; //Resume the code just after our pervious jump
                  if(!seek){
                    if(this.isDebugging()){
                      console.log('NWScript: seek '+this.name, seek, 'RETN');
                    }
                  }
                }
              }else{
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, 'RETN', 'END')
                }
                let _subRout = this.subRoutines.pop();
                //seek = _subRout;
                _instr.eof = true;
                if(this.isDebugging()){
                  console.log('NWScript: '+this.name, _instr)
                }
              }
            /*}catch(e){
              if(this.isDebugging()){
                console.error('RETN', e);
              }
            }*/
          break;
          case NWScript.ByteCodesEnum.DESTRUCT:
            // sizeOfElementToSave
            // sizeToDestroy
            // offsetToSaveElement

            let destroyed = [];
            for(let i = 0; i < (Math.abs(_instr.sizeToDestroy)/4); i++){
              destroyed.push(this.stack.stack.splice((this.stack.pointer -= 4) / 4, 1)[0]);
            }

            let saved = destroyed[_instr.offsetToSaveElement/_instr.sizeOfElementToSave];

            this.stack.push(
              saved
            );

            //console.log('DESTRUCT', destroyed, saved);

          break;
          case NWScript.ByteCodesEnum.NOTI:
            var1 = (this.stack.pop());
          if(this.integerPointers[var1] == 0)
            this.stack.push(NWScript.TRUE)//TRUE
          else
            this.stack.push(NWScript.FALSE)//FALSE
          break;
          case NWScript.ByteCodesEnum.DECISP:
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'DECISP', this.stack.getAtPointer( _instr.offset));
            }
            var1 = (this.stack.getAtPointer( _instr.offset));
            this.integerPointers[var1] -= 1;
          break;
          case NWScript.ByteCodesEnum.INCISP:
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'INCISP', this.stack.getAtPointer( _instr.offset));
            }
            var1 = (this.stack.getAtPointer( _instr.offset));
            this.integerPointers[var1] += 1;
          break;
          case NWScript.ByteCodesEnum.CPDOWNBP:
            this.stack.replaceBP(_instr.offset, this.stack.peek());
          break;
          case NWScript.ByteCodesEnum.CPTOPBP:
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'CPTOPBP', _instr);
            }
            let stackBaseEle = this.stack.getAtBasePointer( _instr.pointer );
            this.stack.push( (stackBaseEle) );
          break;
          case NWScript.ByteCodesEnum.DECIBP:
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'DECIBP', this.stack.getAtBasePointer( _instr.offset));
            }
            var1 = (this.stack.getAtBasePointer( _instr.offset));
            this.integerPointers[var1] -= 1;
          break;
          case NWScript.ByteCodesEnum.INCIBP:
            
            if(this.isDebugging()){
              console.log('NWScript: '+this.name, 'INCIBP', this.stack.getAtBasePointer( _instr.offset));
            }
            var1 = (this.stack.getAtBasePointer( _instr.offset));
            this.integerPointers[var1] += 1;
          break;
          case NWScript.ByteCodesEnum.SAVEBP:
            this.stack.saveBP();
            this.currentBlock = 'global';

            /*this.globalCache = {
              _instr: _instr.nextInstr,
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

          break;
          case NWScript.ByteCodesEnum.RESTOREBP:
            this.stack.restoreBP();
          break;
          case NWScript.ByteCodesEnum.STORE_STATE:

            let state = {
              offset: _instr.nextInstr.nextInstr.address,
              base: [],//this.stack.stack.slice(0, (_instr.bpOffset/4)),
              local: [],//this.stack.stack.slice(this.stack.stack.length-(_instr.spOffset/4), this.stack.stack.length)
              _instr: _instr
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
            
          break;
          case NWScript.ByteCodesEnum.NOP:

          break;
          case NWScript.ByteCodesEnum.T:

          break;
        }
        
        if(this.isDebugging()){
          console.log('NWScript: '+this.name, 'STACK_LEN', this.stack.stack.length);
        }

        if(!delay){
          resolve({
            _instr: _instr,
            seek: seek
          });
        }
        //console.error('HEY LOOK AT ME! Action failed', e);
      //});

    }catch(e){
      resolve({
        _instr: _instr,
        seek: null
      });
    }

  }

  ExecuteScript(script, args, onComplete){
    
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

  _VerifyNCS (reader){
    reader.Seek(0);
    if(reader.ReadChars(8) == 'NCS V1.0')
      return true;

    return false;
  }

  locationCompare(loc1, loc2){
    return loc1.position.x == loc2.position.x && loc1.position.y == loc2.position.y && loc1.position.z == loc2.position.z && loc1.facing == loc2.facing;
  }

  pushVectorToStack(vector){
    //Push Z to the stack
    this.stack.push(
      (
        this.floatPointers.push(
          vector.z
        ) - 1
      )
    );

    //Push Y to the stack
    this.stack.push(
      (
        this.floatPointers.push(
          vector.y
        ) - 1
      )
    );

    //Push X to the stack
    this.stack.push(
      (
        this.floatPointers.push(
          vector.x
        ) - 1
      )
    );
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
  1 : 'CPDOWNSP',
  2 : 'RSADD', //Reserve Space On Stack
  3 : 'CPTOPSP',
  4 : 'CONST', //Constant Type is declared by the next byte x03, x04, x05, x06
  5 : 'ACTION',
  6 : 'LOGANDII',
  7 : 'LOGORII',
  8 : 'INCORII',
  9 : 'EXCORII',
  10 : 'BOOLANDII',
  11 : 'EQUAL', //Constant Type is declared by the next byte x03, x04, x05, x06
  12 : 'NEQUAL', //Constant Type is declared by the next byte x03, x04, x05, x06
  13 : 'GEQ', //Constant Type is declared by the next byte x03, x04
  14 : 'GT', //Constant Type is declared by the next byte x03, x04
  15 : 'LT', //Constant Type is declared by the next byte x03, x04
  16 : 'LEQ', //Constant Type is declared by the next byte x03, x04
  17 : 'SHLEFTII',
  18 : 'SHRIGHTII',
  19 : 'USHRIGHTII',
  20 : 'ADD',
  21 : 'SUB',
  22 : 'MUL',
  23 : 'DIV',
  24 : 'MOD',
  25 : 'NEG',
  26 : 'COMPI',
  27 : 'MOVSP',
  28 : 'STORE_STATEALL',
  29 : 'JMP',
  30 : 'JSR',
  31 : 'JZ',
  32 : 'RETN',
  33 : 'DESTRUCT',
  34 : 'NOTI',
  35 : 'DECISP',
  36 : 'INCISP',
  37 : 'JNZ',
  38 : 'CPDOWNBP',
  39 : 'CPTOPBP',
  40 : 'DECIBP',
  41 : 'INCIBP',
  42 : 'SAVEBP',
  43 : 'RESTOREBP',
  44 : 'STORE_STATE',
  45 : 'NOP',
  46 : 'T',

  getKeyByValue: function( value ) {
      for( let prop in NWScript.ByteCodes ) {
          if( NWScript.ByteCodes.hasOwnProperty( prop ) ) {
                if( NWScript.ByteCodes[ prop ] === value )
                    return prop;
          }
      }
  }
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

module.exports = NWScript;