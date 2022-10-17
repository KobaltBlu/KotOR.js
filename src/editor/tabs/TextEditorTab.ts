import { EditorFile } from "../EditorFile";
import { EditorTab } from "../EditorTab";
import { FileLocationType } from "../enum/FileLocationType";
import * as fs from "fs";
import * as path from "path";
import { ResourceTypes } from "../../resource/ResourceTypes";

export class TextEditorTab extends EditorTab {
  $nssContainer: JQuery<HTMLElement>;
  $textEditor: JQuery<HTMLElement>;
  editor: any;
  constructor(file: EditorFile){
    super();

    this.file = file;

    this.$tabName.text("Text Editor");

    this.$nssContainer = $('<div id="nssContainer" style="position: relative; overflow: hidden; height: 100%; width:100%; float: left;" />');
    //this.$nssProperties = $('<div id="nssProperties" style="position: relative; overflow: auto; height: 100%; width:25%; float: left;" />');
    this.$textEditor = $('<div id="texteditor" style="height: 100%;"></div>');

    this.$tabContent.append(this.$nssContainer);//.append(this.$nssProperties);

    this.$nssContainer.append(this.$textEditor);

    // if(typeof BrowserWindow.getFocusedWindow().ToOpen !== 'undefined'){
    //   OpenFile(BrowserWindow.getFocusedWindow().ToOpen);
    // }

    // trigger extension
    //@ts-expect-error
    ace.require("ace/ext/language_tools");
    //@ts-expect-error
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

  OpenFile(file: EditorFile){

    this.tabLoader.Show();
    this.tabLoader.SetMessage("Loading Text File");
    try{
      if(file instanceof EditorFile){
        file.readFile( (buffer: Buffer) => {
          this.$tabName.text(this.file.getFilename());
          this.editor.setValue(buffer.toString('utf8'));
          this.tabLoader.Dismiss();
        });
      }
    }catch(e){ console.error(e); this.tabLoader.Dismiss(); }
  }

  Save(){
    if(this.file instanceof EditorFile){

      let save_path = this.file.getLocalPath();

      if(!save_path && this.file.location == FileLocationType.LOCAL){
        save_path = this.file.resref+'.'+this.file.ext;
      }

      if(!save_path){
        this.SaveAs();
        return;
      }

      fs.writeFile(save_path, this.editor.getValue(), 'utf8', (err: any) => {
        if (err) {
          return console.error(err);
        }

        this.$tabName.text(this.file.getFilename());
  
        // if(typeof onComplete === 'function')
        //   onComplete(err);
  
        console.log('Image Saved');//, Object.keys(IMAGE_TYPE)[type]);
      });
    }
  }

  async SaveAs(){
    if(this.file instanceof EditorFile){

      //@ts-expect-error
      let payload = await dialog.showSaveDialog({
        title: 'Save File As',
        defaultPath: this.file.getLocalPath() ? this.file.getLocalPath() : this.file.getFilename(),
        properties: ['createDirectory'],
        filters: [
          {name: this.file.ext.toUpperCase(), extensions: [this.file.ext]}
        ]
      });
  
      if(!payload.canceled && typeof payload.filePath != 'undefined'){
        let path_obj = path.parse(payload.filePath);
        this.file.path = payload.filePath;
        this.file.resref = path_obj.name;
        this.file.ext = path_obj.ext.slice(1);
        this.file.reskey = ResourceTypes[this.file.ext];
        this.file.archive_path = null;
        this.file.location = FileLocationType.LOCAL;
        this.Save();
      }else{
        console.warn('File export aborted');
      }

    }
  }

}
