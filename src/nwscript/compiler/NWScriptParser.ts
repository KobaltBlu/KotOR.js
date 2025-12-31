import type { Token } from "./NWScriptToken";
import { ArrayLiteralNode, AssignNode, BinaryOpNode, BlockNode, CallNode, CaseNode, CompareNode, DefaultNode, DoWhileNode, ElseIfNode, ElseNode, ForNode, FunctionCallNode, FunctionNode, IfNode, IncDecNode, IndexNode, LiteralNode, NWScriptHandParser, ProgramNode, ReturnNode, StructNode, StructPropertyNode, SwitchNode, UnaryNode, VariableListNode, VariableNode, VariableReferenceNode, WhileNode } from "./NWScriptHandParser";

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

type SourceInfo = Token["source"] | undefined;

interface AnnotatedNode {
  type: string;
  source?: SourceInfo;
}

// Program-level
interface SemanticProgramNode extends AnnotatedNode {
  type: "program";
  statements: SemanticStatementNode[];
  functions: SemanticFunctionNode[];
  structs: SemanticStructNode[];
  scope: SemanticScope;
  basePointer: number;
  stackPointer: number;
  main?: SemanticFunctionNode;
  startingConditional?: SemanticFunctionNode;
  parsed?: boolean;
}

// Scope metadata (not part of AST, but handy to type)
interface SemanticScope {
  arguments: SemanticArgumentNode[];
  variables: SemanticVariableNode[];
  constants: SemanticVariableNode[];
  program: SemanticProgramNode;
  returntype?: SemanticDataType;
  is_global: boolean;
  is_anonymous: boolean;
}

// Data types
interface SemanticDataType {
  type: "datatype";
  value: string;
  unary: number;
  engine_type?: boolean;
  struct?: string;
}

// Structs
interface SemanticStructNode extends AnnotatedNode {
  type: "struct";
  name: string;
  properties: SemanticStructPropertyNode[];
  is_global: boolean;
  stackPointer?: number;
}

interface SemanticStructPropertyNode extends AnnotatedNode {
  type: "property";
  name: string;
  datatype: SemanticDataType;
}

// Functions
interface SemanticFunctionNode extends AnnotatedNode {
  type: "function";
  name: string;
  header_only: boolean;
  defined?: boolean;
  called?: boolean;
  returntype: SemanticDataType;
  arguments: SemanticArgumentNode[];
  statements: SemanticStatementNode[];
}

interface SemanticArgumentNode extends AnnotatedNode {
  type: "argument";
  name: string;
  datatype: SemanticDataType;
  value?: SemanticExpressionNode; // default value
  stackPointer?: number;
}

// Variables
interface SemanticVariableNode extends AnnotatedNode {
  type: "variable";
  name: string;
  declare: boolean;
  is_const: boolean;
  is_global: boolean;
  datatype: SemanticDataType;
  value: SemanticExpressionNode | null;
  variable_reference?: SemanticVariableNode | SemanticStructPropertyNode;
  struct?: string;
  struct_reference?: SemanticStructNode | SemanticVariableNode;
  stackPointer?: number;
}

interface SemanticVariableListNode extends AnnotatedNode {
  type: "variableList";
  is_const: boolean;
  declare: boolean;
  datatype: SemanticDataType;
  names: Array<{ name: string; source?: SourceInfo }>;
  value: SemanticExpressionNode | null;
  variables?: SemanticVariableNode[]; // filled during post-pass
}

// Expressions / calls / props
interface SemanticVariableReferenceNode extends AnnotatedNode {
  type: "variable_reference";
  name: string;
  datatype?: SemanticDataType;
  is_global?: boolean;
  variable_reference?: SemanticVariableNode | SemanticStructPropertyNode;
}

interface SemanticFunctionCallNode extends AnnotatedNode {
  type: "function_call";
  name: string;
  arguments: SemanticExpressionNode[];
  function_reference?: SemanticFunctionNode | EngineActionRef;
  action_id?: number; // engine action index, -1 if script function
}

interface EngineActionRef {
  index: number;
  name: string;
  returntype: SemanticDataType;
  arguments: SemanticArgumentNode[];
}

interface SemanticPropertyNode extends AnnotatedNode {
  type: "property";
  left: SemanticExpressionNode;
  name: string;
  datatype?: SemanticDataType;
  is_global?: boolean;
  variable_reference?: SemanticStructPropertyNode;
  right?: SemanticExpressionNode; // if assignment
}

// Control flow
interface SemanticBlockNode extends AnnotatedNode {
  type: "block";
  statements: SemanticStatementNode[];
}

interface SemanticIfNode extends AnnotatedNode {
  type: "if";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
  elseIfs: SemanticElseIfNode[];
  else: SemanticElseNode | null;
}

interface SemanticElseIfNode extends AnnotatedNode {
  type: "elseif";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
}

interface SemanticElseNode extends AnnotatedNode {
  type: "else";
  statements: SemanticStatementNode[];
}

interface SemanticWhileNode extends AnnotatedNode {
  type: "while";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
}

interface SemanticDoWhileNode extends AnnotatedNode {
  type: "do";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
}

interface SemanticForNode extends AnnotatedNode {
  type: "for";
  initializer: SemanticVariableNode | SemanticVariableListNode | SemanticExpressionNode | null;
  condition: SemanticExpressionNode | null;
  incrementor: SemanticExpressionNode | null;
  statements: SemanticStatementNode[];
}

interface SemanticSwitchNode extends AnnotatedNode {
  type: "switch";
  condition: SemanticExpressionNode;
  cases: SemanticCaseNode[];
  default: SemanticDefaultNode | null;
}

interface SemanticCaseNode extends AnnotatedNode {
  type: "case";
  condition: SemanticExpressionNode;
  value: SemanticExpressionNode;
  statements: SemanticStatementNode[];
  fallthrough?: boolean;
}

interface SemanticDefaultNode extends AnnotatedNode {
  type: "default";
  statements: SemanticStatementNode[];
}

// Returns / break / continue
interface SemanticReturnNode extends AnnotatedNode {
  type: "return";
  value: SemanticExpressionNode | null;
}

interface SemanticBreakNode extends AnnotatedNode { type: "break"; }
interface SemanticContinueNode extends AnnotatedNode { type: "continue"; }

// Arithmetic / logical / unary / inc/dec
interface SemanticCompareNode extends AnnotatedNode {
  type: "compare";
  left: SemanticExpressionNode;
  right: SemanticExpressionNode;
  operator: { type: "operator"; value: string };
  datatype: SemanticDataType;
}

interface SemanticBinaryNode extends AnnotatedNode {
  type: "add" | "sub" | "mul" | "div" | "mod" | "incor" | "xor" | "booland" | "assign" | "compare";
  left: SemanticExpressionNode;
  right: SemanticExpressionNode;
  operator?: { type: "operator"; value: string };
  datatype?: SemanticDataType;
}

interface SemanticUnaryNode extends AnnotatedNode {
  type: "not" | "neg" | "comp";
  value: SemanticExpressionNode;
  datatype?: SemanticDataType;
}

interface SemanticIncDecNode extends AnnotatedNode {
  type: "inc" | "dec";
  value: SemanticExpressionNode;
  postfix?: boolean;
  datatype?: SemanticDataType;
  is_global?: boolean;
  variable_reference?: SemanticVariableNode | SemanticStructPropertyNode;
}

// Literals / arrays / index / call / property reuse existing shapes but typed as SemanticExpressionNode
type SemanticLiteralNode = LiteralNode & { datatype: SemanticDataType };
type SemanticArrayLiteralNode = ArrayLiteralNode & { elements: SemanticExpressionNode[] };
type SemanticIndexNode = IndexNode & { left: SemanticExpressionNode; index: SemanticExpressionNode };
type SemanticCallNode = CallNode & { callee: SemanticExpressionNode; arguments: SemanticExpressionNode[] };

// Unions
type SemanticExpressionNode =
  | SemanticLiteralNode
  | SemanticVariableReferenceNode
  | SemanticArrayLiteralNode
  | SemanticFunctionCallNode
  | SemanticCallNode
  | SemanticIndexNode
  | SemanticPropertyNode
  | SemanticAssignNode
  | SemanticIncDecNode
  | SemanticUnaryNode
  | SemanticCompareNode
  | SemanticBinaryNode;

interface SemanticAssignNode extends AnnotatedNode {
  type: "assign";
  left: SemanticExpressionNode;
  right: SemanticExpressionNode;
  operator: { type: "operator"; value: string };
  datatype?: SemanticDataType;
}

type SemanticStatementNode =
  | SemanticStructNode
  | SemanticVariableNode
  | SemanticVariableListNode
  | SemanticFunctionNode
  | SemanticIfNode
  | SemanticElseIfNode
  | SemanticElseNode
  | SemanticWhileNode
  | SemanticDoWhileNode
  | SemanticForNode
  | SemanticSwitchNode
  | SemanticCaseNode
  | SemanticDefaultNode
  | SemanticReturnNode
  | SemanticBreakNode
  | SemanticContinueNode
  | SemanticBlockNode
  | SemanticExpressionNode;

interface ParserError {
  type: 'compile' | 'parse';
  message: string;
  statement: any;
  offender: any;
}

export class NWScriptParser {
  regex_define = /#define[\s+]?([A-Za-z_][A-Za-z0-9_]+)\s+((?:[1-9](?:[0-9]+)?)|(?:[A-Za-z_][A-Za-z0-9_]+))/g;

  engine_types: any[] = [];
  engine_constants: any[] = [];
  engine_actions: any[] = [];

  errors: ParserError[] = [];
  script: string;

  nwscript_source: string;

  scopes: NWScriptScope[] = [];
  ast: ProgramNode;
  program: SemanticProgramNode;
  scope: NWScriptScope;

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

    const ast_nwscript = hp.parseAST();

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

  parseAST(script: string): ProgramNode | undefined {
    try{
      const hp = new NWScriptHandParser(script, {
        engineTypes: this.engine_types.map((t) => ({ name: t.name, unary: t.datatype.unary })),
      });
      return hp.parseAST();
    }catch(e: any){
      console.log(e);
      // Normalize hand-parser errors into parser error objects for the editor console
      this.errors.push({
        type: (e && e.type) ? e.type : 'parse',
        message: e?.message || 'Parse error',
        statement: e?.statement,
        offender: e?.offender,
      });
    }
    return undefined;
  }

  semanticAnalysisPass(program: ProgramNode): SemanticProgramNode {
    this.program = this.parseProgramNode(program) as SemanticProgramNode;
    return this.program;
  }

  parseScript(script?: string) {
    //reset the parser
    this.errors = [];

    const ast = this.parseAST(script || '');
    if(!ast){
      console.error('Lexer/Parser Failed to parse script');
      this.logParseErrors();
      return;
    }

    this.ast = ast;

    this.semanticAnalysisPass(ast);
    this.logParseErrors();
  }

  logParseErrors(){
    if (!this.errors.length) {
      this.program.parsed = true;
      console.log(`Script parsed without errors`);
    } else {
      this.program.parsed = false;
      console.log(`Script parsed with errors (${this.errors.length})`);
      for (let i = 0; i < this.errors.length; i++) {
        console.log("Error", this.errors[i]);
      }
    }
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

  getVariableByName( name: any = '' ): SemanticVariableNode | SemanticStructPropertyNode | SemanticStructNode | undefined {
    console.log('getVariableByName', name);
    if(name && typeof name == 'object' && typeof name.value == 'string') name = name.value;
    if(!name || (typeof name === 'object')) return undefined;

    // Engine constants are always global.
    const engineConst = this.engine_constants.find( v => v.name == name);
    if(engineConst) return engineConst;

    // Limit lookup to the global scope plus the active function scope (and its child blocks),
    // ignoring variables from callers or previously processed sibling scopes.
    const scopes: NWScriptScope[] = this.scopes ?? [];
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

    const allowedScopes: NWScriptScope[] = [];
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
        if(value.type == 'property') return value.variable_reference?.datatype?.value;
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
        if(value.type == 'property') return value.variable_reference?.datatype?.unary;
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
  
  beginScope(): NWScriptScope {
    this.scope = new NWScriptScope(this.program);
    this.scopes.push(this.scope);
    return this.scope;
  }

  endScope(): void {
    this.scopes.pop()?.popped();
    this.scope = this.scopes[this.scopes.length - 1];
  }

  getCurrentScope(): any {
    return this.scope;
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

  parseProgramNode(program: ProgramNode ): SemanticProgramNode {
    const semanticNode = Object.assign({}, program) as SemanticProgramNode;
    this.program = semanticNode;
    semanticNode.basePointer = 0;
    semanticNode.stackPointer = 0;

    semanticNode.functions = [];
    semanticNode.structs = [];
    this.scopes = [];
    semanticNode.scope = this.beginScope();
    semanticNode.scope.is_global = true;
    const statements = program.statements.slice()

    //detect void main()
    const main = statements.find( (s: any) => s.type == 'function' && s.name == 'main' && s.returntype && this.isDataType(s.returntype, 'void') );
    if(main){
      //remove main function from the program's statement list
      statements.splice( statements.indexOf(main, 1) );
    }

    //detect int startingConditional()
    const startingConditional = program.statements.find( (s: any) => s.type == 'function' && s.name == 'StartingConditional' && s.returntype && this.isDataType(s.returntype, 'int') );
    if(startingConditional){
      //remove startingConditional function from the program's statement list
      statements.splice( statements.indexOf(startingConditional as any, 1) );
    }

    //detect the global function headers
    const global_functions_headers = statements.filter( (s: any) => s.type == 'function' && s.header_only ) as FunctionNode[];
    for(let i = 0; i < global_functions_headers.length; i++){
      //remove function header from the program's statement list
      statements.splice( statements.indexOf(global_functions_headers[i]), 1 );
    }

    //detect the global functions with header and body
    const global_functions = statements.filter( (s: any) => s.type == 'function' && !s.header_only ) as FunctionNode[];
    for(let i = 0; i < global_functions.length; i++){
      //remove function from the program's statement list
      const function_header = global_functions_headers.find( (f:any) => f.name == global_functions[i].name );
      if(function_header){
        global_functions[i].arguments = function_header.arguments;
      }
      this.program.functions.push(global_functions[i]);
      statements.splice( statements.indexOf(global_functions[i]), 1 );
    }

    //validate presence of void main() and int StartingConditional()
    if(main && startingConditional){
      this.throwError("You cannot have both `void main()` and `int StartingConditional()` declared in the same script", program, program);
    }else if(!main && !startingConditional){
      this.throwError("You cannot compile a script without either a void main() or int StartingConditional() declared in the script", program, program);
    }

    //parse global statements
    this.program.statements = statements.map( s => this.parseASTStatement(s) as SemanticStatementNode );

    this.program.basePointer = this.program.stackPointer;

    if(main){
      const mainNode = this.parseASTStatement(main) as SemanticFunctionNode;
      mainNode.called = true;
      semanticNode.main = mainNode;
      //remove startingConditional from the functions list if it got added to it
      semanticNode.functions.splice( semanticNode.functions.indexOf(mainNode), 1 );
    }else if(startingConditional){
      const startingConditionalNode = this.parseASTStatement(startingConditional) as SemanticFunctionNode;
      startingConditionalNode.called = true;
      semanticNode.startingConditional = startingConditionalNode;
      //remove startingConditional from the functions list if it got added to it
      semanticNode.functions.splice( semanticNode.functions.indexOf(startingConditionalNode), 1 );
    }
    return semanticNode;
  }

  parseFunctionNode( statement: FunctionNode ): SemanticFunctionNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'function'){
      this.throwError("Invalid function node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticFunctionNode;
    if(!semanticNode.defined || !this.isNameInUse(semanticNode.name)){
      semanticNode.defined = true;
      this.beginScope();

      let argStackOffset = 0;
      for(let i = 0; i < semanticNode.arguments.length; i++){
        argStackOffset += 4;//this.getDataTypeStackLength(object.arguments[i]);
        semanticNode.arguments[i] = this.parseASTStatement(semanticNode.arguments[i]);
        // this.scope.addVariable(object.arguments[i]);
        this.scope.addArgument(semanticNode.arguments[i]);
        semanticNode.arguments[i].stackPointer = argStackOffset;
      }

      semanticNode.statements = semanticNode.statements.map( s => this.parseASTStatement(s) as SemanticStatementNode );
      this.endScope();
    }else{
      this.throwError("this function name is already in use", statement, statement);
    }
    return semanticNode;
  }

  parseBlockNode( statement: BlockNode ): SemanticBlockNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'block'){
      this.throwError("Invalid block node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticBlockNode;
    this.beginScope();

    semanticNode.statements = statement.statements.map( s => this.parseASTStatement(s) as SemanticStatementNode );

    this.endScope();
    return semanticNode;
  }

  parseFunctionCallNode( statement: FunctionCallNode ): SemanticFunctionCallNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'function_call'){
      this.throwError("Invalid function call node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticFunctionCallNode;
    semanticNode.function_reference = undefined;
    const engineAction = this.getActionByName(semanticNode.name);
    if(engineAction){
      semanticNode.action_id = engineAction.index;
      semanticNode.function_reference = engineAction;
    }else{
      semanticNode.action_id = -1;
      const scriptFunction = this.getFunctionByName(semanticNode.name);
      if(scriptFunction){
        if(!scriptFunction.called){
          scriptFunction.called = true;
          this.parseASTStatement(scriptFunction);
        } 
        semanticNode.function_reference = scriptFunction;
      }else{
        this.throwError("Tried to call an undefined function", semanticNode, semanticNode);
      }
    }

    if(!semanticNode.function_reference){
      this.throwError(`Missing definition for function ${semanticNode.name}`, semanticNode, semanticNode);
      return semanticNode;
    }

    //walk arguments passed to the function
    const args = semanticNode.arguments;
    const ref_args = semanticNode.function_reference.arguments;
    for(let i = 0; i < ref_args.length; i++){
      let arg = typeof args[i] == 'object' ? this.parseASTStatement(args[i]) as SemanticExpressionNode : args[i];
      const arg_ref = ref_args[i] as SemanticArgumentNode;

      //Check to see if an argument was not supplied and the function reference 
      //has a default argument value to use in place of unsupplied arguments
      if(!arg && (typeof arg_ref.value !== 'undefined') ){
        //generate a default argument if one is not supplied
        const var_ref = this.getVariableByName(arg_ref.value);
        if(var_ref){
          arg = var_ref.value;
          semanticNode.arguments.splice(i, 0, arg);
        }else{
          arg = { type: 'literal', datatype: arg_ref.datatype, value: arg_ref.value };
          semanticNode.arguments.splice(i, 0, arg);
        }
      }

      if(!arg){
        this.throwError(`Function call argument missing a value for ${arg_ref.datatype.value} ${arg_ref.name} and no default value is available`, semanticNode, arg);
        continue;
      }
      semanticNode.arguments[i] = this.parseASTStatement(arg) as SemanticExpressionNode;

      if(arg_ref && ( this.getValueDataType(arg_ref) != this.getValueDataType(arg) ) ){
        const argDataType = this.getValueDataType(arg);
        const argRefDataType = this.getValueDataType(arg_ref);
        
        if(arg_ref.datatype.value == 'action'){
          if(!arg.function_reference){
            this.throwError(`Can't pass a function call to ${arg_ref.datatype.value} ${arg_ref.name}`, semanticNode, arg);
          }
        }else{
          const argTypeStr = argDataType !== undefined ? argDataType : 'unknown';
          this.throwError(`Can't pass a value with a datatype type of [${argTypeStr}] to ${arg_ref.datatype.value} ${arg_ref.name}`, semanticNode, arg);
        }
      }else if(!arg_ref){
        const argDataType = this.getValueDataType(arg);
        const argTypeStr = argDataType !== undefined ? argDataType : 'unknown';
        this.throwError(`Can't pass a value with a datatype type of [${argTypeStr}] to [no argument]`, semanticNode, arg);
      }
    }
    return semanticNode;
  }

  parseStructNode( statement: StructNode ): SemanticStructNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'struct'){
      this.throwError("Invalid struct node", statement, statement);
    }
    //If this is a variable declaration and the name is available
    if(this.isNameInUse(statement.name)){
      this.throwError("Struct name is already in use", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticStructNode;
    this.program.structs.push(semanticNode);
    this.scope.addVariable(semanticNode);
    semanticNode.properties = statement.properties.map( p => this.parsePropertyNode(p) as SemanticStructPropertyNode );
    return semanticNode;
  }

  parsePropertyNode( statement: StructPropertyNode ): SemanticPropertyNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'property'){
      this.throwError("Invalid property node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticPropertyNode;
    if(semanticNode.left && semanticNode.left.type == 'variable_reference'){
      semanticNode.variable_reference = this.getVariableByName(`${semanticNode.left.name}.${semanticNode.name}`) as SemanticStructPropertyNode;
      // semanticNode.datatype = semanticNode.left?.variable_reference?.datatype;
      // semanticNode.is_global = semanticNode.left?.variable_reference?.is_global;
      console.log('property', semanticNode, `${semanticNode.left.name}.${semanticNode.name}`, semanticNode.variable_reference);
    }

    if(semanticNode.right){
      semanticNode.right = this.parseASTStatement(semanticNode.right);
    }
    return semanticNode;
  }

  parseVariableListNode( statement: VariableListNode ): SemanticVariableListNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'variableList'){
      this.throwError("Invalid variable list node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticVariableListNode;
    semanticNode.variables = [];
    for(let i = 0; i < statement.names.length; i++){
      const _var = { 
        type: 'variable', 
        is_const: statement.is_const, 
        declare: statement.declare, 
        datatype: statement.datatype, 
        name: statement.names[i].name, 
        value: statement.value, 
        source: statement.names[i].source 
      } as VariableNode;
      semanticNode.variables[i] = this.parseVariableNode(_var) as SemanticVariableNode;
    }
    return semanticNode;
  }

  parseVariableReferenceNode( statement: VariableReferenceNode ): SemanticVariableReferenceNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'variable_reference'){
      this.throwError("Invalid variable reference node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticVariableReferenceNode;
    // Resolve reference against engine constants, locals, or globals
    const varRef = this.getVariableByName(statement.name) as SemanticVariableNode;
    if(!varRef){
      this.throwError(`Tried to access a variable name [${statement.name}] that is not in this scope.`, semanticNode, semanticNode);
    }
    semanticNode.variable_reference = varRef;
    semanticNode.datatype = varRef?.datatype;
    semanticNode.is_global = !!varRef?.is_global;
    return semanticNode;
  }

  parseVariableNode( statement: VariableNode ): SemanticVariableNode {
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

    const semanticNode = Object.assign({}, statement) as SemanticVariableNode;

    //Struct Variable Validation
    if(semanticNode.struct){
      const structVar = this.getVariableByName(semanticNode.struct);
      if(!structVar){
        this.throwError(`Tried to access a variable [${semanticNode.struct}] with a type of [struct] that is not in this scope.`, semanticNode, semanticNode);
        return semanticNode;
      }
      semanticNode.struct_reference = structVar as SemanticStructNode || semanticNode.struct_reference;
      if(statement.declare){
        if(structVar.type == 'struct'){
          semanticNode.struct_reference = structVar;
        }else{
          this.throwError(`Tried to access a struct [${semanticNode.struct}], but the returned type was [${structVar.type}].`, semanticNode, structVar);
        }
      }else{
        if(structVar.datatype.value == 'struct'){
          if(structVar.struct_reference){
            if(structVar.struct_reference.type == 'struct'){
              //object.struct_reference = structVar.struct_reference;
              semanticNode.struct_reference = structVar;
            }else{
              this.throwError(`Tried to access a variable [${semanticNode.struct}] expecting a type of [struct], but the returned type was [${structVar.datatype.value}].`, semanticNode, semanticNode);
            }
          }else{
            this.throwError(`Tried to access a variable [${semanticNode.struct}], but struct_reference is undefined.`, semanticNode, semanticNode);
          }
        }else{
          this.throwError(`Tried to access a variable [${semanticNode.struct}] with a type of [${structVar.datatype.value}], but expected type of [struct].`, semanticNode, structVar);
        }
      }
    }else{
      //If this is a variable reference and the name is in scope
      if(!semanticNode.declare && !this.isNameInUse(semanticNode.name)){
        this.throwError(`Tried to access a variable name [${semanticNode.name}] that is not in this scope.`, semanticNode, semanticNode);
      }
    }

    //Push this declared variable to the current scope
    if(semanticNode.declare){
      this.scope.addVariable(semanticNode);
      if(semanticNode.datatype.struct){
        const structReference = this.getVariableByName(semanticNode.datatype.struct);
        if(structReference){
          semanticNode.struct_reference = structReference;
        }else{
          this.throwError(`Tried to access a struct [${semanticNode.datatype.struct}] that is not in this scope.`, semanticNode, semanticNode);
        }
      }
    }else if(!semanticNode.struct){
      const varRef = this.getVariableByName(semanticNode.name) as SemanticVariableNode;
      semanticNode.variable_reference = varRef;
      semanticNode.datatype = varRef?.datatype;
      semanticNode.is_global = !!varRef?.is_global;
    }

    if(!!semanticNode.value && typeof semanticNode.value == 'object'){
      semanticNode.value = this.parseASTStatement(semanticNode.value);
    }

    //Struct Property Access Validation
    if(semanticNode.struct && semanticNode.name){
      if(semanticNode.struct_reference){
        if(semanticNode.struct_reference.type == 'struct'){
          for(let i = 0; i < semanticNode.struct_reference.properties.length; i++){
            const property = semanticNode.struct_reference.properties[i];
            if(property.name == semanticNode.name){
              semanticNode.variable_reference = property;
              semanticNode.datatype = property.datatype;
              semanticNode.is_global = semanticNode?.variable_reference?.is_global as boolean;
            }
          }
        }else if(semanticNode.struct_reference.type == 'variable'){
          const props = (semanticNode.struct_reference.struct_reference as SemanticStructNode)?.properties || [];
          for(let i = 0; i < props.length; i++){
            const property = props[i];
            if(property.name == semanticNode.name){
              semanticNode.variable_reference = property;
              semanticNode.datatype = property.datatype;
              semanticNode.is_global = semanticNode?.variable_reference?.is_global;
            }
          }
        }
      }
    }

    if(semanticNode.value && semanticNode.datatype && semanticNode?.datatype?.value != this.getValueDataType(semanticNode.value) ){
      this.throwError(`Can't assign a value with a datatype type of [${this.getValueDataType(semanticNode.value)}] to ${semanticNode.datatype.value} ${semanticNode.name}`, semanticNode, semanticNode.value);
    }
    return semanticNode;
  }

  parseReturnNode( statement: ReturnNode ): SemanticReturnNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'return'){
      this.throwError("Invalid return node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticReturnNode;
    if(!!semanticNode.value && typeof semanticNode.value == 'object'){
      semanticNode.value = this.parseASTStatement(semanticNode.value);
    }

    const scopeReturnType = this.scopes.slice(0).reverse().find( sc => typeof sc.returntype !== 'undefined' )?.returntype;
    if(scopeReturnType){
      const valueDataType = this.getValueDataType(semanticNode.value);
      if(scopeReturnType.value == 'void'){
        if(semanticNode.value != null) this.throwError(`Can't return a value with a datatype type of [${valueDataType}] in a scope that expects a datatype of ${scopeReturnType.value}`, semanticNode, semanticNode.value);
      }else if( scopeReturnType.value != valueDataType){
        this.throwError(`Can't return a value with a datatype type of [${valueDataType}] in a scope that expects a datatype of ${scopeReturnType.value}`, semanticNode, semanticNode.value);
      }
    }
    return semanticNode;
  }

  parseIfNode( statement: IfNode ): SemanticIfNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'if'){
      this.throwError("Invalid ifNode node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticIfNode;
    if(typeof semanticNode.condition == 'object') semanticNode.condition = this.parseASTStatement(semanticNode.condition);

    this.beginScope();
    semanticNode.statements = statement.statements?.map(this.parseASTStatement) || [];
    this.endScope();

    semanticNode.elseIfs = statement.elseIfs?.map(this.parseASTStatement) || [];
    semanticNode.else = statement.else ? this.parseASTStatement(statement.else) : null;

    return semanticNode;
  }
  
  parseElseIfNode( statement: ElseIfNode ): SemanticElseIfNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'elseif'){
      this.throwError("Invalid elseif node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticElseIfNode;
    this.beginScope();
    if(typeof semanticNode.condition == 'object') semanticNode.condition = this.parseASTStatement(semanticNode.condition);
    
    semanticNode.statements = statement.statements?.map(this.parseASTStatement) || [];
    this.endScope();

    return semanticNode;
  }

  parseElseNode( statement: ElseNode ): SemanticElseNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'else'){
      this.throwError("Invalid else node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticElseNode;

    this.beginScope();
    semanticNode.statements = statement.statements?.map(this.parseASTStatement) || [];
    this.endScope();

    return semanticNode;
  }

  parseWhileNode( statement: WhileNode ): SemanticWhileNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'while'){
      this.throwError("Invalid while node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticWhileNode;
    this.beginScope();
    if(typeof semanticNode.condition == 'object') semanticNode.condition = this.parseASTStatement(semanticNode.condition);
    semanticNode.statements = statement.statements?.map(this.parseASTStatement) || [];
    this.endScope();

    return semanticNode;
  }

  parseDoWhileNode( statement: DoWhileNode ): SemanticDoWhileNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'do'){
      this.throwError("Invalid do node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticDoWhileNode;
    this.beginScope();
    if(typeof semanticNode.condition == 'object') semanticNode.condition = this.parseASTStatement(semanticNode.condition);
    semanticNode.statements = statement.statements?.map(this.parseASTStatement) || [];
    this.endScope();

    return semanticNode;
  }

  parseForNode( statement: ForNode ): SemanticForNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'for'){
      this.throwError("Invalid for node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticForNode;
    //walk initializer
    if(typeof semanticNode.initializer == 'object') semanticNode.initializer = this.parseASTStatement(semanticNode.initializer);

    //walk condition
    if(typeof semanticNode.condition == 'object') semanticNode.condition = this.parseASTStatement(semanticNode.condition);

    //walk incrementor
    if(typeof semanticNode.incrementor == 'object') semanticNode.incrementor = this.parseASTStatement(semanticNode.incrementor);

    this.beginScope();

    semanticNode.statements = statement.statements.map(this.parseASTStatement);

    this.endScope();
    return semanticNode;
  }

  parseSwitchNode( statement: SwitchNode ): SemanticSwitchNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'switch'){
      this.throwError("Invalid switch node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticSwitchNode;
    //walk switch conditions
    if(typeof semanticNode.condition == 'object') semanticNode.condition = this.parseASTStatement(semanticNode.condition);

    //walk switch case statements
    semanticNode.cases = statement.cases.map(this.parseASTStatement);
    for(let i = 0; i < semanticNode.cases.length; i++){
      for(let j = 0; j < semanticNode.cases[i].statements.length; j++){
        if(semanticNode.cases[i].statements[j].type == 'break') semanticNode.cases[i].fallthrough = false;
      }
    }

    //walk switch default statement
    if(typeof semanticNode.default == 'object') semanticNode.default = this.parseASTStatement(semanticNode.default);
    return semanticNode;
  }

  parseCaseNode( statement: CaseNode ): SemanticCaseNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'case'){
      this.throwError("Invalid case node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticCaseNode;
    //walk case conditions
    if(typeof semanticNode.condition == 'object') semanticNode.condition = this.parseASTStatement(semanticNode.condition);

    //walk case statements
    semanticNode.statements = statement.statements.map(this.parseASTStatement);
    return semanticNode;
  }

  parseDefaultNode( statement: DefaultNode ): SemanticDefaultNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'default'){
      this.throwError("Invalid default node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticDefaultNode;
    //walk default statements
    semanticNode.statements = statement.statements.map(this.parseASTStatement);
    return semanticNode;
  }

  parseCompareNode( statement: CompareNode ): SemanticCompareNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'compare'){
      this.throwError("Invalid compare node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticCompareNode;
    if(typeof semanticNode.left == 'object') this.parseASTStatement(semanticNode.left);
    if(typeof semanticNode.right == 'object') this.parseASTStatement(semanticNode.right);

    const left_type = this.getValueDataType(semanticNode.left);
    const left_type_unary = this.getValueDataTypeUnary(semanticNode.left);
    const right_type = this.getValueDataType(semanticNode.right);
    const right_type_unary = this.getValueDataTypeUnary(semanticNode.right);

    // propagate datatype onto this compare node
    if(!semanticNode.datatype){
      if(left_type){
        semanticNode.datatype = { type:'datatype', value:left_type, unary:left_type_unary };
      }else if(right_type){
        semanticNode.datatype = { type:'datatype', value:right_type, unary:right_type_unary };
      }
    }

    if(semanticNode.operator?.value == '&&'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't AND types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '=='){
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
          this.throwError(`Can't EQUAL types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
        }
      }
    }else if(semanticNode.operator?.value == '!='){
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
          this.throwError(`Can't NEQUAL types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
        }
      }
    }else if(semanticNode.operator?.value == '>='){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
        )
      {
        this.throwError(`Can't GEQ types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '>'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
        )
      {
        this.throwError(`Can't GT types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '<='){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
        )
      {
        this.throwError(`Can't LEQ types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '<'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
        )
      {
        this.throwError(`Can't LT types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '<<'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't Left Shift types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '>>'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't Right Shift types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '>>>'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't Unsigned Right Shift types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '%'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't Modulus types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '^'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't Exclusive OR types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '||'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't OR types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.operator?.value == '|'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't Inclusive OR types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }

    return semanticNode;
  }

  parseAssignNode( statement: AssignNode ): SemanticAssignNode {
    if(!statement || (typeof statement !== 'object') || statement.type !== 'assign'){
      this.throwError("Invalid assign node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticAssignNode;
    if(typeof semanticNode.left == 'object') semanticNode.left = this.parseASTStatement(semanticNode.left);
    if(typeof semanticNode.right == 'object') semanticNode.right = this.parseASTStatement(semanticNode.right);

    const left_type = this.getValueDataType(semanticNode.left);
    const left_type_unary = this.getValueDataTypeUnary(semanticNode.left);
    const right_type = this.getValueDataType(semanticNode.right);
    const right_type_unary = this.getValueDataTypeUnary(semanticNode.right);

    // propagate datatype onto this compare node
    if(!semanticNode.datatype){
      if(left_type){
        semanticNode.datatype = { type:'datatype', value:left_type, unary:left_type_unary };
      }else if(right_type){
        semanticNode.datatype = { type:'datatype', value:right_type, unary:right_type_unary };
      }
    }

    if(semanticNode.type == 'assign'){
      if(left_type != right_type){
        this.throwError(`Can't assign a value of type [${right_type}] to a variable of type [${left_type}]`, semanticNode, semanticNode.right);
      }
    }
    return semanticNode;
  }

  parseArithmeticNode( statement: BinaryOpNode ): any {
    if(!statement || (typeof statement !== 'object') || (statement.type !== 'add' && statement.type !== 'sub' && statement.type !== 'mul' && statement.type !== 'div' && statement.type !== 'mod' && statement.type !== 'incor' && statement.type !== 'booland' && statement.type !== 'xor')){
      this.throwError("Invalid arithmetic node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticBinaryNode;
    if(typeof semanticNode.left == 'object') semanticNode.left = this.parseASTStatement(semanticNode.left);
    if(typeof semanticNode.right == 'object') semanticNode.right = this.parseASTStatement(semanticNode.right);

    const left_type = this.getValueDataType(semanticNode.left);
    const left_type_unary = this.getValueDataTypeUnary(semanticNode.left);
    const right_type = this.getValueDataType(semanticNode.right);
    const right_type_unary = this.getValueDataTypeUnary(semanticNode.right);

    // propagate datatype onto this arithmetic/compare node
    if(!semanticNode.datatype){
      if(left_type){
        semanticNode.datatype = { type:'datatype', value:left_type, unary:left_type_unary };
      }else if(right_type){
        semanticNode.datatype = { type:'datatype', value:right_type, unary:right_type_unary };
      }
    }

    if(semanticNode.type == 'add'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'string' && right_type == 'string')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't add types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.type == 'sub'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't subtract types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.type == 'mul'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't multiply types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.type == 'div'){
      if(    !(left_type == 'int'    && right_type == 'int')
          && !(left_type == 'int'    && right_type == 'float')
          && !(left_type == 'float'  && right_type == 'int')
          && !(left_type == 'float'  && right_type == 'float')
          && !(left_type == 'vector' && right_type == 'vector') 
        )
      {
        this.throwError(`Can't subtract types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }else if(semanticNode.type == 'mod'){
      if(    !(left_type == 'int'    && right_type == 'int')
        )
      {
        this.throwError(`Can't modulus types of [${left_type}] and [${right_type}] together`, semanticNode, semanticNode.right);
      }
    }
    return semanticNode;
  }

  parseUnaryNode( statement: UnaryNode ): SemanticUnaryNode {
    if(!statement || (typeof statement !== 'object') || (statement.type !== 'not' && statement.type !== 'neg' && statement.type !== 'comp')){
      this.throwError("Invalid unary node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticUnaryNode;
    if(!!semanticNode.value && typeof semanticNode.value == 'object'){
      semanticNode.value = this.parseASTStatement(semanticNode.value);
    }

    let value_type = this.getValueDataType(semanticNode.value);
    let value_type_unary = this.getValueDataTypeUnary(semanticNode.value);
    semanticNode.datatype = { type: 'datatype', unary: value_type_unary, value: value_type };
    if(semanticNode.type == 'neg'){
      if(    !(value_type == 'int')
          && !(value_type == 'float')
        )
      {
        this.throwError(`Can't negate a value of type [${value_type}]`, statement, statement.value);
      }
    }else if(semanticNode.type == 'comp'){
      if( !(value_type == 'int') )
      {
        this.throwError(`Can't Ones Compliment a value of type [${value_type}]`, statement, statement.value);
      }
    }else if(semanticNode.type == 'not'){
      if( !(value_type == 'int') )
      {
        this.throwError(`Can't Not a value of type [${value_type}]`, statement, statement.value);
      }
    }
    return semanticNode;
  }

  parseIncDecNode( statement: IncDecNode ): SemanticIncDecNode {
    if(!statement || (typeof statement !== 'object') || (statement.type !== 'inc' && statement.type !== 'dec')){
      this.throwError("Invalid inc/dec node", statement, statement);
    }
    const semanticNode = Object.assign({}, statement) as SemanticIncDecNode;
    const value_type = this.getValueDataType(semanticNode.value);
    semanticNode.variable_reference = this.getVariableByName(statement?.value?.name);
    if(semanticNode.variable_reference){
      semanticNode.datatype = semanticNode.variable_reference.datatype;
      semanticNode.is_global = semanticNode.variable_reference.is_global;
      if( !(semanticNode?.datatype?.value == 'int') )
      {
        this.throwError(`Can't Increment a value of type [${value_type}]`, statement, statement.value);
      }
    }
    return semanticNode;
  }

  parseASTStatement( statement: any = undefined ): any {
    if(!statement || (typeof statement !== 'object')){
      this.throwError("Invalid statement", statement, statement);
      return;
    }

    switch(statement.type){
      case 'program':
        return this.parseProgramNode(statement);
      case 'function':
        return this.parseFunctionNode(statement);
      case 'block':
        return this.parseBlockNode(statement);
      case 'function_call':
        return this.parseFunctionCallNode(statement);
      case 'struct':
        return this.parseStructNode(statement);
      case 'property':
        return this.parsePropertyNode(statement);
      case 'variableList':
        return this.parseVariableListNode(statement);
      case 'variable_reference':
        return this.parseVariableReferenceNode(statement);
      case 'variable':
        return this.parseVariableNode(statement);
      case 'return':
        return this.parseReturnNode(statement);
      case 'if':
        return this.parseIfNode(statement);
      case 'elseif':
        return this.parseElseIfNode(statement);
      case 'else':
        return this.parseElseNode(statement);
      case 'do':
        return this.parseDoWhileNode(statement);
      case 'while':
        return this.parseWhileNode(statement);
      case 'for':
        return this.parseForNode(statement);
      case 'switch':
        return this.parseSwitchNode(statement);
      case 'case':
        return this.parseCaseNode(statement);
      case 'default':
        return this.parseDefaultNode(statement);
      case 'compare':
        return this.parseCompareNode(statement);
      case 'assign':
        return this.parseAssignNode(statement);
      case 'add':
      case 'sub':
      case 'mul':
      case 'div':
      case 'mod':
      case 'incor':
      case 'booland':
      case 'xor':
        return this.parseArithmeticNode(statement);
      case 'not':
      case 'neg':
      case 'comp':
        return this.parseUnaryNode(statement);
      case 'inc':
      case 'dec':
        return this.parseIncDecNode(statement);
      case 'literal':
        return statement as SemanticLiteralNode;
      default:
        console.warn('unhandled statement', statement.type);
        console.log(statement);
      break;
    }
    return statement;
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
  arguments: SemanticArgumentNode[] = [];
  variables: SemanticVariableNode[] = [];
  constants: SemanticVariableNode[] = [];
  structs: SemanticStructNode[] = [];
  program: SemanticProgramNode;
  returntype: any = undefined;
  is_global = false;
  is_anonymous = false;

  constructor(program: SemanticProgramNode, returntype: any = undefined){
    this.program = program;
    this.returntype = returntype;
  }

  addVariable(variable: SemanticArgumentNode|SemanticVariableNode|SemanticStructNode){
    if(this.hasVariable(variable.name)){ return; }
    if(variable.type == 'struct'){
      this.structs.push(variable);
    }else if(variable.type == 'variable'){
      if(variable.is_const){
        this.constants.push(variable);
      }else{
        this.variables.push(variable);
        variable.stackPointer = this.program.stackPointer;
        this.program.stackPointer += 4;
      }
    }else if(variable.type == 'argument'){
      this.arguments.push(variable);
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

  hasStruct(name = ''): boolean {
    return this.structs.find( s => s.name == name ) ? true : false;
  }

  getStruct(name = ''): SemanticStructNode | undefined {
    return this.structs.find( s => s.name == name );
  }

  hasVariable(name = ''){
    return this.getVariable(name) ? true : false;
  }

  getVariable(name = ''){
    if(!name || typeof name != 'string'){
      console.error('getVariable: name is not a string');
    }
    const isStructProperty = name?.includes('.');
    if(isStructProperty){
      const parts = name.split('.');
      const structName = parts[0];
      const propertyName = parts[1];
      const struct = this.variables.find( v => v.name == structName ) || this.getStruct(structName);
      if(struct){
        if(struct.type == 'variable'){
          return (struct?.struct_reference as SemanticStructNode)?.properties?.find( p => p.name == propertyName ) as SemanticStructPropertyNode;
        }else{
          return struct?.properties?.find( p => p.name == propertyName ) as SemanticStructPropertyNode;
        }
      }
    }
    return this.variables.find( v => v.name == name ) || this.structs.find( v => v.name == name ) || this.arguments.find( v => v.name == name ) || this.constants.find( v => v.name == name );
  }

  popped(){
    for(let i = 0; i < this.variables.length; i++){
      this.program.stackPointer -= 4;
    }
  }

}
