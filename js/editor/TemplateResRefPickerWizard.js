class TemplateResRefPickerWizard extends Wizard {

  constructor(props = {}){
    super();

    this.props = Object.assign({
      autoShow: true,
      selected: '',
      restype: 0,
      onChoose: null
    }, props);


    //Variables
    this.selected = this.props.selected;

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-templateresref.html', null, (tpl) => {
      this.$wizard = $(tpl);

      //DOM Elements
      this.$gameList = $('#modal-templateresref-game-list', this.$wizard);
      this.$projectList = $('#modal-templateresref-project-list', this.$wizard);
      this.$choose = $('#modal-templateresref-choose', this.$wizard);

      let templates = Global.kotorBIF['templates'].GetResourcesByType(this.props.restype);

      for(let i = 0; i < templates.length; i++){
        let name = Global.kotorKEY.GetFileLabel(templates[i].ID);
        let $item = $('<li class="list-group-item" data-name="'+name+'">'+name+'</li>');
        this.$gameList.append($item);

        if(name == this.selected)
          $item.addClass('selected');

        $item.click( (e) => {
          e.preventDefault();

          $('li.selected', this.$gameList).removeClass('selected');
          $item.addClass('selected');
          this.selected = $item.attr('data-name');

        });

      }

      let templatesProj = Global.Project.GetTemplatesByType(ResourceTypes.getKeyByValue(this.props.restype));

      for(let i = 0; i < templatesProj.length; i++){
        let template = templatesProj[i];
        let $item = $('<li class="list-group-item" data-name="'+template.name+'">'+template.name+'</li>');
        this.$projectList.append($item);

        if(name == this.selected)
          $item.addClass('selected');

        $item.click( (e) => {
          e.preventDefault();

          $('li.selected', this.$projectList).removeClass('selected');
          $item.addClass('selected');
          this.selected = $item.attr('data-name');

        });

      }

      this.$choose.on('click', (e) => {
        this.Hide();

        if(this.props.onChoose != null)
          this.props.onChoose(this.selected);

      });

      $('body').append(this.$wizard);
      let $modal = this.$wizard.filter('.modal').modal({
          keyboard: false,
          backdrop: false,
          show: this.props.autoShow
      });

      this.$wizard.draggable({
          handle: ".modal-header"
      });

      if(this.props.autoShow)
        this.Show();

    });

  }

}

module.exports = TemplateResRefPickerWizard;
