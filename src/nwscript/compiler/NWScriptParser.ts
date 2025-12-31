import { NWScriptHandParser } from "./NWScriptHandParser";

const NWEngineTypeUnaryTypeOffset = 0x10;
const NWEngineTypeBinaryTypeOffset = 0x30;

const NWCompileDataTypes: any = {
  I: 0x03,
  F: 0x04,
  S: 0x05,
  O: 0x06,
  STRUCT: 0x12,

  II: 0x20,
  FF: 0x21,
  OO: 0x22,
  SS: 0x23,
  TT: 0x24,
  IF: 0x25,
  FI: 0x26,

  VV: 0x3A,
  VF: 0x3B,
  FV: 0x3C,
};

export class NWScriptParser {
  ast: any = null;
  regex_define = /#define[\s+]?([A-Za-z_][A-Za-z0-9_]+)\s+((?:[1-9](?:[0-9]+)?)|(?:[A-Za-z_][A-Za-z0-9_]+))/g;

  engine_types: any[] = [];
  engine_constants: any[] = [];
  engine_actions: any[] = [];

  local_variables: any[] = [];
  local_functions: any[] = [];
  errors: any[] = [];
  script: any;

  nwscript_source: string;

  scopes: NWScriptScope[] = [];
  program: any = {};
  scope: any;

  constructor(nwscript?: string, script?: string) {
    if (nwscript) {
      this.nwscript_source = nwscript;
      this.initializeNWScript();
    }

    if (script) {
      this.script = script;
      this.parseScript();
    }
  }

  clone() {
    const _parser = new NWScriptParser();
    _parser.engine_types = this.engine_types;
    _parser.engine_constants = this.engine_constants;
    _parser.engine_actions = this.engine_actions;
    _parser.nwscript_source = this.nwscript_source;
    return _parser;
  }

  private buildEngineTypeTableFromNWScript(): void {
    this.engine_types = [];

    const define_matches = Array.from(this.nwscript_source.matchAll(this.regex_define));
    let engine_type_index = 0;

    for (const define of define_matches) {
      if (define[1].indexOf("ENGINE_STRUCTURE_") === 0) {
        const engine_type = define[2];
        const lower = engine_type.toLowerCase();
        const upper = engine_type.toUpperCase();

        NWCompileDataTypes[upper] = NWEngineTypeUnaryTypeOffset + engine_type_index;
        NWCompileDataTypes[upper + upper] = NWEngineTypeBinaryTypeOffset + engine_type_index;

        this.engine_types.push({
          index: this.engine_types.length,
          datatype: { type: "datatype", unary: NWCompileDataTypes[upper], value: lower },
          is_engine_type: true,
          name: lower,
          value: null,
        });

        engine_type_index++;
      }
    }
  }

  initializeNWScript() {
    if (!this.nwscript_source) return;

    this.buildEngineTypeTableFromNWScript();

    // Parse nwscript.nss itself using the handwritten parser
    const hp = new NWScriptHandParser(this.nwscript_source, {
      engineTypes: this.engine_types.map((t) => ({ name: t.name, unary: t.datatype.unary })),
    });

    const ast_nwscript = hp.parseProgram();

    // Extract actions/constants the same way your old code did
    this.engine_actions = [];
    this.engine_constants = [];

    const statement_count = ast_nwscript.statements.length;
    for (let i = 0; i < statement_count; i++) {
      const statement = ast_nwscript.statements[i];

      if (statement.type === "function") {
        this.engine_actions.push({
          index: this.engine_actions.length,
          returntype: statement.returntype,
          is_engine_action: true,
          name: statement.name,
          arguments: statement.arguments,
        });
      } else if (statement.type === "variable" || statement.type === "variableList") {
        if (statement.type === "variableList") {
          this.engine_constants.push({
            index: this.engine_constants.length,
            datatype: statement.datatype,
            is_const: true,
            is_engine_constant: true,
            name: statement.names[0].name,
            value: statement.value,
            source: statement.names[0].source,
          });
        } else {
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
    }

    console.log(` `);
    console.log(` `);
    console.log(` `);
    console.log(`Found (${this.engine_constants.length}) Engine Constants`);
    console.log(`Found (${this.engine_actions.length}) Engine Actions`);
  }

  parseScript(script?: string) {
    this.script = script ? script : this.script;
    if (!this.script) return;

    const hp = new NWScriptHandParser(this.script, {
      engineTypes: this.engine_types.map((t) => ({ name: t.name, unary: t.datatype.unary })),
    });

    const program = hp.parseProgram();
    this.ast = program;

    this.errors = [];
    this.local_variables = [];
    this.local_functions = [];

    // reuse your existing post-pass (type resolution, scopes, validation, etc.)
    this.parseASTStatement(program);

    if (!this.errors.length) {
      program.parsed = true;
      console.log(`Script parsed without errors`);
    } else {
      program.parsed = false;
      console.log(`Script parsed with errors (${this.errors.length})`);
      for (let i = 0; i < this.errors.length; i++) {
        console.log("Error", this.errors[i]);
      }
    }
  }

  compile(){

  }

  isDataType( dataType?: any, value = '' ){
    return (dataType && typeof dataType == 'object' && dataType.value == value);
  }

  getActionByName( name = '' ){
    return this.engine_actions.find( a => a.name == name );
  }

  getFunctionByName( name = '' ){
    return this.program.functions.find( (a:any) => a.name == name );
  }

  getStructByName( name = '' ){
    return this.program.structs.find( (a:any) => a.name == name );
  }

  getVariableByName( name: any = '' ){
    if(name && typeof name == 'object' && typeof name.value == 'string') name = name.value;
    if(!name || (typeof name === 'object')) return undefined;

    // Engine constants are always global.
    const engineConst = this.engine_constants.find( v => v.name == name);
    if(engineConst) return engineConst;

    // Limit lookup to the global scope plus the active function scope (and its child blocks),
    // ignoring variables from callers or previously processed sibling scopes.
    const scopes: any[] = this.scopes ?? [];
    if(!scopes.length) return undefined;

    // Find the most-recent function/global scope boundary in the active stack.
    let fnStartIdx = 0; // default to global scope
    for(let i = scopes.length - 1; i >= 0; i--){
      const sc = scopes[i];
      if(sc?.is_global || typeof sc?.returntype !== 'undefined'){
        fnStartIdx = i;
        break;
      }
    }

    const allowedScopes: any[] = [];
    // Always consider the global scope first in the outer chain (scopes[0] should be global).
    if(scopes[0]) allowedScopes.push(scopes[0]);
    for(let i = fnStartIdx; i < scopes.length; i++){
      const sc = scopes[i];
      if(sc && allowedScopes.indexOf(sc) === -1){
        allowedScopes.push(sc);
      }
    }

    // Search from innermost to outermost within the allowed set.
    for(let i = allowedScopes.length - 1; i >= 0; i--){
      const scope = allowedScopes[i];
      const variable = scope.getVariable(name);
      if(variable) return variable;
    }

    return undefined;
  }

  getStatementName( name: any = '' ){
    if(name && typeof name == 'object' && typeof name.value == 'string') name = name.value;
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

  getValueDataType( value: any ): any {
    try{
      if(value && typeof value == 'object'){
        if(value.type == 'literal') return value.datatype?.value;
        if(value.type == 'variable') { 
          return value.datatype?.value || value?.variable_reference?.datatype?.value;
        }
        if(value.type == 'assign') return this.getValueDataType(value.right);
        if(value.type == 'variable_reference') {
          return value.datatype?.value || value?.variable_reference?.datatype?.value;
        }
        if(value.type == 'argument') return value.datatype?.value;
        if(value.type == 'function_call') return value.function_reference?.returntype?.value;
        if(value.type == 'add') return this.getValueDataType(value.left);
        if(value.type == 'sub') return this.getValueDataType(value.left);
        if(value.type == 'mul') return this.getValueDataType(value.left);
        if(value.type == 'div') return this.getValueDataType(value.left);
        if(value.type == 'compare') return value.datatype?.value;
        if(value.type == 'not') return this.getValueDataType(value.value);
        if(value.type == 'neg') return this.getValueDataType(value.value);
        if(value.type == 'inc') return this.getValueDataType(value.value);
        if(value.type == 'dec') return this.getValueDataType(value.value);
      }
    }catch(e){
      return 'NULL'
    }
    return undefined;
  }

  getValueDataTypeUnary( value: any ): any{
    try{
      if(value && typeof value == 'object'){
        if(value.type == 'literal') return value.datatype?.unary;
        if(value.type == 'variable') { return value.datatype?.unary || value?.variable_reference?.datatype?.unary; }
        if(value.type == 'assign') return this.getValueDataTypeUnary(value.right);
        if(value.type == 'variable_reference') { return value.datatype?.unary || value?.variable_reference?.datatype?.unary; }
        if(value.type == 'argument') return value.datatype?.unary;
        if(value.type == 'function_call') return value.function_reference?.returntype?.unary;
        if(value.type == 'add') return this.getValueDataTypeUnary(value.left);
        if(value.type == 'sub') return this.getValueDataTypeUnary(value.left);
        if(value.type == 'mul') return this.getValueDataTypeUnary(value.left);
        if(value.type == 'div') return this.getValueDataTypeUnary(value.left);
        if(value.type == 'compare') return value.datatype?.unary;
        if(value.type == 'not') return this.getValueDataTypeUnary(value.value);
        if(value.type == 'neg') return this.getValueDataTypeUnary(value.value);
        if(value.type == 'inc') return this.getValueDataTypeUnary(value.value);
        if(value.type == 'dec') return this.getValueDataTypeUnary(value.value);
      }
    }catch(e){
      return 'NULL'
    }
    return undefined;
  }

  isValueLiteral( value: any = null ){
    if(typeof value == 'object' ){
      if(value.type == 'literal') return true;
    }
    return false;
  }

  throwError( message: any, statement: any, offender: any ){
    this.errors.push({
      type: 'compile',
      message: message,
      statement: statement,
      offender: offender
    });
  }

  /**
   * Produce a JSON-safe snapshot of the parser state (no circular refs, no functions).
   */
  toJSON(){
    const snapshot = {
      ast: this.ast,
      errors: this.errors,
      engine_types: this.engine_types,
      engine_constants: this.engine_constants,
      engine_actions: this.engine_actions,
      local_variables: this.local_variables,
      local_functions: this.local_functions,
      program: this.program,
    };
    const seen = new WeakSet();
    const replacer = (_key: string, value: any) => {
      if(typeof value === 'function') return undefined;
      if(value && typeof value === 'object'){
        if(seen.has(value)) return undefined;
        seen.add(value);
      }
      return value;
    };
    return JSON.parse(JSON.stringify(snapshot, replacer));
  }

  parseProgram(program: any){
    this.program = program;
    this.program.basePointer = 0;
    this.program.stackPointer = 0;

    this.program.functions = [];
    this.program.structs = [];
    this.program.scope = new NWScriptScope(this.program);
    this.program.scope.is_global = true;

    this.scope = this.program.scope;
    this.scopes = [this.program.scope];



    //detect void main()
    program.main = program.statements.find( (s: any) => s.type == 'function' && s.name == 'main' && s.returntype && this.isDataType(s.returntype, 'void') );
    if(program.main){
      //remove main function from the program's statement list
      program.statements.splice( program.statements.indexOf(program.main, 1) );
    }

    //detect int startingConditional()
    program.startingConditional = program.statements.find( (s: any) => s.type == 'function' && s.name == 'StartingConditional' && s.returntype && this.isDataType(s.returntype, 'int') );
    if(program.startingConditional){
      //remove startingConditional function from the program's statement list
      program.statements.splice( program.statements.indexOf(program.startingConditional, 1) );
    }

    //detect the global function headers
    let global_functions_headers = program.statements.filter( (s: any) => s.type == 'function' && s.header_only );
    for(let i = 0; i < global_functions_headers.length; i++){
      //remove function header from the program's statement list
      program.statements.splice( program.statements.indexOf(global_functions_headers[i]), 1 );
    }

    //detect the global functions with header and body
    let global_functions = program.statements.filter( (s: any) => s.type == 'function' && !s.header_only );
    for(let i = 0; i < global_functions.length; i++){
      //remove function from the program's statement list
      const function_header = global_functions_headers.find( (f:any) => f.name == global_functions[i].name );
      if(function_header){
        global_functions[i].arguments = function_header.arguments;
      }
      this.local_functions.push(global_functions[i]);
      this.program.functions.push(global_functions[i]);
      program.statements.splice( program.statements.indexOf(global_functions[i]), 1 );
    }

    //validate presence of void main() and int StartingConditional()
    if(program.main && program.startingConditional){
      this.throwError("You cannot have both `void main()` and `int StartingConditional()` declared in the same script", program, program);
    }else if(!program.main && !program.startingConditional){
      this.throwError("You cannot compile a script without either a void main() or int StartingConditional() declared in the script", program, program);
    }

    //parse global statements
    for(let i = 0; i < program.statements.length; i++){
      this.parseASTStatement(program.statements[i]);
    }

    //parse global functions
    // for(let i = 0; i < global_functions.length; i++){
    //   this.walkASTStatement(global_functions[i]);
    // }

    this.program.basePointer = this.program.stackPointer;

    if(program.main){
      program.main.called = true;
      this.parseASTStatement(program.main);
      //remove startingConditional from the functions list if it got added to it
      program.functions.splice( program.functions.indexOf(program.main), 1 );
    }else if(program.startingConditional){
      program.startingConditional.called = true;
      this.parseASTStatement(program.startingConditional);
      //remove startingConditional from the functions list if it got added to it
      program.functions.splice( program.functions.indexOf(program.startingConditional), 1 );
    }
  }

  parseFunctionNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'function'){
      this.throwError("Invalid function node", statement, statement);
    }
    console.log('function', statement);
    if(!statement.defined || !this.isNameInUse(statement.name)){
      statement.defined = true;
      this.scope = new NWScriptScope(this.program, statement.returntype);
      this.scopes.push(this.scope);

      let argStackOffset = 0;
      for(let i = 0; i < statement.arguments.length; i++){
        argStackOffset += 4;//this.getDataTypeStackLength(object.arguments[i]);
        this.parseASTStatement(statement.arguments[i]);
        // this.scope.addVariable(object.arguments[i]);
        this.scope.addArgument(statement.arguments[i]);
        statement.arguments[i].stackOffset = argStackOffset;
      }

      for(let i = 0; i < statement.statements.length; i++){
        this.parseASTStatement(statement.statements[i]);
      }

      this.scopes.pop()?.popped();
      this.scope = this.scopes[this.scopes.length - 1];
    }else{
      this.throwError("this function name is already in use", statement, statement);
    }
  }

  parseBlockNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'block'){
      this.throwError("Invalid block node", statement, statement);
    }
    this.scope = new NWScriptScope(this.program);
    this.scopes.push(this.scope);

    for(let i = 0; i < statement.statements.length; i++){
      this.parseASTStatement(statement.statements[i]);
    }

    this.scopes.pop()?.popped();
    this.scope = this.scopes[this.scopes.length - 1];
  }

  parseFunctionCallNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'function_call'){
      this.throwError("Invalid function call node", statement, statement);
    }
    statement.function_reference = undefined;
    const engineAction = this.getActionByName(statement.name);
    if(engineAction){
      statement.action_id = engineAction.index;
      statement.function_reference = engineAction;
    }else{
      statement.action_id = -1;
      const scriptFunction = this.getFunctionByName(statement.name);
      if(scriptFunction){
        if(!scriptFunction.called){
          scriptFunction.called = true;
          this.parseASTStatement(scriptFunction);
        } 
        statement.function_reference = scriptFunction;
      }else{
        this.throwError("Tried to call an undefined function", statement, statement);
      }
    }

    if(statement.function_reference){
      //walk arguments passed to the function
      const args = statement.arguments;
      const ref_args = statement.function_reference.arguments;
      for(let i = 0; i < ref_args.length; i++){
        let arg = args[i];
        const arg_ref = ref_args[i];

        //Check to see if an argument was not supplied and the function reference 
        //has a default argument value to use in place of unsupplied arguments
        if(!arg && (typeof arg_ref.value !== 'undefined') ){
          //generate a default argument if one is not supplied
          const var_ref = this.getVariableByName(arg_ref.value);
          if(var_ref){
            arg = var_ref.value;
            statement.arguments.splice(i, 0, arg);
          }else{
            arg = { type: 'literal', datatype: arg_ref.datatype, value: arg_ref.value };
            statement.arguments.splice(i, 0, arg);
          }
        }

        if(arg){
          this.parseASTStatement(arg);

          if(arg_ref && ( this.getValueDataType(arg_ref) != this.getValueDataType(arg) ) ){
            const argDataType = this.getValueDataType(arg);
            const argRefDataType = this.getValueDataType(arg_ref);
            
            if(arg_ref.datatype.value == 'action'){
              if(!arg.function_reference){
                this.throwError(`Can't pass a function call to ${arg_ref.datatype.value} ${arg_ref.name}`, statement, arg);
              }
            }else{
              const argTypeStr = argDataType !== undefined ? argDataType : 'unknown';
              this.throwError(`Can't pass a value with a datatype type of [${argTypeStr}] to ${arg_ref.datatype.value} ${arg_ref.name}`, statement, arg);
            }
          }else if(!arg_ref){
            const argDataType = this.getValueDataType(arg);
            const argTypeStr = argDataType !== undefined ? argDataType : 'unknown';
            this.throwError(`Can't pass a value with a datatype type of [${argTypeStr}] to [no argument]`, statement, arg);
          }
        }else{
          this.throwError(`Function call argument missing a value for ${arg_ref.datatype.value} ${arg_ref.name} and no default value is available`, statement, arg);
        }
      }
    }else{
      this.throwError(`Missing definition for function ${statement.name}`, statement, statement);
    }
  }

  parseStructNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'struct'){
      this.throwError("Invalid struct node", statement, statement);
    }
    //If this is a variable declaration and the name is available
    if(this.isNameInUse(statement.name)){
      this.throwError("Struct name is already in use", statement, statement);
    }
    this.program.structs.push(statement);
    this.scope.addVariable(statement);
  }

  parsePropertyNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'property'){
      this.throwError("Invalid property node", statement, statement);
    }
    if(statement.left && statement.left.type == 'variable_reference'){
      statement.variable_reference = this.getVariableByName(`${statement.left.name}.${statement.name}`);
      statement.datatype = statement.left?.variable_reference?.datatype;
      statement.is_global = statement.left?.variable_reference?.is_global;
      console.log('property', statement, `${statement.left.name}.${statement.name}`, statement.variable_reference);
    }

    if(statement.right){
      this.parseASTStatement(statement.right);
    }
  }

  parseVariableListNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'variableList'){
      this.throwError("Invalid variable list node", statement, statement);
    }
    statement.variables = [];
    for(let i = 0; i < statement.names.length; i++){
      const _var = { type: 'variable', is_const: statement.is_const, declare: statement.declare, datatype: statement.datatype, name: statement.names[i].name, value: statement.value, source: statement.names[i].source };
      statement.variables[i] = _var;
    }

    for(let i = 0; i < statement.variables.length; i++){
      this.parseASTStatement(statement.variables[i]);
    }
  }

  parseVariableReferenceNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'variable_reference'){
      this.throwError("Invalid variable reference node", statement, statement);
    }
    // Resolve reference against engine constants, locals, or globals
    statement.variable_reference = this.getVariableByName(statement.name);
    statement.datatype = statement?.variable_reference?.datatype;
    statement.is_global = statement?.variable_reference?.is_global;
    if(!statement.variable_reference){
      this.throwError(`Tried to access a variable name [${statement.name}] that is not in this scope.`, statement, statement);
    }
  }

  parseVariableNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'variable'){
      this.throwError("Invalid variable node", statement, statement);
    }
    //If this is a variable declaration and the name is available
    if(statement.declare && this.isNameInUse(statement.name)){
      this.throwError("Variable name is already in use", statement, statement);
    }

    //If this is a variable declaration and the name is available
    if(statement.declare && statement.is_const){
      if(!this.isValueLiteral(statement.value) || (this.getValueDataType(statement.value) != 'int' && this.getValueDataType(statement.value) != 'float' && this.getValueDataType(statement.value) != 'string') ){
        this.throwError("Variables with declared with the keyword [const] must have a literal value of type [int], [float], or [string]", statement, statement.value);
      }
    }

    //Struct Variable Validation
    if(statement.struct){
      const structVar = this.getVariableByName(statement.struct);
      if(!structVar){
        //console.log(util.inspect(this.scopes, {showHidden: false, depth: null, colors: true}));
        this.throwError(`Tried to access a variable [${statement.struct}] with a type of [struct] that is not in this scope.`, statement, statement);
        return;
      }
      statement.struct_reference = structVar || statement.struct_reference;
      if(statement.declare){
        if(structVar.type == 'struct'){
          statement.struct_reference = structVar;
        }else{
          this.throwError(`Tried to access a struct [${statement.struct}], but the returned type was [${structVar.type}].`, statement, structVar);
        }
      }else{
        if(structVar.datatype.value == 'struct'){
          if(structVar.struct_reference){
            if(structVar.struct_reference.type == 'struct'){
              //object.struct_reference = structVar.struct_reference;
              statement.struct_reference = structVar;
            }else{
              this.throwError(`Tried to access a variable [${statement.struct}] expecting a type of [struct], but the returned type was [${structVar.datatype.value}].`, statement, statement);
            }
          }else{
            this.throwError(`Tried to access a variable [${statement.struct}], but struct_reference is undefined.`, statement, statement);
          }
        }else{
          this.throwError(`Tried to access a variable [${statement.struct}] with a type of [${structVar.datatype.value}], but expected type of [struct].`, statement, structVar);
        }
      }
    }else{
      //If this is a variable reference and the name is in scope
      if(!statement.declare && !this.isNameInUse(statement.name)){
        this.throwError(`Tried to access a variable name [${statement.name}] that is not in this scope.`, statement, statement);
      }
    }

    //Push this declared variable to the current scope
    if(statement.declare){
      this.local_variables.push(statement);
      this.scope.addVariable(statement);
      if(statement.datatype.struct){
        const structReference = this.getVariableByName(statement.datatype.struct);
        if(structReference){
          statement.struct_reference = structReference;
        }else{
          this.throwError(`Tried to access a struct [${statement.datatype.struct}] that is not in this scope.`, statement, statement);
        }
      }
    }else if(!statement.struct){
      statement.variable_reference = this.getVariableByName(statement.name);
      statement.datatype = statement?.variable_reference?.datatype;
      statement.is_global = statement?.variable_reference?.is_global;
    }

    if(typeof statement.value == 'object') this.parseASTStatement(statement.value);

    //Struct Property Access Validation
    if(statement.struct && statement.name){
      if(statement.struct_reference){
        if(statement.struct_reference.type == 'struct'){
          for(let i = 0; i < statement.struct_reference.properties.length; i++){
            const property = statement.struct_reference.properties[i];
            if(property.name == statement.name){
              statement.variable_reference = property;
              statement.datatype = property.datatype;
              statement.is_global = statement?.variable_reference?.is_global;
            }
          }
        }else if(statement.struct_reference.type == 'variable'){
          for(let i = 0; i < statement.struct_reference.struct_reference.properties.length; i++){
            const property = statement.struct_reference.struct_reference.properties[i];
            if(property.name == statement.name){
              statement.variable_reference = property;
              statement.datatype = property.datatype;
              statement.is_global = statement?.variable_reference?.is_global;
            }
          }
        }
      }
    }

    if(statement.value && statement.datatype && statement?.datatype?.value != this.getValueDataType(statement.value) ){
      this.throwError(`Can't assign a value with a datatype type of [${this.getValueDataType(statement.value)}] to ${statement.datatype.value} ${statement.name}`, statement, statement.value);
    }
  }

  parseReturnNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'return'){
      this.throwError("Invalid return node", statement, statement);
    }
    if(typeof statement.value == 'object') this.parseASTStatement(statement.value);

    let scopeReturnType = this.scopes.slice(0).reverse().find( sc => typeof sc.returntype !== 'undefined' )?.returntype;
    if(scopeReturnType){
      const valueDataType = this.getValueDataType(statement.value);
      if(scopeReturnType.value == 'void'){
        if(statement.value != null) this.throwError(`Can't return a value with a datatype type of [${valueDataType}] in a scope that expects a datatype of ${scopeReturnType.value}`, statement, statement.value);
      }else if( scopeReturnType.value != valueDataType){
        this.throwError(`Can't return a value with a datatype type of [${valueDataType}] in a scope that expects a datatype of ${scopeReturnType.value}`, statement, statement.value);
      }
    }
  }

  parseConditionNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || (statement.type !== 'if' && statement.type !== 'elseif' && statement.type !== 'else' && statement.type !== 'do' && statement.type !== 'while')){
      this.throwError("Invalid condition node", statement, statement);
    }
    const conds = Array.isArray(statement.condition) ? statement.condition : (statement.condition ? [statement.condition] : []);
    for(let i = 0; i < conds.length; i++){
      this.parseASTStatement(conds[i]);
    } 

    const elseIfs = Array.isArray(statement.elseIfs) ? statement.elseIfs : (statement.elseIfs ? [statement.elseIfs] : []);
    for(let i = 0; i < elseIfs.length; i++){
      this.parseASTStatement(elseIfs[i]);
    }

    if(statement.else){
      this.parseASTStatement(statement.else);
    }

    this.scope = new NWScriptScope(this.program);
    this.scopes.push(this.scope);

    for(let i = 0; i < statement.statements.length; i++){
      this.parseASTStatement(statement.statements[i]);
    }

    this.scopes.pop()?.popped();
    this.scope = this.scopes[this.scopes.length - 1];

    if(typeof statement.else == 'object' && Array.isArray(statement.else)){
      let else_declared = false;
      for(let i = 0; i < statement.else.length; i++){
        this.scope = new NWScriptScope(this.program);
        this.scopes.push(this.scope);

        const elseIf = statement.else[i];
        if(elseIf.type == 'else'){
          if(else_declared){
            this.throwError('Only one else statement can be chained in an If Else statement', statement, elseIf);
          }

          if(i != (statement.else.length-1)){
            this.throwError('Else statements can only be declared at the end of an If Else statement', statement, elseIf);
          }

          else_declared = true;
        }

        this.parseASTStatement(elseIf);

        this.scopes.pop()?.popped();
        this.scope = this.scopes[this.scopes.length - 1];
      }
    }
  }

  parseForNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'for'){
      this.throwError("Invalid for node", statement, statement);
    }
    //walk initializer
    if(statement.initializer) this.parseASTStatement(statement.initializer);

    //walk condition
    const conds = Array.isArray(statement.condition) ? statement.condition : (statement.condition ? [statement.condition] : []);
    for(let i = 0; i < conds.length; i++){
      this.parseASTStatement(conds[i]);
    }

    //walk incrementor
    if(statement.incrementor) this.parseASTStatement(statement.incrementor);

    this.scope = new NWScriptScope(this.program);
    this.scopes.push(this.scope);

    for(let i = 0; i < statement.statements.length; i++){
      this.parseASTStatement(statement.statements[i]);
    }

    this.scopes.pop()?.popped();
    this.scope = this.scopes[this.scopes.length - 1];
  }

  parseSwitchNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'switch'){
      this.throwError("Invalid switch node", statement, statement);
    }
    //walk switch conditions
    if(statement.condition) this.parseASTStatement(statement.condition);

    //walk switch case statements
    for(let i = 0; i < statement.cases.length; i++){
      this.parseASTStatement(statement.cases[i]);
      for(let j = 0; j < statement.cases[i].statements.length; j++){
        if(statement.cases[i].statements[j].type == 'break') statement.cases[i].fallthrough = false;
      }
    }

    //walk switch default statement
    if(statement.default && statement.default.type == 'default') this.parseASTStatement(statement.default);
  }

  parseCaseNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'case'){
      this.throwError("Invalid case node", statement, statement);
    }
    //walk case/default conditions
    if(statement.condition) this.parseASTStatement(statement.condition);

    //walk case/default statements
    for(let i = 0; i < statement.statements.length; i++){
      this.parseASTStatement(statement.statements[i]);
    }
  }

  parseDefaultNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || statement.type !== 'case'){
      this.throwError("Invalid case node", statement, statement);
    }
    //walk case/default conditions
    if(statement.condition) this.parseASTStatement(statement.condition);

    //walk case/default statements
    for(let i = 0; i < statement.statements.length; i++){
      this.parseASTStatement(statement.statements[i]);
    }
  }

  parseArithmeticNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || (statement.type !== 'add' && statement.type !== 'sub' && statement.type !== 'compare' && statement.type !== 'mul' && statement.type !== 'div' && statement.type !== 'mod' && statement.type !== 'incor' && statement.type !== 'booland' && statement.type !== 'xor' && statement.type !== 'assign')){
      this.throwError("Invalid arithmetic node", statement, statement);
    }
    if(typeof statement.left == 'object') this.parseASTStatement(statement.left);
    if(typeof statement.right == 'object') this.parseASTStatement(statement.right);

    const left_type = this.getValueDataType(statement.left);
    const left_type_unary = this.getValueDataTypeUnary(statement.left);
    const right_type = this.getValueDataType(statement.right);
    const right_type_unary = this.getValueDataTypeUnary(statement.right);

    // propagate datatype onto this arithmetic/compare node
    if(!statement.datatype){
      if(left_type){
        statement.datatype = { type:'datatype', value:left_type, unary:left_type_unary };
      }else if(right_type){
        statement.datatype = { type:'datatype', value:right_type, unary:right_type_unary };
      }
    }

    if(statement.type == 'mul'){
      console.log('mul', statement.left, statement.right);
      console.log('left_type', left_type);
      console.log('right_type', right_type);
      console.log('left_type_unary', left_type_unary);
      console.log('right_type_unary', right_type_unary);
    }

    if(statement.type == 'add'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'string' && right_type == 'string')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't add types of [${left_type}] and [${right_type}] together`, statement, statement.right);
      }
    }else if(statement.type == 'sub'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't subtract types of [${left_type}] and [${right_type}] together`, statement, statement.right);
      }
    }else if(statement.type == 'multiply'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't multiply types of [${left_type}] and [${right_type}] together`, statement, statement.right);
      }
    }else if(statement.type == 'divide'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't subtract types of [${left_type}] and [${right_type}] together`, statement, statement.right);
      }
    }else if(statement.type == 'modulus'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't modulus types of [${left_type}] and [${right_type}] together`, statement, statement.right);
      }
    }else if(statement.type == 'compare'){
      if(statement.operator.value == '&&'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't AND types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '=='){
        if(    !(left_type == 'int'    && right_type == 'int')
            && !(left_type == 'float'  && right_type == 'float')
            && !(left_type == 'object' && right_type == 'object')
            && !(left_type == 'string' && right_type == 'string')
            && !(left_type == 'struct' && right_type == 'struct')
          )
        {
          if( (left_type_unary == right_type_unary) && (left_type_unary >= 0x10 && left_type_unary <= 0x1F) && (right_type_unary >= 0x10 && right_type_unary <= 0x1F) ){
            //
          }else{
            this.throwError(`Can't EQUAL types of [${left_type}] and [${right_type}] together`, statement, statement.right);
          }
        }
      }else if(statement.operator.value == '!='){
        if(    !(left_type == 'int'    && right_type == 'int')
            && !(left_type == 'float'  && right_type == 'float')
            && !(left_type == 'object' && right_type == 'object')
            && !(left_type == 'string' && right_type == 'string')
            && !(left_type == 'struct' && right_type == 'struct')
          )
        {
          if( (left_type_unary == right_type_unary) && (left_type_unary >= 0x10 && left_type_unary <= 0x1F) && (right_type_unary >= 0x10 && right_type_unary <= 0x1F) ){
            //
          }else{
            this.throwError(`Can't NEQUAL types of [${left_type}] and [${right_type}] together`, statement, statement.right);
          }
        }
      }else if(statement.operator.value == '>='){
        if(    !(left_type == 'int'    && right_type == 'int')
            && !(left_type == 'float'  && right_type == 'float')
          )
        {
          this.throwError(`Can't GEQ types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '>'){
        if(    !(left_type == 'int'    && right_type == 'int')
            && !(left_type == 'float'  && right_type == 'float')
          )
        {
          this.throwError(`Can't GT types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '<='){
        if(    !(left_type == 'int'    && right_type == 'int')
            && !(left_type == 'float'  && right_type == 'float')
          )
        {
          this.throwError(`Can't LEQ types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '<'){
        if(    !(left_type == 'int'    && right_type == 'int')
            && !(left_type == 'float'  && right_type == 'float')
          )
        {
          this.throwError(`Can't LT types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '<<'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't Left Shift types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '>>'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't Right Shift types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '>>>'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't Unsigned Right Shift types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '%'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't Modulus types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '^'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't Exclusive OR types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '||'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't OR types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }else if(statement.operator.value == '|'){
        if(    !(left_type == 'int'    && right_type == 'int')
          )
        {
          this.throwError(`Can't Inclusive OR types of [${left_type}] and [${right_type}] together`, statement, statement.right);
        }
      }
    }else if(statement.type == 'assign'){
      if(left_type != right_type){
        this.throwError(`Can't assign a value of type [${right_type}] to a variable of type [${left_type}]`, statement, statement.right);
      }
    }
  }

  parseUnaryNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || (statement.type !== 'not' && statement.type !== 'neg' && statement.type !== 'comp')){
      this.throwError("Invalid unary node", statement, statement);
    }
    if(typeof statement.value == 'object') this.parseASTStatement(statement.value);

    let value_type = this.getValueDataType(statement.value);
    let value_type_unary = this.getValueDataTypeUnary(statement.value);
    statement.datatype = { type: 'datatype', unary: value_type_unary, value: value_type };
    if(statement.type == 'neg'){
      if(    !(value_type == 'int')
          && !(value_type == 'float')
        )
      {
        this.throwError(`Can't negate a value of type [${value_type}]`, statement, statement.value);
      }
    }else if(statement.type == 'comp'){
      if( !(value_type == 'int') )
      {
        this.throwError(`Can't Ones Compliment a value of type [${value_type}]`, statement, statement.value);
      }
    }else if(statement.type == 'not'){
      if( !(value_type == 'int') )
      {
        this.throwError(`Can't Not a value of type [${value_type}]`, statement, statement.value);
      }
    }
  }

  parseIncDecNode( statement: any = undefined ){
    if(!statement || (typeof statement !== 'object') || (statement.type !== 'inc' && statement.type !== 'dec')){
      this.throwError("Invalid inc/dec node", statement, statement);
    }
    const value_type = this.getValueDataType(statement.value);
    statement.variable_reference = this.getVariableByName(statement?.value?.name);
    if(statement.variable_reference){
      statement.datatype = statement.variable_reference.datatype;
      statement.is_global = statement.variable_reference.is_global;
      if( !(statement.datatype.value == 'int') )
      {
        this.throwError(`Can't Increment a value of type [${value_type}]`, statement, statement.value);
      }
    }
  }

  parseASTStatement( statement: any = undefined ){
    console.log('statement', statement);
    if(!statement || (typeof statement !== 'object')){
      this.throwError("Invalid statement", statement, statement);
      return;
    }

    switch(statement.type){
      case 'program':
        this.parseProgram(statement);
        break;
      case 'function':
        this.parseFunctionNode(statement);
        break;
      case 'block':
        this.parseBlockNode(statement);
        break;
      case 'function_call':
        this.parseFunctionCallNode(statement);
        break;
      case 'struct':
        this.parseStructNode(statement);
        break;
      case 'property':
        this.parsePropertyNode(statement);
        break;
      case 'variableList':
        this.parseVariableListNode(statement);
        break;
      case 'variable_reference':
        this.parseVariableReferenceNode(statement);
        break;
      case 'variable':
        this.parseVariableNode(statement);
        break;
      case 'return':
        this.parseReturnNode(statement);
        break;
      case 'if':
      case 'elseif':
      case 'else':
      case 'do':
      case 'while':
        this.parseConditionNode(statement);
        break;
      case 'for':
        this.parseForNode(statement);
        break;
      case 'switch':
        this.parseSwitchNode(statement);
        break;
      case 'case':
        this.parseCaseNode(statement);
        break;
      case 'default':
        this.parseDefaultNode(statement);
        break;
      case 'add':
      case 'sub':
      case 'compare':
      case 'mul':
      case 'div':
      case 'mod':
      case 'incor':
      case 'booland':
      case 'xor':
      case 'assign':
        this.parseArithmeticNode(statement);
        break;
      case 'not':
      case 'neg':
      case 'comp':
        this.parseUnaryNode(statement);
        break;
      case 'inc':
      case 'dec':
        this.parseIncDecNode(statement);
        break;
      default:
        console.warn('unhandled statement', statement.type);
        console.log(statement);
      break;
    }
  }

  getDataTypeStackLength( datatype?: any ): number {
    if(datatype && datatype.type == 'datatype'){
      switch(datatype.value){
        case 'void':    return 0;
        case 'vector':  return 12;
        case 'int':     return 4;
        case 'float':   return 4;
        case 'string':  return 4;
        case 'object':  return 4;
        default:        return 4;
      }
    }
    throw 'Invalid datatype object ' + datatype;
  }

}

class NWScriptScope {
  arguments: any[] = [];
  variables: any[] = [];
  constants: any[] = [];
  program: any = null;
  returntype: any = undefined;
  is_global = false;
  is_anonymous = false;

  constructor(program: any, returntype: any = undefined){
    this.program = program;
    this.returntype = returntype;
  }

  addVariable(variable: any){
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

  addArgument(argument: any){
    if(!this.hasArgument(argument.name)){
      this.arguments.push(argument);
    }
  }

  hasArgument(name = ''){
    return this.getArgument(name) ? true : false;
  }

  getArgument(name = ''){
    return this.arguments.find( v => v.name == name );
  }

  hasVariable(name = ''){
    return this.getVariable(name) ? true : false;
  }

  getVariable(name = ''){
    console.log('getVariable', name, this.variables.slice(0), this.constants.slice(0));
    if(!name || typeof name != 'string'){
      console.error('getVariable: name is not a string');
    }
    const isStructProperty = name?.includes('.');
    if(isStructProperty){
      const parts = name.split('.');
      const structName = parts[0];
      const propertyName = parts[1];
      const struct = this.getVariable(structName);
      if(struct){
        console.log(struct);
        return struct?.struct_reference?.properties?.find( p => p.name == propertyName );
      }
    }
    return this.variables.find( v => v.name == name ) || this.arguments.find( v => v.name == name ) || this.constants.find( v => v.name == name );
  }

  popped(){
    for(let i = 0; i < this.variables.length; i++){
      this.program.stackPointer -= 4;
    }
  }

}
