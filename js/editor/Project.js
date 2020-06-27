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
    try{
      this.settings = require(path.join(this.directory, 'project.json'));
      if(onLoad != null)
        onLoad();
    }catch(e){
      console.error(e);
      alert('Project Open Failed');
      if(onLoad != null)
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
        Config.Save(null, true); //Save the configuration silently

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
                  if(onSuccess != null)
                    onSuccess();
                });
              }else{
                if(onSuccess != null)
                  onSuccess();
              }
            }
          });

        });

        global.project = this;

      }catch(e){
        console.log(e);
        alert('Project Open Failed');
        if(onSuccess != null)
          onSuccess();
      }
    });

  }

  InitializeProject(onComplete = null){
    switch(this.settings.type){
      case Project.Types.MODULE:
        //Initialize the Map Editor
        this.InitEditor();

        //All done??? ok Complete
        if(onComplete != null)
          onComplete();
      break;
      case Project.Types.OTHER:

        //All done??? ok Complete
        if(onComplete != null)
          onComplete();
      break;
    }
    console.log('Project Init');
  }

  //Exports the finished project to a .mod file
  Export(){

  }

  async GetFiles(onSuccess){

    await this.parseProjectFolder();

    projectExplorerTab.initialize();
      
    if(onSuccess != null)
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

  GetTemplatesByType ( restype = '' ) {
    let files = [];

    for(let i = 0; i < this.files.length; i++){
      if(this.files[i].ext == restype)
        files.push(this.files[i]);
    }

    return files;
  }

}

Project.Types = {
  MODULE: 1,
  OTHER: 2
}

module.exports = Project;
