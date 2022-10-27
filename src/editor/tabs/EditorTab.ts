import { LoadingScreen } from "../../LoadingScreen";
import { GFFField } from "../../resource/GFFField";
import { GFFObject } from "../../resource/GFFObject";
import { CExoLocStringWizard } from "../wizards";
import { EditorFile } from "../EditorFile";
import { EditorTabManager } from "../EditorTabManager";
import { Forge } from "../Forge";
import { Project } from "../Project";

export class EditorTab {
  isDestroyed: boolean;
  editorFile: any;
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

  constructor(options: any = {}){
    this.isDestroyed = true;
    options = Object.assign({
      toolbar: undefined,
      closeable: true,
      editorFile: undefined
    }, options);

    this.editorFile = options.editorFile;

    this.id = EditorTabManager.GetNewTabID();
    this.tabManager = null;
    this.visible = false;
    this.tabName = 'Unnamed Tab';
    this.resource = null;
    this.$tab = $('<li class="btn btn-tab"><a href="#tab-'+this.id+'">'+this.tabName+'</a>&nbsp;</li>');
    this.$tabClose = $('<button type="button" class="close" data-dismiss="modal"><span class="glyphicon glyphicon-remove"></span></button>');
    this.$tabName = $('a', this.$tab);
    this.$tabContent = $('<div id="tab-'+this.id+'" class="tab-pane" style="position:absolute; top:0; bottom: 0; left:0; right: 0;" />');

    if(options.closeable){
      this.$tab.append(this.$tabClose);
    }

    this.tabLoader = new LoadingScreen(this.$tabContent[0], false);
    this.tabLoader.Hide();

    $(this.tabLoader.loader).css({
      'position': 'absolute',
      'top': 0,
    });

    $(this.tabLoader.loading_container).css({
      'left': 0,
      'top': 0,
      'bottom': 0,
      'right': 0,
      'text-align': 'center',
      'position': 'absolute',
      'padding-top': 'calc(50% - 50px)',
    });

    this.InitDOMEvents();

    this.toolbar = options.toolbar;
    if(typeof this.toolbar != 'undefined' && typeof this.toolbar == 'object'){
      this.BuildToolbar();
    }

    if(this.editorFile instanceof EditorFile){
      this.editorFile.setOnSavedStateChanged( () => {
        this.editorFileUpdated();
      });
    }
    this.editorFileUpdated();

  }

  editorFileUpdated(){
    if(this.editorFile instanceof EditorFile){
      console.log('editor file updated', this.editorFile.resref, this.editorFile.ext, this.editorFile)
      if(this.editorFile.unsaved_changes){
        this.$tabName.text(`${this.editorFile.resref}.${this.editorFile.ext} *`);
      }else{
        this.$tabName.text(`${this.editorFile.resref}.${this.editorFile.ext}`);
      }
    }
  }

  InitDOMEvents(){

    if(typeof this._tabClickEvent != 'function'){
      this._tabClickEvent = (e: any) => {
        e.preventDefault();
        this.Show();
        this.visible = true;
      };
    }

    if(typeof this._tabCloseClickEvent != 'function'){
      this._tabCloseClickEvent = (e: any) => {
        e.preventDefault();
        if(this.editorFile instanceof EditorFile){
          if(this.editorFile.unsaved_changes){
            //@ts-expect-error
            dialog.showMessageBox(
              //@ts-expect-error
              remote.getCurrentWindow(), {
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'You have unsaved changes',
                message: 'Press Yes to close without saving'
              }
            ).then( (confirm: any) => {
              if(!confirm.response){
                this.Remove();
              }
            });
          }else{
            this.Remove();
          }
        }else{
          this.Remove();
        }
      };
    }

    this.$tab.off('click', this._tabClickEvent).on('click', this._tabClickEvent);
    this.$tabClose.off('click', this._tabCloseClickEvent).on('click', this._tabCloseClickEvent);

  }

  InvalidateStyles(){

  }

  GetResourceID(): any{
    return;
  }

  Show(){
    this.tabManager.HideAll();
    this.visible = true;
    $('li.btn-tab', this.$tab.parent()).removeClass('current');
    this.$tab.removeClass('current').addClass('current');
    this.$tabContent.show();

    this.tabManager.currentTab = this;
  }

  Hide(){
    this.visible = false;
    this.$tab.removeClass('current');
    this.$tabContent.hide();
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
      this.tabManager.$tabs.remove(this.$tab);
      this.tabManager.$tabsContainer.remove(this.$tabContent);
    }catch(e){ }

    this.tabManager.$tabs.append(this.$tab);
    this.tabManager.$tabsContainer.append(this.$tabContent);
    
    $('a', this.$tab).attr('href', '#tab-'+this.id);
    this.$tabContent.attr('id', 'tab-'+this.id);

    this.InitDOMEvents();
    this.$tabContent.off('keyup').on('keyup', (e: any) => this.onKeyUp(e) );
    this.$tabContent.off('keydown').on('keydown', (e: any) => this.onKeyDown(e) );
    this.$tabContent.off('keypress').on('keypress', (e: any) => this.onKeyPress(e) );
  }


  BuildToolbar(){

    this.$toolbar = $('<ul class="nav navbar-nav" style="z-index: 10005;"/>');
    this.$toolbar.css({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    });
    this.$tabContent.append(this.$toolbar);

    $.each(this.toolbar.items, (i, item) => {
      this.BuildToolbarItem(item, null)
    });

    // ------------------------------------------------------- //
    // Multi Level dropdowns
    // ------------------------------------------------------ //
    $("ul.dropdown-menu [data-toggle='dropdown']", this.$toolbar).on("click", function(event) {
      event.preventDefault();
      event.stopPropagation();

      $(this).siblings().toggleClass("show");


      if (!$(this).next().hasClass('show')) {
        $(this).parents('.dropdown-menu').first().find('.show').removeClass("show");
      }
      $(this).parents('li.nav-item.dropdown.show').on('hidden.bs.dropdown', function(e) {
        $('.dropdown-submenu .show').removeClass("show");
      });

    });

    this.$tabContent.css({
      paddingTop: 50//this is the default height of the bootstrap navbar (it needs to be smaller to make it a toolbar)
    });

  }

  BuildToolbarItem(item: JQuery<HTMLElement>, $parent?: JQuery<HTMLElement>){

    let ddid = EditorTab.dropdownId++;

    let topLevel = false;
    let $item: JQuery<HTMLElement>;

    if($parent == null){
      $parent = this.$toolbar; topLevel = true;
    }

    //@ts-expect-error
    if (typeof item.type == 'undefined'){
      //@ts-expect-error
      item.type = 'item';
    }

    //@ts-expect-error
    if (typeof item.name == 'undefined'){
      //@ts-expect-error
      item.name = '';
    }

    //@ts-expect-error
    if (typeof item.icon != 'undefined'){
      //@ts-expect-error
      item.type = 'icon';
    }

    //@ts-expect-error
    if (typeof item.glyphicon != 'undefined'){
      //@ts-expect-error
      item.type = 'glyphicon';
    }
    
    //@ts-expect-error
    if (typeof item.color === 'undefined'){
      //@ts-expect-error
      item.color = 'white';
    }

    //Build Item
      //@ts-expect-error
    if(item.type === 'separator' || item.type === 'sep'){
      $item = $('<li role="separator" class="divider" />');
    //@ts-expect-error
    }else if(item.type === 'title'){
      //@ts-expect-error
      $item = $('<li class="title">'+item.name+'</li>');
      //@ts-expect-error
    }else if(item.type === 'icon'){
      //@ts-expect-error
      $item = $('<li><a href="#"><img src="'+item.icon+'" title="'+( item.name ? item.name : '' )+'" style="width: 20px; height: 20px;"/></a></li>');
      //@ts-expect-error
    }else if(item.type === 'glyphicon'){
      //@ts-expect-error
      $item = $('<li><a href="#" class="glyphicon '+item.glyphicon+'" style="color: '+item.color+';"></a></li>');
    }else{
      //@ts-expect-error
      $item = $('<li><a href="#">'+item.name+'</a></li>');
    }

    $parent.append($item);

    //Set onClick Event
    $item.on('click', function(e){
      e.preventDefault();
      if(topLevel){
        $('.dropdown-submenu .show', $item).removeClass("show");
      }
      
      //@ts-expect-error
      if (typeof item.onClick == 'function'){
        //@ts-expect-error
        item.onClick(e);
      }
    });
    //If there are child items
    //@ts-expect-error
    let items: any = item.items;
    if(items instanceof Array){
      if(items.length){
        console.log('topLevel', topLevel);
        if(!topLevel){
          $item.removeClass('dropdown-submenu').addClass('dropdown-submenu');
        }else{
          $item.addClass('dropdown');
        }
        
        $parent = $('<ul class="dropdown-menu"/>');
        $item.append($parent);
        $('a', $item).addClass('dropdown-toggle').attr('data-toggle','dropdown').attr('role','button').attr('aria-haspopup','true').attr('aria-expanded','false');
      }

      $.each(items, (i, cItem) => {
        this.BuildToolbarItem(cItem, $parent)
      });
    }

  }

  Destroy() {

  }

  onResize() {

  }

  onRemove(){
    if(Forge.Project instanceof Project){
      Forge.Project.removeFromOpenFileList(this.file);
    }
    this.$tabContent.off('keyup');
    this.$tabContent.off('keydown');
    this.$tabContent.off('keypress');
    this.onDestroy();
  }

  onDestroy(){
    this.isDestroyed = true;
  }

  InitCExoLocStringField ($field: JQuery<HTMLElement>, field: GFFField) {

    $field.prop('disabled', true);

    if(field instanceof GFFField){

      $field.val(field.GetCExoLocString().GetValue())

      let cexolocstring = field.GetCExoLocString();

      let $newField = $field.clone( true );

      let $fieldHolder = $('<div class="CExoLocString-holder row"><div class="input-holder col-xs-11"></div><div class="btn-edit-holder col-xs-1"><a href="#" class="btn-edit glyphicon glyphicon-edit" title="Edit CExoLocString"></a></div></div>');
      let $btnFieldEdit = $('div.btn-edit-holder > a.btn-edit', $fieldHolder);
      $('div.input-holder', $fieldHolder).append($newField);

      $field.replaceWith($fieldHolder);

      $newField.css({
        cursor: 'pointer'
      });
      $newField.on('click', (e: any) => {
        e.preventDefault();
        let wiz = new CExoLocStringWizard({
          'CExoLocString': cexolocstring,
          'onSave': () => {
            $newField.val( cexolocstring.GetValue() );
          }
        });
      });
      $newField.attr('title', 'Click to edit this CExoLocString field');

      $btnFieldEdit.on('click', (e: any) => {
        e.preventDefault();
        let wiz = new CExoLocStringWizard({
          'CExoLocString': cexolocstring,
          'onSave': () => {
            $newField.val( cexolocstring.GetValue() );
          }
        });
      });

    }

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

    args = Object.assign({
      $field: null,       //jQuery Element
      fieldName: null,        //GFF Field Name
      fieldType: null,    //GFF Field Type
      objOrArray: null,   //Elements of data
      propertyName: null, //Property name to target inside objOrArray
      selectionOffset: 0,
      onChange: null,      //onChange callback function for UI updates
      onLabel: null
    }, args);

    if(!(this.gff instanceof GFFObject)){
      return;
    }

    if(args.$field){

      if(args.objOrArray instanceof Array){
        for (let i = 0; i < args.objOrArray.length; i++) {
          let obj = args.objOrArray[i];
          let label = obj[args.propertyName];

          if(typeof args.onLabel === 'function')
            label = args.onLabel(label);

          args.$field.append('<option value="'+i+'">'+label+'</option>');
        }
      }else if(typeof args.objOrArray === 'object'){
        for (let key in args.objOrArray) {
          let obj = args.objOrArray[key];
          let label = obj[args.propertyName];

          if(typeof args.onLabel === 'function')
            label = args.onLabel(label);

          args.$field.append('<option value="'+key+'">'+label+'</option>');
        }
      }

      let field = this.gff.GetFieldByLabel(args.fieldName);
      if(!(field instanceof GFFField)){
        field = this.gff.AddField(new GFFField(args.fieldType, args.fieldName));
      }

      let $options = $('option', args.$field);
      let arr = $options.map(function(_, o: any) { return { t: $(o).text(), v: o.value }; }).get();
      arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
      $options.each(function(i, o: any) {
        o.value = arr[i].v;
        $(o).text(arr[i].t);
      });

      args.$field.val(field.GetValue()-args.selectionOffset).prop('disabled', false);
      args.$field.change( () => {
        field.Value = parseFloat(args.$field.val())+args.selectionOffset;
        if(typeof args.onChange === 'function')
          args.onChange();
      });

    }

  }

  InitCheckBoxField(args: any = {}){

    args = Object.assign({
      $field: null,       //jQuery Element
      fieldName: null,     //GFF Field Name
      fieldType: null,    //GFF Field Type
      onChange: null,      //onChange callback function for UI updates
    }, args);

    if(!(this.gff instanceof GFFObject)){
      return;
    }

    if(args.$field){

      let field = this.gff.GetFieldByLabel(args.fieldName);
      if(!(field instanceof GFFField)){
        field = this.gff.AddField(new GFFField(args.fieldType, args.fieldName));
      }

      args.$field.prop('checked', field.Value ? true : false)
      args.$field.change( () => {
        field.Value = args.$field.is(':checked') ? 1 : 0;
        if(typeof args.onChange === 'function')
          args.onChange();
      });

    }

  }

  InitNumericField ($field: JQuery<HTMLElement>, field: GFFField){
    if(field instanceof GFFField){
      $field.val(field.Value);
      $field.attr('min', 0);
      $field.on('input', (e: any) => {
        field.Value = parseInt($field.val().toString());
      });
    }
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
