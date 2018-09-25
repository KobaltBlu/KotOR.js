class LevelSelectWizard extends Wizard {

  constructor(selected = -1, onSelect = null){
    super();

    //Variables
    this.levels = JSON.parse(fs.readFileSync('maps_kotor.json', 'utf8'));
    this.levels[-1] = {module: 'None', name: 'None', nameref: -1};
    this.selected = selected;
    this.onSelect = onSelect;

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-level-select.html', null, (tpl) => {
      this.$wizard = $(tpl);

      console.log('Level Select Wizard', this);

      //DOM Elements
      this.$list = $('#modal-level-list', this.$wizard);
      this.$choose = $('#modal-level-choose', this.$wizard);

      for(let i = -1; i!=this.levels.length; i++){
        let level = this.levels[i];

        let $item = $('<li class="list-group-item" data-index="'+i+'">'+level.module+' - '+level.name+'</li>');

        if(this.selected == i)
          $item.addClass('selected');

        this.$list.append($item);
        $item.click( (e) => {
          e.preventDefault();

          $('li.selected', this.$list).removeClass('selected');
          $item.addClass('selected');
          this.selected = parseInt($item.attr('data-index'));

        });

      }

      this.$choose.on('click', (e) => {
        e.preventDefault();

        console.log(typeof this.onSelect, typeof this.onSelect == 'function');

        if(typeof this.onSelect == 'function')
          this.onSelect(this.selected, this.levels[this.selected]);

        this.Hide();
      });

      $('body').append(this.$wizard);
      this.$wizard.filter('.modal').modal({
          backdrop: 'static',
          keyboard: false
      });

      this.Show();

    });


  }

}

module.exports = LevelSelectWizard;
