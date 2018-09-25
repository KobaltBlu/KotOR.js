class UTDEditorTab extends EditorTab {
  constructor(args = {}){
    super({
      toolbar: {
        items: [
          {name: 'File', items: [
            {name: 'Open File', onClick: () => {

            }},
            {name: 'Save File', onClick: () => {

              if(this.gff != null){
                if(this.gff.path == null){
                  let savePath = dialog.showSaveDialog({
                    title: 'Save UTD',
                    defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                    filters: [
                      {name: 'UTD', extensions: ['utd']}
                  ]});

                  console.log(savePath);

                  if(savePath != null){

                    let fileInfo = path.parse(savePath);

                    this.gff.path = fileInfo.dir;
                    this.gff.file = fileName.name;
                    this.gff.Save();

                  }

                }else{
                  this.gff.Save();
                }

              }else{
                alert('Nothing to save');
              }


            }},
            {name: 'Save File As', onClick: () => {

              if(this.gff != null){
                let savePath = dialog.showSaveDialog({
                  title: 'Save UTD',
                  defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                  filters: [
                    {name: 'UTD', extensions: ['utd']}
                ]});

                console.log(savePath);

                if(savePath != null){

                  let fileInfo = path.parse(savePath);

                  this.gff.path = fileInfo.dir;
                  this.gff.file = fileName.name;
                  this.gff.Save();

                }

              }else{
                alert('Nothing to save');
              }


            }}
          ]}
        ]
      }
    });

    this.args = $.extend({
      gff: null,
      file: null
    }, args);

    this.gff = this.args.gff;

    this.singleInstance = false;
    this.$tabName.text("Door Editor");
    console.log(this.id);
    let id = this.id;
    TemplateEngine.GetTemplateAsync('templates/editor-utd.html', {tabId: id}, (tpl) => {
      this.$tabContent.append(tpl);

      this.$name = $(this.ElementId('#utd-name'), this.$tabContent);
      this.$tag = $(this.ElementId('#utd-tag'), this.$tabContent);
      this.$doorType = $(this.ElementId('#utd-door-type'), this.$tabContent);
      this.$plotItem = $(this.ElementId('#utd-plot-item'), this.$tabContent);
      this.$static = $(this.ElementId('#utd-static'), this.$tabContent);
      this.$hardness = $(this.ElementId('#utd-hardness'), this.$tabContent);
      this.$hitPoints = $(this.ElementId('#utd-hit-points'), this.$tabContent);
      this.$fortitudeSave = $(this.ElementId('#utd-fortitude-save'), this.$tabContent);
      this.$reflexSave = $(this.ElementId('#utd-reflex-save'), this.$tabContent);
      this.$willSave = $(this.ElementId('#utd-will-save'), this.$tabContent);

      this.$verticalTabs = $('.vertical-tabs', this.$tabContent);

      this.verticalTabs = new VerticalTabs(this.$verticalTabs);

      this.$tabContent.css({overflow: 'hidden'});

      console.log(this.$firstName);

      if(this.gff != null)
        this.PopulateFields();

      if(this.args.file != null)
        this.OpenFile(this.args.file);

    });

  }

  GetResourceID(){
    if(this.gff != null)
      return this.gff.resourceID;

    return null;
  }

  ElementId(str){
    return str+'-'+this.id;
  }

  OpenFile(file){
    console.log(file.path);
    this.gff = new GFFObject(file.path, () => {
      console.log(this.gff.RootNode);
      this.PopulateFields();
    });
  }

  PopulateFields() {


    this.$name = $(this.ElementId('#utd-name'), this.$tabContent);
    this.$tag = $(this.ElementId('#utd-tag'), this.$tabContent);
    this.$doorType = $(this.ElementId('#utd-door-type'), this.$tabContent);
    this.$plotItem = $(this.ElementId('#utd-plot-item'), this.$tabContent);
    this.$static = $(this.ElementId('#utd-static'), this.$tabContent);
    this.$hardness = $(this.ElementId('#utd-hardness'), this.$tabContent);
    this.$hitPoints = $(this.ElementId('#utd-hit-points'), this.$tabContent);
    this.$fortitudeSave = $(this.ElementId('#utd-fortitude-save'), this.$tabContent);
    this.$reflexSave = $(this.ElementId('#utd-reflex-save'), this.$tabContent);
    this.$willSave = $(this.ElementId('#utd-will-save'), this.$tabContent);


    //Name
    this.$name.val(ipcRenderer.sendSync('TLKGetStringById', this.gff.GetFieldByLabel("LocName").GetCExoLocString().RESREF).Value);
    this.$name.data('CExoLocString', this.gff.GetFieldByLabel("LocName").GetCExoLocString());
    this.$name.prop('disabled', true);
    this.InitCExoLocStringField(this.$name);
    //Tag
    this.$tag.val(this.gff.GetFieldByLabel("Tag").Value);
    this.$tag.on('input',function(e){
      this.gff.GetFieldByLabel("Tag").Value = this.$tag.val();
    });
    //DoorType
    for (let key in Global.kotor2DA.genericdoors.rows) {
      let genericdoor = Global.kotor2DA.genericdoors.rows[key];
      let label = genericdoor['label'];
      this.$doorType.append('<option value="'+key+'">'+label+'</option>');
    }

    let options = $('option', this.$doorType);
    let arr = options.map(function(_, o) { return { t: $(o).text(), v: o.value }; }).get();
    arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
    options.each(function(i, o) {
      o.value = arr[i].v;
      $(o).text(arr[i].t);
    });

    this.$doorType.val(this.gff.GetFieldByLabel("GenericType").Value).prop('disabled', false);
    this.$doorType.change( () => {
      this.gff.GetFieldByLabel("GenericType").Value = this.$doorType.val();
    });

    //PlotItem
    this.$plotItem.prop('checked', this.gff.GetFieldByLabel("Plot").Value == 0 ? false : true );
    this.$plotItem.change( (e) => {
      if(this.$plotItem.is(':checked')){
        this.gff.GetFieldByLabel("Plot").Value = 1;
      }else{
        this.gff.GetFieldByLabel("Plot").Value = 0;
      }
    });

    //Static
    this.$static.prop('checked', this.gff.GetFieldByLabel("Static").Value == 0 ? false : true );
    this.$static.change( (e) => {
      if(this.$static.is(':checked')){
        this.gff.GetFieldByLabel("Static").Value = 1;
      }else{
        this.gff.GetFieldByLabel("Static").Value = 0;
      }
    });

    //Description
    this.$description.val(ipcRenderer.sendSync('TLKGetStringById', this.gff.GetFieldByLabel("Description").GetCExoLocString().RESREF).Value);
    this.$description.data('CExoLocString', this.gff.GetFieldByLabel("Description").GetCExoLocString());
    this.$description.prop('disabled', true);
    this.InitCExoLocStringField(this.$description);

    //Hardness
    this.$hardness.val(this.gff.GetFieldByLabel("Hardness").Value);
    this.$hardness.on('input',function(e){
      this.gff.GetFieldByLabel("Hardness").Value = this.$tag.val();
    });

    //Hit Points
    this.$hitPoints.val(this.gff.GetFieldByLabel("HP").Value);
    this.$hitPoints.on('input',function(e){
      this.gff.GetFieldByLabel("HP").Value = this.$tag.val();
    });

    //Fortitude Save
    this.$fortitudeSave.val(this.gff.GetFieldByLabel("Fort").Value);
    this.$fortitudeSave.on('input',function(e){
      this.gff.GetFieldByLabel("Fort").Value = this.$tag.val();
    });

    //Reflex Save
    this.$reflexSave.val(this.gff.GetFieldByLabel("Ref").Value);
    this.$reflexSave.on('input',function(e){
      this.gff.GetFieldByLabel("Ref").Value = this.$tag.val();
    });

    //Will Save
    this.$willSave.val(this.gff.GetFieldByLabel("Will").Value);
    this.$willSave.on('input',function(e){
      this.gff.GetFieldByLabel("Will").Value = this.$tag.val();
    });

  }

}

module.exports = UTDEditorTab;
