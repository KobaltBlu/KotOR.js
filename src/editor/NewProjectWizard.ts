import { path } from "@ffmpeg-installer/ffmpeg";
import { dialog } from "electron";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { Module } from "../module";
import { ERFObject } from "../resource/ERFObject";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { RIMObject } from "../resource/RIMObject";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { AsyncLoop } from "../utility/AsyncLoop";
import { LevelSelectWizard } from "./LevelSelectWizard";
import { Project } from "./Project";
import { Wizard } from "./Wizard";

export class NewProjectWizard extends Wizard {
  data: any = {};
  ractive: any;

  constructor(){
    super({
      'title': 'New Project Wizard',
      buttons: [
        {
          name: 'Create Project',
          onClick: () => {
            console.log(this);
            this.onCreateProject();
          }
        }
      ]
    });

    this.data = {
      name: 'New Project',
      project_directory: Config.get('Projects_Directory'),
      project_location: '',
      project_type: Project.Types.MODULE,
      template_id: -1,
      template_name: 'None',
      module_name: 'mm01aa',
      export_types: {
        ifo: true,
        are: true,
        git: true,
     //------------//
        pth: true,
        vis: true,
        lyt: true,
        dlg: true,
        fac: true,
        ncs: true,
        nss: true,
        utc: true,
        utd: true,
        ute: true,
        utm: true,
        utp: true,
        uts: true,
        utt: true,
        utw: true,
        other: true
      },
      alert: '',
    };

    this.ractive = Ractive({
      target: this.$body[0],
      template: `
{{#if alert}}
  <div class="alert alert-warning alert-dismissible shake" role="alert">
    <button type="button" class="close" data-dismiss="alert" aria-label="Close" on-click="dismissAlert"><span aria-hidden="true">&times;</span></button>
    <span id="alert-msg">{{alert}}</span>
  </div>
{{/if}}
<div class="row">
  <div class="col-xs-12">
    <div class="form-group">
      <label for="modal-new-project-name">Project Name</label>
      <input id="modal-new-project-name" type="text" value="{{name}}" on-blur-input-change-keydown="inputNameValidator" />
    </div>

    <div class="form-group">
      <label for="modal-new-project-location">Project Location</label>
      <input id="modal-new-project-location" type="text" value="{{project_location}}" disabled />
    </div>

    <div class="form-group">
      <label for="modal-new-project-directory">Projects Directory</label>
      <div class="input-group">
        <input id="modal-new-project-directory" type="text" value="{{project_directory}}" />
        <span class="input-group-btn">
          <button id="modal-new-project-directory-browse" class="btn btn-default" type="button" on-click="btnProjectDirectoryBrowse">Browse</button>
        </span>
      </div>
    </div>

    <div class="form-group">
      <label for="modal-new-project-type">Project Type</label>
      <select id="modal-new-project-type" value="{{project_type}}">
        <option value="1">Module</option>
        <option value="2">Generic</option>
      </select>
    </div>
    
    <br>
    {{#if project_type == 1}}
      <h4>Module Options</h4>
      <hr />
      <div class="row">
        <div class="col-xs-6">
          <label>Area Name</label>
          <input id="modal-new-project-area-name" type="text" on-input-change-click-blur="inputResRefValidator" data-key="module_name" value="{{module_name}}" />
        </div>
        <div class="col-xs-6">
          <label>Module Template</label>
          <input id="modal-new-project-template" class="btn btn-default btn-forge-block" type="button" on-click="levelSelect" value="Template: {{template_name}}" />
        </div>
      </div>
      {{#if template_id >= 0}}
      <br>
      <label>Export: File Types </label>
      <div class="row text-center">
        <div class="col-xs-2">
          <label>.pth</label>
          <input type="checkbox" checked="{{export_types.pth}}" />
        </div>
        <div class="col-xs-2">
          <label>.vis</label>
          <input type="checkbox" checked="{{export_types.vis}}" />
        </div>
        <div class="col-xs-2">
          <label>.lyt</label>
          <input type="checkbox" checked="{{export_types.lyt}}" />
        </div>
        <div class="col-xs-2">
          <label>.dlg</label>
          <input type="checkbox" checked="{{export_types.dlg}}" />
        </div>
        <div class="col-xs-2">
          <label>.ncs</label>
          <input type="checkbox" checked="{{export_types.ncs}}" />
        </div>
        <div class="col-xs-2">
          <label>.nss</label>
          <input type="checkbox" checked="{{export_types.nss}}" />
        </div>
        <!-- Blueprints -->
        <div class="col-xs-2">
          <label>.utc</label>
          <input type="checkbox" checked="{{export_types.utc}}" />
        </div>
        <div class="col-xs-2">
          <label>.utd</label>
          <input type="checkbox" checked="{{export_types.utd}}" />
        </div>
        <div class="col-xs-2">
          <label>.ute</label>
          <input type="checkbox" checked="{{export_types.ute}}" />
        </div>
        <div class="col-xs-2">
          <label>.utm</label>
          <input type="checkbox" checked="{{export_types.utm}}" />
        </div>
        <div class="col-xs-2">
          <label>.utp</label>
          <input type="checkbox" checked="{{export_types.utp}}" />
        </div>
        <div class="col-xs-2">
          <label>.uts</label>
          <input type="checkbox" checked="{{export_types.uts}}" />
        </div>
        <div class="col-xs-2">
          <label>.utt</label>
          <input type="checkbox" checked="{{export_types.utt}}" />
        </div>
        <div class="col-xs-2">
          <label>.utw</label>
          <input type="checkbox" checked="{{export_types.utw}}" />
        </div>
        <div class="col-xs-2">
          <label>.fac</label>
          <input type="checkbox" checked="{{export_types.fac}}" />
        </div>
        <div class="col-xs-6 text-left">
          <label>Other Files</label>
          <input type="checkbox" checked="{{export_types.other}}" />
        </div>
      </div>
      {{/if}}
    {{elseif project_type == 2}}
    {{/if}}

  </div>
</div>`,
      data: this.data,
      on: {
        dismissAlert(ctx){
          this.set('alert', '');
        },
        inputNameValidator(ctx){
          let e = ctx.event;
          let regex = new RegExp("^[a-zA-Z0-9\-\_\s]+$");
          let keyCode = !e.charCode ? e.which : e.charCode;
          if(keyCode){
            let str = String.fromCharCode(keyCode);
            let validKeys = [8, 27, 32, 37, 38, 39, 40, 46]
            if (regex.test(str) || validKeys.indexOf(keyCode) >= 0) {
              return true;
            }

            e.preventDefault();
            return false;
          }else{
            this.set('name', this.get('name').replace(/([^a-zA-Z0-9\-\_\s]+)/gi, ''));
            if(e instanceof FocusEvent){
              this.set('name', this.get('name').trim());
            }
          }
        },
        inputResRefValidator(ctx){
          if(ctx.node.dataset.key){
            this.set(ctx.node.dataset.key, this.get(ctx.node.dataset.key).replace(/([^a-zA-Z0-9\_]+)/gi, '').trim().substr(0, 16));
          }
        },
        levelSelect(ctx){
          new LevelSelectWizard(this.data.template_id, (id, level) => {
            this.set('template_id', id);
            this.set('template_name', level.module);
          });
        },
        async btnProjectDirectoryBrowse(ctx){
          let payload = await dialog.showOpenDialog({properties: ['openDirectory', 'createDirectory']});
          if(!payload.canceled && payload.filePaths.length){
            this.set('project_directory', payload.filePaths[0]);
          }
        }
      },
      observe: {
        show ( value ) {
          //console.log( `show changed to '${value}'` )
        },
        'name project_directory': {
          handler ( value, old, pth, idx ) {
            this.set('project_location', path.join(
              this.get('project_directory'), this.get('name').replace(/\s+/g, '-').toLowerCase()
            ));
          },
          init: true,
          strict: true
        }
      }
    });

    // console.log(this.data);
    // console.log(this);

  }

  canExportFileType(res){
    let export_types = Object.keys(this.data.export_types);
    for(let i = 0, len = export_types.length; i < len; i++){
      let export_res_key = export_types[i];
      if(ResourceTypes[export_res_key] == res.ResType){
        return this.data.export_types[export_res_key] ? true : false;
      }
    }

    return this.data.export_types['other'] ? true : false;
  }

  onCreateProject(){
    if(this.data.name.trim().length){

      if(this.directoryExists(this.data.project_directory)){

        if (this.directoryExists(this.data.project_location)) {
          //The project directory already exists: Check to see if it already
          //contains a project.json
          if(this.fileExists(path.join(
            this.data.project_location,
            'project.json'
          ))){
            this.showAlertMessage('A project already exists in this directory');
          }else{
            this.createProject(()=>{

              console.log('Template', this.data.template_id, this);

              if(this.data.template_id != -1){
                console.log('From Template')
                this.Hide();
                Forge.Project = new Project(this.data.project_location);
                Forge.Project.Open(() => {
                  Forge.Project.module = new Module();
                  Forge.Project.module.Save();

                  Forge.loader.SetMessage("Project Loaded");
                  Forge.loader.Dismiss();
                });

              }else{
                console.log('Not From Template')
                this.Hide();
                Forge.Project = new Project(this.data.project_location);
                Forge.Project.Open(() => {
                  Forge.Project.module = new Module();
                  Forge.Project.module.Save();

                  Forge.loader.SetMessage("Project Loaded");
                  Forge.loader.Dismiss();
                });
              }

            });
          }

        }else{
          //Create the new project directory
          fs.mkdirSync(this.data.project_location);

          this.createProject(()=>{
            this.Hide();
            Forge.Project = new Project(this.data.project_location);

            //Load the project so that the template builder can access the projects variables
            if(this.data.template_id != -1){
              let module_name = GameMaps[this.data.template_id].module.split('.')[0];
              console.log('Creating Project and Exporting Files', GameMaps[this.data.template_id], module_name);

              GameState.module = new Module();
              Module.GetModuleProjectArchives(module_name).then( (archives) => {
                let archiveLoop = new AsyncLoop({
                  array: archives,
                  onLoop: (archive, asyncLoop) => {
                    if(archive instanceof RIMObject){
                      //Loop though the resources inside the RIMObject and export them to the project directory
                      let resourceLoop = new AsyncLoop({
                        array: archive.Resources,
                        onLoop: (resource, asyncLoopR) => {
                          if(this.canExportFileType(resource)){
                            if(resource.ResType == ResourceTypes['ifo'] || resource.ResType == ResourceTypes['are'] || resource.ResType == ResourceTypes['git']){
                              archive.exportRawResource(Forge.Project.directory, resource.ResRef, resource.ResType, () => {
                                asyncLoopR.next();
                              });
                            }else{
                              archive.exportRawResource(path.join(Forge.Project.directory, 'files'), resource.ResRef, resource.ResType, () => {
                                asyncLoopR.next();
                              });
                            }
                          }
                        }
                      });
                      resourceLoop.iterate(() => {
                        asyncLoop.next();
                      });
                    }else if(archive instanceof ERFObject){
                      //Loop though the resources inside the ERFObject and export them to the project directory
                      let resourceLoop = new AsyncLoop({
                        array: archive.KeyList,
                        onLoop: (resource, asyncLoopR) => {
                          if(this.canExportFileType(resource)){
                            if(resource.ResType == ResourceTypes['ifo'] || resource.ResType == ResourceTypes['are'] || resource.ResType == ResourceTypes['git']){
                              archive.exportRawResource(Forge.Project.directory, resource.ResRef, resource.ResType, () => {
                                asyncLoopR.next();
                              });
                            }else{
                              archive.exportRawResource(path.join(Forge.Project.directory, 'files'), resource.ResRef, resource.ResType, () => {
                                asyncLoopR.next();
                              });
                            }
                          }
                        }
                      });
                      resourceLoop.iterate(() => {
                        asyncLoop.next();
                      });
                    }else{
                      asyncLoop.next();
                    }
                  }
                });
                archiveLoop.iterate(() => {
                  //Module.BuildFromProject(GameMaps[this.data.template_id].module.split('.')[0], () => {  });
                  fs.readFile(path.join(Forge.Project.directory, 'module.ifo'), (err, ifo_data) => {
                    new GFFObject(ifo_data, (ifo, rootNode) => {

                      let originalAreaName = ifo.GetFieldByLabel('Mod_Entry_Area').GetValue();

                      let Mod_Area_list = ifo.GetFieldByLabel('Mod_Area_list');
                      Mod_Area_list.ChildStructs = [];

                      let areaStruct = new GFFStruct();
                      areaStruct.AddField( new GFFField(GFFDataType.RESREF, 'Area_Name') ).SetValue(this.data.module_name);
                      Mod_Area_list.AddChildStruct(areaStruct);

                      ifo.GetFieldByLabel('Mod_Entry_Area').SetValue(this.data.module_name);
                      ifo.path = Forge.Project.directory;
                      ifo.Save(path.join(Forge.Project.directory, 'module.ifo'), () => {
                        //Rename the Extracted ARE file
                        fs.rename(path.join(Forge.Project.directory, originalAreaName+'.are'), path.join(Forge.Project.directory, `${this.data.module_name}.are`), (err) => {
                          //Rename the Extracted GIT file
                          fs.rename(path.join(Forge.Project.directory, originalAreaName+'.git'), path.join(Forge.Project.directory, `${this.data.module_name}.git`), (err) => {
                            //Rename the Extracted PTH file
                            fs.rename(path.join(Forge.Project.directory, 'files', originalAreaName+'.pth'), path.join(Forge.Project.directory, 'files', `${this.data.module_name}.pth`), (err) => {
                              //Extract and rename the original VIS file
                              ResourceLoader.loadResource(ResourceTypes['vis'], originalAreaName, (visData) => {
                                fs.writeFile(path.join(Forge.Project.directory, 'files', `${this.data.module_name}.vis`), visData, (err) => {
                                  //Extract and rename the original LYT file
                                  ResourceLoader.loadResource(ResourceTypes['lyt'], originalAreaName, (visData) => {
                                    fs.writeFile(path.join(Forge.Project.directory, 'files', `${this.data.module_name}.lyt`), visData, (err) => {
                                      Forge.Project.Open(() => {
                                        //Update the project to update the module variables
                                        Forge.Project.InitializeProject( () => {
                                          //When everything is done
                                          Forge.loader.SetMessage("Project Loaded");
                                          Forge.loader.Dismiss();
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
              GameState.module = new Module();
              GameState.module.Mod_Entry_Area = this.data.module_name;
              GameState.module.area._name = this.data.module_name;

              let ifo = GameState.module.toolsetExportIFO();
              let are = GameState.module.area.toolsetExportARE();
              let git = GameState.module.area.toolsetExportGIT();

              ifo.Save( path.join(Forge.Project.directory, 'module.ifo') );
              are.Save( path.join(Forge.Project.directory, GameState.module.area._name+'.are') );
              git.Save( path.join(Forge.Project.directory, GameState.module.area._name+'.git') );

              Forge.Project.Open(() => {
                Forge.Project.InitializeProject( () => {
                  //When everything is done
                  Forge.loader.SetMessage("Project Loaded");
                  Forge.loader.Dismiss();
                });
              });
            }
          }, true);
        }

      }else{
        this.showAlertMessage('You have selected an incorrect path for the parent directory');
      }

    }else{
      this.showAlertMessage('Your project name cannot be blank');
    }
  }

  showAlertMessage(message = ""){
    this.ractive.set('alert', '');
    this.ractive.set('alert', message);
  }

  createProject(onComplete = null){
    //Try to create the files directory
    try{
      fs.mkdirSync(path.join(
        this.data.project_location,
        'files'
      ));
    }catch(e){ console.error('NewProjectWizard.createProject', e); }

    let project_data = {
      Name: this.data.name,
      game: ApplicationProfile.launch.args.gameChoice,
      type: this.data.project_type
    };

    //Create project.json
    fs.writeFile(path.join(
      this.data.project_location,
      'project.json'
    ), JSON.stringify(project_data), (err) => {
      if(err)
        return console.log('save project', err);

      if(typeof onComplete == 'function')
        onComplete();
    });
  }

  directoryExists(dir){
    console.log('Checking Directory', dir);
    try{
      return fs.lstatSync(dir).isDirectory();
    }catch(e){ return false; }
  }

  fileExists(file){
    console.log('Checking File', file);
    try{
      return fs.lstatSync(file).isFile();
    }catch(e){ return false; }
  }

}
