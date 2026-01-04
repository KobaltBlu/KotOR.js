import { EditorFile } from "../EditorFile";
import { Project } from "../Project";
import { EditorTabManager } from "../managers/EditorTabManager";
import { TabProjectExplorerState } from "./tabs/TabProjectExplorerState";
import { TabQuickStartState } from "./tabs/TabQuickStartState";
import { TabResourceExplorerState } from "./tabs/TabResourceExplorerState";
import { ProjectFileSystem } from "../ProjectFileSystem";
import { ForgeFileSystem, ForgeFileSystemResponse } from "../ForgeFileSystem";
import { pathParse } from "../helpers/PathParse";
import { FileTypeManager } from "../FileTypeManager";
import { EditorFileProtocol } from "../enum/EditorFileProtocol";
import { TabStoreState } from "../interfaces/TabStoreState";
import { NWScriptParser } from "../../../nwscript/compiler/NWScriptParser";
import { ModalManagerState } from "./modal/ModalManagerState";
import { MenuTopState } from "./MenuTopState";

import * as KotOR from '../KotOR';

declare const monaco: any;

export class ForgeState {
  // static MenuTop: MenuTop = new MenuTop()
  static project: Project
  static nwScriptTokenConfig: any = null;;
  // static loader: LoadingScreen = new KotOR.LoadingScreen();
  static modalManager: ModalManagerState = new ModalManagerState();
  static tabManager: EditorTabManager = new EditorTabManager();
  static explorerTabManager: EditorTabManager = new EditorTabManager();
  static projectExplorerTab: TabProjectExplorerState = new TabProjectExplorerState();
  static resourceExplorerTab: TabResourceExplorerState = new TabResourceExplorerState();

  static recentFiles: EditorFile[] = [];
  static recentProjects: string[] = [];

  static #eventListeners: any = {};

  static nwscript_nss: Uint8Array;
  static nwScriptParser: NWScriptParser;

  static addEventListener<T>(type: T, cb: Function): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      let ev = this.#eventListeners[type];
      let index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        console.warn('Event Listener: Already added', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static removeEventListener<T>(type: T, cb: Function): void {
    if(Array.isArray(this.#eventListeners[type])){
      let ev = this.#eventListeners[type];
      let index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static processEventListener<T>(type: T, args: any[] = []): void {
    if(Array.isArray(this.#eventListeners[type])){
      let ev = this.#eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static triggerEventListener<T>(type: T, args: any[] = []): void {
    this.processEventListener(type, args);
  }

  /**
   * Initializes the loading screen
   */
  static loaderInit(backgroundURL: string, logoURL: string): void {
    ForgeState.processEventListener('on-loader-init', [backgroundURL, logoURL]);
  }

  /**
   * Shows the loading screen
   */
  static loaderShow(): void {
    ForgeState.processEventListener('on-loader-show', []);
  }

  /**
   * Hides the loading screen
   */
  static loaderHide(): void {
    ForgeState.processEventListener('on-loader-hide', []);
  }

  /**
   * Sets the loading screen message
   */
  static loaderMessage(message: string): void {
    ForgeState.processEventListener('on-loader-message', [message]);
  }

  static async InitializeApp(): Promise<void>{
    return new Promise( (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        KotOR.ApplicationProfile.directory = KotOR.ApplicationProfile.profile.directory;
      }else{
        KotOR.ApplicationProfile.directoryHandle = KotOR.ApplicationProfile.profile.directory_handle;
      }
      console.log('loading game...')
      ForgeState.loaderInit(KotOR.ApplicationProfile.profile.background, KotOR.ApplicationProfile.profile.logo);
      ForgeState.loaderShow();
      KotOR.GameState.GameKey = KotOR.ApplicationProfile.GameKey;
      KotOR.GameInitializer.AddEventListener('on-loader-message', (message: string) => {
        ForgeState.loaderMessage(message);
      });
      KotOR.GameInitializer.Init(KotOR.ApplicationProfile.GameKey).then( async () => {
        await this.initNWScriptParser();
        KotOR.OdysseyWalkMesh.Init();
        KotOR.AudioEngine.GetAudioEngine();
        KotOR.AudioEngine.GAIN_SFX = 0.75;
        KotOR.AudioEngine.GAIN_VO = 0.75;
        KotOR.AudioEngine.GAIN_MUSIC = 0.75;
        KotOR.AudioEngine.GAIN_MOVIE = 0.75;
        KotOR.AudioEngine.GAIN_GUI = 0.75;
        MenuTopState.buildAudioMenuItems();
        //ConfigClient.get('Game.debug.light_helpers') ? true : false
        // KotOR.LightManager.toggleLightHelpers();
        // KotOR.AudioEngine.GetAudioEngine() = new KotOR.AudioEngine();

        ForgeState.recentFiles = ForgeState.getRecentFiles();
        this.processEventListener('onRecentProjectsUpdated', []);

        ForgeState.recentProjects = ForgeState.getRecentProjects();
        this.processEventListener('onRecentFilesUpdated', []);
        
        const tabStates: TabStoreState[] = KotOR.ConfigClient.get('open_tabs', []);
        if(tabStates.length){
          for(let i = 0; i < tabStates.length; i++){
            const tabState = tabStates[i];
            this.tabManager.restoreTabState(tabState);
          }
        }else{
          ForgeState.tabManager.addTab(new TabQuickStartState());
        }

        ForgeState.tabManager.addEventListener('onTabAdded', () => {
          ForgeState.saveOpenTabsState();
        });

        ForgeState.tabManager.addEventListener('onTabRemoved', () => {
          ForgeState.saveOpenTabsState();
        });

        ForgeState.explorerTabManager.addTab(ForgeState.resourceExplorerTab);
        ForgeState.explorerTabManager.addTab(ForgeState.projectExplorerTab);
        ForgeState.resourceExplorerTab.show();

        TabResourceExplorerState.GenerateResourceList( ForgeState.resourceExplorerTab ).then( (resourceList) => {
          ForgeState.loaderHide();
          // ScriptEditorTab.InitNWScriptLanguage();
          resolve();
        });
      });
    });
  }

  static async VerifyGameDirectory(onVerified: Function, onError: Function){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      // let validated = await KotOR.GameFileSystem.validateDirectory(KotOR.ApplicationProfile.rootDirectory);
      if(await KotOR.GameFileSystem.exists('chitin.key')){
        onVerified();
      }else{
        try{
          let dir = await (window as any).dialog.locateDirectoryDialog();
          if(dir){
            KotOR.ApplicationProfile.profile.directory = dir;
            onVerified();
          }else{
            console.error('no directory');
          }

        }catch(e: any){
          console.error(e);
        }
      }
    }else{
      if(KotOR.ApplicationProfile.directoryHandle){
        let validated = await KotOR.GameFileSystem.validateDirectoryHandle(KotOR.ApplicationProfile.directoryHandle);
        if(validated){
          onVerified();
        }else{
          onError();
        }
      }else{
        onError();
      }
    }
  }

  static InitManagers(){
    // ForgeState.tabManager = new EditorTabManager();
    // ForgeState.explorerTabManager = new EditorTabManager();
    // ForgeState.projectExplorerTab = new ProjectExplorerTab();
    // ForgeState.resourceExplorerTab = new ResourceExplorerTab();
  }

  static initNWScriptParser(){
    return new Promise<void>( (resolve, reject) => {
      KotOR.ResourceLoader.loadResource( KotOR.ResourceTypes.nss, 'nwscript').then(
        (nss: Uint8Array) => {
          this.nwscript_nss = nss;
          const textDecoder = new TextDecoder();
          this.nwScriptParser = new NWScriptParser(textDecoder.decode(this.nwscript_nss));
          this.initNWScriptLanguage();
          resolve();
        }
      ).catch( (e) => {console.error(e)});
    });
  }

  

  static initNWScriptLanguage(){
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
    monaco.languages.register({ id: 'nwscript' });

    const tokenConfig: any = {
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
          // identifiers and keywords
          [/\@?[a-zA-Z0-9_]\w*/, {
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

          // whitespace
          { include: '@whitespace' },

          // numbers
          [/[0-9_]*\.[0-9_]+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
          [/0[xX][0-9a-fA-F_]+/, 'number.hex'],
          [/0[bB][01_]+/, 'number.hex'], // binary: use same theme style as hex
          [/[0-9_]+/, 'number'],

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
    const _nw_types = this.nwScriptParser.engine_types.slice(0);
    for(let i = 0; i < _nw_types.length; i++){
      const nw_type = _nw_types[i];
      tokenConfig.keywords.push(nw_type.name);
    }

    //Engine Actions
    const _nw_actions = this.nwScriptParser.engine_actions.slice(0);
    for(let i = 0; i < _nw_actions.length; i++){
      const nw_action = _nw_actions[i];
      tokenConfig.engineActions.push(nw_action.name);
    }

    //Engine Constants
    const _nw_constants = this.nwScriptParser.engine_constants.slice(0);
    for(let i = 0; i < _nw_constants.length; i++){
      const nw_constant = _nw_constants[i];
      tokenConfig.engineConstants.push(nw_constant.name);
    }

    // Store token config for dynamic updates
    ForgeState.nwScriptTokenConfig = tokenConfig;

    monaco.languages.setMonarchTokensProvider( 'nwscript', tokenConfig);

    monaco.languages.setLanguageConfiguration('nwscript', {
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
        { open: '"', close: '"', notIn: ['string'] }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });

    // Define a new theme that contains only rules that match this language
    monaco.editor.defineTheme('nwscript-dark', {
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
        // { token: 'lineComment', foreground: '60cf30' },
        // { token: 'blockComment', foreground: '60cf30' },
        // { token: 'HEXADECIMAL', foreground: 'CD5AC5' },
        // { token: 'INTEGER', foreground: 'A6E22E' },
        // { token: 'FLOAT', foreground: '90E7F7' },
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

    const nw_suggestions: any[] = [];
    const keywords = ['void', 'int', 'float', 'string', 'object', 'vector', 'struct', 'action'];

    for(let i = 0; i < keywords.length; i++){
      nw_suggestions.push({
        label: keywords[i],
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keywords[i],
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    //Engine Types
    const nw_types = this.nwScriptParser.engine_types.slice(0);
    for(let i = 0; i < nw_types.length; i++){
      const nw_type = nw_types[i];
      nw_suggestions.push({
        label: nw_type.name,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: `${nw_type.name}`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Type #${nw_type.index+1}:\n\n${nw_type.name}`
      });
    }

    //Engine Constants
    const nw_constants = this.nwScriptParser.engine_constants.slice(0);
    for(let i = 0; i < nw_constants.length; i++){
      const nw_constant = nw_constants[i];
      nw_suggestions.push({
        label: nw_constant.name,
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: `${nw_constant.name}`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Constant #${nw_constant.index+1}:\n\n${nw_constant.datatype.value} ${nw_constant.name} = ${arg_value_parser(nw_constant.value)};`
      });
    }

    //Engine Routines
    const nw_actions = Object.entries(
      KotOR.ApplicationProfile.GameKey == KotOR.GameEngineType.KOTOR ? 
      KotOR.NWScriptDefK1.Actions : 
      KotOR.NWScriptDefK2.Actions
    );
    nw_actions.forEach( (entry: any) =>{
      const action = entry[1];
      const args: any[] = [];
      const args2: any[] = [];
      // Look up by function name, not by the key (entry[0] might be a numeric index)
      const action_definition = this.nwScriptParser.engine_actions.find((a: any) => a.name === action.name);
      if(!action_definition) {
        // Silently skip if not found - some actions might not be in nwscript.nss
        return;
      }
      for(let i = 0; i < action.args.length; i++){
        const arg = action.args[i];
        const def_arg = action_definition.arguments[i];
        if(def_arg){
          // if(i > 0) args += ', ';
          if(def_arg.value){
            const value = arg_value_parser(def_arg.value);
            args.push(`\${${(i+1)}:${arg} ${def_arg.name} = ${value}}`);
            args2.push(`${arg} ${def_arg.name} = ${value}`);
          }else{
            args.push(`\${${(i+1)}:${arg} ${def_arg.name}}`);
            args2.push(`${arg} ${def_arg.name}`);
          }
        }else{
          console.warn('invalid argument', i, action_definition)
        }
      }
      
      nw_suggestions.push({
        label: action.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `${action.name}(${args.join(', ')})`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Engine Routine #${action_definition.index}:\n\n${action_definition.returntype.value} ${action.name}(${args2.join(', ')})\n\n`+action.comment
      });
    });

    // Register a completion item provider for the new language
    monaco.languages.registerCompletionItemProvider('nwscript', {
      provideCompletionItems: () => {
        // console.log('auto complete');
        try{
          const local_suggestions: any[] = [
            {
              label: 'void main()',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: ['void main () {', '\t$0', '}'].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'void main() Statement'
            },
            {
              label: 'int StartingConditional()',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: ['int StartingConditional () {', '\t$0', '}'].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'int StartingConditional() Statement'
            },
            {
              label: 'ifelse',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: ['if (${1:condition}) {', '\t$0', '} else {', '\t', '}'].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If-Else Statement'
            }
          ];

          const parser = (ForgeState.tabManager.currentTab as any).nwScriptParser;
          if(parser){
            //Local Variables
            const l_variables = parser.local_variables;
            for(let i = 0; i < l_variables.length; i++){
              const l_variable = l_variables[i];
              // console.log(l_variable);
              const kind = l_variable.is_const ? monaco.languages.CompletionItemKind.Constant : monaco.languages.CompletionItemKind.Variable;
              local_suggestions.push({
                label: l_variable.name,
                kind: kind,
                insertText: `${l_variable.name}`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: `Variable:\n\n${l_variable.datatype.value} ${l_variable.name};`
              });
            }
          }
          console.log('Autocomplete', ([] as any[]).concat(local_suggestions, nw_suggestions))
          return { 
            incomplete: true, 
            suggestions: ([] as any[]).concat(local_suggestions, nw_suggestions) 
          };
        }catch(e){
          console.error(e);
        }
      }
    });

    monaco.languages.registerHoverProvider('nwscript', {
      provideHover: function (model: any, position: any) {
        const wordObject = model.getWordAtPosition(position);
        if(wordObject){
          
          //Engine Constants
          const nw_constant = ForgeState.nwScriptParser.engine_constants.find( (obj: any) => obj.name == wordObject.word );
          if(nw_constant){
            return {
              contents: [
                { value: `**nwscript.nss**` },
                { value: `\`\`\`nwscript\n${nw_constant.datatype.value} ${nw_constant.name} = ${arg_value_parser(nw_constant.value)}\n \n\`\`\`` }
              ]
            };
          }

          const action: any = nw_actions.find( (obj: any) => obj[1].name == wordObject.word );
          if(action){
            // console.log(action);
            let args = '';
            // Match by function name - try wordObject.word first, then action[1].name, then action[0] as fallback
            const function_definition = ForgeState.nwScriptParser.engine_actions.find((a: any) => 
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
                const l_struct = (parser.local_variables || []).find( (obj: any) => obj.name == structName );
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
            const l_variable = (parser.local_variables || []).find( (obj: any) => obj.name == wordObject.word );
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
            let l_function = (parser.local_functions || []).find( (obj: any) => obj.name == wordObject.word );
            if(!l_function && parser.program && parser.program.functions) {
              l_function = parser.program.functions.find( (obj: any) => obj.name == wordObject.word );
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
              let args: any[] = [];
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
          range: new monaco.Range(
            1,
            1,
            model.getLineCount(),
            model.getLineMaxColumn(model.getLineCount())
          ),
        };
      }
    } as any);

    // Register document symbol provider for outline/navigation (Ctrl+Shift+O / Cmd+Shift+O)
    monaco.languages.registerDocumentSymbolProvider('nwscript', {
      provideDocumentSymbols: function (model: any) {
        try {
          const symbols: any[] = [];
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
            return { symbols: [] };
          }

          // Extract symbols from AST
          for (const statement of parser.ast.statements) {
            if (statement.type === 'function') {
              const func = statement as any;
              const args = func.arguments.map((arg: any) => `${arg.datatype.value} ${arg.name}`).join(', ');
              const detail = `${func.returntype.value} ${func.name}(${args})`;
              
              symbols.push({
                name: func.name,
                detail: detail,
                kind: monaco.languages.SymbolKind.Function,
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
                children: [] // Could extract local variables here if needed
              });
            } else if (statement.type === 'struct') {
              const struct = statement as any;
              symbols.push({
                name: struct.name,
                detail: `struct ${struct.name}`,
                kind: monaco.languages.SymbolKind.Struct,
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
                children: struct.properties?.map((prop: any) => ({
                  name: prop.name,
                  detail: prop.datatype ? `${prop.datatype.value} ${prop.name}` : prop.name,
                  kind: monaco.languages.SymbolKind.Property,
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
                })) || []
              });
            } else if (statement.type === 'variable' || statement.type === 'variableList') {
              const variable = statement as any;
              const names = statement.type === 'variableList' ? variable.names : [{ name: variable.name, source: variable.source }];
              
              for (const nameInfo of names) {
                symbols.push({
                  name: nameInfo.name,
                  detail: `${variable.datatype.value} ${nameInfo.name}${variable.is_const ? ' (const)' : ''}`,
                  kind: variable.is_const ? monaco.languages.SymbolKind.Constant : monaco.languages.SymbolKind.Variable,
                  range: {
                    startLineNumber: nameInfo.source?.first_line || variable.source?.first_line || 1,
                    startColumn: nameInfo.source?.first_column || variable.source?.first_column || 1,
                    endLineNumber: nameInfo.source?.last_line || variable.source?.last_line || 1,
                    endColumn: nameInfo.source?.last_column || variable.source?.last_column || 1,
                  },
                  selectionRange: {
                    startLineNumber: nameInfo.source?.first_line || variable.source?.first_line || 1,
                    startColumn: nameInfo.source?.first_column || variable.source?.first_column || 1,
                    endLineNumber: nameInfo.source?.last_line || variable.source?.last_line || 1,
                    endColumn: nameInfo.source?.last_column || variable.source?.last_column || 1,
                  },
                });
              }
            }
          }

          return { symbols: symbols };
        } catch (e) {
          console.error('Error providing document symbols:', e);
          return { symbols: [] };
        }
      }
    });

    // Register semantic token provider for local functions
    // Note: Monaco's semantic tokens require enabling semantic highlighting in editor options
    // For now, we'll use a simpler approach: update the monarch tokenizer dynamically
    // by adding local functions to a localFunctions array when files are parsed
  }

  static updateLocalFunctions(localFunctions: string[]) {
    if (!ForgeState.nwScriptTokenConfig) return;
    
    // Update the local functions array
    ForgeState.nwScriptTokenConfig.localFunctions = localFunctions;
    
    // Re-register the tokenizer with updated config
    const monaco = (window as any).monaco;
    if (monaco) {
      monaco.languages.setMonarchTokensProvider('nwscript', ForgeState.nwScriptTokenConfig);
    }
  }

  static getRecentProjects(): string[] {
    if(Array.isArray(KotOR.ConfigClient.options.recent_projects)){
      // ConfigClient.options.recent_projects = ConfigClient.options.recent_projects.map( (file: any) => {
      //   return Object.assign(new EditorFile(), file);
      // });
    }else{
      KotOR.ConfigClient.options.recent_projects = [];
    }
    return KotOR.ConfigClient.options.recent_projects;
  }

  static getRecentFiles(): EditorFile[] {
    if(Array.isArray(KotOR.ConfigClient.options.recent_files)){
      KotOR.ConfigClient.options.recent_files = KotOR.ConfigClient.options.recent_files.map( (file: any) => {
        return Object.assign(new EditorFile(), file);
      });
    }else{
      KotOR.ConfigClient.options.recent_files = [];
    }
    return KotOR.ConfigClient.options.recent_files as EditorFile[];
  }

  static addRecentFile(file: EditorFile){
    try{
      //Update the opened files list
      let file_path = file.getPath();
      if(file_path){
        this.removeRecentFile(file);

        //Append this file to the beginning of the list
        ForgeState.recentFiles.unshift(file);

        this.saveState();

        //Notify the project we have opened a new file
        if(ForgeState.project instanceof Project){
          ForgeState.project.addToOpenFileList(file);
        }
        this.processEventListener('onRecentFilesUpdated', [file]);
      }
    }catch(e){
      console.error(e);
    }
  }

  static removeRecentFile(file: EditorFile){
    if(!file) return;
    let file_path = file.getPath();
    if(file_path){
      const index = ForgeState.recentFiles.findIndex( (file: EditorFile) => {
        return file.getPath() == file_path;
      })
      if (index >= 0) {
        ForgeState.recentFiles.splice(index, 1);
      }
    }
    this.processEventListener('onRecentFilesUpdated', [file]);
    this.saveState();
  }

  static saveState(){
    try{
      KotOR.ConfigClient.save(null as any, true); //Save the configuration silently
    }catch(e){
      console.error(e);
    }
  }

  static switchGame(profile: any = {}){
    //TODO

    //check if the new profile is different from the current profile

    //check for open unsaved work

    //save the current forge state

    //switch to the new profile

    //give the use back control of the application
  }

  static openFile(){
    ForgeFileSystem.OpenFile().then( async (response: ForgeFileSystemResponse) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(Array.isArray(response.paths)){
          const file_path = response.paths[0];
          const parsed = pathParse(file_path);
          if(parsed.ext == 'mdl'){
            (window as any).dialog.showOpenDialog({
              title: `Open MDX File (${parsed.name}.mdx)`,
              filters: [
                {name: 'Model File', extensions: ['mdx']},
                {name: 'All Formats', extensions: ['*']},
              ],
              properties: ['createDirectory'],
            }).then( (result: any) => {
              let file_path2 = result.filePaths[0];
              FileTypeManager.onOpenFile({
                path: file_path, 
                path2: file_path2, 
                filename: parsed.base, 
                resref: parsed.name, 
                ext: parsed.ext
              });
            });
          }else{
            FileTypeManager.onOpenFile({
              path: file_path, 
              filename: parsed.base, 
              resref: parsed.name, 
              ext: parsed.ext
            });
          }
        }
      }else{
        if(Array.isArray(response.handles)){
          const [handle] = response.handles as FileSystemFileHandle[];
          const parsed = pathParse(handle.name);

          if(parsed.ext == 'mdl'){

            const originalTitle = document.title;
            document.title = `Open MDX File (${parsed.name}.mdx)`;

            const mdxResponse = await ForgeFileSystem.OpenFile({
              ext: ['.mdx'],
            });
            const [mdxHandle] = mdxResponse.handles as FileSystemFileHandle[];

            document.title = originalTitle;

            FileTypeManager.onOpenFile({
              path: `${EditorFileProtocol.FILE}//system.dir/${handle.name}`, 
              path2: `${EditorFileProtocol.FILE}//system.dir/${mdxHandle.name}`, 
              handle: handle, 
              handle2: mdxHandle, 
              filename: handle.name, 
              resref: parsed.name, 
              ext: parsed.ext
            });


          }else{
            FileTypeManager.onOpenFile({
              path: `${EditorFileProtocol.FILE}//system.dir/${handle.name}`, 
              handle: handle, 
              filename: handle.name, 
              resref: parsed.name, 
              ext: parsed.ext
            });
          }
        }
      }
    });
  }

  static saveOpenTabsState(){
    return;
    try{
      const states: TabStoreState[] = ForgeState.tabManager.tabs.map( (state) => {
        return {
          type: state.type,
          file: state.file
        }
      });
      KotOR.ConfigClient.set('open_tabs', states);
    }catch(e){
      console.error(e);
    }
  }

}
(window as any).ForgeState = ForgeState;
(window as any).ProjectFileSystem = ProjectFileSystem;

window.addEventListener('beforeunload', (event) => { 
  console.log('Saving Editor Config');
  ForgeState.saveOpenTabsState();
});
