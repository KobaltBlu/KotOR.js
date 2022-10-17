import { remote } from "electron";
import { ERFObject } from "../../resource/ERFObject";
import { ResourceTypes } from "../../resource/ResourceTypes";
import { Utility } from "../../utility/Utility";
import { EditorFile } from "../EditorFile";
import { EditorTab } from "../EditorTab";
import { FileTypeManager } from "../FileTypeManager";

export class MODEditorTab extends EditorTab {
  archive: any;
  $selected_ele: any;
  $filebrowser: JQuery<HTMLElement>;
  $filebrowserheader: JQuery<HTMLElement>;
  $list: JQuery<HTMLElement>;
  contextMenu: any;
  constructor(file: EditorFile){

    super();
    this.$tabName.text("MOD Editor");
    this.archive = null;
    this.$selected_ele = null;
    this.OpenFile(file);

    // this.contextMenu = new Menu()
    // this.contextMenu.append(new MenuItem({ 
    //   label: 'Open File',
    //   click: (e: any) => {
    //     console.log(this, e);
    //     if(this.$selected_ele){
    //       this.archive.getRawResource(this.$selected_ele.data('resref'), this.$selected_ele.data('restype'), (buffer) => {
    //         FileTypeManager.onOpenResource(new EditorFile({resref: this.$selected_ele.data('resref'), reskey: this.$selected_ele.data('restype'), buffer: buffer }));
    //       });
    //     }
    //   }
    // }));
    //this.contextMenu.append(new MenuItem({ type: 'separator' }));
    // this.contextMenu.append(new MenuItem({
    //   label: 'Export File',
    //   click: async (e: any) => {
    //     console.log(this, e);
    //     if(this.$selected_ele){

    //       let resref = this.$selected_ele.data('resref');
    //       let restype = this.$selected_ele.data('restype');

    //       let ext = ResourceTypes.getKeyByValue(restype);

    //       let payload = await dialog.showSaveDialog({
    //         title: 'Export File',
    //         defaultPath: resref+'.'+ext,
    //         properties: ['createDirectory'],
    //         filters: [
    //           {name: ext.toUpperCase()+' file', extensions: [ext]}
    //         ]
    //       });
      
    //       if(!payload.canceled && typeof playload.filePath != 'undefined'){
    //         this.archive.getRawResource(resref, restype, (buffer) => {
    //           fs.writeFile(payload.filePath, buffer, (err) => {

    //             if (err) {
    //               console.error(err);
    //             }else{
    //               console.log(ext.toUpperCase()+' file exported to ', file_path);
    //             }
          
    //           });
    //         });
    //       }

    //     }
    //   }
    // }));

  }

  init(){

    this.$tabContent.html('');

    this.$filebrowser = $('<div class="file-browser" />');
    this.$filebrowserheader = $('<div class="file-browser-header"><span>Name</span><span>Size</span><span>Size</span></div>');
    this.$list = $('<ul class="file-browser-list"/>');

    let listContent = '';

    for(let i = 0, il = this.archive.KeyList.length; i < il; i++){
      let key = this.archive.KeyList[i];
      let resource = this.archive.Resources[key.ResID];
      listContent += '<li class="file-browser-item" data-resref="'+key.ResRef+'" data-restype="'+key.ResType+'"><span>'+key.ResRef+'</span><span>'+ResourceTypes.getKeyByValue(key.ResType)+'</span><span>'+Utility.bytesToSize(resource.ResourceSize)+'</span></li>';
    }

    listContent += '</ul>';

    this.$list.html(listContent);

    this.$filebrowser.append(this.$filebrowserheader).append(this.$list);
    this.$tabContent.append(this.$filebrowser);

    $('.file-browser-item', this.$list).on('click', (e: any) => {
      
      let $ele = $(e.currentTarget);
      this.$selected_ele = $ele;

      this.archive.getRawResource($ele.data('resref'), $ele.data('restype'), (buffer: Buffer) => {
        FileTypeManager.onOpenResource(new EditorFile({resref: $ele.data('resref'), reskey: $ele.data('restype'), buffer: buffer }));
      });

    });

    $('.file-browser-item', this.$list).on('contextmenu', (e: any) => {
      e.preventDefault();
      let $ele = $(e.currentTarget);
      this.$selected_ele = $ele;
      console.log('contextItem', {resref: $ele.data('resref'), reskey: $ele.data('restype')});
      this.contextMenu.popup({ window: remote.getCurrentWindow() });
    });

  }

  OpenFile(file: EditorFile){

    if(file instanceof EditorFile){

      switch(ResourceTypes.getKeyByValue(file.reskey)){
        case 'mod':
        case 'erf':
        case 'sav':

          file.readFile( (buffer: Buffer) => {
            console.log(file, buffer);
            new ERFObject(buffer, (erf: ERFObject) => {
              this.archive = erf;
    
              if(typeof this.archive.file != 'string')
                this.archive.file = file.resref + '.' + ResourceTypes.getKeyByValue(file.reskey);
    
              console.log('ERF Tab', this.archive);
              this.init();
            });
          });
        
        break;
        default:
          throw 'File is not a valid erf/mod archive';
        break;
      }
    }

  }

}
