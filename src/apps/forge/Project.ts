import { EditorFile } from "@/apps/forge/EditorFile";
import { DeepObject } from "@/utility/DeepObject";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabModuleEditorState, TabQuickStartState } from "@/apps/forge/states/tabs";

import * as KotOR from "@/apps/forge/KotOR";
import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeFileSystem } from "@/apps/forge/ForgeFileSystem";
import { ProjectSettings } from "@/apps/forge/interfaces/ProjectSettings";
import { ForgeArea } from "@/apps/forge/module-editor/ForgeArea";
import { ForgeModule } from "@/apps/forge/module-editor/ForgeModule";
import { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";
import { ForgeInitializer } from "@/apps/forge/ForgeInitializer";

const DIR_FORGE = '.forge';
const DIR_BLUEPRINTS = 'blueprints';
const DIR_MODELS = 'models';
const DIR_TEXTURES = 'textures';
const DIR_DIALOGS = 'dialogs';
const DIR_SOUNDS = 'sounds';
const DIR_MUSIC = 'music';
const DIR_SCRIPTS = 'scripts';

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
          ProjectFileSystem.clearDirectoryCache();
          const projectPath = response.paths[0];
          ProjectFileSystem.rootDirectoryPath = projectPath;
          const project = new Project();
          await project.open();
          if(ForgeState.project instanceof Project){
            await ProjectFileSystem.initializeProjectExplorer();
          }
        }
      }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
        if(response.handles && response.handles.length){
          ProjectFileSystem.clearDirectoryCache();
          const handle = response.handles[0] as FileSystemDirectoryHandle;
          ProjectFileSystem.rootDirectoryHandle = handle;
          console.log('ProjectFileSystem.rootDirectoryHandle', ProjectFileSystem.rootDirectoryHandle);
          const project = new Project();
          await project.open();
          if(ForgeState.project instanceof Project){
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
    await this.initDirectoryStructure();
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

      const rawOpen = Array.isArray(this.settings.open_files)
        ? (this.settings.open_files as unknown[]).filter((entry) => typeof entry === 'string') as string[]
        : [];
      const sanitized = this.sanitizePersistedOpenFilesReferences(rawOpen);
      if(JSON.stringify(sanitized) !== JSON.stringify(rawOpen)){
        this.settings.open_files = sanitized;
        await this.saveSettings();
      }

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

      await ForgeInitializer.Init(this.settings.game);
      //This is where we initialize ProjectType specific operations
      if(!deferInit){
        await this.initializeProject();
      }

      ForgeState.project = this;

      // Add to recent projects
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(ProjectFileSystem.rootDirectoryPath){
          await ForgeState.addRecentProject(ProjectFileSystem.rootDirectoryPath);
        }
      } else {
        if(ProjectFileSystem.rootDirectoryHandle){
          await ForgeState.addRecentProject(ProjectFileSystem.rootDirectoryHandle);
        }
      }
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

    for(let i = 0, len = this.settings.open_files.length; i < len; i++){
      const uri = String(this.settings.open_files[i] ?? '').trim();
      if(!uri.length){ continue }
      if(!EditorFile.isValidForgePersistedReference(uri)){
        console.warn('Project.initializeProject: skipping invalid open_files entry', uri);
        continue;
      }
      FileTypeManager.onOpenResource(uri);
    }

  }

  /** Exports the finished project to a .mod file. Override or extend for full build. */
  export(){
    if (this.moduleEditor?.module) {
      // Module editor holds the built module; full export would serialize to .mod here.
    }
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

  /** Keep only canonical Forge references; persists when the sanitized list differs from disk. */
  private sanitizePersistedOpenFilesReferences(entries: string[]): string[]{
    const seen = new Set<string>();
    const out: string[] = [];
    for(let i = 0; i < entries.length; i++){
      const t = String(entries[i] ?? '').trim();
      if(!t.length){
        continue;
      }
      if(!EditorFile.isValidForgePersistedReference(t)){
        console.warn(`Project.settings: dropping invalid open_files entry (${t}).`);
        continue;
      }
      if(seen.has(t)){
        continue;
      }
      seen.add(t);
      out.push(t);
    }
    return out;
  }

  addToOpenFileList(editor_file: EditorFile){
    if(editor_file instanceof EditorFile){
      const ref = editor_file.toReferenceURI();
      if(!EditorFile.isValidForgePersistedReference(ref || '')){ return }

      const beforeJson = JSON.stringify(this.settings.open_files);
      const next = [...this.settings.open_files.filter((entry: string) => entry !== ref), ref];
      this.settings.open_files = next;
      if(JSON.stringify(this.settings.open_files) !== beforeJson){
        this.saveSettings();
      }
    }
  }

  removeFromOpenFileList(editor_file: EditorFile){
    if(editor_file instanceof EditorFile){
      const ref = editor_file.toReferenceURI();
      if(!ref?.length){ return }

      const before = this.settings.open_files.length;
      this.settings.open_files = this.settings.open_files.filter((entry: string) => entry !== ref);
      if(this.settings.open_files.length !== before){
        this.saveSettings();
      }
    }
  }

  async buildModuleAndArea(name: string, areaName: string = 'm01aa', rooms: { roomName: string, envAudio: number, ambientScale: number }[] = []){
    const mod = new ForgeModule();
    mod.name.addSubString(name, 0); // Male English (StringID 0 = language 0, gender 0)

    /**
     * Build the entry area
     */
    const area = new ForgeArea();
    area.name.addSubString(areaName, 0); // Male English (StringID 0 = language 0, gender 0)
    for(let i = 0, len = rooms.length; i < len; i++){
      const room = new ForgeRoom(rooms[i].roomName);
      room.setArea(area);
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

  async initDirectoryStructure(){
    if(!await ProjectFileSystem.exists(`${DIR_BLUEPRINTS}`)){
      console.log('Creating directory', `./${DIR_BLUEPRINTS}/`);
      await ProjectFileSystem.mkdir(`${DIR_BLUEPRINTS}`, { recursive: false });
    }
    if(!await ProjectFileSystem.exists(`${DIR_MODELS}`)){
      console.log('Creating directory', `./${DIR_MODELS}/`);
      await ProjectFileSystem.mkdir(`${DIR_MODELS}`, { recursive: false });
    }
    if(!await ProjectFileSystem.exists(`${DIR_TEXTURES}`)){
      console.log('Creating directory', `./${DIR_TEXTURES}/`);
      await ProjectFileSystem.mkdir(`${DIR_TEXTURES}`, { recursive: false });
    }
    if(!await ProjectFileSystem.exists(`${DIR_DIALOGS}`)){
      console.log('Creating directory', `./${DIR_DIALOGS}/`);
      await ProjectFileSystem.mkdir(`${DIR_DIALOGS}`, { recursive: false });
    }
    // if(!await ProjectFileSystem.exists(`${DIR_SOUNDS}`)){
    //   await ProjectFileSystem.mkdir(`${DIR_SOUNDS}`, { recursive: false });
    // }
    // if(!await ProjectFileSystem.exists(`${DIR_MUSIC}`)){
    //   await ProjectFileSystem.mkdir(`${DIR_MUSIC}`, { recursive: false });
    // }
    if(!await ProjectFileSystem.exists(`${DIR_SCRIPTS}`)){
      console.log('Creating directory', `./${DIR_SCRIPTS}/`);
      await ProjectFileSystem.mkdir(`${DIR_SCRIPTS}`, { recursive: false });
    }
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
