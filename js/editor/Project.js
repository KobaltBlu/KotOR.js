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

        window.project = this;

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

  GetFiles(onSuccess){
    let self = this;
    let fs = require('fs');
    fs.readdir(this.directory+"\\Files", (err, filenames) => {
      if (err)
        return;

      filenames.forEach(function(filename) {
        let args = filename.split('.');
        self.files.push({path: self.directory+"\\Files\\"+filename, filename: filename, name: args[0], ext: args[1]});
      });
      if(onSuccess != null)
        onSuccess(this.files);
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
