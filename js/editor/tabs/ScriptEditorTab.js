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

    this.errorLogTab = new ScriptErrorLogTab();
    this.compileLogTab = new ScriptCompileLogTab();
    this.bottomTabManager.AddTab( this.errorLogTab );
    this.bottomTabManager.AddTab( this.compileLogTab );
    this.errorLogTab.Show();

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
      ScriptEditorTab.nwScriptParser.parseScript( source_nss );
      //console.clear();
      console.log(ScriptEditorTab.nwScriptParser.errors);
      var markers = [ ];
      this.errorLogTab.setErrors(markers);
      monaco.editor.setModelMarkers(this.editor.getModel(), 'nwscript', markers);
    }catch(e){
      console.log('err', e.lineNumber, e.columnNumber, e.name, e.message, e.hash);
      console.log(JSON.stringify(e));
      if(e.hash){
        var markers = [{
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: e.hash.loc.first_line,
          startColumn: e.hash.loc.first_column,
          endLineNumber: e.hash.loc.last_line,
          endColumn: e.hash.loc.last_column,
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
      ScriptEditorTab.nwScriptParser.parseScript(source_nss);

      //console.log(util.inspect(ScriptEditorTab.nwScriptParser.ast, {showHidden: false, depth: null, colors: true}));
      const nss_path = path.parse(this.editorFile.path);

      NotificationManager.Notify(NotificationManager.Types.INFO, `Compiling... - ${nss_path.name}.nss`);
      const nwScriptCompiler = new NWScriptCompiler(ScriptEditorTab.nwScriptParser.ast);
      const compiledBuffer = nwScriptCompiler.compile();
      fs.writeFileSync(path.join(nss_path.dir, `${nss_path.name}.ncs`), compiledBuffer);
      NotificationManager.Notify(NotificationManager.Types.SUCCESS, `Compile: Success! - ${nss_path.name}.ncs`);
    }catch(e){
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

          monaco.languages.setMonarchTokensProvider( 'nwscript', {
            keywords: [
              'int', 'float', 'object', 'vector', 'string', 'void', 'action', 
              'default', 'const', 'if', 'else', 'switch', 'case',
              'while', 'do', 'for', 'break', 'continue', 'return', 'struct', 'OBJECT_SELF', 'OBJECT_INVALID',
            ],

            functions: [
              'GN_SetListeningPatterns'
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
                [/\@?[a-zA-Z_]\w*/, {
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

                // [/0x[0-9A-Fa-f]+?\b/, 'HEXADECIMAL'],
                // [/(?:[0-9]|[1-9][0-9]+)(?:\.[0-9]+)(?:f)?\b/, 'FLOAT'],
                // [/(?:[0-9]|[1-9][0-9]+)\b/, 'INTEGER'],
                //[/\"[^\"]*\"/, 'TEXT'],

                // [/switch\b/, 'SWITCH'], 
                // [/case\b/, 'CASE'], 
                // [/default\b/, 'DEFAULT'], 
                // [/else if\b/, 'ELSEIF'], 
                // [/if\b/, 'IF'], 
                // [/else\b/, 'ELSE'], 
                // [/while\b/, 'WHILE'], 
                // [/do\b/, 'DO'], 
                // [/for\b/, 'FOR'], 
                // [/continue\b/, 'CONTINUE'], 
                // [/const\b/, 'CONST'], 
                // [/void\b|VOID\b/, 'VOID'], 
                // [/int\b|INT\b/, 'INT'], 
                // [/string\b|STRING\b/, 'STRING'], 
                // [/float\b|FLOAT\b/, 'FLOAT'], 
                // [/vector\b|VECTOR\b/, 'VECTOR'], 
                // [/struct\b|STRUCT\b/, 'STRUCT'], 
                // [/action\b|ACTION\b/, 'ACTION'], 
                // [/object\b|OBJECT\b|object_id\b|OBJECT_ID\b/, 'OBJECT'], 

                // [/OBJECT_SELF\b/, 'OBJECT_SELF'], 
                // [/OBJECT_INVALID\b/, 'OBJECT_INVALID'], 

                // [/\#include\b/, 'INCLUDE'], 
                // [/\#define\b/, 'DEFINE'], 
                // [/return\b/, 'RETURN'], 
                // [/break\b/, 'BREAK'], 
                // [/(?:[A-Za-z_]|[A-Za-z_][A-Za-z0-9_]+)\b/, 'NAME'], 

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
                [/[a-zA-Z_][\w]*/, {
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
          });

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

          const keywords = ['FALSE', 'TRUE', 'int', 'float', 'string', 'object', 'effect', 'event', 'location', 'talent', 'vector', 'void', 'struct'];
          const nw_keywords = [];
          for(let i = 0; i < keywords.length; i++){
            nw_keywords.push({
              label: keywords[i],
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keywords[i],
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            });
          }

          const nw_suggestions = [];
          const nw_actions = Object.entries(NWScriptDefK1.Actions);

          nw_actions.forEach( (entry) =>{
            const action = entry[1];
            let args = '';
            for(let i = 0; i < action.args.length; i++){
              let arg = action.args[i];
              if(i > 0) args += ', ';
              args += `\${${(i+1)}:${arg}}`;
            }
            nw_suggestions.push({
              label: action.name,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: `${action.name}(${args})`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: action.comment
            });
          });

          // Register a completion item provider for the new language
          monaco.languages.registerCompletionItemProvider('nwscript', {
            provideCompletionItems: () => {
              var suggestions = [
                {
                  label: 'ifelse',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: ['if (${1:condition}) {', '\t$0', '} else {', '\t', '}'].join('\n'),
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: 'If-Else Statement'
                }
              ].concat(nw_suggestions, nw_keywords);
              return { suggestions: suggestions };
            }
          });

          monaco.languages.registerHoverProvider('nwscript', {
            provideHover: function (model, position) {
              console.log(model, position);
              const wordObject = model.getWordAtPosition(position);
              if(wordObject){
                const action = nw_actions.find( obj => obj[1].name == wordObject.word );
                if(action){
                  return {
                    contents: [
                      { value: '**SOURCE**' },
                      { value: '```nwscript\n' + action[1].name + '()\n/*\n' + action[1].comment.trim() + '\n*/ \n```' }
                    ]
                  };
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

}


class ScriptErrorLogTab extends EditorTab {
  errors = [];
  constructor(){
    super({ closeable: false });
		this.$tabName.text(' PROBLEMS ');
    this.$errorList = $('<div class="error-list" />');
    this.$tabContent.append(this.$errorList);

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
  constructor(){
    super({ closeable: false });
		this.$tabName.text('Compile Log');
    this.$logList = $('<div class="log-list" />');
    this.$tabContent.append(this.$logList);

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

module.exports = ScriptEditorTab;
