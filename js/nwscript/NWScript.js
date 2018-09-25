/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The NWScript class.
 */

class NWScript {

  constructor ( dataOrFile = null, onComplete = null, decompile = true ){

    this._instrIdx = 0;
    this._lastOffset = -1;

    this.enteringObject = undefined;
    this.exitingObject = undefined;
    this.name = '';
    this.state = [];

    this.params = [0, 0, 0, 0, 0];
    this.paramString = '';

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

    
    if(Game.Flags.LogScripts){
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
      
      if(Game.Flags.LogScripts){
        console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Started');
      }
      while ( reader.position < progSize ){
        this._ParseInstruction(reader);
      };
      
      if(Game.Flags.LogScripts){
        console.log('NWScript: '+this.name, 'NCS Decompile', 'Pass 1: Complete');
      }
      reader.position = 0;

    }

  }

  run(caller = null, scriptVar = 0, onComplete = null){
    this.caller = caller;
    this.scriptVar = scriptVar;
    this.onComplete = onComplete;

    this.subRoutines = [];
    this.objectPointers = [this.caller]; //OBJECT_SELF is objectPointer[0]
    this.stringPointers = [];
    this.integerPointers = [0, 1]; //0 and 1 are predefined for FALSE & TRUE vaules respectively
    this.floatPointers = [];
    this.locationPointers = [];
    this.effectPointers = [];
    this.eventPointers = [];
    this.actionPointers = [];
    this.stack = new NWScriptStack();
    this.state = [];

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

    var promiseWhile = function(condition, action) {
      var resolver = Promise.defer();
  
      var loop = function() {
          if (!condition()) return resolver.resolve();
          return Promise.cast(action())
              .then(loop)
              .catch(resolver.reject);
      };
  
      process.nextTick(loop);
  
      return resolver.promise;
    };

    promiseWhile( () => {
      // Condition for stopping
      return !completed;
    }, () => {
        // Action to run, should return a promise
        return new Promise( (resolve, reject) => {
          if(Game.Flags.LogScripts){
            console.log('script.tick', this.name, data);
          }
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
              /*.then((newData={}) => {
                
              }).catch((e) => {
                console.error('NWScript '+this.name, __nextInstr.instr, e)
              });*/
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
                  /*.then((newData={}) => {
                    this.firstLoop = false;
                    let oldCallback = data.onComplete;
                    data = newData;
                    data.onComplete = oldCallback;
                    resolve();   
                  }).catch((e) => {
                    console.error('NWScript '+this.name, data._instr.nextInstr, e)
                  });*/
              }
            }else{
              completed = true;
              resolve();
            }
          }
        })
    }).then(() => {
      //onScriptEND
      if(Game.Flags.LogScripts){
        console.log('onScriptEND', this)
      }else{
        //console.log('onScriptEND', this.name)
      }
      if(typeof data.onComplete === 'function'){
        data.onComplete(this.getReturnValue());
      }
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
    
    if(Game.Flags.LogScripts){
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

    switch(NWScript.ByteCodes[_instr.code]){
      case 'CPDOWNSP':
        _instr.offset = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16();
      break;
      case 'RSADD':

      break;
      case 'CPTOPSP':
        _instr.pointer = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
        _instr.data = null;
      break;
      case 'CONST':
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
      case 'ACTION':
        _instr.action = reader.ReadUInt16();
        _instr.argCount = reader.ReadByte();

        //for(let i = _instr.argCount; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'LOGANDII':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'LOGORII':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'INCORII':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

        break;
      case 'EXCORII':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'BOOLANDII':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'EQUAL':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

        //If the second arg is reserved on the stack then we need to go back one
        //more instruction to get to the first arg
        //if( this.instructions[this.instructions.length-1].prevInstr.code == 2 )
        //  this.instructions[this.instructions.length-3].isArg = true;

      break;
      case 'NEQUAL':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'GEQ':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'GT':

        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;

      break;
      case 'LT':
        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;
      break;
      case 'LEQ':
        //for(let i = 2; i > 0; i--)
          //this.instructions[this.instructions.length-i].isArg = true;
      break;
      case 'SHLEFTII':

      break;
      case 'SHRIGHTII':

      break;
      case 'USHRIGHTII':

      break;
      case 'ADD':

      break;
      case 'SUB':

      break;
      case 'MUL':

      break;
      case 'DIV':

      break;
      case 'MOD':

      break;
      case 'NEG':

        /*switch(_instr.type){
          case 3:
            _instr.prevInstr.integer = _instr.prevInstr.integer *-1;
          break;
          case 4:
            _instr.prevInstr.float = _instr.prevInstr.float *-1;
          break;
        }*/

      break;
      case 'COMPI':

      break;
      case 'MOVSP':
        _instr.offset = reader.ReadUInt32();
      break;
      case 'STORE_STATEALL':

      break;
      case 'JMP':
        _instr.offset = reader.ReadUInt32();
      break;
      case 'JSR':
        _instr.offset = reader.ReadUInt32();
      break;
      case 'JZ':
        _instr.offset = reader.ReadInt32();
      break;
      case 'JNZ':
        _instr.offset = reader.ReadInt32();
      break;
      case 'RETN':
        if(!this.eofFound){
          _instr.eof = true;
          this.eofFound = true;
        }
      break;
      case 'DESTRUCT':

      break;
      case 'NOTI':

      break;
      case 'DECISP':
        _instr.offset = reader.ReadInt32();
      break;
      case 'INCISP':
        _instr.offset = reader.ReadInt32();
      break;
      case 'CPDOWNBP':
        _instr.offset = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16();
      break;
      case 'CPTOPBP':
        _instr.pointer = reader.ReadUInt32();
        _instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
        _instr.data = null;
      break;
      case 'DECIBP':

      break;
      case 'INCIBP':

      break;
      case 'SAVEBP':

      break;
      case 'RESTOREBP':

      break;
      case 'STORE_STATE':
        _instr.bpOffset = reader.ReadUInt32();
        _instr.spOffset = reader.ReadUInt32();
      break;
      case 'NOP':

      break;
      case 'T':
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
      
        if(Game.Flags.LogScripts){
          console.log('NWScript: '+this.name,  '_RunInstruction', _instr.index, NWScript.ByteCodes[_instr.code], _instr );
        }

        let seek = null;
        let delay = false;

        let var1, var2, newValue = 0;

        switch(NWScript.ByteCodes[_instr.code]){
          case 'CPDOWNSP':
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.pointer)
              console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.getAtPointer(_instr.offset), this.stack.peek());
            }
            this.stack.replace(_instr.offset, this.stack.peek());
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'CPDOWNSP', this.stack.getAtPointer(_instr.offset), this.stack.peek());
            }
          break;
          case 'RSADD':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'RADD', _instr.address, this.stack.pointer * 4);
            }
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
            }
            
          break;
          case 'CPTOPSP':
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'CPTOPSP', _instr.pointer, this.stack.stack );
            }
            let stackEle = this.stack.getAtPointer( _instr.pointer );//this.stack.peek();
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'CPTOPSP', stackEle);
            }
            let newEleCP = (stackEle);
        
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'CPTOPSP', (newEleCP));
            }
            this.stack.push( newEleCP );

          break;
          case 'CONST':
            switch(_instr.type){
              case 3:
                let ipIdx = this.integerPointers.push(
                  _instr.integer
                )-1;
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'ipIdx', ipIdx);
                }
                this.stack.push((ipIdx));
              break;
              case 4:
                this.floatPointers.push(_instr.float);
                let fpIdx = this.floatPointers.length-1;
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'fpIdx', fpIdx);
                }
                this.stack.push((fpIdx));
              break;
              case 5:
                this.stringPointers.push(_instr.string);
                let spIdx = this.stringPointers.length-1;
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'spIdx', spIdx);
                }
                this.stack.push((spIdx));
              break;
              case 6:
                this.objectPointers.push(this.caller); //Default the initialization to OBJECT_SELF?
                let opIdx = this.objectPointers.length-1;
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'opIdx', opIdx);
                }
                this.stack.push((opIdx));
              break;
              case 12:
                this.locationPointers.push(_instr.string);
                let lpIdx = this.locationPointers.length-1;
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'lpIdx', lpIdx);
                }
                this.stack.push((lpIdx));
              break;
            }
          break;
          case 'ACTION':
            
            let action = this.Definition.Actions[_instr.action];
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'ACTION', action.name, action.args, _instr.argCount);
            }

            let args = [];
            let _returnValue = null;

            for(let i = 0; i < action.args.length; i++){
              switch(action.args[i]){
                case 'object':
                  args.push(
                    this.objectPointers[(this.stack.pop())]
                  )
                break;
                case 'string':
                  args.push(
                    this.stringPointers[(this.stack.pop())]
                  )
                break;
                case 'int':
                  args.push(
                    this.integerPointers[(this.stack.pop())]
                  )
                break;
                case 'float':
                  args.push(
                    this.floatPointers[(this.stack.pop())]
                  )
                break;
                case 'effect':
                  args.push(
                    this.effectPointers[(this.stack.pop())]
                  )
                break;
                case 'action':
                  args.push(
                    this.state.pop()
                  )
                break;
                case 'event':
                  args.push(
                    this.eventPointers[(this.stack.pop())]
                  )
                break;
                case 'location':
                  args.push(
                    this.locationPointers[(this.stack.pop())]
                  )
                break;
                case 'vector':
                  args.push({
                    x: this.floatPointers[(this.stack.pop())],
                    y: this.floatPointers[(this.stack.pop())],
                    z: this.floatPointers[(this.stack.pop())]
                  })
                break;
                default:
                  //Pop the function variables off the stack after we are done with them
                  args.push(this.stack.pop());
                  console.log('UKNOWN ARG', action, args);
                break;
              }
              
            }

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'ACTION POPING ARGS', action.args.length);
            }

            switch(_instr.action){
              case 0: //Random
                _returnValue = this.integerPointers.push(Math.round(Math.random()*args[0])) - 1;
              break;
              case 1: //PrintString
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'PrintString', args[0]);
                }
              break;
              case 2: //PrintFloat
                console.log(
                  args[0].toFixed(args[2])
                );
              break;
              case 3: //FloatToString
                _returnValue = this.stringPointers.push(
                  args[0].toFixed(args[2])
                ) - 1;
              break;
              case 4: //PrintInteger
                console.log(args[0]);
              break;
              case 5: //PrintObject
                console.log(args[0]);
              break;
              case 6: //AssignCommand
                if(args[0] instanceof ModuleObject){
                  if(typeof args[1] === 'object'){
                    //args[1].script.caller = args[0];
                    args[1].script.caller = args[0];
                    args[1].script.objectPointers[0] = args[0];
                    //args[1].script.stack.push((0)); //Don't know why this makes things work :/
                    args[0].doCommand(
                      args[1].script, //script
                      args[1], //state
                      _instr.nextInstr, //instruction
                    );
                  }else{
                    console.error('AssignCommand', args);
                  }
                }else{
                  console.error('AssignCommand', args);
                }
              break;
              case 7: //DelayCommand
                console.log('NWScript: '+this.name, args);
                
                setTimeout(() => {
                  console.log('DelayCommand '+args[1].script.name, args[1])
                  if(args[1].script instanceof NWScript){
                    //args[1].script.caller = args[1].caller;
                    args[1].script.beginLoop({
                      _instr: null,
                      seek: args[1].offset,
                      onComplete: () => {
                        console.log('DelayCommand '+args[1].script.name, 'Complete');
                        
                      }
                    });
                  }
                }, args[0] * 1000);

              break;
              case 8: //ExecuteScript
                delay = true;
                ResourceLoader.loadResource(ResourceTypes['ncs'], args[0], (buffer) => {
                  let executeScript = new NWScript(buffer);
                  executeScript.run(
                    args[1],
                    args[2],
                    (executeScriptReturnedValue) => {
                      //this._RunNextInstruction(_instr, null, onComplete);
                      resolve({
                        _instr: _instr,
                        seek: seek
                      });
                    }
                  )
                });
              break;
              case 9: //ClearAllActions
                if(this.caller instanceof ModuleCreature)
                  this.caller.clearAllActions();
              break;
              case 10: //SetFacing
                this.caller.getModel().rotation.z = args[0];          
              break;
              case 11: //SwitchPlayerCharacter
              
                console.log('SwitchPlayerCharacter', args);
                delay = true;
                PartyManager.SwitchPlayerToPartyMember(args[0], () => {

                  this.stack.push((1));
  
                  resolve({
                    _instr: _instr,
                    seek: seek
                  });
  
                });
                
              break;
              case 12: //SetTime
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 13: //SetPartyLeader
                _returnValue = PartyManager.party.unshift(
                  PartyManager.party.splice(
                    PartyManager.party.indexOf(Game.player), 
                    1
                  )[0]
                ) ? 1 : 0;
              break;
              case 14: //SetAreaUnescapable
                Game.module.area.Unescapable = args[0] ? 1 : 0;
              break;
              case 15: //GetAreaUnescapable
                _returnValue = Game.module.area.Unescapable ? 1 : 0;
              break;
              case 16: //GetTimeHour
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 17: //GetTimeMinute
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 18: //GetTimeSecond
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 19: //GetTimeMillisecond
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 20: //ActionRandomWalk
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 21: //ActionMoveToLocation
                this.objectPointers[0].moveToLocation(
                  args[0],
                  args[1]
                );
              break;
              case 22: //ActionMoveToObject
                this.objectPointers[0].moveToObject(
                  args[0],
                  args[1],
                  args[2]
                );
              break;
              case 23://ActionMoveAwayFromObject
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 24: //GetArea
                _returnValue = this.objectPointers.push(
                  Game.module.area
                ) - 1;
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 25: //GetEnteringObject
                //console.log('GetEnteringObject', this, this.enteringObject);
                _returnValue = this.objectPointers.push(this.enteringObject)-1;
              break;
              case 26: //GetExitingObject
                _returnValue = this.objectPointers.push(this.exitingObject)-1;
              break;
              case 27: //GetPosition

                if(args[0] instanceof ModuleObject){
                  //Push Z to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        args[0].position.z
                      ) - 1
                    )
                  );

                  //Push Y to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        args[0].position.y
                      ) - 1
                    )
                  );

                  //Push X to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        args[0].position.x
                      ) - 1
                    )
                  );
                }else{
                  //Push Z to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        0.0
                      ) - 1
                    )
                  );

                  //Push Y to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        0.0
                      ) - 1
                    )
                  );

                  //Push X to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        0.0
                      ) - 1
                    )
                  );
                }
                
                /*_returnValue = this.locationPointers.push(
                  args[0].getModel().position.clone()
                ) - 1;*/
              break;
              case 28: //GetFacing
                _returnValue = this.floatPointers.push(
                  args[0].getModel().rotation.z
                ) - 1;
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 29: //GetItemPossessor
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 30: //GetItemPossessedBy
                if(args[0] instanceof ModuleObject){
                  _returnValue = this.objectPointers.push(
                    args[0].hasItem(
                      args[1]
                    )
                  ) - 1;
                }else{
                  _returnValue = -1;
                }
              break;
              case 31: //CreateItemOnObject
                //console.log('CreateItemOnObject', this.name, args);
                //delay = true;
                /*ModuleItem.FromResRef(args[0], (item) => {
                  item.setStackSize(args[2]);
                  if(PartyManager.party.indexOf(args[1]) > -1){
                    InventoryManager.addItem(item, () => {
                      //this._RunNextInstruction(_instr, null, onComplete);
                    });
                  }else{
                    args[1].addItem(item, () => {
                      //this._RunNextInstruction(_instr, null, onComplete);
                    });
                  }
                })*/
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
                _returnValue = 1;
              break;
              case 32: //ActionEquipItem
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 33: //ActionUnequipItem
              console.log('ActionUnequipItem', this.name, args);
                if(this.caller instanceof ModuleCreature){
                  for(let slot in this.caller.equipment){
                    if(this.caller.equipment[slot] == args[0]){
                      this.caller.unequipSlot(UTCObject.SLOT[slot]);
                      break;
                    }
                  }
                }
              break;
              case 34: //ActionPickUpItem
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 35: //ActionPutDownItem
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 36: //GetLastAttacker
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 37: //ActionAttack
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 38: //GetNearestCreature
                _returnValue = this.objectPointers.push(Game.GetNearestCreature(
                  args[0],
                  args[1],
                  args[2],
                  args[3],
                  args[4],
                  args[5],
                  args[6],
                )) - 1;
              break;
              case 39: //ActionSpeakString
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 40: //ActionPlayAnimation
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
                if(this.caller instanceof ModuleObject){
                  this.caller.actionQueue.push({ goal: ModuleCreature.ACTION.ANIMATE, animation: args[0], speed: args[1], time: args[2] });
                }
                //console.log(this, this.caller);
              break;
              case 41: //GetDistanceToObject
                console.log('GetDistanceToObject', this.caller.GetPosition().distanceTo(
                  args[0].GetPosition()
                ), args)
                _returnValue = this.floatPointers.push(
                  this.caller.GetPosition().distanceTo(
                    args[0].GetPosition()
                  )
                )-1;
              break;
              case 42: //GetIsObjectValid
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'GetIsObjectValid', args[0], args[0] instanceof ModuleObject)
                }
                _returnValue = args[0] instanceof ModuleObject ? 1 : 0;
              break;
              case 43: //ActionOpenDoor
                console.log('ActionOpenDoor', this, args);
                if(this.caller instanceof ModuleDoor)
                  this.caller.openDoor(args[0]);
              break;
              case 44: //ActionCloseDoor
                if(this.caller instanceof ModuleDoor)
                  this.caller.closeDoor(args[0]);
              break;
              case 45: //SetCameraFacing
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 46: //PlaySound
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 47: //GetSpellTargetObject()
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 48: //ActionCastSpellAtObject
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 49: //GetCurrentHitPoints
                _returnValue = this.integerPointers.push(
                  args[0].getHP()
                ) - 1;
              break;
              case 50: //GetaxHitPoints
                _returnValue = this.integerPointers.push(
                  args[0].getMaxHP()
                ) - 1;
              break;
              case 51: //EffectAssuredHit
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 52: //GetLastItemEquipped
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 53: //GetSubScreenID
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 54: //CancelCombat
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 55: //GetCurrentForcePoints
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 56: //GetMaxForcePoints
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 57: //PauseGame
                if(args[0]){
                  Game.State = Game.STATES.PAUSED;
                }else{
                  Game.State = Game.STATES.RUNNING;
                }
              break;
              case 58: //SetPlayerRestrictMode
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 59: //GetStringLength
                _returnValue = this.integerPointers.push(
                  args[0].length
                ) - 1;
              break;
              case 60: //GetStringUpperCase
                _returnValue = this.stringPointers.push(
                  args[0].toUpperCase()
                ) - 1;
              break;
              case 61: //GetStringLowerCase
                _returnValue = this.stringPointers.push(
                  args[0].toLowerCase()
                ) - 1;
              break;
              case 62: //GetStringRight
                _returnValue = this.stringPointers.push(
                  args[0].substr(
                    -args[1],
                    args[1]
                  )
                ) - 1;
              break;
              case 63: //GetStringLeft
                _returnValue = this.stringPointers.push(
                  args[0].substr(0, args[1])
                ) - 1;
              break;
              case 64: //InsertString
                _returnValue = this.stringPointers.push([
                  args[0].slice(0, args[2]), 
                  args[1], 
                  args[0].slice(args[2])
                ].join('')) - 1;
              break;
              case 65: //GetSubString
                _returnValue = this.stringPointers.push(
                  args[0].substr(
                    args[1],
                    args[2]
                  )
                ) - 1;
              break;
              case 66: //FindSubString
                _returnValue = this.integerPointers.push(
                  args[0].indexOf(
                    args[1]
                  )
                ) - 1;
              break;
              case 67: // fabs
                _returnValue = this.floatPointers.push(
                  Math.abs(args[0])
                ) - 1;
              break;
              case 68: //cos
                _returnValue = this.floatPointers.push(
                  Math.cos(args[0])
                ) - 1;
              break;
              case 69: //sin
                _returnValue = this.floatPointers.push(
                  Math.sin(args[0])
                ) - 1;
              break;
              case 70: //tan
                _returnValue = this.floatPointers.push(
                  Math.tan(args[0])
                ) - 1;
              break;
              case 71: //acos
                _returnValue = this.floatPointers.push(
                  Math.acos(args[0])
                ) - 1;
              break;
              case 72: //asin
                _returnValue = this.floatPointers.push(
                  Math.asin(args[0])
                ) - 1;
              break;
              case 73: //atan
                _returnValue = this.floatPointers.push(
                  Math.atan(args[0])
                ) - 1;
              break;
              case 74: //log
                _returnValue = this.floatPointers.push(
                  Math.log(args[0])
                ) - 1;
              break;
              case 75: //pow
                _returnValue = this.floatPointers.push(
                  Math.pow(args[0])
                ) - 1;
              break;
              case 76: //sqrt
                _returnValue = this.floatPointers.push(
                  Math.sqrt(args[0])
                ) - 1;
              break;
              case 77:
                _returnValue = this.integerPointers.push(
                  Math.abs(args[0])
                ) - 1;
              break;
              case 78: //EffectHeal
                _returnValue = this.effectPointers.push(
                  {type: 421, amount: args[0] }
                ) - 1;
              break;
              case 79: //EffectDamage
                _returnValue = this.effectPointers.push(
                  {type: 42, amount: args[0], damage_type: args[1], damage_power: args[2] }
                ) - 1;
              break;
              case 80: //EffectAbilityIncrease
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 81: //EffectDamageResistsance
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 82: //EffectResurrection
                _returnValue = this.effectPointers.push({type: 2}) - 1;
              break;
              case 83: //GetPlayerRestrictMode
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 84: //GetCasterLevel
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 85: //GetFirstEffect
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 86: //GetNextEffect
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 87: //RemoveEffect
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 88: //GetIsEffectValid
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 89: //GetEffectDurationType
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 90: //GetEffectSubType
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 91: //GetEffectCreator
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 92: //IntToString
                //console.log('NWScript IntToString', this.name, args);
                _returnValue = this.stringPointers.push(
                  args[0]+''
                ) - 1;
              break;
              case 93: //GetFirstObjectInArea
                _returnValue = this.objectPointers.push(
                  Game.GetFirstObjectInArea(
                    args[0],
                    args[1]
                  )
                ) - 1;
              break;
              case 94: //GetNextObjectInArea
                _returnValue = this.objectPointers.push(
                  Game.GetNextObjectInArea(
                    args[0],
                    args[1]
                  )
                ) - 1;
              break;
              case 95: //d2
                _returnValue = this.integerPointers.push(
                  Game.rollD2(
                    args[0]
                  )
                ) - 1;
              break;
              case 96: //d3
                _returnValue = this.integerPointers.push(
                  Game.rollD3(
                    args[0]
                  )
                ) - 1;
              break;
              case 97: //d4
                _returnValue = this.integerPointers.push(
                  Game.rollD4(
                    args[0]
                  )
                ) - 1;
              break;
              case 98: //d6
                _returnValue = this.integerPointers.push(
                  Game.rollD6(
                    args[0]
                  )
                ) - 1;
              break;
              case 99: //d8
                _returnValue = this.integerPointers.push(
                  Game.rollD8(
                    args[0]
                  )
                ) - 1;
              break;
              case 100: //d10
                _returnValue = this.integerPointers.push(
                  Game.rollD10(
                    args[0]
                  )
                ) - 1;
              break;
              case 101: //d12
                _returnValue = this.integerPointers.push(
                  Game.rollD12(
                    args[0]
                  )
                ) - 1;
              break;
              case 102: //d20
                _returnValue = this.integerPointers.push(
                  Game.rollD20(
                    args[0]
                  )
                ) - 1;
              break;
              case 103: //d100
                _returnValue = this.integerPointers.push(
                  Game.rollD100(
                    args[0]
                  )
                ) - 1;
              break;
              case 104: //VectorMagnitude
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 105: //GetMetaMagicFeat
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 106: //GetObjectType
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 107: //GetRacialType
                _returnValue = this.integerPointers.push(
                  args[0].getRace()
                ) - 1;
              break;
              case 108: //FortitudeSave
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 109: //ReflexSave
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 110: //WillSave
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 111: //GetSpellSaveDC
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 112: //MagicalEffect
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 113: //SupernaturalEffect
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 114: //ExtraordinaryEffect
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 115: //EffectACIncrease
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 116: //GetAC
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 117: //EffectSavingThrowIncrease
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 118: //EffectAttackIncrease
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 119: //EffectDamageReduction
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 120: //EffectDamageIncrease
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 121: //RoundsToSeconds
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 122: //HoursToSeconds
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 123: //TurnsToSeconds
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 124: //SoundObjectetFixedVariance
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 125: //GetGoodEvilValue
                _returnValue = this.integerPointers.push(
                  args[0].getGoodEvil()
                ) - 1;
              break;
              case 126: //GetPartyMemberCount
                _returnValue = this.integerPointers.push(
                  PartyManager.party.length
                ) - 1;
              break;
              case 127: //GetAlignmentGoodEvil
                
                if(args[0].getGoodEvil() < 25){
                  _returnValue = this.integerPointers.push(3) - 1;
                }else if(args[0].getGoodEvil() < 75){
                  _returnValue = this.integerPointers.push(0) - 1;
                }else{
                  _returnValue = this.integerPointers.push(2) - 1;
                }

              break;
              case 128: //GetFirstObjectInShape
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 129: //GetNextObjectInSpace
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 130: //EffectEntagle
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 131: //SignalEvent
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
                //console.log('SignalEvent', this.name, args[0], args[1])
                //This needs to happen once the script has completed
                try{
                  switch(args[1].name){
                    case 'EventUserDefined':
                      if(args[0] instanceof ModuleObject){
                        args[0].triggerUserDefinedEvent(
                          this.caller,
                          args[1].value
                        );
                      }
                    break;
                  }
                }catch(e){
                  console.error(e);
                }
              break;
              case 132: //EventUserDefined
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
                _returnValue = this.eventPointers.push({
                  name: 'EventUserDefined',
                  value: args[0]
                }) - 1;
              break;
              case 133: //EffectDeath
                _returnValue = this.effectPointers.push(
                  {type: 1, nSpectacularDeath: args[0] ? true: false }
                ) - 1;
              break;
              case 134: //EffectKnockdown
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 135: //ActionGiveItem
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 136: //ActionTakeItem
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 137: //VectorNormalize
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 138: //GetItemStackSize
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 139: //GetAbilityScore
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 140: //GetIsDead
                _returnValue = args[0].isDead() ? 1 : 0;
              break;
              case 141: //PrintVector
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 142: //Vector
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 143: //SetFacingPoint
                if(args[0] instanceof ModuleObject){
                  args[0].FacePoint(args[1]);
                }
              break;
              case 144: //AngleToVector
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 145: //VectorToAngle
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 146: //TouchAttackMelee
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 147: //TouchAttackRanged
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 148: //EffectParalyze
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 149: //EffectSpellImmunity
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 150: //SetItemStackSize
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 151: //GetDistanceBetween
                _returnValue = this.floatPointers.push(
                  args[0].GetPosition().distanceTo(
                    args[1].GetPosition()
                  )
                )-1;
              break;
              case 152: //SetReturnStrref
                console.log('SetReturnStrref', this)
              break;  
              case 153: //EffectForceJump
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 154: //EffectSleep
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 155: //GetItemInSlot
                //console.log('GetItemInSlot', args[1]);

                if(args[1] instanceof ModuleCreature){
                  switch(args[0]){
                    case 0:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.HEAD
                        )
                      ) - 1;
                    break;
                    case 1:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.ARMOR
                        )
                      ) - 1;
                    break;
                    case 3:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.ARMS
                        )
                      ) - 1;
                    break;
                    case 4:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.RIGHTHAND
                        )
                      ) - 1;
                    break;
                    case 5:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.LEFTHAND
                        )
                      ) - 1;
                    break;
                    case 7:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.LEFTARMBAND
                        )
                      ) - 1;
                    break;
                    case 8:
                    _returnValue = this.objectPointers.push(
                      args[1].getItemInSlot(
                        UTCObject.SLOT.RIGHTARMBAND
                      )
                    ) - 1;
                    case 9:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.IMPLANT
                        )
                      ) - 1;
                    break;
                    case 10:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.BELT
                        )
                      ) - 1;
                    break;
                    case 14:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.CLAW1
                        )
                      ) - 1;
                    break;
                    case 15:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.CLAW2
                        )
                      ) - 1;
                    break;
                    case 16:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.CLAW2
                        )
                      ) - 1;
                    break;
                    case 17:
                      _returnValue = this.objectPointers.push(
                        args[1].getItemInSlot(
                          UTCObject.SLOT.HIDE
                        )
                      ) - 1;
                    break;
                  }
                }

                if(!_returnValue){
                  _returnValue = this.objectPointers.push( undefined ) -1;
                }

                //console.log('GetItemInSlot', this.objectPointers[_returnValue]);


                
              break;
              case 156: //EffectTemporaryForcePoints
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 157: //EffectConfused
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 158: //EffectFrightened
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 159: //EffectChoke
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 160: //SetGlobalString
                Game.Globals.String[args[0]] = args[1];
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 161: //EffectStunned
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 162: //SetCommandable
                if(args[1] instanceof ModuleObject){
                  args[1].setCommadable(
                    args[0]
                  );
                }
              break;
              case 163: //GetCommandable
                _returnValue = args[0].getCommadable() ? 1 : 0;
              break;
              case 164: //EffectRegenerate
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 165: //EffectMovementSpeedIncrease
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 166: //GetHitDice
                _returnValue = this.integerPointers.push(
                  args[0].getTotalClassLevel()
                ) - 1;
              break;
              case 167: //ActionForceFollowObject
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 168: //GetTag
                if(args[0] instanceof ModuleObject){
                  _returnValue = this.stringPointers.push(
                    args[0].getTag()
                  ) - 1;
                }else{
                  _returnValue = this.stringPointers.push('') - 1;
                }
              break;
              case 169: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 170: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 171: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 172: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 173: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 174: //GetIsListening
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
                _returnValue = this.integerPointers.push(
                  args[0].getIsListening()
                ) - 1;
              break;
              case 175: //SetListening
                args[0].setListening(
                  args[1]
                );
              break;
              case 176: //SetListenPattern
                args[0].setListeningPattern(
                  args[1],
                  args[2]
                );
              break;
              case 177: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 178: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 179: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 180: //EffectVisualEffect
                _returnValue = this.effectPointers.push(
                  {type: args[0], value: args[1]}
                )-1;
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 181: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 182: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 183: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 184: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 185: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 186: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 187: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 188: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 189: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 190: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 191: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 192: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 193: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 194: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 195: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 196: //ActionJumpToObject
                if(args[0] instanceof ModuleObject){
                  this.caller.jumpToObject(
                    args[0]
                  );
                }
              break;
              case 197: //GetWaypointByTag
                //console.log('GetWaypointByTag', args[0])
                _returnValue = this.objectPointers.push(
                  Game.GetObjectByTag(args[0], 0, OBJECT_TYPE_WAYPOINT)
                ) - 1;
              break;
              case 198: //
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 199: // console.error('Unhandled script action', _instr.address, action.name, action.args);
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 200: //GetObjectByTag
                _returnValue = this.objectPointers.push(
                  Game.GetObjectByTag(args[0], args[1])
                ) - 1;
              break;
              case 202: //ActionWait
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'Run ActionWait', args[0] * 1000);
                }

                if(this.caller instanceof ModuleObject)
                  this.caller.actionQueue.push({ goal: ModuleCreature.ACTION.WAIT, elapsed:0, time: args[0] });

                /*delay = true;
                setTimeout(() => {
                  //Resume Script
                  this._RunNextInstruction(_instr, null, onComplete)
                }, args[0] * 1000);*/
              break;
              case 204: //ActionStartConversation
                try{
                  console.log('NWScript: '+this.name, 'ActionStartConversation', args);
                  console.log(this.caller.conversation);
                  //If the dialog name is blank default to the callers dialog file
                  if(args[1] == ''){
                    args[1] = this.caller.conversation;
                  }

                  if(args[0] instanceof ModuleObject){
                    args[0].actionQueue.push({
                      object: this.caller,
                      conversation: args[1],
                      ignoreStartRange: args[4] ? true : false,
                      goal: ModuleCreature.ACTION.DIALOGOBJECT
                    });
                  }

                }catch(e){
                  console.error('HEY LOOK AT ME! ActionStartConversation', e);
                }
              break;
              case 205: //ActionPauseConversation
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'ActionPauseConversation');
                }
                Game.InGameDialog.PauseConversation();
              break;
              case 206: //ActionResumeConversation
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'ActionResumeConversation');
                }
                Game.InGameDialog.ResumeConversation();
              break;
              case 208: //GetReputation
                if(args[0] instanceof ModuleCreature && args[1] instanceof ModuleCreature){
                  _returnValue = this.integerPointers.push(
                    args[0].getReputation(args[1])
                  ) - 1;
                }else{
                  _returnValue = -1;
                }
              break;
              case 213: //GetLocation
                //console.log('NWScript: '+this.name, 'GetLocation', args);
                if(args[0] instanceof ModuleObject){
                  _returnValue = this.locationPointers.push({
                    position: args[0].GetPosition(),
                    area: Game.module, //Once the ModuleArea class is implemented this will point to that
                    facing: args[0].GetRotation()
                  }) - 1;
                  //console.log('NWScript: '+this.name, 'GetLocation', _returnValue);
                }else{
                  //console.error('NWScript: '+this.name, 'GetLocation', args);
                  _returnValue = this.locationPointers.push({
                    position: new THREE.Vector3(),
                    area: Game.module, //Once the ModuleArea class is implemented this will point to that
                    facing: 180
                  }) - 1;
                }
              break;
              case 214: //ActionJumpToLocation
                if(args[0] instanceof ModuleObject){
                  this.caller.jumpToLocation(
                    args[0]
                  );
                }
              break;
              case 217: //GetIsPC
                _returnValue = (args[0] == Game.player) ? 1 : 0;
              break;
              case 220: //ApplyEffectToObject
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'ApplyEffectToObject', args);
                }
                switch(args[1].type){
                  case 1:
                    if(args[1].nSpectacularDeath){
                      args[2].animState = ModuleCreature.AnimState.DEAD;
                    }else{
                      args[2].animState = ModuleCreature.AnimState.DEAD;
                    }
                  break;
                  case 62:
                    //args[2].appearance = aeEffect.appearance;
                  break;
                }

                args[2].AddEffect(args[1]);
              break;
              case 223: //GetPositionFromLocation
                if(args[0]){
                  //Push Z to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        args[0].position.z
                      ) - 1
                    )
                  );

                  //Push Y to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        args[0].position.y
                      ) - 1
                    )
                  );

                  //Push X to the stack
                  this.stack.push(
                    (
                      this.floatPointers.push(
                        args[0].position.x
                      ) - 1
                    )
                  );
                }
              break;
              case 227: //GetNearestObject
                _returnValue = this.objectPointers.push(
                  Game.GetNearestObject(args[0], args[1], args[2]-1)
                ) - 1;
              break;
              case 229: //GetNearestObjectByTag
                //console.log('GetNearestObjectByTag', args);
                _returnValue = this.objectPointers.push(
                  Game.GetNearestObjectByTag(args[0], args[1], args[2]-1)
                ) - 1;
              break;
              case 230: //IntToFloat
                _returnValue = this.floatPointers.push(
                  parseFloat(args[0])
                ) - 1;
              break;
              case 231: //FloatToInt
                _returnValue = this.integerPointers.push(
                  parseInt(args[0])
                ) - 1;
              break;
              case 232: //StringToInt
                _returnValue = this.integerPointers.push(
                  parseInt(args[0])
                ) - 1;
              break;
              case 233: //StringToFloat
                _returnValue = this.floatPointers.push(
                  parseFloat(args[0])
                ) - 1;
              break;
              case 235: //GetIsEnemy
                _returnValue = 0;
              break;
              case 238: //GetPcSpeaker 
                _returnValue = this.objectPointers.push(Game.player) - 1;
              break;
              case 239: //GetStringByStrRef
                _returnValue = this.stringPointers.push(
                  Global.kotorTLK.GetStringById(
                    args[0]
                  )
                ) - 1;
              break;
              case 241: //DestroyObject
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'DestroyObject', args);
                }
                if(args[0] instanceof ModuleObject)
                  args[0].destroy();
              break;
              case 242: //GetModule
                _returnValue = this.objectPointers.push(
                  Game.module
                )-1;
              break;
              case 243: //CreateObject
                //if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'CreateObject', args, _instr);
                //}
                delay = true;
                switch(args[0]){
                  case 1:

                    TemplateLoader.Load({
                      ResRef: args[1],
                      ResType: UTCObject.ResType,
                      onLoad: (gff) => {
              
                        let creature = new ModuleCreature(gff)
                        creature.Load( () => {
                          creature.LoadScripts( () => {
                            creature.LoadModel( (model) => {
                              creature.model.moduleObject = creature;
                              model.translateX(args[2].position.x);
                              model.translateY(args[2].position.y);
                              model.translateZ(args[2].position.z);
                              model.rotation.z = THREE.Math.degToRad(args[2].facing);
                              //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(crt.getXOrientation(), crt.getYOrientation()));
                              model.hasCollision = true;
                              model.name = creature.getTag();
                              model.buildSkeleton();
                              Game.group.creatures.add( model );
                              Game.module.area.creatures.push(creature);
                              creature.getCurrentRoom();

                              _returnValue = this.objectPointers.push(creature) - 1;
                              this.stack.push((_returnValue));

                              resolve({
                                _instr: _instr,
                                seek: seek
                              });

                            });
                          });
                        });

                      },
                      onFail: () => {
                        console.error('Failed to load character template');
                      }
                    });

                  break;
                }
              break;
              case 247://GetUserDefinedEventNumber
                _returnValue = this.integerPointers.push(
                  this.scriptVar
                ) - 1;
              break;
              case 248: //GetSpellId
                _returnValue = 0;
              break;
              case 251: //GetLoadFromSaveGame
                _returnValue = Game.isLoadingSave ? 1 : 0
              break;
              case 253: //GetName
                if(args[0] instanceof ModuleObject){
                  _returnValue = this.stringPointers.push(
                    args[0].getName()
                  ) - 1;
                }else{
                  _returnValue = this.stringPointers.push('') - 1 ;
                }
              break;
              case 262: //GetFirstInPersistentObject
                this.persistentObjectIdx = 0;
                _returnValue = this.objectPointers.push(
                  args[0].objectsInside[this.persistentObjectIdx++]
                ) - 1;
              break;
              case 263: //GetNextInPersistentObject
                _returnValue = this.objectPointers.push(
                  args[0].objectsInside[this.persistentObjectIdx++]
                ) - 1;
              break;
              case 272: //ObjectToString
                if(args[0] instanceof ModuleObject){
                  _returnValue = this.stringPointers.push(
                    args[0].id.toString(16)
                  ) - 1;
                }else{
                  _returnValue = this.stringPointers.push('') - 1 ;
                }
              break;
              case 286: //GetHasSkill
                _returnValue = 0;
              break;
              case 294: //ActionDoCommand
                args[0].script.stack.push((0));
                this.caller.doCommand(
                  args[0].script, //script
                  args[0], //action
                  null, //instruction
                );
              break;
              case 295: //EventConversation
                _returnValue = this.eventPointers.push({
                  name: 'EventUserDefined',
                  value: 0
                }) - 1;
              break;
              case 313: //JumpToLocation
                this.caller.JumpToLocation(args[0]);
              break;
              case 315: //GetSkillRank
                if(args[1] instanceof ModuleCreature){
                  _returnValue = this.integerPointers.push(
                    args[1].getSkillLevel(args[0])
                  ) - 1;
                }else{
                  _returnValue = 0;
                }
              break;
              case 316: //GetAttackTarget
                _returnValue = this.objectPointers.push(
                  undefined
                ) - 1;
              break;
              case 319: //GetDistanceBetween2D
                _returnValue = this.floatPointers.push(
                  new THREE.Vector2( args[0].position.x, args[0].position.y).distanceTo(args[1].position)
                ) - 1;
              break;
              case 324: //SetLocked
                args[0].setLocked(
                  args[1]
                );
              break;
              case 325: //int GetLocked(object oTarget);
                _returnValue = args[0].isLocked() ? 1 : 0;
              break;
              case 335: //GetDistanceToObject2D
                _returnValue = this.floatPointers.push(
                  new THREE.Vector2( this.caller.position.x, this.caller.position.y).distanceTo(args[0].position)
                ) - 1;
              break;
              case 341: //GetClassByPosition

                _returnValue = this.integerPointers.push(0)-1;

                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 342: //GetLevelByPosition
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 343: //GetLevelByClass
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
                _returnValue = this.integerPointers.push(
                  args[1].getClassLevel(
                    args[0]
                  )
                )-1;
              break;
              case 358: //GetGender
                _returnValue = this.integerPointers.push(
                  args[0].getGender()
                )-1;
              break;
              case 361: //GetAttemptedAttackTarget
                _returnValue = this.objectPointers.push(
                  undefined
                ) - 1;
              break;
              case 369: //GetJournalEntry
                _returnValue = 0;
              break;
              case 373: //EffectHealForcePoints
                _returnValue = this.effectPointers.push(
                  {type: 422, amount: args[0] }
                ) - 1;
              break;
              case 375: //GetAttemptedSpellTarget
                _returnValue = this.objectPointers.push(
                  this.caller.lastObjectOpened
                )-1;
              break;
              case 376: //GetLastOpenedBy
                _returnValue = this.objectPointers.push(
                  this.caller.lastObjectOpened
                )-1;
              break;
              case 377: //GetHasSpell
                _returnValue = 0;
              break;
              case 383://ActionForceMoveToObject
                this.objectPointers[0].moveToObject(
                  args[0],
                  args[1],
                  args[2]
                );
              break;
              case 393: //GiveXPToCreature
                args[0].addXP(args[1]);
              break;
              case 394: //SetXP
                args[0].setXP(
                  args[1]
                )
              break;
              case 395: //GetXP
                _returnValue = this.integerPointers.push(
                  args[0].getXP()
                ) - 1;
              break;
              case 396: //IntToHexString
                _returnValue = this.stringPointers.push(
                  '0x'+args[0].toString(16)
                ) - 1;
              break;
              case 397: //GetBaseItemType
                _returnValue = this.integerPointers.push(
                  args[0].getBaseItemId()
                ) - 1;
              break;
              case 409: //GetIsEncounterCreature
                _returnValue = this.integerPointers.push(0)-1;
              break;
              case 412: //ChangeToStandardFaction
                if(args[0] instanceof ModuleObject){
                  args[0].factionID = args[1];
                }
              break;
              case 413: //SoundObjectPlay
                if(args[0] instanceof ModuleSound)
                  args[0].emitter.PlayNextSound();
                else
                  console.error('SoundObjectPlay', 'Object invalid', args);
              break;
              case 443: //GetIsOpen
                if(args[0] instanceof ModuleDoor || args[0] instanceof ModulePlaceable){
                  _returnValue = args[0].isOpen() ? 1 : 0;
                }else{
                  _returnValue = 0;
                }
              break;
              case 445: //IsInConversation
                if(args[0] instanceof ModuleObject){
                  _returnValue = this.integerPointers.push(
                    args[0].isInConversation()
                  ) - 1;
                }else{
                  _returnValue = -1;
                }
              break;
              case 461: //SetDialogPlaceableCamera( int nCameraId )
                Game.InGameDialog.SetPlaceableCamera(args[0]);
              break;
              case 462: //GetSoloMode
                _returnValue = Game.SOLOMODE ? 1 : 0;
              break;
              case 463: //EffectDisguise
                _returnValue = this.effectPointers.push(
                  {type: 62, appearance: args[0] }
                ) - 1;
              break;
              case 489: //GetAttemptedMovementTarget
                _returnValue = this.objectPointers.push(
                  undefined
                ) - 1;
              break;
              case 497: //GetSubRace
                _returnValue = this.integerPointers.push(
                  args[0].getSubRace()
                ) - 1;
              break;
              case 503: //CutsceneAttack
                if(args[0] instanceof ModuleCreature){
                  args[0].actionQueue.push({ 
                    goal: ModuleCreature.ACTION.ANIMATE,
                    animation: Global.kotor2DA.animations.rows[args[1]].name,
                    speed: 1,
                    time: 0
                  });
                }
              break;
              case 505: //SetLockOrientationInDialog
                if(args[0] instanceof ModuleCreature){
                  args[0].lockDialogOrientation = args[1] ? true : false;
                }
              break;
              case 508: //EnableVideoEffect
                console.log('NWScript: '+this.name, 'EnableVideoEffect ', args);
                Game.videoEffect = args[0];
              break;
              case 509: //StartNewModule
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'LOAD MODULE ', args[0], args[1]);
                }
                Game.LoadModule(args[0], args[1]);
              break;
              case 510: //DisableVideoEffect
                console.log('NWScript: '+this.name, 'DisableVideoEffect ', args);
                Game.videoEffect = null;
              break;
              case 517: //ShowTutorialWindow
                Game.InGameConfirm.ShowTutorialMessage(args[0]);
              break;
              case 522: //GetCurrentAction

                if(args[0] == undefined)
                  args[0] = this.objectPointers[0];

                _returnValue = this.integerPointers.push(
                  args[0].getCurrentAction()
                ) - 1;
              break;
              case 524: //GetAppearanceType
                _returnValue = this.integerPointers.push(
                  args[0].getAppearance()['(Row Label)']
                ) - 1;
              break;
              case 548: //GetFirstPC
                //console.log('GetFirstPC', Game.player)
                _returnValue = this.objectPointers.push(Game.player) - 1;
              break;
              case 565: //GetRunScriptVar
                _returnValue = this.integerPointers.push(this.scriptVar)-1;
              break;
              case 575: //RemovePartyMember
                PartyManager.RemoveNPCById(args[0]);
                _returnValue = 0;
              break;
              case 576: //IsObjectPartyMember
                _returnValue = ( PartyManager.party.indexOf(args[0]) > -1 ? 1 : 0 );
              break;
              case 577: //GetPartyMemberByIndex
                //console.log('GetPartyMemberByIndex', PartyManager.party[args[0]], args);
                switch(args[0]){
                  case 0:
                    _returnValue = this.objectPointers.push(PartyManager.party[0]) - 1;
                  break;
                  case 1:
                    _returnValue = this.objectPointers.push(PartyManager.party[1]) - 1;
                  break;
                  case 2:
                    _returnValue = this.objectPointers.push(PartyManager.party[2]) - 1;
                  break;
                  default:
                    _returnValue = this.objectPointers.push(PartyManager.party[0]) - 1;
                  break;
                }
              break;
              case 578: //GetGlobalBoolean 
                //console.log('NWScript: '+this.name, 'GetGlobalBoolean ', args);
                _returnValue = this.integerPointers.push(
                  Game.getGlobalBoolean(
                    args[0],
                  ) ? 1 : 0 
                ) - 1;
              break;
              case 579: //SetGlobalBoolean 
                //console.log('NWScript: '+this.name, 'SetGlobalBoolean ', args);
                Game.setGlobalBoolean(
                  args[0],
                  args[1]
                );
              break;
              case 580 : //GetGlobalNumber 
                //console.log('NWScript: '+this.name, 'GetGlobalNumber ', args);
                _returnValue = this.integerPointers.push(Game.getGlobalNumber(
                  args[0],
                )) - 1;
              break;
              case 581 : //SetGlobalNumber
                //console.log('NWScript: '+this.name, 'SetGlobalNumber ', args); 
                Game.setGlobalNumber(
                  args[0],
                  args[1]
                );
              break;
              case 582: //void AurPostString(string sString, int nX, int nY, float fLife)
                console.log('AurPostString', args[0]);
              break;
              case 679: //GetLocalBoolean
                if(Game.Flags.LogScripts){
                  console.log('GetLocalBoolean', args[1])
                }
                _returnValue = args[0].getLocalBoolean( args[1] ) ? 1 : 0;
              break;
              case 680: //SetLocalBoolean
                args[0].setLocalBoolean(
                  args[1],
                  args[2]
                )
              break;
              case 681: //GetLocalNumber
                _returnValue = this.integerPointers.push(
                  args[0].getLocalNumber(
                    args[1]
                  )
                ) -1;
              break;
              case 682: //SetLocalNumber
                args[0].setLocalNumber(
                  args[1],
                  args[2]
                )
              break;
              case 695: //RemoveAvailableNPC
                PartyManager.RemoveAvailableNPC(args[0]);
                _returnValue = 1;
              break;
              case 696: //IsAvailableCreature
                _returnValue = PartyManager.IsAvailable(args[0]) ? 1 : 0;
              break;
              case 697: //AddAvailableNPCByTemplate
                //Delay because we need to ASYNC load the template object
                //Continue execution on callback
                //console.log('AddAvailableNPCByTemplate '+this.name, args);
                delay = true;
                PartyManager.AddNPCByTemplate(
                  args[0],
                  args[1],
                  () => {
                    //this._RunNextInstruction(_instr, null, onComplete);

                    _returnValue = this.integerPointers.push(1) - 1;
                    this.stack.push((_returnValue));

                    resolve({
                      _instr: _instr,
                      seek: seek
                    });
                  }
                )
              break;
              case 698: //SpawnAvailableNPC

                let partyMember = new ModuleCreature();
                partyMember.setTemplateResRef(
                  Game.getNPCResRefById(args[0])
                );
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'partyMember', partyMember);
                }
                
                Game.module.area.creatures.push(partyMember);
                partyMember.Load( () => {
                  partyMember.LoadEquipment( () => {
                    partyMember.LoadModel( (model) => {
                      console.log('NWScript: '+this.name, 'loaded', model.name);
                      partyMember.position.copy(args[1].position);
                      model.box = new THREE.Box3().setFromObject(model);
                      partyMember.model.moduleObject = partyMember;
                      model.rotation.z = args[1].facing;
                      model.hasCollision = true;
                      Game.group.party.add( model );
                    });
                  });
                });

                _returnValue = this.objectPointers.push(
                  partyMember
                ) - 1;

              break;
              case 699: //IsNPCPartyMember
                _returnValue = this.integerPointers.push(
                  PartyManager.IsNPCInParty(args[0]) ? 1 : 0
                ) - 1;
              break;
              case 701: //GetIsConversationActive
                _returnValue = Game.inDialog ? 1 : 0;
              break;
              case 712: //ShowPartySelectionGUI
                Game.MenuPartySelection.Show(
                  args[0],
                  args[1],
                  args[2]
                );
              break;
              case 713: //GetStandardFaction
                _returnValue = this.integerPointers.push(
                  args[0].getFactionID()
                ) - 1;
              break;
              case 714: //GivePlotXP

              break;
              case 715: //GetMinOneHP
                if(args[0]){
                  _returnValue = args[0].getMinOneHP() ? 1 : 0;
                }
                _returnValue = 0;
              break;
              case 716: //SetMinOneHP
                if(args[0] instanceof ModuleObject){
                  args[0].setMinOneHP(args[1])
                }
              break;
              case 719: //SetGlobalFadeIn
                setTimeout( () => {
                  Game.FadeOverlay.FadeIn(args[1], args[2], args[3], args[4]);
                  if(GameKey == 'TSL'){
                    Game.FadeOverlay.override = false;
                  }
                }, args[0] * 1000);

              break;
              case 720: //SetGlobalFadeOut
                setTimeout( () => {
                  Game.FadeOverlay.FadeOut(args[1], args[2], args[3], args[4]);
                }, args[0] * 1000);
              break;
              case 730: //ActionFollowLeader
                if(this.caller instanceof ModuleCreature) {
                  this.caller.actionQueue.push({ object: Game.player, goal: ModuleCreature.ACTION.FOLLOWLEADER });
                }
              break;
              case 733: //PlayMovie
                console.error('Unhandled script action', _instr.address, action.name, action.args);
                console.log('PlayMovie', args[0]);
                /*delay = true;
                AudioEngine.Mute()
                VideoPlayer.Load(args[0], () => {
                  AudioEngine.Unmute();
                  this._RunNextInstruction(_instr, null, onComplete);
                })**/

              break;
              case 738: //PlayRoomAnimation
                if(Game.Mode == Game.MODES.INGAME){
                  Game.group.rooms.getObjectByName(
                    args[0].toLowerCase()
                  ).playAnimation(
                    args[1] - 1
                  );
                }
              break;
              case 739: //ShowGalaxyMap
                Game.MenuGalaxyMap.Show(args[0]);
              break;
              case 740: //void SetPlanetSelectable(int nPlanet, int bSelectable);
                Planetary.SetPlanetSelectable(args[0],  args[1] ? true : false);
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 741: //int GetPlanetSelectable(int nPlanet);
                _returnValue = Planetary.planets[args[0]].selectable ? 1 : 0;
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 742: //void SetPlanetAvailable(int nPlanet, int bAvailable);
                Planetary.SetPlanetAvailable(args[0],  args[1] ? true : false);
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 743: //int GetPlanetAvailable(int nPlanet);
                _returnValue = Planetary.planets[args[0]].enabled ? 1 : 0;
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 744: //int GetSelectedPlanet();
                _returnValue = this.integerPointers.push(
                  Planetary.planets.indexOf(Planetary.current)
                ) - 1;
                //console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;
              case 759: //NoClicksFor
                //TODO
              break;
              case 760: //HoldWorldFadeInForDialog
                Game.holdWorldFadeInForDialog = true;
              break;
              case 761: //ShipBuild
                _returnValue = 1; //Hardcode this value so the game doesn't enter debug mode
              break;
              case 768: //GetScriptParameter(K2)
                if(GameKey == 'TSL'){
                  _returnValue = this.integerPointers.push(
                    parseInt(this.params[args[0] - 1])
                  ) - 1;
                }else{

                }
              break;
              case 769: //SetFadeUntilScript
                //Game.FadeOverlay.override = true;
                Game.holdWorldFadeInForDialog = true;
              break;
              case 831: //GetScriptStringParameter (K2)
                _returnValue = this.stringPointers.push(
                  this.paramString
                ) - 1;
              break;
              case 844: //GetIsPartyLeader
                if(args[0] instanceof ModuleCreature){
                  if(args[0] == PartyManager.party[0]){
                    _returnValue = 1;
                  }else{
                    _returnValue = 0;
                  }
                }else{
                  _returnValue = 0;
                }
              break;
              case 845: //GetPartyLeader
                _returnValue = this.objectPointers.push(
                  PartyManager.party[0]
                ) - 1;
              break;
              case 851: //GetIsXbox 
                _returnValue = 0;
              break;
              case 866: //RemoveHeartbeat
                if(args[0] instanceof ModuleObject){
                  args[0].scripts.onHeartbeat = '';
                }
              break;
              case 875: //GetIsPlayerMadeCharacter
                _returnValue = args[0] == Game.player ? 1 : 0;
              break;
              default:
                console.error('Unhandled script action', _instr.address, action.name, action.args);
              break;

            }

            if(_returnValue != null){
              //try{
                this.stack.push((_returnValue));
              /*}catch(e){
                console.error('_returnValue', e);
                console.log(_returnValue);
                return;
              }*/
            }else if(!delay && action.type != 'void' && action.type != 'vector'){
              console.log(action, args, this);
              this.stack.push((0));
              console.error('Action '+action.name+' didn\'t return a value');
            }

            break;
          break;
          case 'LOGANDII':

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'LOGANDII', var2, var1);
            }

            if(this.integerPointers[var1] && this.integerPointers[var2]){
              if(Game.Flags.LogScripts){
                console.log('NWScript: '+this.name, 'LOGANDII TRUE', this.integerPointers[var1], this.integerPointers[var2])
              }
              this.stack.push(NWScript.TRUE)//TRUE
            }else{
              if(Game.Flags.LogScripts){
                console.log('NWScript: '+this.name, 'LOGANDII FALSE', this.integerPointers[var1], this.integerPointers[var2])
              }
              this.stack.push(NWScript.FALSE)//FALSE
            }

          break;
          case 'LOGORII':

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'LOGORII', var2, var1);
            }

            if(this.integerPointers[var1] || this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case 'INCORII':

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'INCORII', var2, var1);
            }

            if(this.integerPointers[var1] || this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case 'EXCORII':

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'EXCORII', var2, var1);
            }

            if(this.integerPointers[var1] || this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case 'BOOLANDII':

            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'BOOLANDII', var2, var1);
            }

            if(this.integerPointers[var1] && this.integerPointers[var2])
              this.stack.push(NWScript.TRUE)//TRUE
            else
              this.stack.push(NWScript.FALSE)//FALSE

          break;
          case 'EQUAL':
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'EQUAL', var2, var1, this.stack.peek());
            }

            switch(NWScript.Types[_instr.type]){
              case 'II':
                if(this.integerPointers[var1] == this.integerPointers[var2])
                  this.stack.push((1))//TRUE
                else
                  this.stack.push((0))//FALSE
              break;
              case 'FF':
                if(this.floatPointers[var1] == this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'OO':
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'EQUALOO', var1, var2);
                }
                            
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, this.objectPointers);
                }
                if(this.objectPointers[var1] == this.objectPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'SS':
                if(this.stringPointers[var1] == this.stringPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
            }

          break;
          case 'NEQUAL':
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'NEQUAL', var2, var1);
            }

            switch(NWScript.Types[_instr.type]){
              case 'II':
                if(this.integerPointers[var1] != this.integerPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE

              break;
              case 'FF':
                if(this.floatPointers[var1] != this.floatPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'OO':
                
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'EQUALOO', var1, var2);
                }
                if(this.objectPointers[var1] != this.objectPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
              case 'SS':
                if(this.stringPointers[var1] != this.stringPointers[var2])
                  this.stack.push(NWScript.TRUE)//TRUE
                else
                  this.stack.push(NWScript.FALSE)//FALSE
              break;
            }
          break;
          case 'GEQ':
            var1 = (this.stack.pop());
            var2 = (this.stack.pop());

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
          case 'GT':
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            switch(NWScript.Types[_instr.type]){
              case 'II':
                
                if(Game.Flags.LogScripts){
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
          case 'LT':
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
          case 'LEQ':
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
          case 'SHLEFTII':
            
          break;
          case 'SHRIGHTII':

          break;
          case 'USHRIGHTII':

          break;
          case 'ADD':
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
                newValue = this.floatPointers[var1]+this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.integerPointers[var1]+this.floatPointers[var2];
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
                this.stack.push((var2+var1));
              break;
            }
          break;
          case 'SUB':

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
                newValue = this.floatPointers[var1]-this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.integerPointers[var1]-this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FF':
                newValue = this.floatPointers[var1]-this.floatPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'vv':
                this.stack.push((var2-var1));
              break;
            }

          break;
          case 'MUL':
            
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            newValue = 0;
            if(Game.Flags.LogScripts){
              console.log('MUL', var2, var1);
            }
            switch(NWScript.Types[_instr.type]){
              case 'II':
                newValue = this.integerPointers[var1]*this.integerPointers[var2];
                this.integerPointers.push(newValue);
                this.stack.push((this.integerPointers.length-1));
              break;
              case 'IF':
                newValue = this.floatPointers[var1]*this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.integerPointers[var1]*this.floatPointers[var2];
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
          case 'DIV':
            var2 = (this.stack.pop());
            var1 = (this.stack.pop());

            newValue = 0;

            switch(NWScript.Types[_instr.type]){
              case 'II':
                newValue = this.integerPointers[var1]/this.integerPointers[var2];
                this.integerPointers.push(newValue);
                this.stack.push((this.integerPointers.length-1));
              break;
              case 'IF':
                newValue = this.floatPointers[var1]/this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.integerPointers[var1]/this.floatPointers[var2];
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
          case 'MOD':
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
                newValue = this.floatPointers[var1]%this.integerPointers[var2];
                this.floatPointers.push(newValue);
                this.stack.push((this.floatPointers.length-1));
              break;
              case 'FI':
                newValue = this.integerPointers[var1]%this.floatPointers[var2];
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
          case 'NEG':
            var1 = (this.stack.pop());

            newValue = 0;

            switch(NWScript.Types[_instr.type]){
              case 'I':
                newValue = this.integerPointers[var1] * -1;
                this.stack.push((this.integerPointers.push(newValue)-1));
              break;
              case 'F':
                newValue = this.floatPointers[var1] * -1;
                this.stack.push((this.floatPointers.push(newValue)-1));
              break;
            }
          break;
          case 'COMPI':
            throw 'Unsupported code: COMPI';
          break;
          case 'MOVSP':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'MOVSP', this.stack.pointer)
              console.log('NWScript: '+this.name, 'MOVSP', this.stack.getAtPointer(_instr.offset), this.stack.getPointer());
            }

            //this.stack.setPointer(_instr.offset);
            if(Game.Flags.LogScripts){
              console.log('MOVSP', this.stack.pointer, this.stack.length, _instr.offset, Math.abs(_instr.offset)/4);
            }
            for(let i = 0; i < (Math.abs(_instr.offset)/4); i++){
              //console.log('MOVSP POPING!')
              this.stack.stack.splice((this.stack.pointer -= 4) / 4, 1)[0];
              //this.stack.pop();
            }
            //this.stack.pop();
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'MOVSP', this.stack.getAtPointer(_instr.offset), this.stack.getPointer());
            }
          break;
          case 'STORE_STATEALL':
            //OBSOLETE NOT SURE IF USED IN KOTOR
          break;
          case 'JMP':
            seek = _instr.address + _instr.offset;
          break;
          case 'JSR':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'JSR');
            }
            let pos = _instr.address;
            seek = pos + _instr.offset;
            this.subRoutines.push(_instr.nextInstr.address); //Where to return to after the subRoutine is done

          break;
          case 'JZ':
            let popped = this.integerPointers[(this.stack.pop())];
            if(popped == 0){
              seek = _instr.address + _instr.offset;
            }
          break;
          case 'JNZ': //I believe this is used in SWITCH statements
            let jnzTOS = this.integerPointers[(this.stack.pop())];
            if(Game.Flags.LogScripts){
              console.log('JNZ', jnzTOS, _instr.address + _instr.offset);
            }
            if(jnzTOS != 0){
              seek = _instr.address + _instr.offset;
            }
          break;
          case 'RETN':
            //console.log('RETN', this.subRoutines, this.subRoutines[0]);
            try{
              if(this.subRoutines.length){
                let _subRout = this.subRoutines.pop();
                if(_subRout == -1){
                  if(Game.Flags.LogScripts){
                    console.error('RETN');
                  }
                  seek = null;
                  _instr.eof = true;
                }else{
                  if(Game.Flags.LogScripts){
                    console.log('NWScript: '+this.name, 'RETN', _subRout, this.subRoutines.length);
                  }
                  seek = _subRout; //Resume the code just after our pervious jump
                  if(!seek){
                    if(Game.Flags.LogScripts){
                      console.log('NWScript: seek '+this.name, seek, 'RETN');
                    }
                  }
                }
              }else{
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, 'RETN', 'END')
                }
                let _subRout = this.subRoutines.pop();
                //seek = _subRout;
                _instr.eof = true;
                if(Game.Flags.LogScripts){
                  console.log('NWScript: '+this.name, _instr)
                }
              }
            }catch(e){
              if(Game.Flags.LogScripts){
                console.error('RETN', e);
              }
            }
          break;
          case 'DESTRUCT':

          break;
          case 'NOTI':
            var1 = (this.stack.pop());
          if(this.integerPointers[var1] == 0)
            this.stack.push(NWScript.TRUE)//TRUE
          else
            this.stack.push(NWScript.FALSE)//FALSE
          break;
          case 'DECISP':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'DECISP', this.stack.getAtPointer( _instr.offset));
            }
            var1 = (this.stack.getAtPointer( _instr.offset));
            this.integerPointers[var1] -= 1;
          break;
          case 'INCISP':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'INCISP', this.stack.getAtPointer( _instr.offset));
            }
            var1 = (this.stack.getAtPointer( _instr.offset));
            this.integerPointers[var1] += 1;
          break;
          case 'CPDOWNBP':
            this.stack.replaceBP(_instr.offset, this.stack.peek());
          break;
          case 'CPTOPBP':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'CPTOPBP', _instr);
            }
            let stackBaseEle = this.stack.getAtBasePointer( _instr.pointer );
            this.stack.push( (stackBaseEle) );
          break;
          case 'DECIBP':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'DECIBP', this.stack.getAtBasePointer( _instr.offset));
            }
            var1 = (this.stack.getAtBasePointer( _instr.offset));
            this.integerPointers[var1] -= 1;
          break;
          case 'INCIBP':
            
            if(Game.Flags.LogScripts){
              console.log('NWScript: '+this.name, 'INCIBP', this.stack.getAtBasePointer( _instr.offset));
            }
            var1 = (this.stack.getAtBasePointer( _instr.offset));
            this.integerPointers[var1] += 1;
          break;
          case 'SAVEBP':
            this.stack.saveBP();
            this.currentBlock = 'global';

            this.globalCache = {
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
            };

          break;
          case 'RESTOREBP':
            this.stack.restoreBP();
          break;
          case 'STORE_STATE':

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
            state.script.stack = new NWScriptStack();

            state.script.stack.stack = this.stack.stack.slice();
            state.script.stack.basePointer = this.stack.basePointer;
            state.script.stack.pointer = this.stack.pointer;
            state.script.caller = this.caller;
            state.script.enteringObject = this.enteringObject;
            this.state.push(state);
            state.script.state = this.state.slice();
            
          break;
          case 'NOP':

          break;
          case 'T':

          break;
        }
        
        if(Game.Flags.LogScripts){
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
      console.error(e);
      //return new Promise( (resolve, reject) => {
        resolve({
          _instr: _instr,
          seek: null
        });
      //});
    }

  }

  _RunNextInstruction(_instr, seek = null ){

    if(_instr)
      this.prevByteCode = _instr.code;
    
    if( seek != null ) {
      let __nextInstr = this._getInstructionAtOffset( seek );
      return this._RunInstruction(__nextInstr);
    }

    if(!_instr.eof){
      if(_instr.nextInstr != null){
        return this._RunInstruction(this.instructions[_instr.nextInstr.index]);
      }
    }
        
  }

  _VerifyNCS (reader){
    reader.Seek(0);
    if(reader.ReadChars(8) == 'NCS V1.0')
      return true;

    return false;
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

}

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