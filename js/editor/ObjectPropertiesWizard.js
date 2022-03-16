class ObjectPropertiesWizard extends Wizard {

  constructor(props = {}){
    super();

    this.props = Object.assign({
      autoShow: false
    }, props);


    //Variables
    //this.selected = selected;

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-object-props.html', null, (tpl) => {
      this.$wizard = $(tpl);

      //DOM Elements
      this.$templateList = $('#modal-object-properties-template-select', this.$wizard);
      this.$list = $('#modal-object-properties-appearance-select', this.$wizard);
      this.$update = $('#modal-object-properties-update', this.$wizard);

      this.$update.on('click', (e) => {
        this.Hide();
      });

      $('body').append(this.$wizard);
      this.$wizard.filter('.modal').modal({
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

  SetObject(obj){

    this.obj = obj;

    if(this.obj instanceof ModulePlaceable)
      this.InitPlaceable();

    if(this.obj instanceof ModuleDoor)
      this.InitDoor();

    if(this.obj instanceof ModuleSound)
      this.InitSound();

  }

  InitPlaceable () {

    try {

      this.$templateList.html('').off('change');

      let templates = Global.kotorBIF['templates'].GetResourcesByType(ResourceTypes['utp']);

      for(let i = 0; i < templates.length; i++){
        let name = Global.kotorKEY.GetFileLabel(templates[i].ID);
        this.$templateList.append('<option value="'+name+'">'+name+'</option>');
      }

      this.$templateList.on('change', (e) => {
        this.obj.template.ChangeTemplate(this.$templateList.val(), () => {

        });
      });

    }catch(e){}


    try {
      let placeables = Global.kotor2DA['placeables'].rows;
      this.$list.html('').off('change');
      for (let key in placeables) {
        if (placeables.hasOwnProperty(key)) {
          this.$list.append('<option value="'+placeables[key]['(Row Label)']+'">'+placeables[key].modelname+'</option>');
        }
      }

      this.$list.val(this.obj.template.gff.GetFieldByLabel('Appearance').Value);

      this.$list.on('change', (e) => {
        this.obj.template.gff.GetFieldByLabel('Appearance').Value = this.$list.val();
        this.obj.template.LoadModel();
      });
    }catch(e){ console.error(e) }

    this.Show();
  }

  InitDoor () {

    try {

      this.$templateList.html('').off('change');

      let templates = Global.kotorBIF['templates'].GetResourcesByType(ResourceTypes['utd']);

      for(let i = 0; i < templates.length; i++){
        let name = Global.kotorKEY.GetFileLabel(templates[i].ID);
        this.$templateList.append('<option value="'+name+'">'+name+'</option>');
      }

    }catch(e){}

    try {
      let doors = Global.kotor2DA['genericdoors'].rows;
      this.$list.html('').off('change');
      for (let key in doors) {
        if (doors.hasOwnProperty(key)) {
          this.$list.append('<option value="'+doors[key]['(Row Label)']+'">'+doors[key].modelname+'</option>');
        }
      }

      this.$list.val(this.obj.template.gff.GetFieldByLabel('GenericType').Value);

      this.$list.on('change', (e) => {
        this.obj.template.gff.GetFieldByLabel('GenericType').Value = this.$list.val();
        this.obj.template.LoadModel();
      });
    }catch(e){ console.error(e) }

    this.Show();
  }

  InitSound () {


    this.Show();
  }

}

module.exports = ObjectPropertiesWizard;
