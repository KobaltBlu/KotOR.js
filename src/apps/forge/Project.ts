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
  module: KotOR.Module | undefined;

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
    const ifo = this.generateNewModule(name, areaName);
    const are = this.generateNewArea(areaName, rooms);
    const git = this.generateNewGit();
    await ProjectFileSystem.writeFile(`module.ifo`, ifo.getExportBuffer());
    await ProjectFileSystem.writeFile(`${areaName}.are`, are.getExportBuffer());
    await ProjectFileSystem.writeFile(`${areaName}.git`, git.getExportBuffer());

    return { ifo, are, git };
  }

  generateNewModule(name: string, areaName: string = 'm01aa'){
    const ifo = new KotOR.GFFObject();
    ifo.FileType = 'IFO ';

    // Expansion_Pack
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Expansion_Pack', 0));

    // Mod_Area_list - KotOR only supports one Area per module
    const areaList = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_Area_list'))!;
    const areaStruct = new KotOR.GFFStruct(6);
    areaStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Area_Name', areaName));
    areaList.addChildStruct(areaStruct);

    // Mod_Creator_ID
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Mod_Creator_ID', 2));

    // Mod_CutSceneList
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_CutSceneList'));

    // Mod_DawnHour
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_DawnHour', 6));

    // Mod_Description
    const modDescriptionField = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Mod_Description'))!;
    modDescriptionField.setCExoLocString(new KotOR.CExoLocString());

    // Mod_DuskHour
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_DuskHour', 18));

    // Mod_Entry_Area
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_Entry_Area', areaName));

    // Mod_Entry_Dir_X, Mod_Entry_Dir_Y
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Dir_X', 0));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Dir_Y', 1));

    // Mod_Entry_X, Mod_Entry_Y, Mod_Entry_Z
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_X', 0.00));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Y', 0.00));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Mod_Entry_Z', 0.00));

    // Mod_Expan_List
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_Expan_List'));

    // Mod_GVar_List
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_GVar_List'));

    // Mod_Hak
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Mod_Hak', ''));

    // Mod_ID (BINARY/VOID)
    const modIdField = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.VOID, 'Mod_ID'))!;
    modIdField.setData(new Uint8Array(16));

    // Mod_IsSaveGame
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_IsSaveGame', 0));

    // Mod_MinPerHour
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_MinPerHour', 2));

    // Mod_Name
    const modNameField = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Mod_Name'))!;
    const modNameLocString = new KotOR.CExoLocString();
    modNameLocString.addSubString(name, 0); // Male English (StringID 0 = language 0, gender 0)
    modNameField.setCExoLocString(modNameLocString);

    // Event Handler Scripts (all RESREF)
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnAcquirItem', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnActvtItem', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnClientEntr', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnClientLeav', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnHeartbeat', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnModLoad', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnModStart', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrDeath', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrDying', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrLvlUp', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnPlrRest', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnSpawnBtnDn', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnUnAqreItem', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_OnUsrDefined', ''));

    // Start Date/Time
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_StartDay', 1));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_StartHour', 13));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_StartMonth', 6));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Mod_StartMovie', ''));
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Mod_StartYear', 1372));

    // Mod_Tag
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Mod_Tag', ''));

    // Mod_VO_ID
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Mod_VO_ID', 'm1an'));

    // Mod_Version
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Mod_Version', 3));

    // Mod_XPScale
    ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Mod_XPScale', 10));

    return ifo;
  }

  generateNewArea(name: string, rooms: { roomName: string, envAudio: number, ambientScale: number }[] = []){
    const are = new KotOR.GFFObject();
    are.FileType = 'ARE ';

    // AlphaTest
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'AlphaTest', 0.0));

    // CameraStyle
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'CameraStyle', 0));

    // ChanceLightning
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceLightning', 0));

    // ChanceRain
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceRain', 0));

    // ChanceSnow
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceSnow', 0));

    // Comments
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comments', ''));

    // Creator_ID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Creator_ID', 0));

    // DayNightCycle
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DayNightCycle', 0));

    // DefaultEnvMap
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'DefaultEnvMap', ''));

    // DynAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'DynAmbientColor', 0));

    // Expansion_List
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Expansion_List'));

    // Flags
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Flags', 0));

    // Grass_Ambient
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Grass_Ambient', 0));

    // Grass_Density
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Density', 0.0));

    // Grass_Diffuse
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Grass_Diffuse', 0));

    // Grass_Prob_LL
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_LL', 0.0));

    // Grass_Prob_LR
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_LR', 0.0));

    // Grass_Prob_UL
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_UL', 0.0));

    // Grass_Prob_UR
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_UR', 0.0));

    // Grass_QuadSize
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_QuadSize', 0.0));

    // Grass_TexName
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Grass_TexName', ''));

    // ID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ID', 0));

    // IsNight
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'IsNight', 0));

    // LightingScheme
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'LightingScheme', 0));

    // LoadScreenID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.WORD, 'LoadScreenID', 0));

    // Map (STRUCT with nested structure)
    const mapField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Map');
    const mapStruct = new KotOR.GFFStruct(0);
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt1X', 0.0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt1Y', 0.0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt2X', 0.0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MapPt2Y', 0.0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MapResX', 0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MapZoom', 0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'NorthAxis', 0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt1X', 0.0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt1Y', 0.0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt2X', 0.0));
    mapStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'WorldPt2Y', 0.0));
    mapField.addChildStruct(mapStruct);
    are.RootNode.addField(mapField);

    // ModListenCheck
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ModListenCheck', 0));

    // ModSpotCheck
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ModSpotCheck', 0));

    // MoonAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonAmbientColor', 0));

    // MoonDiffuseColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonDiffuseColor', 0));

    // MoonFogColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonFogColor', 0));

    // MoonFogFar
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MoonFogFar', 0.0));

    // MoonFogNear
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MoonFogNear', 0.0));

    // MoonFogOn
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MoonFogOn', 0));

    // MoonShadows
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MoonShadows', 0));

    // Name
    const nameField = are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Name'))!;
    const nameLocString = new KotOR.CExoLocString();
    nameLocString.addSubString(name, 0); // Male English (StringID 0 = language 0, gender 0)
    nameField.setCExoLocString(nameLocString);

    // NoHangBack
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NoHangBack', 0));

    // NoRest
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NoRest', 0));

    // OnEnter
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnEnter', ''));

    // OnExit
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnExit', ''));

    // OnHeartbeat
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', ''));

    // OnUserDefined
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', ''));

    // PlayerOnly
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerOnly', 0));

    // PlayerVsPlayer
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerVsPlayer', 0));

    // Rooms
    const roomsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Rooms');
    for(let i = 0, len = rooms.length; i < len; i++){
      const roomStruct = new KotOR.GFFStruct(3);
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'RoomName', rooms[i].roomName));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'EnvAudio', rooms[i].envAudio));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'AmbientScale', rooms[i].ambientScale));
      roomsField.addChildStruct(roomStruct);
    }
    are.RootNode.addField(roomsField);

    // ShadowOpacity
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'ShadowOpacity', 0));

    // StealthXPEnabled
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'StealthXPEnabled', 0));

    // StealthXPLoss
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'StealthXPLoss', 0));

    // StealthXPMax
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'StealthXPMax', 0));

    // SunAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunAmbientColor', 0));

    // SunDiffuseColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunDiffuseColor', 0));

    // SunFogColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunFogColor', 0));

    // SunFogFar
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'SunFogFar', 0.0));

    // SunFogNear
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'SunFogNear', 0.0));

    // SunFogOn
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SunFogOn', 0));

    // SunShadows
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SunShadows', 0));

    // Tag
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', ''));

    // Unescapable
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Unescapable', 0));

    // Version
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Version', 0));

    // WindPower
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'WindPower', 0));
    
    return are;
  }

  generateNewGit(){
    const git = new KotOR.GFFObject();
    git.FileType = 'GIT ';

    // AreaProperties (STRUCT)
    const areaPropertiesField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'AreaProperties');
    const areaPropertiesStruct = new KotOR.GFFStruct(100);
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndDay', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndDayVol', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndNight', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndNitVol', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'EnvAudio', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicBattle', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicDay', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicDelay', 0));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicNight', 0));
    areaPropertiesField.addChildStruct(areaPropertiesStruct);
    git.RootNode.addField(areaPropertiesField);

    // CameraList
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'CameraList'));

    // Creature List
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Creature List'));

    // Door List
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Door List'));

    // Encounter List
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Encounter List'));

    // List (generic/unnamed list for items)
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'List'));

    // Placeable List
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Placeable List'));

    // SoundList
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SoundList'));

    // StoreList
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'StoreList'));

    // TriggerList
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'TriggerList'));

    // UseTemplates
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'UseTemplates', 0));

    // WaypointList
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'WaypointList'));

    return git;
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
