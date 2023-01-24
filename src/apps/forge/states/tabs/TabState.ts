import { EditorFile } from "../../EditorFile";
import { EditorTabManager } from "../../managers/EditorTabManager";

export class TabState {
  static dropdownId: any;
  template: any = '';
  isDestroyed: boolean;
  id: any;
  tabManager: any;
  visible: boolean;
  tabName: string = 'Unnamed Tab';
  resource: any;
  isClosable: boolean = true;
  // tabLoader: LoadingScreen;
  toolbar: any;
  _tabClickEvent: any;
  _tabCloseClickEvent: any;
  gff: any;
  singleInstance: boolean;
  file: EditorFile;
  
  tabView: any;
  tabContentView: any;

  constructor(options: any = {}){
    this.isDestroyed = true;
    options = Object.assign({
      enableLayoutContainers: false,
      toolbar: undefined,
      closeable: true,
      editorFile: undefined
    }, options);

    if(options.editorFile instanceof EditorFile){
      this.file = options.editorFile;
    }

    this.id = EditorTabManager.GetNewTabID();
    this.tabManager = null;
    this.visible = false;
    this.resource = null;
    
    if(options.closeable){
      this.isClosable = options.closeable;
    }

    this.toolbar = options.toolbar;
    if(typeof this.toolbar != 'undefined' && typeof this.toolbar == 'object'){
      // this.BuildToolbar();
    }

    if(this.file instanceof EditorFile){
      this.file.setOnSavedStateChanged( () => {
        this.editorFileUpdated();
      });
    }
    this.editorFileUpdated();
  }

  attachTabView(view: any){
    console.log('attach', view);
    this.tabView = view;
  }

  attachTabContentView(view: any){
    this.tabContentView = view;
  }

  editorFileUpdated(){
    if(this.file instanceof EditorFile){
      console.log('editor file updated', this.file.resref, this.file.ext, this.file)
      if(this.file.unsaved_changes){
        this.tabName = (`${this.file.resref}.${this.file.ext} *`);
      }else{
        this.tabName =(`${this.file.resref}.${this.file.ext}`);
      }
    }
  }

  render(){
    if(this.tabContentView){
      return this.tabContentView.render();
    }
    return ('');
  }

  InvalidateStyles(){

  }

  GetResourceID(): any{
    return;
  }

  getFile(): EditorFile {
    return this.file;
  }

  getExportBuffer(): Buffer {
    return this.file.buffer ? this.file.buffer : Buffer.allocUnsafe(0);
  }

  Show(){
    this.tabManager.HideAll();
    this.visible = true;

    this.tabManager.currentTab = this;
  }

  Hide(){
    this.visible = false;
  }

  Remove(){
    this.visible = false;
    this.tabManager.RemoveTab(this);
    this.onRemove();
  }

  Attach(tabManager: EditorTabManager){
    this.tabManager = tabManager;
    this.isDestroyed = false;
    // this.InitDOMEvents();
  }

  Destroy() {}

  onResize() {
    // this.updateLayoutContainers();
  }

  onRemove(){
    // if(Forge.Project instanceof Project){
    //   Forge.Project.removeFromOpenFileList(this.file);
    // }
    this.onDestroy();
  }

  onDestroy(){
    this.isDestroyed = true;
  }

  ElementId(str: string){
    return str+'-'+this.id;
  }

  onKeyUp(e: any){
    //
  }

  onKeyDown(e: any){
    //
  }

  onKeyPress(e: any){
    //
  }
}