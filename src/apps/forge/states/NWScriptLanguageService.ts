import { EditorFile } from "../EditorFile";
import { FileTypeManager } from "../FileTypeManager";
import { NWScriptParser } from "../../../nwscript/compiler/NWScriptParser";
import { NWScriptASTBuilder } from "../../../nwscript/compiler/NWScriptASTBuilder";
import { NWScriptASTCodeGen } from "../../../nwscript/compiler/NWScriptASTCodeGen";
import { ForgeState } from "./ForgeState";
import * as KotOR from '../KotOR';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
// import { languages } from "monaco-editor";
import type { TabState } from "./tabs/TabState";
import { FunctionNode, StructNode, VariableListNode, VariableNode } from "../../../nwscript/compiler/ASTTypes";
import type { TabTextEditorState } from "./tabs/TabTextEditorState";
import { SemanticFunctionNode } from "../../../nwscript/compiler/ASTSemanticTypes";

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
    const arg_value_parser = function( value: any ): any {
      if(typeof value === 'undefined') return 'NULL';
      if(typeof value == 'object'){
        if(typeof value.x == 'number' && typeof value.y == 'number' && typeof value.z == 'number'){
          return `[${value.x}, ${value.y}, ${value.z}]`;
        }else if(value.type == 'neg'){
          return '-'+arg_value_parser(value.value);
        }else if(value?.datatype?.value == 'object'){
          if(value.value == 0x7FFFFFFF) return 'OBJECT_INVALID';
          if(value.value == 0) return 'OBJECT_SELF';
          return arg_value_parser(value.value);
        }else if(value?.datatype?.value == 'int'){
          return arg_value_parser(value.value);
        }else if(value?.datatype?.value == 'float'){
          return arg_value_parser(value.value);
        }else if(value?.datatype?.value == 'string'){
          return arg_value_parser(value.value);
        }else if(value?.datatype?.value == 'vector'){
          return arg_value_parser(value.value);
        }
      }else if(typeof value == 'string'){
        return value;
      }else if(typeof value == 'number'){
        return value;
      }
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

    const nw_suggestions: monacoEditor.languages.CompletionItem[] = [];
    const keywords = ['void', 'int', 'float', 'string', 'object', 'vector', 'struct', 'action'];

    for(let i = 0; i < keywords.length; i++){
      nw_suggestions.push({
        label: keywords[i],
        kind: monacoEditor.languages.CompletionItemKind.Keyword,
        insertText: keywords[i],
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: null as any
      });
    }

    //Engine Types
    const nw_types = ForgeState.nwScriptParser.engine_types.slice(0);
    for(let i = 0; i < nw_types.length; i++){
      const nw_type = nw_types[i];
      nw_suggestions.push({
        label: nw_type.name,
        kind: monacoEditor.languages.CompletionItemKind.Keyword,
        insertText: `${nw_type.name}`,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Type #${nw_type.index+1}:\n\n${nw_type.name}`,
        range: null as any
      });
    }

    //Engine Constants
    const nw_constants = ForgeState.nwScriptParser.engine_constants.slice(0);
    for(let i = 0; i < nw_constants.length; i++){
      const nw_constant = nw_constants[i];
      nw_suggestions.push({
        label: nw_constant.name,
        kind: monacoEditor.languages.CompletionItemKind.Constant,
        insertText: `${nw_constant.name}`,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Constant #${nw_constant.index+1}:\n\n${nw_constant.datatype.value} ${nw_constant.name} = ${arg_value_parser(nw_constant.value)};`,
        range: null as any
      });
    }

    //Engine Routines
    // const nw_actions = Object.entries(
    //   KotOR.ApplicationProfile.GameKey == KotOR.GameEngineType.KOTOR ? 
    //   KotOR.NWScriptDefK1.Actions : 
    //   KotOR.NWScriptDefK2.Actions
    // );
    const nw_actions = ForgeState.nwScriptParser.engine_actions.slice(0);
    nw_actions.forEach( (action) =>{
      const args: string[] = [];
      
      for(let i = 0; i < action.arguments.length; i++){
        const arg = action.arguments[i];
        if(arg.value){
          args.push(`\${${(i+1)}:${arg.datatype.value} ${arg.name} = ${arg_value_parser(arg.value)}}`);
        }else{
          args.push(`\${${(i+1)}:${arg.datatype.value} ${arg.name}}`);
        } 
      }
      
      nw_suggestions.push({
        label: action.name,
        kind: monacoEditor.languages.CompletionItemKind.Function,
        insertText: `${action.name}(${args.join(', ')})`,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Routine #${action.index}:\n\n${action.returntype.value} ${action.name}(${args.join(', ')})\n\n`+action.comment,
        range: null as any
      });
    });

    // Register a completion item provider for the new language
    monacoEditor.languages.registerCompletionItemProvider('nwscript', {
      provideCompletionItems: () => {
        // console.log('auto complete');
        try{
          const local_suggestions: monacoEditor.languages.CompletionItem[] = [
            {
              label: 'void main()',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['void main () {', '\t$0', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'void main() Statement',
              range: null as any
            },
            {
              label: 'int StartingConditional()',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['int StartingConditional () {', '\t$0', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'int StartingConditional() Statement',
              range: null as any
            },
            {
              label: 'if',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: 'if (${1:condition}) {\n\t$0\n}',
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'if statement',
              filterText: 'if',
              sortText: '0if',
              range: null as any
            },
            {
              label: 'ifelse',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['if (${1:condition}) {', '\t$0', '} else {', '\t', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If-Else Statement',
              range: null as any
            },
            {
              label: 'for',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: 'for (${1:int i = 0}; ${2:i < ${3:10}}; ${4:i++}) {\n\t$0\n}',
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'for loop',
              filterText: 'for',
              sortText: '0for',
              range: null as any
            },
            {
              label: 'while',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: 'while (${1:condition}) {\n\t$0\n}',
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'while loop',
              filterText: 'while',
              sortText: '0while',
              range: null as any
            },
            {
              label: 'switch',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['switch (${1:expression}) {', '\tcase ${2:value}:', '\t\t$0', '\t\tbreak;', '\tdefault:', '\t\tbreak;', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'switch statement',
              filterText: 'switch',
              sortText: '0switch',
              range: null as any
            },
            {
              label: 'struct',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['struct ${1:StructName} {', '\t${2:int} ${3:member};', '\t$0', '};'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'struct declaration',
              filterText: 'struct',
              sortText: '0struct',
              range: null as any
            }
          ];

          const parser = (ForgeState.tabManager.currentTab as any).nwScriptParser;
          if(parser){
            try {
              //Local Variables - safely access, parser might be in error state
              const l_variables = parser.local_variables || (parser.program?.scope?.variables || []);
              if (Array.isArray(l_variables)) {
                for(let i = 0; i < l_variables.length; i++){
                  const l_variable = l_variables[i];
                  if (!l_variable || !l_variable.name) continue;
                  // console.log(l_variable);
                  const kind = l_variable.is_const ? monacoEditor.languages.CompletionItemKind.Constant : monacoEditor.languages.CompletionItemKind.Variable;
                  local_suggestions.push({
                    label: l_variable.name,
                    kind: kind,
                    insertText: `${l_variable.name}`,
                    insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: `Variable:\n\n${l_variable.datatype?.value || 'unknown'} ${l_variable.name};`,
                    range: null as any
                  });
                }
              }
            } catch (e) {
              // Silently fail - don't break autocomplete if variable access fails
              console.warn('Error accessing parser variables:', e);
            }
          }
          console.log('Autocomplete', ([] as any[]).concat(local_suggestions, nw_suggestions))
          return { 
            incomplete: true, 
            suggestions: ([] as any[]).concat(local_suggestions, nw_suggestions) 
          };
        }catch(e){
          console.error('Autocomplete error:', e);
          // Always return at least the engine suggestions even on error
          return { 
            incomplete: true, 
            suggestions: nw_suggestions 
          };
        }
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

    monacoEditor.languages.registerHoverProvider('nwscript', {
      provideHover: function (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position, token: monacoEditor.CancellationToken) {
        const wordObject = model.getWordAtPosition(position);
        if(wordObject){
          
          //Engine Constants
          const nw_constant = ForgeState.nwScriptParser.engine_constants.find( (obj) => obj.name == wordObject.word );
          if(nw_constant){
            return {
              contents: [
                { value: `**nwscript.nss**` },
                { value: `\`\`\`nwscript\n${nw_constant.datatype.value} ${nw_constant.name} = ${arg_value_parser(nw_constant.value)}\n \n\`\`\`` }
              ]
            };
          }

          const action = nw_actions.find( (obj) => obj[1].name == wordObject.word );
          if(action){
            // console.log(action);
            let args = '';
            // Match by function name - try wordObject.word first, then action[1].name, then action[0] as fallback
            const function_definition = ForgeState.nwScriptParser.engine_actions.find((a) => 
              a.name === wordObject.word || 
              a.name === action[1].name || 
              a.name === action[0]
            );
            if(!function_definition) {
              // If we can't find the definition, still show the hover with info from NWScriptDef
              let args_fallback = '';
              for(let i = 0; i < action[1].args.length; i++){
                const arg = action[1].args[i];
                if(i > 0) args_fallback += ', ';
                args_fallback += arg;
              }
              let hoverContent = `\`\`\`nwscript\n${action[1].name}(${args_fallback})\n\`\`\``;
              if (action[1].comment && action[1].comment.trim()) {
                hoverContent += `\n\n**Documentation:**\n\`\`\`\n${action[1].comment.trim()}\n\`\`\``;
              }
              return {
                contents: [
                  { value: `**nwscript.nss**` },
                  { value: hoverContent }
                ]
              };
            }
            // console.log(function_definition);
            for(let i = 0; i < action[1].args.length; i++){
              const arg = action[1].args[i];
              const def_arg = function_definition.arguments[i];
              if(i > 0) args += ', ';
              if(def_arg){
                if(def_arg.value){
                  const value = arg_value_parser(def_arg.value);
                  args += `${arg} ${def_arg.name} = ${value}`;
                }else{
                  args += `${arg} ${def_arg.name}`;
                }
              }else{
                console.warn('invalid argument', i, function_definition)
              }
            }
            // Build hover content with comment from nwscript.nss
            let hoverContent = `\`\`\`nwscript\n${function_definition.returntype.value} ${action[1].name}(${args})\n\`\`\``;
            
            // Add comment from nwscript.nss if available
            if (function_definition.comment && function_definition.comment.trim()) {
              hoverContent += `\n\n**Documentation:**\n\`\`\`\n${function_definition.comment.trim()}\n\`\`\``;
            } else if (action[1].comment && action[1].comment.trim()) {
              // Fallback to comment from NWScriptDef if nwscript.nss comment not available
              hoverContent += `\n\n**Documentation:**\n\`\`\`\n${action[1].comment.trim()}\n\`\`\``;
            }
            
            return {
              contents: [
                { value: `**nwscript.nss**` },
                { value: hoverContent }
              ]
            };
          }

          const parser = (ForgeState.tabManager.currentTab as any).nwScriptParser;
          if(parser){

            const structPropertyMatches = model.getValue().matchAll(
              new RegExp("(?:[A-Za-z_]|[A-Za-z_][A-Za-z0-9_]+)\\b[\\s|\\t+]?\\.[\\s|\\t+]?"+wordObject.word+"\\b", 'g')
            );
            //model.getPositionAt(324); // return { lineNumber: Number, column: Number };
            const structProperty = structPropertyMatches?.next()?.value;
            if(structProperty){
              const parts = structProperty["0"].split('.');
              const structName = parts[0];
              const structPropertyName = parts[1];
              if(structName){
                //Local Variables
                const l_struct = (parser.local_variables || []).find( (obj) => obj.name == structName );
                if(l_struct?.datatype?.value == 'struct'){
                  const struct_ref = (l_struct.type == 'variable') ? l_struct.struct_reference : l_struct ;
                  for(let i = 0; i < struct_ref.properties.length; i++){
                    const prop = struct_ref.properties[i];
                    if(prop && prop.name == wordObject.word){
                      return {
                        contents: [
                          { value: '**SOURCE**' },
                          { value: `\`\`\`nwscript\n${prop.datatype.value} ${prop.name} \n\`\`\`` }
                        ]
                      };
                    }
                  }
                }
                // console.log('struct', l_variable);
              }
            }


            //Local Variables
            const l_variable = (parser.local_variables || []).find( (obj) => obj.name == wordObject.word );
            if(l_variable){
              // console.log(l_variable);
              return {
                contents: [
                  { value: `**nwscript.nss**` },
                  { value: `\`\`\`nwscript\n${l_variable.datatype.value} ${l_variable.name} \n\`\`\`` }
                ]
              };
            }

            //Local Function - check both local_functions (if exists) and program.functions
            let l_function = (parser.local_functions || []).find( (obj) => obj.name == wordObject.word );
            if(!l_function && parser.program && parser.program.functions) {
              l_function = parser.program.functions.find( (obj) => obj.name == wordObject.word );
            }
            
            if(l_function){
              // Extract comment from source if available
              let functionComment = '';
              if (l_function.source && l_function.source.first_line > 1) {
                const scriptText = model.getValue();
                const lines = scriptText.split('\n');
                const funcLine = l_function.source.first_line - 1; // Convert to 0-based index
                
                // Look backwards for comment blocks (similar to engine actions)
                let commentLines: string[] = [];
                let inBlockComment = false;
                
                for (let i = funcLine - 1; i >= 0; i--) {
                  const line = lines[i];
                  if (!line) continue; // Skip if line doesn't exist
                  const trimmed = line.trim();
                  
                  if (trimmed === '') {
                    if (commentLines.length > 0 && !inBlockComment) {
                      break;
                    }
                    if (inBlockComment) {
                      commentLines.unshift('');
                    }
                    continue;
                  }
                  
                  // Check for block comment end */
                  if (trimmed.includes('*/') && !trimmed.includes('/*')) {
                    inBlockComment = true;
                    const endMatch = trimmed.match(/\*\/(.*)/);
                    if (endMatch && endMatch[1].trim()) {
                      break;
                    }
                    continue;
                  }
                  
                  // Check for block comment start /*
                  if (trimmed.includes('/*')) {
                    const startMatch = trimmed.match(/\/\*(.*?)(\*\/)?/);
                    if (startMatch) {
                      if (startMatch[2]) {
                        commentLines.unshift(startMatch[1].trim());
                        inBlockComment = false;
                      } else {
                        inBlockComment = false;
                        if (startMatch[1].trim()) {
                          commentLines.unshift(startMatch[1].trim());
                        }
                        break;
                      }
                    }
                    continue;
                  }
                  
                  // If we're in a block comment, collect the line
                  if (inBlockComment) {
                    commentLines.unshift(trimmed);
                    continue;
                  }
                  
                  // Handle single-line comments
                  if (trimmed.startsWith('//')) {
                    commentLines.unshift(trimmed.replace(/^\/\/\s*/, ''));
                    continue;
                  }
                  
                  // Stop at non-comment code
                  break;
                }
                
                functionComment = commentLines.join('\n').trim();
              }
              
              // console.log(l_function);
              const args: string[] = [];
              for(let i = 0; i < l_function.arguments.length; i++){
                const def_arg = l_function.arguments[i];
                if(def_arg){
                  if(def_arg.value){
                    const value = arg_value_parser(def_arg.value);
                    args.push(`${def_arg.datatype.value} ${def_arg.name} = ${value}`);
                  }else{
                    args.push(`${def_arg.datatype.value} ${def_arg.name}`);
                  }
                }else{
                  console.warn('invalid argument', i, l_function)
                }
              }
              
              // Build hover content with comment
              let hoverContent = `\`\`\`nwscript\n${l_function.returntype.value} ${l_function.name}(${args.join(', ')})\n\`\`\``;
              
              if (functionComment) {
                hoverContent += `\n\n**Documentation:**\n\`\`\`\n${functionComment}\n\`\`\``;
              }
              
              return {
                contents: [
                  { value: '**SOURCE**' },
                  { value: hoverContent }
                ]
              };
            }
          }

        }
        return {
          range: new monacoEditor.Range(
            1,
            1,
            model.getLineCount(),
            model.getLineMaxColumn(model.getLineCount())
          ),
        };
      }
    } as any);

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

    // Register definition provider for "Go to Definition" (F12 / Ctrl+Click)
    monacoEditor.languages.registerDefinitionProvider('nwscript', {
      provideDefinition: function (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position, token: monacoEditor.CancellationToken) {
        try {
          const wordObject = model.getWordAtPosition(position);
          if (!wordObject) {
            return [];
          }

          const currentTab = ForgeState.tabManager.currentTab as any;
          if (!currentTab || !currentTab.nwScriptParser) {
            return [];
          }

          const parser = currentTab.nwScriptParser;
          const word = wordObject.word;

          // Helper to calculate which file a line number belongs to
          const getFileForLine = (lineNumber: number): { resref: string | null; adjustedLine: number } => {
            if (!currentTab.resolvedIncludes || currentTab.resolvedIncludes.size === 0) {
              return { resref: null, adjustedLine: lineNumber };
            }

            // Calculate line offsets for each included file
            const includeOrder = Array.from(currentTab.resolvedIncludes.keys()) as string[];
            let currentOffset = 0;
            
            for (const resref of includeOrder) {
              const source = currentTab.resolvedIncludes.get(resref);
              if (source) {
                const lineCount = source.split('\n').length;
                if (lineNumber <= currentOffset + lineCount) {
                  return { resref: resref as string, adjustedLine: lineNumber - currentOffset };
                }
                currentOffset += lineCount;
              }
            }

            // If not in includes, it's in the main file
            return { resref: null, adjustedLine: lineNumber - currentOffset };
          };

          // Helper to open/focus a tab and scroll to a line
          const navigateToDefinition = (resref: string | null, lineNumber: number, column: number) => {
            if (resref) {
              // Definition is in an included file
              // Check if file is already open
              let targetTab: TabState | undefined = undefined;
              
              // Find tab by file resref
              for (const tab of ForgeState.tabManager.tabs) {
                if (tab.file && tab.file.resref === resref && tab.file.ext === 'nss') {
                  targetTab = tab;
                  break;
                }
              }

              if (targetTab && targetTab.constructor.name === 'TabTextEditorState') {
                const editorTab = targetTab as TabTextEditorState;
                // File is already open - focus it and scroll
                editorTab.show();
                if (editorTab.editor && editorTab.monaco) {
                  setTimeout(() => {
                    editorTab.editor.revealLineInCenter(lineNumber);
                    editorTab.editor.setPosition({ lineNumber, column });
                  }, 100);
                }
              } else {
                // File is not open - load from KEY system and open it
                const key = KotOR.KEYManager.Key.getFileKey(resref, KotOR.ResourceTypes.nss);
                if (key) {
                  // Load the file buffer from KEY system first (fire and forget)
                  KotOR.KEYManager.Key.getFileBuffer(key).then((buffer: Uint8Array) => {
                    if (buffer) {
                      // Create EditorFile with the buffer already loaded
                      const editorFile = new EditorFile({ 
                        resref, 
                        reskey: KotOR.ResourceTypes.nss,
                        buffer: buffer
                      });
                      
                      // Use FileTypeManager to open the file - this will create the tab
                      FileTypeManager.onOpenResource(editorFile);
                  
                      // Find the newly opened tab and wait for file to load, then scroll
                      const findAndScroll = () => {
                        const newTab = ForgeState.tabManager.tabs.find((tab) => 
                          tab.file && tab.file.resref === resref && tab.file.ext === 'nss'
                        ) as any;
                        
                        if (newTab) {
                          // Set up a one-time listener for when the file loads
                          const onFileLoad = () => {
                            newTab.removeEventListener('onEditorFileLoad', onFileLoad);
                            // Wait a bit for the editor to be ready, then scroll
                            setTimeout(() => {
                              if (newTab.editor && newTab.monaco) {
                                newTab.editor.revealLineInCenter(lineNumber);
                                newTab.editor.setPosition({ lineNumber, column });
                              }
                            }, 200);
                          };
                          
                          newTab.addEventListener('onEditorFileLoad', onFileLoad);
                          
                          // If file is already loaded, trigger scroll immediately
                          if (newTab.code && newTab.code.length > 0) {
                            setTimeout(() => {
                              onFileLoad();
                            }, 100);
                          }
                        } else {
                          // Tab not found yet, try again
                          setTimeout(findAndScroll, 50);
                        }
                      };
                      
                      // Start looking for the tab after a short delay
                      setTimeout(findAndScroll, 50);
                    }
                  }).catch((error: Error) => {
                    console.error('Error loading file from KEY system:', error);
                  });
                }
              }
            } else {
              // Definition is in current file - just scroll
              if (currentTab.editor && currentTab.monaco) {
                currentTab.editor.revealLineInCenter(lineNumber);
                currentTab.editor.setPosition({ lineNumber, column });
              }
            }
          };

          // Check engine constants
          const nw_constant = ForgeState.nwScriptParser.engine_constants.find((obj) => obj.name === word);
          if (nw_constant && nw_constant.source) {
            // Engine constants are in nwscript.nss - open it and navigate
            const lineNumber = nw_constant.source.first_line || 1;
            const column = nw_constant.source.first_column || 1;
            
            // Check if nwscript.nss is already open
            let nwscriptTab = ForgeState.tabManager.tabs.find((tab) => 
              tab.file && tab.file.resref === 'nwscript' && tab.file.ext === 'nss'
            ) as any;
            
            if (nwscriptTab) {
              // File is already open - focus it and scroll
              nwscriptTab.show();
              if (nwscriptTab.editor && nwscriptTab.monaco) {
                setTimeout(() => {
                  nwscriptTab.editor.revealLineInCenter(lineNumber);
                  nwscriptTab.editor.setPosition({ lineNumber, column });
                }, 100);
              }
            } else {
              // File is not open - create EditorFile with the buffer and open it
              if (ForgeState.nwscript_nss) {
                const textDecoder = new TextDecoder();
                const nwscriptSource = textDecoder.decode(ForgeState.nwscript_nss);
                const editorFile = new EditorFile({ 
                  resref: 'nwscript', 
                  reskey: KotOR.ResourceTypes.nss,
                  buffer: ForgeState.nwscript_nss
                });
                
                FileTypeManager.onOpenResource(editorFile);
                
                // Find the newly opened tab and scroll
                const findAndScroll = () => {
                  const newTab = ForgeState.tabManager.tabs.find((tab) => 
                    tab.file && tab.file.resref === 'nwscript' && tab.file.ext === 'nss'
                  ) as any;
                  
                  if (newTab) {
                    const onFileLoad = () => {
                      newTab.removeEventListener('onEditorFileLoad', onFileLoad);
                      setTimeout(() => {
                        if (newTab.editor && newTab.monaco) {
                          newTab.editor.revealLineInCenter(lineNumber);
                          newTab.editor.setPosition({ lineNumber, column });
                        }
                      }, 200);
                    };
                    
                    newTab.addEventListener('onEditorFileLoad', onFileLoad);
                    
                    if (newTab.code && newTab.code.length > 0) {
                      setTimeout(() => {
                        onFileLoad();
                      }, 100);
                    }
                  } else {
                    setTimeout(findAndScroll, 50);
                  }
                };
                
                setTimeout(findAndScroll, 50);
              }
            }
            
            // Return definition location
            return [{
              uri: model.uri,
              range: new monacoEditor.Range(
                lineNumber,
                column,
                nw_constant.source.last_line || lineNumber,
                nw_constant.source.last_column || column
              )
            }];
          }

          // Check engine actions
          const nw_action = ForgeState.nwScriptParser.engine_actions.find((obj) => obj.name === word);
          if (nw_action && nw_action.source) {
            // Engine actions are in nwscript.nss - open it and navigate
            const lineNumber = nw_action.source.first_line || 1;
            const column = nw_action.source.first_column || 1;
            
            // Check if nwscript.nss is already open
            let nwscriptTab = ForgeState.tabManager.tabs.find((tab) => 
              tab.file && tab.file.resref === 'nwscript' && tab.file.ext === 'nss'
            ) as any;
            
            if (nwscriptTab) {
              // File is already open - focus it and scroll
              nwscriptTab.show();
              if (nwscriptTab.editor && nwscriptTab.monaco) {
                setTimeout(() => {
                  nwscriptTab.editor.revealLineInCenter(lineNumber);
                  nwscriptTab.editor.setPosition({ lineNumber, column });
                }, 100);
              }
            } else {
              // File is not open - create EditorFile with the buffer and open it
              if (ForgeState.nwscript_nss) {
                const editorFile = new EditorFile({ 
                  resref: 'nwscript', 
                  reskey: KotOR.ResourceTypes.nss,
                  buffer: ForgeState.nwscript_nss
                });
                
                FileTypeManager.onOpenResource(editorFile);
                
                // Find the newly opened tab and scroll
                const findAndScroll = () => {
                  const newTab = ForgeState.tabManager.tabs.find((tab: TabState) => 
                    tab.file && tab.file.resref === 'nwscript' && tab.file.ext === 'nss'
                  ) as any;
                  
                  if (newTab) {
                    const onFileLoad = () => {
                      newTab.removeEventListener('onEditorFileLoad', onFileLoad);
                      setTimeout(() => {
                        if (newTab.editor && newTab.monaco) {
                          newTab.editor.revealLineInCenter(lineNumber);
                          newTab.editor.setPosition({ lineNumber, column });
                        }
                      }, 200);
                    };
                    
                    newTab.addEventListener('onEditorFileLoad', onFileLoad);
                    
                    if (newTab.code && newTab.code.length > 0) {
                      setTimeout(() => {
                        onFileLoad();
                      }, 100);
                    }
                  } else {
                    setTimeout(findAndScroll, 50);
                  }
                };
                
                setTimeout(findAndScroll, 50);
              }
            }
            
            // Return definition location
            return [{
              uri: model.uri,
              range: new monacoEditor.Range(
                lineNumber,
                column,
                nw_action.source.last_line || lineNumber,
                nw_action.source.last_column || column
              )
            }];
          }

          // Check local variables
          const l_variable = (parser.local_variables || []).find((obj) => obj.name === word);
          if (l_variable && l_variable.source) {
            const fileInfo = getFileForLine(l_variable.source.first_line);
            const lineNumber = fileInfo.adjustedLine;
            const column = l_variable.source.first_column || 1;

            // Navigate to definition
            navigateToDefinition(fileInfo.resref, lineNumber, column);

            if (fileInfo.resref) {
              // Return a definition that will trigger navigation
              // We'll handle the actual navigation in navigateToDefinition
              return [{
                uri: model.uri, // This will be updated when the file opens
                range: new monacoEditor.Range(lineNumber, column, lineNumber, column)
              }];
            } else {
              return [{
                uri: model.uri,
                range: new monacoEditor.Range(
                  lineNumber,
                  column,
                  l_variable.source.last_line || lineNumber,
                  l_variable.source.last_column || column
                )
              }];
            }
          }

          // Check local functions
          let l_function = (parser.local_functions || []).find((obj) => obj.name === word);
          if (!l_function && parser.program && parser.program.functions) {
            l_function = parser.program.functions.find((obj) => obj.name === word);
          }

          if (l_function && l_function.source) {
            const fileInfo = getFileForLine(l_function.source.first_line);
            const lineNumber = fileInfo.adjustedLine;
            const column = l_function.source.first_column || 1;

            // Navigate to definition
            navigateToDefinition(fileInfo.resref, lineNumber, column);

            if (fileInfo.resref) {
              return [{
                uri: model.uri,
                range: new monacoEditor.Range(lineNumber, column, lineNumber, column)
              }];
            } else {
              return [{
                uri: model.uri,
                range: new monacoEditor.Range(
                  lineNumber,
                  column,
                  l_function.source.last_line || lineNumber,
                  l_function.source.last_column || column
                )
              }];
            }
          }

          return [];
        } catch (e) {
          console.error('Error providing definition:', e);
          return [];
        }
      }
    });
  }

  static updateLocalFunctions(localFunctions: string[]) {
    if (!NWScriptLanguageService.nwScriptTokenConfig) return;
    
    // Update the local functions array
    NWScriptLanguageService.nwScriptTokenConfig.localFunctions = localFunctions;
    monacoEditor.languages.setMonarchTokensProvider('nwscript', NWScriptLanguageService.nwScriptTokenConfig);
  }
}

