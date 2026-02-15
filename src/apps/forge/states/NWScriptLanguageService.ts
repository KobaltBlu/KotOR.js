import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

import { EditorFile } from "@/apps/forge/EditorFile";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import * as KotOR from '@/apps/forge/KotOR';
import { ForgeState } from "@/apps/forge/states/ForgeState";
import type { TabState } from "@/apps/forge/states/tabs/TabState";
import type { TabTextEditorState } from "@/apps/forge/states/tabs/TabTextEditorState";
import { FunctionNode, StructNode, VariableListNode, VariableNode } from "@/nwscript/compiler/ASTTypes";
import { NWScriptASTBuilder } from "@/nwscript/compiler/NWScriptASTBuilder";
import { NWScriptASTCodeGen } from "@/nwscript/compiler/NWScriptASTCodeGen";
import { NWScriptParser } from "@/nwscript/compiler/NWScriptParser";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.NWScript);

// Format NWScript code using AST
function formatNWScript(code: string, options: monacoEditor.languages.FormattingOptions = { tabSize: 2, insertSpaces: true }): string {
  log.trace('formatNWScript entry', { codeLength: code.length, tabSize: options.tabSize, insertSpaces: options.insertSpaces });
  try {
    log.trace('formatNWScript creating parser');
    const parser = new NWScriptParser(ForgeState.nwScriptParser?.nwscript_source, code);
    log.trace('formatNWScript parseAST');
    const ast = parser.parseAST(code);

    if (!ast) {
      log.trace('formatNWScript no AST');
      log.warn('AST formatting failed, returning original');
      return code;
    }

    log.trace('formatNWScript AST obtained', { statements: ast.statements?.length ?? 0 });
    log.debug('AST formatting successful, generating code from AST');
    const codeGen = new NWScriptASTCodeGen({
      tabSize: options.tabSize || 2,
      insertSpaces: options.insertSpaces !== false,
    });
    const formatted = codeGen.generate(ast);
    log.trace('formatNWScript generate done', { formattedLength: formatted.length });
    return formatted;
  } catch (error: unknown) {
    const err = error as { name?: string; type?: string };
    log.trace('formatNWScript catch', { name: err?.name, type: err?.type });
    if (err?.name !== 'NWScriptASTBuilderError' && err?.type !== 'parse') {
      log.warn('AST formatting failed, returning original code:', error);
    }
    log.error(error as Error);
    return code;
  }
}

export class NWScriptLanguageService {
  private constructor() {}
  private readonly _staticOnly?: undefined;

  static nwScriptTokenConfig: monacoEditor.languages.IMonarchLanguage | null = null;

  static initNWScriptLanguage() {
    log.trace('initNWScriptLanguage entry');
    type ArgValue = { x?: number; y?: number; z?: number; type?: string; value?: ArgValue; datatype?: { value?: string } };
    const arg_value_parser = function( value: ArgValue | string | number | undefined ): string | number | undefined {
      log.trace('arg_value_parser', { valueType: typeof value });
      if(typeof value === 'undefined') {
        log.trace('arg_value_parser undefined -> NULL');
        return 'NULL';
      }
      if(typeof value === 'object' && value !== null){
        const v = value as ArgValue;
        if(typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number'){
          log.trace('arg_value_parser vector');
          return `[${v.x}, ${v.y}, ${v.z}]`;
        }else if(v.type === 'neg'){
          log.trace('arg_value_parser neg');
          return '-' + (arg_value_parser(v.value) ?? '');
        }else if(v?.datatype?.value === 'object'){
          if((v.value as number) === 0x7FFFFFFF) { log.trace('arg_value_parser OBJECT_INVALID'); return 'OBJECT_INVALID'; }
          if((v.value as number) === 0) { log.trace('arg_value_parser OBJECT_SELF'); return 'OBJECT_SELF'; }
          return arg_value_parser(v.value);
        }else if(v?.datatype?.value === 'int' || v?.datatype?.value === 'float' || v?.datatype?.value === 'string' || v?.datatype?.value === 'vector'){
          log.trace('arg_value_parser primitive', v.datatype?.value);
          return arg_value_parser(v.value);
        }
      }else if(typeof value === 'string'){
        log.trace('arg_value_parser string');
        return value;
      }else if(typeof value === 'number'){
        log.trace('arg_value_parser number');
        return value;
      }
      log.trace('arg_value_parser fallback undefined');
      return undefined;
    };

    log.trace('initNWScriptLanguage register language id nwscript');
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

    log.trace('initNWScriptLanguage building token config');
    const _nw_types = ForgeState.nwScriptParser.engine_types.slice(0);
    log.trace('initNWScriptLanguage engine_types count', _nw_types.length);
    for(let i = 0; i < _nw_types.length; i++){
      const nw_type = _nw_types[i];
      tokenConfig.keywords.push(nw_type.name);
      log.trace('initNWScriptLanguage keyword', nw_type.name);
    }

    const _nw_actions = ForgeState.nwScriptParser.engine_actions.slice(0);
    log.trace('initNWScriptLanguage engine_actions count', _nw_actions.length);
    for(let i = 0; i < _nw_actions.length; i++){
      const nw_action = _nw_actions[i];
      tokenConfig.engineActions.push(nw_action.name);
      log.trace('initNWScriptLanguage engineAction', nw_action.name);
    }

    const _nw_constants = ForgeState.nwScriptParser.engine_constants.slice(0);
    log.trace('initNWScriptLanguage engine_constants count', _nw_constants.length);
    for(let i = 0; i < _nw_constants.length; i++){
      const nw_constant = _nw_constants[i];
      tokenConfig.engineConstants.push(nw_constant.name);
      log.trace('initNWScriptLanguage engineConstant', nw_constant.name);
    }

    NWScriptLanguageService.nwScriptTokenConfig = tokenConfig;
    log.debug('initNWScriptLanguage token config stored', { keywords: tokenConfig.keywords.length, engineActions: tokenConfig.engineActions.length, engineConstants: tokenConfig.engineConstants.length });

    log.trace('initNWScriptLanguage setMonarchTokensProvider');
    monacoEditor.languages.setMonarchTokensProvider( 'nwscript', tokenConfig);

    log.trace('initNWScriptLanguage setLanguageConfiguration');
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

    log.trace('initNWScriptLanguage defineTheme nwscript-dark');
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

    log.trace('initNWScriptLanguage building nw_suggestions');
    const nw_suggestions: monacoEditor.languages.CompletionItem[] = [];
    const keywords = ['void', 'int', 'float', 'string', 'object', 'vector', 'struct', 'action'];
    log.trace('initNWScriptLanguage keywords snippet count', keywords.length);

    for(let i = 0; i < keywords.length; i++){
      log.trace('initNWScriptLanguage push keyword suggestion', keywords[i]);
      nw_suggestions.push({
        label: keywords[i],
        kind: monacoEditor.languages.CompletionItemKind.Keyword,
        insertText: keywords[i],
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: undefined
      });
    }

    const nw_types = ForgeState.nwScriptParser.engine_types.slice(0);
    log.trace('initNWScriptLanguage type suggestions count', nw_types.length);
    for(let i = 0; i < nw_types.length; i++){
      const nw_type = nw_types[i];
      log.trace('initNWScriptLanguage type suggestion', nw_type.name);
      nw_suggestions.push({
        label: nw_type.name,
        kind: monacoEditor.languages.CompletionItemKind.Keyword,
        insertText: `${nw_type.name}`,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Type #${nw_type.index+1}:\n\n${nw_type.name}`,
        range: undefined
      });
    }

    const nw_constants = ForgeState.nwScriptParser.engine_constants.slice(0);
    log.trace('initNWScriptLanguage constant suggestions count', nw_constants.length);
    for(let i = 0; i < nw_constants.length; i++){
      const nw_constant = nw_constants[i];
      log.trace('initNWScriptLanguage constant suggestion', nw_constant.name);
      nw_suggestions.push({
        label: nw_constant.name,
        kind: monacoEditor.languages.CompletionItemKind.Constant,
        insertText: `${nw_constant.name}`,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Constant #${nw_constant.index+1}:\n\n${nw_constant.datatype.value} ${nw_constant.name} = ${arg_value_parser(nw_constant.value)};`,
        range: undefined
      });
    }

    //Engine Routines
    // const nw_actions = Object.entries(
    //   KotOR.ApplicationProfile.GameKey == KotOR.GameEngineType.KOTOR ? 
    //   KotOR.NWScriptDefK1.Actions : 
    //   KotOR.NWScriptDefK2.Actions
    // );
    const nw_actions = ForgeState.nwScriptParser.engine_actions.slice(0);
    log.trace('initNWScriptLanguage engine action suggestions count', nw_actions.length);
    nw_actions.forEach( (action) =>{
      log.trace('initNWScriptLanguage action suggestion', action.name);
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
        range: undefined
      });
    });

    log.info('initNWScriptLanguage registering completion item provider');
    monacoEditor.languages.registerCompletionItemProvider('nwscript', {
      provideCompletionItems: () => {
        log.trace('provideCompletionItems entry');
        try{
          log.trace('provideCompletionItems building local_suggestions');
          const local_suggestions: monacoEditor.languages.CompletionItem[] = [
            {
              label: 'void main()',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['void main () {', '\t$0', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'void main() Statement',
              range: undefined
            },
            {
              label: 'int StartingConditional()',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['int StartingConditional () {', '\t$0', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'int StartingConditional() Statement',
              range: undefined
            },
            {
              label: 'if',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: 'if (${1:condition}) {\n\t$0\n}',
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'if statement',
              filterText: 'if',
              sortText: '0if',
              range: undefined
            },
            {
              label: 'ifelse',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['if (${1:condition}) {', '\t$0', '} else {', '\t', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If-Else Statement',
              range: undefined
            },
            {
              label: 'for',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: 'for (${1:int i = 0}; ${2:i < ${3:10}}; ${4:i++}) {\n\t$0\n}',
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'for loop',
              filterText: 'for',
              sortText: '0for',
              range: undefined
            },
            {
              label: 'while',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: 'while (${1:condition}) {\n\t$0\n}',
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'while loop',
              filterText: 'while',
              sortText: '0while',
              range: undefined
            },
            {
              label: 'switch',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['switch (${1:expression}) {', '\tcase ${2:value}:', '\t\t$0', '\t\tbreak;', '\tdefault:', '\t\tbreak;', '}'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'switch statement',
              filterText: 'switch',
              sortText: '0switch',
              range: undefined
            },
            {
              label: 'struct',
              kind: monacoEditor.languages.CompletionItemKind.Snippet,
              insertText: ['struct ${1:StructName} {', '\t${2:int} ${3:member};', '\t$0', '};'].join('\n'),
              insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'struct declaration',
              filterText: 'struct',
              sortText: '0struct',
              range: undefined
            }
          ];

          const parser = (ForgeState.tabManager.currentTab as TabTextEditorState | null)?.nwScriptParser;
          log.trace('provideCompletionItems parser', !!parser);
          if(parser){
            try {
              const l_variables = parser.local_variables || (parser.program?.scope?.variables || []);
              log.trace('provideCompletionItems local_variables count', Array.isArray(l_variables) ? l_variables.length : 0);
              if (Array.isArray(l_variables)) {
                for(let i = 0; i < l_variables.length; i++){
                  const l_variable = l_variables[i];
                  if (!l_variable || !l_variable.name) {
                    log.trace('provideCompletionItems skip variable', i);
                    continue;
                  }
                  log.trace('provideCompletionItems local variable', l_variable.name);
                  const kind = l_variable.is_const ? monacoEditor.languages.CompletionItemKind.Constant : monacoEditor.languages.CompletionItemKind.Variable;
                  local_suggestions.push({
                    label: l_variable.name,
                    kind: kind,
                    insertText: `${l_variable.name}`,
                    insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: `Variable:\n\n${l_variable.datatype?.value || 'unknown'} ${l_variable.name};`,
                    range: undefined
                  });
                }
              }
            } catch (e) {
              log.warn('Error accessing parser variables:', e);
            }
          }
          const total = local_suggestions.length + nw_suggestions.length;
          log.trace('provideCompletionItems total suggestions', total);
          log.debug('Autocomplete', { local: local_suggestions.length, nw: nw_suggestions.length });
          return {
            incomplete: true,
            suggestions: [...local_suggestions, ...nw_suggestions] as monacoEditor.languages.CompletionItem[],
          };
        }catch(e){
          log.trace('provideCompletionItems catch');
          log.error('Autocomplete error:', e as Error);
          // Always return at least the engine suggestions even on error
          return { 
            incomplete: true, 
            suggestions: nw_suggestions 
          };
        }
      }
    });

    log.info('initNWScriptLanguage registering document formatter');
    monacoEditor.languages.registerDocumentFormattingEditProvider('nwscript', {
      provideDocumentFormattingEdits: (model: monacoEditor.editor.ITextModel, options: monacoEditor.languages.FormattingOptions, token: monacoEditor.CancellationToken) => {
        log.trace('provideDocumentFormattingEdits entry', { uri: model.uri.toString() });
        const text = model.getValue();
        log.trace('provideDocumentFormattingEdits text length', text.length);

        const modelOptions = model.getOptions();
        const tabSize = modelOptions.tabSize || 2;
        const insertSpaces = modelOptions.insertSpaces !== false;
        log.trace('provideDocumentFormattingEdits options', { tabSize, insertSpaces });
        const formatOptions = {
          tabSize: tabSize,
          insertSpaces: insertSpaces
        };

        const formatted = formatNWScript(text, formatOptions);
        log.trace('provideDocumentFormattingEdits formatted length', formatted.length);

        if (formatted !== text) {
          log.debug('provideDocumentFormattingEdits returning edit');
          return [{
            range: model.getFullModelRange(),
            text: formatted
          }];
        }
        log.trace('provideDocumentFormattingEdits no change');
        return [];
      }
    });

    log.info('initNWScriptLanguage registering hover provider');
    monacoEditor.languages.registerHoverProvider('nwscript', {
      provideHover: function (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position, token: monacoEditor.CancellationToken) {
        log.trace('provideHover entry', { line: position.lineNumber, column: position.column });
        const wordObject = model.getWordAtPosition(position);
        if(wordObject){
          log.trace('provideHover word', wordObject.word);

          const nw_constant = ForgeState.nwScriptParser.engine_constants.find( (obj) => obj.name == wordObject.word );
          if(nw_constant){
            log.trace('provideHover match engine constant', nw_constant.name);
            return {
              contents: [
                { value: `**nwscript.nss**` },
                { value: `\`\`\`nwscript\n${nw_constant.datatype.value} ${nw_constant.name} = ${arg_value_parser(nw_constant.value)}\n \n\`\`\`` }
              ]
            };
          }

          const action = nw_actions.find( (obj: { name: string }) => obj.name == wordObject.word );
          if(action){
            log.trace('provideHover match engine action', action.name);
            let args = '';
            const function_definition = ForgeState.nwScriptParser.engine_actions.find((a) =>
              a.name === wordObject.word || a.name === action.name
            );
            if(!function_definition) {
              log.trace('provideHover action no function_definition, using fallback');
              let args_fallback = '';
              for(let i = 0; i < action.arguments.length; i++){
                const arg = action.arguments[i];
                if(i > 0) args_fallback += ', ';
                args_fallback += arg.name;
              }
              let hoverContent = `\`\`\`nwscript\n${action.name}(${args_fallback})\n\`\`\``;
              if (action.comment && action.comment.trim()) {
                hoverContent += `\n\n**Documentation:**\n\`\`\`\n${action.comment.trim()}\n\`\`\``;
              }
              return {
                contents: [
                  { value: `**nwscript.nss**` },
                  { value: hoverContent }
                ]
              };
            }
            for(let i = 0; i < action.arguments.length; i++){
              const arg = action.arguments[i];
              const def_arg = function_definition.arguments[i];
              if(i > 0) args += ', ';
              if(def_arg){
                if(def_arg.value){
                  const value = arg_value_parser(def_arg.value);
                  args += `${arg.name} ${def_arg.name} = ${value}`;
                }else{
                  args += `${arg.name} ${def_arg.name}`;
                }
              }else{
                log.warn('invalid argument', i, function_definition);
              }
            }
            let hoverContent = `\`\`\`nwscript\n${function_definition.returntype.value} ${action.name}(${args})\n\`\`\``;
            if (function_definition.comment && function_definition.comment.trim()) {
              hoverContent += `\n\n**Documentation:**\n\`\`\`\n${function_definition.comment.trim()}\n\`\`\``;
            } else if (action.comment && action.comment.trim()) {
              hoverContent += `\n\n**Documentation:**\n\`\`\`\n${action.comment.trim()}\n\`\`\``;
            }
            
            return {
              contents: [
                { value: `**nwscript.nss**` },
                { value: hoverContent }
              ]
            };
          }

          const parser = (ForgeState.tabManager.currentTab as TabTextEditorState | null)?.nwScriptParser;
          log.trace('provideHover parser', !!parser);
          if(parser){

            const structPropertyMatches = model.getValue().matchAll(
              new RegExp("(?:[A-Za-z_]|[A-Za-z_][A-Za-z0-9_]+)\\b[\\s|\\t+]?\\.[\\s|\\t+]?"+wordObject.word+"\\b", 'g')
            );
            const structProperty = structPropertyMatches?.next()?.value;
            if(structProperty){
              log.trace('provideHover structProperty match', structProperty);
              const parts = structProperty["0"].split('.');
              const structName = parts[0];
              const structPropertyName = parts[1];
              log.trace('provideHover struct parts', { structName, structPropertyName });
              if(structName){
                const l_struct = (parser.local_variables || []).find( (obj: { name: string }) => obj.name == structName );
                log.trace('provideHover l_struct', l_struct?.name, l_struct?.datatype?.value);
                if(l_struct?.datatype?.value == 'struct'){
                  const struct_ref = (l_struct.type == 'variable') ? l_struct.struct_reference : l_struct ;
                  for(let i = 0; i < struct_ref.properties.length; i++){
                    const prop = struct_ref.properties[i];
                    if(prop && prop.name == wordObject.word){
                      log.trace('provideHover match struct property', prop.name);
                      return {
                        contents: [
                          { value: '**SOURCE**' },
                          { value: `\`\`\`nwscript\n${prop.datatype.value} ${prop.name} \n\`\`\`` }
                        ]
                      };
                    }
                  }
                }
              }
            }

            const l_variable = (parser.local_variables || []).find( (obj: { name: string }) => obj.name == wordObject.word );
            if(l_variable){
              log.trace('provideHover match local variable', l_variable.name);
              return {
                contents: [
                  { value: `**nwscript.nss**` },
                  { value: `\`\`\`nwscript\n${l_variable.datatype.value} ${l_variable.name} \n\`\`\`` }
                ]
              };
            }

            //Local Function - check both local_functions (if exists) and program.functions
            let l_function = (parser.local_functions || []).find( (obj: { name: string }) => obj.name == wordObject.word );
            if(!l_function && parser.program && parser.program.functions) {
              l_function = parser.program.functions.find( (obj: { name: string }) => obj.name == wordObject.word );
            }
            
            if(l_function){
              log.trace('provideHover match local function', l_function.name);
              let functionComment = '';
              if (l_function.source && l_function.source.first_line > 1) {
                const scriptText = model.getValue();
                const lines = scriptText.split('\n');
                const funcLine = l_function.source.first_line - 1; // Convert to 0-based index
                
                // Look backwards for comment blocks (similar to engine actions)
                const commentLines: string[] = [];
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
                  log.warn('invalid argument', i, l_function);
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
        log.trace('provideHover no match');
        return {
          range: new monacoEditor.Range(
            1,
            1,
            model.getLineCount(),
            model.getLineMaxColumn(model.getLineCount())
          ),
        };
      }
    });

    log.info('initNWScriptLanguage registering document symbol provider');
    monacoEditor.languages.registerDocumentSymbolProvider('nwscript', {
      provideDocumentSymbols: function (model: monacoEditor.editor.ITextModel, token: monacoEditor.CancellationToken) {
        log.trace('provideDocumentSymbols entry', { uri: model.uri.toString() });
        const symbols: monacoEditor.languages.DocumentSymbol[] = [];
        try {
          const text = model.getValue();
          log.trace('provideDocumentSymbols text length', text.length);

          const currentTab = ForgeState.tabManager.currentTab as TabTextEditorState | null;
          let parser = currentTab?.nwScriptParser;
          log.trace('provideDocumentSymbols parser from tab', !!parser);

          if (!parser) {
            log.trace('provideDocumentSymbols creating temp parser');
            parser = new NWScriptParser(ForgeState.nwScriptParser?.nwscript_source, text);
          } else {
            log.trace('provideDocumentSymbols parseScript');
            parser.parseScript(text);
          }

          if (!parser.ast || !parser.ast.statements) {
            log.trace('provideDocumentSymbols no ast or statements');
            return [];
          }
          log.trace('provideDocumentSymbols statements count', parser.ast.statements.length);

          for (const statement of parser.ast.statements) {
            log.trace('provideDocumentSymbols statement', statement.type);
            if (statement.type === 'function') {
              const func = statement as FunctionNode;
              log.trace('provideDocumentSymbols function', func.name);
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
              log.trace('provideDocumentSymbols struct', struct.name);
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
                  tags: [] as number[]
                })) || [],
                tags: [] as number[]
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
                  tags: [] as number[]
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

          log.debug('provideDocumentSymbols returning symbols', symbols.length);
          return symbols;
        } catch (e) {
          log.error('Error providing document symbols:', e as Error);
          return [];
        }
      }
    });

    log.info('initNWScriptLanguage registering definition provider');
    monacoEditor.languages.registerDefinitionProvider('nwscript', {
      provideDefinition: function (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position, token: monacoEditor.CancellationToken) {
        log.trace('provideDefinition entry', { line: position.lineNumber, column: position.column });
        try {
          const wordObject = model.getWordAtPosition(position);
          if (!wordObject) {
            log.trace('provideDefinition no word at position');
            return [];
          }
          log.trace('provideDefinition word', wordObject.word);

          const currentTab = ForgeState.tabManager.currentTab as TabTextEditorState | null;
          if (!currentTab || !currentTab.nwScriptParser) {
            log.trace('provideDefinition no currentTab or parser');
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
                if (tab.file && tab.file.resref === resref && tab.file.ext === KotOR.ResourceTypes.nss) {
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
                          tab.file && tab.file.resref === resref && tab.file.ext === KotOR.ResourceTypes.nss
                        ) as TabTextEditorState | undefined;
                        
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
                    log.error('Error loading file from KEY system:', error as Error);
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

          const nw_constant = ForgeState.nwScriptParser.engine_constants.find((obj) => obj.name === word);
          if (nw_constant && nw_constant.source) {
            log.trace('provideDefinition match engine constant', word);
            const lineNumber = nw_constant.source.first_line || 1;
            const column = nw_constant.source.first_column || 1;
            
            // Check if nwscript.nss is already open
            const nwscriptTab = ForgeState.tabManager.tabs.find((tab) => 
              tab.file && tab.file.resref === 'nwscript' && tab.file.ext === KotOR.ResourceTypes.nss
            ) as TabTextEditorState | undefined;
            
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
                    tab.file && tab.file.resref === 'nwscript' && tab.file.ext === KotOR.ResourceTypes.nss
                  ) as TabTextEditorState | undefined;
                  
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

          const nw_action = ForgeState.nwScriptParser.engine_actions.find((obj) => obj.name === word);
          if (nw_action && nw_action.source) {
            log.trace('provideDefinition match engine action', word);
            const lineNumber = nw_action.source.first_line || 1;
            const column = nw_action.source.first_column || 1;
            
            // Check if nwscript.nss is already open
            const nwscriptTab = ForgeState.tabManager.tabs.find((tab) => 
              tab.file && tab.file.resref === 'nwscript' && tab.file.ext === KotOR.ResourceTypes.nss
            ) as TabTextEditorState | undefined;
            
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
                    tab.file && tab.file.resref === 'nwscript' && tab.file.ext === KotOR.ResourceTypes.nss
                  ) as TabTextEditorState | undefined;
                  
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

          const l_variable = (parser.local_variables || []).find((obj: { name: string }) => obj.name === word);
          if (l_variable && l_variable.source) {
            log.trace('provideDefinition match local variable', word);
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

          let l_function = (parser.local_functions || []).find((obj: { name: string }) => obj.name === word);
          if (!l_function && parser.program && parser.program.functions) {
            l_function = parser.program.functions.find((obj: { name: string }) => obj.name === word);
          }
          log.trace('provideDefinition l_function', l_function?.name);

          if (l_function && l_function.source) {
            log.trace('provideDefinition match local function', word);
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

          log.trace('provideDefinition no match');
          return [];
        } catch (e) {
          log.error('Error providing definition:', e as Error);
          return [];
        }
      }
    });
    log.info('initNWScriptLanguage complete');
  }

  static updateLocalFunctions(localFunctions: string[]) {
    log.trace('updateLocalFunctions entry', { count: localFunctions?.length ?? 0 });
    if (!NWScriptLanguageService.nwScriptTokenConfig) {
      log.trace('updateLocalFunctions no token config, skip');
      return;
    }
    NWScriptLanguageService.nwScriptTokenConfig.localFunctions = localFunctions;
    log.debug('updateLocalFunctions set MonarchTokensProvider', localFunctions.length);
    monacoEditor.languages.setMonarchTokensProvider('nwscript', NWScriptLanguageService.nwScriptTokenConfig);
  }
}

