class UTDEditorTab extends EditorTab {
  constructor(file){
    super();

    this.file = null;

    if(this.file instanceof GFFObject){
      this.gff = file;
    }else{
      this.file = file;
    }

    this.singleInstance = false;
    this.$tabName.text("Door Editor");
    console.log(this.id);
    let id = this.id;
    TemplateEngine.GetTemplateAsync('templates/editor-utd.html', {tabId: id}, (tpl) => {
      this.$tabContent.append(tpl);

      this.$name = $(this.ElementId('#utd-name'), this.$tabContent);
      this.$tag = $(this.ElementId('#utd-tag'), this.$tabContent);
      this.$description = $(this.ElementId('#utd-description'), this.$tabContent);
      this.$doorType = $(this.ElementId('#utd-door-type'), this.$tabContent);
      this.$plotItem = $(this.ElementId('#utd-plot-item'), this.$tabContent);
      this.$static = $(this.ElementId('#utd-static'), this.$tabContent);
      this.$hardness = $(this.ElementId('#utd-hardness'), this.$tabContent);
      this.$hitPoints = $(this.ElementId('#utd-hit-points'), this.$tabContent);
      this.$fortitudeSave = $(this.ElementId('#utd-fortitude-save'), this.$tabContent);
      this.$reflexSave = $(this.ElementId('#utd-reflex-save'), this.$tabContent);
      this.$willSave = $(this.ElementId('#utd-will-save'), this.$tabContent);

      //Lock
      this.$lock = $(this.ElementId('#utd-locked'), this.$tabContent);
      this.$lockable = $(this.ElementId('#utd-lockable'), this.$tabContent);
      this.$autoRemoveKey = $(this.ElementId('#utd-auto-remove-key'), this.$tabContent);
      this.$keyRequired = $(this.ElementId('#utd-key-required'), this.$tabContent);
      this.$openLockDC = $(this.ElementId('#utd-open-lock-dc'), this.$tabContent);
      this.$closeLockDC = $(this.ElementId('#utd-close-lock-dc'), this.$tabContent);
      this.$keyTag = $(this.ElementId('#utd-key-tag'), this.$tabContent);

      //Advanced
      this.$templateResRef = $(this.ElementId('#utd-template-res-ref'), this.$tabContent);
      this.$faction = $(this.ElementId('#utd-faction'), this.$tabContent);
      this.$conversation = $(this.ElementId('#utd-conversation'), this.$tabContent);
      this.$noInterrupt = $(this.ElementId('#utd-no-interrupt'), this.$tabContent);
      this.$animationState = $(this.ElementId('#utd-animation-state'), this.$tabContent);

      //Script Inputs
      this.$onClick = $(this.ElementId('#utd-on-click'), this.$tabContent);
      this.$onClosed = $(this.ElementId('#utd-on-closed'), this.$tabContent);
      this.$onDamaged = $(this.ElementId('#utd-on-damaged'), this.$tabContent);
      this.$onDeath = $(this.ElementId('#utd-on-death'), this.$tabContent);
      this.$onDisarm = $(this.ElementId('#utd-on-disarm'), this.$tabContent);
      this.$onHeartbeat = $(this.ElementId('#utd-on-heartbeat'), this.$tabContent);
      this.$onLock = $(this.ElementId('#utd-on-lock'), this.$tabContent);
      this.$onMeleeAttacked = $(this.ElementId('#utd-on-melee-attacked'), this.$tabContent);
      this.$onOpen = $(this.ElementId('#utd-on-open'), this.$tabContent);
      this.$onSpellCastAt = $(this.ElementId('#utd-on-spell-cast-at'), this.$tabContent);
      this.$onTrapTriggered = $(this.ElementId('#utd-on-trap-triggered'), this.$tabContent);
      this.$onUnlock = $(this.ElementId('#utd-on-unlock'), this.$tabContent);
      this.$onUsed = $(this.ElementId('#utd-on-used'), this.$tabContent);
      this.$onUserDefined = $(this.ElementId('#utd-on-user-defined'), this.$tabContent);

      this.$navBar = $('.navbar-sidebar-wizard-horizontal', this.$tabContent);
      this.$utcTabContent = $(this.ElementId('#utd-tab-content'), this.$tabContent);

      $('.texture-canvas', this.$tabContent).each( (i, ele) => {
        let $ele = $(ele);
        let $canvas = $('<canvas/>');
        $ele.append($canvas);
        this.GameImageToCanvas($canvas[0], $ele.attr('texture'));
      });

      this.$verticalTabs = $('.vertical-tabs', this.$tabContent);

      this.verticalTabs = new VerticalTabs(this.$verticalTabs);

      this.$tabContent.css({overflow: 'hidden'});

      this.$previewContainer = $(this.ElementId('#utd-preview'), this.$tabContent);

      this.$preview = $('<img style="visibility: hidden; width: 100%; height: 100%;"/>');

      this.ui3DRenderer = new UI3DRenderer({
        width: this.$preview.width(),
        height: this.$preview.height()
      });

      this.ui3DRenderer.onBeforeRender = this.RenderCallback.bind(this);

      this.$previewContainer.append( this.ui3DRenderer.canvas );

      console.log( this.$firstName );

      this.onResize();

      if(this.gff != null)
        this.PopulateFields();

      if(this.file != null)
        this.OpenFile(this.file);

    });

  }

  onResize(){

    this.$utcTabContent.css({
      position: 'absolute',
      top: this.$navBar.outerHeight(),
      left: 0,
      right: 0,
      bottom: 0
    });

    this.ui3DRenderer.SetSize(this.$previewContainer.width(), this.$previewContainer.height());
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
    if(file instanceof EditorFile){

      file.readFile( (buffer) => {
        try{

          if(!file.buffer.length){

            this.gff = UTDObject.GenerateTemplate();
            console.log(this.gff.RootNode);
            try{
              this.PopulateFields();
              this.$tabName.text(file.getFilename());
            }catch(e){console.error(e)}
            this.Reload();

          }else{

            new GFFObject(buffer, (gff) => {
              this.gff = gff;
              console.log(this.gff.RootNode);
              try{
                this.PopulateFields();
                this.$tabName.text(file.getFilename());
              }catch(e){console.error(e)}
              this.Reload();
            });

          }
          
        }
        catch (e) {
          console.log(e);
          this.Remove();
        }
      });
    }
    /*console.log(file.path);
    this.gff = new GFFObject(file.path, () => {
      console.log(this.gff.RootNode);
      this.PopulateFields();
    });*/
  }

  Reload( onLoad = null ){
    window.cancelAnimationFrame(this.requestId);
    this.door = new ModuleDoor(this.gff);
    this.door.InitProperties();
    this.door.LoadModel( (model) => {
      let scene = this.ui3DRenderer.ResetScene();
      scene.add(model);
      setTimeout( () => {
        let center = model.box.getCenter();
        let size = model.box.getSize();
        //Center the object to 0
        model.position.set(-center.x, -center.y, -center.z);
        this.ui3DRenderer._camera.position.z = 0;
        this.ui3DRenderer._camera.position.y = size.x + size.y;
        this.ui3DRenderer._camera.lookAt(new THREE.Vector3)
        //Stand the object on the floor by adding half it's height back to it's position
        //model.position.z += model.box.getSize().z/2;
        this.onResize();

        this.Update();

      }, 10);
    });
  }

  Update(){
    this.requestId = requestAnimationFrame( () => { this.Update() } );
    if(!this.visible)
      return;

    this.ui3DRenderer.Render();

  }

  RenderCallback(renderer, delta){
    //console.log(delta);

    if(this.door){
      if(this.door.model instanceof THREE.AuroraModel && this.door.model.bonesInitialized && this.door.model.visible){
        this.door.model.update(delta);

        this.door.model.rotation.z += delta;
      
        let center = new THREE.Vector3;
        this.door.model.box.getCenter(center);
        let size = new THREE.Vector3;
        this.door.model.box.getSize(size);
        //Center the object to 0
        this.door.model.position.set(-center.x, -center.y, -center.z);
        this.ui3DRenderer._camera.position.z = 0;
        this.ui3DRenderer._camera.position.y = size.x + size.y + size.z;
        this.ui3DRenderer._camera.lookAt(new THREE.Vector3)

      }
      this.door.update(delta);
    }

  }

  GameImageToCanvas(canvas, name){
    TextureLoader.tpcLoader.loadFromArchive('swpc_tex_gui', name, (image) => {
      image.getPixelData( (pixelData) => {
        
        let workingData = pixelData;
    
        let width = image.header.width;
        let height = image.header.height;

        let ctx = canvas.getContext('2d');
    
        //If the image is a TPC we will need to times the height by the number of faces
        //to correct the height incase we have a cubemap
        if(image instanceof TPCObject)
          height = image.header.height * image.header.faces;
    
        let bitsPerPixel = image.header.bitsPerPixel;
    
        canvas.width = width;
        canvas.height = height;
        //$canvas.css({width: width, height: height});
    
        let imageData = ctx.getImageData(0, 0, width, height);
        let data = imageData.data;
    
        if(image instanceof TPCObject){
    
          if(bitsPerPixel == 24)
            workingData = ImageViewerTab.PixelDataToRGBA(workingData, width, height);
    
          if(bitsPerPixel == 8)
            workingData = ImageViewerTab.TGAGrayFix(workingData, width, height);
    
          //FlipY
          ImageViewerTab.FlipY(workingData, width, height);
    
        }
    
        //Set the preview image to opaque
        //this.PreviewAlphaFix(this.workingData);
    
        data.set(workingData);
    
        ctx.putImageData(imageData, 0, 0);

      });
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
    this.InitCExoLocStringField(this.$name, this.gff.GetFieldByLabel("LocName"));

    //Tag
    this.InitResRefField(this.$tag, this.gff.GetFieldByLabel("Tag"));

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
      this.Reload();
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
    try{
      this.$static.prop('checked', this.gff.GetFieldByLabel("Static").Value == 0 ? false : true );
      this.$static.change( (e) => {
        if(this.$static.is(':checked')){
          this.gff.GetFieldByLabel("Static").Value = 1;
        }else{
          this.gff.GetFieldByLabel("Static").Value = 0;
        }
      });
    }catch(e){}

    //Description
    this.InitCExoLocStringField(this.$description, this.gff.GetFieldByLabel("Description"));

    this.InitNumericField(this.$hardness, this.gff.GetFieldByLabel("Hardness"));
    this.InitNumericField(this.$hitPoints, this.gff.GetFieldByLabel("HP"));
    this.InitNumericField(this.$fortitudeSave, this.gff.GetFieldByLabel("Fort"));
    this.InitNumericField(this.$reflexSave, this.gff.GetFieldByLabel("Ref"));
    this.InitNumericField(this.$willSave, this.gff.GetFieldByLabel("Will"));

    //Lock
    this.InitCheckBoxField({
      $field: this.$lock,
      fieldName: 'Locked',
      fieldType: GFFDataTypes.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$lockable,
      fieldName: 'Lockable',
      fieldType: GFFDataTypes.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$autoRemoveKey,
      fieldName: 'AutoRemoveKey',
      fieldType: GFFDataTypes.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$keyRequired,
      fieldName: 'KeyRequired',
      fieldType: GFFDataTypes.BYTE
    });

    this.InitNumericField(this.$openLockDC, this.gff.GetFieldByLabel('OpenLockDC'));
    this.InitNumericField(this.$closeLockDC, this.gff.GetFieldByLabel('CloseLockDC'));
    this.InitResRefField(this.$keyTag, this.gff.GetFieldByLabel('KeyName'));

    //Advanced
    this.InitResRefField(this.$templateResRef, this.gff.GetFieldByLabel('TemplateResRef'));

    this.InitDropDownField({
      $field: this.$faction,         //jQuery Element
      fieldName: 'Faction',     //GFF Field Name
      fieldType: GFFDataTypes.DWORD,     //GFF Field Type
      objOrArray: Global.kotor2DA.repute.rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    this.InitResRefField(this.$conversation, this.gff.GetFieldByLabel('Conversation'));

    this.InitCheckBoxField({
      $field: this.$noInterrupt,
      fieldName: 'Interruptable',
      fieldType: GFFDataTypes.BYTE
    });

    this.InitNumericField(this.$animationState, this.gff.GetFieldByLabel('AnimationState'));

    //Script Inputs
    this.InitResRefField(this.$onClick, this.gff.GetFieldByLabel('OnClick'));
    this.InitResRefField(this.$onClosed, this.gff.GetFieldByLabel('OnClosed'));
    this.InitResRefField(this.$onDamaged, this.gff.GetFieldByLabel('OnDamaged'));
    this.InitResRefField(this.$onDeath, this.gff.GetFieldByLabel('OnDeath'));
    this.InitResRefField(this.$onDisarm, this.gff.GetFieldByLabel('OnDisarm'));
    this.InitResRefField(this.$onHeartbeat, this.gff.GetFieldByLabel('OnHeartbeat'));
    this.InitResRefField(this.$onLock, this.gff.GetFieldByLabel('OnLock'));
    this.InitResRefField(this.$onMeleeAttacked, this.gff.GetFieldByLabel('OnMeleeAttacked'));
    this.InitResRefField(this.$onOpen, this.gff.GetFieldByLabel('OnOpen'));
    this.InitResRefField(this.$onSpellCastAt, this.gff.GetFieldByLabel('OnSpellCastAt'));
    this.InitResRefField(this.$onTrapTriggered, this.gff.GetFieldByLabel('OnTrapTriggered'));
    this.InitResRefField(this.$onUnlock, this.gff.GetFieldByLabel('OnUnlock'));
    this.InitResRefField(this.$onUsed, this.gff.GetFieldByLabel('OnUsed'));
    this.InitResRefField(this.$onUserDefined, this.gff.GetFieldByLabel('OnUserDefined'));

  }

  Save(){
    if(this.file instanceof EditorFile){

      let save_path = this.file.getLocalPath();

      if(!save_path && this.file.location == EditorFile.LOCATION_TYPE.LOCAL){
        save_path = this.file.resref+'.'+this.file.ext;
      }

      if(!save_path){
        this.SaveAs();
        return;
      }
      this.gff.path = path.parse(save_path).dir;
      this.gff.Export(save_path, () => {
        this.$tabName.text(this.file.getFilename());
        this.$templateResRef.val(this.file.getFilename().split('.')[0]);
  
        if(typeof onComplete === 'function')
          onComplete(err);
  
        console.log('File Saved');//, Object.keys(IMAGE_TYPE)[type]);
      }, (err) => {
        return console.error(err);
      })

    }
  }

  SaveAs(){
    if(this.file instanceof EditorFile){

      let path_str = dialog.showSaveDialog({
        title: 'Save File As',
        defaultPath: this.file.getLocalPath() ? this.file.getLocalPath() : this.file.getFilename(),
        filters: [
          {name: this.file.ext.toUpperCase(), extensions: [this.file.ext]}
      ]});
  
      if(typeof path_str != 'undefined' && path_str != null){
        let path_obj = path.parse(path_str);
        this.file.path = path_str;
        this.file.resref = path_obj.name;
        this.file.ext = path_obj.ext.slice(1);
        this.file.reskey = ResourceTypes[this.file.ext];
        this.file.archive_path = null;
        this.file.location = EditorFile.LOCATION_TYPE.LOCAL;
        this.Save();
      }else{
        console.warning('File export aborted');
      }

    }
  }

  onDestroy() {
    window.cancelAnimationFrame(this.requestId);
    super.onDestroy();
  }

}

module.exports = UTDEditorTab;
