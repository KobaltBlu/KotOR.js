import * as path from "path";
import { ModuleCreatureArmorSlot } from "../../enums/module/ModuleCreatureArmorSlot";
import { GFFDataType } from "../../enums/resource/GFFDataType";
import { TLKManager } from "../../managers/TLKManager";
import { ModuleCreature, ModuleItem } from "../../module";
import { GFFField } from "../../resource/GFFField";
import { GFFObject } from "../../resource/GFFObject";
import { GFFStruct } from "../../resource/GFFStruct";
import { LIPObject } from "../../resource/LIPObject";
import { ResourceTypes } from "../../resource/ResourceTypes";
import { TPCObject } from "../../resource/TPCObject";
import { OdysseyModel3D } from "../../three/odyssey";
import { AsyncLoop } from "../../utility/AsyncLoop";
import { EditorFile } from "../EditorFile";
import { EditorTab, ImageViewerTab } from "./";
import { FileLocationType } from "../enum/FileLocationType";
import { UI3DRenderer } from "../UI3DRenderer";
import { VerticalTabs } from "../VerticalTabs";
import { Wizard } from "../wizards";
import * as THREE from "three";
import { TextureLoader } from "../../loaders/TextureLoader";
import { TwoDAManager } from "../../managers/TwoDAManager";
import { Forge } from "../Forge";
import { BIFManager } from "../../managers/BIFManager";
import { TemplateLoader } from "../../loaders/TemplateLoader";

import template from "../templates/editor-utc.html";

export class UTCEditorTab extends EditorTab {
  template: string = template;
  $firstName: JQuery<HTMLElement>;
  $lastName: JQuery<HTMLElement>;
  $tag: JQuery<HTMLElement>;
  $appearance: JQuery<HTMLElement>;
  $gender: JQuery<HTMLElement>;
  $description: JQuery<HTMLElement>;
  $race: JQuery<HTMLElement>;
  $phenotype: JQuery<HTMLElement>;
  $bodybag: JQuery<HTMLElement>;
  $portrait: JQuery<HTMLElement>;
  $dialog: JQuery<HTMLElement>;
  $dialogInterrupt: JQuery<HTMLElement>;
  $str: JQuery<HTMLElement>;
  $dex: JQuery<HTMLElement>;
  $con: JQuery<HTMLElement>;
  $int: JQuery<HTMLElement>;
  $wis: JQuery<HTMLElement>;
  $cha: JQuery<HTMLElement>;
  $fortbonus: JQuery<HTMLElement>;
  $refbonus: JQuery<HTMLElement>;
  $willbonus: JQuery<HTMLElement>;
  $naturalAC: JQuery<HTMLElement>;
  $walkRate: JQuery<HTMLElement>;
  $hitPoints: JQuery<HTMLElement>;
  $currentHitPoints: JQuery<HTMLElement>;
  $maxHitPoints: JQuery<HTMLElement>;
  $templateResRef: JQuery<HTMLElement>;
  $disarmable: JQuery<HTMLElement>;
  $plot: JQuery<HTMLElement>;
  $noPermDeath: JQuery<HTMLElement>;
  $isPC: JQuery<HTMLElement>;
  $min1HP: JQuery<HTMLElement>;
  $subrace: JQuery<HTMLElement>;
  $challengeRating: JQuery<HTMLElement>;
  $soundSetFile: JQuery<HTMLElement>;
  $factionID: JQuery<HTMLElement>;
  $perceptionRange: JQuery<HTMLElement>;
  $computerUse: JQuery<HTMLElement>;
  $demolitions: JQuery<HTMLElement>;
  $stealth: JQuery<HTMLElement>;
  $awareness: JQuery<HTMLElement>;
  $persuade: JQuery<HTMLElement>;
  $repair: JQuery<HTMLElement>;
  $security: JQuery<HTMLElement>;
  $treatInjury: JQuery<HTMLElement>;
  $navBar: JQuery<HTMLElement>;
  $utcTabContent: JQuery<HTMLElement>;
  $iSlots: JQuery<HTMLElement>;
  $iSlotImplant: JQuery<HTMLElement>;
  $iSlotHead: JQuery<HTMLElement>;
  $iSlotWrists: JQuery<HTMLElement>;
  $iSlotLArm: JQuery<HTMLElement>;
  $iSlotArmor: JQuery<HTMLElement>;
  $iSlotRArm: JQuery<HTMLElement>;
  $iSlotLHand: JQuery<HTMLElement>;
  $iSlotBelt: JQuery<HTMLElement>;
  $iSlotRHand: JQuery<HTMLElement>;
  $verticalTabs: JQuery<HTMLElement>;
  verticalTabs: VerticalTabs;
  $previewContainer: JQuery<HTMLElement>;
  $preview: JQuery<HTMLElement>;
  ui3DRenderer: UI3DRenderer;
  creature: ModuleCreature;
  requestId: any;
  constructor(file: EditorFile|GFFObject){
    super();

    if(file instanceof GFFObject){
      this.gff = file;
    }else{
      file = file;
      this.file = file;
    }

    this.singleInstance = false;
    this.$tabName.text("Creature Editor");
    console.log(this.id);
    let id = this.id;
      
    this.initContentTemplate();

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

    //Stats
    this.$str = $(this.ElementId('#utc-str'), this.$tabContent);
    this.$dex = $(this.ElementId('#utc-dex'), this.$tabContent);
    this.$con = $(this.ElementId('#utc-con'), this.$tabContent);
    this.$int = $(this.ElementId('#utc-int'), this.$tabContent);
    this.$wis = $(this.ElementId('#utc-wis'), this.$tabContent);
    this.$cha = $(this.ElementId('#utc-cha'), this.$tabContent);
    this.$fortbonus = $(this.ElementId('#utc-fortbonus'), this.$tabContent);
    this.$refbonus = $(this.ElementId('#utc-refbonus'), this.$tabContent);
    this.$willbonus = $(this.ElementId('#utc-willbonus'), this.$tabContent);

    this.$naturalAC = $(this.ElementId('#utc-natural-ac'), this.$tabContent);
    this.$walkRate = $(this.ElementId('#utc-walk-rate'), this.$tabContent);
    this.$hitPoints = $(this.ElementId('#utc-hit-points'), this.$tabContent);
    this.$currentHitPoints = $(this.ElementId('#utc-current-hit-points'), this.$tabContent);
    this.$maxHitPoints = $(this.ElementId('#utc-max-hit-points'), this.$tabContent);

    //Advanced
    this.$templateResRef = $(this.ElementId('#utc-template-res-ref'), this.$tabContent);
    this.$disarmable = $(this.ElementId('#utc-disarmable'), this.$tabContent);
    this.$plot = $(this.ElementId('#utc-plot'), this.$tabContent);
    this.$noPermDeath = $(this.ElementId('#utc-no-perm-death'), this.$tabContent);
    this.$isPC = $(this.ElementId('#utc-is-pc'), this.$tabContent);
    this.$min1HP = $(this.ElementId('#utc-min-1-hp'), this.$tabContent);
    this.$subrace = $(this.ElementId('#utc-subrace'), this.$tabContent);
    this.$challengeRating = $(this.ElementId('#utc-challenge-rating'), this.$tabContent);
    this.$soundSetFile = $(this.ElementId('#utc-sound-set-file'), this.$tabContent);
    this.$factionID = $(this.ElementId('#utc-faction-id'), this.$tabContent);
    this.$perceptionRange = $(this.ElementId('#utc-perception-range'), this.$tabContent);

    //Skills
    this.$computerUse = $(this.ElementId('#utc-computer-use'), this.$tabContent);
    this.$demolitions = $(this.ElementId('#utc-demolitions'), this.$tabContent);
    this.$stealth = $(this.ElementId('#utc-stealth'), this.$tabContent);
    this.$awareness = $(this.ElementId('#utc-awareness'), this.$tabContent);
    this.$persuade = $(this.ElementId('#utc-persuade'), this.$tabContent);
    this.$repair = $(this.ElementId('#utc-repair'), this.$tabContent);
    this.$security = $(this.ElementId('#utc-security'), this.$tabContent);
    this.$treatInjury = $(this.ElementId('#utc-treat-injury'), this.$tabContent);

    this.$navBar = $('.navbar-sidebar-wizard-horizontal', this.$tabContent);
    this.$utcTabContent = $(this.ElementId('#utc-tab-content'), this.$tabContent);


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

    $('.texture-canvas', this.$tabContent).each( (i, ele) => {
      let $ele = $(ele);
      let $canvas = $('<canvas/>');
      $ele.append($canvas);
      this.GameImageToCanvas($canvas[0], $ele.attr('texture'), 60, 60);
    });

    this.$verticalTabs = $('.vertical-tabs', this.$tabContent);

    this.verticalTabs = new VerticalTabs(this.$verticalTabs);

    this.$tabContent.css({overflow: 'hidden'});

    this.$previewContainer = $(this.ElementId('#utc-preview'), this.$tabContent);

    this.$preview = $('<img style="visibility: hidden; width: 100%; height: 100%;"/>');
    

    /*this.previewWidth = 150;
    this.previewHeight = this.previewWidth * 2;

    this.$preview.width(this.previewWidth).height(this.previewHeight);*/

    this.ui3DRenderer = new UI3DRenderer({
      width: this.$preview.width(),
      height: this.$preview.height()
    });

    this.ui3DRenderer.onBeforeRender = this.RenderCallback.bind(this);

    this.$previewContainer.append( this.ui3DRenderer.canvas );

    console.log(this.$firstName);

    this.onResize();

    if(this.gff instanceof GFFObject){
      try{
        this.PopulateFields();
      }catch(e){ console.error(e); }
    }

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

  OpenFile(file: EditorFile){

    if(file instanceof EditorFile){
      file.readFile( (buffer: Buffer) => {
        if(!file.buffer.length){

          this.gff = ModuleCreature.GenerateTemplate();
          console.log(this.gff.RootNode);
          try{
            this.PopulateFields();
            this.$tabName.text(file.getFilename());
          }catch(e){console.error(e)}
          this.Reload();

        }else{
          try{
            new GFFObject(buffer, (gff) => {
              this.gff = gff;
              console.log(this.gff.RootNode);
              try{
                this.PopulateFields();
                this.$tabName.text(file.getFilename());
              }catch(e){ console.error(e); }
              this.Reload();
            });
          }
          catch (e) {
            console.log(e);
            this.Remove();
          }
        }
      });
    }

  }

  Reload( onLoad?: Function ){
    global.cancelAnimationFrame(this.requestId);
    this.creature = new ModuleCreature(this.gff);
    this.creature.context = this.ui3DRenderer;
    this.creature.InitProperties( () => {
      this.creature.LoadEquipment( () => {
        this.creature.LoadModel( (model: OdysseyModel3D) => {
          let scene = this.ui3DRenderer.ResetScene();
          scene.add(model);
          setTimeout( () => {
            let center = model.box.getCenter(new THREE.Vector3());
            let size = model.box.getSize(new THREE.Vector3());
            //Center the object to 0
            model.position.set(-center.x, -center.y, -center.z);
            this.ui3DRenderer.camera.position.z = 0;
            this.ui3DRenderer.camera.position.y = size.x + size.y;
            this.ui3DRenderer.camera.lookAt(new THREE.Vector3)
            //Stand the object on the floor by adding half it's height back to it's position
            //model.position.z += model.box.getSize(new THREE.Vector3()).z/2;
            this.onResize();
            this.Update();
          }, 10);
        });
      });
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

    if(this.creature){
      if(this.creature.model instanceof OdysseyModel3D && this.creature.model.bonesInitialized && this.creature.model.visible){
        this.creature.model.update(delta);
        if(this.creature.lipObject instanceof LIPObject){
          this.creature.lipObject.update(delta, this.creature.head ? this.creature.head : this.creature.model);
        }

        this.creature.model.rotation.z += delta;
      
        let center = new THREE.Vector3;
        this.creature.model.box.getCenter(center);
        let size = new THREE.Vector3;
        this.creature.model.box.getSize(size);
        //Center the object to 0
        this.creature.model.position.set(-center.x, -center.y, -center.z);
        this.ui3DRenderer.camera.position.z = 0;
        this.ui3DRenderer.camera.position.y = size.x + size.y + size.z;
        this.ui3DRenderer.camera.lookAt(new THREE.Vector3)

      }
      this.creature.update(delta);
    }

  }

  GameImageToCanvas(canvas: any, name: any, cwidth: any = null, cheight: any = null){
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
        
        if(cwidth && cheight){

          $(canvas).css({
            width: cwidth,
            height: cheight
          });
          
        }

      });
    });
  }

  PopulateFields() {
    
    //First Name
    this.InitCExoLocStringField(this.$firstName, this.gff.GetFieldByLabel("FirstName"));
    //Last Name
    this.InitCExoLocStringField(this.$lastName, this.gff.GetFieldByLabel("LastName"));
    //Tag
    this.$tag.val(this.gff.GetFieldByLabel("Tag").Value);
    
    //Appearance
    this.InitDropDownField({
      $field: this.$appearance,         //jQuery Element
      fieldName: 'Appearance_Type',     //GFF Field Name
      fieldType: GFFDataType.WORD,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('appearance').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
      onChange: () => {                 //onChange callback function for UI updates
        console.log('Reload')
        this.Reload();
      }                    
    });

    //Gender
    this.InitDropDownField({
      $field: this.$gender,         //jQuery Element
      fieldName: 'Gender',     //GFF Field Name
      fieldType: GFFDataType.BYTE,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('gender').rows,   //Elements of data
      propertyName: 'name',            //Property name to target inside objOrArray
      onLabel: (label: any) => {
        return TLKManager.TLKStrings[label].Value;
      }
    });

    //Description
    this.InitCExoLocStringField(this.$description, this.gff.GetFieldByLabel("Description"));

    //Phenotype
    this.InitDropDownField({
      $field: this.$phenotype,         //jQuery Element
      fieldName: 'Phenotype',     //GFF Field Name
      fieldType: GFFDataType.INT,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('phenotype').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    //Race
    this.InitDropDownField({
      $field: this.$race,         //jQuery Element
      fieldName: 'Race',     //GFF Field Name
      fieldType: GFFDataType.BYTE,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('racialtypes').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    //BodyBag
    this.InitDropDownField({
      $field: this.$bodybag,         //jQuery Element
      fieldName: 'BodyBag',     //GFF Field Name
      fieldType: GFFDataType.BYTE,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('bodybag').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    //Portrait
    this.InitDropDownField({
      $field: this.$portrait,         //jQuery Element
      fieldName: 'PortraitId',     //GFF Field Name
      fieldType: GFFDataType.WORD,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('portraits').rows,   //Elements of data
      propertyName: 'baseresref',            //Property name to target inside objOrArray
    });

    //Dialog
    this.$dialog.val(this.gff.GetFieldByLabel("Conversation").Value);

    //Dialog Interruptable
    this.$dialogInterrupt.val();


    //Stats
    this.InitNumericField(this.$str, this.gff.GetFieldByLabel("Str"));
    this.InitNumericField(this.$dex, this.gff.GetFieldByLabel("Dex"));
    this.InitNumericField(this.$con, this.gff.GetFieldByLabel("Con"));
    this.InitNumericField(this.$int, this.gff.GetFieldByLabel("Int"));
    this.InitNumericField(this.$wis, this.gff.GetFieldByLabel("Wis"));
    this.InitNumericField(this.$cha, this.gff.GetFieldByLabel("Cha"));

    this.InitNumericField(this.$fortbonus, this.gff.GetFieldByLabel("fortbonus"));
    this.InitNumericField(this.$refbonus, this.gff.GetFieldByLabel("refbonus"));
    this.InitNumericField(this.$willbonus, this.gff.GetFieldByLabel("willbonus"));

    this.InitNumericField(this.$naturalAC, this.gff.GetFieldByLabel("NaturalAC"));
    this.InitNumericField(this.$walkRate, this.gff.GetFieldByLabel("WalkRate"));

    //WalkRate
    this.InitDropDownField({
      $field: this.$walkRate,         //jQuery Element
      fieldName: 'WalkRate',     //GFF Field Name
      fieldType: GFFDataType.INT,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('creaturespeed').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    this.InitNumericField(this.$hitPoints, this.gff.GetFieldByLabel("HitPoints"));
    this.InitNumericField(this.$currentHitPoints, this.gff.GetFieldByLabel("CurrentHitPoints"));
    this.InitNumericField(this.$maxHitPoints, this.gff.GetFieldByLabel("MaxHitPoints"));



    //Advanced

    this.InitResRefField(this.$templateResRef, this.gff.GetFieldByLabel("TemplateResRef"));
    this.$templateResRef.prop('disabled', true);
    
    this.InitCheckBoxField({
      $field: this.$disarmable,
      fieldName: 'Disarmable',
      fieldType: GFFDataType.BYTE
    });
    
    this.InitCheckBoxField({
      $field: this.$plot,
      fieldName: 'Plot',
      fieldType: GFFDataType.BYTE
    });
    
    this.InitCheckBoxField({
      $field: this.$noPermDeath,
      fieldName: 'NoPermDeath',
      fieldType: GFFDataType.BYTE
    });
    
    this.InitCheckBoxField({
      $field: this.$isPC,
      fieldName: 'IsPC',
      fieldType: GFFDataType.BYTE
    });
    
    this.InitCheckBoxField({
      $field: this.$min1HP,
      fieldName: 'Min1HP',
      fieldType: GFFDataType.BYTE
    });

    this.InitDropDownField({
      $field: this.$subrace,         //jQuery Element
      fieldName: 'SubraceIndex',     //GFF Field Name
      fieldType: GFFDataType.BYTE,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('subrace').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    this.InitNumericField(this.$challengeRating, this.gff.GetFieldByLabel("ChallengeRating"));

    this.InitDropDownField({
      $field: this.$soundSetFile,         //jQuery Element
      fieldName: 'SoundSetFile',     //GFF Field Name
      fieldType: GFFDataType.WORD,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('soundset').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    this.InitDropDownField({
      $field: this.$factionID,         //jQuery Element
      fieldName: 'FactionID',     //GFF Field Name
      fieldType: GFFDataType.WORD,     //GFF Field Type
      objOrArray: TwoDAManager.datatables.get('repute').rows,   //Elements of data
      propertyName: 'label',            //Property name to target inside objOrArray
    });

    this.InitDropDownField({
      $field: this.$perceptionRange,         //jQuery Element
      fieldName: 'PerceptionRange',     //GFF Field Name
      fieldType: GFFDataType.BYTE,     //GFF Field Type
      objOrArray: [ //Elements of data
        { label: "Short" },
        { label: "Medium" },
        { label: "Long" },
        { label: "Default" },
        { label: "Player" },
        { label: "Monster" }
      ],
      propertyName: 'label',            //Property name to target inside objOrArray
      selectionOffset: 9
    });

    this.InitNumericField(this.$computerUse, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[0].GetFieldByLabel('Rank'));
    this.InitNumericField(this.$demolitions, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[1].GetFieldByLabel('Rank'));
    this.InitNumericField(this.$stealth, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[2].GetFieldByLabel('Rank'));
    this.InitNumericField(this.$awareness, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[3].GetFieldByLabel('Rank'));
    this.InitNumericField(this.$persuade, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[4].GetFieldByLabel('Rank'));
    this.InitNumericField(this.$repair, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[5].GetFieldByLabel('Rank'));
    this.InitNumericField(this.$security, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[6].GetFieldByLabel('Rank'));
    this.InitNumericField(this.$treatInjury, this.gff.GetFieldByLabel('SkillList').GetChildStructs()[7].GetFieldByLabel('Rank'));


    //Inventory
    let equipment = this.gff.GetFieldByLabel("Equip_ItemList");
    if(this.gff.GetFieldByLabel("Race").Value == 5){
      this.$iSlots.removeClass('droid').addClass('droid');
    }else{

      for(let i = 0; i < equipment.ChildStructs.length; i++){
        let strt = equipment.ChildStructs[i];
        let equippedRes = strt.GetFieldByLabel('EquippedRes');
        let $slot = null;

        switch(strt.Type){
          case ModuleCreatureArmorSlot.HEAD:
            $slot = this.$iSlotHead;
          break;
          case ModuleCreatureArmorSlot.ARMS:
            $slot = this.$iSlotWrists;
          break;
          case ModuleCreatureArmorSlot.ARMOR:
            $slot = this.$iSlotArmor;
          break;
          case ModuleCreatureArmorSlot.LEFTHAND:
            $slot = this.$iSlotLHand;
          break;
          case ModuleCreatureArmorSlot.RIGHTHAND:
            $slot = this.$iSlotRHand;
          break;
          case ModuleCreatureArmorSlot.LEFTARMBAND:
            $slot = this.$iSlotLArm;
          break;
          case ModuleCreatureArmorSlot.RIGHTARMBAND:
            $slot = this.$iSlotRArm;
          break;
          case ModuleCreatureArmorSlot.IMPLANT:
            $slot = this.$iSlotImplant;
          break;
          case ModuleCreatureArmorSlot.BELT:
            $slot = this.$iSlotBelt;
          break;
        }

        $slot.data('equippedRes', equippedRes.Value);

        if($slot != null){
          this.updateSlotIcon($slot);
        }

      }

    }

    $('.iSlots > .iSlot', this.$tabContent).off('click').on('click', (e: any) => {
      e.preventDefault();

      Forge.loader.Show('Loading Items...');
      let items: any[] = [];
      let $slot = $(e.currentTarget);
      let equippedRes = $slot.data('equippedRes') || '';

      let ui3DRenderer = new UI3DRenderer({
        width: 64,
        height: 64
      });
      let requestId: any;

      //this.ui3DRenderer.onBeforeRender = this.RenderCallback.bind(this);

      let pallete_index = 0;
      let pallete: any = {
        name: 'Items',
        children: [],
        index: pallete_index++
      };

      let pallete_map: any = {};

      //Load the items pallete
      TemplateLoader.Load({
        ResRef: 'itempal',
        ResType: ResourceTypes['itp'],
        onLoad: (pallete_gff: GFFObject) => {

          //Build the item Pallete
          let main = pallete_gff.RootNode.GetFieldByLabel('MAIN').GetChildStructs();
          let processNode = (pl_node: any, parent: any) => {

            let node: any = {
              name: pl_node.GetFieldByLabel('DELETE_ME').GetValue(),
              type: pl_node.GetFieldByLabel('Type').GetValue(),
              index: pallete_index++
            };

            parent.children.push(node);

            if(pl_node.HasField('LIST')){
              let pl_nodes = pl_node.GetFieldByLabel('LIST').GetChildStructs();
              node.children = [];
              for(let i = 0, il = pl_nodes.length; i < il; i++){
                processNode(pl_nodes[i], node);
              }
            }else if(pl_node.HasField('ID')){
              node.id = pl_node.GetFieldByLabel('ID').GetValue();
              node.items = [];
              pallete_map[node.id] = node;
            }

          };

          for(let i = 0, il = main.length; i < il; i++){
            processNode(main[i], pallete);
          }

          //Display the items
          let loop = new AsyncLoop({
            array: BIFManager.GetBIFByName('templates').GetResourcesByType(ResourceTypes['uti']),
            onLoop: (uti_res: any, asyncLoop: AsyncLoop) => {
              BIFManager.GetBIFByName('templates').GetResourceData(uti_res, (data: Buffer) => {
                let item = new ModuleItem(new GFFObject(data));
                items.push(item);
                pallete_map[item.getPalleteID()].items.push(item);
                asyncLoop.next();
              });
            }
          });
          loop.iterate(() => {
            Forge.loader.Dismiss();
            
            let pallete_mapper = (pl: any) => {

              let pallete_html = '';

              if(pl.hasOwnProperty('children')){

                pallete_html += `
                <li>
                  <input type="checkbox" id="pl-list-${pl.index}">
                  <label for="pl-list-${pl.index}">${pl.name}</label>
                  <span></span>
                  <ul>
                    ${pl.children.map( (child: any) => pallete_mapper(child) ).join('\n')}
                  </ul>
                </li>
                `;

              }else if(pl.hasOwnProperty('items')){ //Leaf Node

                pallete_html += `
                <li>
                  <input type="checkbox" id="pl-list-${pl.index}">
                  <label for="pl-list-${pl.index}">${pl.name}</label>
                  <span></span>
                  <ul>
                    ${pl.items.map( (item: any) => `<li class="pallete-item" index="${items.indexOf(item)}" resref="${item.getTemplateResRef()}">${item.getName()}</li>` ).join('\n')}
                  </ul>
                </li>
                `;

              }

              return pallete_html;
            }
    
            let equip_popup = new Wizard({
              title: 'Item Wizard', 
              body: `
              <div style="white-space: nowrap;">
                <div style="width: 75%; height: 250px; display: inline-block; overflow-y: auto; position:relative;">
                  <ul class="tree css-treeview js">
                    ${pallete.children.map(pallete_mapper).join('\n')}
                  </ul>
                </div>
                <div class="3d-preview editor-3d-preview" style="width: 25%; height: 250px; display: inline-block; position:relative;"></div>
              </div>
              <input type="text" class="input" />`,
              buttons: [
                {name: 'Save', onClick: () => { equip_popup.Close(); } }
              ],
              onClose: () => {

                //Kill the render loop for the item preview
                global.cancelAnimationFrame(requestId);
      
                equippedRes = $('input[type="text"]', equip_popup.$body).val().toString().trim();
                let equipType = parseInt($slot.attr('type'));
                $slot.data('equippedRes', equippedRes);
      
                let struct = equipment.GetChildStructByType(equipType)
                if(struct){
                  if(!equippedRes.length){
                    equipment.RemoveChildStruct(struct);
                  }else{
                    struct.GetFieldByLabel('EquippedRes').SetValue(equippedRes);
                  }
                }else if(equippedRes.length){
                  let newStruct = new GFFStruct(equipType);
                  newStruct.AddField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).SetValue(equippedRes);
                  equipment.AddChildStruct( newStruct );
                }
      
                this.updateSlotIcon($slot);
                this.Reload();
      
              },
              show: true,
              destroyOnClose: true
            });

            //Open all the root nodes by default
            setTimeout( ()=>{
              $('.tree.css-treeview.js > li > input[type="checkbox"]').prop("checked", true);
            }, 100);
      
            let $input = $('input[type="text"]', equip_popup.$body);
            $input.val(equippedRes);
      
            $('.pallete-item', equip_popup.$body).each( (i, ele) => {
              let $ele = $(ele);
              if($ele.attr('resref').equalsIgnoreCase(equippedRes)){
                $ele.removeClass('active').addClass('active');
              }
      
              $ele.parent().parent().scrollTop($ele.offset().top);
            });
      
            $('.pallete-item', equip_popup.$body).on('click', (e: any) => {
              let $ele = $(e.currentTarget);
              let resref = $ele.attr('resref');
              $input.val(resref);

              let item = items[($ele as any).attr('index')];
              item.Load( () => {
                item.LoadModel( (model: OdysseyModel3D) => {

                  let scene = ui3DRenderer.ResetScene();
                  scene.add(model);
                  setTimeout( () => {
                    let center = model.box.getCenter(new THREE.Vector3());
                    let size = model.box.getSize(new THREE.Vector3());
                    //Center the object to 0
                    model.position.set(-center.x, -center.y, -center.z);
                    ui3DRenderer.camera.position.z = 0;
                    ui3DRenderer.camera.position.y = size.x + size.y + size.z;
                    ui3DRenderer.camera.lookAt(new THREE.Vector3);

                    ui3DRenderer.onBeforeRender = (renderer: any, delta: number = 0) => {
                      model.rotation.z += delta;
                    }
                  }, 10);

                });
              });
      
              $('.pallete-item.active', equip_popup.$body).removeClass('active');
              $ele.addClass('active');
            });

            //Item Preview
            let $3dPreview = $('.3d-preview', equip_popup.$body);
            $3dPreview.append( ui3DRenderer.canvas );
            ui3DRenderer.SetSize($3dPreview .width(), $3dPreview .height());

            let render = () => {
              if(equip_popup._destroyed)
                return;
              
              console.log('render');
              requestId = requestAnimationFrame( () => { render() } );
              ui3DRenderer.Render();
            }
            render();
    
          });
        
        }
      });

    });

  }

  updateSlotIcon($slot: JQuery<HTMLElement>){
    $slot.html('').removeClass('equipped').addClass('equipped');
    if($slot.data('equippedRes').length){
      TemplateLoader.Load({
        ResRef: $slot.data('equippedRes'),
        ResType: ResourceTypes.uti,
        onLoad: (gff: GFFObject) => {
          let uti = new ModuleItem(gff);
          uti.Load( () => {
            let iconResRef = uti.getIcon();
            TextureLoader.tpcLoader.loadFromArchive('swpc_tex_gui', iconResRef, (icon: any) => {
              icon.getPixelData( ( pixelData: any ) => {
                pixelData = icon.FlipY(pixelData);
                let $canvas = $('<canvas width="60" height="60" />');
                let canvas: HTMLCanvasElement = $canvas[0] as any;
                let ctx = canvas.getContext('2d');
                let imageData = ctx.getImageData(0, 0, 64, 64);
                let data = imageData.data;

                data.set(pixelData);
                ctx.putImageData(imageData, 0, 0);
                $slot.append($canvas);
              });
            });
          });
        }
      });
    }else{
      let $canvas = $('<canvas/>');
      $slot.append($canvas).removeClass('equipped');
      this.GameImageToCanvas($canvas[0], $slot.attr('texture'), 60, 60);
    }
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
  
        // if(typeof onComplete === 'function')
        //   onComplete(err);
  
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
