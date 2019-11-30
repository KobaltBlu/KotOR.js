class ScriptEditorTab extends EditorTab {
  constructor(file){
    super();

    this.$nssContainer = $('<div id="nssContainer" style="position: relative; overflow: hidden; height: 100%; width:75%; float: left;" />');
    this.$nssProperties = $('<div id="nssProperties" style="position: relative; overflow: auto; height: 100%; width:25%; float: left;" />');
    this.$textEditor = $('<div id="texteditor" style="height: 100%;"></div>');

    this.$tabContent.append(this.$nssContainer).append(this.$nssProperties);

    this.$nssContainer.append(this.$textEditor);

    if(typeof BrowserWindow.getFocusedWindow().ToOpen !== 'undefined'){
      OpenFile(BrowserWindow.getFocusedWindow().ToOpen);
    }

    // trigger extension
    ace.require("ace/ext/language_tools");
    this.editor = ace.edit(this.$textEditor[0]);
    this.editor.session.setMode("ace/mode/nwnscript");
    this.editor.setTheme("ace/theme/monokai");
    // enable autocompletion and snippets
    this.editor.setOptions({
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: true
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
      ]
    });

    if(!payload.canceled && payload.filePaths.length){
      this.OpenFile(payload.filePaths[0]);
    }
  }

  Export( args = {} ){

    args = $.extend({
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

    args = $.extend({
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
