class UTPEditorTab extends EditorTab {
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
                    title: 'Save UTP',
                    defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                    filters: [
                      {name: 'UTP', extensions: ['utp']}
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
                  title: 'Save UTP',
                  defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                  filters: [
                    {name: 'UTP', extensions: ['utp']}
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
    this.$tabName.text("Creature Editor");
    console.log(this.id);
    let id = this.id;
    TemplateEngine.GetTemplateAsync('templates/editor-utp.html', {tabId: id}, (tpl) => {
      this.$tabContent.append(tpl);

      this.$name = $(this.ElementId('#utp-name'), this.$tabContent);
      this.$tag = $(this.ElementId('#utp-tag'), this.$tabContent);
      this.$appearance = $(this.ElementId('#utp-appearance'), this.$tabContent);
      this.$plotItem = $(this.ElementId('#utp-plot-item'), this.$tabContent);
      this.$static = $(this.ElementId('#utp-static'), this.$tabContent);
      this.$minHP = $(this.ElementId('#utp-min-1hp'), this.$tabContent);
      this.$hardness = $(this.ElementId('#utp-hardness'), this.$tabContent);
      this.$hitPoints = $(this.ElementId('#utp-hit-points'), this.$tabContent);
      this.$fortitudeSave = $(this.ElementId('#utp-fortitude-save'), this.$tabContent);
      this.$reflexSave = $(this.ElementId('#utp-reflex-save'), this.$tabContent);
      this.$willSave = $(this.ElementId('#utp-will-save'), this.$tabContent);

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
    //First Name
    this.$name.val(ipcRenderer.sendSync('TLKGetStringById', this.gff.GetFieldByLabel("LocName").GetCExoLocString().RESREF).Value);
    this.$name.data('CExoLocString', this.gff.GetFieldByLabel("LocName").GetCExoLocString());
    this.$name.prop('disabled', true);
    this.InitCExoLocStringField(this.$name);
    //Tag
    this.$tag.val(this.gff.GetFieldByLabel("Tag").Value);
    this.$tag.on('input',function(e){
      this.gff.GetFieldByLabel("Tag").Value = this.$tag.val();
    });
    //Appearance
    for (let key in Global.kotor2DA.placeables.rows) {
      let appearance = Global.kotor2DA.placeables.rows[key];
      let label = appearance['label'];
      this.$appearance.append('<option value="'+key+'">'+label+'</option>');
    }

    let options = $('option', this.$appearance);
    let arr = options.map(function(_, o) { return { t: $(o).text(), v: o.value }; }).get();
    arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
    options.each(function(i, o) {
      o.value = arr[i].v;
      $(o).text(arr[i].t);
    });

    this.$appearance.val(this.gff.GetFieldByLabel("Appearance").Value).prop('disabled', false);
    this.$appearance.change( () => {
      this.gff.GetFieldByLabel("Appearance").Value = this.$appearance.val();
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

    //Min1HP
    this.$minHP.prop('checked', this.gff.GetFieldByLabel("Min1HP").Value == 0 ? false : true );
    this.$minHP.change( (e) => {
      if(this.$minHP.is(':checked')){
        this.gff.GetFieldByLabel("Min1HP").Value = 1;
      }else{
        this.gff.GetFieldByLabel("Min1HP").Value = 0;
      }
    });

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

module.exports = UTPEditorTab;
