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
    this.$nssContainer = $('<div id="nssContainer" style="position: relative; overflow: hidden; height: 100%; width:75%; float: left;" />');
    this.$nssProperties = $('<div id="nssProperties" style="position: relative; overflow: auto; height: 100%; width:25%; float: left;" />');
    this.$textEditor = $('<div id="texteditor" style="height: 100%;"></div>');

    this.$tabContent.append(this.$nssContainer).append(this.$nssProperties);

    this.$nssContainer.append(this.$textEditor);

    if(typeof BrowserWindow.getFocusedWindow().ToOpen !== 'undefined'){
      OpenFile(BrowserWindow.getFocusedWindow().ToOpen);
    }

    if(typeof monaco === 'undefined'){
      amdRequire(['vs/editor/editor.main'], () => {
        this.InitEditor(file);
      });
    }else{
      this.InitEditor(file);
    }

  }

  InitNWScriptLanguage(){
    // Register a new language
    monaco.languages.register({ id: 'nwscript' });

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

    // Register a tokens provider for the language
    monaco.languages.setMonarchTokensProvider('nwscript', {
      tokenizer: {
        root: [
          ['TRUE', 'token-true'],
          ['FALSE', 'token-false'],
        ]
      }
    });

    // Define a new theme that contains only rules that match this language
    monaco.editor.defineTheme('nwscript-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: 'aaaaaa', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ce63eb' },
        { token: 'operator', foreground: '000000' },
        { token: 'namespace', foreground: '66afce' },
        { token: 'custom-info', foreground: '808080' },
        { token: 'custom-error', foreground: 'ff0000', fontStyle: 'bold' },
        { token: 'custom-notice', foreground: 'FFA500' },
        { token: 'custom-date', foreground: '008800' }
      ],
      colors: {
        //'editor.foreground': '#000000'
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
            label: 'simpleText',
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: 'simpleText'
          },
          {
            label: 'testing',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'testing(${1:condition})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          },
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

    // Register a completion item provider for the new language
    monaco.languages.registerCompletionItemProvider('nwscript', {
      provideCompletionItems: () => {
        var suggestions = [
          {
            label: 'simpleText',
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: 'simpleText'
          },
          {
            label: 'testing',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'testing(${1:condition})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          },
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
                { value: '```nwscript\n' + action[1].name + '()\n// ' + action[1].comment.replace('\n', '\n// ') + '\n```' }
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
  }

  InitEditor(file){
    this.InitNWScriptLanguage();
    this.editor = monaco.editor.create(this.$textEditor[0], {
      language: 'nwscript',
      theme: 'vs-dark',
      automaticLayout: true,
      snippetSuggestions: true
    });

    if(file){
      this.OpenFile(file);
    }
  }

  OpenFile(file){

    /*this.nwScript = new NWScript(data, (nwScript) => {
      console.log(nwScript);
      let decompiled = nwScript.initialBlock.source;
      this.editor.setValue(decompiled);
      this.tabLoader.Dismiss();
    });*/

    this.tabLoader.Show();
    this.tabLoader.SetMessage("Loading NSS File");

    if(file instanceof EditorFile){
      file.readFile( (buffer) => {
        try{

          switch(file.reskey){
            case ResourceTypes.nss:
              this.editor.setValue(buffer.toString('utf8'));
              this.tabLoader.Dismiss();
            break;
            case ResourceTypes.ncs:
              this.editor.setValue(buffer.toString('utf8'));
              this.tabLoader.Dismiss();
            break;
            default:
              this.tabLoader.Dismiss();
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

  async SaveFileDialog(){
    let payload = await dialog.showSaveDialog({
      title: 'Export File',
      defaultPath: this.file,
      properties: ['createDirectory'],
      filters: [
        {name: 'NSS File', extensions: ['nss']},
        {name: 'NCS File', extensions: ['ncs']}
      ]
    });

    if(!payload.canceled && typeof payload.filePath != 'undefined'){

      this.info = Utility.filePathInfo(path);

      switch(this.info.file.ext){
        case 'nss':
          this.Export({
            path: this.info,
            onComplete: () => {
              
            },
            onError: () => {
              
            }
          });
        break;
        case 'ncs':
          this.Export({
            path: this.info,
            onComplete: () => {
              this.Compile({
                path: this.info,
                onComplete: () => {
                  alert('Compile complete');
                },
                onError: () => {
                  alert('Failed to compile');
                }
              })
            },
            onError: () => {
              
            }
          });
        break;
      }
    }

  }

  async OpenFileDialog(){
    let payload = await dialog.showOpenDialog({
      title: 'Open File',
      defaultPath: this.file,
      filters: [
        {name: 'NSS File', extensions: ['nss']},
        {name: 'NCS File', extensions: ['ncs']}
      ],
      properties: ['createDirectory'],
    });

    if(!payload.canceled && payload.filePaths.length){
      this.OpenFile(payload.filePaths[0]);
    }
  }

  Export( args = {} ){

    args = Object.assign({
      path: this.info,
      onComplete: null,
      onError: null
    }, args);

    if(args.path != null){

      fs.writeFile(args.path.path, this.editor.getValue(), function(err) {
        if(err) {
          if(typeof args.onError == 'function')
            args.onError(err);
        }

        alert("The file was saved!");

        if(typeof args.onComplete == 'function')
            args.onComplete();

      });

    }else{
      alert('Output path missing: Failed to save image.');
    }

  }

  Compile ( args = {} ){

    args = Object.assign({
      path: this.info,
      onComplete: null,
      onError: null
    }, args);

    let currentGame = 1;

    let pathInfo = path.parse(args.path.path);

    let exec = require('child_process').exec;
    let result = '';
    let compiler = exec("nwnnsscomp.exe -c -g " + currentGame + " --outputdir \"" + pathInfo.dir + "\" \"" + args.path.path + "\"");

    compiler.stdout.on('data', (data) => {
      result += data;
    });

    compiler.on('close', () => {
      if(typeof args.onComplete == 'function')
          args.onComplete(result);

      console.log('done');
      console.log(result);
    });

  }

}

module.exports = ScriptEditorTab;
