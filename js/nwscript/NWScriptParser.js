class NWScriptParser {


  constructor(){

    this.cursor = 0;
    this.source = '';
    this.tokens = [];

  }

  processSourceCode(source = ''){

    this.source = source;
    this.charLen = source.length;
    this.tokens = [];
    this.cursor = 0;

    this.loopCount = 0;

    while(this.cursor < this.source.length){

      let pos = this.cursor;

      if(this.loopCount > this.charLen)
        throw 'Out of bounds'

      this.loopCount++;

      let char = this.getChar();
      let nextChar = this.getNextChar();

      console.log(char, nextChar, this.cursor);

      //Ignore WhiteSpaces
      if(this.isWhiteSpace(char)){
        this.cursor++;
        continue;
      }

      if(char === '/'){

        switch(nextChar){
          case '/':
            console.log('SingleLine Comment')
            this.cursor += 2; //Skip ahead 2 chars to process the rest of the comment

            while(!this.isEOF() && !this.isNewLine(this.getChar())){
              this.cursor++;
            }

            this.cursor++;

            continue;
          break;
          case '*':
            console.log('Multiline Comment')
            this.cursor += 2; //Skip ahead 2 chars to process the rest of the comment

            while(!this.isEOF() && (this.getChar() != '*' && this.getNextChar() != '/')){
              this.cursor++;
            }

            this.cursor += 2; //Skip ahead 2 chars to ignore the end of the comment

            continue;
          break;
          default:
            console.log('DIVIDE')
            this.tokens.push({
              type: 'DIVIDE',
              value: '/',
              pos: this.cursor++
            });
            continue;
          break;
        }

      }

      let value = '';

      if(NWScriptParser.optable[char+nextChar] !== undefined){
        console.log(NWScriptParser.optable[char+nextChar])
        this.tokens.push({
          type: NWScriptParser.optable[char+nextChar],
          value: char+nextChar,
          pos: pos
        });

        this.cursor += 2;

      }else if(NWScriptParser.optable[char] !== undefined){
        console.log(NWScriptParser.optable[char])
        this.tokens.push({
          type: NWScriptParser.optable[char],
          value: char,
          pos: pos
        });

        this.cursor++;
      }else{
        if( this.isAlpha(char) ){

          this.cursor++;
          value += char;
          while( this.isAlphaNumeric( this.getChar() ) ){
            value += this.getChar();
            this.cursor++;
          }

          this.tokens.push({
            type: 'NAME',
            value: value,
            pos: pos
          });

        }else if(this.isDigit(char)){
          this.cursor++;
          value += char;
          while(this.isDigit(this.getChar())){
            value += this.getChar();
            this.cursor++;
          }

          //Test for a float
          if(this.getNextChar() === 'f'){
            cursor++;
            this.tokens.push({
              type: 'FLOAT',
              value: value,
              pos: pos
            });
          }else{
            this.tokens.push({
              type: 'NUMBER',
              value: value,
              pos: pos
            });
          }

        }else if(char === '"'){
          this.cursor++; //skip the opening double quote
          while(this.getChar() != '"'){
            value += this.getChar();
            this.cursor++;
          }

          this.tokens.push({
            type: 'STRING',
            value: value,
            pos: pos
          });

          this.cursor++; //Skip the ending quote

        }else if(char === "'"){
          this.cursor++; //skip the opening single quote
          while(this.getChar() != "'"){
            value += this.getChar();
            this.cursor++;
          }

          this.tokens.push({
            type: 'STRING',
            value: value,
            pos: pos
          });

          this.cursor++; //Skip the ending quote

        }else{
          throw 'Token error at ' + this.cursor + ' token: '+char;
        }

      }

    }

  }

  getChar(){
    return this.source.charAt(this.cursor) || null;
  }

  getNextChar(){
    return this.source.charAt(this.cursor + 1) || null;
  }

  isEOF(){
    return this.cursor >= this.source.length;
  }

  isNewLine(c) {
    return c === '\r' || c === '\n';
  }

  isWhiteSpace(c){
    return c === ' ' || c === '\t' || this.isNewLine(c);
  }

  isAlphaNumeric(c){
    return this.isAlpha(c) || this.isDigit(c);
  }

  isAlpha(c){
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  isDigit(c){
    return (c >= '0' && c <= '9');
  }

  isFloat(c){
    return this.isDigit(c) || c === '.';
  }

  _logTokens(){
    for(let i = 0; i < this.tokens.length; i++){
      console.log(tokens[i].type, tokens[i].value)
    }
  }

  isTokenKeyword(token){
    if(token.type === 'NAME'){
      console.log('isTokenKeyword', token);
      if((token.value.match('\^if\$|\^else\$|\^switch\$|\^while\$|\^for\$|\^return\$') || []).length){
        return true;
      }
    }
    return false;
  }

  isTokenIdentifier(token){
    if(token.type === 'NAME'){
      console.log('isTokenIdentifier', token);
      if((token.value.match('\^void\$|\^int\$|\^float\$|\^object\$|\^location\$|\^vector\$|\^string\$|\^effect\$|\^struct\$') || []).length){
        return true;
      }
    }
    return false;
  }

  isTokenAssignment(token){
    if(['=', '+='].indexOf(token.value) > -1){
      return true;
    }
    return false;
  }

  buildAST(){

    this.nodeTree = { nodes:[] };
    this.nodePos = 0;

  }

  buildASTNode(parent = null, token = null){

    let node = { nodes: [] };

    //let token = this.tokens[this.nodePos];
    

  }

  parse(){
    this._tokenIdx = 0;

    this.variables = {};
    this._scopeStack = [];

    this._scopeStack = new ScopeStack();

    let ast = new AST_Program({
      body: []
    });

    this._scopeStack.push();//Push a new scope to the stack. This will be the global scope

    while(this._tokenIdx < this.tokens.length){
      ast.body.push(this.walk());
    }

    this._scopeStack.pop();//Pop the global scope

    return ast;

  }

  walk(){
    let prevToken = this.tokens[this._tokenIdx - 1] || null;
    let token = this.tokens[this._tokenIdx];
    let nextToken = this.tokens[this._tokenIdx + 1] || null;

    //console.log('walk', prevToken, token, nextToken);

    if(token.type === 'NAME'){
      //let nextToken = this.tokens[this._tokenIdx+1];

      if(nextToken.type === 'L_PAREN' && !this.isTokenKeyword(token)){
        //This is a subroutine
        this._tokenIdx++;
        let nodeStruct = {
          name: token.value,
          arguments: this.__walkSubRoutineArguments(),
        };

        if(this.isTokenIdentifier(prevToken)){ //Check to see if this is a FunctionNode
          nodeStruct.return = prevToken.value;
          let node = new AST_FunctionNode(nodeStruct);

          this._scopeStack.push();//Push a new scope to the stack. This will be the current function scope
          
          token = this.tokens[this._tokenIdx];

          if(token.type === 'L_BRACE'){

            token = this.tokens[++this._tokenIdx];

            while(token.type !== 'R_BRACE'){
              let statement = this.walk();
              
              if(statement !== undefined)
                node.statements.push(statement);

              token = this.tokens[this._tokenIdx];
            }

            this._tokenIdx++;

          }

          this._scopeStack.pop();//Push a new scope to the stack. This will pop the current function scope

          return node;
      
        }else{ //This is a FunctionCall
          if(this.tokens[this._tokenIdx].type === 'SEMI'){
            //alert(nodeStruct.name + ' ' + this.tokens[this._tokenIdx].value)
            //this._tokenIdx++;
          }

          return new AST_FunctionCall(nodeStruct);
        }

      }else{
        if(this.isTokenIdentifier(token)){
          this._tokenIdx++;
          return this.walk(); //walk to the next token instead of adding this one to the AST
        }else{

          if(token.value === 'if'){
            return this.__walkIfStatement();
          }else if(token.value === 'switch'){
            throw 'We don\'t know how to handle switch statements yet';
          }else if(token.value === 'do'){
            throw 'We don\'t know how to handle do statements yet';
          }else if(token.value === 'while'){
            throw 'We don\'t know how to handle while statements yet';
          }else if(token.value === 'return'){
            alert('Return');
            this._tokenIdx++;
            
            let node = new StatementReturn({
              value: this.walk()
            });

            token = this.tokens[this._tokenIdx];

            /*if(token.type != 'SEMI')
              throw 'Ending semi colon not found';*/

            return node;


          }else if(this.isTokenIdentifier(prevToken)){
            
            this._tokenIdx++;

            let node = new VariableDeclaration({
              identifier: prevToken.value,
              name: token.value,
              value: null
            });

            console.log('Assign Variable', node)

            this._scopeStack.setVariable(token.value, node);//Store a refernce to this variable

            if(nextToken.type == 'SEMI'){
              node.value = null;
            }else if(nextToken.type == 'EQUALS'){
              this._tokenIdx++;
              node.value = this.walk();
            }else{
              throw 'Unknown condition';
            }

            token = this.tokens[this._tokenIdx];

            if(token.type != 'SEMI')
              throw 'Ending semi colon not found';

            this._tokenIdx++;

            return node;

          }else{
            console.log('Token', prevToken, token, nextToken)
            this._tokenIdx++;

            let node = {
              type: 'Variable',
              name: token.value
            };

            if(nextToken.type == 'SEMI'){
              console.log('SEMI found', nextToken);
              //this._tokenIdx++;
            }else if(nextToken.type == 'EQUALS'){
              console.log('EQUALS', nextToken, this._scopeStack.getTopStack());
              this._tokenIdx++;
              node = new VariableAssignment({
                variable: this._scopeStack.getVariable(token.value),
                value: this.walk()
              });
            }

            token = this.tokens[this._tokenIdx];

            if(token.type != 'SEMI'){
              console.error(token);
              throw 'Ending semi colon not found';
            }

            this._tokenIdx++;

            return node;

          }

          /*else{
            this._tokenIdx ++;
            let node = {
              type: 'NameLiteral',
              value: token.value
            };

            //Check to see if we are creating a new variable
            if(this.isTokenIdentifier(prevToken)){
              node.varType = prevToken.value;
              node.name = token.value;
            }

            //check to see if we are going to assign anything to this variable
            if(nextToken.type == 'EQUALS'){
              this._tokenIdx ++; //skip the operator
              node.value = this.walk();
            }

            return node;

          }*/
          
        }
      }

    }

    if(token.type === 'NUMBER'){
      console.log('NUMBER', token);
      this._tokenIdx++;
      return {
        type: 'NumberLiteral',
        value: token.value
      };
    }

    if(token.type === 'FLOAT'){
      console.log('FLOAT', token);
      this._tokenIdx++;
      return {
        type: 'FloatLiteral',
        value: token.value
      };
    }

    if(token.type === 'STRING'){
      this._tokenIdx ++;
      return {
        type: 'StringLiteral',
        value: token.value
      };
    }

    if(token.type === 'L_PAREN'){

      token = this.tokens[++this._tokenIdx]; //Get the next token

      let node = {
        type: 'CallExpression',
        operator: null,
        arguments: []
      };

      while(token.type !== 'R_PAREN'){

        /* the arguments need to be processed from right to left which means
        that the processing will mostlikely need to wait until all the arguments
        are gathered */

        let arg = this.walk();

        console.log('arg', arg);

        if(arg.type == 'EQUALSEQUALS'){
          node.operator = 'EQUALSEQUALS';
        }else{
          node.arguments.push(arg);
        }

        token = this.tokens[this._tokenIdx];
      }
      this._tokenIdx ++;
      return node;

    }

    if(token.type === 'COMMA'){
      this._tokenIdx ++;
      return {
        type: 'COMMA',
        value: ','
      };
    }

    if(token.type === 'EQUALSEQUALS'){
      this._tokenIdx ++;
      return {
        type: 'EQUALSEQUALS',
        value: '=='
      };
    }

    console.error(prevToken, token);

    //throw 'Unexpected';

    this._tokenIdx ++;

  }

  __walkIfStatement(){

    let token = this.tokens[this._tokenIdx];
    this._tokenIdx++;

    console.log('IF', token);

    let node = new AST_Block_IF({
      expression: this.walk(),
      statements: [],
      sub_condition: null
    });

    if(token.type == 'L_BRACE'){
      while(token.type !== 'R_BRACE'){
        node.statements.push(this.walk());
        token = this.tokens[this._tokenIdx];
      }
      this._tokenIdx++;
    }else{
      node.statements.push(this.walk());
      this._tokenIdx++;
      token = this.tokens[this._tokenIdx];
    }

    console.log('ENDIF', token);

    if(token.type === 'NAME' && token.value === 'else'){
      let nextToken = this.tokens[this._tokenIdx+1];
      //this._tokenIdx ++; // Skip the else token
      if(nextToken.type === 'NAME' && nextToken.value === 'if'){
        node.sub_condition = this.__walkIfStatement();
      }else{
        console.log('else', token, nextToken);
        node.sub_condition = this.__walkElseStatement();
      }

    }

    return node;

  }

  __walkElseStatement(){
    
    let token = this.tokens[this._tokenIdx];
    this._tokenIdx++;

    console.log('ELSE', token);

    let node = new AST_Block_ELSE({
      statements: []
    });

    if(token.type == 'L_BRACE') {
      while(token.type !== 'R_BRACE'){
        node.statements.push(this.walk());
        token = this.tokens[this._tokenIdx];
      }
    }else{
      node.statements.push(this.walk());
      token = this.tokens[this._tokenIdx];
    }

    this._tokenIdx++; //skip the closing token

    return node;

  }

  __walkSubRoutineArguments(){
    //let prevToken = this.tokens[this._tokenIdx - 1] || null;
    let token = this.tokens[this._tokenIdx];
    //let nextToken = this.tokens[this._tokenIdx + 1] || null;

    //console.log('walk', prevToken, token, nextToken);
    if(token.type === 'L_PAREN'){

      token = this.tokens[++this._tokenIdx]; //Get the next token

      let args = [];

      while(token.type !== 'R_PAREN'){
        let arg = this.walk();
        console.log('Argument', arg, this.tokens[this._tokenIdx]);
        if(arg.type != 'COMMA'){
          args.push(arg);
        }

        token = this.tokens[this._tokenIdx];
      }
      this._tokenIdx ++;
      return args;

    }
    throw 'SubRoutine missing "("';
  }

}

NWScriptParser.optable = {
  '+':  'PLUS',
  '-':  'MINUS',
  '*':  'MULTIPLY',
  '.':  'PERIOD',
  '\\': 'BACKSLASH',
  ':':  'COLON',
  '%':  'PERCENT',
  '|':  'PIPE',
  '!':  'EXCLAMATION',
  '?':  'QUESTION',
  '#':  'POUND',
  '&':  'AMPERSAND',
  ';':  'SEMI',
  ',':  'COMMA',
  '(':  'L_PAREN',
  ')':  'R_PAREN',
  '<':  'L_ANG',
  '>':  'R_ANG',
  '{':  'L_BRACE',
  '}':  'R_BRACE',
  '[':  'L_BRACKET',
  ']':  'R_BRACKET',
  '=':  'EQUALS',
  '==':  'EQUALSEQUALS',
  '!=': 'NOT_EQUALS',
  '<=': 'LT_EQUAL',
  '>=': 'GT_EQUAL',
  '+=': 'PLUS_EQUAL',
  '-=': 'MINUS_EQUAL'
};

module.exports = NWScriptParser;