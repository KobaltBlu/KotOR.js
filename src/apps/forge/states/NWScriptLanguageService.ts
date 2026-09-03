import { createForgeNssLanguageHost } from "@/apps/forge/nwscript-language/nssForgeHost";
import { registerNssLanguageFeatures } from "@/apps/forge/nwscript-language/nssLanguageFeatures";
import { nssEditorApi } from "@/apps/forge/nwscript-language/nssEditorApi";
import { NWScriptParser } from "@/nwscript/compiler/NWScriptParser";
import { NWScriptASTCodeGen } from "@/nwscript/compiler/NWScriptASTCodeGen";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { FunctionNode, StructNode, VariableListNode, VariableNode } from "@/nwscript/compiler/ASTTypes";

// Format NWScript code using AST
function formatNWScript(code: string, options: monacoEditor.languages.FormattingOptions = { tabSize: 2, insertSpaces: true }): string {
  try {
    const parser = new NWScriptParser(ForgeState.nwScriptParser?.nwscript_source, code);
    // Parse the code into an AST using the AST builder directly
    // We don't need engine types for formatting - just the structure
    const ast = parser.parseAST(code);
    
    if (!ast) {
      // If parsing fails, return original code
      console.warn('AST formatting failed, returning original');
      return code;
    }
    
    // Generate formatted code from AST
    console.log('AST formatting successful, generating code from AST');
    const codeGen = new NWScriptASTCodeGen({
      tabSize: options.tabSize || 2,
      insertSpaces: options.insertSpaces !== false,
    });
    
    return codeGen.generate(ast);
  } catch (error: any) {
    // If anything goes wrong, return original code
    // Don't log parse errors - they're expected when formatting incomplete/incorrect code
    // Only log unexpected errors (not parse errors)
    if (error?.name !== 'NWScriptASTBuilderError' && error?.type !== 'parse') {
      console.warn('AST formatting failed, returning original code:', error);
    }
    console.error(error);
    return code;
  }
}

export class NWScriptLanguageService {

  static nwScriptTokenConfig: monacoEditor.languages.IMonarchLanguage | null = null;

  static initNWScriptLanguage() {
    const decoder = new TextDecoder();
    if (ForgeState.nwscript_nss) {
      nssEditorApi.setEngineSource(decoder.decode(ForgeState.nwscript_nss));
    }

    // Register a new language
    monacoEditor.languages.register({ id: 'nwscript' });

    const tokenConfig: monacoEditor.languages.IMonarchLanguage = {
      keywords: [
        'int', 'float', 'object', 'vector', 'string', 'void', 'action', 
        'default', 'const', 'if', 'else', 'switch', 'case',
        'while', 'do', 'for', 'break', 'continue', 'return', 'struct', 'OBJECT_SELF', 'OBJECT_INVALID',
      ],

      functions: [
        //'GN_SetListeningPatterns'
      ],

      engineActions: [] as string[],

      engineConstants: [] as string[],

      localFunctions: [] as string[],

      parenFollows: [
        'if', 'for', 'while', 'switch',
      ],
    
      operators: [
        '=', '??', '||', '&&', '|', '^', '&', '==', '!=', '<=', '>=', '<<',
        '+', '-', '*', '/', '%', '!', '~', '++', '--', '+=',
        '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>', '=>', '>>>'
      ],

      tokenizer: {
        root: [
          // whitespace
          { include: '@whitespace' },

          // numbers - MUST come before identifiers! Order matters - more specific patterns first
          [/0[xX][0-9a-fA-F_]+/, 'number.hex'],
          [/0[bB][01_]+/, 'number.hex'], // binary: use same theme style as hex
          [/[0-9]+\.[0-9]+([eE][\-+]?[0-9]+)?[fFdD]?/, 'number.float'],
          [/[0-9]+/, 'number'],

          // identifiers and keywords
          [/\@?[a-zA-Z_][a-zA-Z0-9_]*/, {
            cases: {
              //'@namespaceFollows': { token: 'keyword.$0', next: '@namespace' },
              '@keywords': { token: 'keyword.$0', next: '@qualified' },
              '@engineActions': { token: 'engineAction', next: '@qualified' },
              '@engineConstants': { token: 'engineConstant', next: '@qualified' },
              '@localFunctions': { token: 'localFunction', next: '@qualified' },
              '@functions': { token: 'functions', next: '@qualified' },
              '@default': { token: 'identifier', next: '@qualified' }
            }
          }],

          // strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
          [/"/, { token: 'string.quote', next: '@string' }],
          //[/\$\@"/, { token: 'string.quote', next: '@litinterpstring' }],
          //[/\@"/, { token: 'string.quote', next: '@litstring' }],
          //[/\$"/, { token: 'string.quote', next: '@interpolatedstring' }],

          // characters
          [/'[^\\']'/, 'string'],
          //[/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
          [/'/, 'string.invalid'],
        ],

        qualified: [
          [/[a-zA-Z0-9_][\w]*/, {
            cases: {
              '@keywords': { token: 'keyword.$0' },
              '@engineActions': { token: 'engineAction' },
              '@engineConstants': { token: 'engineConstant' },
              '@localFunctions': { token: 'localFunction' },
              '@functions': { token: 'functions.$0' },
              '@default': 'identifier'
            }
          }],
          [/\./, 'delimiter'],
          ['', '', '@pop'],
        ],          
        
        comment: [
          [/[^\/*]+/, 'comment'],
          // [/\/\*/,    'comment', '@push' ],    // no nested comments :-(
          ['\\*/', 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        whitespace: [
          [/^[ \t\v\f]*#((r)|(load))(?=\s)/, 'directive.csx'],
          [/^[ \t\v\f]*#\w.*$/, 'namespace.cpp'],
          [/[ \t\v\f\r\n]+/, ''],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],

        string: [
          [/[^\\"]+/, 'string'],
          //[/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, { token: 'string.quote', next: '@pop' }]
        ],
    
        litstring: [
          [/[^"]+/, 'string'],
          [/""/, 'string.escape'],
          [/"/, { token: 'string.quote', next: '@pop' }]
        ],
    
        litinterpstring: [
          [/[^"{]+/, 'string'],
          [/""/, 'string.escape'],
          [/{{/, 'string.escape'],
          [/}}/, 'string.escape'],
          [/{/, { token: 'string.quote', next: 'root.litinterpstring' }],
          [/"/, { token: 'string.quote', next: '@pop' }]
        ],
    
        interpolatedstring: [
          [/[^\\"{]+/, 'string'],
          //[/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/{{/, 'string.escape'],
          [/}}/, 'string.escape'],
          [/{/, { token: 'string.quote', next: 'root.interpolatedstring' }],
          [/"/, { token: 'string.quote', next: '@pop' }]
        ],
      }
    };

    //Engine Types
    const _nw_types = ForgeState.nwScriptParser.engine_types.slice(0);
    for(let i = 0; i < _nw_types.length; i++){
      const nw_type = _nw_types[i];
      tokenConfig.keywords.push(nw_type.name);
    }

    //Engine Actions
    const _nw_actions = ForgeState.nwScriptParser.engine_actions.slice(0);
    for(let i = 0; i < _nw_actions.length; i++){
      const nw_action = _nw_actions[i];
      tokenConfig.engineActions.push(nw_action.name);
    }

    //Engine Constants
    const _nw_constants = ForgeState.nwScriptParser.engine_constants.slice(0);
    for(let i = 0; i < _nw_constants.length; i++){
      const nw_constant = _nw_constants[i];
      tokenConfig.engineConstants.push(nw_constant.name);
    }

    // Store token config for dynamic updates
    NWScriptLanguageService.nwScriptTokenConfig = tokenConfig;

    monacoEditor.languages.setMonarchTokensProvider( 'nwscript', tokenConfig);

    monacoEditor.languages.setLanguageConfiguration('nwscript', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '(', close: ')' },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
        { open: '"', close: '"', notIn: ['string'] },
        // { open: '/**', close: ' */', notIn: ['string'] }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      onEnterRules: [
        {
          // Inside a /** comment block */
          beforeText: /^\s*\/\*\*(?!\/).*$/,
          action: { indentAction: monacoEditor.languages.IndentAction.None, appendText: " * " }
        },
        {
          // After a line that starts with " *"
          beforeText: /^\s*\*(?!\/).*$/,
          action: { indentAction: monacoEditor.languages.IndentAction.None, appendText: "* " }
        },
        {
          // Closing the block
          beforeText: /^\s*\*\/\s*$/,
          action: { indentAction: monacoEditor.languages.IndentAction.None, removeText: 1 }
        }
      ]
    });

    // Define a new theme that contains only rules that match this language
    monacoEditor.editor.defineTheme('nwscript-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // { token: 'comment', foreground: 'aaaaaa', fontStyle: 'italic' },
        // { token: 'keyword', foreground: 'ce63eb' },
        // { token: 'operator', foreground: '000000' },
        // { token: 'namespace', foreground: '66afce' },
        { token: 'functions', foreground: 'ce63eb' },
        { token: 'engineAction', foreground: '4EC9B0' },
        { token: 'engineConstant', foreground: 'C586C0' },
        { token: 'localFunction', foreground: 'DCDCAA' },
        // Number literals - order matters, more specific first
        { token: 'number.hex', foreground: 'D7BA7D' },
        { token: 'number.float', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        // { token: 'lineComment', foreground: '60cf30' },
        // { token: 'blockComment', foreground: '60cf30' },
        // { token: 'TEXT', foreground: 'FFEE99' },
        // { token: 'NAME', foreground: 'C8C8C8' },
        // { token: 'CONST', foreground: 'C586C0' },
        // { token: 'VOID', foreground: 'C586C0' },
        // { token: 'INT', foreground: 'C586C0' },
        // { token: 'FLOAT', foreground: 'C586C0' },
        // { token: 'OBJECT', foreground: 'C586C0' },
        // { token: 'STRING', foreground: 'C586C0' },
        // { token: 'VECTOR', foreground: 'C586C0' },
        // { token: 'STRUCT', foreground: 'C586C0' },
        // { token: 'FOR', foreground: 'C586C0' },
        // { token: 'IF', foreground: 'C586C0' },
        // { token: 'WHILE', foreground: 'C586C0' },
        // { token: 'DO', foreground: 'C586C0' },
        // { token: 'SWITCH', foreground: 'C586C0' },
        // { token: 'CASE', foreground: 'C586C0' },
        // { token: 'DEFAULT', foreground: 'C586C0' },
        // { token: 'RETURN', foreground: 'C586C0' },
        // { token: 'CONTINUE', foreground: 'C586C0' },
        // { token: 'OBJECT_SELF', foreground: 'C586C0' },
        // { token: 'OBJECT_INVALID', foreground: 'C586C0' },
      ],
      colors: {
        'editor.foreground': '#FFFFFF'
      }
    });

    monacoEditor.editor.defineTheme('nwscript-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'functions', foreground: '9b2393' },
        { token: 'engineAction', foreground: '098658' },
        { token: 'engineConstant', foreground: 'AF00DB' },
        { token: 'localFunction', foreground: '795E26' },
        { token: 'number.hex', foreground: 'B89500' },
        { token: 'number.float', foreground: '098658' },
        { token: 'number', foreground: '098658' },
      ],
      colors: {
        'editor.foreground': '#333333'
      }
    });


    // Register document formatter for NWScript
    monacoEditor.languages.registerDocumentFormattingEditProvider('nwscript', {
      provideDocumentFormattingEdits: (model: monacoEditor.editor.ITextModel, options: monacoEditor.languages.FormattingOptions, token: monacoEditor.CancellationToken) => {
        const text = model.getValue();
        
        // Get editor options from the model
        const modelOptions = model.getOptions();
        const tabSize = modelOptions.tabSize || 2;
        const insertSpaces = modelOptions.insertSpaces !== false;
        // Pass options to formatter
        const formatOptions = {
          tabSize: tabSize,
          insertSpaces: insertSpaces
        };
        
        const formatted = formatNWScript(text, formatOptions);
        
        if (formatted !== text) {
          return [{
            range: model.getFullModelRange(),
            text: formatted
          }];
        }
        return [];
      }
    });

    // Register document symbol provider for outline/navigation (Ctrl+Shift+O / Cmd+Shift+O)
    monacoEditor.languages.registerDocumentSymbolProvider('nwscript', {
      provideDocumentSymbols: function (model: monacoEditor.editor.ITextModel, token: monacoEditor.CancellationToken) {
        const symbols: monacoEditor.languages.DocumentSymbol[] = [];
        try {
          const text = model.getValue();
          
          // Get the parser from the current tab if available
          const currentTab = ForgeState.tabManager.currentTab as any;
          let parser = currentTab?.nwScriptParser;
          
          // If no parser available, create a temporary one
          if (!parser) {
            parser = new NWScriptParser(ForgeState.nwScriptParser?.nwscript_source, text);
          } else {
            // Parse the current script to get symbols
            parser.parseScript(text);
          }

          if (!parser.ast || !parser.ast.statements) {
            return [];
          }

          // Extract symbols from AST
          for (const statement of parser.ast.statements) {
            if (statement.type === 'function') {
              const func = statement as FunctionNode;
              const args = func.arguments.map((arg) => `${arg.datatype.value} ${arg.name}`).join(', ');
              const detail = `${func.returntype.value} ${func.name}(${args})`;
              
              symbols.push({
                name: func.name,
                detail: detail,
                kind: monacoEditor.languages.SymbolKind.Function,
                range: {
                  startLineNumber: func.source?.first_line || 1,
                  startColumn: func.source?.first_column || 1,
                  endLineNumber: func.source?.last_line || func.source?.first_line || 1,
                  endColumn: func.source?.last_column || func.source?.first_column || 1,
                },
                selectionRange: {
                  startLineNumber: func.source?.first_line || 1,
                  startColumn: func.source?.first_column || 1,
                  endLineNumber: func.source?.last_line || func.source?.first_line || 1,
                  endColumn: func.source?.last_column || func.source?.first_column || 1,
                },
                children: [], // Could extract local variables here if needed
                tags: []
              });
            } else if (statement.type === 'struct') {
              const struct = statement as StructNode;
              symbols.push({
                name: struct.name,
                detail: `struct ${struct.name}`,
                kind: monacoEditor.languages.SymbolKind.Struct,
                range: {
                  startLineNumber: struct.source?.first_line || 1,
                  startColumn: struct.source?.first_column || 1,
                  endLineNumber: struct.source?.last_line || struct.source?.first_line || 1,
                  endColumn: struct.source?.last_column || struct.source?.first_column || 1,
                },
                selectionRange: {
                  startLineNumber: struct.source?.first_line || 1,
                  startColumn: struct.source?.first_column || 1,
                  endLineNumber: struct.source?.last_line || struct.source?.first_line || 1,
                  endColumn: struct.source?.last_column || struct.source?.first_column || 1,
                },
                children: struct.properties?.map((prop) => ({
                  name: prop.name,
                  detail: prop.datatype ? `${prop.datatype.value} ${prop.name}` : prop.name,
                  kind: monacoEditor.languages.SymbolKind.Property,
                  range: {
                    startLineNumber: prop.source?.first_line || struct.source?.first_line || 1,
                    startColumn: prop.source?.first_column || struct.source?.first_column || 1,
                    endLineNumber: prop.source?.last_line || struct.source?.first_line || 1,
                    endColumn: prop.source?.last_column || struct.source?.first_column || 1,
                  },
                  selectionRange: {
                    startLineNumber: prop.source?.first_line || struct.source?.first_line || 1,
                    startColumn: prop.source?.first_column || struct.source?.first_column || 1,
                    endLineNumber: prop.source?.last_line || struct.source?.first_line || 1,
                    endColumn: prop.source?.last_column || struct.source?.first_column || 1,
                  },
                  tags: []
                })) || [],
                tags: []
              });
            } else if (statement.type === 'variableList') {
              const variable = statement as VariableListNode;
              for (const nameInfo of variable.names) {
                symbols.push({
                  name: nameInfo.name,
                  detail: `${variable.datatype.value} ${nameInfo.name}${variable.is_const ? ' (const)' : ''}`,
                  kind: variable.is_const ? monacoEditor.languages.SymbolKind.Constant : monacoEditor.languages.SymbolKind.Variable,
                  range: {
                    startLineNumber: nameInfo.source?.first_line || nameInfo.source?.first_line || 1,
                    startColumn: nameInfo.source?.first_column || nameInfo.source?.first_column || 1,
                    endLineNumber: nameInfo.source?.last_line || nameInfo.source?.last_line || 1,
                    endColumn: nameInfo.source?.last_column || nameInfo.source?.last_column || 1,
                  },
                  selectionRange: {
                    startLineNumber: nameInfo.source?.first_line || nameInfo.source?.first_line || 1,
                    startColumn: nameInfo.source?.first_column || nameInfo.source?.first_column || 1,
                    endLineNumber: nameInfo.source?.last_line || nameInfo.source?.last_line || 1,
                    endColumn: nameInfo.source?.last_column || nameInfo.source?.last_column || 1,
                  },
                  tags: []
                });
              }
            } else if (statement.type === 'variable') {
              const variable = statement as VariableNode;
              // const names = statement.type === 'variableList' ? variable.names : [{ name: variable.name, source: variable.source }];
              
              symbols.push({
                name: variable.name,
                detail: `${variable.datatype.value} ${variable.name}${variable.is_const ? ' (const)' : ''}`,
                kind: variable.is_const ? monacoEditor.languages.SymbolKind.Constant : monacoEditor.languages.SymbolKind.Variable,
                range: {
                  startLineNumber: variable.source?.first_line || variable.source?.first_line || 1,
                  startColumn: variable.source?.first_column || variable.source?.first_column || 1,
                  endLineNumber: variable.source?.last_line || variable.source?.last_line || 1,
                  endColumn: variable.source?.last_column || variable.source?.last_column || 1,
                },
                selectionRange: {
                  startLineNumber: variable.source?.first_line || variable.source?.first_line || 1,
                  startColumn: variable.source?.first_column || variable.source?.first_column || 1,
                  endLineNumber: variable.source?.last_line || variable.source?.last_line || 1,
                  endColumn: variable.source?.last_column || variable.source?.last_column || 1,
                },
                tags: []
              });
                
            }
          }

          return symbols;
        } catch (e) {
          console.error('Error providing document symbols:', e);
          return [];
        }
      }
    });

    registerNssLanguageFeatures(createForgeNssLanguageHost());
  }

  static updateLocalFunctions(localFunctions: string[]) {
    if (!NWScriptLanguageService.nwScriptTokenConfig) return;
    
    // Update the local functions array
    NWScriptLanguageService.nwScriptTokenConfig.localFunctions = localFunctions;
    monacoEditor.languages.setMonarchTokensProvider('nwscript', NWScriptLanguageService.nwScriptTokenConfig);
  }
}
