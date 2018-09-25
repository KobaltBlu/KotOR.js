class ScriptEditorTab extends EditorTab {
  constructor(){
    super({
      toolbar: {
        items: [
          {name: 'File', items: [
            {name: 'Open File', onClick: () => {
              this.OpenFileDialog();
            }},
            {name: 'Save File', onClick: () => {
              //Save the image data as a TGA image
              this.SaveFileDialog();
            }},
            {name: 'Compile File', onClick: () => {
              //Save the image data as a TGA image
              this.Compile({
                path: this.info
              });
            }}
          ]},
          {name: 'Edit', items: [
            /*{name: 'TXI Data', onClick: () => {
              this.ShowTXI();
            }}*/
          ]}
        ]
      }
    });

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

  }

  OpenFile(file){
    let info = Utility.filePathInfo(file);

    this.tabLoader.Show();
    this.tabLoader.SetMessage("Loading NSS File");

    console.log(file, info);

    if(info.location == 'local'){

      this.file = info.path;
      this.fileName = info.file.name;
      this.info = info;

      fs.readFile(info.path, (err, buffer) => {
        if (err) throw err;
        try{
          switch(info.file.ext){
            case 'nss':
              fs.readFile(info.path, 'utf-8', (err, data) => {
                if (err) throw err;
                console.log(data);
                this.editor.setValue(data);
                this.tabLoader.Dismiss();
              });

              this.$tabName.text(file.path.split('\\').pop());
            break;
            case 'ncs':
              fs.readFile(info.path, (err, data) => {
                if (err) throw err;
                console.log(data);
                this.nwScript = new NWScript(data, (nwScript) => {
                  console.log(nwScript);
                  let decompiled = nwScript.initialBlock.source;
                  this.editor.setValue(decompiled);
                  this.tabLoader.Dismiss();
                });
              });

              this.$tabName.text(file.path.split('\\').pop());
            break;
            default:
              throw 'File is not a nss or ncs';

              this.tabLoader.Dismiss();
            break;
          }
        }
        catch (e) {
          console.log(e);

          this.tabLoader.Dismiss();
        }

      });

    }else if(info.location == 'archive'){

      this.file = '';
      this.fileName = info.file.name;

      switch(info.archive.type){
        case 'bif':
          Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes[info.file.ext]), (buffer) => {

            if(info.file.ext == 'ncs'){
              this.nwScript = new NWScript(buffer, (nwScript) => {
                console.log(nwScript)
                let decompiled = nwScript.initialBlock.source;
                this.editor.setValue(decompiled);
                this.tabLoader.Dismiss();
              });

            }else{
              let decoder = new StringDecoder('utf8');
              console.log(decoder.write(buffer), buffer);
              this.editor.setValue(decoder.write(buffer));

              this.tabLoader.Dismiss();
            }
            
          }, (e) => {
            throw 'Resource not found in BIF archive '+pathInfo.archive.name;

            this.tabLoader.Dismiss();
          });
        break;
      }

    }

    this.fileType = info.file.ext;
    this.location = info.location;
  }

  SaveFileDialog(){
    let path = dialog.showSaveDialog({
      title: 'Export File',
      defaultPath: this.file,
      filters: [
        {name: 'NSS File', extensions: ['nss']},
        {name: 'NCS File', extensions: ['ncs']}
    ]});

    if(typeof path != 'undefined' && path != null){

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

  OpenFileDialog(){
    let path = dialog.showOpenDialog({
      title: 'Open File',
      defaultPath: this.file,
      filters: [
        {name: 'NSS File', extensions: ['nss']},
        {name: 'NCS File', extensions: ['ncs']}
    ]});

    if(typeof path != 'undefined' && path != null){
      if(path.length){
        this.OpenFile(path[0]);
      }
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
