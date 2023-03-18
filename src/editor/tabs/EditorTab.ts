import { LoadingScreen } from "../../LoadingScreen";
import { GFFField } from "../../resource/GFFField";
import { GFFObject } from "../../resource/GFFObject";
import { CExoLocStringWizard, ModalMessageBox } from "../wizards";
import { EditorFile } from "../EditorFile";
import { EditorTabManager } from "../EditorTabManager";
import { Forge } from "../Forge";
import { Project } from "../Project";

export class EditorTab {
  template: any = '';
  isDestroyed: boolean;
  id: any;
  tabManager: any;
  visible: boolean;
  tabName: string;
  resource: any;
  $tab: JQuery<HTMLElement>;
  $tabClose: JQuery<HTMLElement>;
  $tabName: JQuery<HTMLElement>;
  $tabContent: JQuery<HTMLElement>;
  tabLoader: LoadingScreen;
  toolbar: any;
  _tabClickEvent: any;
  _tabCloseClickEvent: any;
  $toolbar: JQuery<HTMLElement>;
  static dropdownId: any;
  gff: any;
  singleInstance: boolean;
  file: EditorFile;

  enableLayoutContainers: boolean = false;

  //Layout Containers
  $layoutContainer: JQuery<HTMLElement>;
  $layoutContainerCenter: JQuery<HTMLElement>;
  $layoutContainerEast: JQuery<HTMLElement>;
  $layoutContainerSouth: JQuery<HTMLElement>;
  layout_south_size: number = 0;
  layout_east_size: number = 0;
  layout_west_size: number = 0;
  layout_north_size: number = 0;
  layout_north_enabled: boolean = false;
  layout_south_enabled: boolean = false;
  layout_east_enabled: boolean = false;
  layout_west_enabled: boolean = false;
  layout_bar_open_size: number = 8;
  layout_bar_closed_size: number = 14;
  $layoutContainerNorth: JQuery<HTMLElement>;
  $layoutContainerWest: JQuery<HTMLElement>;
  layout_north_open: boolean = false;
  layout_south_open: boolean = false;
  layout_east_open: boolean = false;
  layout_west_open: boolean = false;
  $layoutContainerNorthHandle: JQuery<HTMLElement>;
  $layoutContainerSouthHandle: JQuery<HTMLElement>;
  $layoutContainerEastHandle: JQuery<HTMLElement>;
  $layoutContainerWestHandle: JQuery<HTMLElement>;
  $layoutContainerNorthHandleToggle: JQuery<HTMLElement>;
  $layoutContainerSouthHandleToggle: JQuery<HTMLElement>;
  $layoutContainerEastHandleToggle: JQuery<HTMLElement>;
  $layoutContainerWestHandleToggle: JQuery<HTMLElement>;
  tabView: any;
  tabContentView: any;

  constructor(options: any = {}){
    this.isDestroyed = true;
    options = Object.assign({
      enableLayoutContainers: false,
      toolbar: undefined,
      closeable: true,
      editorFile: undefined
    }, options);

    if(options.editorFile instanceof EditorFile){
      this.file = options.editorFile;
    }

    this.enableLayoutContainers = options.enableLayoutContainers;

    this.id = EditorTabManager.GetNewTabID();
    this.tabManager = null;
    this.visible = false;
    this.tabName = 'Unnamed Tab';
    this.resource = null;
    // this.$tab = $('<li class="btn btn-tab"><a href="#tab-'+this.id+'">'+this.tabName+'</a>&nbsp;</li>');
    // this.$tabClose = $('<button type="button" class="close" data-dismiss="modal"><span class="glyphicon glyphicon-remove"></span></button>');
    // this.$tabName = $('a', this.$tab);
    // this.$tabContent = $('<div id="tab-'+this.id+'" class="tab-pane" style="position:absolute; top:0; bottom: 0; left:0; right: 0;" />');

    if(options.closeable){
      // this.$tab.append(this.$tabClose);
    }

    // this.tabLoader = new LoadingScreen(this.$tabContent[0], false);
    // this.tabLoader.Hide();

    // $(this.tabLoader.loader).css({
    //   'position': 'absolute',
    //   'top': 0,
    // });

    // $(this.tabLoader.loading_container).css({
    //   'left': 0,
    //   'top': 0,
    //   'bottom': 0,
    //   'right': 0,
    //   'text-align': 'center',
    //   'position': 'absolute',
    //   'padding-top': 'calc(50% - 50px)',
    // });

    // this.InitDOMEvents();

    this.toolbar = options.toolbar;
    if(typeof this.toolbar != 'undefined' && typeof this.toolbar == 'object'){
      // this.BuildToolbar();
    }

    if(this.file instanceof EditorFile){
      this.file.setOnSavedStateChanged( () => {
        this.editorFileUpdated();
      });
    }
    this.editorFileUpdated();
    this.initLayoutContainers();
  }

  attachTabView(view: any){
    console.log('attach', view);
    this.tabView = view;
  }

  attachTabContentView(view: any){
    this.tabContentView = view;
  }

  initLayoutContainers(){
//     if(!this.enableLayoutContainers) return;

//     this.$layoutContainer = $(`
// <div class="content">
//   <div class="3d-layout-north"></div>
//   <div class="3d-layout-west"></div>
//   <div class="3d-layout-center"></div>
//   <div class="3d-layout-east"></div>
//   <div class="3d-layout-south"></div>
//   <div class="ui-layout-resizer ui-layout-resizer-north ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-north-open" title="Resize"><div class="ui-layout-toggler ui-layout-toggler-north ui-layout-toggler-open ui-layout-toggler-north-open" title="Close"></div></div>
//   <div class="ui-layout-resizer ui-layout-resizer-south ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-south-open" title="Resize"><div class="ui-layout-toggler ui-layout-toggler-south ui-layout-toggler-open ui-layout-toggler-south-open" title="Close"></div></div>
//   <div class="ui-layout-resizer ui-layout-resizer-east ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-est-open" title="Resize"><div class="ui-layout-toggler ui-layout-toggler-east ui-layout-toggler-open ui-layout-toggler-east-open" title="Close"></div></div>
//   <div class="ui-layout-resizer ui-layout-resizer-west ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-west-open" title="Resize"><div class="ui-layout-toggler ui-layout-toggler-west ui-layout-toggler-open ui-layout-toggler-west-open" title="Close"></div></div>
// </div>`);

//     this.$layoutContainer.css({
//       position: 'relative',
//       width: '100%',
//       height: '100%',
//     });

//     this.$layoutContainerNorth = $('.3d-layout-north', this.$layoutContainer);
//     this.$layoutContainerSouth = $('.3d-layout-south', this.$layoutContainer);
//     this.$layoutContainerCenter = $('.3d-layout-center', this.$layoutContainer);
//     this.$layoutContainerEast = $('.3d-layout-east', this.$layoutContainer);
//     this.$layoutContainerWest = $('.3d-layout-west', this.$layoutContainer);

//     this.$layoutContainerNorthHandle = $('.ui-layout-resizer-north', this.$layoutContainer);
//     this.$layoutContainerSouthHandle = $('.ui-layout-resizer-south', this.$layoutContainer);
//     this.$layoutContainerEastHandle = $('.ui-layout-resizer-east', this.$layoutContainer);
//     this.$layoutContainerWestHandle = $('.ui-layout-resizer-west', this.$layoutContainer);

    
//     this.$layoutContainerNorthHandle.draggable({
//       axis: "y",
//       stop: (e, ui) => {
//         this.layout_north_size = ui.position.top - this.layout_bar_open_size/2;
//         this.onResize();
//         console.log(e, ui);
//       }
//     });
//     this.$layoutContainerSouthHandle.draggable({ 
//       axis: "y" ,
//       stop: (e, ui) => {
//         this.layout_south_size = this.$tabContent.height() - ui.position.top - this.layout_bar_open_size/2;
//         this.onResize();
//         console.log(e, ui);
//       }
//     });
//     this.$layoutContainerEastHandle.draggable({ 
//       axis: "x",
//       stop: (e, ui) => {
//         this.layout_east_size = this.$tabContent.width() - ui.position.left - this.layout_bar_open_size/2;
//         this.onResize();
//         console.log(e, ui);
//       }
//     });
//     this.$layoutContainerWestHandle.draggable({ 
//       axis: "x",
//       stop: (e, ui) => {
//         this.layout_west_size = ui.position.left - this.layout_bar_open_size/2;
//         this.onResize();
//         console.log(e, ui);
//       }
//     });

//     this.$layoutContainerNorthHandleToggle = $('.ui-layout-toggler-north', this.$layoutContainerNorthHandle);
//     this.$layoutContainerSouthHandleToggle = $('.ui-layout-toggler-south', this.$layoutContainerSouthHandle);
//     this.$layoutContainerEastHandleToggle = $('.ui-layout-toggler-east', this.$layoutContainerEastHandle);
//     this.$layoutContainerWestHandleToggle = $('.ui-layout-toggler-west', this.$layoutContainerWestHandle);

//     this.layout_bar_open_size = 8;
//     this.layout_bar_closed_size = 14;
//   }

//   updateLayoutContainers(){
//     if(!this.enableLayoutContainers) return;

//     let tabWidth = this.$tabContent.width();
//     let tabHeight = this.$tabContent.height();

//     let north_gutter_size = 
//       this.layout_north_enabled ? (this.layout_north_open ? this.layout_bar_open_size : this.layout_bar_closed_size) : 0;
      
//     let south_gutter_size = 
//       this.layout_south_enabled ? (this.layout_south_open ? this.layout_bar_open_size : this.layout_bar_closed_size) : 0;

//     let east_gutter_size = 
//       this.layout_east_enabled ? (this.layout_east_open ? this.layout_bar_open_size : this.layout_bar_closed_size) : 0;

//     let west_gutter_size = 
//       this.layout_west_enabled ? (this.layout_west_open ? this.layout_bar_open_size : this.layout_bar_closed_size) : 0;

//     let west_bounds = {
//       top: 0,
//       left: 0,
//       width: this.layout_west_enabled ? this.layout_west_size - (west_gutter_size/2) : 0,
//       height: this.layout_west_enabled ? tabHeight : 0,
//     };

//     let east_bounds = {
//       top: 0,
//       right: 0,
//       width: this.layout_east_enabled ? this.layout_east_size - (east_gutter_size/2) : 0,
//       height: this.layout_east_enabled ? tabHeight : 0,
//     };

//     let north_bounds = {
//       top: 0,
//       right: east_bounds.width + east_gutter_size,
//       left: west_bounds.width + west_gutter_size,
//       width: this.layout_north_enabled ? (tabWidth - west_bounds.width) - east_bounds.width : 0,
//       height: this.layout_north_enabled ? this.layout_north_size - (north_gutter_size/2) : 0,
//     };

//     let south_bounds = {
//       bottom: 0,
//       right: east_bounds.width + east_gutter_size,
//       left: west_bounds.width + west_gutter_size,
//       width: this.layout_south_enabled ? (tabWidth - west_bounds.width) - east_bounds.width : 0,
//       height: this.layout_south_enabled ? this.layout_south_size  - (south_gutter_size/2) : 0,
//     };

//     let center_bounds = {
//       top: north_bounds.height + north_gutter_size,
//       bottom: south_bounds.height + south_gutter_size,
//       left: west_bounds.width + west_gutter_size,
//       right: east_bounds.width + east_gutter_size,

//       width: ((tabWidth - east_bounds.width) - west_bounds.width) - west_gutter_size - east_gutter_size,
//       height: ((tabHeight - north_bounds.height) - north_bounds.height) - north_gutter_size - south_gutter_size,
//     };

//     this.$layoutContainerCenter.css({
//       position: 'absolute',
//       top: center_bounds.top,
//       bottom: center_bounds.bottom,
//       left: center_bounds.left,
//       right: center_bounds.right,
//     });

//     this.$layoutContainerEast.css({
//       position: 'absolute',
//       top: 0,
//       bottom: 0,
//       right: 0,
//       left: tabWidth - east_bounds.width
//     });

//     this.$layoutContainerWest.css({
//       position: 'absolute',
//       top: 0,
//       bottom: 0,
//       right: this.layout_west_size,
//       left: 0
//     });

//     this.$layoutContainerNorth.css({
//       position: 'absolute',
//       top: 0,
//       bottom: north_bounds.height,
//       right: this.layout_east_size,
//       left: this.layout_west_size,
//     });

//     this.$layoutContainerSouth.css({
//       position: 'absolute',
//       top: tabHeight - south_bounds.height,
//       bottom: 0,
//       right: this.layout_east_size,
//       left: this.layout_west_size,
//     });    

//     if(!north_gutter_size){
//       this.$layoutContainerNorthHandle.hide();
//     }else{
//       this.$layoutContainerNorthHandle.show();
//       this.$layoutContainerNorthHandle.css({
//         position: 'absolute',
//         top: north_bounds.height,
//         left: north_bounds.left,
//         right: north_bounds.right,
//         height: north_gutter_size,
//         display: 'flex',
//         justifyContent: 'center',
//         alignContent: 'center',
//         cursor: 'n-resize'
//       });
//       this.$layoutContainerNorthHandleToggle.css({
//         width: 50,
//         height: '100%'
//       })
//     }

//     if(!south_gutter_size){
//       this.$layoutContainerSouthHandle.hide();
//     }else{
//       this.$layoutContainerSouthHandle.show();
//       this.$layoutContainerSouthHandle.css({
//         position: 'absolute',
//         top: tabHeight - south_bounds.height - south_gutter_size,
//         left: south_bounds.left,
//         right: south_bounds.right,
//         height: south_gutter_size,
//         display: 'flex',
//         justifyContent: 'center',
//         alignContent: 'center',
//         cursor: 's-resize'
//       });
//       this.$layoutContainerSouthHandleToggle.css({
//         width: 50,
//         height: '100%'
//       })
//     }

//     if(!east_gutter_size){
//       this.$layoutContainerEastHandle.hide();
//     }else{
//       this.$layoutContainerEastHandle.show();
//       this.$layoutContainerEastHandle.css({
//         position: 'absolute',
//         bottom: 0,
//         top: 0,
//         left: tabWidth - east_bounds.width - east_gutter_size,
//         width: east_gutter_size,
//         display: 'flex',
//         justifyContent: 'center',
//         alignContent: 'center',
//         alignItems: 'center',
//         cursor: 'e-resize'
//       });
//       this.$layoutContainerEastHandleToggle.css({
//         height: 50,
//         width: '100%'
//       })
//     }

//     if(!west_gutter_size){
//       this.$layoutContainerWestHandle.hide();
//     }else{
//       this.$layoutContainerWestHandle.show();
//       this.$layoutContainerWestHandle.css({
//         position: 'absolute',
//         bottom: 0,
//         top: 0,
//         left: west_bounds.width,
//         width: west_gutter_size,
//         display: 'flex',
//         justifyContent: 'center',
//         alignContent: 'center',
//         alignItems: 'center',
//         cursor: 'w-resize'
//       });
//       this.$layoutContainerWestHandleToggle.css({
//         height: 50,
//         width: '100%'
//       })
//     }

  }

  initContentTemplate(){
    // let data: any = {
    //   tabId: this.id
    // };

    // let template = this.template.replace(
    //   /{(\w*)}/g,
    //   function(m: any,key: string){
    //     return data.hasOwnProperty(key)?data[key]:"";
    //   }
    // );
    // this.$tabContent.append(template);
  }

  editorFileUpdated(){
    if(this.file instanceof EditorFile){
      console.log('editor file updated', this.file.resref, this.file.ext, this.file)
      if(this.file.unsaved_changes){
        this.tabName = (`${this.file.resref}.${this.file.ext} *`);
      }else{
        this.tabName =(`${this.file.resref}.${this.file.ext}`);
      }
    }
  }

  InitDOMEvents(){

    // if(typeof this._tabClickEvent != 'function'){
    //   this._tabClickEvent = (e: any) => {
    //     e.preventDefault();
    //     this.Show();
    //     this.visible = true;
    //   };
    // }

    // if(typeof this._tabCloseClickEvent != 'function'){
    //   this._tabCloseClickEvent = (e: any) => {
    //     e.preventDefault();
    //     if(this.file instanceof EditorFile){
    //       if(this.file.unsaved_changes){
    //         let mb = new ModalMessageBox({
    //           type: 'question',
    //           buttons: ['Yes', 'No'],
    //           title: 'You have unsaved changes',
    //           message: 'Press Yes to close without saving',
    //           onChoose: (choice: string) => {
    //             if(choice == 'Yes'){
    //               this.Remove();
    //             }else{ }
    //           }
    //         });
    //         mb.Show();
    //       }else{
    //         this.Remove();
    //       }
    //     }else{
    //       this.Remove();
    //     }
    //   };
    // }

    // this.$tab.off('click', this._tabClickEvent).on('click', this._tabClickEvent);
    // this.$tabClose.off('click', this._tabCloseClickEvent).on('click', this._tabCloseClickEvent);

  }

  render(){
    return (
      ''
    );
  }

  InvalidateStyles(){

  }

  GetResourceID(): any{
    return;
  }

  getFile(): EditorFile {
    return this.file;
  }

  getExportBuffer(): Buffer {
    return this.file.buffer;
  }

  Show(){
    this.tabManager.HideAll();
    this.visible = true;
    // $('li.btn-tab', this.$tab.parent()).removeClass('current');
    // this.$tab.removeClass('current').addClass('current');
    // this.$tabContent.show();

    this.tabManager.currentTab = this;
  }

  Hide(){
    this.visible = false;
    // this.$tab.removeClass('current');
    // this.$tabContent.hide();
  }

  Remove(){
    this.visible = false;
    this.tabManager.RemoveTab(this);
    this.onRemove();
  }

  Attach(tabManager: EditorTabManager){
    this.tabManager = tabManager;
    this.isDestroyed = false;

    try{
      // this.tabManager.$tabs.remove(this.$tab);
      // this.tabManager.$tabsContainer.remove(this.$tabContent);
    }catch(e){ }

    // this.tabManager.$tabs.append(this.$tab);
    // this.tabManager.$tabsContainer.append(this.$tabContent);
    
    // $('a', this.$tab).attr('href', '#tab-'+this.id);
    // this.$tabContent.attr('id', 'tab-'+this.id);

    this.InitDOMEvents();
    // this.$tabContent.off('keyup').on('keyup', (e: any) => this.onKeyUp(e) );
    // this.$tabContent.off('keydown').on('keydown', (e: any) => this.onKeyDown(e) );
    // this.$tabContent.off('keypress').on('keypress', (e: any) => this.onKeyPress(e) );
  }


  BuildToolbar(){

    // this.$toolbar = $('<ul class="nav navbar-nav" style="z-index: 10005;"/>');
    // this.$toolbar.css({
    //   position: 'absolute',
    //   top: 0,
    //   left: 0,
    //   right: 0,
    // });
    // this.$tabContent.append(this.$toolbar);

    // $.each(this.toolbar.items, (i, item) => {
    //   this.BuildToolbarItem(item, null)
    // });

    // ------------------------------------------------------- //
    // Multi Level dropdowns
    // ------------------------------------------------------ //
    // $("ul.dropdown-menu [data-toggle='dropdown']", this.$toolbar).on("click", function(event) {
    //   event.preventDefault();
    //   event.stopPropagation();

    //   $(this).siblings().toggleClass("show");


    //   if (!$(this).next().hasClass('show')) {
    //     $(this).parents('.dropdown-menu').first().find('.show').removeClass("show");
    //   }
    //   $(this).parents('li.nav-item.dropdown.show').on('hidden.bs.dropdown', function(e) {
    //     $('.dropdown-submenu .show').removeClass("show");
    //   });

    // });

    // this.$tabContent.css({
    //   paddingTop: 50//this is the default height of the bootstrap navbar (it needs to be smaller to make it a toolbar)
    // });

  }

  BuildToolbarItem(item: any, $parent?: JQuery<HTMLElement>){

    // let ddid = EditorTab.dropdownId++;

    // let topLevel = false;
    // let $item: JQuery<HTMLElement>;

    // if($parent == null){
    //   $parent = this.$toolbar; topLevel = true;
    // }

    // if (typeof item.type == 'undefined'){
    //   item.type = 'item';
    // }

    // if (typeof item.name == 'undefined'){
    //   item.name = '';
    // }

    // if (typeof item.icon != 'undefined'){
    //   item.type = 'icon';
    // }

    // if (typeof item.glyphicon != 'undefined'){
    //   item.type = 'glyphicon';
    // }
    
    // if (typeof item.color === 'undefined'){
    //   item.color = 'white';
    // }

    // //Build Item
    // if(item.type === 'separator' || item.type === 'sep'){
    //   $item = $('<li role="separator" class="divider" />');
    // }else if(item.type === 'title'){
    //   $item = $('<li class="title">'+item.name+'</li>');
    // }else if(item.type === 'icon'){
    //   $item = $('<li><a href="#"><img src="'+item.icon+'" title="'+( item.name ? item.name : '' )+'" style="width: 20px; height: 20px;"/></a></li>');
    // }else if(item.type === 'glyphicon'){
    //   $item = $('<li><a href="#" class="glyphicon '+item.glyphicon+'" style="color: '+item.color+';"></a></li>');
    // }else{
    //   $item = $('<li><a href="#">'+item.name+'</a></li>');
    // }

    // $parent.append($item);

    // //Set onClick Event
    // $item.on('click', function(e){
    //   e.preventDefault();
    //   if(topLevel){
    //     $('.dropdown-submenu .show', $item).removeClass("show");
    //   }
      
    //   if (typeof item.onClick == 'function'){
    //     item.onClick(e);
    //   }
    // });
    // //If there are child items
    // let items: any = item.items;
    // if(items instanceof Array){
    //   if(items.length){
    //     console.log('topLevel', topLevel);
    //     if(!topLevel){
    //       $item.removeClass('dropdown-submenu').addClass('dropdown-submenu');
    //     }else{
    //       $item.addClass('dropdown');
    //     }
        
    //     $parent = $('<ul class="dropdown-menu"/>');
    //     $item.append($parent);
    //     $('a', $item).addClass('dropdown-toggle').attr('data-toggle','dropdown').attr('role','button').attr('aria-haspopup','true').attr('aria-expanded','false');
    //   }

    //   $.each(items, (i, cItem) => {
    //     this.BuildToolbarItem(cItem, $parent)
    //   });
    // }

  }

  Destroy() {}

  onResize() {
    // this.updateLayoutContainers();
  }

  onRemove(){
    if(Forge.Project instanceof Project){
      Forge.Project.removeFromOpenFileList(this.file);
    }
    // this.$tabContent.off('keyup');
    // this.$tabContent.off('keydown');
    // this.$tabContent.off('keypress');
    this.onDestroy();
  }

  onDestroy(){
    this.isDestroyed = true;
  }

  InitCExoLocStringField ($field: JQuery<HTMLElement>, field: GFFField) {

    // $field.prop('disabled', true);

    // if(field instanceof GFFField){

    //   $field.val(field.GetCExoLocString().GetValue())

    //   let cexolocstring = field.GetCExoLocString();

    //   let $newField = $field.clone( true );

    //   let $fieldHolder = $('<div class="CExoLocString-holder row"><div class="input-holder col-xs-11"></div><div class="btn-edit-holder col-xs-1"><a href="#" class="btn-edit glyphicon glyphicon-edit" title="Edit CExoLocString"></a></div></div>');
    //   let $btnFieldEdit = $('div.btn-edit-holder > a.btn-edit', $fieldHolder);
    //   $('div.input-holder', $fieldHolder).append($newField);

    //   $field.replaceWith($fieldHolder);

    //   $newField.css({
    //     cursor: 'pointer'
    //   });
    //   $newField.on('click', (e: any) => {
    //     e.preventDefault();
    //     let wiz = new CExoLocStringWizard({
    //       'CExoLocString': cexolocstring,
    //       'onSave': () => {
    //         $newField.val( cexolocstring.GetValue() );
    //       }
    //     });
    //   });
    //   $newField.attr('title', 'Click to edit this CExoLocString field');

    //   $btnFieldEdit.on('click', (e: any) => {
    //     e.preventDefault();
    //     let wiz = new CExoLocStringWizard({
    //       'CExoLocString': cexolocstring,
    //       'onSave': () => {
    //         $newField.val( cexolocstring.GetValue() );
    //       }
    //     });
    //   });

    // }

  }

  InitResRefField ($field: JQuery<HTMLElement>, field: GFFField){
    if(field instanceof GFFField){
      $field.val(field.Value);
      $field.on('input', (e: any) => {
        field.Value = $field.val();
      });
    }
  }

  InitDropDownField(args: any = {}){

    // args = Object.assign({
    //   $field: null,       //jQuery Element
    //   fieldName: null,        //GFF Field Name
    //   fieldType: null,    //GFF Field Type
    //   objOrArray: null,   //Elements of data
    //   propertyName: null, //Property name to target inside objOrArray
    //   selectionOffset: 0,
    //   onChange: null,      //onChange callback function for UI updates
    //   onLabel: null
    // }, args);

    // if(!(this.gff instanceof GFFObject)){
    //   return;
    // }

    // if(args.$field){

    //   if(args.objOrArray instanceof Array){
    //     for (let i = 0; i < args.objOrArray.length; i++) {
    //       let obj = args.objOrArray[i];
    //       let label = obj[args.propertyName];

    //       if(typeof args.onLabel === 'function')
    //         label = args.onLabel(label);

    //       args.$field.append('<option value="'+i+'">'+label+'</option>');
    //     }
    //   }else if(typeof args.objOrArray === 'object'){
    //     for (let key in args.objOrArray) {
    //       let obj = args.objOrArray[key];
    //       let label = obj[args.propertyName];

    //       if(typeof args.onLabel === 'function')
    //         label = args.onLabel(label);

    //       args.$field.append('<option value="'+key+'">'+label+'</option>');
    //     }
    //   }

    //   let field = this.gff.GetFieldByLabel(args.fieldName);
    //   if(!(field instanceof GFFField)){
    //     field = this.gff.AddField(new GFFField(args.fieldType, args.fieldName));
    //   }

    //   let $options = $('option', args.$field);
    //   let arr = $options.map(function(_, o: any) { return { t: $(o).text(), v: o.value }; }).get();
    //   arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
    //   $options.each(function(i, o: any) {
    //     o.value = arr[i].v;
    //     $(o).text(arr[i].t);
    //   });

    //   args.$field.val(field.GetValue()-args.selectionOffset).prop('disabled', false);
    //   args.$field.change( () => {
    //     field.Value = parseFloat(args.$field.val())+args.selectionOffset;
    //     if(typeof args.onChange === 'function')
    //       args.onChange();
    //   });

    // }

  }

  InitCheckBoxField(args: any = {}){

    // args = Object.assign({
    //   $field: null,       //jQuery Element
    //   fieldName: null,     //GFF Field Name
    //   fieldType: null,    //GFF Field Type
    //   onChange: null,      //onChange callback function for UI updates
    // }, args);

    // if(!(this.gff instanceof GFFObject)){
    //   return;
    // }

    // if(args.$field){

    //   let field = this.gff.GetFieldByLabel(args.fieldName);
    //   if(!(field instanceof GFFField)){
    //     field = this.gff.AddField(new GFFField(args.fieldType, args.fieldName));
    //   }

    //   args.$field.prop('checked', field.Value ? true : false)
    //   args.$field.change( () => {
    //     field.Value = args.$field.is(':checked') ? 1 : 0;
    //     if(typeof args.onChange === 'function')
    //       args.onChange();
    //   });

    // }

  }

  InitNumericField ($field: JQuery<HTMLElement>, field: GFFField){
    // if(field instanceof GFFField){
    //   $field.val(field.Value);
    //   $field.attr('min', 0);
    //   $field.on('input', (e: any) => {
    //     field.Value = parseInt($field.val().toString());
    //   });
    // }
  }

  ElementId(str: string){
    return str+'-'+this.id;
  }

  onKeyUp(e: any){
    //
  }

  onKeyDown(e: any){
    //
  }

  onKeyPress(e: any){
    //
  }


}

EditorTab.prototype.singleInstance = false;
EditorTab.dropdownId = 0;
