class NWScriptDecompiler {

  constructor(){

    

  }


  static Decompile(script = undefined){

    console.log('NWScriptDecompiler', 'Decompile Begin');

    let globalScope = {
      type: 'global',
      nodes: []
    };

    let state = {
      stack: {
        base_pointer: 0,
        pointer: 0,
        stack: []
      },
      variableCounter: {
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        16: 0,
        17: 0,
        18: 0,
        19: 0
      },
      subroutineCounter: 0,
      global: globalScope,
      globals: [],
      subroutines: {},
      scopes: [],
      currentScope: undefined,
      isCompleted: false,
      script: script,
      addScope: function(scope){
        console.log('addScope', scope);
        this.scopes.push(scope);
        this.currentScope = scope;
      },
      popScope: function(){
        //Pop the current scope of the scope stack
        let popped = this.scopes.pop();
        this.currentScope.returned = true;
        
        console.log('popScope', popped);
        let stackIndex = this.stack.stack.length;
        while(stackIndex--){
          if(this.stack.stack[stackIndex].scope == popped){
            console.log('popScope cleaing', popped);
            this.stack.stack.splice(stackIndex, 1);
            this.stack.pointer -= 4;
          }
        }

        if(this.scopes.length){
          this.currentScope = this.scopes[this.scopes.length - 1];
        }
      },
      getTopSubroutineScope: function(){
        if(this.scopes.length){
          let scope_length = this.scopes.length - 1;
          let scope = this.scopes[scope_length];
          while(scope){
            if(scope.type == 'subroutine'){
              return scope;
            }
            scope = this.scopes[--scope_length];
          }
        }
        return undefined;
      },
      isStackElementOutsideScope: function(stackElement = undefined){
        let index = this.stack.stack.indexOf(stackElement);
        if(index >= 0){
          index *= 4;
          let currentSubroutineScope = this.getTopSubroutineScope();
          if(index < currentSubroutineScope.initialStackPointer){
            return true;
          }else{
            return false;
          }
        }
        throw 'StackElement is not currently on the stack. Has it already popped?';
      }
    };

    state.addScope(globalScope);

    if(state.script instanceof NWScriptInstance){

      //Get the first script instruction
      let instruction = state.script.instructions.values().next().value;

      //Test to see if the NWScript returns a value
      state.isConditionalScript = (instruction.code == 0x02) ? true : false;

      //Begin Script Instruction Decompile
      while(typeof instruction !== 'undefined'){
        instruction = NWScriptDecompiler.DecompileBlockInstruction(state, instruction);
      }

    }

    console.log('NWScriptDecompiler', 'Decompile End');
    console.log(state);
    console.log(state.global.nodes);

    NWScriptDecompiler.toNSS(state);
    return state;

  }

  static DecompileBlockInstruction(state = undefined, instruction = undefined){
    let seek = undefined;
    let variable = undefined;
    let args = [];
    let type = undefined;
    console.log('DecompileBlockInstruction', instruction);
    state.instruction = instruction;
    try{
      switch(instruction.code){
        case 0x01: //CPDOWNSP
          NWScriptDecompiler.DecompileCPDOWNSP(state);
        break;
        case 0x02: //RSADD
          variable = {
            type: 'variable',
            vartype: instruction.type,
            name: '',
            value: undefined,
            isGlobal: false
          };

          switch(variable.vartype){
            case 3:
              variable.name = 'i_'+(++state.variableCounter[variable.vartype]);
            break;
            case 4:
              variable.name = 'f_'+(++state.variableCounter[variable.vartype]);
            break;
            case 5:
              variable.name = 's_'+(++state.variableCounter[variable.vartype]);
            break;
            case 6:
              variable.name = 'o_'+(++state.variableCounter[variable.vartype]);
            break;
            case 16:
              variable.name = 'effect_'+(++state.variableCounter[variable.vartype]);
            break;
            case 17:
              variable.name = 'event_'+(++state.variableCounter[variable.vartype]);
            break;
            case 18:
              variable.name = 'location_'+(++state.variableCounter[variable.vartype]);
            break;
            case 19:
              variable.name = 'talent_'+(++state.variableCounter[variable.vartype]);
          };

          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: variable
          });

          state.stack.pointer += 4;

          state.currentScope.nodes.push(variable);
        break;
        case 0x03: //CPTOPSP
          NWScriptDecompiler.DecompileCPTOPSP(state);
        break;
        case 0x04: //CONST
          variable = {
            type: 'const',
            vartype: instruction.type,
            name: 'const',
            value: undefined
          };

          switch(variable.vartype){
            case 3:
              variable.value = instruction.integer;
            break;
            case 4:
              variable.value = instruction.float;
            break;
            case 5:
              variable.value = instruction.string;
            break;
            case 6:
              variable.value = instruction.object;
            break;
          }
          
          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: variable,
            possibleJSRArgument: true
          });

          state.stack.pointer += 4;
          //state.currentScope.nodes.push(variable);

        break;
        case 0x05: //ACTION

          //args = state.currentScope.nodes.splice(-instruction.argCount, instruction.argCount);
          //Pop the arguments off the stack
          for(let i = 0; i < instruction.argCount; i++){
            args.unshift(state.stack.stack.pop().value);
            //state.stack.stack.pop();
            state.stack.pointer -= 4;
          }

          let action = undefined;
          if(GameKey == 'TSL'){
            action = NWScriptDefK2.Actions[instruction.action];
          }else{
            action = NWScriptDefK1.Actions[instruction.action];
          }

          if(typeof action === 'undefined'){
            throw 'Failed to find action: '+instruction.action;
          }
          
          //Check to see if the action returns a value
          if(action.type){
            state.stack.stack.push({
              type: instruction.type,
              scope: state.currentScope,
              value: {
                type: 'action',
                action: action,
                args: args
              }
            });
            state.stack.pointer += 4;
          }else{
            state.currentScope.nodes.push({
              type: 'action',
              action: action,
              args: args
            });
          }

        break;
        case 0x1B: //MOVSP
          //console.log('MOVSP', instruction.offset);
          for(let i = 0; i < Math.abs(instruction.offset/4); i++){

            //Sometimes we will encounter MOVSP commands that shouldn't be executed.
            //For instance after a conditional block you may encounter some MOVSP commands
            //that are there for clean up purposes if the condition didn't execute.
            //Since all code paths are executed and not skipped these should be ignored.
            //That is why all stack elements keep track of the scope they were created in.
            //Which means if a MOVSP command is trying to execute on a stack element from another scope it should be skipped

            let peekStackElement = state.stack.stack[state.stack.stack.length - 1];
            if(!(typeof peekStackElement == 'undefined') && peekStackElement.scope == state.currentScope){
              let stackElement = state.stack.stack.pop();
              state.stack.pointer -= 4;
              console.log('MOVSP', 'POP!', stackElement.value?.name, stackElement);
              if(stackElement.value){
                //Trying to find a good way of generating nodes that are not being added to the node list
                if(stackElement.value.type == 'inci' || stackElement.value.type == 'deci'){
                  state.currentScope.nodes.push(stackElement.value);
                }
              }
              //state.currentScope.nodes.pop();
            }else{
              console.log('MOVSP', 'Out Of Scope!', peekStackElement);
            }
          }
        break;
        case 0x1D: //JMP
          seek = NWScriptDecompiler.DecompileJMP(state);
        break;

        /*
        * Comparative Operators
        */

        case 0x06: //LOGAND
        case 0x07: //LOGOR
        case 0x08: //INCOR
        case 0x09: //EXCOR
        case 0x0A: //AND
        case 0x0B: //EQUAL
        case 0x0C: //NEQUAL
        case 0x0D: //GEQ
        case 0x0E: //GT
        case 0x0F: //LT
        case 0x10: //LEQ

          //Pop the arguments off the stack
          for(let i = 0; i < 2; i++){
            let stackElement = state.stack.stack.pop();
            NWScriptDecompiler.DecompileCommandArgument(state, stackElement);
            args.unshift(stackElement.value);
            state.stack.pointer -= 4;
          }

          switch(instruction.code){
            case 0x06:
              type = 'logand';
            break
            case 0x07:
              type = 'logor';
            break
            case 0x08:
              type = 'incor';
            break
            case 0x09:
              type = 'excor';
            break
            case 0x0A:
              type = 'and';
            break
            case 0x0B:
              type = 'equal';
            break
            case 0x0C:
              type = 'nequal';
            break
            case 0x0D:
              type = 'geq';
            break
            case 0x0E:
              type = 'gt';
            break
            case 0x0F:
              type = 'lt';
            break
            case 0x10:
              type = 'leq';
            break
            default:
              throw 'Unhandled comparative operator';
          }

          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: type,
              conditional: true,
              args: args
            }
          });

          state.stack.pointer += 4;

        break;

        /*
        * Math Operators
        */

        case 0x11: //SHLEFTII
        case 0x12: //SHRIGHTII
        case 0x13: //USHRIGHTII
        case 0x14: //ADD
        case 0x15: //SUB
        case 0x16: //MUL
        case 0x17: //DIV
        case 0x18: //MOD

          //Pop the arguments off the stack
          for(let i = 0; i < 2; i++){
            let stackElement = state.stack.stack.pop();
            NWScriptDecompiler.DecompileCommandArgument(state, stackElement);
            args.unshift(stackElement.value);
            state.stack.pointer -= 4;
          }

          switch(instruction.code){
            case 0x11:
              type = 'shleft';
            break
            case 0x12:
              type = 'shright';
            break
            case 0x13:
              type = 'ushright';
            break
            case 0x14:
              type = 'add';
            break
            case 0x15:
              type = 'sub';
            break
            case 0x16:
              type = 'mul';
            break
            case 0x17:
              type = 'div';
            break
            case 0x18:
              type = 'mod';
            break
            default:
              throw 'Unhandled comparative operator';
          }

          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: type,
              math: true,
              args: args
            }
          });

          state.stack.pointer += 4;

        break;

        case 0x19: //NEG
          //Pop the arguments off the stack
          for(let i = 0; i < 1; i++){
            let stackElement = state.stack.stack.pop();
            NWScriptDecompiler.DecompileCommandArgument(state, stackElement);
            args.unshift(stackElement.value);
            state.stack.pointer -= 4;
          }

          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: 'neg',
              math: true,
              args: args
            }
          });

          state.stack.pointer += 4;
        break;

        case 0x22: //NOTI
          //Pop the arguments off the stack
          for(let i = 0; i < 1; i++){
            let stackElement = state.stack.stack.pop();
            NWScriptDecompiler.DecompileCommandArgument(state, stackElement);
            args.unshift(stackElement.value);
            state.stack.pointer -= 4;
          }

          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: 'not',
              math: true,
              args: args
            }
          });

          state.stack.pointer += 4;
        break;

        case 0x23: //DECISP
          //Pop the arguments off the stack
          for(let i = 0; i < 1; i++){
            let stackElement = state.stack.stack.pop();
            NWScriptDecompiler.DecompileCommandArgument(state, stackElement);
            args.unshift(stackElement.value);
            state.stack.pointer -= 4;
          }

          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: 'deci',
              math: true,
              args: args
            }
          });

          state.stack.pointer += 4;
        break;

        case 0x24: //INCISP
          //Pop the arguments off the stack
          for(let i = 0; i < 1; i++){
            let stackElement = state.stack.stack.pop();
            NWScriptDecompiler.DecompileCommandArgument(state, stackElement);
            args.unshift(stackElement.value);
            state.stack.pointer -= 4;
          }

          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: 'inci',
              math: true,
              args: args
            }
          });

          state.stack.pointer += 4;
        break;

        case 0x1E: //JSR
          state.currentScope.nodes.push(
            NWScriptDecompiler.DecompileSubroutine(state, instruction.address + instruction.offset)
            //state.subroutines[instruction.address + instruction.offset]
          );
        break;
        case 0x1F: //JZ
          //DecompileConditional will only return a valid value if it detects a conditional block
          seek = NWScriptDecompiler.DecompileConditional(state);
        break;
        case 0x1F: //JZ
          //DecompileConditional will only return a valid value if it detects a conditional block
          seek = NWScriptDecompiler.DecompileConditional(state);
        break;
        case 0x2C: //STORE_STATE
          //state.currentScope.nodes.push(
            NWScriptDecompiler.DecompileStoreState(state, instruction.nextInstr.nextInstr.address)
          //); 
        break;
        case 0x20: //RETN
          state.popScope();
        break;
        case 0x25:
          state.stack,stack.pop();
          state.stack.pointer -= 4;
        break;

        /*
        * Base Pointer
        */

        case 0x26: //CPDOWNBP
          NWScriptDecompiler.DecompileCPDOWNBP(state);
        break;
        case 0x27: //CPTOPBP
          NWScriptDecompiler.DecompileCPTOPBP(state);
        break;
        case 0x28: //DECIBP
          console.log('DECIBP', state.stack.stack[(state.stack.base_pointer + instruction.offset) / 4], state.stack.stack[state.stack.stack.length - 1]);
          
          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: 'vardec',
              math: true,
              variable: state.stack.stack[(state.stack.base_pointer + instruction.offset) / 4].value
            }
          });
          state.stack.pointer += 4;
          state.currentScope.nodes.push(state.stack.stack[state.stack.stack.length-1].value);
        break;
        case 0x29: //INCIBP
          console.log('INCIBP', state.stack.stack[(state.stack.base_pointer + instruction.offset) / 4], state.stack.stack[state.stack.stack.length - 1]);
          state.stack.stack.push({
            type: instruction.type,
            scope: state.currentScope,
            value: {
              type: 'varinc',
              math: true,
              variable: state.stack.stack[(state.stack.base_pointer + instruction.offset) / 4].value
            }
          });
          state.stack.pointer += 4;
          state.currentScope.nodes.push(state.stack.stack[state.stack.stack.length-1].value);
        break;
        case 0x2A: //SAVEBP

          //Mark all current variables in the stack as globals
          for(let i = 0; i < state.stack.stack.length; i++){
            let stackElement = state.stack.stack[i];
            //Make sure the variable isn't the return value for a conditional script
            if(stackElement.value && stackElement.value.type == 'variable' && !stackElement.value.isStartingConditional){
              stackElement.value.isGlobal = true;
              //state.globals.push(stackElement.value);
            }
          }

          //move all the global assignment nodes to the globals list
          state.globals = state.currentScope.nodes.splice(0, state.currentScope.nodes.length);

          state.currentScope.isGlobalWrapper = true;

          state.stack.old_base_pointer = state.stack.base_pointer;
          state.stack.base_pointer = state.stack.pointer;
        break;
        case 0x2B: //RESTOREBP
          state.stack.base_pointer = state.stack.old_base_pointer;
        break;
        default:
          throw 'Unhandled Instruction!';
      }
    }catch(e){
      console.error(e);
    }
    state.lastInstruction = instruction;

    //If the current instruction is a RETN, return undefined so the block's while loop will end
    if(instruction.code == 0x20){
      return undefined;
    }

    if(typeof seek !== 'undefined'){
      return state.script.instructions.get(seek);
    }

    //Or return the next instruction
    return instruction.nextInstr;

  }

  static DecompileCPDOWNSP(state = undefined){
    let copyFrom = state.stack.stack[state.stack.stack.length - 1];
    let copyTo = state.stack.stack[state.stack.stack.length + (state.instruction.offset / 4)];

    console.log('CPDOWNSP', copyTo, copyFrom, state.stack.pointer, state.instruction.offset, state.stack.base_pointer);
    
    //Check to see if we are assigning a subroutine to a variable. If so remove the subroutine node from the node list, 
    //and replace the RSADD node value for the subroutine with a reference to the subroutine itself.
    if(copyFrom.value.type == 'variable' && (typeof copyFrom.JSR != 'undefined')){
      console.log('assign jsr to variable', copyFrom, copyTo);
      //Assigning JSR to a variable reference like: int iValue = someJSR();
      let varIndex = state.currentScope.nodes.indexOf(copyFrom.value);
      if(varIndex >= 0){
        //Remove the variable node from the node list
        state.currentScope.nodes.splice(varIndex, 1);
        //Replace the RSADD with a reference to the subroutine
        copyFrom.value = copyFrom.JSR;
      }

      let jsrIndex = state.currentScope.nodes.indexOf(copyFrom.JSR);
      if(jsrIndex >= 0){
        //Remove the subroutine reference from the node list
        state.currentScope.nodes.splice(jsrIndex, 1);
      }
    }

    //Push an assignment node the the current scopes node list
    state.currentScope.nodes.push({
      type: 'assignment',
      variable: copyTo.value,
      value: copyFrom.value
    });
    
    if(copyTo.value.type == 'variable'){

      //Check to see if we are assigning the current value to a variable outside of our current scope
      //If so this should be the return value for the current subroutine
      if(state.isStackElementOutsideScope(copyTo)){
        //This has got to be the RSADD for the current JSR
        let jsrScope = state.getTopSubroutineScope();
        jsrScope.returnType = copyTo.type;
        jsrScope.returnTarget = copyTo;
        copyTo.JSR = jsrScope;
        console.log('CPDOWNSP.JSR Return', jsrScope, copyTo, copyFrom);

        //Remove the assignment node because we are going to turn it into a return node
        state.currentScope.nodes.pop();

        //Push the return node to the node list
        state.currentScope.nodes.push({
          type: 'return',
          value: copyFrom.value
        });
      }

      copyTo.value.assigned = true;
    }

    //This value is no longer a candidate to be an argument for a subroutine because it is being assigned elsewhere
    if(copyFrom && copyFrom.possibleJSRArgument){
      console.log('possibleJSRArgument:false', copyFrom);
      copyFrom.possibleJSRArgument = false;
    }

  }

  static DecompileCPTOPSP(state = undefined){
    let stackElement = state.stack.stack[(state.stack.pointer + state.instruction.pointer) / 4];
    console.log('CPTOPSP', state.stack.pointer, state.instruction.pointer, (state.stack.pointer + state.instruction.pointer) / 4, state.stack.stack.length);

    console.log('CPTOPSP', stackElement, state.stack.stack.slice());
    
    //Create a new object from the existing stack element so that we can set
    //the current scope without changing the original
    state.stack.stack.push({
      type: stackElement.type, //Shallow Copy
      scope: state.currentScope, //New Reference
      value: stackElement.value, //Shallow Copy
      possibleJSRArgument: true //New Reference
    });
    //state.currentScope.nodes.push(stackElement);
    state.stack.pointer += 4;
  }

  static DecompileCPTOPBP(state = undefined){
    let stackElement = state.stack.stack[(state.stack.base_pointer + state.instruction.pointer) / 4];
    console.log('CPTOPBP', stackElement, state.stack.base_pointer, state.instruction.pointer, state.stack.stack[state.stack.stack.length - 1]);
    //state.stack.stack[(state.stack.base_pointer + state.instruction.offset) / 4].value.value = state.stack.stack[state.stack.stack.length - 1].value;
    
    //Create a new object from the existing stack element so that we can set
    //the current scope without changing the original
    state.stack.stack.push({
      type: stackElement.type, //Shallow Copy
      scope: state.currentScope, //New Reference
      value: stackElement.value, //Shallow Copy
      possibleJSRArgument: true //New Reference
    });
    //state.currentScope.nodes.push(stackElement);
    state.stack.pointer += 4;
  }

  static DecompileCPDOWNBP(state = undefined){
    let copyFrom = state.stack.stack[state.stack.stack.length - 1];
    let copyTo = state.stack.stack[(state.stack.base_pointer + state.instruction.offset) /4];

    console.log('CPDOWNBP', copyTo, copyFrom, state.stack.base_pointer, state.instruction.offset, state.stack.pointer);

    state.currentScope.nodes.push({
      type: 'assignment',
      variable: copyTo.value,
      value: copyFrom.value
    });
    
    if(copyTo.value.type == 'variable'){
      copyTo.value.assigned = true;
    }

  }

  static DecompileJMP(state = undefined){
    let destinationInstr = state.script.instructions.get(state.instruction.address + state.instruction.offset);
    if(state.lastInstruction.code == 0x2C){ //STORE_STATE
      console.log('DecompileJMP.STORE_STATE');
      return state.instruction.address + state.instruction.offset
    }

    //Condition Block else block testing
    if(destinationInstr.code == 0x1D){ //0x1D == JMP
      if(destinationInstr.address == state.currentScope.end_offset){

        //Make sure the two JMPs aren't next to each other
        if(state.instruction.nextInstr != destinationInstr){
          let block = {
            type: 'conditional_else',
            args: [],
            nodes: [],
            initialStackPointer: state.stack.pointer
          };

          //Push the condition to the current scopes node list
          state.currentScope.else = block;

          state.addScope(block);
          
          let instruction = state.instruction.nextInstr;
          while(typeof instruction !== 'undefined'){
            instruction = NWScriptDecompiler.DecompileBlockInstruction(state, instruction);
            console.log('DecompileCondition.instruction', instruction);
            if(instruction == destinationInstr){
              instruction = undefined;
            }
          }
          
          //pop else scope
          state.popScope();

          //return the destination so the previous block will skip decompiling this condition block
          return destinationInstr.address;
        }else{
          return undefined;
        }
      }
      throw 'Unhandled possible else condition';
    }


  }

  static DecompileConditional(state = undefined){

    //Pop the stack to keep things clean
    let stackElement = state.stack.stack.pop();
    state.stack.pointer -= 4;

    let jzInstr = state.instruction;
    
    let destinationInstr = state.script.instructions.get(jzInstr.address + jzInstr.offset);
    if(destinationInstr.prevInstr.code == 0x1D){
      //Looks like this JZ is the start of a condition block

      let isWhileLoop = false;

      let block = {
        type: 'conditional',
        end_offset: destinationInstr.prevInstr.address + destinationInstr.prevInstr.offset,
        args: [stackElement.value],
        nodes: [],
        initialStackPointer: state.stack.pointer
      };

      //Check to see if the JMP is targeting an address before the condition started
      if( (destinationInstr.prevInstr.address + destinationInstr.prevInstr.offset) < jzInstr.address ){
        isWhileLoop = true;
        block.type = 'while';
      }

      //Set the end instruction to the final instuction for this entire conditional block
      let endInstruction = state.script.instructions.get(block.end_offset);

      if(state.currentScope.type == 'conditional' && state.currentScope.end_offset == block.end_offset){
        block.type = 'conditional_elseif';
        //Since this is an elseif block set the endInstruction to the end of the elseif block so that the parent block can do the other elseif blocks if they exist
        endInstruction = destinationInstr;
        //Push the condition to the current scopes node list
        //state.currentScope.nodes.push(block);
        state.currentScope.else_ifs.push(block);

        state.addScope(block);
      
        let instruction = jzInstr.nextInstr;
        while(typeof instruction !== 'undefined'){
          instruction = NWScriptDecompiler.DecompileBlockInstruction(state, instruction);
          console.log('DecompileCondition.instruction', instruction);
          if(instruction == endInstruction){
            instruction = undefined;
          }
        }
        
        state.popScope();

        //return the destination so the previous block will skip decompiling this condition block
        return destinationInstr.address;

      }else{

        if(!isWhileLoop){
          //Add these propeties to the block structure if it's not a while loop
          block.else_ifs = [];
          block.else = undefined;
        }else{
          endInstruction = destinationInstr.prevInstr;
        }

        //Push the condition to the current scopes node list
        state.currentScope.nodes.push(block);

        state.addScope(block);
      
        let instruction = jzInstr.nextInstr;
        while(typeof instruction !== 'undefined'){
          instruction = NWScriptDecompiler.DecompileBlockInstruction(state, instruction);
          console.log('DecompileCondition.instruction', instruction);
          if(instruction == endInstruction){
            instruction = undefined;
          }
        }

        state.popScope();

        if(!isWhileLoop){
          //return the destination so the previous block will skip decompiling this condition block
          return endInstruction.address;
        }else{
          //return the destination so the previous block will skip decompiling this condition block
          return destinationInstr.address;
        }

      }

    }
  }

  static DecompileConditionalElse(state = undefined){
    
  }

  static DecompileSubroutine(state = undefined, offset){

    //Clone the current stack state just in case
    let oldStack = {
      base_pointer: state.stack.base_pointer,
      pointer: state.stack.pointer,
      stack: state.stack.stack.slice()
    };

    let instruction = state.script.instructions.get(offset);
    console.log('DecompileSubroutine', state.instruction);
    //walk back through the stack to see if there is an RSADD that hasn't been assigned to. This should be for the current subroutine if it exists
    //anything after it and the top of the stack are arguments for the JSR
    //JSR's are not required to return a value and may have zero arguments

    let position = state.stack.stack.length - 1;
    let stackElement = state.stack.stack[position];
    let conditional = false;
    let returnType = 0;
    let args = [];

    console.log('stack', state.stack.stack.slice());

    while(stackElement && stackElement.scope == state.currentScope && stackElement.possibleJSRArgument === true){
      console.log('JSR Argument', stackElement);
      args.unshift(
        stackElement
      );

      console.log('JSR Argument --> next', state.stack.stack[--position]);
      //Keep walking backwards
      stackElement = state.stack.stack[position];
    }

    //Check to see if the subroutine has been decompiled before
    if(typeof state.subroutines[state.instruction.address + state.instruction.offset] == 'undefined'){
      //Cache the subroutine so it isn't decompiled again
      let block = {
        id: ++state.subroutineCounter,
        type: 'subroutine',
        conditional: conditional,
        returnType: returnType,
        args: [],
        possibleArguments: args,
        nodes: [],
        initialStackPointer: state.stack.pointer
      };
  
      state.addScope(block);

      //Cache the subroutine
      state.subroutines[state.instruction.address + state.instruction.offset] = block;
      
      while(typeof instruction !== 'undefined'){
        instruction = NWScriptDecompiler.DecompileBlockInstruction(state, instruction);
        console.log('DecompileSubroutine.instruction', instruction);
      }

      for(let i = 0; i < block.possibleArguments.length; i++){
        //console.log('is arg still possible', block.possibleArguments[i].possibleJSRArgument, block.possibleArguments[i].value);
        let index = state.stack.stack.indexOf(block.possibleArguments[i]);
        if(index >= 0){
          block.args.unshift(block.possibleArguments[i].value);
          state.stack.stack.splice(index, 1);
        }
      }
      
      block.possibleArguments = [];

      return block;
    }else{
      let decompiledBlock = state.subroutines[state.instruction.address + state.instruction.offset];

      let block = {
        id: decompiledBlock.id,
        type: 'subroutine',
        conditional: decompiledBlock.conditional,
        returnType: decompiledBlock.returnType,
        args: [],
        possibleArguments: args,
        nodes: decompiledBlock.nodes,
        initialStackPointer: state.stack.pointer
      };
      
      for(let i = 0; i < block.possibleArguments.length; i++){
        //console.log('is arg still possible', block.possibleArguments[i].possibleJSRArgument, block.possibleArguments[i].value);
        let index = state.stack.stack.indexOf(block.possibleArguments[i]);
        if(index >= 0){
          block.args.unshift(block.possibleArguments[i].value);
          state.stack.stack.splice(index, 1);
        }
      }

      block.possibleArguments = [];

      if(block.returnType){
        let returnValueStackElement = state.stack.stack[state.stack.stack.length - 1];
        console.log('JSR returnType', returnValueStackElement);
        if(returnValueStackElement.value.type == 'variable'){
          returnValueStackElement.JSR = block;
        }
      }

      return block;
    }

  }

  static DecompileStoreState(state = undefined, offset){


    let oldScope = state.currentScope;
    
    let block = {
      type: 'storestate',
      conditional: false,
      returnType: 0,
      nodes: [],
      initialStackPointer: state.stack.pointer
    };

    console.log('DecompileStoreState', block);

    state.addScope(block);

    //Hack
    state.stack.pointer -= 4;

    let instruction = state.script.instructions.get(offset);
    while(typeof instruction !== 'undefined'){
      instruction = NWScriptDecompiler.DecompileBlockInstruction(state, instruction);
    }

    state.stack.stack.push({
      type: 'storestate',
      scope: oldScope,
      value: block
    });

    state.stack.pointer += 4;

    //return block;

  }

  static DecompileCommandArgument(state = undefined, stackElement = undefined){
    stackElement.possibleJSRArgument = false;
    if(typeof stackElement.JSR != 'undefined'){
      let varIndex = state.currentScope.nodes.indexOf(stackElement.value);
      if(varIndex >= 0){
        //Remove the variable node from the node list
        state.currentScope.nodes.splice(varIndex, 1);
        //Replace the RSADD with a reference to the subroutine
        stackElement.value = stackElement.JSR;
      }

      let jsrIndex = state.currentScope.nodes.indexOf(stackElement.JSR);
      if(jsrIndex >= 0){
        //Remove the subroutine reference from the node list
        state.currentScope.nodes.splice(jsrIndex, 1);
      }
    }
  }

  static Test(scriptname = ''){
    console.log('NWScriptDecompiler', 'Test Begin');
    NWScript.Load(scriptname).then((instance) => {
      NWScriptDecompiler.Decompile(instance);
      console.log('NWScriptDecompiler', 'Test End');
    });
  }

  static TestLocal(path = ''){
    fs.readFile(path, function(err, buffer) {
      if (err) throw err;
      
      //Pass the buffer to a new script object
      let script = new NWScript( buffer );
      NWScriptDecompiler.Decompile(script.newInstance());
    });
  }

  static toNSS(state = undefined){

    //Parse Script Globals
    let globals = [];
    for(let i = 0; i < state.globals.length; i++){
      let node = state.globals[i];
      let nextNode = state.globals[i+1];
      if(!node.skip){
        let line = NWScriptDecompiler.ParseNode(state, undefined, node, nextNode);
        globals.push(line);
      }
    }

    //Parse Script Subroutines
    let blocks = [];
    let subKeys = Object.keys(state.subroutines).reverse();
    for(let i = 0; i < subKeys.length; i++){
      blocks.push(NWScriptDecompiler.ParseSubroutine(state, state.subroutines[subKeys[i]]));
    }

    console.log('toNSS', globals, blocks);

  }

  static ParseSubroutine(state = undefined, block = undefined){

    let subblock = {
      returnType: 'void',
      name: 'sub'+block.id,
      statement: NWScriptDecompiler.ParseArguments(state, block, block.args),
      lines: [],
    }

    //Parse block nodes
    for(let i = 0; i < block.nodes.length; i++){
      let node = block.nodes[i];
      let nextNode = block.nodes[i+1];
      if(!node.skip){
        let line = NWScriptDecompiler.ParseNode(state, block, node, nextNode);
        subblock.lines.push(line);
      }
    }

    return subblock;

  }

  static ParseNode(state = undefined, block = undefined, node = undefined, nextNode = undefined, argMode = false){
    let line = '';
    switch(node.type){
      case 'variable':
        switch(node.vartype){
          case 3:
            line = 'int';
          break;
          case 4:
            line = 'float';
          break;
          case 5:
            line = 'string';
          break;
          case 6:
            line = 'object';
          break;
        };

        if(argMode){
          line = '';
        }

        console.log('variable', node, nextNode);
        if(nextNode && nextNode.type == 'assignment' && nextNode.variable == node){
          line += ' '+NWScriptDecompiler.ParseNode(state, block, nextNode, undefined, argMode);
          
          //Skip the next node because it was assigned to this variable
          nextNode.skip = true;
        }else{
          if(argMode){
            line = node.name;
          }else{
            line += ' '+node.name;
          }
        }
      break;
      case 'const':
        if(node.vartype == 3){
          line = node.value;
        }else if(node.vartype == 4){
          line = node.value;
        }else if(node.vartype == 5){
          line = '"'+node.value+'"';
        }else if(node.vartype == 6){
          if(node.value == 0){
            line = 'OBJECT_SELF';
          }else if(node.value == 0x7f000000){
            lin = 'OBJECT_INVALID';
          }else{
            line = node.value;
          }
        }else{
          line = node.value;
        }
      break;
      case 'equal':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' == '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'nequal':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' != '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'logand':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' && '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'logor':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' || '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'incor':
        throw 'Unhandled node type';
      //break;
      case 'excor':
        throw 'Unhandled node type';
      //break;
      case 'and':
        throw 'Unhandled node type';
      //break;
      case 'geq':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' >= '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'gt':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' > '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'lt':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' < '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'leq':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' <= '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'shleft':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' << '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'shright':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' >> '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'ushright':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' >> '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'add':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' + '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'sub':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' - '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'mul':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' * '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'div':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' / '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'mod':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, argMode) + ' % '+NWScriptDecompiler.ParseNode(state, block, node.args[1], undefined, argMode);
      break;
      case 'neg':
        line = '-'+NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, true);
      break;
      case 'inci':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, true)+'++';
      break;
      case 'deci':
        line = NWScriptDecompiler.ParseNode(state, block, node.args[0], undefined, true)+'--';
      break;
      case 'assignment':
        line = node.variable.name+' = '+ NWScriptDecompiler.ParseArguments(state, block, [node.value]);
      break;
      case 'subroutine':
        line = 'sub' + node.id + NWScriptDecompiler.ParseArguments(state, block, node.args);
      break;
      case 'conditional':
        line = NWScriptDecompiler.ParseIfStatement(state, node);
      break;
      case 'while':
        line = NWScriptDecompiler.ParseWhileStatement(state, node);
      break;
      case 'action':
        console.log('action', node);
        line = node.action.name+NWScriptDecompiler.ParseArguments(state, block, node.args);
      break;
      case 'storestate':
        line = NWScriptDecompiler.ParseNode(state, block, node.nodes[node.nodes.length - 1], undefined, argMode);
      break;
      case 'return':
        console.log('return', node.value);
        line = 'return '+NWScriptDecompiler.ParseArguments(state, block, [node.value]);
      break;
      default:
        console.error('unknown command type');
        console.log(node);
        line = node;
      break;
    }
    return line;
  }

  static ParseIfStatement(state = undefined, block = undefined){

    let ifblock = {
      type: 'if',
      statement: NWScriptDecompiler.ParseArguments(state, block, block.args),
      else_ifs: [],
      else: undefined,
      lines: []
    };

    //Parse IFBlock nodes
    for(let i = 0; i < block.nodes.length; i++){
      let node = block.nodes[i];
      let nextNode = block.nodes[i+1];
      if(!node.skip){
        let line = NWScriptDecompiler.ParseNode(state, block, node, nextNode);
        ifblock.lines.push(line);
      }
    }

    //Parse IFBlock ElseIF blocks
    for(let i = 0; i < block.else_ifs.length; i++){
      let elseif = block.else_ifs[i];

      let elseifblock = {
        type: 'elseif',
        statement: NWScriptDecompiler.ParseArguments(state, elseif, elseif.args),
        lines: []
      };

      //Parse ElseIFBlock nodes
      for(let j = 0; j < elseif.nodes.length; j++){
        let node = elseif.nodes[j];
        let nextNode = elseif.nodes[j++];
        if(!node.skip){
          let line = NWScriptDecompiler.ParseNode(state, elseif, node, nextNode);
          elseifblock.lines.push(line);
        }
      }

      ifblock.else_ifs.push(elseifblock);

    }

    if(block.else){
      ifblock.else = {
        type: 'else',
        lines: []
      };

      for(let i = 0; i < ifblock.else.nodes.length; i++){
        let node = ifblock.else.nodes[i];
        let nextNode = ifblock.else.nodes[i+1];
        if(!node.skip){
          let line = NWScriptDecompiler.ParseNode(state, ifblock.else, node, nextNode);
          ifblock.else.lines.push(line);
        }
      }

    }

    return ifblock;

  }

  static ParseWhileStatement(state = undefined, block = undefined){

    let while_block = {
      type: 'while',
      statement: NWScriptDecompiler.ParseArguments(state, block, block.args),
      lines: []
    };

    //Parse WhileBlock nodes
    for(let i = 0; i < block.nodes.length; i++){
      let node = block.nodes[i];
      let nextNode = block.nodes[i+1];
      if(!node.skip){
        let line = NWScriptDecompiler.ParseNode(state, block, node, nextNode);
        while_block.lines.push(line);
      }
    }

    return while_block;

  }

  static ParseArguments(state, block, args){
    console.log('ParseArguments', state, block, args);
    let line = '(';
    for(let i = 0; i < args.length; i++){
      if(i>0){
        line += ', ';
      }
      let arg = args[i];
      line += NWScriptDecompiler.ParseNode(state, block, arg, undefined, true);
    }
    line += ')';
    return line;
  }
  
}

module.exports = NWScriptDecompiler;