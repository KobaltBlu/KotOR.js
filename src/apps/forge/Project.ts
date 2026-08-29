import { EditorFile } from "@/apps/forge/EditorFile";
import {
  editorFileProjectRelativePath,
  remapProjectRelativeAfterRename,
} from "@/apps/forge/helpers/editorFileProjectPath";
import { DeepObject } from "@/utility/DeepObject";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabModuleEditorState, TabProjectExplorerState, TabQuickStartState } from "@/apps/forge/states/tabs";
import { RecentProject } from "@/apps/forge/RecentProject";

import * as KotOR from "@/apps/forge/KotOR";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { openImportModuleWizard } from "@/apps/forge/helpers/openImportModuleWizard";
import { packProjectModule } from "@/apps/forge/helpers/exportProjectModule";
import * as fs from "fs";
declare const dialog: any;
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeFileSystem } from "@/apps/forge/ForgeFileSystem";
import { ProjectSettings } from "@/apps/forge/interfaces/ProjectSettings";
import { ForgeArea } from "@/apps/forge/module-editor/ForgeArea";
import { ForgeModule } from "@/apps/forge/module-editor/ForgeModule";
import { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";
import { ForgeInitializer } from "@/apps/forge/ForgeInitializer";
import {
  createOrOpenVirtualProjectFolder,
  isOriginPrivateFileSystemAvailable,
  isProjectDirectoryHandle,
} from "@/apps/forge/virtual/VirtualProjectFolder";

const DIR_FORGE = '.forge';

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
  
  static async attachRootAndOpen(options: {
    path?: string;
    handle?: FileSystemDirectoryHandle;
    virtual?: boolean;
  }): Promise<boolean> {
    ProjectFileSystem.clearDirectoryCache();
    ProjectFileSystem.isVirtual = !!options.virtual;
    ProjectFileSystem.rootDirectoryPath = (options.path || undefined) as any;
    ProjectFileSystem.rootDirectoryHandle = (options.handle || undefined) as any;
    if(!ProjectFileSystem.hasRoot()){
      return false;
    }
    const project = new Project();
    await project.open();
    if(ForgeState.project instanceof Project){
      await ProjectFileSystem.initializeProjectExplorer();
      return true;
    }
    return false;
  }
  
  static OpenByDirectory() {
    ForgeFileSystem.OpenDirectory().then( async (response) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(response.paths && response.paths.length){
          await Project.attachRootAndOpen({ path: response.paths[0], virtual: false });
        }
      }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
        if(response.handles && response.handles.length){
          const handle = response.handles[0] as FileSystemDirectoryHandle;
          console.log('ProjectFileSystem.rootDirectoryHandle', handle);
          await Project.attachRootAndOpen({ handle, virtual: false });
        }
      }
    });
  }

  static async OpenRecent(recentProject: RecentProject): Promise<boolean> {
    if(!recentProject){
      return false;
    }
    try{
      ForgeState.loaderShow();
      if(recentProject.virtual){
        let handle = isProjectDirectoryHandle(recentProject.handle) ? recentProject.handle : undefined;
        if(!handle && recentProject.name){
          const handleKey = `project_handle_${recentProject.getIdentifier()}`;
          try {
            const { get } = await import('idb-keyval');
            handle = await get(handleKey);
          } catch(e) {
            console.warn('Failed to restore handle from IndexedDB:', e);
          }
        }
        if(!isProjectDirectoryHandle(handle)){
          if(isOriginPrivateFileSystemAvailable() && recentProject.name){
            const created = await createOrOpenVirtualProjectFolder(recentProject.name);
            handle = created.handle;
          } else {
            await ForgeState.removeRecentProject(recentProject);
            console.warn('Failed to reopen virtual project.');
            return false;
          }
        }
        const loaded = await Project.attachRootAndOpen({ handle, virtual: true });
        if(!loaded){
          await ForgeState.removeRecentProject(recentProject);
          return false;
        }
        return true;
      }
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        const projectPath = recentProject.path;
        if(!projectPath){
          throw new Error('Project path not available');
        }
        const loaded = await Project.attachRootAndOpen({ path: projectPath, virtual: false });
        if(!loaded){
          await ForgeState.removeRecentProject(recentProject);
          console.warn('Failed to open project. It may have been moved or deleted.');
          return false;
        }
        return true;
      }
      let handle = recentProject.handle;
      if(!handle && recentProject.name){
        const handleKey = `project_handle_${recentProject.getIdentifier()}`;
        try {
          const { get } = await import('idb-keyval');
          handle = await get(handleKey);
        } catch(e) {
          console.warn('Failed to restore handle from IndexedDB:', e);
        }
      }
      if(isProjectDirectoryHandle(handle)){
        try{
          if(typeof handle.queryPermission === 'function'){
            await handle.queryPermission({ mode: 'read' });
          }
          const loaded = await Project.attachRootAndOpen({ handle, virtual: false });
          if(!loaded){
            throw new Error('Project failed to load');
          }
          await ForgeState.addRecentProject(handle);
          return true;
        } catch(permError){
          console.warn('Handle permission denied or invalid, requesting new access:', permError);
          Project.OpenByDirectory();
          return false;
        }
      }
      Project.OpenByDirectory();
      return false;
    }catch(e){
      console.error('Error opening recent project:', e);
      await ForgeState.removeRecentProject(recentProject);
      return false;
    }finally{
      ForgeState.loaderHide();
    }
  }

  static async SaveToFolder(): Promise<boolean> {
    if(!ProjectFileSystem.hasRoot()){
      return false;
    }
    const response = await ForgeFileSystem.showOpenDirectoryDialog({
      title: 'Save Project To Folder',
    });
    if(response.cancelled){
      return false;
    }
    const destPath = (response as { path?: string }).path;
    const destHandle = isProjectDirectoryHandle((response as { handle?: FileSystemDirectoryHandle }).handle)
      ? (response as { handle: FileSystemDirectoryHandle }).handle
      : undefined;
    if(!destPath && !destHandle){
      return false;
    }
    const copied = await ProjectFileSystem.copyToDirectory({
      path: destHandle ? undefined : destPath,
      handle: destHandle,
    });
    if(!copied){
      console.error('Project.SaveToFolder: copy failed');
      return false;
    }
    ProjectFileSystem.clearDirectoryCache();
    ProjectFileSystem.isVirtual = false;
    if(destHandle){
      ProjectFileSystem.rootDirectoryHandle = destHandle;
      ProjectFileSystem.rootDirectoryPath = undefined as any;
      await ForgeState.addRecentProject(destHandle);
    }else if(destPath){
      ProjectFileSystem.rootDirectoryPath = destPath;
      ProjectFileSystem.rootDirectoryHandle = undefined as any;
      await ForgeState.addRecentProject(destPath);
    }
    await ProjectFileSystem.initializeProjectExplorer();
    return true;
  }

  // Save project settings and dirty editor tabs (not a module export).
  async save(){
    await this.saveSettings();
    const tabs = [...(ForgeState.tabManager?.tabs || [])];
    for(let i = 0; i < tabs.length; i++){
      const tab = tabs[i];
      if(tab?.file?.unsaved_changes){
        try{
          await tab.save();
        }catch(e){
          console.error('Project.save: tab save failed', e);
        }
      }
    }
  }

  async close(): Promise<boolean> {
    const tabs = [...(ForgeState.tabManager?.tabs || [])];
    const dirty = tabs.filter((tab) => tab.isClosable && tab.file?.unsaved_changes);
    if(dirty.length){
      const ok = window.confirm(`You have ${dirty.length} unsaved file(s). Close the project anyway?`);
      if(!ok){
        return false;
      }
    }
    for(let i = 0; i < tabs.length; i++){
      const tab = tabs[i];
      if(tab?.isClosable){
        tab.remove({ skipUnsavedConfirm: true });
      }
    }
    this.moduleEditor = undefined;
    this.module = undefined;
    ForgeState.project = undefined as any;
    ProjectFileSystem.clearDirectoryCache();
    ProjectFileSystem.isVirtual = false;
    ProjectFileSystem.rootDirectoryPath = undefined as any;
    ProjectFileSystem.rootDirectoryHandle = undefined as any;
    TabProjectExplorerState.Resources.splice(0, TabProjectExplorerState.Resources.length);
    ForgeState.projectExplorerTab.reload();
    const hasStart = ForgeState.tabManager.tabs.some((tab) => tab instanceof TabQuickStartState);
    if(!hasStart){
      ForgeState.tabManager.addTab(new TabQuickStartState());
    }
    return true;
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
      if(!deferInit){
        await this.initializeProject();
      }

      ForgeState.project = this;
      
      if(ProjectFileSystem.isVirtual && isProjectDirectoryHandle(ProjectFileSystem.rootDirectoryHandle)){
        await ForgeState.addRecentProject(ProjectFileSystem.rootDirectoryHandle);
      } else if(ProjectFileSystem.rootDirectoryPath){
        await ForgeState.addRecentProject(ProjectFileSystem.rootDirectoryPath);
      } else if(isProjectDirectoryHandle(ProjectFileSystem.rootDirectoryHandle)){
        await ForgeState.addRecentProject(ProjectFileSystem.rootDirectoryHandle);
      }
    }catch(e){
      console.error(e);
      alert('Project Open Failed');
    }

  }

  hasModule(): boolean {
    return !!this.module_ifo;
  }

  async initializeProject(){
    if(this.hasModule() && this.settings.module_editor.open){
      await this.initEditor();
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

  //Exports the finished project to a .mod file
  async export(): Promise<boolean> {
    let overrides: Record<string, Uint8Array> | undefined;
    if(this.moduleEditor instanceof TabModuleEditorState && this.moduleEditor.file?.unsaved_changes){
      const saveFirst = window.confirm("The module editor has unsaved changes. Save before exporting?");
      if(saveFirst){
        const saved = await this.moduleEditor.save();
        if(!saved){
          return false;
        }
      }
    }
    if(this.moduleEditor instanceof TabModuleEditorState){
      const buffers = this.moduleEditor.serializeModuleBuffers();
      const areaResRef = this.moduleEditor.module?.area?.getLayoutResRef();
      if(buffers && areaResRef){
        overrides = {
          "module.ifo": buffers.ifo,
          [`${areaResRef}.are`]: buffers.are,
          [`${areaResRef}.git`]: buffers.git,
        };
        if(buffers.lyt) overrides[`${areaResRef}.lyt`] = buffers.lyt;
        if(buffers.vis) overrides[`${areaResRef}.vis`] = buffers.vis;
      }
    }

    const files = await ProjectFileSystem.readdir("", { recursive: true });
    const result = await packProjectModule({
      files,
      readFile: (rel) => ProjectFileSystem.readFile(rel),
      moduleTag: this.moduleEditor?.module?.tag || this.settings.name,
      projectName: this.settings.name,
      overrides,
    });
    if(!result.ok || !result.buffer){
      window.alert(result.reason || "Export failed.");
      return false;
    }

    try{
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        const savePath = await dialog.showSaveDialog({
          title: "Export Module",
          defaultPath: result.filename,
          filters: [{ name: "Module", extensions: ["mod"] }],
        });
        if(!savePath || savePath.cancelled || !savePath.filePath){
          return false;
        }
        await fs.promises.writeFile(savePath.filePath, result.buffer);
        return true;
      }
      const handle = await window.showSaveFilePicker({
        suggestedName: result.filename,
        types: [{ description: "Module", accept: { "application/octet-stream": [".mod"] } }],
      });
      const ws = await handle.createWritable();
      await ws.write(result.buffer as any);
      await ws.close();
      return true;
    }catch(e){
      console.error("Project.export", e);
      return false;
    }
  }

  /**
   * Creates a new THREE.js Engine and initialize the scene
   */
  async initEditor() {
    if(!(this.moduleEditor instanceof TabModuleEditorState)){
      this.moduleEditor = new TabModuleEditorState({ editorFile: this.module_ifo });
    }
    this.moduleEditor.bindProjectFiles(this);
    ForgeState.tabManager.addTab(this.moduleEditor);
    await this.moduleEditor.loadFromProject(this);
  }

  openModuleEditor(){
    if(this.moduleEditor instanceof TabModuleEditorState){
      ForgeState.tabManager.addTab(this.moduleEditor);
      this.moduleEditor.show();
      return;
    }
    if(this.hasModule()){
      void this.initEditor();
      return;
    }
    openImportModuleWizard();
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

  /** Rewrite persisted `open_files` URIs after a project-tree rename. */
  retargetOpenFilesAfterRename(fromRel: string, toRel: string): void {
    const beforeJson = JSON.stringify(this.settings.open_files);
    const seen = new Set<string>();
    const next: string[] = [];
    for (let i = 0; i < this.settings.open_files.length; i++) {
      const entry = String(this.settings.open_files[i] ?? "").trim();
      if (!entry.length) {
        continue;
      }
      const rel = editorFileProjectRelativePath({
        useProjectFileSystem: true,
        path: entry,
      });
      const mapped = rel ? remapProjectRelativeAfterRename(rel, fromRel, toRel) : undefined;
      const uri = mapped ? EditorFile.referenceURIForProjectRelative(mapped) : entry;
      if (seen.has(uri)) {
        continue;
      }
      seen.add(uri);
      next.push(uri);
    }
    this.settings.open_files = next;
    if (JSON.stringify(this.settings.open_files) !== beforeJson) {
      this.saveSettings();
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

  /** Asset folders are created when files are added. `.forge/` is ensured by save/loadSettings. */
  async initDirectoryStructure(){
    return;
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
