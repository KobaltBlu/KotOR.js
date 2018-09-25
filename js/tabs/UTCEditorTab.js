class UTCEditorTab extends EditorTab {
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
                    title: 'Save UTC',
                    defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                    filters: [
                      {name: 'UTC', extensions: ['utc']}
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
                  title: 'Save UTC',
                  defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                  filters: [
                    {name: 'UTC', extensions: ['utc']}
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
    TemplateEngine.GetTemplateAsync('templates/editor-utc.html', {tabId: id}, (tpl) => {
      this.$tabContent.append(tpl);

      this.$firstName = $(this.ElementId('#utc-first-name'), this.$tabContent);
      this.$lastName = $(this.ElementId('#utc-last-name'), this.$tabContent);
      this.$tag = $(this.ElementId('#utc-tag'), this.$tabContent);
      this.$appearance = $(this.ElementId('#utc-appearance'), this.$tabContent);
      this.$gender = $(this.ElementId('#utc-gender'), this.$tabContent);
      this.$description = $(this.ElementId('#utc-description'), this.$tabContent);
      this.$race = $(this.ElementId('#utc-race'), this.$tabContent);
      this.$phenotype = $(this.ElementId('#utc-phenotype'), this.$tabContent);
      this.$bodybag = $(this.ElementId('#utc-bodybag'), this.$tabContent);
      this.$portrait = $(this.ElementId('#utc-portrait'), this.$tabContent);
      this.$dialog = $(this.ElementId('#utc-dialog'), this.$tabContent);
      this.$dialogInterrupt = $(this.ElementId('#utc-dialog-no-interrupt'), this.$tabContent);


      //Inventory
      this.$iSlots = $(this.ElementId('#utc-inventory-slots'), this.$tabContent);
      this.$iSlotImplant = $(this.ElementId('#utc-inventory-slot-implant'), this.$tabContent);
      this.$iSlotHead = $(this.ElementId('#utc-inventory-slot-head'), this.$tabContent);
      this.$iSlotWrists = $(this.ElementId('#utc-inventory-slot-wrists'), this.$tabContent);
      this.$iSlotLArm = $(this.ElementId('#utc-inventory-slot-larm'), this.$tabContent);
      this.$iSlotArmor = $(this.ElementId('#utc-inventory-slot-chest'), this.$tabContent);
      this.$iSlotRArm = $(this.ElementId('#utc-inventory-slot-rarm'), this.$tabContent);
      this.$iSlotLHand = $(this.ElementId('#utc-inventory-slot-lhand'), this.$tabContent);
      this.$iSlotBelt = $(this.ElementId('#utc-inventory-slot-belt'), this.$tabContent);
      this.$iSlotRHand = $(this.ElementId('#utc-inventory-slot-rhand'), this.$tabContent);

      this.$verticalTabs = $('.vertical-tabs', this.$tabContent);

      this.verticalTabs = new VerticalTabs(this.$verticalTabs);

      this.$tabContent.css({overflow: 'hidden'});

      this.$preview = $('<img style="visibility: hidden;"/>');
      this.$preview.insertBefore( this.$firstName.parent() );

      this.previewWidth = 150;
      this.previewHeight = this.previewWidth * 2;

      this.$preview.width(this.previewWidth).height(this.previewHeight);

      this.offscreenRenderer = new OffscreenRenderer({
        width: this.previewWidth,
        height: this.previewHeight
      });

      console.log(this.$firstName);

      if(this.gff != null)
        this.PopulateFields();

      if(this.args.file != null)
        this.OpenFile(this.args.file);



    });

  }

  RenderPreview(){
    let template = UTCObject.FromGFF(this.gff);
    template.LoadEquipment( () => {
      template.LoadModel( (model) => {

        let scene = this.offscreenRenderer.ResetScene();
        scene.add(model);

        this.offscreenRenderer.Render();
        this.$preview.attr('src', this.offscreenRenderer.GetRenderedImage()).css('visibility', 'visible');

      });
    });
  }

  GetResourceID(){
    if(this.gff != null)
      return this.gff.resourceID;

    return null;
  }

  OpenFile(_file){

    console.log('Model Loading', _file);

    let loader = new THREE.MDLLoader();
    let info = Utility.filePathInfo(_file);
    let file = path.parse(info.path);

    console.log(file, info);

    if(info.location == 'local'){

      fs.readFile(info.path, (err, buffer) => {
        if (err) throw err;

        try{
          this.gff = new GFFObject(buffer, (gff) => {
            this.gff = gff;
            console.log(this.gff.RootNode);
            this.PopulateFields();
            this.RenderPreview();
          });
        }
        catch (e) {
          console.log(e);
          this.Remove();
        }

      });

    }else if(info.location == 'archive'){

      switch(info.archive.type){
        case 'bif':
          Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes['utc']), (buffer) => {
            try{
              console.log(buffer);
              this.gff = new GFFObject(buffer, (gff) => {
                this.gff = gff;
                console.log(this.gff.RootNode);
                this.PopulateFields();
                this.RenderPreview();
              });
            }
            catch (e) {
              console.log(e);
              this.Remove();
            }
          }, (e) => {
            throw 'Resource not found in BIF archive '+info.archive.name;
            this.Remove();
          });
        break;
      }

    }

    this.fileType = info.file.ext;
    this.location = info.location;

  }

  PopulateFields() {
    //First Name
    this.$firstName.val(ipcRenderer.sendSync('TLKGetStringById', this.gff.GetFieldByLabel("FirstName").GetCExoLocString().RESREF).Value);
    this.$firstName.data('CExoLocString', this.gff.GetFieldByLabel("FirstName").GetCExoLocString());
    this.$firstName.prop('disabled', true);
    this.InitCExoLocStringField(this.$firstName);
    //Last Name
    this.$lastName.val(ipcRenderer.sendSync('TLKGetStringById', this.gff.GetFieldByLabel("LastName").GetCExoLocString().RESREF).Value);
    this.$lastName.data('CExoLocString', this.gff.GetFieldByLabel("LastName").GetCExoLocString());
    this.$lastName.prop('disabled', true);
    this.InitCExoLocStringField(this.$lastName);
    //Tag
    this.$tag.val(this.gff.GetFieldByLabel("Tag").Value);
    //Appearance
    for (let key in Global.kotor2DA.appearance.rows) {
      let appearance = Global.kotor2DA.appearance.rows[key];
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

    this.$appearance.val(this.gff.GetFieldByLabel("Appearance_Type").Value).prop('disabled', false);
    this.$appearance.change( () => {
      this.gff.GetFieldByLabel("Appearance_Type").Value = this.$appearance.val();
    });
    //Gender
    for (let key in Global.kotor2DA.gender.rows) {
      let gender = Global.kotor2DA.gender.rows[key];
      let label = Global.kotorTLK.TLKStrings[gender['name']].Value;
      this.$gender.append('<option value="'+key+'">'+label+'</option>');
    }
    this.$gender.val(this.gff.GetFieldByLabel("Gender").Value).prop('disabled', false);
    //Description
    this.$description.val(ipcRenderer.sendSync('TLKGetStringById', this.gff.GetFieldByLabel("Description").GetCExoLocString().RESREF).Value);
    this.$description.data('CExoLocString', this.gff.GetFieldByLabel("Description").GetCExoLocString());
    this.$description.prop('disabled', true);
    this.InitCExoLocStringField(this.$description);
    //Phenotype
    for (let key in Global.kotor2DA.phenotype.rows) {
      let phenotype = Global.kotor2DA.phenotype.rows[key];
      let label = phenotype['label'];
      this.$phenotype.append('<option value="'+key+'">'+label+'</option>');
    }
    this.$phenotype.val(this.gff.GetFieldByLabel("Phenotype").Value).prop('disabled', false);
    //Race
    for (let key in Global.kotor2DA.racialtypes.rows) {
      let racetype = Global.kotor2DA.racialtypes.rows[key];
      let label = racetype['label'];
      this.$race.append('<option value="'+key+'">'+label+'</option>');
    }
    this.$race.val(this.gff.GetFieldByLabel("Race").Value).prop('disabled', false);
    //BodyBag
    for (let key in Global.kotor2DA.bodybag.rows) {
      let bodybag = Global.kotor2DA.bodybag.rows[key];
      let label = bodybag['label'];
      this.$bodybag.append('<option value="'+key+'">'+label+'</option>');
    }
    this.$bodybag.val(this.gff.GetFieldByLabel("BodyBag").Value).prop('disabled', false);
    //Portrait
    for (let key in Global.kotor2DA.portraits.rows) {
      let portrait = Global.kotor2DA.portraits.rows[key];
      let label = portrait['baseresref'];
      this.$portrait.append('<option value="'+key+'">'+label+'</option>');
    }
    this.$portrait.val(this.gff.GetFieldByLabel("PortraitId").Value).prop('disabled', false);

    //Dialog
    this.$dialog.val(this.gff.GetFieldByLabel("Conversation").Value);

    //Dialog Interruptable
    this.$dialogInterrupt.val();


    //Inventory
    let equipment = this.gff.GetFieldByLabel("Equip_ItemList");
    if(this.gff.GetFieldByLabel("Race").Value == 5){
      this.$iSlots.removeClass('droid').addClass('droid');
    }else{

      for(let i = 0; i < equipment.ChildStructs.length; i++){
        let strt = equipment.ChildStructs[i];
        let equippedRes = strt.GetFieldByLabel('EquippedRes').Value;
        let $slot = null;

        switch(strt.Type){
          case UTCObject.SLOT.HEAD:
            $slot = this.$iSlotHead;
          break;
          case UTCObject.SLOT.ARMS:
            $slot = this.$iSlotWrists;
          break;
          case UTCObject.SLOT.ARMOR:
            $slot = this.$iSlotArmor;
          break;
          case UTCObject.SLOT.LEFTHAND:
            $slot = this.$iSlotLHand;
          break;
          case UTCObject.SLOT.RIGHTHAND:
            $slot = this.$iSlotRHand;
          break;
          case UTCObject.SLOT.LEFTARMBAND:
            $slot = this.$iSlotLArm;
          break;
          case UTCObject.SLOT.RIGHTARMBAND:
            $slot = this.$iSlotRArm;
          break;
          case UTCObject.SLOT.IMPLANT:
            $slot = this.$iSlotImplant;
          break;
          case UTCObject.SLOT.BELT:
            $slot = this.$iSlotBelt;
          break;
        }

        if($slot != null){
          $slot.html('').removeClass('equipped').addClass('equipped');
          UTIObject.FromTemplate(equippedRes, (uti) => {
            uti.getIcon((icon) => {
              icon.getPixelData( ( pixelData ) => {
                pixelData = icon.FlipY(pixelData);
                let $canvas = $('<canvas width="64" height="64" />');
                let canvas = $canvas[0];
                let ctx = canvas.getContext('2d');
                let imageData = ctx.getImageData(0, 0, 64, 64);
                let data = imageData.data;

                data.set(pixelData);
                ctx.putImageData(imageData, 0, 0);
                $slot.append($canvas)
                console.log('PixelData', pixelData);
              }, (e) => {
                console.error('UTIObject.getIcon', e);
              })

            })
          });
        }
      }

    }

    //this.$iSlotImplant.

  }

}

module.exports = UTCEditorTab;
