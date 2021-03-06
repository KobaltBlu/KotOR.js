
const DeepObject = require(path.join(app.getAppPath(), 'js/DeepObject.js'));

class Project {

  constructor(directory){
    console.log("Project Class");
    this.ClassName = "Project";
    this.directory = directory;
    this.files = [];
    this.settings = {};
    this.custom = function(){

    };
  }

  //Save any altered files in the project
  Save(){

  }

  //Closes the current project
  Close(){

  }

  Load(onLoad = null){

    if (fs.existsSync(path.join(this.directory, 'project.json'))) {
      try{
        this.settings = require(path.join(this.directory, 'project.json'));

        if(typeof this.settings != 'object'){
          console.warn('Project.Load', 'Malformed project.json file data', this.settings);
          this.settings = {};
        }

        this.settings = DeepObject.Merge(defaults, this.settings);

        //Name Key Case Fix
        if(this.settings.hasOwnProperty('Name')){
          this.settings.name = this.settings.Name;
          delete this.settings.Name;
        }

        if(typeof onLoad == 'function')
          onLoad();
      }catch(e){
        console.error('Project.Load', e);
        alert('Project.Load: Failed');
        this.settings = DeepObject.Merge(defaults, {});
        if(typeof onLoad == 'function')
          onLoad();
      }
    }else{
      alert('Project.Load: project.json not found!');
      console.warn('Project.Load', 'project.json not found!');
      this.settings = DeepObject.Merge(defaults, {});
      if(typeof onLoad == 'function')
        onLoad();
    }
  }

  //Opens a project from it's location
  Open(onSuccess = null, deferInit = false){
    loader.SetMessage("Loading Project..");
    loader.Show();
    //load project.json
    this.Load( () => {
      try{

        console.log('project', this.settings);

        let quickStart = tabManager.GetTabByType('QuickStartTab');
        if(quickStart){
          console.log(quickStart);
          tabManager.RemoveTab(quickStart);
        }

        let pjIndex = Config.options.recent_projects.indexOf(this.directory);
        if (pjIndex > -1) {
          Config.options.recent_projects.splice(pjIndex, 1);
        }

        //Append this project to the beginning of the list
        Config.options.recent_projects.unshift(this.directory);
        Config.save(null, true); //Save the configuration silently

        this.GetFiles(()=>{

          let project = this;

          GameInitializer.Init({
            game: this.settings.game,
            onLoad: () => {
              //This is where we initialize ProjectType specific operations
              if(!deferInit){
                project.InitializeProject( () => {
                  loader.SetMessage("Loading Complete");
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

        });

        global.project = this;

      }catch(e){
        console.log(e);
        alert('Project Open Failed');
        if(typeof onSuccess == 'function')
          onSuccess();
      }
    });

  }

  InitializeProject(onComplete = null){
    switch(this.settings.type){
      case Project.Types.MODULE:
        //Initialize the Map Editor
        if(this.settings.module_editor.open)
          this.InitEditor();

        //All done??? ok Complete
        if(typeof onComplete == 'function')
          onComplete();
      break;
      case Project.Types.OTHER:

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
  Export(){

  }

  async GetFiles(onSuccess){

    await this.parseProjectFolder();

    projectExplorerTab.initialize();
      
    if(typeof onSuccess == 'function')
      onSuccess(this.files);

  }

  async parseProjectFolder( folder = undefined, ){
    return new Promise( async (resolve, reject) => {
      if(typeof folder === 'undefined')
        folder = this.directory;

      console.log('parseProjectFolder', folder);

      fs.readdir(folder, {withFileTypes: true}, async (err, directory_objects) => {
        if (err){
          resolve();
        }

        for(let i = 0, len = directory_objects.length; i < len; i++){
          let directory_object = directory_objects[i];
          let name = directory_object.name;
          let args = name.split('.');

          if(directory_object.isDirectory()){
            //DIRECTORY
            this.files.push({path: path.join(folder, name), filename: name, name: args[0], ext: null, type: 'group'});
            await this.parseProjectFolder( path.join(folder, name) );
          }else{
            //FILE
            this.files.push({path: path.join(folder, name), filename: name, name: args[0], ext: args[1], type: 'resource'});
          }
        }

        resolve();
          
      });
    });
  }


  /**
   * Creates a new THREE.js Engine and initialize the scene
   */
  InitEditor() {
    this.moduleEditor = new ModuleEditorTab();
    tabManager.AddTab(this.moduleEditor);
    //this.moduleEditor.Init();
  }

  openModuleEditor(){
    if(this.moduleEditor instanceof ModuleEditorTab){
      tabManager.AddTab(this.moduleEditor);
      this.moduleEditor.Show();
    }else{
      this.InitEditor();
    }
  }

  GetTemplatesByType ( restype = '' ) {
    let files = [];

    for(let i = 0; i < this.files.length; i++){
      if(this.files[i].ext == restype)
        files.push(this.files[i]);
    }

    return files;
  }

  addToOpenFileList(editor_file = undefined){
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

  removeFromOpenFileList(editor_file = undefined){
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

  saveSettings(onSave = undefined){
    try{
      fs.writeFile(path.join(this.directory, 'project.json'),
        JSON.stringify(this.settings, null, "\t"),
        (err) => {
          if(err){
            console.error('Project.saveSettings', e);
            return;
          }

          if(typeof onSave === 'function'){
            onSave();
          }
        }
      );
    }catch(e){
      console.error('Project.saveSettings', e);
    }
  }

}

Project.Types = {
  MODULE: 1,
  OTHER: 2
}

const defaults = {
  name: '',
  game: 1,
  type: 1,
  module_editor: {
    open: false
  },
  open_files: [],
}

module.exports = Project;
