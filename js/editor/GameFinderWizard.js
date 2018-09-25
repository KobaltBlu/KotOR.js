class GameFinderWizard extends Wizard {

  constructor(){
    super();
    console.log('GameFinderWizard', this);

    this.kotor_path = Config.options.Games[GameKey].Location;
    this.tsl_path = Config.options.Games.TSL.Location;

    console.log(Config.options.Games.TSL.Location);

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-game-finder.html', null, (tpl) => {
      this.$wizard = $(tpl);

      //KotOR Elements
      this.$kotor_directory = $('#modal-game-finder-kotor-directory', this.$wizard).val(this.kotor_path);
      this.$kotor_directory_browse = $('#modal-game-finder-kotor-directory-browse', this.$wizard);

      //TSL Elements
      this.$tsl_directory = $('#modal-game-finder-tsl-directory', this.$wizard).val(this.tsl_path);
      this.$tsl_directory_browse = $('#modal-game-finder-tsl-directory-browse', this.$wizard);

      this.$kotor_directory.on('input', (e) => {
        this.kotor_path = this.$kotor_directory.val();
      });

      this.$kotor_directory_browse.on('click', (e) => {
        e.preventDefault();
        let path = dialog.showOpenDialog({properties: ['openDirectory']});
        if(typeof path != 'undefined'){
          console.log(path[0]);
          this.kotor_path = path[0];
          this.$kotor_directory.val(this.kotor_path);
        }
      });

      this.$tsl_directory.on('input', (e) => {
        this.tsl_path = this.$tsl_directory.val();
      });

      this.$tsl_directory_browse.on('click', (e) => {
        e.preventDefault();
        let path = dialog.showOpenDialog({properties: ['openDirectory']});
        if(typeof path != 'undefined'){
          console.log(path[0]);
          this.tsl_path = path[0];
          this.$tsl_directory.val(this.tsl_path);
        }
      });

      $('#modal-game-finder-save', this.$wizard).on('click', (e) => {
        e.preventDefault();

        Config.options.Games[GameKey].Location = this.kotor_path;
        Config.options.Games.TSL.Location = this.tsl_path;
        Config.options.first_run = false;

        Config.Save();
        this.Close();
      });

      $('body').append(this.$wizard);
      this.$wizard.filter('.modal').modal({
          backdrop: 'static',
          keyboard: false
      });

    });

  }

}


module.exports = GameFinderWizard;
