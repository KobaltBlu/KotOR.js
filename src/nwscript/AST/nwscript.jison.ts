export const grammar: any = {
  "comment": "KotOR Compatible NWScript Grammar. Parses NWScript source files into an AST like object.",
  "author": "KobaltBlu@Github.com",

  "lex": {
    "macros": {
      "digit": "[0-9]",
      "esc": "\\\\",
      "int": "(?:[0-9]|[1-9][0-9]+)",
      "exp": "(?:[eE][-+]?[0-9]+)",
      "frac": "(?:\\.[0-9]+)"
    },
    "rules": [
      ["\\s+", "/* skip whitespace */"],
      ["\\/\\/(?:.*)", "/* skip whitespace */"],
      ["[/][*][^*]*[*]+([^/*][^*]*[*]+)*[/]", "/* skip whitespace */"],
      ["0x[0-9A-Fa-f]+?\\b", "return 'HEXADECIMAL';"],
      ["{int}{frac}(?:f)?\\b", "return 'FLOAT';"],
      ["{int}\\b", "return 'INTEGER';"],
      ["\"[^\"]*\"", "yytext = yytext.substr(1,yyleng-2); return 'CEXOSTRING';"],
      ["\\>\\>\\>", "return '>>>'"],
      ["\\<\\<\\=", "return '<<='"],
      ["\\>\\>\\=", "return '>>='"],

      ["\\=\\=", "return '=='"], //Equals
      ["\\!\\=", "return '!='"], //Not equal to
      ["\\<\\=", "return '<='"], //Less than or equal to
      ["\\>\\=", "return '>='"], //Greater than or equal to
      ["\\+\\=", "return '+='"], //Add Assignment
      ["\\-\\=", "return '-='"], //Minus Assignment
      ["\\/\\=", "return '/='"], //Subtract Assignment
      ["\\*\\=", "return '*='"], //Multiply Assignment
      ["\\%\\=", "return '%='"], //Modulus Assignment
      ["\\-\\-", "return '--'"], //Subtract By One
      ["\\+\\+", "return '++'"], //Increment By One

      ["\\|\\|", "return '||'"], //OR
      ["\\&\\&", "return '&&'"], //AND
      ["\\<\\<", "return '<<'"], //Bitwise Shift Left Assignment
      ["\\>\\>", "return '>>'"], //Bitwise Shift Right Assignment
      ["\\|\\=", "return '|='"], //Bitwise OR Assignment
      ["\\&\\=", "return '&='"], //Bitwise AND Assignment
      ["\\^\\=", "return '^='"], //Bitwise XOR Assignment

      ["\\=", "return '='"], //Assignment
      ["\\{", "return '{'"],
      ["\\}", "return '}'"],
      ["\\(", "return '('"],
      ["\\)", "return ')'"],
      ["\\[", "return '['"],
      ["\\]", "return ']'"],
      ["\\,", "return ','"],
      ["\\:", "return ':'"],
      ["\\;", "return ';'"],
      ["\\^", "return '^'"], //Bitwise XOR
      ["\\?", "return '?'"],
      ["\\.", "return '.'"],

      ["\\/", "return '/'"], //Divide
      ["\\+", "return '+'"], //Add
      ["\\-", "return '-'"], //Subtract
      ["\\*", "return '*'"], //Multiply
      ["\\%", "return '%'"], //Modulus
      ["\\!", "return '!'"], //Not
      ["\\>", "return '>'"], //Greater than
      ["\\<", "return '<'"], //Less than
      ["\\|", "return '|'"], //Bitwise OR
      ["\\&", "return '&'"], //Bitwise AND
      ["\\~", "return '~'"], //Ones Compliment
      ["switch\\b", "return 'SWITCH'"],
      ["case\\b", "return 'CASE'"],
      ["default\\b", "return 'DEFAULT'"],
      ["else if\\b", "return 'ELSEIF'"],
      ["if\\b", "return 'IF'"],
      ["else\\b", "return 'ELSE'"],
      ["while\\b", "return 'WHILE'"],
      ["do\\b", "return 'DO'"],
      ["for\\b", "return 'FOR'"],
      ["continue\\b", "return 'CONTINUE'"],
      ["const\\b", "return 'CONST'"],
      ["void\\b|VOID\\b", "return 'VOID'"],
      ["int\\b|INT\\b", "return 'INT'"],
      ["string\\b|STRING\\b", "return 'STRING'"],
      ["float\\b|FLOAT\\b", "return 'FLOAT'"],
      ["vector\\b|VECTOR\\b", "return 'VECTOR'"],
      ["struct\\b|STRUCT\\b", "return 'STRUCT'"],
      ["action\\b|ACTION\\b", "return 'ACTION'"],
      ["object\\b|OBJECT\\b|object_id\\b|OBJECT_ID\\b", "return 'OBJECT'"],

      ["OBJECT_SELF\\b", "return 'OBJECT_SELF'"],
      ["OBJECT_INVALID\\b", "return 'OBJECT_INVALID'"],

      ["#include\\b", "return 'INCLUDE'"],
      ["#define\\b", "return 'DEFINE'"],
      ["return\\b", "return 'RETURN'"],
      ["break\\b", "return 'BREAK'"],
      ["(?:[A-Za-z_]|[A-Za-z_][A-Za-z0-9_]+)\\b", "return 'NAME'"],
    ]
  },

  "engine_tokens": "EFFECT EVENT LOCATION TALENT",

  "tokens": "COMMENT COMMENT_ML RETURN BREAK SWITCH CASE DEFAULT CEXOSTRING HEXADECIMAL INTEGER FLOAT CONST VOID INT FLOAT STRING OBJECT VECTOR STRUCT ACTION OBJECT_SELF OBJECT_INVALID NAME INCLUDE DEFINE IF ELSEIF ELSE WHILE DO FOR CONTINUE ( ) { } [ ] . ? , : ; < > ^ = / + - * % ! | & ~ |= == != += -= *= %= /= ++ -- || && &= ^= << >> >>= >>>= <<= TRUE FALSE NULL",
  "start": "NWProgram",

  "bnf": {
    "NWProgram" : [
      [ "NWBlock", `return $$ = { type: "program", statements: $1 };` ]
    ],

    "NWBlock": [
      [ "NWStatement", `$$ = [$1]` ],
      [ "NWBlock NWStatement", `$$ = $1; $1.push($2);` ],
      [ "NWBlock NWStatementAnonymousBlock", `$$ = $1; $1.push($2);`],
    ],

    "NWStatementList": [
      [ "NWStatement", `$$ = [$1]` ],
      [ "NWStatementList NWStatement", `$$ = $1; $1.push($2);` ]
    ],

    "NWStatement": [
      ["NWStatementDefine",        `$$ = $1;`],
      ["NWStatementInclude",        `$$ = $1;`],
      ["NWStatementStructDeclare",  `$$ = $1;`],
      ["NWStatementVariable",       `$$ = $1;`],
      ["NWStatementFunction",       `$$ = $1;`],
      ["NWStatementFunctionCall",   `$$ = $1;`],
      ["NWStatementFor",            `$$ = $1;`],
      ["NWStatementDo",             `$$ = $1;`],
      ["NWStatementWhile",          `$$ = $1;`],
      ["NWStatementIf",             `$$ = $1;`],
      ["NWStatementSwitch",         `$$ = $1;`],
      ["NWStatementContinue",       `$$ = $1;`],
      ["NWStatementBreak",          `$$ = $1;`],
      ["NWStatementReturn",         `$$ = $1;`],
    ],

    //---------------------//
    // NWDefine Statement
    //---------------------//

    "NWStatementDefine": [
      ["DEFINE NWName NWInteger", `$$ = {type: "define", name: $2, value: $3};`],
      ["DEFINE NWName NWDataType", `$$ = {type: "define", name: $2, value: $3};`],
      ["DEFINE NWName NWName", `$$ = {type: "define", name: $2, value: $3};`],
    ],

    //----------------------------//
    // NWAnonymousBlock Statement
    //----------------------------//

    "NWStatementAnonymousBlock": [
      ["{ }", `$$ = { type: "block", statements: [] }`],
      ["{ NWBlock }", `$$ = { type: "block", statements: $2 }`],
    ],

    //----------------------------//
    // NWBlock Statement
    //----------------------------//

    "NWStatementBlock": [
      ["{ }", `$$ = { type: "block", statements: [] }`],
      ["{ NWBlock }", `$$ = { type: "block", statements: $2 }`],
    ],

    //---------------------//
    // NWReturn Statement
    //---------------------//

    "NWStatementReturn": [
      ["RETURN ;", `$$ = { type: "return", value: null }`],
      ["RETURN NWExp ;", `$$ = { type: "return", value: $2 }`],
      ["RETURN NWStatementVariableReference", `$$ = { type: "return", value: $2 }`],
    ],

    //---------------------//
    // NWBreak Statement
    //---------------------//

    "NWStatementBreak": [
      ["BREAK ;", `$$ = { type: "break" }`],
    ],

    //---------------------//
    // NWContinue Statement
    //---------------------//

    "NWStatementContinue": [
      ["CONTINUE ;", `$$ = { type: "continue" }`],
    ],

    //---------------------//
    // NWStruct Statements
    //---------------------//

    "NWStatementStructDeclare": [
      ["STRUCT NAME { } ;", `$$ = { type: "struct", name: $2, properties: [] }`],
      ["STRUCT NAME { NWStructPropertiesList } ;", `$$ = { type: "struct", name: $2, properties: $4 }`],
    ],

    "NWStructPropertiesList": [
      [ "NWStructProperty", `$$ = [$1]` ],
      [ "NWStructPropertiesList NWStructProperty", `$$ = $1; $1.push($2);` ]
    ],

    "NWStructProperty": [
      ["NWDataType NAME ;", `$$ = { type: 'property', is_const: false, datatype: $1, name: $2, value: null };`],
    ],

    //---------------------//
    // NWComment Statement
    //---------------------//

    // "NWStatementComment": [
    //   ["COMMENT", `$$ = {type: "comment", value: $1}`],
    //   ["COMMENT_ML", `$$ = {type: "comment", value: $1}`],
    // ],

    //---------------------//
    // NWInclude Statement
    //---------------------//

    "NWStatementInclude": [
      ["INCLUDE NWString", `$$ = {type: "include", value: $2};`],
    ],

    //---------------------//
    // NWVariable Statement
    //---------------------//

    "NWStatementVariable": [
      ["STRUCT NAME NAME ;", `$$ = { type: 'variable', struct: $2, is_const: false, declare: true, datatype: { type: 'datatype', unary: -1, value: $1 }, name: $3, value: null, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } };`],
      ["CONST NWDataType NAME = NWExp ;", `$$ = { type: 'variable', is_const: true, declare: true, datatype: $2, name: $3, value: $5, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @5.last_line, last_column: @5.last_column } };`],
      ["NWDataType NWNameList = NWExp ;", `$$ = { type: 'variableList', is_const: false, declare: true, datatype: $1, names: $2, value: $4, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @4.last_line, last_column: @4.last_column } };`],
      ["NWDataType NWNameList ;", `$$ = { type: 'variableList', is_const: false, declare: true, datatype: $1, names: $2, value: null, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @2.last_line, last_column: @2.last_column } };`],
      ["NWStatementVariableReference", "$$ = $1"],
      //["NWDataType NWNameList ;", `$$ = { type: 'variable', is_const: false, declare: true, datatype: $1, name: $2, value: null, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @2.last_line, last_column: @2.last_column } };`],
      // ["NAME += NWExp ;", `$$ = { type: 'addeq', is_const: false, datatype: null, name: $1, value: $3 };`],
      // ["NAME -= NWExp ;", `$$ = { type: 'subeq', is_const: false, datatype: null, name: $1, value: $3 };`],
    ],

    "NWStatementVariableReference": [
      ["NAME . NAME ;", `$$ = { type: 'variable', struct: $1, is_const: false, declare: false, datatype: null, name: $3, value: null, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } };`],
      ["NAME . NAME = NWExp ;", `$$ = { type: 'variable', struct: $1, is_const: false, declare: false, datatype: null, name: $3, value: $5, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @5.last_line, last_column: @5.last_column } };`],
      ["NAME ;", `$$ = { type: 'variable', is_const: false, datatype: null, name: $1, value: null, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };`],
      ["NAME = NWExp ;", `$$ = { type: 'variable', is_const: false, datatype: null, name: $1, value: $3, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } };`],
      ["NAME == NWExp ;", `$$ = { type: 'variable', is_const: false, datatype: null, name: $1, value: $3, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } };`],
      ["NAME ++ ;", `$$ = { type: 'inc', is_const: false, datatype: null, name: $1, value: null, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @2.last_line, last_column: @2.last_column } };`],
      ["NAME -- ;", `$$ = { type: 'dec', is_const: false, datatype: null, name: $1, value: null, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @2.last_line, last_column: @2.last_column } };`],
    ],

    //---------------------//
    // NWFunction Statement
    //---------------------//

    "NWStatementFunction": [
      ["NWDataType NAME ( ) ;", `$$ = { type: 'function', declare: true, header_only: true, returntype: $1, name: $2, arguments: [], statements: [], source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @4.last_line, last_column: @4.last_column } };`],
      ["NWDataType NAME ( NWFunctionExpList ) ;", `$$ = { type: 'function', declare: true, header_only: true, returntype: $1, name: $2, arguments: $4, statements: [], source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @5.last_line, last_column: @5.last_column } };`],
      //["NWDataType NAME ( ) { }", `$$ = { type: 'function', declare: true, header_only: false, returntype: $1, name: $2, arguments: [], statements: [], source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @6.last_line, last_column: @6.last_column } };`],
      ["NWDataType NAME ( ) NWStatementBlock", `$$ = { type: 'function', declare: true, header_only: false, returntype: $1, name: $2, arguments: [], statements: $5.statements, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @5.last_line, last_column: @5.last_column } };`],
      ["NWDataType NAME ( NWFunctionExpList ) NWStatementBlock", `$$ = { type: 'function', declare: true, header_only: false, returntype: $1, name: $2, arguments: $4, statements: $6.statements, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @6.last_line, last_column: @6.last_column } };`],
      ["NWStatementStructFunction", `$$ = $1`],
    ],

    "NWStatementStructFunction": [
      ["STRUCT NAME NAME ( ) ;", `$$ = { type: 'function', declare: true, header_only: true, returntype: $1, struct: $2, name: $3, statements: [], source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @5.last_line, last_column: @5.last_column } };`],
      ["STRUCT NAME NAME ( NWFunctionExpList ) ;", `$$ = { type: 'function', declare: true, header_only: true, returntype: $1, struct: $2, name: $3, arguments: $5, statements: [], source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @6.last_line, last_column: @6.last_column } };`],
      ["STRUCT NAME NAME ( ) { }", `$$ = { type: 'function', declare: true, header_only: false, returntype: $1, struct: $2, name: $3, statements: [], source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @7.last_line, last_column: @7.last_column } };`],
      ["STRUCT NAME NAME ( ) { NWBlock }", `$$ = { type: 'function', declare: true, header_only: false, returntype: $1, struct: $2, name: $3, statements: $7, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @8.last_line, last_column: @8.last_column } };`],
      ["STRUCT NAME NAME ( NWFunctionExpList ) { NWBlock }", `$$ = { type: 'function', declare: true, header_only: false, returntype: $1, struct: $2, name: $3, arguments: $5, statements: $8, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @9.last_line, last_column: @9.last_column } };`],
    ],

    "NWStatementFunctionCall": [
      ["NWFunctionCall ;", `$$ = $1`],
    ],

    //---------------------//
    // NWFor Statement
    //---------------------//

    "NWForVariable": [
      //["INT NAME = NWExp", `$$ = { type: 'variable', is_const: false, datatype: {type: "datatype", unary: 3, value: $1}, name: $2, value: $4 };`],
      ["NAME = NWExp", `$$ = { type: 'variable', is_const: false, datatype: null, name: $1, value: $3 };`],
      ["NAME", `$$ = { type: 'variable', is_const: false, datatype: null, name: $1, value: null };`],
    ],

    "NWForIncrementor": [
      ["NAME ++", `$$ = { type: 'inc', is_const: false, datatype: null, name: $1, value: null };`],
      ["NAME --", `$$ = { type: 'dec', is_const: false, datatype: null, name: $1, value: null };`],
      ["NAME += NWExp", `$$ = { type: 'addeq', is_const: false, datatype: null, name: $1, value: $3 };`],
      ["NAME -= NWExp", `$$ = { type: 'subeq', is_const: false, datatype: null, name: $1, value: $3 };`],
    ],

    "NWStatementFor": [
      ["FOR ( NWForVariable ; NWArgs ; NWForIncrementor ) { }", `$$ = { type: 'for', initializer: $3, condition: $5, incrementor: $7, statements: [] };`],
      ["FOR ( NWForVariable ; NWArgs ; NWForIncrementor ) { NWBlock }", `$$ = { type: 'for', initializer: $3, condition: $5, incrementor: $7, statements: $10 };`],
    ],

    //---------------------//
    // NWWhile Statement
    //---------------------//

    "NWStatementWhile": [
      ["WHILE ( NWArgs ) { }", `$$ = { type: 'while', condition: $3, statements: [] };`],
      ["WHILE ( NWArgs ) { NWBlock }", `$$ = { type: 'while', condition: $3, statements: $6 };`],
    ],

    //---------------------//
    // NWDo Statement
    //---------------------//

    "NWStatementDo": [
      ["DO { } WHILE ( NWExpList ) ;", `$$ = { type: 'do', condition: $6, statements: [] };`],
      ["DO { NWBlock } WHILE ( NWExpList ) ;", `$$ = { type: 'do', condition: $7, statements: $3 };`],
    ],

    //-----------------//
    // NWIf Statements
    //-----------------//

    "NWStatementIf": [
      ["IF ( NWArgs ) NWIfBlockStatement NWStatementElseIfList", `$$ = { type: 'if', condition: $3, statements: $5, else: $6 };`],
      ["IF ( NWArgs ) NWIfBlockStatement", `$$ = { type: 'if', condition: $3, statements: $5, else: [] };`],
    ],

    // "IF_WITHOUT_ELSE": [
    //   [""],
    // ],

    "NWIfSingleStatement": [
      [ "NWStatement", `$$ = [$1]` ],
    ],

    "NWIfBlockStatement": [
      [ "{ }", `$$ = []` ],
      [ "{ NWBlock }", `$$ = $2` ],
      [ "NWStatement", `$$ = [$1]` ],
    ],

    "NWStatementElseIfList": [
      //["NWStatementElse", `$$ = [$1]`],
      ["NWStatementElseIf", `$$ = [$1]`],
      //["NWStatementElseIfList NWStatementElseIf", `$$ = $1; $1.push($2);`],
      ["NWStatementElseIfList NWStatementElseIf", `$$ = $1; $1.push($2);`],
    ],

    "NWStatementElse": [
      ["ELSE NWIfBlockStatement", `$$ = { type: 'else', statements: $2 };`],
    ],

    "NWStatementElseIf": [
      //ELSE IF
      //["ELSEIF ( NWArgs ) NWIfBlockStatement NWStatementElseIf", `$$ = { type: 'elseif', condition: $3, statements: $5, else: $6 };`],
      ["ELSEIF ( NWArgs ) NWIfBlockStatement", `$$ = { type: 'elseif', condition: $3, statements: $5, else: [] };`],

      //ELSE
      ["NWStatementElse", `$$ = $1;`],
    ],

    //---------------------//
    // NWSwitch Statements
    //---------------------//

    "NWStatementSwitch": [
      ["SWITCH ( NWExp ) { NWStatementCaseList }", `$$ = { type: 'switch', condition: $3, cases: $6.filter( c => c.type == 'case'), default: $6.find( d => d.type == 'default') };`],
      ["SWITCH ( NWExp ) { }", `$$ = { type: 'switch', condition: $3, cases: [], default: null };`],
    ],

    "NWStatementCaseList": [
      [ "NWStatementCase", `$$ = [$1]` ],
      [ "NWStatementCaseList NWStatementCase", `$$ = $1; $1.push($2);` ],
    ],

    "NWCaseBlockStatement": [
      [ "NWStatementAnonymousBlock NWStatementBreak", `$$ = [$1, $2];` ],
      [ "NWStatementAnonymousBlock", `$$ = [$1]` ],
      [ "NWBlock", `$$ = [$1]` ],
    ],

    "NWStatementCase": [
      ["DEFAULT : NWCaseBlockStatement", `$$ = { type: 'default', statements: $3[0],  fallthrough: false };`],
      ["DEFAULT :", `$$ = { type: 'default', statements: [], fallthrough: false  };`],
      ["CASE NWExp : NWCaseBlockStatement", `$$ = { type: 'case', condition: $2, statements: $4[0], fallthrough: $4.find( s => s.type == 'break') ? false : true };`],
      ["CASE NWExp :", `$$ = { type: 'case', condition: $2, statements: [], fallthrough: true };`],
    ],

    "NWArgs": [
      [ "NWExp", `$$ = [$1]` ],
      [ "NWArgs , NWExp", "$$ = $1; $1.push($3);" ],
      //[ " ", "$$ = [];" ],
    ],

    "NWVarList": [
      ["NWVar", `$$ = [$1]`],
      ["NWVarList , Var", `$$ = $1; $1.push($3)`],
    ],

    "NWExpList": [
      ["NWExp", `$$ = [$1]`],
      ["NWExpList , NWExp", `$$ = $1; $1.push($3)`],
    ],
    
    "NWNameList": [
      ["NAME", `$$ = [{ name: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } }]`],
      ["NWNameList , NAME", `$$ = $1; $1.push({ name: $3, source: { first_line: @3.first_line, first_column: @3.first_column, last_line: @3.last_line, last_column: @3.last_column } })`],
    ],

    "NWConstDataType": [
      ["INT", `$$ = {type: "datatype", unary: 3, value: $1}`],
      ["FLOAT", `$$ = {type: "datatype", unary: 4, value: $1}`],
      ["STRING", `$$ = {type: "datatype", unary: 5, value: $1}`],
    ],

    "NWDataType": [
      ["VOID", `$$ = {type: "datatype", unary: 0, value: $1}`],
      ["INT", `$$ = {type: "datatype", unary: 3, value: $1}`],
      ["FLOAT", `$$ = {type: "datatype", unary: 4, value: $1}`],
      ["OBJECT", `$$ = {type: "datatype", unary: 6, value: $1}`],
      ["STRING", `$$ = {type: "datatype", unary: 5, value: $1}`],
      ["VECTOR", `$$ = {type: "datatype", unary: 7, value: $1}`],
      //["STRUCT", `$$ = {type: "datatype", value: $1}`],
      ["ACTION", `$$ = {type: "datatype", unary: 8, value: $1}`],
      ["NWEngineType", `$$ = $1`],
      // ["EFFECT", `$$ = {type: "datatype", value: $1}`],
      // ["EVENT", `$$ = {type: "datatype", value: $1}`],
      // ["LOCATION", `$$ = {type: "datatype", value: $1}`],
      // ["TALENT", `$$ = {type: "datatype", value: $1}`],
    ],

    "NWEngineType": [],

    "NWFunctionCall": [
      ["NAME ( )", `$$ = { type: 'function_call', arguments: [], name: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      ["NAME ( NWExpList )", `$$ = { type: 'function_call', arguments: $3, name: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @4.last_line, last_column: @4.last_column } }`],
    ],

    "NWName": [
      [`NAME`, `$$ = { type: 'name', value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } }`],
    ],

    "NWVar": [
      ["NAME", `$$ = { type: 'variable', name: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } }`],
      ["NAME . NAME", `$$ = { type: 'variable', struct: $1, name: $3, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
    ],

    "NWFunctionExpList": [
      ["NWFunctionExp", `$$ = [$1]`],
      ["NWFunctionExpList , NWFunctionExp", `$$ = $1; $1.push($3)`],
    ],

    "NWFunctionExpValue": [
      [ "NWString",         "$$ = $1" ],
      [ "NWInteger",        "$$ = $1" ],
      [ "NWFloat",          "$$ = $1" ],
      [ "NWVectorLiteral",  "$$ = $1" ],
      [ "NWHexadecimal",    "$$ = $1" ],
      [ "NWObjectSelfLiteral", "$$ = $1" ],
      [ "NWObjectInvalidLiteral", "$$ = $1" ],
      [ "NAME",  "$$ = $1" ],
      [`- NWInteger`, `$$ = { type: "neg", value: $2, operator: { type: "operator", value: $1 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @2.last_line, last_column: @2.last_column } }`],
      [`- NWFloat`, `$$ = { type: "neg", value: $2, operator: { type: "operator", value: $1 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @2.last_line, last_column: @2.last_column } }`],
    ],

    "NWFunctionExp": [
      [`NWDataType NAME = NWFunctionExpValue`, `$$ = { type: 'argument', datatype: $1, name: $2, value: $4 }`],
      [`NWDataType NAME`, `$$ = { type: 'argument', datatype: $1, name: $2, value: null }`],
    ],

    "NWParenthesized": [
      [`( NWExp )`, `$$ = $2`],
    ],

    "NWExp": [
      [`NWBinop ? NWBinop : NWExp`, `$$ = { type: "ternery", left: $3, right: $5, condition: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @5.last_line, last_column: @5.last_column } }`],
      [`NWBinop`, `$$ = $1`],
    ],

    "NWBinop": [
      [`NWExpOr`, `$$ = $1`],
    ],

    "NWExpOr": [
      [`NWExpOr || NWExpAnd`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpAnd`, `$$ = $1`],
    ],

    "NWExpAnd": [
      [`NWExpAnd && NWExpComparison`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpComparison`, `$$ = $1`],
    ],

    "NWExpComparison": [
      [`NWExpComparison < NWExpSum`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpComparison > NWExpSum`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpComparison <= NWExpSum`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpComparison >= NWExpSum`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpComparison != NWExpSum`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpComparison == NWExpSum`, `$$ = { type: "compare", datatype: {type: "datatype", unary: 3, value: "int"}, left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpSum`, `$$ = $1`],
    ],

    "NWExpSum": [
      //[`NWExpSum += NWExpProduct`, `$$ = { type: "addleft", left: $1, right: $3, operator: { type: "operator", value: $2 } }`],
      //[`NWExpSum -= NWExpProduct`, `$$ = { type: "subleft", left: $1, right: $3, operator: { type: "operator", value: $2 } }`],
      [`NWExpSum + NWExpProduct`, `$$ = { type: "add", left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpSum - NWExpProduct`, `$$ = { type: "sub", left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpProduct`, `$$ = $1`],
    ],
    
    "NWExpProduct": [
      [`NWExpProduct * NWExpUnary`, `$$ = { type: "mul", left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpProduct / NWExpUnary`, `$$ = { type: "div", left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpProduct % NWExpUnary`, `$$ = { type: "mod", left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpProduct | NWExpUnary`, `$$ = { type: "incor", left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpProduct & NWExpUnary`, `$$ = { type: "booland", left: $1, right: $3, operator: { type: "operator", value: $2 }, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @3.last_line, last_column: @3.last_column } }`],
      [`NWExpUnary`, `$$ = $1`],
    ],

    "NWExpUnary": [
      [`! NWExpPow`, `$$ = { type: "not", value: $2, operator: { type: "operator", value: $1 }, source: { first_line: @2.first_line, first_column: @2.first_column, last_line: @2.last_line, last_column: @2.last_column } }`],
      [`- NWExpPow`, `$$ = { type: "neg", value: $2, operator: { type: "operator", value: $1 }, source: { first_line: @2.first_line, first_column: @2.first_column, last_line: @2.last_line, last_column: @2.last_column } }`],
      [`~ NWExpPow`, `$$ = { type: "comp", value: $2, operator: { type: "operator", value: $1 }, source: { first_line: @2.first_line, first_column: @2.first_column, last_line: @2.last_line, last_column: @2.last_column } }`],
      // [`NWExpPow --`, `$$ = { type: "subsub", value: $1, operator: { type: "operator", value: $1 } }`],
      // [`NWExpPow ++`, `$$ = { type: "addadd", value: $1, operator: { type: "operator", value: $1 } }`],
      [`NWExpPow`, `$$ = $1`],
    ],
    
    "NWExpPow": [
      [`NWAtom`, `$$ = $1`],
      [`NWAtom ^ NWExpPow`, `$$ = { type: "xor", left: $1, right: $3, operator: { type: "operator", value: $2 } }`],
    ],

    "NWPrefixExp": [
      [`NWFunctionCall`, `$$ = $1`],
      [`NWVar`, `$$ = $1`],
    ],

    "NWAtom": [
      [ "NWString",         `$$ = { type: 'literal', datatype: {type: "datatype", unary: 5, value: "string"}, value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };` ],
      [ "NWHexadecimal",    `$$ = { type: 'literal', datatype: {type: "datatype", unary: 3, value: "int"}, value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };` ],
      [ "NWInteger",        `$$ = { type: 'literal', datatype: {type: "datatype", unary: 3, value: "int"}, value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };` ],
      [ "NWFloat",          `$$ = { type: 'literal', datatype: {type: "datatype", unary: 4, value: "float"}, value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };` ],
      [ "NWVectorLiteral",  `$$ = { type: 'literal', datatype: {type: "datatype", unary: 5, value: "vector"}, value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };` ],
      [ "NWObjectSelfLiteral",     `$$ = { type: 'literal', datatype: {type: "datatype", unary: 6, value: "object"}, value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };` ],
      [ "NWObjectInvalidLiteral",  `$$ = { type: 'literal', datatype: {type: "datatype", unary: 6, value: "object"}, value: $1, source: { first_line: @1.first_line, first_column: @1.first_column, last_line: @1.last_line, last_column: @1.last_column } };` ],
      [ "NWPrefixExp",      `$$ = $1` ],
      [ `NWParenthesized`, `$$ = $1` ],
    ],


    "NWString": [[ "CEXOSTRING", "$$ = yytext;" ]],
    "NWInteger": [[ "INTEGER", "$$ = Number(yytext);" ]],
    "NWFloat": [[ "FLOAT", "$$ = Number(yytext.replace('f', ''));" ]],
    "NWHexadecimal": [[ "HEXADECIMAL", "$$ = Number(yytext);" ]],
    "NWVectorLiteral": [[ "[ NWFloat , NWFloat , NWFloat ]", `$$ = {x: $2, y: $4, z: $6};` ]],
    "NWObjectSelfLiteral": [[ "OBJECT_SELF", "$$ = Number(0)" ]],
    "NWObjectInvalidLiteral": [[ "OBJECT_INVALID", "$$ = Number(0x01);" ]],
  }
};
