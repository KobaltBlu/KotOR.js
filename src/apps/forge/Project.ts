import { EditorFile } from "./EditorFile";
import { DeepObject } from "../../utility/DeepObject";
import { ForgeState } from "./states/ForgeState";
import { TabModuleEditorState, TabQuickStartState } from "./states/tabs";

import * as KotOR from "./KotOR";
import { ProjectType } from "./enum/ProjectType";
import { FileTypeManager } from "./FileTypeManager";
import { ProjectFileSystem } from "./ProjectFileSystem";
import { ForgeFileSystem } from "./ForgeFileSystem";
import { ProjectSettings } from "./interfaces/ProjectSettings";
import { ForgeArea } from "./module-editor/ForgeArea";
import { ForgeModule } from "./module-editor/ForgeModule";

const DIR_FORGE = '.forge';
const DIR_RESOURCES = 'resources';

export class Project {

  static base_dir: string = 'forge';
  static project_assets_dir: string = 'assets';
  dir: string = '';

  className: string;
  files: any[];
  settings: ProjectSettings = {} as ProjectSettings;
  moduleEditor: TabModuleEditorState | undefined;
  module: ForgeModule | undefined;

  module_ifo: EditorFile | undefined;
  module_are: EditorFile | undefined;
  module_git: EditorFile | undefined;
  module_lyt: EditorFile | undefined;
  module_vis: EditorFile | undefined;

  static Types: any;

  constructor(){
    console.log("Project Class");
    this.className = "Project";
    this.files = [];
    this.settings = DeepObject.Merge(defaults, {});
  }
  
  static OpenByDirectory() {
    ForgeFileSystem.OpenDirectory().then( async (response) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(response.paths && response.paths.length){
          ProjectFileSystem.rootDirectoryPath = response.paths[0];
          ForgeState.project = new Project();
          const loaded = await ForgeState.project.load();
          if(loaded){
            await ProjectFileSystem.initializeProjectExplorer();
          }
        }
      }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
        if(response.handles && response.handles.length){
          ProjectFileSystem.rootDirectoryHandle = response.handles[0] as FileSystemDirectoryHandle;
          console.log('ProjectFileSystem.rootDirectoryHandle', ProjectFileSystem.rootDirectoryHandle);
          ForgeState.project = new Project();
          const loaded = await ForgeState.project.load();
          if(loaded){
            await ProjectFileSystem.initializeProjectExplorer();
          }
        }
      }
    });
  }

  //Save any altered files in the project
  save(){

  }

  //Closes the current project
  close(){

  }

  async load(): Promise<boolean> {
    const loaded = await this.loadSettings();
    if(!loaded){
      return false;
    }

    await this.initModule();

    return true;
  }

  async initModule(): Promise<boolean> {
    this.module_ifo = undefined;
    this.module_are = undefined;
    this.module_git = undefined;
    this.module_lyt = undefined;
    this.module_vis = undefined;
    //check if the module.ifo file exists
    if ( !await ProjectFileSystem.exists('module.ifo') ) {
      return false;
    }

    //
    this.module_ifo = await ProjectFileSystem.openEditorFile('module.ifo');
    if(!this.module_ifo){ return false; }

    //load the ifo file
    if(this.module_ifo){
      await this.module_ifo.readFile();
    }

    const ifo = new KotOR.GFFObject(this.module_ifo.buffer);
    if(!ifo.RootNode.hasField('Mod_Area_list')){
      return false;
    }

    const area_struct = ifo.RootNode.getFieldByLabel('Mod_Area_list')?.getChildStructs()[0];
    if(!area_struct){ return false; }

    const area_name = area_struct.getFieldByLabel('Area_Name')?.getValue();
    if(!area_name){ return false; }

    this.module_are = await ProjectFileSystem.openEditorFile(`${area_name}.are`);
    const are_response = await this.module_are.readFile();

    this.module_git = await ProjectFileSystem.openEditorFile(`${area_name}.git`);
    const git_response = await this.module_git.readFile();

    return true;
  }

  async loadSettings(): Promise<boolean> {
    if(!await ProjectFileSystem.exists(`${DIR_FORGE}`)){
      await ProjectFileSystem.mkdir(`${DIR_FORGE}`, { recursive: false });
    }

    if ( !await ProjectFileSystem.exists(`${DIR_FORGE}/settings.json`) ) {
      console.warn('Project.loadSettings', `creating default settings file: ${DIR_FORGE}/settings.json`);
      this.settings = DeepObject.Merge(defaults, {});
      ProjectFileSystem.writeFile(`${DIR_FORGE}/settings.json`, new TextEncoder().encode(JSON.stringify(this.settings, null, "\t")));
      return true;
    }

    try{
      const buffer = await ProjectFileSystem.readFile(`${DIR_FORGE}/settings.json`);
      let decoder = new TextDecoder('utf8');
      this.settings = JSON.parse(
        decoder.decode(buffer)
      );

      if(typeof this.settings != 'object'){
        console.warn('Project.loadSettings', `Malformed ${DIR_FORGE}/settings.json file data: ${this.settings}`);
        this.settings = {} as ProjectSettings;
      }

      this.settings = DeepObject.Merge(defaults, this.settings);
      return true;
    }catch(e){
      console.error('Project.loadSettings: Failed to load settings file', e);
      alert('Project.loadSettings: Failed to load settings file');
      this.settings = DeepObject.Merge(defaults, {});
      return false;
    }
  }

  //Opens a project from it's location
  async open(deferInit = false){
    //load project.json
    await this.load();
    try{
      console.log('project', this.settings);

      const quickStart = ForgeState.tabManager.getTabByType(TabQuickStartState.name);
      if(quickStart){
        console.log(quickStart);
        ForgeState.tabManager.removeTab(quickStart);
      }

      await KotOR.GameInitializer.Init(this.settings.game);
      //This is where we initialize ProjectType specific operations
      if(!deferInit){
        await this.initializeProject();
      }

      ForgeState.project = this;
    }catch(e){
      console.error(e);
      alert('Project Open Failed');
    }

  }

  async initializeProject(){
    switch(this.settings.type){
      case ProjectType.MODULE:
        //Initialize the Map Editor
        if(this.settings.module_editor.open)
          await this.initEditor();
      break;
      case ProjectType.OTHER:
        //TODO: Implement other project types
      break;
    }
    console.log('Project Init');

    //Reopen files
    for(let i = 0, len = this.settings.open_files.length; i < len; i++){
      FileTypeManager.onOpenResource(this.settings.open_files[i]);
    }

  }

  //Exports the finished project to a .mod file
  export(){

  }

  /**
   * Creates a new THREE.js Engine and initialize the scene
   */
  async initEditor() {
    this.moduleEditor = new TabModuleEditorState();
    ForgeState.tabManager.addTab(this.moduleEditor);
    this.moduleEditor.module = await TabModuleEditorState.FromProject(this);
    this.moduleEditor.module?.setContext(this.moduleEditor.ui3DRenderer);
    await this.moduleEditor.module?.load();
  }

  openModuleEditor(){
    if(this.moduleEditor instanceof TabModuleEditorState){
      ForgeState.tabManager.addTab(this.moduleEditor);
      this.moduleEditor.show();
    }else{
      this.initEditor();
    }
  }

  getTemplatesByType ( restype = '' ) {
    let files: any[] = [];

    for(let i = 0; i < this.files.length; i++){
      if(this.files[i].ext == restype)
        files.push(this.files[i]);
    }

    return files;
  }

  addToOpenFileList(editor_file: EditorFile){
    if(editor_file instanceof EditorFile){
      if(editor_file.getPath()){
        let index = this.settings.open_files.indexOf(editor_file.getPath());
        if(index == -1){
          this.settings.open_files.push(editor_file.getPath());
          this.saveSettings();
        }
      }else{
        //TODO Handle In Memory EditorFiles
      }
    }
  }

  removeFromOpenFileList(editor_file: EditorFile){
    if(editor_file instanceof EditorFile){
      if(editor_file.getPath()){
        let index = this.settings.open_files.indexOf(editor_file.getPath());
        if(index >= 0){
          this.settings.open_files.splice(index, 1);
          this.saveSettings();
        }
      }else{
        //TODO Handle In Memory EditorFiles
      }
    }
  }

  async buildModuleAndArea(name: string, areaName: string = 'm01aa', rooms: { roomName: string, envAudio: number, ambientScale: number }[] = []){
    const mod = new ForgeModule(new KotOR.GFFObject());
    mod.name.addSubString(name, 0); // Male English (StringID 0 = language 0, gender 0)
    
    /**
     * Build the entry area
     */
    const area = new ForgeArea(new KotOR.GFFObject(), new KotOR.GFFObject());
    area.name.addSubString(areaName, 0); // Male English (StringID 0 = language 0, gender 0)
    for(let i = 0, len = rooms.length; i < len; i++){
      const room = new KotOR.ModuleRoom(rooms[i].roomName, area as any);
      room.setEnvAudio(rooms[i].envAudio);
      room.setAmbientScale(rooms[i].ambientScale);
      area.rooms.push(room);
    }
    mod.areas = [area];
    mod.entryArea = areaName;

    const ifo = mod.exportToIFO();
    const are = area.exportToARE();
    const git = area.exportToGIT();
    await ProjectFileSystem.writeFile(`module.ifo`, ifo.getExportBuffer());
    await ProjectFileSystem.writeFile(`${areaName}.are`, are.getExportBuffer());
    await ProjectFileSystem.writeFile(`${areaName}.git`, git.getExportBuffer());

    return { ifo, are, git };
  }

  async saveSettings(){
    if(!await ProjectFileSystem.exists(`${DIR_FORGE}`)){
      await ProjectFileSystem.mkdir(`${DIR_FORGE}`, { recursive: false });
    }
    try{
      const encoder = new TextEncoder();
      const saved = await ProjectFileSystem.writeFile(
        `${DIR_FORGE}/settings.json`, encoder.encode( JSON.stringify(this.settings, null, "\t") )
      );
      if(!saved){
        console.error('Project.saveSettings');
        return;
      }
    }catch(e){
      console.error('Project.saveSettings', e);
    }
  }

}

const defaults: any = {
  name: '',
  game: 1,
  type: 1,
  module_editor: {
    open: false
  },
  open_files: [],
}
