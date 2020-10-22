class EditorTab {

  constructor(options = {}){
    this.isDestroyed = true;
    options = $.extend({
      toolbar: undefined,
      closeable: true
    }, options);

    this.id = EditorTabManager.GetNewTabID();
    this.tabManager = null;
    this.visible = false;
    this.tabName = 'Script Editor';
    this.resource = null;
    this.$tab = $('<li class="btn btn-tab"><a href="#tab-'+this.id+'">'+this.tabName+'</a>&nbsp;</li>');
    this.$tabClose = $('<button type="button" class="close" data-dismiss="modal">×</button>');
    this.$tabName = $('a', this.$tab);
    this.$tabContent = $('<div id="tab-'+this.id+'" class="tab-pane" style="position:absolute; top:0; bottom: 0; left:0; right: 0;" />');

    if(options.closeable){
      this.$tab.append(this.$tabClose);
    }

    this.tabLoader = new LoadingScreen(this.$tabContent, false);
    this.tabLoader.Hide();

    this.tabLoader.$loader.css({
      'position': 'absolute',
      'top': 0,
    });

    this.tabLoader.$loading_container.css({
      'left': 0,
      'top': 0,
      'bottom': 0,
      'right': 0,
      'text-align': 'center',
      'position': 'absolute',
      'padding-top': 'calc(50% - 50px)',
    });

    this.$tab.on('click', (e) => {
      e.preventDefault();
      this.Show();
      this.visible = true;
    });

    this.$tabClose.on('click', (e) => {
      e.preventDefault();
      this.Remove();
    });

    this.toolbar = options.toolbar;
    if(typeof this.toolbar != 'undefined' && typeof this.toolbar == 'object'){
      this.BuildToolbar();
    }

  }

  InvalidateStyles(){

  }

  GetResourceID(){
    return null;
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

  Attach(tabManager){
    this.tabManager = tabManager;
    this.tabManager.$tabs.append(this.$tab);
    this.tabManager.$tabsContainer.append(this.$tabContent);
    $('a', this.$tab).attr('href', '#tab-'+this.id);
    this.$tabContent.attr('id', 'tab-'+this.id);
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

  BuildToolbarItem(item, $parent = null){

    let ddid = EditorTab.dropdownId++;

    let topLevel = false;
    let $item;

    if($parent == null){
      $parent = this.$toolbar; topLevel = true;
    }

    if (typeof item.type == 'undefined')
      item.type = 'item';

    if (typeof item.name == 'undefined')
      item.name = '';

    if (typeof item.icon != 'undefined')
      item.type = 'icon';

    if (typeof item.glyphicon != 'undefined')
      item.type = 'glyphicon';

    if (typeof item.color === 'undefined'){
      item.color = 'white';
    }

    //Build Item
    if(item.type === 'separator' || item.type === 'sep')
      $item = $('<li role="separator" class="divider" />');
    else if(item.type === 'title')
      $item = $('<li class="title">'+item.name+'</li>');
    else if(item.type === 'icon')
      $item = $('<li><a href="#"><img src="'+item.icon+'" title="'+( item.name ? item.name : '' )+'" style="width: 20px; height: 20px;"/></a></li>');
    else if(item.type === 'glyphicon')
      $item = $('<li><a href="#" class="glyphicon '+item.glyphicon+'" style="color: '+item.color+';"></a></li>');
    else
      $item = $('<li><a href="#">'+item.name+'</a></li>');

    $parent.append($item);

    //Set onClick Event
    $item.on('click', function(e){
      e.preventDefault();
      if(topLevel){
        $('.dropdown-submenu .show', $item).removeClass("show");
      }
      
      if (typeof item.onClick == 'function')
        item.onClick(e);
    });
    //If there are child items
    if(item.items instanceof Array){
      if(item.items.length){
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

      $.each(item.items, (i, cItem) => {
        this.BuildToolbarItem(cItem, $parent)
      });
    }

  }

  Destroy() {

  }

  onResize() {

  }

  onRemove(){
    this.onDestroy();
  }

  onDestroy(){
    this.isDestroyed = true;
  }

  InitCExoLocStringField ($field, field) {

    $field.prop('disabled', true);

    if(field instanceof Field){

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
      $newField.on('click', (e) => {
        e.preventDefault();
        let wiz = new CExoLocStringWizard({
          'CExoLocString': cexolocstring,
          'onSave': () => {
            $newField.val( cexolocstring.GetValue() );
          }
        });
      });
      $newField.attr('title', 'Click to edit this CExoLocString field');

      $btnFieldEdit.on('click', (e) => {
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

  InitResRefField($field, field){
    if(field instanceof Field){
      $field.val(field.Value);
      $field.on('input', (e) => {
        field.Value = $field.val();
      });
    }
  }

  InitDropDownField(args){

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
      if(!(field instanceof Field)){
        field = this.gff.AddField(new Field(args.fieldType, args.fieldName));
      }

      let $options = $('option', args.$field);
      let arr = $options.map(function(_, o) { return { t: $(o).text(), v: o.value }; }).get();
      arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
      $options.each(function(i, o) {
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

  InitCheckBoxField(args){

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
      if(!(field instanceof Field)){
        field = this.gff.AddField(new Field(args.fieldType, args.fieldName));
      }

      args.$field.prop('checked', field.Value ? true : false)
      args.$field.change( () => {
        field.Value = args.$field.is(':checked') ? 1 : 0;
        if(typeof args.onChange === 'function')
          args.onChange();
      });

    }

  }

  InitNumericField($field, field){
    if(field instanceof Field){
      $field.val(field.Value);
      $field.attr('min', 0);
      $field.on('input', (e) => {
        field.Value = parseInt($field.val());
      });
    }
  }

  ElementId(str){
    return str+'-'+this.id;
  }


}

EditorTab.prototype.singleInstance = false;
EditorTab.dropdownId = 0;

module.exports = EditorTab;
