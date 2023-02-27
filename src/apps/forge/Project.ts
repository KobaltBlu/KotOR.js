import { EditorFile } from "./EditorFile";
import * as path from "path";
import * as fs from "fs";
import { DeepObject } from "../../DeepObject";
import { ForgeState } from "./states/ForgeState";
import { TabQuickStartState } from "./states/tabs/TabQuickStartState";

import * as KotOR from "./KotOR";
import { ProjectType } from "./enum/ProjectType";
import { FileTypeManager } from "./FileTypeManager";
import { TabModuleEditorState } from "./states/tabs/TabModuleEditorState";
import { ProjectFileSystem } from "./ProjectFileSystem";
import { ForgeFileSystem } from "./ForgeFileSystem";
import { StringDecoder } from "string_decoder";
import { ProjectSettings } from "./interfaces/ProjectSettings";

export class Project {

  static base_dir: string = 'forge';
  static project_assets_dir: string = 'assets';
  dir: string = '';

  className: string;
  files: any[];
  settings: ProjectSettings = {} as ProjectSettings;
  moduleEditor: any;
  module: any;

  static Types: any;

  constructor(){
    console.log("Project Class");
    this.className = "Project";
    this.files = [];
  }
  
  static OpenByDirectory() {
    ForgeFileSystem.OpenDirectory().then( async (response) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(response.paths && response.paths.length){
          ProjectFileSystem.rootDirectoryPath = response.paths[0];
          ForgeState.project = new Project();
          await ForgeState.project.load();
          await ProjectFileSystem.initializeProjectExplorer();
        }
      }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
        if(response.handles && response.handles.length){
          ProjectFileSystem.rootDirectoryHandle = response.handles[0] as FileSystemDirectoryHandle;
          ForgeState.project = new Project();
          await ForgeState.project.load();
          await ProjectFileSystem.initializeProjectExplorer();
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

  async load(){
    if ( await ProjectFileSystem.exists('.forge/settings.json') ) {
      try{
        const buffer = await ProjectFileSystem.readFile('.forge/settings.json');
        let decoder = new StringDecoder('utf8');
        this.settings = JSON.parse(
          decoder.write(buffer)
        );

        if(typeof this.settings != 'object'){
          console.warn('Project.Load', 'Malformed project.json file data', this.settings);
          this.settings = {} as ProjectSettings;
        }

        this.settings = DeepObject.Merge(defaults, this.settings);
      }catch(e){
        console.error('Project.Load', e);
        alert('Project.Load: Failed');
        this.settings = DeepObject.Merge(defaults, {});
      }
    }else{
      alert('Project.Load: project.json not found!');
      console.warn('Project.Load', 'project.json not found!');
      this.settings = DeepObject.Merge(defaults, {});
    }
  }

  //Opens a project from it's location
  open(onSuccess?: Function, deferInit = false){
    // ForgeState.loader.SetMessage("Loading Project..");
    // ForgeState.loader.Show();
    //load project.json
    this.load().then( () => {
      try{
        console.log('project', this.settings);

        let quickStart = ForgeState.tabManager.getTabByType(TabQuickStartState.name);
        if(quickStart){
          console.log(quickStart);
          ForgeState.tabManager.removeTab(quickStart);
        }

        // let pjIndex = KotOR.ConfigClient.options.recent_projects.indexOf(this.directory);
        // if (pjIndex > -1) {
        //   KotOR.ConfigClient.options.recent_projects.splice(pjIndex, 1);
        // }

        // //Append this project to the beginning of the list
        // KotOR.ConfigClient.options.recent_projects.unshift(this.directory);
        // KotOR.ConfigClient.save(undefined, true); //Save the configuration silently

        // this.getFiles(()=>{

          let project = this;

          KotOR.GameInitializer.Init({
            game: this.settings.game,
            onLoad: () => {
              //This is where we initialize ProjectType specific operations
              if(!deferInit){
                project.initializeProject( () => {
                  // ForgeState.loader.SetMessage("Loading Complete");
                  //When everything is done
                  if(typeof onSuccess == 'function')
                    onSuccess();
                });
              }else{
                if(typeof onSuccess == 'function')
                  onSuccess();
              }
            }
          });

        // });

        ForgeState.project = this;

      }catch(e){
        console.log(e);
        alert('Project Open Failed');
        if(typeof onSuccess == 'function')
          onSuccess();
      }
    });

  }

  initializeProject(onComplete?: Function){
    switch(this.settings.type){
      case ProjectType.MODULE:
        //Initialize the Map Editor
        if(this.settings.module_editor.open)
          this.initEditor();

        //All done??? ok Complete
        if(typeof onComplete == 'function')
          onComplete();
      break;
      case ProjectType.OTHER:

        //All done??? ok Complete
        if(typeof onComplete == 'function')
          onComplete();
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

  // async getFiles(onSuccess?: Function){

  //   // await this.parseProjectFolder();

  //   // ForgeState.projectExplorerTab.initialize();
      
  //   if(typeof onSuccess == 'function')
  //     onSuccess(this.files);

  // }

  // async parseProjectFolder( folder: string = '' ){
  //   return new Promise<void>( async (resolve, reject) => {
  //     if(typeof folder === 'undefined')
  //       folder = this.directory;

  //     console.log('parseProjectFolder', folder);

  //     fs.readdir(folder, {withFileTypes: true}, async (err, directory_objects) => {
  //       if (err){
  //         resolve();
  //       }

  //       for(let i = 0, len = directory_objects.length; i < len; i++){
  //         let directory_object = directory_objects[i];
  //         let name = directory_object.name;
  //         let args = name.split('.');

  //         if(directory_object.isDirectory()){
  //           //DIRECTORY
  //           this.files.push({path: path.join(folder, name), filename: name, name: args[0], ext: null, type: 'group'});
  //           await this.parseProjectFolder( path.join(folder, name) );
  //         }else{
  //           //FILE
  //           this.files.push({path: path.join(folder, name), filename: name, name: args[0], ext: args[1], type: 'resource'});
  //         }
  //       }

  //       resolve();
          
  //     });
  //   });
  // }


  /**
   * Creates a new THREE.js Engine and initialize the scene
   */
  initEditor() {
    this.moduleEditor = new TabModuleEditorState();
    ForgeState.tabManager.addTab(this.moduleEditor);
    //this.moduleEditor.Init();
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

  async saveSettings(){
    try{
      const saved = await ProjectFileSystem.writeFile(
        '.forge/settings.json', 
        Buffer.from(
          JSON.stringify(this.settings, null, "\t")
        )
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
