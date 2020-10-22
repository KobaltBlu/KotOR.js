class NewProjectWizard extends Wizard {

  constructor(){
    super();

    //Variables
    this.project_name = 'New Project';
    this.parent_directory = (typeof Config.options.Projects_Directory !== 'undefined' && Config.options.Projects_Directory != null) ? Config.options.Projects_Directory : '';
    this.project_location = '';
    this.project_game = Games.KOTOR;
    this.project_type = Project.Types.MODULE;
    this.module_template = -1;

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-new-project.html', null, (tpl) => {
      this.$wizard = $(tpl);

      console.log('New Project Wizard', this);

      //DOM Elements
      this.$project_name = $('#modal-new-project-name', this.$wizard).val(this.project_name);
      this.$project_directory = $('#modal-new-project-directory', this.$wizard);
      this.$project_directory_browse = $('#modal-new-project-directory-browse', this.$wizard);
      this.$project_location = $('#modal-new-project-location', this.$wizard);
      this.$project_game = $('#modal-new-project-game', this.$wizard);
      this.$project_type = $('#modal-new-project-type', this.$wizard);

      this.$game_kotor = $('#modal-new-project-kotor', this.$wizard);
      this.$game_tsl = $('#modal-new-project-tsl', this.$wizard).addClass('gray');

      this.$module_template = $('#modal-new-project-template', this.$wizard);

      this.$alert = $('<div class="alert-holder" />');

      this.$project_name.parent().parent().prepend(this.$alert);


      this.$game_kotor.on('click', (e) => {
        this.$project_game.val(1).trigger('change');
      });

      this.$game_tsl.on('click', (e) => {
        this.$project_game.val(2).trigger('change');
      });


      this.$project_name.keypress(function (e) {
          let regex = new RegExp("^[a-zA-Z0-9\-\_\s]+$");
          let keyCode = e.charCode ? e.which : e.charCode;
          let str = String.fromCharCode(keyCode);
          if (regex.test(str) || keyCode == 32) {
              return true;
          }

          e.preventDefault();
          return false;
      }).on('input', (e) => {
        this.project_name = this.$project_name.val().trim();
        this.UpdateProjectLocation();
      });

      this.$project_directory.keypress(function (e) {
          let regex = new RegExp('^[a-zA-Z0-9\-\_\s\\\\/\]+$');
          let keyCode = e.charCode ? e.which : e.charCode;
          let str = String.fromCharCode(keyCode);
          if (regex.test(str) || keyCode == 32) {
            return true;
          }

          e.preventDefault();
          return false;
      }).on('input', (e) => {
        this.parent_directory = path.normalize(this.$project_directory.val());
        this.$project_directory.val(this.parent_directory);
        this.UpdateProjectLocation();
      }).val(this.parent_directory);
      this.UpdateProjectLocation();

      this.$project_directory_browse.on('click', async (e) => {
        e.preventDefault();
        let payload = await dialog.showOpenDialog({properties: ['openDirectory']});
        if(!payload.canceled && payload.filePaths.length){
          console.log(payload.filePaths[0]);
          this.parent_directory = payload.filePaths[0];
          this.$project_directory.val(this.parent_directory);
        }
        this.UpdateProjectLocation();
      });

      this.$project_location.on('change', () => {
        console.log('Input Changed');
        this.project_location = this.$project_location.val();
      });

      this.$project_game.on('change', () => {
        let id = parseInt(this.$project_game.val());
        this.project_game = id;

        switch(id){
          case 1:
            this.$game_kotor.removeClass('gray');
            this.$game_tsl.removeClass('gray').addClass('gray');
          break;
          case 2:
            this.$game_tsl.removeClass('gray');
            this.$game_kotor.removeClass('gray').addClass('gray');
          break;
        }


      });

      this.$project_type.on('change', () => {
        this.project_type = parseInt(this.$project_type.val());
      });

      this.UpdateProjectLocation();

      this.$module_template.on('click', (e) => {
        e.preventDefault();

        let levelSelectWizard = new LevelSelectWizard(this.module_template, (id, level) => {
          console.log('Level Selected', id, level, this);
          this.module_template = id;
          this.$module_template.val('Template: '+level.module);
        });

      });

      $('#modal-new-project-create', this.$wizard).on('click', (e) => {
        e.preventDefault();
        if(this.project_name != ""){

          if(this.DirectoryExists(this.parent_directory)){

            if (this.DirectoryExists(this.project_location)) {
              //The project directory already exists: Check to see if it already
              //contains a project.json
              if(this.FileExists(path.join(
                this.project_location,
                'project.json'
              ))){
                this.Alert('A project already exists in this directory');
              }else{
                this.CreateProject(()=>{

                  console.log('Template', this.module_template, this);

                  if(this.module_template != -1){
                    console.log('From Template')
                    this.Hide();
                    Global.Project = new Project(this.project_location);
                    Global.Project.Open(() => {
                      Global.Project.module = new Module(this.project_location);
                      Global.Project.module.Save();

                      loader.SetMessage("Project Loaded");
                      loader.Dismiss();
                    });

                  }else{
                    console.log('Not From Template')
                    this.Hide();
                    Global.Project = new Project(this.project_location);
                    Global.Project.Open(() => {
                      Global.Project.module = new Module(this.project_location);
                      Global.Project.module.Save();

                      loader.SetMessage("Project Loaded");
                      loader.Dismiss();
                    });
                  }

                });
              }

            }else{
              //Create the new project directory
              fs.mkdirSync(this.project_location);

              this.CreateProject(()=>{
                this.Hide();
                Global.Project = new Project(this.project_location);

                //Load the project so that the template builder can access the projects variables
                if(this.module_template != -1){
                  let module_name = GameMaps[this.module_template].module.split('.')[0];
                  console.log('Creating Project and Exporting Files', GameMaps[this.module_template], module_name);

                  Game.module = new Module();
                  Module.GetModuleArchives(module_name, (archives) => {

                    let archiveLoop = new AsyncLoop({
                      array: archives,
                      onLoop: (archive, asyncLoop) => {
                        if(archive instanceof RIMObject){
                          //Loop though the resources inside the RIMObject and export them to the project directory
                          let resourceLoop = new AsyncLoop({
                            array: archive.Resources,
                            onLoop: (resource, asyncLoopR) => {
                              if(resource.ResType == ResourceTypes['ifo'] || resource.ResType == ResourceTypes['are'] || resource.ResType == ResourceTypes['git']){
                                archive.exportRawResource(Global.Project.directory, resource.ResRef, resource.ResType, () => {
                                  asyncLoopR._Loop();
                                });
                              }else{
                                archive.exportRawResource(path.join(Global.Project.directory, 'files'), resource.ResRef, resource.ResType, () => {
                                  asyncLoopR._Loop();
                                });
                              }
                            }
                          });
                          resourceLoop.Begin(() => {
                            asyncLoop._Loop();
                          });
                        }else if(archive instanceof ERFObject){
                          //Loop though the resources inside the ERFObject and export them to the project directory
                          let resourceLoop = new AsyncLoop({
                            array: archive.KeyList,
                            onLoop: (resource, asyncLoopR) => {
                              if(resource.ResType == ResourceTypes['ifo'] || resource.ResType == ResourceTypes['are'] || resource.ResType == ResourceTypes['git']){
                                archive.exportRawResource(Global.Project.directory, resource.ResRef, resource.ResType, () => {
                                  asyncLoopR._Loop();
                                });
                              }else{
                                archive.exportRawResource(path.join(Global.Project.directory, 'files'), resource.ResRef, resource.ResType, () => {
                                  asyncLoopR._Loop();
                                });
                              }
                            }
                          });
                          resourceLoop.Begin(() => {
                            asyncLoop._Loop();
                          });
                        }else{
                          asyncLoop._Loop();
                        }
                      }
                    });
                    archiveLoop.Begin(() => {
                      //Module.BuildFromProject(GameMaps[this.module_template].module.split('.')[0], () => {  });
                      fs.readFile(path.join(Global.Project.directory, 'module.ifo'), (err, ifo_data) => {
                        new GFFObject(ifo_data, (gff, rootNode) => {

                          let originalAreaName = gff.GetFieldByLabel('Mod_Entry_Area').GetValue();

                          let Mod_Area_list = gff.GetFieldByLabel('Mod_Area_list');
                          Mod_Area_list.ChildStructs = [];

                          let areaStruct = new Struct();
                          areaStruct.AddField( new Field(GFFDataTypes.RESREF, 'Area_Name') ).SetValue('area_001');
                          Mod_Area_list.AddChildStruct(areaStruct);

                          gff.GetFieldByLabel('Mod_Entry_Area').SetValue('area_001');
                          gff.path = Global.Project.directory;
                          gff.Save(path.join(Global.Project.directory, 'module.ifo'), () => {
                            //Rename the Extracted ARE file
                            fs.rename(path.join(Global.Project.directory, originalAreaName+'.are'), path.join(Global.Project.directory, 'area_001.are'), function(err) {
                              //Rename the Extracted GIT file
                              fs.rename(path.join(Global.Project.directory, originalAreaName+'.git'), path.join(Global.Project.directory, 'area_001.git'), function(err) {
                                //Rename the Extracted PTH file
                                fs.rename(path.join(Global.Project.directory, 'files/'+originalAreaName+'.pth'), path.join(Global.Project.directory, 'files/area_001.pth'), function(err) {
                                  //Extract and rename the original VIS file
                                  ResourceLoader.loadResource(ResourceTypes['vis'], originalAreaName, (visData) => {
                                    fs.writeFile(path.join(Global.Project.directory, 'files/area_001.vis'), visData, (err) => {
                                      //Extract and rename the original LYT file
                                      ResourceLoader.loadResource(ResourceTypes['lyt'], originalAreaName, (visData) => {
                                        fs.writeFile(path.join(Global.Project.directory, 'files/area_001.lyt'), visData, (err) => {
                                          Global.Project.Open(() => {
                                            //Update the project to update the module variables
                                            Global.Project.InitializeProject( () => {
                                              //When everything is done
                                              loader.SetMessage("Project Loaded");
                                              loader.Dismiss();
                                            });
                                          });
                                        })
                                      });
                                    })
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                      
                    });
                  });

                }else{
                  Global.Project.Open(() => {
                    Global.Project.InitializeProject( () => {
                      //When everything is done
                      loader.SetMessage("Project Loaded");
                      loader.Dismiss();
                    });
                  });
                }
              }, true);
            }

          }else{
            this.Alert('You have selected an incorrect path for the parent directory');
          }

        }else{
          this.Alert('Your project name is blank');
        }

      });

      //Add the new wizard to the DOM
      $('body').append(this.$wizard);
      this.$wizard.filter('.modal').modal({
          backdrop: 'static',
          keyboard: false
      });

    });

  }

  Alert(msg = ""){
    let $newAlert = $('<div class="alert alert-warning alert-dismissible shake" role="alert">'+
  '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
  '<span id="alert-msg">'+msg+'</span>'+
'</div>');
    this.$alert.html('').append($newAlert);

    //this.$alert_msg = $('#alert-msg', this.$alert);)
    //this.$alert_msg.text(msg);
    this.$alert.show();
  }

  CreateProject(onComplete = null){
    //Try to create the files directory
    try{
      fs.mkdirSync(path.join(
        this.project_location,
        'files'
      ));
    }catch(e){ console.log(e); }

    let project_data = {
      "Name": this.project_name,
      game: this.project_game,
      type: this.project_type
    };

    //Create project.json
    fs.writeFile(path.join(
      this.project_location,
      'project.json'
    ), JSON.stringify(project_data), function(err) {
        if(err) {
            return console.log('save project', err);
        }

        if(onComplete)
          onComplete();

    });
  }

  DirectoryExists(dir){
    console.log('Checking Directory', dir);
    try{
      return fs.lstatSync(dir).isDirectory();
    }catch(e){ return false; }
  }

  FileExists(file){
    console.log('Checking File', file);
    try{
      return fs.lstatSync(file).isFile();
    }catch(e){ return false; }
  }

  UpdateProjectLocation(){

    this.$project_location.val(path.join(
        this.parent_directory,
        this.project_name.replace(/\s+/g, '-').toLowerCase()
    ));
    this.$project_location.trigger('change');
  }


}


module.exports = NewProjectWizard;
