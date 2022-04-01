const amdLoader = require('../../../node_modules/monaco-editor/min/vs/loader.js');
const amdRequire = amdLoader.require;
const amdDefine = amdLoader.require.define;

function uriFromPath(_path) {
  var pathName = path.resolve(_path).replace(/\\/g, '/');
  if (pathName.length > 0 && pathName.charAt(0) !== '/') {
    pathName = '/' + pathName;
  }
  return encodeURI('file://' + pathName);
}

amdRequire.config({
  baseUrl: uriFromPath(path.join(__dirname, '../../../node_modules/monaco-editor/min'))
});

// workaround monaco-css not understanding the environment
self.module = undefined;

class ScriptEditorTab extends EditorTab {
  constructor(file){
    super({ editorFile: file });

    this.$r_container = $(`
    <div class="content" style="height: 100%;">
      <!-- Center Pane : Render View -->
      <div class="center-pane ui-layout-center" style="height: 100%;">
        
      </div>
      <!-- Bottom Pane -->
      <div class="bottom-pane ui-layout-south" style="overflow: hidden; padding-right: 0px;">
        
      </div>
    </div>`);

    this.$centerPane = $('div.center-pane', this.$r_container);
    this.$bottomPane = $('div.bottom-pane', this.$r_container);


    this.$nssContainer = $('<div id="nssContainer" style="position: relative; overflow: hidden; height: 100%; width:100%;" />');
    //this.$nssProperties = $('<div id="nssProperties" style="position: relative; overflow: auto; height: 100%; width:25%; float: left;" />');
    this.$textEditor = $('<div id="texteditor" style="height: 100%;"></div>');


    this.$tabContent.append(this.$r_container);//.append(this.$nssProperties);
    this.$centerPane.append(this.$nssContainer);
    this.$nssContainer.append(this.$textEditor);

    this.bottomTabManager = new EditorTabManager();
    this.bottomTabManager.AttachTo(this.$bottomPane);

    this.errorLogTab = new ScriptErrorLogTab( this );
    this.compileLogTab = new ScriptCompileLogTab( this );
    this.ncsTab = new NCSInspectorTab( this );
    this.bottomTabManager.AddTab( this.errorLogTab );
    this.bottomTabManager.AddTab( this.compileLogTab );
    this.bottomTabManager.AddTab( this.ncsTab );
    this.errorLogTab.Show();

    this.nwScriptParser = ScriptEditorTab.nwScriptParser.clone();

    this.lastSavedState = '';

    if(typeof BrowserWindow.getFocusedWindow().ToOpen !== 'undefined'){
      OpenFile(BrowserWindow.getFocusedWindow().ToOpen);
    }

    this.InitEditor(file);

  }

  Show(){
    super.Show();
    console.log('script show');
    this.layout = this.$r_container.layout({
      applyDefaultStyles: false,
      south__size:			200,
      south__spacing_open:		8,		// no resizer-bar when open (zero height)
      south__spacing_closed:		14,		// big resizer-bar when open (zero height)
      south__initClosed: false,
      onresize_end: (pane) => {
        tabManager.TriggerResize();
      }
    });

  }

  InitEditor(file){
    this.editor = monaco.editor.create(this.$textEditor[0], {
      language: 'nwscript',
      theme: 'nwscript-dark',
      automaticLayout: true,
      snippetSuggestions: true,
      'semanticHighlighting.enabled': true,
    });

    this.editor.getModel().onDidChangeContent((event) => {
      this.editorFile.unsaved_changes = (this.lastSavedState != this.editor.getModel().getValue());
      this.triggerLinterTimeout();
    });

    if(file){
      this.OpenFile(file);
    }
    this.loaded = true;
  }

  triggerLinterTimeout(){
    clearTimeout(this._linter_timeout);
    this._linter_timeout = undefined;
    this._linter_timeout = setTimeout( () => {
      this.triggerLinter();
    }, 100);
  }

  triggerLinter(){
    if(!this.loaded) return;
    const source_nss = this.editor.getModel().getValue();
    try{
      this.nwScriptParser.parseScript( source_nss );
      //console.clear();
      console.log(this.nwScriptParser.errors);
      const markers = [ ];
      for(let i = 0; i < this.nwScriptParser.errors.length; i++){
        const error = this.nwScriptParser.errors[i];
        if(error && error.offender && error.offender.source){
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: error.offender.source.first_line,
            startColumn: error.offender.source.first_column + 1,
            endLineNumber: error.offender.source.last_line,
            endColumn: error.offender.source.last_column + 1,
            message: error.message
          });
        }else{
          console.log('unhandled error', error);
        }
      }
      this.errorLogTab.setErrors(markers);
      monaco.editor.setModelMarkers(this.editor.getModel(), 'nwscript', markers);
    }catch(e){
      console.log('err', e.lineNumber, e.columnNumber, e.name, e.message, e.hash);
      console.log(JSON.stringify(e));
      if(e.hash){
        const markers = [{
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: e.hash.loc.first_line,
          startColumn: e.hash.loc.first_column + 1,
          endLineNumber: e.hash.loc.last_line,
          endColumn: e.hash.loc.last_column + 1,
          message: e.message
        }];
        this.errorLogTab.setErrors(markers);

        monaco.editor.setModelMarkers(this.editor.getModel(), 'nwscript', markers);
      }else{
        monaco.editor.setModelMarkers(this.editor.getModel(), 'nwscript', []);
        this.errorLogTab.setErrors([]);
      }
    }
  }

  OpenFile(file){

    /*this.nwScript = new NWScript(data, (nwScript) => {
      console.log(nwScript);
      let decompiled = nwScript.initialBlock.source;
      this.editor.setValue(decompiled);
      this.tabLoader.Dismiss();
    });*/

    //this.tabLoader.Show();
    //this.tabLoader.SetMessage("Loading NSS File");

    if(file instanceof EditorFile){
      file.readFile( (buffer) => {
        try{
          switch(file.reskey){
            case ResourceTypes.nss:
              this.lastSavedState = buffer.toString('utf8');
              this.editor.setValue(buffer.toString('utf8'));
              //this.tabLoader.Dismiss();
            break;
            case ResourceTypes.ncs:
              this.lastSavedState = buffer.toString('utf8');
              this.editor.setValue(buffer.toString('utf8'));
              //this.tabLoader.Dismiss();
            break;
            default:
              //this.tabLoader.Dismiss();
            break;
          }
        }
        catch (e) {
          console.log(e);
          this.Remove();
        }
      });
    }

  }

  async Save(){
    return new Promise( async ( resolve, reject ) => {
      if( this.editorFile.location != EditorFile.LOCATION_TYPE.LOCAL ){
        const saved = await this.SaveAs();
        resolve(saved);
      }else{
        if(fs.existsSync(this.editorFile.path)){
          fs.writeFile(this.editorFile.path, this.editor.getModel().getValue(), (err) => {
            if(!err){
              this.editorFile.setPath(this.editorFile.path);
              this.lastSavedState = this.editor.getModel().getValue();
              this.editorFile.unsaved_changes = false;
              NotificationManager.Notify(NotificationManager.Types.SUCCESS, `File saved`);
            }else{
              NotificationManager.Notify(NotificationManager.Types.ALERT, `Failed to save file`);
            }
            resolve(true);
          });
        }else{
          const saved = await this.SaveAs();
          resolve(saved);
        }
      }
    });
  }

  async SaveAs(){
    return new Promise( async ( resolve, reject ) => {
      dialog.showSaveDialog({
        title: 'Save As',
        defaultPath: this.file,
        properties: ['createDirectory'],
        filters: [
          {name: 'NSS File', extensions: ['nss']}
        ]
      }).then( ( context ) => {
        console.log('save as', context);
        if(!context.canceled){
          fs.writeFile(context.filePath, this.editor.getModel().getValue(), (err) => {
            if(!err){
              this.editorFile.setPath(context.filePath);
              this.lastSavedState = this.editor.getModel().getValue();
              this.editorFile.unsaved_changes = false;
              NotificationManager.Notify(NotificationManager.Types.SUCCESS, `File saved`);
            }else{
              NotificationManager.Notify(NotificationManager.Types.ALERT, `Failed to save file`);
            }
            resolve(true);
          });
        }else{
          resolve(false);
        }
      });
    });
  }

  exportScriptIncludes( text ){
    return new Promise( (resolve, reject) => {
      let errors = false;
      //load include files
      let reg_inc = /^((?!\/\/)|\s+)(#include)\s+\"(\w+)\"/gm;
      let includesIterator = text.matchAll(reg_inc);
      let includes = [];
      for (const inc of includesIterator) {
        includes.push(inc[3]);
      }

      if(includes.length){
        NotificationManager.Notify(NotificationManager.Types.INFO, `Exporting (${includes.length}) included files`);
      }

      new AsyncLoop({
        array: includes,
        onLoop: (include, asyncLoop) => {
          console.log(`include: exporting: ${include}.nss`);
          if(!fs.existsSync(path.join('nwscript', include+'.nss'))){
            ResourceLoader.loadResource(ResourceTypes.nss, include, (d) => {
              fs.writeFile(path.join('nwscript', include+'.nss'), d.toString('utf8'), (err) => {
                if(!err){
                  console.log(`include: exported: ${include}.nss`);
                  this.exportScriptIncludes(d.toString('utf8')).then( () => {
                    asyncLoop.next();
                  });
                }else{
                  console.log(`include: export failed: ${include}.nss`);
                  errors = true;
                  asyncLoop.next();
                }
              });
            }, () => {
              errors = true;
              asyncLoop.next();
            });
          }else{
            asyncLoop.next();
          }
        }
      }).iterate(() => {
        console.log(`includes exported: ${includes.length}`);
        resolve( errors );
      });
    });
  }

  async Compile(){

    if(this.editorFile.unsaved_changes == true){
      const saved = await this.Save();
      if(!saved){
        NotificationManager.Notify(NotificationManager.Types.ALERT, `Compile: Aborted.`);
        return;
      }
    }

    //Parse and Compile the script

    NotificationManager.Notify(NotificationManager.Types.INFO, `Parsing...`);
    const source_nss = this.editor.getModel().getValue();
    try{
      this.nwScriptParser.parseScript(source_nss);

      const nss_path = path.parse(this.editorFile.path);
      if(!this.nwScriptParser.errors.length){
        NotificationManager.Notify(NotificationManager.Types.INFO, `Compiling... - ${nss_path.name}.nss`);
        const nwScriptCompiler = new NWScriptCompiler(this.nwScriptParser.ast);
        const compiledBuffer = nwScriptCompiler.compile();
        fs.writeFileSync(path.join(nss_path.dir, `${nss_path.name}.ncs`), compiledBuffer);
        this.ncsTab.setNCSData(compiledBuffer);
        NotificationManager.Notify(NotificationManager.Types.SUCCESS, `Compile: Success! - ${nss_path.name}.ncs`);
      }else{
        NotificationManager.Notify(NotificationManager.Types.ALERT, `Parse: Failed! - with errors (${this.nwScriptParser.errors.length})`);
      }
    }catch(e){
      console.error(e);
      NotificationManager.Notify(NotificationManager.Types.ALERT, `Parser: Failed!`);
    }

  }

  static InitNWScriptLanguage(){
    if(typeof monaco === 'undefined'){
      amdRequire(['vs/editor/editor.main'], () => {
        ScriptEditorTab.nwscript_nss = Buffer.alloc(0);
        ResourceLoader.loadResource(ResourceTypes.nss, 'nwscript', (nwscript_nss) => {
          ScriptEditorTab.nwscript_nss = nwscript_nss;
          ScriptEditorTab.nwScriptParser = new NWScriptParser(ScriptEditorTab.nwscript_nss.toString());

          // Register a new language
          monaco.languages.register({ id: 'nwscript' });

          const tokenConfig = {
            keywords: [
              'int', 'float', 'object', 'vector', 'string', 'void', 'action', 
              'default', 'const', 'if', 'else', 'switch', 'case',
              'while', 'do', 'for', 'break', 'continue', 'return', 'struct', 'OBJECT_SELF', 'OBJECT_INVALID',
            ],

            functions: [
              //'GN_SetListeningPatterns'
            ],

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
          const _nw_types = ScriptEditorTab.nwScriptParser.engine_types.slice(0);
          for(let i = 0; i < _nw_types.length; i++){
            const nw_type = _nw_types[i];
            tokenConfig.keywords.push(nw_type.name);
          }

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

          const nw_suggestions = [];
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
          const nw_types = ScriptEditorTab.nwScriptParser.engine_types.slice(0);
          for(let i = 0; i < nw_types.length; i++){
            const nw_type = nw_types[i];
            console.log({
              label: nw_type.name,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: `${nw_type.name}`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: `Engine Type #${nw_type.index+1}:\n\n${nw_type.name}`
            });
            nw_suggestions.push({
              label: nw_type.name,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: `${nw_type.name}`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: `Engine Type #${nw_type.index+1}:\n\n${nw_type.name}`
            });
          }

          //Engine Constants
          const nw_constants = ScriptEditorTab.nwScriptParser.engine_constants.slice(0);
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
          const nw_actions = Object.entries(NWScriptDefK1.Actions);
          nw_actions.forEach( (entry) =>{
            const action = entry[1];
            const args = [];
            const args2 = [];
            const action_definition = ScriptEditorTab.nwScriptParser.engine_actions[entry[0]];
            for(let i = 0; i < action.args.length; i++){
              const arg = action.args[i];
              const def_arg = action_definition.arguments[i];
              // if(i > 0) args += ', ';
              if(def_arg.value){
                const value = arg_value_parser(def_arg.value);
                args.push(`\${${(i+1)}:${arg} ${def_arg.name} = ${value}}`);
                args2.push(`${arg} ${def_arg.name} = ${value}`);
              }else{
                args.push(`\${${(i+1)}:${arg} ${def_arg.name}}`);
                args2.push(`${arg} ${def_arg.name}`);
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
              console.log('auto complete');

              const local_suggestions = [
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

              const parser = tabManager?.currentTab?.nwScriptParser;
              if(parser){
                //Local Variables
                const l_variables = parser.local_variables;
                for(let i = 0; i < l_variables.length; i++){
                  const l_variable = l_variables[i];
                  console.log(l_variable);
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

              return { suggestions: local_suggestions.concat(nw_suggestions) };
            }
          });

          monaco.languages.registerHoverProvider('nwscript', {
            provideHover: function (model, position) {
              const wordObject = model.getWordAtPosition(position);
              if(wordObject){
                
                //Engine Constants
                const nw_constant = ScriptEditorTab.nwScriptParser.engine_constants.find( obj => obj.name == wordObject.word );
                if(nw_constant){
                  return {
                    contents: [
                      { value: `**nwscript.nss**` },
                      { value: `\`\`\`nwscript\n${nw_constant.datatype.value} ${nw_constant.name} = ${arg_value_parser(nw_constant.value)}\n \n\`\`\`` }
                    ]
                  };
                }

                const action = nw_actions.find( obj => obj[1].name == wordObject.word );
                if(action){
                  console.log(action);
                  let args = '';
                  const function_definition = ScriptEditorTab.nwScriptParser.engine_actions[action[0]];
                  console.log(function_definition);
                  for(let i = 0; i < action[1].args.length; i++){
                    const arg = action[1].args[i];
                    const def_arg = function_definition.arguments[i];
                    if(i > 0) args += ', ';
                    if(def_arg.value){
                      const value = arg_value_parser(def_arg.value);
                      args += `${arg} ${def_arg.name} = ${value}`;
                    }else{
                      args += `${arg} ${def_arg.name}`;
                    }
                  }
                  return {
                    contents: [
                      { value: `**nwscript.nss**` },
                      { value: `\`\`\`nwscript\n${function_definition.returntype.value} ${action[1].name}(${args})\n/*\n ${action[1].comment.trim()} '\n*/ \n\`\`\`` }
                    ]
                  };
                }

                const parser = tabManager?.currentTab?.nwScriptParser;
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
                      const l_struct = parser.local_variables.find( obj => obj.name == structName );
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
                      console.log('struct', l_variable);
                    }
                  }


                  //Local Variables
                  const l_variable = parser.local_variables.find( obj => obj.name == wordObject.word );
                  if(l_variable){
                    console.log(l_variable);
                    return {
                      contents: [
                        { value: `**nwscript.nss**` },
                        { value: `\`\`\`nwscript\n${l_variable.datatype.value} ${l_variable.name} \n\`\`\`` }
                      ]
                    };
                  }

                  //Local Function
                  const l_function = parser.local_functions.find( obj => obj.name == wordObject.word );
                  if(l_function){
                    console.log(l_function);
                    let args = [];
                    for(let i = 0; i < l_function.arguments.length; i++){
                      const def_arg = l_function.arguments[i];
                      if(def_arg.value){
                        const value = arg_value_parser(def_arg.value);
                        args.push(`${def_arg.datatype.value} ${def_arg.name} = ${value}`);
                      }else{
                        args.push(`${def_arg.datatype.value} ${def_arg.name}`);
                      }
                    }
                    return {
                      contents: [
                        { value: '**SOURCE**' },
                        { value: `\`\`\`nwscript\n${l_function.returntype.value} ${l_function.name}(${args.join(', ')}) \n\`\`\`` }
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
          });

        });
      });
    }
  }

  static includeMap = new Map();

  static async resolveScriptIncludes( source = '', includes = [] ){ 
    const regex_include = /#include[\s+]?\"(.+)\"/g;
    const include_matches = Array.from(source.matchAll(regex_include));
    const include_count = include_matches.length;

    const list = [];
    for(let i = 0; i < include_count; i++){
      const include_source = await ScriptEditorTab.resolveInclude(include_matches[1]);
      const include_ref = { name: include_matches[i], source: include_source };
      includes.unshift(include_ref);
    }
    const list_clone = list.slice(0);
    for(let i = 0; i < list_clone.length; i++){
      
      await ScriptEditorTab.resolveScriptIncludes(list_clone[i].source, includes); 
    }
    return includes;
  }

  static resolveInclude( name = '' ){
    return new Promise( (resolve, reject) => {
      if(ScriptEditorTab.includeMap.has(name)){
        resolve(this.includeMap.get(name));
      }else {
        ResourceLoader.loadResource(ResourceTypes.nss, name, (d) => {
          ScriptEditorTab.includeMap.set(name, d.toString());
          resolve(this.includeMap.get(name));
        }, () => {
          reject(null);
        });
      }
    });
  }

}


class ScriptErrorLogTab extends EditorTab {
  errors = [];
  tab = undefined;
  constructor( tab ){
    super({ closeable: false });
		this.$tabName.text(' PROBLEMS ');
    this.$errorList = $('<div class="tab-pane-content scroll-y error-list" />');
    this.$tabContent.append(this.$errorList);
    this.tab = tab;
  }

  update(){
    this.$errorList.html('');
    for(let i = 0; i < this.errors.length; i++){
      const error = this.errors[i];
      let $error = $(`
      <div class="script-error">
        <span class="icon"><i class="glyphicon glyphicon-remove-sign"></i></span>
        <span class="message"></span>
        <span class="line-column">[0, 0]</span>
      </div>`);

      $error.off('click').on('click', (e) => {
        e.preventDefault();
        this.tab.editor.setPosition({lineNumber: error.startLineNumber, column: error.startColumn});
        this.tab.editor.revealLineInCenter(error.startLineNumber);
      })
      
      $('.message', $error).text(error.message);
      $('.line-column', $error).text(`[${error.startLineNumber}, ${error.startColumn}]`);
      this.$errorList.append($error);
    }
    if(!this.errors.length){
		  this.$tabName.text(' PROBLEMS ');
    }else{
		  this.$tabName.text(` PROBLEMS (${this.errors.length}) `);
    }
  }

  setErrors( errors = [] ){
    this.errors = errors;
    this.update();
  }

}

class ScriptCompileLogTab extends EditorTab {
  logs = [];
  tab = undefined;
  constructor( tab ){
    super({ closeable: false });
		this.$tabName.text('Compile Log');
    this.$logList = $('<div class="tab-pane-content scroll-y log-list" />');
    this.$tabContent.append(this.$logList);
    this.tab = tab;
  }

  update(){
    this.$logList.html('');
    for(let i = 0; i < this.logs.length; i++){
      this.addLogElement(this.logs[i]);
    }
  }

  addLogElement( log ){
    let $log = $(`
    <div class="script-log">
      <span class="message"></span>
    </div>`);
    
    $('.message', $log).text(log.message);
    this.$logList.append($log);
  }

  addLog( log = undefined ){
    if(log){
      this.logs.push( log );
      this.addLogElement( log );
    }
  }

  clearLog(){
    this.logs = [];
    this.update();
  }

}

class NCSInspectorTab extends EditorTab {
  logs = [];
  tab = undefined;
  constructor( tab ){
    super({ closeable: false });
		this.$tabName.text('NCS Viewer');
    this.$logList = $('<div class="tab-pane-content scroll-y log-list" />');
    this.$tabContent.append(this.$logList);
    this.tab = tab;
  }

  update(){
    this.$logList.html('');
    const offset = 13;
    this.script.instructions.forEach( (instruction, key, map) => {
      const address = ('00000000' + (parseInt(instruction.address, 16) + offset).toString(16).toUpperCase()).substr(-8);
      const code_hex = instruction.code_hex.toUpperCase();
      const type_hex = instruction.type_hex.toUpperCase();
      const padding = '                                  ';
      const output = (`${address} ${code_hex} ${type_hex}` + padding).substr(0, 34);
      console.log(output);
    });
  }

  decompileInstriction( instruction ){
    // switch(instruction.code){
    //   //case 0x
    // }
  }

  setNCSData( buffer ){
    this.script = new NWScript(buffer);
    console.log(this.script.instructions);
    this.update();
  }

}



function arg_value_parser( value ){

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

module.exports = ScriptEditorTab;
