const util = require('util');
const Jison = require("jison").Jison;
const Lexer = require("jison").Lexer;

const NWEngineTypeUnaryTypeOffset = 0x10;
const NWEngineTypeBinaryTypeOffset = 0x30;

const NWCompileDataTypes = {
  'I' : 0x03,
  'F' : 0x04,
  'S' : 0x05,
  'O' : 0x06,
  'STRUCT': 0x12,
  'II': 0x20,
  'FF': 0x21,
  'OO': 0x22,
  'SS': 0x23,
  'TT': 0x24,
  'IF': 0x25,
  'FI': 0x26,

  'VV': 0x3A,
  'VF': 0x3B,
  'FV': 0x3C,
};

class NWScriptParser {

  ast = null;
  regex_define = /#define\s+([A-Za-z_][A-Za-z0-9_]+)\s+((?:[1-9](?:[0-9]+)?)|(?:[A-Za-z_][A-Za-z0-9_]+))/g;
  
  engine_constants = [];
  engine_actions = [];
  errors = [];

  constructor(nwscript, script){
    this.grammar = require('./nwscript.jison.js').grammar;

    this.nwscript_source = nwscript;
    this.initializeNWScript();

    this.script = script;
    this.parseScriptFile();
  }

  initializeNWScript(){
    let define_matches = Array.from(
      this.nwscript_source.matchAll(this.regex_define)
    );
    let define_count = define_matches.length;
    let engine_type_index = 0;
    for(let i = 0; i < define_count; i++){
      let define = define_matches[i];
      if(define[1].indexOf('ENGINE_STRUCTURE_') == 0){
        let engine_type = define[2];
        const engine_type_lower = engine_type.toLowerCase();
        const engine_type_upper = engine_type.toUpperCase();
        let engine_type_rule = [`${engine_type_lower}\\b|${engine_type_upper}\\b`, `return '${engine_type_upper}'`];
        //insert these new engine type rules before the NAME rule
        this.grammar.lex.rules.splice( this.grammar.lex.rules.length - 1, 0, engine_type_rule);
        this.grammar.tokens += ` ${engine_type_upper}`;
        this.grammar.bnf.NWDataType.push(
          [`${engine_type_upper}`, `$$ = {type: "datatype", unary: ${NWEngineTypeUnaryTypeOffset + engine_type_index}, engine_type: true, value: $1}`]
        );
        
        NWCompileDataTypes[engine_type_upper]                   = NWEngineTypeUnaryTypeOffset  + engine_type_index;
        NWCompileDataTypes[engine_type_upper+engine_type_upper] = NWEngineTypeBinaryTypeOffset + engine_type_index;
        engine_type_index++;
      }
    }

    this.nwscript_gen = new Jison.Generator(this.grammar);
    this.nwscript_parser = this.nwscript_gen.createParser();

    //console.log(util.inspect(this.grammar, {showHidden: false, depth: null, colors: true}));

    const ast_nwscript = this.nwscript_parser.parse(this.nwscript_source);
    const statement_count = ast_nwscript.statements.length;
    for(let i = 0; i < statement_count; i++){
      const statement = ast_nwscript.statements[i];
      if(statement.type == 'function'){
        this.engine_actions.push({
          index: this.engine_actions.length,
          returntype: statement.returntype,
          is_engine_action: true,
          name: statement.name,
          arguments: statement.arguments
        });
      } else if(statement.type == 'variable'){
        this.engine_constants.push({
          index: this.engine_constants.length,
          datatype: statement.datatype,
          is_const: true,
          is_engine_constant: true,
          name: statement.name,
          value: statement.value,
        });
      }
    }
    console.log(` `);
    console.log(` `);
    console.log(` `);
    console.log(`Found (${this.engine_constants.length}) Engine Constants`);
    console.log(`Found (${this.engine_actions.length}) Engine Actions`);

    //console.log(util.inspect(NWCompileDataTypes, {showHidden: false, depth: null, colors: true}));
  }

  parseScriptFile(){
    this.nwscript_parser = this.nwscript_gen.createParser();
    const ast_script = this.nwscript_parser.parse(this.script);
    this.ast = ast_script;
    this.errors = [];

    //post process ast object
    this.walkASTStatement(ast_script);
    if(!this.errors.length){
      ast_script.parsed = true;
      console.log(` `);
      console.log(` `);
      console.log(` `);
      console.log(`Script parsed without errors`);
      //console.log(util.inspect(ast_script, {showHidden: false, depth: null, colors: true}));
      console.log(` `);
      console.log(` `);
      console.log(` `);
    }else{
      ast_script.parsed = false;
      console.log(` `);
      console.log(` `);
      console.log(` `);
      console.log(`Script parsed with errors (${this.errors.length})`);
      for(let i = 0; i < this.errors.length; i++){
        console.log(
          'Error', 
          util.inspect(
            this.errors[i], 
            {showHidden: false, depth: null, colors: true}
          )
        );
      }
      console.log(` `);
      console.log(` `);
      console.log(` `);
    }
  }

  compile(){

  }

  isDataType( dataType = undefined, value = '' ){
    return (typeof dataType == 'object' && dataType.value == value);
  }

  getActionByName( name = '' ){
    return this.engine_actions.find( a => a.name == name );
  }

  getFunctionByName( name = '' ){
    return this.program.functions.find( a => a.name == name );
  }

  getStructByName( name = '' ){
    return this.program.structs.find( a => a.name == name );
  }

  getVariableByName( name = '' ){
    if(typeof name == 'object' && typeof name.value == 'string') name = name.value;
    let variable = this.engine_constants.find( v => v.name == name);
    if(!variable){
      for(let i = 0; i < this.scopes.length; i++){
        if(variable) break;
        const scope = this.scopes[i];
        variable = scope.getVariable(name);
      }
    }
    return variable;
  }

  getStatementName( name = '' ){
    if(typeof name == 'object' && typeof name.value == 'string') name = name.value;
    return name;
  }

  isNameInUse( name = '' ){
    //Has this name already been used by a engine action
    const isEngineActionName = this.getActionByName(name);

    //Has this name already been used by a processed script function
    const isScriptFunctionNameInUse = this.getFunctionByName(name);

    //Has this name already been used by a processed script struct
    const isScriptStructNameInUse = this.getStructByName(name);

    //Has this name already been used by a script variable
    const isScriptVariableNameInUse = this.getVariableByName(name);

    return isEngineActionName || isScriptFunctionNameInUse || isScriptStructNameInUse || isScriptVariableNameInUse;
  }

  getValueDataType( value ){
    if(typeof value == 'object'){
      if(value.type == 'literal') return value.datatype.value;
      if(value.type == 'variable') { return value.datatype.value || value?.variable_reference?.datatype?.value || value?.variable_reference?.datatype; }
      if(value.type == 'argument') return value.datatype.value;
      if(value.type == 'function_call') return value.function_reference.returntype.value;
      if(value.type == 'add') return this.getValueDataType(value.left);
      if(value.type == 'sub') return this.getValueDataType(value.left);
      if(value.type == 'mul') return this.getValueDataType(value.left);
      if(value.type == 'div') return this.getValueDataType(value.left);
      if(value.type == 'compare') return this.getValueDataType(value.left);
    }
  }

  isValueLiteral( value = null ){
    if(typeof value == 'object' ){
      if(value.type == 'literal') return true;
    }
    return false;
  }

  throwError( message, statement ){
    this.errors.push({
      type: 'compile',
      message: message,
      statement: statement
    });
  }

  walkASTStatement( object = undefined ){
    if(object != null && typeof object === 'object'){
      if(object.type == 'program'){

        this.program = object;
        this.program.basePointer = 0;
        this.program.stackPointer = 0;

        this.program.functions = [];
        this.program.structs = [];
        this.program.scope = new NWScriptScope(this.program);
        this.program.scope.is_global = true;

        this.scope = this.program.scope;
        this.scopes = [this.program.scope];



        //detect void main()
        object.main = object.statements.find( s => s.type == 'function' && s.name == 'main' && s.returntype && this.isDataType(s.returntype, 'void') );
        if(object.main){
          //remove main function from the program's statement list
          object.statements.splice( object.statements.indexOf(object.main, 1) );
        }

        //detect int startingConditional()
        object.startingConditional = object.statements.find( s => s.type == 'function' && s.name == 'StartingConditional' && s.returntype && this.isDataType(s.returntype, 'int') );
        if(object.startingConditional){
          //remove startingConditional function from the program's statement list
          object.statements.splice( object.statements.indexOf(object.startingConditional, 1) );
        }

        //detect the global function headers
        let global_functions_headers = object.statements.filter( s => s.type == 'function' && s.header_only );
        for(let i = 0; i < global_functions_headers.length; i++){
          //remove function header from the program's statement list
          object.statements.splice( object.statements.indexOf(global_functions_headers[i]), 1 );
        }

        //detect the global functions with header and body
        let global_functions = object.statements.filter( s => s.type == 'function' && !s.header_only );
        for(let i = 0; i < global_functions.length; i++){
          //remove function from the program's statement list
          object.statements.splice( object.statements.indexOf(global_functions[i]), 1 );
        }

        //validate presence of void main() and int StartingConditional()
        if(object.main && object.startingConditional){
          this.throwError("You cannot have both `void main()` and `int StartingConditional()` declared in the same script", object);
        }else if(!object.main && !object.startingConditional){
          this.throwError("You cannot compile a script without either a void main() or int StartingConditional() declared in the script", object);
        }

        //parse global statements
        for(let i = 0; i < object.statements.length; i++){
          this.walkASTStatement(object.statements[i]);
        }

        //parse global functions
        for(let i = 0; i < global_functions.length; i++){
          this.walkASTStatement(global_functions[i]);
        }

        this.program.basePointer = this.program.stackPointer;

        if(object.main){
          object.main.called = true;
          this.walkASTStatement(object.main);
          //remove startingConditional from the functions list if it got added to it
          object.functions.splice( object.functions.indexOf(object.main), 1 );
        }else{
          object.startingConditional.called = true;
          this.walkASTStatement(object.startingConditional);
          //remove startingConditional from the functions list if it got added to it
          object.functions.splice( object.functions.indexOf(object.startingConditional), 1 );
        }

      }else if(object.type == 'function'){

        if(!this.isNameInUse(object.name)){
          object.called = false;
          this.program.functions.push(object);
          this.scope = new NWScriptScope(this.program, object.returntype);
          this.scopes.push(this.scope);

          for(let i = 0; i < object.statements.length; i++){
            this.walkASTStatement(object.statements[i]);
          }

          this.scopes.pop().popped();
        }else{
          this.throwError("this function name is already in use", object);
        }

      }else if(object.type == 'block'){
        this.scope = new NWScriptScope(this.program);
        this.scopes.push(this.scope);

        for(let i = 0; i < object.statements.length; i++){
          this.walkASTStatement(object.statements[i]);
        }

        this.scopes.pop().popped();
      }else if(object.type == 'function_call'){

        object.function_reference = undefined;
        const engineAction = this.getActionByName(object.name);
        if(engineAction){
          object.action_id = engineAction.index;
          object.function_reference = engineAction;
        }else{
          object.action_id = -1;
          const scriptFunction = this.getFunctionByName(object.name);
          if(scriptFunction){
            if(!scriptFunction.called) scriptFunction.called = true;
            object.function_reference = scriptFunction;
          }else{
            this.throwError("Tried to called an undefined function", object);
          }
        }

        //walk arguments passed to the function
        for(let i = 0; i < object.arguments.length; i++){
          const arg = object.arguments[i];
          const arg_ref = object.function_reference.arguments[i];
          this.walkASTStatement(arg);
          if(arg_ref && this.getValueDataType(arg_ref) != this.getValueDataType(arg) ){
            this.throwError(`Can't pass a value with a datatype type of [${this.getValueDataType(arg)}] to ${arg_ref.datatype.value} ${arg_ref.name}`, object);
          }else if(!arg_ref){
            this.throwError(`Can't pass a value with a datatype type of [${this.getValueDataType(arg)}] to [no argument]`, object);
          }
        }
        
      }else if(object.type == 'struct'){
        //If this is a variable declaration and the name is available
        if(this.isNameInUse(object.name)){
          this.throwError("Struct name is already in use", object);
        }

        this.program.structs.push(object);
        this.scope.addVariable(object);
      }else if(object.type == 'variable'){
        //If this is a variable declaration and the name is available
        if(object.declare && this.isNameInUse(object.name)){
          this.throwError("Variable name is already in use", object);
        }

        //If this is a variable declaration and the name is available
        if(object.declare && object.is_const){
          if(!this.isValueLiteral(object.value) || (this.getValueDataType(object.value) != 'int' && this.getValueDataType(object.value) != 'float' && this.getValueDataType(object.value) != 'string') ){
            this.throwError("Variables with declared with the keyword [const] must have a literal value of type [int], [float], or [string]", object);
          }
        }

        //Struct Variable Validation
        if(object.struct){
          if(object.declare){
            let structVar = this.getVariableByName(object.struct);
            if(structVar){
              if(structVar.type == 'struct'){
                object.struct_reference = structVar;
              }else{
                this.throwError(`Tried to access a struct [${object.struct}], but the returned type was [${structVar.type}].`, object);
              }
            }else{
              this.throwError(`Tried to access a struct [${object.struct}] that is not in this scope.`, object);
            }
          }else{
            let structVar = this.getVariableByName(object.struct);
            if(structVar){
              if(structVar.datatype.value == 'struct'){
                if(structVar.struct_reference){
                  if(structVar.struct_reference.type == 'struct'){
                    //object.struct_reference = structVar.struct_reference;
                    object.struct_reference = structVar;
                  }else{
                    this.throwError(`Tried to access a variable [${object.struct}] expecting a type of [struct], but the returned type was [${structVar.datatype.value}].`, object);
                  }
                }else{
                  this.throwError(`Tried to access a variable [${object.struct}], but struct_reference is undefined.`, object);
                }
              }else{
                //console.log(util.inspect(this.scopes, {showHidden: false, depth: null, colors: true}));
                this.throwError(`Tried to access a variable [${object.struct}] with a type of [${structVar.datatype.value}], but expected type of [struct].`, object);
              }
            }else{
              //console.log(util.inspect(this.scopes, {showHidden: false, depth: null, colors: true}));
              this.throwError(`Tried to access a variable [${object.struct}] with a type of [struct] that is not in this scope.`, object);
            }
          }
        }else{
          //If this is a variable reference and the name is in scope
          if(!object.declare && !this.isNameInUse(object.name)){
            this.throwError(`Tried to access a variable name [${object.name}] that is not in this scope.`, object);
          }
        }

        //Push this declared variable to the current scope
        if(object.declare){
          this.scope.addVariable(object);
        }else if(!object.struct){
          object.variable_reference = this.getVariableByName(object.name);
          object.datatype = object.variable_reference.datatype;
        }

        if(typeof object.value == 'object') this.walkASTStatement(object.value);

        //Struct Property Access Validation
        if(object.struct && object.name){
          if(object.struct_reference){
            if(object.struct_reference.type == 'struct'){
              for(let i = 0; i < object.struct_reference.properties.length; i++){
                const property = object.struct_reference.properties[i];
                if(property.name == object.name){
                  object.variable_reference = property;
                  object.datatype = property.datatype;
                }
              }
            }else if(object.struct_reference.type == 'variable'){
              for(let i = 0; i < object.struct_reference.struct_reference.properties.length; i++){
                const property = object.struct_reference.struct_reference.properties[i];
                if(property.name == object.name){
                  object.variable_reference = property;
                  object.datatype = property.datatype;
                }
              }
            }
          }
        }
        
        if(object.value && object.datatype.value != this.getValueDataType(object.value) ){
          this.throwError(`Can't assign a value with a datatype type of [${this.getValueDataType(object.value)}] to ${object.datatype.value} ${object.name}`, object);
        }

      }else if(object.type == 'return'){
        if(typeof object.value == 'object') this.walkASTStatement(object.value);

        let scopeReturnType = this.scopes.slice(0).reverse().find( sc => typeof sc.returntype !== 'undefined' )?.returntype;
        if(scopeReturnType){
          const valueDataType = this.getValueDataType(object.value);
          if( scopeReturnType.value != valueDataType){
            this.throwError(`Can't return a value with a datatype type of [${valueDataType}] in a scope that expects a datatype of ${scopeReturnType.value}`, object);
          }
        }

      }else if( object.type == 'if' || 
                object.type == 'elseif' || 
                object.type == 'else' || 
                object.type == 'do' || 
                object.type == 'while'
              ){
        if(typeof object.condition == 'object' && object.condition.length){
          for(let i = 0; i < object.condition.length; i++){
            this.walkASTStatement(object.condition[i]);
          }
        } 
        for(let i = 0; i < object.statements.length; i++){
          this.walkASTStatement(object.statements[i]);
        }
        if(typeof object.else == 'object') this.walkASTStatement(object.else);
      }else if( object.type == 'for'){

        //walk initializer
        if(object.initializer) this.walkASTStatement(object.initializer);

        //walk condition
        if(typeof object.condition == 'object' && object.condition.length){
          for(let i = 0; i < object.condition.length; i++){
            this.walkASTStatement(object.condition[i]);
          }
        }

        //walk incrementor
        if(object.incrementor) this.walkASTStatement(object.incrementor);

        for(let i = 0; i < object.statements.length; i++){
          this.walkASTStatement(object.statements[i]);
        }
        
      }else if(object.type == 'switch'){

        //walk switch conditions
        if(object.condition) this.walkASTStatement(object.condition);

        //walk switch case statements
        for(let i = 0; i < object.cases.length; i++){
          this.walkASTStatement(object.cases[i]);
          for(let j = 0; j < object.cases[i].statements.length; j++){
            if(object.cases[i].statements[j].type == 'break') object.cases[i].fallthrough = false;
          }
        }

        //walk switch default statement
        if(object.default && object.default.type == 'default') this.walkASTStatement(object.default);
      }else if(object.type == 'case' || object.type == 'default'){
        //walk case/default conditions
        if(object.condition) this.walkASTStatement(object.condition);

        //walk case/default statements
        for(let i = 0; i < object.statements.length; i++){
          this.walkASTStatement(object.statements[i]);
        }
      }else if(object.type == 'add' 
        || object.type == 'sub'
        || object.type == 'compare'
        || object.type == 'mul'
        || object.type == 'div'
        || object.type == 'mod'
        || object.type == 'incor'
        || object.type == 'booland'
        || object.type == 'xor'
      ){
        if(typeof object.left == 'object') this.walkASTStatement(object.left);
        if(typeof object.right == 'object') this.walkASTStatement(object.right);

        const left_type = this.getValueDataType(object.left);
        const right_type = this.getValueDataType(object.right);

        if(object.type == 'add'){
          if(    !(left_type == 'int'    && right_type == 'int')
              && !(left_type == 'int'    && right_type == 'float')
              && !(left_type == 'float'  && right_type == 'int')
              && !(left_type == 'float'  && right_type == 'float')
              && !(left_type == 'string' && right_type == 'string')
              && !(left_type == 'vector' && right_type == 'vector') 
            )
          {
            this.throwError(`Can't add types of [${left_type}] and [${right_type}] together`, object);
          }
        }else if(object.type == 'sub'){
          if(    !(left_type == 'int'    && right_type == 'int')
              && !(left_type == 'int'    && right_type == 'float')
              && !(left_type == 'float'  && right_type == 'int')
              && !(left_type == 'float'  && right_type == 'float')
              && !(left_type == 'vector' && right_type == 'vector') 
            )
          {
            this.throwError(`Can't subtract types of [${left_type}] and [${right_type}] together`, object);
          }
        }else if(object.type == 'multiply'){
          if(    !(left_type == 'int'    && right_type == 'int')
              && !(left_type == 'int'    && right_type == 'float')
              && !(left_type == 'float'  && right_type == 'int')
              && !(left_type == 'float'  && right_type == 'float')
              && !(left_type == 'vector' && right_type == 'vector') 
            )
          {
            this.throwError(`Can't multiply types of [${left_type}] and [${right_type}] together`, object);
          }
        }else if(object.type == 'divide'){
          if(    !(left_type == 'int'    && right_type == 'int')
              && !(left_type == 'int'    && right_type == 'float')
              && !(left_type == 'float'  && right_type == 'int')
              && !(left_type == 'float'  && right_type == 'float')
              && !(left_type == 'vector' && right_type == 'vector') 
            )
          {
            this.throwError(`Can't subtract types of [${left_type}] and [${right_type}] together`, object);
          }
        }else if(object.type == 'modulus'){
          if(    !(left_type == 'int'    && right_type == 'int')
            )
          {
            this.throwError(`Can't modulus types of [${left_type}] and [${right_type}] together`, object);
          }
        }else if(object.type == 'compare'){
          if(object.operator.value == '&&'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't AND types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '=='){
            if(    !(left_type == 'int'    && right_type == 'int')
                && !(left_type == 'float'  && right_type == 'float')
                && !(left_type == 'object' && right_type == 'object')
                && !(left_type == 'string' && right_type == 'string')
                && !(left_type == 'struct' && right_type == 'struct')
              )
            {
              this.throwError(`Can't EQUAL types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '!='){
            if(    !(left_type == 'int'    && right_type == 'int')
                && !(left_type == 'float'  && right_type == 'float')
                && !(left_type == 'object' && right_type == 'object')
                && !(left_type == 'string' && right_type == 'string')
                && !(left_type == 'struct' && right_type == 'struct')
              )
            {
              this.throwError(`Can't NEQUAL types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '>='){
            if(    !(left_type == 'int'    && right_type == 'int')
                && !(left_type == 'float'  && right_type == 'float')
              )
            {
              this.throwError(`Can't GEQ types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '>'){
            if(    !(left_type == 'int'    && right_type == 'int')
                && !(left_type == 'float'  && right_type == 'float')
              )
            {
              this.throwError(`Can't GT types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '<='){
            if(    !(left_type == 'int'    && right_type == 'int')
                && !(left_type == 'float'  && right_type == 'float')
              )
            {
              this.throwError(`Can't LEQ types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '<'){
            if(    !(left_type == 'int'    && right_type == 'int')
                && !(left_type == 'float'  && right_type == 'float')
              )
            {
              this.throwError(`Can't LT types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '<<'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't Left Shift types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '>>'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't Right Shift types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '>>>'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't Unsigned Right Shift types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '%'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't Modulus types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '^'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't Exclusive OR types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '||'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't OR types of [${left_type}] and [${right_type}] together`, object);
            }
          }else if(object.operator.value == '|'){
            if(    !(left_type == 'int'    && right_type == 'int')
              )
            {
              this.throwError(`Can't Inclusive OR types of [${left_type}] and [${right_type}] together`, object);
            }
          }
        }

        if(left_type != right_type){
          //this.throwError(`Can't assign a value with a datatype type of [${this.getValueDataType(object.value)}] to ${object.datatype.value} ${object.name}`, object);
        }
      }else if(object.type == 'not'
        || object.type == 'neg'
      ){
        if(typeof object.value == 'object') this.walkASTStatement(object.value);

        let value_type = this.getValueDataType(object.value);
        if(object.type == 'neg'){
          if(    !(value_type == 'int')
              && !(value_type == 'float')
            )
          {
            this.throwError(`Can't negate a value of type [${value_type}]`, object);
          }
        }else if(object.type == 'comp'){
          if( !(value_type == 'int') )
          {
            this.throwError(`Can't Ones Compliment a value of type [${value_type}]`, object);
          }
        }else if(object.type == 'not'){
          if( !(value_type == 'int') )
          {
            this.throwError(`Can't Not a value of type [${value_type}]`, object);
          }
        }else if(object.type == 'inc'){
          if( !(value_type == 'int') )
          {
            this.throwError(`Can't Increment a value of type [${value_type}]`, object);
          }
        }else if(object.type == 'dec'){
          if( !(value_type == 'int') )
          {
            this.throwError(`Can't Decrement a value of type [${value_type}]`, object);
          }
        }
      }else if(object.type == 'inc'){
        object.variable_reference = this.getVariableByName(object.name);
        object.datatype = object.variable_reference.datatype;
        if( !(object.datatype.value == 'int') )
        {
          this.throwError(`Can't Increment a value of type [${value_type}]`, object);
        }
      }else if(object.type == 'dec'){
        object.variable_reference = this.getVariableByName(object.name);
        object.datatype = object.variable_reference.datatype;
        if( !(object.datatype.value == 'int') )
        {
          this.throwError(`Can't Decrement a value of type [${value_type}]`, object);
        }
      }
    }
  }

}

class NWScriptScope {
  variables = [];
  constants = [];
  program = null;
  returntype = undefined;
  is_global = false;
  is_anonymous = false;

  constructor(program, returntype = undefined){
    this.program = program;
    this.returntype = returntype;
  }

  addVariable(variable){
    if(!this.hasVariable(variable.name)){
      if(variable.is_const){
        this.constants.push(variable);
      }else{
        this.variables.push(variable);
        variable.stackPointer = this.program.stackPointer;
        this.program.stackPointer += 4;
      }
    }
  }

  hasVariable(name = ''){
    return this.getVariable(name) ? true : false;
  }

  getVariable(name = ''){
    return this.variables.find( v => v.name == name ) || this.constants.find( v => v.name == name );
  }

  popped(){
    for(let i = 0; i < this.variables.length; i++){
      this.program.stackPointer -= 4;
    }
  }

}

module.exports = { NWScriptParser: NWScriptParser };
