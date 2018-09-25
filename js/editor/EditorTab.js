class EditorTab {

  constructor(options = {}){
    this.isDestroyed = true;
    options = $.extend({
      toolbar: undefined
    }, options);

    this.id = EditorTabManager.GetNewTabID();
    this.tabManager = null;
    this.visible = false;
    this.tabName = 'New Tab';
    this.resource = null;
    this.$tab = $('<li class="btn btn-tab"><a href="#tab-'+this.id+'">'+this.tabName+'</a> <button type="button" class="close" data-dismiss="modal">×</button></li>');
    this.$tabName = $('a', this.$tab);
    this.$tabContent = $('<div id="tab-'+this.id+'" class="tab-pane" style="position:absolute; top:0; bottom: 0; left:0; right: 0;" />');
    this.$tabClose = $('button.close', this.$tab);

    this.tabLoader = new LoadingScreen(this.$tabContent, false);
    this.tabLoader.Hide();

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

    this.$tabContent.css({
      paddingTop: 50//this is the default height of the bootstrap navbar (it needs to be smaller to make it a toolbar)
    });

  }

  BuildToolbarItem(item, $parent = null){

    let topLevel = false;
    let $item;

    if($parent == null)
      $parent = this.$toolbar; topLevel = true;

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
      if (typeof item.onClick !== 'undefined') {
        $item.on('click', item.onClick);
      }else{
        $item.on('click', function(e){
          e.preventDefault();
        });
      }

      //If there are child items
      if(typeof item.items !== 'undefined'){
        if(item.items.length){
          $parent = $('<ul class="dropdown-menu"/>');
          $item.append($parent);
          $item.addClass('dropdown');
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

  InitCExoLocStringField ($field) {

    let cexolocstring = $field.data('CExoLocString');

    let $newField = $field.clone( true );

    let $fieldHolder = $('<div class="CExoLocString-holder row"><div class="input-holder col-xs-11"></div><div class="btn-edit-holder col-xs-1"><a href="#" class="btn-edit glyphicon glyphicon-cog" title="Edit CExoLocString"></a></div></div>');
    let $btnFieldEdit = $('div.btn-edit-holder > a.btn-edit', $fieldHolder);
    $('div.input-holder', $fieldHolder).append($newField);

    $field.replaceWith($fieldHolder);

    $btnFieldEdit.on('click', (e) => {
      e.preventDefault();
      //TODO: Create the popup window that allows the user to edit a CExoLocString
      let wiz = new CExoLocStringWizard({
        'CExoLocString': cexolocstring,
        'onSave': () => {
          $newField.val( ipcRenderer.sendSync( 'TLKGetStringById', cexolocstring.RESREF ).Value );
        }
      });
    });

  }

  ElementId(str){
    return str+'-'+this.id;
  }


}

EditorTab.prototype.singleInstance = false;

module.exports = EditorTab;
