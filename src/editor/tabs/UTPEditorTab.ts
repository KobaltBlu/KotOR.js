import { GFFDataType } from "../../enums/resource/GFFDataType";
import { TextureLoader } from "../../loaders/TextureLoader";
import { ModulePlaceable } from "../../module";
import { GFFObject } from "../../resource/GFFObject";
import { ResourceTypes } from "../../resource/ResourceTypes";
import { TPCObject } from "../../resource/TPCObject";
import { OdysseyModel3D } from "../../three/odyssey";
import { EditorFile } from "../EditorFile";
import { EditorTab, ImageViewerTab } from "./";
import { FileLocationType } from "../enum/FileLocationType";
import { UI3DRenderer } from "../UI3DRenderer";
import { VerticalTabs } from "../VerticalTabs";

import template from "../templates/editor-utp.html";

import * as path from "path";
import * as THREE from "three";
import { TwoDAManager } from "../../managers/TwoDAManager";

export class UTPEditorTab extends EditorTab {
  template: string = template;
  $name: JQuery<HTMLElement>;
  $tag: JQuery<HTMLElement>;
  $description: JQuery<HTMLElement>;
  $appearance: JQuery<HTMLElement>;
  $plotItem: JQuery<HTMLElement>;
  $static: JQuery<HTMLElement>;
  $minHP: JQuery<HTMLElement>;
  $hardness: JQuery<HTMLElement>;
  $hitPoints: JQuery<HTMLElement>;
  $fortitudeSave: JQuery<HTMLElement>;
  $reflexSave: JQuery<HTMLElement>;
  $willSave: JQuery<HTMLElement>;
  $lock: JQuery<HTMLElement>;
  $lockable: JQuery<HTMLElement>;
  $autoRemoveKey: JQuery<HTMLElement>;
  $keyRequired: JQuery<HTMLElement>;
  $openLockDC: JQuery<HTMLElement>;
  $closeLockDC: JQuery<HTMLElement>;
  $keyTag: JQuery<HTMLElement>;
  $templateResRef: JQuery<HTMLElement>;
  $faction: JQuery<HTMLElement>;
  $conversation: JQuery<HTMLElement>;
  $noInterrupt: JQuery<HTMLElement>;
  $animationState: JQuery<HTMLElement>;
  $type: JQuery<HTMLElement>;
  $hasInventory: JQuery<HTMLElement>;
  $partyInteract: JQuery<HTMLElement>;
  $usable: JQuery<HTMLElement>;
  $onClosed: JQuery<HTMLElement>;
  $onDamaged: JQuery<HTMLElement>;
  $onDeath: JQuery<HTMLElement>;
  $onDiarm: JQuery<HTMLElement>;
  $onEndDialog: JQuery<HTMLElement>;
  $onHeartbeat: JQuery<HTMLElement>;
  $onInvDisturbed: JQuery<HTMLElement>;
  $onLock: JQuery<HTMLElement>;
  $onMeleeAttacked: JQuery<HTMLElement>;
  $onOpen: JQuery<HTMLElement>;
  $onSpellAttacked: JQuery<HTMLElement>;
  $onSpellCastAt: JQuery<HTMLElement>;
  $onTrapTriggered: JQuery<HTMLElement>;
  $onUnlock: JQuery<HTMLElement>;
  $onUsed: JQuery<HTMLElement>;
  $onUserDefined: JQuery<HTMLElement>;
  $comment: JQuery<HTMLElement>;
  $navBar: JQuery<HTMLElement>;
  $utcTabContent: JQuery<HTMLElement>;
  $verticalTabs: JQuery<HTMLElement>;
  verticalTabs: VerticalTabs;
  $previewContainer: JQuery<HTMLElement>;
  $preview: JQuery<HTMLElement>;
  ui3DRenderer: UI3DRenderer;
  placeable: ModulePlaceable;

  requestId: any;
  $firstName: any;

  constructor(file: EditorFile){
    super();

    this.file = null;

    if(this.file instanceof GFFObject){
      this.gff = file;
    }else{
      this.file = file;
    }

    this.singleInstance = false;
    this.$tabName.text("Placeable Editor");
    console.log(this.id);
    let id = this.id;
    
    this.initContentTemplate();

    this.$name = $(this.ElementId('#utp-name'), this.$tabContent);
    this.$tag = $(this.ElementId('#utp-tag'), this.$tabContent);
    this.$description = $(this.ElementId('#utp-description'), this.$tabContent);
    this.$appearance = $(this.ElementId('#utp-appearance'), this.$tabContent);
    this.$plotItem = $(this.ElementId('#utp-plot-item'), this.$tabContent);
    this.$static = $(this.ElementId('#utp-static'), this.$tabContent);
    this.$minHP = $(this.ElementId('#utp-min-1hp'), this.$tabContent);
    this.$hardness = $(this.ElementId('#utp-hardness'), this.$tabContent);
    this.$hitPoints = $(this.ElementId('#utp-hit-points'), this.$tabContent);
    this.$fortitudeSave = $(this.ElementId('#utp-fortitude-save'), this.$tabContent);
    this.$reflexSave = $(this.ElementId('#utp-reflex-save'), this.$tabContent);
    this.$willSave = $(this.ElementId('#utp-will-save'), this.$tabContent);

    //Lock
    this.$lock = $(this.ElementId('#utp-locked'), this.$tabContent);
    this.$lockable = $(this.ElementId('#utp-lockable'), this.$tabContent);
    this.$autoRemoveKey = $(this.ElementId('#utp-auto-remove-key'), this.$tabContent);
    this.$keyRequired = $(this.ElementId('#utp-key-required'), this.$tabContent);
    this.$openLockDC = $(this.ElementId('#utp-open-lock-dc'), this.$tabContent);
    this.$closeLockDC = $(this.ElementId('#utp-close-lock-dc'), this.$tabContent);
    this.$keyTag = $(this.ElementId('#utp-key-tag'), this.$tabContent);

    //Advanced
    this.$templateResRef = $(this.ElementId('#utp-template-res-ref'), this.$tabContent);
    this.$faction = $(this.ElementId('#utp-faction'), this.$tabContent);
    this.$conversation = $(this.ElementId('#utp-conversation'), this.$tabContent);
    this.$noInterrupt = $(this.ElementId('#utp-no-interrupt'), this.$tabContent);
    this.$animationState = $(this.ElementId('#utp-animation-state'), this.$tabContent);
    this.$type = $(this.ElementId('#utp-type'), this.$tabContent);
    this.$hasInventory = $(this.ElementId('#utp-has-inventory'), this.$tabContent);
    this.$partyInteract = $(this.ElementId('#utp-party-interact'), this.$tabContent);
    this.$usable = $(this.ElementId('#utp-usable'), this.$tabContent);

    //Scripts
    this.$onClosed = $(this.ElementId('#utp-on-closed'), this.$tabContent);
    this.$onDamaged = $(this.ElementId('#utp-on-damaged'), this.$tabContent);
    this.$onDeath = $(this.ElementId('#utp-on-death'), this.$tabContent);
    this.$onDiarm = $(this.ElementId('#utp-on-disarm'), this.$tabContent);
    this.$onEndDialog = $(this.ElementId('#utp-on-end-dialog'), this.$tabContent);
    this.$onHeartbeat = $(this.ElementId('#utp-on-heartbeat'), this.$tabContent);
    this.$onInvDisturbed = $(this.ElementId('#utp-on-inv-disturbed'), this.$tabContent);
    this.$onLock = $(this.ElementId('#utp-on-lock'), this.$tabContent);
    this.$onMeleeAttacked = $(this.ElementId('#utp-on-melee-attacked'), this.$tabContent);
    this.$onOpen = $(this.ElementId('#utp-on-open'), this.$tabContent);
    this.$onSpellAttacked = $(this.ElementId('#utp-on-spell-attacked'), this.$tabContent);
    this.$onOpen = $(this.ElementId('#utp-on-open'), this.$tabContent);
    this.$onSpellCastAt = $(this.ElementId('#utp-on-spell-cast-at'), this.$tabContent);
    this.$onTrapTriggered = $(this.ElementId('#utp-on-trap-triggered'), this.$tabContent);
    this.$onUnlock = $(this.ElementId('#utp-on-unlock'), this.$tabContent);
    this.$onUsed = $(this.ElementId('#utp-on-used'), this.$tabContent);
    this.$onUserDefined = $(this.ElementId('#utp-on-user-defined'), this.$tabContent);

    //Comment
    this.$comment = $(this.ElementId('#utp-comment'), this.$tabContent);

    //Description
    this.$description = $(this.ElementId('#utp-description'), this.$tabContent);

    this.$navBar = $('.navbar-sidebar-wizard-horizontal', this.$tabContent);
    this.$utcTabContent = $(this.ElementId('#utp-tab-content'), this.$tabContent);

    $('.texture-canvas', this.$tabContent).each( (i, ele) => {
      let $ele = $(ele);
      let $canvas = $('<canvas/>');
      $ele.append($canvas);
      this.GameImageToCanvas($canvas[0], $ele.attr('texture'));
    });

    this.$verticalTabs = $('.vertical-tabs', this.$tabContent);

    this.verticalTabs = new VerticalTabs(this.$verticalTabs);

    this.$tabContent.css({overflow: 'hidden'});

    this.$previewContainer = $(this.ElementId('#utp-preview'), this.$tabContent);

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

    this.Update();

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

  ElementId(str: string){
    return str+'-'+this.id;
  }

  OpenFile(file: EditorFile){
    if(file instanceof EditorFile){
      file.readFile( (buffer: Buffer) => {
        try{
          if(!file.buffer.length){

            this.gff = ModulePlaceable.GenerateTemplate();
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

  Reload( onLoad?: Function ){
    global.cancelAnimationFrame(this.requestId);
    this.placeable = new ModulePlaceable(this.gff);
    this.placeable.context = this.ui3DRenderer;
    this.placeable.InitProperties();
    this.placeable.LoadModel().then( (model: OdysseyModel3D) => {
      let scene = this.ui3DRenderer.ResetScene();
      scene.add(model);
      setTimeout( () => {
        let center = model.box.getCenter(new THREE.Vector3());
        let size = model.box.getSize(new THREE.Vector3());
        //Center the object to 0
        model.position.set(-center.x, -center.y, -center.z);
        this.ui3DRenderer.camera.position.z = 1.5;
        this.ui3DRenderer.camera.position.y = size.x + size.y;
        this.ui3DRenderer.camera.lookAt(new THREE.Vector3)
        //Stand the object on the floor by adding half it's height back to it's position
        //model.position.z += model.box.getSize(new THREE.Vector3()).z/2;
        this.onResize();

        this.Update()
      }, 10);
    });
  }

  Update(){
    this.requestId = requestAnimationFrame( () => { this.Update() } );
    if(!this.visible)
      return;

    this.ui3DRenderer.Render();

  }

  RenderCallback(renderer: any, delta: number = 0){
    //console.log(delta);

    if(this.placeable){
      if(this.placeable.model instanceof OdysseyModel3D && this.placeable.model.bonesInitialized && this.placeable.model.visible){
        this.placeable.model.update(delta);

        this.placeable.rotation.z += delta;
      
        let center = new THREE.Vector3;
        this.placeable.model.box.getCenter(center);
        let size = new THREE.Vector3;
        this.placeable.model.box.getSize(size);
        //Center the object to 0
        this.placeable.model.position.set(-center.x, -center.y, -center.z);
        this.ui3DRenderer.camera.position.z = 1.5;
        this.ui3DRenderer.camera.position.y = size.x + size.y + size.z;
        this.ui3DRenderer.camera.lookAt(new THREE.Vector3)

      }
      this.placeable.update(delta);
    }

  }

  GameImageToCanvas(canvas: any, name: any){
    TextureLoader.tpcLoader.loadFromArchive('swpc_tex_gui', name, (image: any) => {
      image.getPixelData( (pixelData: any) => {
        
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
            workingData = ImageViewerTab.TGAGrayFix(workingData);
    
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
    
    //First Name
    this.InitCExoLocStringField(this.$name, this.gff.GetFieldByLabel("LocName"));
    //Tag
    this.InitResRefField(this.$tag, this.gff.GetFieldByLabel("Tag"));
    //Appearance
    for (let key in TwoDAManager.datatables.get('placeables').rows) {
      let appearance = TwoDAManager.datatables.get('placeables').rows[key];
      let label = appearance['label'];
      this.$appearance.append('<option value="'+key+'">'+label+'</option>');
    }

    let options = $('option', this.$appearance);
    let arr = options.map(function(_, o: any) { return { t: $(o).text(), v: o.value }; }).get();
    arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
    options.each(function(i, o: any) {
      o.value = arr[i].v;
      $(o).text(arr[i].t);
    });

    this.$appearance.val(this.gff.GetFieldByLabel("Appearance").Value).prop('disabled', false);
    this.$appearance.change( () => {
      this.gff.GetFieldByLabel("Appearance").Value = this.$appearance.val();
      this.Reload();
    });

    //PlotItem
    this.$plotItem.prop('checked', this.gff.GetFieldByLabel("Plot").Value == 0 ? false : true );
    this.$plotItem.change( (e: any) => {
      if(this.$plotItem.is(':checked')){
        this.gff.GetFieldByLabel("Plot").Value = 1;
      }else{
        this.gff.GetFieldByLabel("Plot").Value = 0;
      }
    });

    //Static
    this.$static.prop('checked', this.gff.GetFieldByLabel("Static").Value == 0 ? false : true );
    this.$static.change( (e: any) => {
      if(this.$static.is(':checked')){
        this.gff.GetFieldByLabel("Static").Value = 1;
      }else{
        this.gff.GetFieldByLabel("Static").Value = 0;
      }
    });

    //Min1HP
    this.$minHP.prop('checked', this.gff.GetFieldByLabel("Min1HP").Value == 0 ? false : true );
    this.$minHP.change( (e: any) => {
      if(this.$minHP.is(':checked')){
        this.gff.GetFieldByLabel("Min1HP").Value = 1;
      }else{
        this.gff.GetFieldByLabel("Min1HP").Value = 0;
      }
    });

    this.InitNumericField(this.$hardness, this.gff.GetFieldByLabel("Hardness"));
    this.InitNumericField(this.$hitPoints, this.gff.GetFieldByLabel("HP"));
    this.InitNumericField(this.$fortitudeSave, this.gff.GetFieldByLabel("Fort"));
    this.InitNumericField(this.$reflexSave, this.gff.GetFieldByLabel("Ref"));
    this.InitNumericField(this.$willSave, this.gff.GetFieldByLabel("Will"));

    //Lock

    this.InitCheckBoxField({
      $field: this.$lock,
      fieldName: 'Locked',
      fieldType: GFFDataType.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$lockable,
      fieldName: 'Lockable',
      fieldType: GFFDataType.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$autoRemoveKey,
      fieldName: 'AutoRemoveKey',
      fieldType: GFFDataType.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$keyRequired,
      fieldName: 'KeyRequired',
      fieldType: GFFDataType.BYTE
    });

    this.InitNumericField(this.$openLockDC, this.gff.GetFieldByLabel('OpenLockDC'));
    this.InitNumericField(this.$closeLockDC, this.gff.GetFieldByLabel('CloseLockDC'));
    this.InitResRefField(this.$keyTag, this.gff.GetFieldByLabel('KeyName'));

    //Advanced
    this.InitResRefField(this.$templateResRef, this.gff.GetFieldByLabel('TemplateResRef'));

    this.InitDropDownField({
      $field: this.$faction,         //jQuery Element
      fieldName: 'Faction',     //GFF Field Name
      fieldType: GFFDataType.DWORD,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('repute').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    this.InitResRefField(this.$conversation, this.gff.GetFieldByLabel('Conversation'));

    this.InitCheckBoxField({
      $field: this.$noInterrupt,
      fieldName: 'Interruptable',
      fieldType: GFFDataType.BYTE
    });

    this.InitNumericField(this.$animationState, this.gff.GetFieldByLabel('AnimationState'));

    this.InitNumericField(this.$type, this.gff.GetFieldByLabel('Type'));

    this.InitCheckBoxField({
      $field: this.$hasInventory,
      fieldName: 'HasInventory',
      fieldType: GFFDataType.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$partyInteract,
      fieldName: 'PartyInteract',
      fieldType: GFFDataType.BYTE
    });

    this.InitCheckBoxField({
      $field: this.$usable,
      fieldName: 'Useable',
      fieldType: GFFDataType.BYTE
    });

    //Scripts
    this.InitResRefField(this.$onClosed, this.gff.GetFieldByLabel('OnClosed'));
    this.InitResRefField(this.$onDamaged, this.gff.GetFieldByLabel('OnDamaged'));
    this.InitResRefField(this.$onDeath, this.gff.GetFieldByLabel('OnDeath'));
    this.InitResRefField(this.$onDiarm, this.gff.GetFieldByLabel('OnDisarm'));
    this.InitResRefField(this.$onEndDialog, this.gff.GetFieldByLabel('OnEndDialogue'));
    this.InitResRefField(this.$onHeartbeat, this.gff.GetFieldByLabel('OnHeartbeat'));
    this.InitResRefField(this.$onInvDisturbed, this.gff.GetFieldByLabel('OnInvDisturbed'));
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

      if(!save_path && this.file.location == FileLocationType.LOCAL){
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
  
        console.log('File Saved');//, Object.keys(IMAGE_TYPE)[type]);
      }, (err: any) => {
        return console.error(err);
      })

    }
  }

  async SaveAs(){
    if(this.file instanceof EditorFile){

      // let payload = await dialog.showSaveDialog({
      //   title: 'Save File As',
      //   defaultPath: this.file.getLocalPath() ? this.file.getLocalPath() : this.file.getFilename(),
      //   properties: ['createDirectory'],
      //   filters: [
      //     {name: this.file.ext.toUpperCase(), extensions: [this.file.ext]}
      //   ]
      // });
  
      // if(!payload.canceled && typeof payload.filePath != 'undefined'){
      //   let path_obj = path.parse(payload.filePath);
      //   this.file.path = payload.filePath;
      //   this.file.resref = path_obj.name;
      //   this.file.ext = path_obj.ext.slice(1);
      //   this.file.reskey = ResourceTypes[this.file.ext];
      //   this.file.archive_path = null;
      //   this.file.location = FileLocationType.LOCAL;
      //   this.Save();
      // }else{
      //   console.warn('File export aborted');
      // }

    }
  }

  onDestroy() {
    global.cancelAnimationFrame(this.requestId);
    super.onDestroy();
  }

}
