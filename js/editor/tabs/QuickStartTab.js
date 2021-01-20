class QuickStartTab extends EditorTab {
  constructor(){
    super();
    this.singleInstance = true;
    this.$tabName.text("Start Page");

    if(this.singleInstance){
      this.$tabContent.addClass('QuickStartTab');
    }

    TemplateEngine.GetTemplateAsync('templates/tabs/tab-quick-start.html', null, (tpl) => {
      this.$tabContent.append(tpl);

      this.$recentProjectsList = $('#list-recent-projects', this.$tabContent);
      this.$recentFilesList = $('#list-recent-files', this.$tabContent);
      this.$lucasforumThreads = $('#list-lucasforum-threads', this.$tabContent);
      this.$newProject = $('#btn-new-project', this.$tabContent);
      this.$openProject = $('#btn-open-project', this.$tabContent);

      $.each(Config.getRecentProjects(), (i, dir) => {
        try{
          let project = require(path.join(dir, 'project.json'));
          let $recentProject = $('<li><span class="glyphicon glyphicon-file"></span>&nbsp;<a href="#">'+project.Name+'</a></span></li>');

          $('a', $recentProject).on('click', (e) => {
            e.preventDefault();
            console.log(dir);
            Global.Project = new Project(dir);
            Global.Project.Open(() => {
              loader.SetMessage("Project Loaded");
              //loader.Dismiss();

              this.tabManager.RemoveTab(this);
            });
          });

          this.$recentProjectsList.append($recentProject);
        }catch(e){}
      });

      $.each(Config.getRecentFiles(), (i, file) => {
        try{
          let $recentFile = $('<li><span class="glyphicon glyphicon-file"></span>&nbsp;<a href="#">'+file+'</a></span></li>');

          $('a', $recentFile).on('click', (e) => {
            e.preventDefault();
            FileTypeManager.onOpenResource(file);
          });

          this.$recentFilesList.append($recentFile);
        }catch(e){}
      });

      this.$newProject.on('click', (e) => {
        e.preventDefault();
        let newProjectWizard = new NewProjectWizard();
        newProjectWizard.Show();
      });

      this.$openProject.on('click', async (e) => {
        e.preventDefault();
        let payload = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            {name: 'KMS Project', extensions: ['json']}
          ],
          properties: ['createDirectory'],
        });
        if(!payload.canceled && payload.filePaths.length){
          Global.Project = new Project(path.dirname(payload.filePaths[0]));
          Global.Project.Open(() => {

            loader.SetMessage("Loading Complete");
            //Fade out the loading screen because the app is ready
            loader.Dismiss();
          });
        }
      });

    });

  }

  Show(){
    super.Show();
    try{
      this.$recentProjectsList.html('');
      $.each(Config.getRecentProjects(), (i, dir) => {
        try{
          let project = require(path.join(dir, 'project.json'));
          let $recentProject = $('<li><span class="glyphicon glyphicon-file"></span>&nbsp;<a href="#">'+project.Name+'</a></span></li>');

          $('a', $recentProject).on('click', (e) => {
            e.preventDefault();
            console.log(dir);
            Global.Project = new Project(dir);
            Global.Project.Open(() => {
              loader.SetMessage("Project Loaded");
              //loader.Dismiss();

              this.tabManager.RemoveTab(this);
            });
          });

          this.$recentProjectsList.append($recentProject);
        }catch(e){}
      });

      this.$recentFilesList.html('');
      $.each(Config.getRecentFiles(), (i, file) => {
        try{
          let $recentFile = $('<li><span class="glyphicon glyphicon-file"></span>&nbsp;<a href="#">'+file+'</a></span></li>');

          $('a', $recentFile).on('click', (e) => {
            e.preventDefault();
            FileTypeManager.onOpenResource(file);
          });

          this.$recentFilesList.append($recentFile);
        }catch(e){}
      });
    }catch(e){}
  }

}

module.exports = QuickStartTab;
