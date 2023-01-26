import { EditorTab } from "./";
import { NewProjectWizard } from "../wizards";
import { FileTypeManager } from "../FileTypeManager";
import { Forge } from "../Forge";
import { Project } from "../Project";
import { WindowDialog } from "../../utility/WindowDialog";
import { ConfigClient } from "../../utility/ConfigClient";
import * as path from "path";

import template from "../templates/tabs/tab-quick-start.html";
import { EditorFile } from "../EditorFile";
// import TabQuickStart from "../../apps/forge/components/tabs/TabQuickStart";

export class QuickStartTab extends EditorTab {
  
  template: string = template;
  $recentProjectsList: JQuery<HTMLElement>;
  $recentFilesList: JQuery<HTMLElement>;
  $lucasforumThreads: JQuery<HTMLElement>;
  $newProject: JQuery<HTMLElement>;
  $openProject: JQuery<HTMLElement>;

  constructor(){
    super();
    // this.singleInstance = true;
    this.tabName = `Start Page`;

    // this.tabContentView = new TabQuickStart({tab: this});

    if(this.singleInstance){
      // this.$tabContent.addClass('QuickStartTab');
    }

    this.initContentTemplate();

    // this.$recentProjectsList = $('#list-recent-projects', this.$tabContent);
    // this.$recentFilesList = $('#list-recent-files', this.$tabContent);
    // this.$lucasforumThreads = $('#list-lucasforum-threads', this.$tabContent);
    // this.$newProject = $('#btn-new-project', this.$tabContent);
    // this.$openProject = $('#btn-open-project', this.$tabContent);

    // this.buildRecentProjects();
    // this.buildRecentFiles();

    // this.$newProject.on('click', (e: any) => {
    //   e.preventDefault();
    //   let newProjectWizard = new NewProjectWizard();
    //   newProjectWizard.Show();
    // });

    // this.$openProject.on('click', async (e: any) => {
    //   e.preventDefault();
    //   let payload = await WindowDialog.showOpenDialog({
    //     properties: ['openFile'],
    //     filters: [
    //       {name: 'Forge Project', extensions: ['json']}
    //     ],
    //     // properties: ['createDirectory'],
    //   });
    //   if(!payload.canceled && payload.filePaths.length){
    //     Forge.Project = new Project(path.dirname(payload.filePaths[0]));
    //     Forge.Project.Open(() => {

    //       Forge.loader.SetMessage("Loading Complete");
    //       //Fade out the loading screen because the app is ready
    //       Forge.loader.Dismiss();
    //     });
    //   }
    // });

  }

  render(): string {
    return this.tabContentView.render();
  }

  buildRecentProjects(){
    // this.$recentProjectsList.html('');
    // Forge.getRecentProjects().forEach( (dir, i) => {
    //   try{
    //     let project: any = {};//require(path.join(dir, 'project.json'));
    //     let $recentProject = $('<li><span class="glyphicon glyphicon-file"></span>&nbsp;<a href="#">'+project.name+'</a></span></li>');

    //     $('a', $recentProject).on('click', (e: any) => {
    //       e.preventDefault();
    //       console.log(dir);
    //       Forge.Project = new Project(dir);
    //       Forge.Project.Open(() => {
    //         Forge.loader.SetMessage("Project Loaded");
    //         //loader.Dismiss();

    //         this.tabManager.RemoveTab(this);
    //       });
    //     });

    //     this.$recentProjectsList.append($recentProject);
    //   }catch(e){}
    // });
  }

  buildRecentFiles(){
    // this.$recentFilesList.html('');
    // Forge.getRecentFiles().forEach( (file: EditorFile, i) => {
    //   try{
    //     let $recentFile = $('<li><span class="glyphicon glyphicon-file"></span>&nbsp;<a href="#">'+file.path+'</a></span></li>'); 

    //     $('a', $recentFile).on('click', (e: any) => {
    //       e.preventDefault();
    //       FileTypeManager.onOpenResource(file);
    //     });

    //     this.$recentFilesList.append($recentFile);
    //   }catch(e){}
    // });
  }

  Show(){
    super.Show();
    try{
      // this.buildRecentProjects();
      // this.buildRecentFiles();
    }catch(e){}
  }

}
