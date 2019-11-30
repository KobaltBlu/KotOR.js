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
      scope.instr.offset = reader.ReadUInt32();
      scope.instr.size = reader.ReadUInt16();
    }
  },
  2 : { 
    name: 'RSADD', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'RADD', scope.instr.address, this.stack.pointer * 4);
      }
      //this.stack.push(0);
      switch(scope.instr.type){
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
    }, 
    parse: function( instr, reader ){

    }
  }, //Reserve Space On Stack
  3 : { 
    name: 'CPTOPSP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'CPTOPSP', scope.instr.pointer, this.stack.stack );
      }
      this.stack.push( this.stack.getAtPointer( scope.instr.pointer ) );
    }, 
    parse: function( instr, reader ){
      scope.instr.pointer = reader.ReadUInt32();
      scope.instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
      scope.instr.data = null;
    }
  },
  4 : { 
    name: 'CONST', 
    run: function( scope = {} ){
      switch(scope.instr.type){
        case 3:
          let ipIdx = this.integerPointers.push(
            scope.instr.integer
          )-1;
          
          if(this.isDebugging()){
            console.log('NWScript: '+this.name, 'ipIdx', ipIdx);
          }
          this.stack.push((ipIdx));
        break;
        case 4:
          this.floatPointers.push(scope.instr.float);
          let fpIdx = this.floatPointers.length-1;
          
          if(this.isDebugging()){
            console.log('NWScript: '+this.name, 'fpIdx', fpIdx);
          }
          this.stack.push((fpIdx));
        break;
        case 5:
          this.stringPointers.push(scope.instr.string);
          let spIdx = this.stringPointers.length-1;
          
          if(this.isDebugging()){
            console.log('NWScript: '+this.name, 'spIdx', spIdx);
          }
          this.stack.push((spIdx));
        break;
        case 6:
          this.objectPointers.push(this.objectPointers[scope.instr.object]); //Default the initialization to OBJECT_SELF?
          let opIdx = this.objectPointers.length-1;
          
          if(this.isDebugging()){
            console.log('NWScript: '+this.name, 'opIdx', opIdx);
          }
          this.stack.push((opIdx));
        break;
        case 12:
          this.locationPointers.push(scope.instr.string);
          let lpIdx = this.locationPointers.length-1;
          
          if(this.isDebugging()){
            console.log('NWScript: '+this.name, 'lpIdx', lpIdx);
          }
          this.stack.push((lpIdx));
        break;
      }
    }, 
    parse: function( instr, reader ){
      switch(scope.instr.type){
        case 3:
          scope.instr.integer = parseInt(reader.ReadUInt32());
        break;
        case 4:
          scope.instr.float = parseFloat(reader.ReadSingle());
        break;
        case 5:
          scope.instr.strLen = reader.ReadUInt16();
          scope.instr.string = reader.ReadChars(scope.instr.strLen);
        break;
        case 6:
          scope.instr.object = reader.ReadUInt32();
        break;
      }
    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  5 : { 
    name: 'ACTION', 
    run: async function( scope = {} ){
      let action = this.Definition.Actions[scope.instr.action];

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
        console.log('NWScript: '+this.name, 'ACTION', action.name, args, action.args, scope.instr.argCount);
      }*/

      if(typeof action.action === 'function'){
        //returnObject = action.action.call(this, args, scope.instr, seek, resolve, returnObject);
        await action.action.call(this, args, scope.instr, seek, resolve, returnObject);
      }/*else if(NWScriptDef.Actions[scope.instr.action].action === 'function'){
        returnObject = NWScriptDef.Actions[scope.instr.action].action.call(this, args, scope.instr, seek, resolve, returnObject);
      }*/else{
        console.warn('NWScript Action '+action.name+' not found', action);
      }

      //delay = returnObject.delay;

      if(returnObject.value != undefined){
        this.stack.push((returnObject.value));
      }else if(action.type != 'void' && action.type != 'vector'){
        //console.log(action, args, this);
        this.stack.push((0));
        //console.error('Action '+action.name+' didn\'t return a value');
      }
    }, 
    parse: function( instr, reader ){
      scope.instr.action = reader.ReadUInt16();
      scope.instr.argCount = reader.ReadByte();
    }
  },
  6 : { 
    name: 'LOGANDII', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      
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
    }, 
    parse: function( instr, reader ){

    }
  },
  7 : { 
    name: 'LOGORII', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'LOGORII', var2, var1);
      }

      if(this.integerPointers[var1] || this.integerPointers[var2])
        this.stack.push(NWScript.TRUE)//TRUE
      else
        this.stack.push(NWScript.FALSE)//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  8 : { 
    name: 'INCORII', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'INCORII', var2, var1);
      }

      if(this.integerPointers[var1] || this.integerPointers[var2])
        this.stack.push(NWScript.TRUE)//TRUE
      else
        this.stack.push(NWScript.FALSE)//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  9 : { 
    name: 'EXCORII', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'EXCORII', var2, var1);
      }

      if(this.integerPointers[var1] || this.integerPointers[var2])
        this.stack.push(NWScript.TRUE)//TRUE
      else
        this.stack.push(NWScript.FALSE)//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  10 : { 
    name: 'BOOLANDII', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'BOOLANDII', var2, var1);
      }

      if(this.integerPointers[var1] && this.integerPointers[var2])
        this.stack.push(NWScript.TRUE)//TRUE
      else
        this.stack.push(NWScript.FALSE)//FALSE
    }, 
    parse: function( instr, reader ){

    }
  },
  11 : { 
    name: 'EQUAL', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  12 : { 
    name: 'NEQUAL', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04, x05, x06
  13 : { 
    name: 'GEQ', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  14 : { 
    name: 'GT', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  15 : { 
    name: 'LT', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  }, //Constant Type is declared by the next byte x03, x04
  16 : { 
    name: 'LEQ', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      switch(NWScript.Types[scope.instr.type]){
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
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      var newValue = 0;

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  },
  21 : { 
    name: 'SUB', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      var newValue = 0;

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  },
  22 : { 
    name: 'MUL', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      var newValue = 0;
      if(this.isDebugging()){
        console.log('MUL', var2, var1);
      }
      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  },
  23 : { 
    name: 'DIV', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      var newValue = 0;

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  },
  24 : { 
    name: 'MOD', 
    run: function( scope = {} ){
      var var2 = (this.stack.pop());
      var var1 = (this.stack.pop());

      var newValue = 0;

      switch(NWScript.Types[scope.instr.type]){
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
    }, 
    parse: function( instr, reader ){

    }
  },
  25 : { 
    name: 'NEG', 
    run: function( scope = {} ){
      var var1 = (this.stack.pop());

      var newValue = 0;

      switch(NWScript.Types[scope.instr.type]){
        case 'I':
          newValue = -this.integerPointers[var1];
          this.stack.push((this.integerPointers.push(newValue)-1));
        break;
        case 'F':
          newValue = -this.floatPointers[var1];
          this.stack.push((this.floatPointers.push(newValue)-1));
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
      for(let i = 0; i < (Math.abs(scope.instr.offset)/4); i++){
        this.stack.stack.splice((this.stack.pointer -= 4) / 4, 1)[0];
      }
      
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'MOVSP', this.stack.getAtPointer(scope.instr.offset), this.stack.getPointer());
      }
    }, 
    parse: function( instr, reader ){
      scope.instr.offset = reader.ReadUInt32();
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
      scope.instr.offset = reader.ReadUInt32();
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
      scope.instr.offset = reader.ReadUInt32();
    }
  },
  31 : { 
    name: 'JZ', 
    run: function( scope = {} ){
      let popped = this.integerPointers[(this.stack.pop())];
      if(popped == 0){
        scope.seek = scope.instr.address + scope.instr.offset;
      }
    }, 
    parse: function( instr, reader ){
      scope.instr.offset = reader.ReadUInt32();
    }
  },
  32 : { 
    name: 'RETN', 
    run: function( scope = {} ){
      //console.log('RETN', this.subRoutines, this.subRoutines[0]);
      //try{
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
      /*}catch(e){
        if(this.isDebugging()){
          console.error('RETN', e);
        }
      }*/
    }, 
    parse: function( instr, reader ){
      if(!this.eofFound){
        scope.instr.eof = true;
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
      for(let i = 0; i < (Math.abs(scope.instr.sizeToDestroy)/4); i++){
        destroyed.push(this.stack.stack.splice((this.stack.pointer -= 4) / 4, 1)[0]);
      }

      let saved = destroyed[scope.instr.offsetToSaveElement/scope.instr.sizeOfElementToSave];

      this.stack.push(
        saved
      );

      //console.log('DESTRUCT', destroyed, saved);
    }, 
    parse: function( instr, reader ){
      scope.instr.sizeToDestroy = reader.ReadInt16();
      scope.instr.offsetToSaveElement = reader.ReadInt16();
      scope.instr.sizeOfElementToSave = reader.ReadInt16();
    }
  },
  34 : { 
    name: 'NOTI', 
    run: function( scope = {} ){
      var var1 = (this.stack.pop());
      if(this.integerPointers[var1] == 0)
        this.stack.push(NWScript.TRUE)//TRUE
      else
        this.stack.push(NWScript.FALSE)//FALSE
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
      this.integerPointers[var1] -= 1;
    }, 
    parse: function( instr, reader ){
      scope.instr.offset = reader.ReadInt32();
    }
  },
  36 : { 
    name: 'INCISP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'INCISP', this.stack.getAtPointer( scope.instr.offset));
      }
      var var1 = (this.stack.getAtPointer( scope.instr.offset));
      this.integerPointers[var1] += 1;
    }, 
    parse: function( instr, reader ){
      scope.instr.offset = reader.ReadInt32();
    }
  },
  37 : { 
    name: 'JNZ', //I believe this is used in SWITCH statements
    run: function( scope = {} ){
      let jnzTOS = this.integerPointers[(this.stack.pop())];
      if(this.isDebugging()){
        console.log('JNZ', jnzTOS, scope.instr.address + scope.instr.offset);
      }
      if(jnzTOS != 0){
        scope.seek = scope.instr.address + scope.instr.offset;
      }
    }, 
    parse: function( instr, reader ){
      scope.instr.offset = reader.ReadInt32();
    }
  },
  38 : { 
    name: 'CPDOWNBP', 
    run: function( scope = {} ){
      this.stack.replaceBP(scope.instr.offset, this.stack.peek());
    }, 
    parse: function( instr, reader ){
      scope.instr.offset = reader.ReadUInt32();
      scope.instr.size = reader.ReadUInt16();
    }
  },
  39 : { 
    name: 'CPTOPBP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'CPTOPBP', scope.instr);
      }
      let stackBaseEle = this.stack.getAtBasePointer( scope.instr.pointer );
      this.stack.push( (stackBaseEle) );
    }, 
    parse: function( instr, reader ){
      scope.instr.pointer = reader.ReadUInt32();
      scope.instr.size = reader.ReadUInt16(); //As far as I can tell this should always be 4. Because all stack objects are 4Bytes long
      scope.instr.data = null;
    }
  },
  40 : { 
    name: 'DECIBP', 
    run: function( scope = {} ){
      if(this.isDebugging()){
        console.log('NWScript: '+this.name, 'DECIBP', this.stack.getAtBasePointer( scope.instr.offset));
      }
      var var1 = (this.stack.getAtBasePointer( scope.instr.offset));
      this.integerPointers[var1] -= 1;
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
      this.integerPointers[var1] += 1;
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
        base: [],//this.stack.stack.slice(0, (scope.instr.bpOffset/4)),
        local: [],//this.stack.stack.slice(this.stack.stack.length-(scope.instr.spOffset/4), this.stack.stack.length)
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
      scope.instr.bpOffset = reader.ReadUInt32();
      scope.instr.spOffset = reader.ReadUInt32();
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
      scope.instr.size = reader.ReadInt32();
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