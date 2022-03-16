class NWScriptBlock {

  constructor( args = {} ){

    args = Object.assign({
      type: 'JSR',
      address: 0,
      firstInstr: null,
      lastInstr: null,
      instructions: [],
      arguments: [],
      parentBlock: null,
      nwScript: null,
    }, args);

    this.type = args.type;

    this.address = args.address;
    this.firstInstr = args.firstInstr;
    this.instructions = args.instructions;
    this.childBlocks = [];
    this.decompiled = false;
    this.parentBlock = args.parentBlock;
    this.nwScript = args.nwScript;
    this.source = '';

    this.arguments = args.arguments;
    this.argsComplete = false; //Used in the CONDITIONAL blocks to determine if all the conditional args have been accounted for
    this.argCount = 0;

    if(this.type == 'JSR'){
      this.methodType = 'void';
      this.methodName = 'main';
    }

    this.collectingArgs = false;
    this.conditionalGroup = [];

    if(this.type == 'CONDITIONAL')
      this.collectingArgs = true;

  }

  GenerateSubName(_instr){

    if(this.type == 'JSR' || 'StartingConditional'){
      this.methodType = 'void';
      this.methodName = 'main';


      if(_instr.prevInstr != null){
        if(_instr.prevInstr.prevInstr.prevInstr != null){
          if(NWScript.ByteCodes[_instr.prevInstr.prevInstr.prevInstr.code] == 'RSADD' ){
            switch(_instr.prevInstr.prevInstr.prevInstr.type){
              case 3:
                this.methodType = 'int';
              break;
              case 4:
                this.methodType = 'float';
              break;
              case 5:
                this.methodType = 'string';
              break;
              case 6:
                this.methodType = 'object';
              break;
            }

            if(this.parentBlock.parentBlock == null)
              this.methodName = 'StartingConditional';

          }
        }
      }

      if(this.parentBlock != null){

        if(this.parentBlock.parentBlock != null){
          this.methodName = 'sub'+this.nwScript.subIndex++;
        }

      }

    }

  }

  Build(_instr = null) {

    if(_instr == null){
      _instr = this.firstInstr;
      this.GenerateSubName(_instr);
    }

    //console.log('Build', _instr);

    let _nextInstr = _instr.nextInstr;

    let tmpOffset = null;

    switch(NWScript.ByteCodes[_instr.code]){

      case 'RSADD':
        if(this.type != 'RSADD' && NWScript.ByteCodes[_nextInstr.code] != 'JSR' ){
          let rsaddBlock = new NWScriptBlock({
            type: 'RSADD',
            address: _instr.address,
            firstInstr: _instr,
            parentBlock: this,
            nwScript: this.nwScript
          });

          //this.childBlocks.push(rsaddBlock);
          rsaddBlock.Build();
          rsaddBlock.Decompile();
          _instr.block = rsaddBlock;
          _nextInstr = rsaddBlock.exitInstr.nextInstr;
        }
      break;

      case 'ACTION':
        if(this.type == 'JSR' || this.type == 'CONDITIONAL'){
          let _actionInstructions = [];

          if(_instr.argCount){

            for(let i = 0; i < _instr.argCount; i++){
              let argInstr = this.instructions.pop();
              _actionInstructions.push(argInstr)
            }

            _actionInstructions.reverse();

          }

          _actionInstructions.push( _instr )

          let actionBlock = new NWScriptBlock({
            type: 'ACTION',
            address: _actionInstructions[0].address,
            firstInstr: _actionInstructions[0],
            instructions: _actionInstructions,
            parentBlock: this,
            nwScript: this.nwScript
          });

          //console.log('ACTIONBLOCK', actionBlock);

          actionBlock.Decompile();

          //this.childBlocks.push(actionBlock);
          _instr.block = actionBlock;
        }
      break;

      case 'MOVSP':
        if(this.type == 'RSADD'){
          this.exitInstr = _instr;
          return;
        }
      break;

      //Condition candidates for starting a new Condition Block
      case 'EQUAL':
      case 'NEQUAL':
      case 'LEQ':
      case 'LT':
      case 'GEQ':
      case 'GT':
        if(this.type != 'CONDITIONAL' || this.argsComplete){

          //JZ's mark the location to the next "else if" or "else" block, or the end of the statement chain
          //JMP's are the end of the current if statement

          let _conditionArguments = [];

          for(let i = 0; i < 2; i++){
            _conditionArguments.push(this.instructions.pop())
          }

          console.log('Condition Args', _conditionArguments);

          _conditionArguments.reverse();

          //Create a new CONDITIONAL block
          let conditionalBlock = new NWScriptBlock({
            type: 'CONDITIONAL',
            address: _instr.address,
            firstInstr: _instr,
            arguments: _conditionArguments,
            parentBlock: this,
            nwScript: this.nwScript
          });

          //Add this block to the current instruction
          _instr.block = conditionalBlock;
          //Add this instruction to the current list because the build process will stop adter this switch statement
          this.instructions.push( _instr );

          //Build out this block
          conditionalBlock.Build();

          //Check to see if this CONDITIONAL block is related to any potential previous one
          let __prevInstr = this.instructions[this.instructions.length - 2];

          if(__prevInstr.block != undefined){
            if(__prevInstr.block.type == 'CONDITIONAL'){
              if(__prevInstr.block.jmpOffset == conditionalBlock.jmpOffset){
                conditionalBlock.elseOf = __prevInstr.block;
              }
            }
          }

          //Decompile the block into pseudo code
          conditionalBlock.Decompile();

          //Start a new Build process from the last instruction of the CONDITIONAL block
          this.Build( _instr = conditionalBlock.exitInstr.nextInstr );
          console.log('CONDITIONAL', conditionalBlock, _instr);

          //Return because this build process contains instructions that are now inside the CONDITIONAL block and a new process has be initiated
          return;

        }

      break;
      case 'JMP':
        //JMP's also appear after store_states which should be treated as methods to be called by an action
        if(this.type == 'CONDITIONAL'){

          this.jmpOffset = ( _instr.address + 6 + _instr.offset );

          this.exitInstr = _instr;
          _nextInstr = null;
        }
      break;
      case 'JZ':
        if(this.type == 'CONDITIONAL'){
          let jzToIntsr = this.nwScript._getInstructionAtOffset( _instr.address + _instr.offset );

          console.log('JZ', jzToIntsr.instr);

          //Check to see if this is the end of the arguments section of the IF statement
          if(NWScript.ByteCodes[jzToIntsr.instr.prevInstr.code] == 'JMP'){
            console.log(NWScript.ByteCodes[jzToIntsr.instr.prevInstr.code], jzToIntsr)
            console.log('JZ -> JMP');
            this.jzOffset = ( _instr.address + _instr.offset );
            this.argsComplete = true;
          }

          //this.jzOffset = ( _instr.address + _instr.offset );

        }
      break;
      case 'JSR':

        tmpOffset = _instr.address + _instr.offset;
        let jsrBlock;

        if(typeof this.nwScript.blockCache[tmpOffset] == 'undefined'){

          let jsrInstr = this.nwScript._getInstructionAtOffset( tmpOffset );

          jsrBlock = new NWScriptBlock({
            type: 'JSR',
            address: jsrInstr.instr.address,
            firstInstr: jsrInstr.instr,
            parentBlock: this,
            nwScript: this.nwScript
          });

          // If we are anywhere other than the GLOBAL space then we need to push
          // this instruction back to the global space so it can be decompiled there
          // during the decompiling phase. we will only need to reference it in this block
          // with something like someFunction(arg1, arg2);
          if(this.parentBlock != null){
            //console.log('ParentBlock', this.getRootBlock(), this.getRootBlock().instructions);
            this.getRootBlock().instructions.push( _instr );
          }else{

          }

          //this.childBlocks.push(jsrBlock);
          jsrBlock.Build();
          jsrBlock.arguments = [];

          let jsrArgTest = jsrBlock.getLastInstr();
          if(NWScript.ByteCodes[jsrArgTest.code] == 'MOVSP' && this.parentBlock != null){
            jsrBlock.argCount = Math.abs(jsrArgTest.offset) / 4;
            let _jsrArguments = [];
            if(jsrBlock.argCount){
              for(let i = 0; i <jsrBlock.argCount; i++){
                let jsrArgInstr = this.instructions[this.instructions.length - 1];

                //If the arg hasn't reserved a spot we need to remove it
                if(NWScript.ByteCodes[jsrArgInstr.code] != 'RSADD'){
                  //console.log('POP BLOCK', this);
                  jsrArgInstr = this.instructions.pop();
                  //console.log('JSR Arg', jsrArgInstr)
                }

                jsrArgInstr.argType = 'int';
                jsrArgInstr.argName = 'arg'+(this.nwScript.argIndex++);

                jsrBlock.arguments.push(jsrArgInstr)
              }
              jsrBlock.arguments.reverse();
            }
          }

          this.nwScript.blockCache[tmpOffset] = jsrBlock;
          jsrBlock.Decompile();

          //jsrBlock.Decompile();

        }else{
          jsrBlock = this.nwScript.blockCache[tmpOffset];
        }

        _instr.block = jsrBlock;

      break;
      case 'RETN':
        //this.Decompile();
        //console.log('RETN', _instr.address);

        return;
      break;

      case 'SAVEBP':
        this.nwScript.stack.saveBP();
			break;
      case 'RESTOREBP':
        this.nwScript.stack.restoreBP();
			break;
      case 'STORE_STATE':
        this.nwScript.stack.storeState(_instr.bpOffset, _instr.spOffset);
        //console.log('STORE_STATE')
        //Get the JMP instruction and set this block to continue from the offset
        //it is pointing to after the STORE_STATE is done
        _nextInstr = this.nwScript._getInstructionAtOffset(_instr.nextInstr.address + _instr.nextInstr.offset).instr;

        let ssBlock = new NWScriptBlock({
          type: 'STORE_STATE',
          address: _instr.nextInstr.address,
          firstInstr: _instr.nextInstr,
          parentBlock: this,
          nwScript: this.nwScript
        });

        //this.childBlocks.push( ssBlock );
        ssBlock.Build( );
        ssBlock.Decompile( );

        _instr.block = ssBlock;

			break;

    }

    this.instructions.push( _instr );

    if( _nextInstr != null )
      this.Build( _nextInstr );

  }

  Decompile(){
    if(!this.decompiled){
      this.decompiled = true;

      if(this.type == 'STORE_STATE'){
        this.DecompileActionBlock( this.instructions.length - 1 );
      }else if(this.type == 'RSADD'){
        this.DecompileRSADDBlock();
      }else if(this.type == 'ACTION'){
        this.DecompileActionBlock( this.instructions.length - 1 );
        this.source += ';\n';
    }else if(this.type == 'CONDITIONAL'){

          let blockInstrs = [];
          let instrsLen = this.instructions.length;
          let argsComplete = false;

          //Separate the rest of the conditional arguments from the block instructions

          for(let i = 0; i < instrsLen; i++){
            let _instr = this.instructions[i];

            if(NWScript.ByteCodes[_instr.code] == 'JZ'){
              if(_instr.address + _instr.offset == this.jzOffset){
                argsComplete = true;
              }
            }

            if(NWScript.ByteCodes[_instr.code] != 'JZ'){
              if(argsComplete){
                blockInstrs.push(_instr)
              }else{
                if( (NWScript.ByteCodes[_instr.code] != 'CPTOPSP') || (_instr.isArg == true) )
                  this.arguments.push(_instr);
                
              }
            }

          }

          if(typeof this.elseOf != 'undefined'){
            this.source += 'else ';
          }

          this.source += 'if( ' + this.DecompileConditionalBlockArgs() + ' ) {\n';


          this.instructions = blockInstrs;
          
          //Loop through the rest of the block instructions and output their pseudo code
          $.each(this.instructions, (i, _instr) => {
            if(typeof _instr.block != 'undefined'){

              if(_instr.block.decompiled)
                this.source += _instr.block.source ;

            }else{
              //alert('block undefined');
            }
          });

          this.source += '}\n';

      }else if(this.type == 'JSR'){

        if(this.parentBlock == null){

          $.each(this.instructions, (i, _instr) => {
            if(typeof _instr.block != 'undefined'){

              if(_instr.block.decompiled)
                this.source += _instr.block.source ;

            }
          });

        }else{

          console.log('arg test', this);

          //Parse ARGS
          let argStrArr = [];
          if(this.argCount){
            for(let i = 0; i < this.argCount; i++) {
              let _arg_instr = this.arguments[ this.arguments.length - (i + 1) ];
              argStrArr[i] = this.argumentParser(_arg_instr);
              //alert(_arg_instr);
            }
          }

          this.source += this.methodType+' '+this.methodName+' (' + argStrArr.join(', ') + ') {\n';
          $.each(this.instructions, (i, _instr) => {
            argStrArr = [];
            if(typeof _instr.block != 'undefined'){

              if(NWScript.ByteCodes[_instr.code] == 'JSR'){

                if(_instr.block.argCount){
                  for(let i = 0; i < _instr.block.argCount; i++) {
                    let _arg_instr = _instr.block.arguments[ _instr.block.arguments.length - (i + 1) ];
                    argStrArr[i] = _instr.block.argumentParser(_arg_instr, true);
                  }
                }

                this.source += _instr.block.methodName+' (' + argStrArr.join(', ') + ');\n';
              }else if(_instr.block.decompiled) {
                this.source += _instr.block.source ;
              }

            }
          });
          this.source += '}\n';
        }

      }
    }
  }

  DecompileRSADDBlock(){
    $.each(this.instructions, (i, _instr) => {

      switch(NWScript.ByteCodes[_instr.code]){
        case 'RSADD':

          //Test for a JSR
          if( this.getInstrByByteCode(30) ){
            switch(_instr.type){
              case 3:
                this.source = 'int ';
              break;
              case 4:
                this.source = 'float ';
              break;
              case 5:
                this.source = 'string ';
              break;
              case 6:
                this.source = 'object ';
              break;
            }
          }else{
            switch(_instr.type){
              case 3:
                this.source = 'int '+ _instr.variable.name+' = '+_instr.variable.value+';\n';
              break;
              case 4:
                this.source = 'float '+ _instr.variable.name+' = '+_instr.variable.value+';\n';
              break;
              case 5:
                this.source = 'string '+ _instr.variable.name+' = "'+_instr.variable.value+'";\n';
              break;
              case 6:
                this.source = 'object '+ _instr.variable.name+' = ';
                //If this is an object we ne to branch off and handle this variable differently
                this.DecompileRSADDOBlock();
                this.source += ';\n';
              break;
            }
          }
          return;
        break;
      }

    });
  }

  DecompileRSADDOBlock() {
    this.DecompileActionBlock( this.instructions.length - 2 );
  }

  DecompileActionBlock( actionIndex ){
    let actionInstr = this.instructions[ actionIndex ];
    this.source += this.nwScript.Definition.Actions[actionInstr.action];

    let argInstrs = [];
    //Parse ARGS
    let argStrArr = [];

    for(let i = 0; i < actionInstr.argCount; i++) {
      let _arg_instr = this.instructions[ actionIndex - ( i + 1 ) ];
      argStrArr[i] = this.argumentParser(_arg_instr);
      argInstrs.push( _arg_instr );
    }

    let source = '(' + argStrArr.join(', ') + ')';
    //console.log('DecompileActionBlock', source);
    this.source += source;
  }

  DecompileConditionalBlockArgs() {
    let args = this.arguments.slice(0);
    let argsLen = args.length;
    let source = '';

    let conditions = [];

    console.log('DecompileConditionalBlockArgs', args);

    while(args.length > 0){

      let argGroup = [];
      let _arg = null;

      argGroup.push( args.shift() );
      console.log('argGroup', argGroup[0])
      if(NWScript.ByteCodes[argGroup[0].code] == 'LOGANDII' || NWScript.ByteCodes[argGroup[0].code] == 'LOGORII' ){

        _arg = argGroup.shift();

        argGroup.push( conditions.pop() );
        argGroup.push( conditions.pop() );

        console.log('LOGAND || LOGOR Found', _arg, argGroup)

      }else{
        argGroup.push( args.shift() );
        console.log('argGroup', argGroup[1])
        _arg = args.shift();

        console.log('EQUAL Found', _arg, argGroup)
      }

      switch(NWScript.ByteCodes[_arg.code]){

        case 'EQUAL':

          argGroup[0] = this.argumentParser( argGroup[0], true );
          argGroup[1] = this.argumentParser( argGroup[1], true );

          console.log('argGroup', argGroup, argGroup[0], argGroup[1]);

          _arg.source = '(' + argGroup.join(' == ') + ')';

          conditions.push(_arg);

          console.log('EQUAL', _arg.source );

        break;
        case 'LOGANDII':

          argGroup[0] = argGroup[0].source;
          argGroup[1] = argGroup[1].source;

          _arg.source = ' (' + argGroup.join(' && ') + ') ';

          conditions.push(_arg);

          console.log('LOGANDII', _arg.source );
        break;
        case 'LOGORII':

          argGroup[0] = argGroup[0].source;
          argGroup[1] = argGroup[1].source;

          _arg.source = '(' + argGroup.join(' || ') + ')';

          conditions.push(_arg);

          console.log('LOGOR', _arg.source );
        break;
        default:
          console.log('UNKNOWN', _arg, argGroup );
        break;

      }

    }

    return conditions[0].source;

  }

  argumentParser(_arg_instr, pushingArgs = false){

    console.log('argumentParser', _arg_instr)

    if(this.arguments.indexOf(_arg_instr) > -1 && !pushingArgs){
      return _arg_instr.argType+' '+_arg_instr.argName;
    }else{

      if(NWScript.ByteCodes[_arg_instr.code] == 'CPTOPSP'){

        if(typeof _arg_instr.dataOffset != 'undefined'){
          try{
            return this.nwScript.varList[_arg_instr.dataOffset].name;
          }catch(e){
            switch(_arg_instr.data._instr.type){
              case 3:
                return _arg_instr.data._instr.integer;
              break;
              case 4:
                return _arg_instr.data._instr.float;
              break;
              case 5:
                return '"'+_arg_instr.data._instr.string+'"';
              break;
              case 6:
                return _arg_instr.data._instr.object;
              break;
            }
          }
        }else if(_arg_instr.data._instr == null){
          return 0;
        }else if( typeof _arg_instr.data._instr.variable != 'undefined') {
          return _arg_instr.data._instr.variable.name;
        }else{
          switch(_arg_instr.data._instr.type){
            case 3:
              return _arg_instr.data._instr.integer;
            break;
            case 4:
              return _arg_instr.data._instr.float;
            break;
            case 5:
              return '"'+_arg_instr.data._instr.string+'"';
            break;
            case 6:
              return _arg_instr.data._instr.object;
            break;
          }
        }

      }else if(NWScript.ByteCodes[_arg_instr.code] == 'CONST'){
        switch(_arg_instr.type){
          case 3:
            return _arg_instr.integer;
          break;
          case 4:
            return _arg_instr.float;
          break;
          case 5:
            return '"'+_arg_instr.string+'"';
          break;
          case 6:
            if(_arg_instr.object == 0)
              return 'OBJECT_SELF';
            else
              return _arg_instr.object;
          break;
        }
      }else if(NWScript.ByteCodes[_arg_instr.code] == 'ACTION'){
        return _arg_instr.decompiled;
      }else if(NWScript.ByteCodes[_arg_instr.code] == 'STORE_STATE'){
        return _arg_instr.block.source;
      }else{
        return 0;
      }
    }
  }

  getRootBlock(block = null){

    if(block == null)
      block = this;

    if(block.parentBlock == null)
      return this.parentBlock;
    else
      return this.getRootBlock(this.parentBlock);

  }

  getLastInstr(){
    return this.instructions[this.instructions.length - 1];
  }

  getInstrByByteCode(bytecode = 0){
    this.instructions.forEach((_instr, i) => {
      if(_instr.code == bytecode)
        return _instr;
    });
    return false;
  }

  getInstrsByByteCode(bytecode = 0){
    let _instrs = [];
    this.instructions.forEach((_instr, i) => {
      if(_instr.code == bytecode)
        _instrs.push(_instr);
    });
    return _instrs;
  }

}

NWScriptBlock.Type = {
  UNKNOWN: 0,
  VOID: 1,
  INT: 2
}

module.exports = NWScriptBlock;
