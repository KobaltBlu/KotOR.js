import { EditorFile } from "@/apps/forge/EditorFile";
import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { ForgeFileSystem } from "@/apps/forge/ForgeFileSystem";
import { ProjectSettings } from "@/apps/forge/interfaces/ProjectSettings";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeArea } from "@/apps/forge/module-editor/ForgeArea";
import { ForgeModule } from "@/apps/forge/module-editor/ForgeModule";
import { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabModuleEditorState, TabQuickStartState } from "@/apps/forge/states/tabs";
import { DeepObject } from "@/utility/DeepObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

const DIR_FORGE = '.forge';
const DIR_BLUEPRINTS = 'blueprints';
const DIR_MODELS = 'models';
const DIR_TEXTURES = 'textures';
const DIR_DIALOGS = 'dialogs';
const _DIR_SOUNDS = 'sounds';
const _DIR_MUSIC = 'music';
const DIR_SCRIPTS = 'scripts';

export class Project {

  static base_dir: string = 'forge';
  static project_assets_dir: string = 'assets';
  dir: string = '';

  className: string;
  files: EditorFile[] = [];
  settings: ProjectSettings = {} as ProjectSettings;
  moduleEditor: TabModuleEditorState | undefined;
  module: ForgeModule | undefined;

  module_ifo: EditorFile | undefined;
  module_are: EditorFile | undefined;
  module_git: EditorFile | undefined;
  module_lyt: EditorFile | undefined;
  module_vis: EditorFile | undefined;

  static Types: Record<string, unknown>;

  constructor(){
    log.trace('Project constructor');
    this.className = "Project";
    this.files = [];
    this.settings = DeepObject.Merge(defaults, {});
    log.debug("Project Class initialized");
  }

  static OpenByDirectory() {
    log.trace('Project.OpenByDirectory()');
    ForgeFileSystem.OpenDirectory().then( async (response) => {
      log.trace('Project.OpenByDirectory() response', !!response.paths, !!response.handles);
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(response.paths && response.paths.length){
          const projectPath = response.paths[0];
          log.debug('Project.OpenByDirectory() ELECTRON path', projectPath);
          ProjectFileSystem.rootDirectoryPath = projectPath;
          ForgeState.project = new Project();
          const loaded = await ForgeState.project.load();
          log.trace('Project.OpenByDirectory() load result', loaded);
          if(loaded){
            await ProjectFileSystem.initializeProjectExplorer();
            ForgeState.addRecentProject(projectPath);
            log.info('Project.OpenByDirectory() ELECTRON complete');
          }
        } else {
          log.trace('Project.OpenByDirectory() ELECTRON no paths');
        }
      }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
        if(response.handles && response.handles.length){
          const handle = response.handles[0] as FileSystemDirectoryHandle;
          log.debug('Project.OpenByDirectory() BROWSER handle', handle?.name);
          ProjectFileSystem.rootDirectoryHandle = handle;
          ForgeState.project = new Project();
          const loaded = await ForgeState.project.load();
          log.trace('Project.OpenByDirectory() load result', loaded);
          if(loaded){
            await ProjectFileSystem.initializeProjectExplorer();
            await ForgeState.addRecentProject(handle);
            log.info('Project.OpenByDirectory() BROWSER complete');
          }
        } else {
          log.trace('Project.OpenByDirectory() BROWSER no handles');
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
    log.trace('Project.load()');
    await this.initDirectoryStructure();
    log.trace('Project.load() initDirectoryStructure done');
    const loaded = await this.loadSettings();
    log.trace('Project.load() loadSettings', loaded);
    if(!loaded){
      log.warn('Project.load() loadSettings failed');
      return false;
    }

    await this.initModule();
    log.debug('Project.load() initModule done');
    return true;
  }

  async initModule(): Promise<boolean> {
    log.trace('Project.initModule()');
    this.module_ifo = undefined;
    this.module_are = undefined;
    this.module_git = undefined;
    this.module_lyt = undefined;
    this.module_vis = undefined;
    if ( !await ProjectFileSystem.exists('module.ifo') ) {
      log.trace('Project.initModule() module.ifo not found');
      return false;
    }
    log.trace('Project.initModule() opening module.ifo');
    this.module_ifo = await ProjectFileSystem.openEditorFile('module.ifo');
    if(!this.module_ifo){ log.warn('Project.initModule() openEditorFile failed'); return false; }

    if(this.module_ifo){
      await this.module_ifo.readFile();
      log.trace('Project.initModule() readFile done');
    }

    const ifo = new KotOR.GFFObject(this.module_ifo.buffer);
    if(!ifo.RootNode.hasField('Mod_Area_list')){
      log.trace('Project.initModule() no Mod_Area_list');
      return false;
    }

    const area_struct = ifo.RootNode.getFieldByLabel('Mod_Area_list')?.getChildStructs()[0];
    if(!area_struct){ log.trace('Project.initModule() no area_struct'); return false; }

    const area_name = area_struct.getFieldByLabel('Area_Name')?.getValue();
    if(!area_name){ log.trace('Project.initModule() no area_name'); return false; }
    log.debug('Project.initModule() area_name', area_name);

    this.module_are = await ProjectFileSystem.openEditorFile(`${area_name}.are`);
    await this.module_are.readFile();
    log.trace('Project.initModule() are read');

    this.module_git = await ProjectFileSystem.openEditorFile(`${area_name}.git`);
    await this.module_git.readFile();
    log.trace('Project.initModule() git read');
    log.info('Project.initModule() complete');
    return true;
  }

  async loadSettings(): Promise<boolean> {
    log.trace('Project.loadSettings()');
    if(!await ProjectFileSystem.exists(`${DIR_FORGE}`)){
      log.trace('Project.loadSettings() creating .forge');
      await ProjectFileSystem.mkdir(`${DIR_FORGE}`, { recursive: false });
    }

    if ( !await ProjectFileSystem.exists(`${DIR_FORGE}/settings.json`) ) {
      log.warn('Project.loadSettings', `creating default settings file: ${DIR_FORGE}/settings.json`);
      this.settings = DeepObject.Merge(defaults, {});
      await ProjectFileSystem.writeFile(`${DIR_FORGE}/settings.json`, new TextEncoder().encode(JSON.stringify(this.settings, null, "\t")));
      log.debug('Project.loadSettings() default settings written');
      return true;
    }

    try{
      log.trace('Project.loadSettings() reading settings.json');
      const buffer = await ProjectFileSystem.readFile(`${DIR_FORGE}/settings.json`);
      const decoder = new TextDecoder('utf8');
      const parsed: unknown = JSON.parse(decoder.decode(buffer));

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        log.warn('Project.loadSettings', `Malformed ${DIR_FORGE}/settings.json file data`);
        this.settings = DeepObject.Merge(defaults, {}) as ProjectSettings;
      } else {
        this.settings = DeepObject.Merge(defaults, parsed as Record<string, unknown>) as ProjectSettings;
      }
      log.trace('Project.loadSettings() merge done');
      return true;
    }catch(e){
      log.error('Project.loadSettings: Failed to load settings file', e);
      alert('Project.loadSettings: Failed to load settings file');
      this.settings = DeepObject.Merge(defaults, {});
      return false;
    }
  }

  //Opens a project from it's location
  async open(deferInit = false){
    log.trace('Project.open()', deferInit);
    await this.load();
    try{
      log.debug('project', this.settings);

      const quickStart = ForgeState.tabManager.getTabByType(TabQuickStartState.name);
      if(quickStart){
        log.trace('Project.open() removing quickStart tab');
        ForgeState.tabManager.removeTab(quickStart);
      }

      log.trace('Project.open() GameInitializer.Init');
      await KotOR.GameInitializer.Init(this.settings.game);
      if(!deferInit){
        log.trace('Project.open() initializeProject');
        await this.initializeProject();
      }

      ForgeState.project = this;
      log.trace('Project.open() addRecentProject');
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(ProjectFileSystem.rootDirectoryPath){
          await ForgeState.addRecentProject(ProjectFileSystem.rootDirectoryPath);
        }
      } else {
        if(ProjectFileSystem.rootDirectoryHandle){
          await ForgeState.addRecentProject(ProjectFileSystem.rootDirectoryHandle);
        }
      }
      log.info('Project.open() complete');
    }catch(e){
      log.error(e as Error);
      alert('Project Open Failed');
    }
  }

  async initializeProject(){
    log.trace('Project.initializeProject()', this.settings.type);
    switch(this.settings.type){
      case ProjectType.MODULE:
        if(this.settings.module_editor.open){
          log.trace('Project.initializeProject() initEditor');
          await this.initEditor();
        }
      break;
      case ProjectType.OTHER:
        log.trace('Project.initializeProject() OTHER type');
      break;
    }
    log.debug('Project Init');

    const openLen = this.settings.open_files?.length ?? 0;
    log.trace('Project.initializeProject() reopen files', openLen);
    for(let i = 0, len = openLen; i < len; i++){
      FileTypeManager.onOpenResource(this.settings.open_files[i]);
    }
    log.trace('Project.initializeProject() done');
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
    log.trace('Project.initEditor()');
    this.moduleEditor = new TabModuleEditorState();
    ForgeState.tabManager.addTab(this.moduleEditor);
    log.trace('Project.initEditor() FromProject');
    this.moduleEditor.module = await TabModuleEditorState.FromProject(this);
    this.moduleEditor.module?.setContext(this.moduleEditor.ui3DRenderer);
    await this.moduleEditor.module?.load();
    log.info('Project.initEditor() complete');
  }

  openModuleEditor(){
    log.trace('Project.openModuleEditor()');
    if(this.moduleEditor instanceof TabModuleEditorState){
      ForgeState.tabManager.addTab(this.moduleEditor);
      this.moduleEditor.show();
      log.trace('Project.openModuleEditor() showed existing');
    }else{
      log.trace('Project.openModuleEditor() initEditor');
      this.initEditor();
    }
  }

  getTemplatesByType ( restype = '' ) {
    const files: EditorFile[] = [];

    for(let i = 0; i < this.files.length; i++){
      if(this.files[i].ext == restype)
        files.push(this.files[i]);
    }

    return files;
  }

  addToOpenFileList(editor_file: EditorFile){
    if(editor_file instanceof EditorFile){
      if(editor_file.getPath()){
        const index = this.settings.open_files.indexOf(editor_file.getPath());
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
        const index = this.settings.open_files.indexOf(editor_file.getPath());
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
    log.trace('Project.initDirectoryStructure()');
    if(!await ProjectFileSystem.exists(`${DIR_BLUEPRINTS}`)){
      log.debug('Creating directory', `./${DIR_BLUEPRINTS}/`);
      await ProjectFileSystem.mkdir(`${DIR_BLUEPRINTS}`, { recursive: false });
    }
    if(!await ProjectFileSystem.exists(`${DIR_MODELS}`)){
      log.debug('Creating directory', `./${DIR_MODELS}/`);
      await ProjectFileSystem.mkdir(`${DIR_MODELS}`, { recursive: false });
    }
    if(!await ProjectFileSystem.exists(`${DIR_TEXTURES}`)){
      log.debug('Creating directory', `./${DIR_TEXTURES}/`);
      await ProjectFileSystem.mkdir(`${DIR_TEXTURES}`, { recursive: false });
    }
    if(!await ProjectFileSystem.exists(`${DIR_DIALOGS}`)){
      log.debug('Creating directory', `./${DIR_DIALOGS}/`);
      await ProjectFileSystem.mkdir(`${DIR_DIALOGS}`, { recursive: false });
    }
    // if(!await ProjectFileSystem.exists(`${DIR_SOUNDS}`)){
    //   await ProjectFileSystem.mkdir(`${DIR_SOUNDS}`, { recursive: false });
    // }
    // if(!await ProjectFileSystem.exists(`${DIR_MUSIC}`)){
    //   await ProjectFileSystem.mkdir(`${DIR_MUSIC}`, { recursive: false });
    // }
    if(!await ProjectFileSystem.exists(`${DIR_SCRIPTS}`)){
      log.debug('Creating directory', `./${DIR_SCRIPTS}/`);
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
        log.error('Project.saveSettings');
        return;
      }
    }catch(e){
      log.error('Project.saveSettings', e as Error);
    }
  }

}

const defaults: ProjectSettings = {
  name: '',
  game: 1 as ProjectSettings['game'],
  type: 1 as ProjectSettings['type'],
  module_editor: {
    open: false
  },
  open_files: [],
};
