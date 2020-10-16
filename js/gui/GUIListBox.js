/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

const GUIProtoItem = require("./GUIProtoItem");

/* @file
 * The GUIListBox class.
 */

class GUIListBox extends GUIControl {

  constructor(menu = null, control = null, parent = null, scale = false){
    
    super(menu, control, parent, scale);

    this.listItems = [];
    this.lastHeight = 0;
    this.scroll = 0;
    this.maxScroll = 0;
    this.offset = new THREE.Vector2(0, 0);
    this.GUIProtoItemClass = undefined;
    this.onSelected = undefined;

    //ProtoItem
    this.hasProtoItem = control.HasField('PROTOITEM');
    if(this.hasProtoItem){
      //console.log(control.GetFieldByLabel('PROTOITEM'))
      this.protoItem = control.GetFieldByLabel('PROTOITEM').GetChildStructs()[0];
    }

    //ScrollBar
    this.hasScrollBar = control.HasField('SCROLLBAR');
    if(this.hasScrollBar){
      //console.log(control.GetFieldByLabel('SCROLLBAR'))
      this._scrollbar = control.GetFieldByLabel('SCROLLBAR').GetChildStructs()[0];
    }

    this.itemGroup = new THREE.Group();
    this.itemGroup.name = 'ListItems';
    this.widget.add(this.itemGroup);

    if(this.hasScrollBar){
      this.scrollbar = new GUIScrollBar(this.menu, this._scrollbar, this.widget, this.scale);
      this.scrollbar.setList( this );
      this.widget.add(this.scrollbar.createControl());

    }

    //this.startFromLeft = ( control.HasField('STARTFROMLEFT') ? control.GetFieldByLabel('STARTFROMLEFT').GetValue() : 0 );


    /*We don't need to scissor because kotor lists dont show inbetween items. they always snap to the top item.
    therefor if an item's bounds aren't inside the listbox bounds we will just set it to hidden*/

    /*this.widget.onBeforeRender = function(){
      Game.renderer.setScissorTest(true);
      Game.renderer.setScissor(0, 0, 250, 250);
      console.log('start scissor');
    }

    this.widget.onAfterRender = function(){
      Game.renderer.setScissorTest(false);
      console.log('end scissor');
    }*/

  }

  calculatePosition(){
    super.calculatePosition();
    this.lastHeight = 0;
    for(let i = 0; i < this.children.length; i++){
      this.children[i].calculatePosition();
    }

    if(this.scrollbar instanceof GUIScrollBar){
      this.scrollbar.calculatePosition();
      this.scrollbar.update();
    }

  }

  clearItems(){
    this.lastHeight = 0;
    for (let i = this.itemGroup.children.length - 1; i >= 0; i--) {
      this.itemGroup.remove(this.itemGroup.children[i]);
    }
    this.children = [];
  }

  removeItemByIndex(index = -1){
    if(index >= 0 && this.children.length > index){
      let node = this.children.splice(index, 1)[0];
      node.widget.parent.remove(node.widget);

      //Select a new item if the one removed was selected
      if(this.selectedItem == node){
        //new select index
        index = index--;
        if(index < 0)
          index = 0;

        this.select(this.children[index]);
      }

      this.updateList();
    }
  }

  getProtoItemType(){
    return this.protoItem.GetFieldByLabel('CONTROLTYPE').GetValue();
  }

  addItem(node, onClick = null, customBuilder = null){
    let control = this.protoItem;
    let type = control.GetFieldByLabel('CONTROLTYPE').GetValue();

    if(typeof customBuilder == 'function'){
      customBuilder(control, type);
      this.cullOffscreen();
    }else{

      let index = -1;
      let ctrl;
      let widget;

      if(typeof this.GUIProtoItemClass === 'undefined'){
        switch(type){
          case 4:
            ctrl = new GUIProtoItem(this.menu, control, this, this.scale);
            ctrl.text.text = node;
            ctrl.isProtoItem = false;
            ctrl.offset = this.offset;
            ctrl.node = node;
            ctrl.setList( this );
            this.children.push(ctrl);

            widget = ctrl.createControl();
            ctrl.setText(node);

            this.itemGroup.add(widget);

            ctrl.addEventListener('click', (e) => {
              e.stopPropagation();
              if(typeof onClick === 'function')
                onClick(node, ctrl);
            });

            //this.calculatePosition();
            //this.cullOffscreen();

          break;
          case 6:
            try{
              ctrl = new GUIProtoItem(this.menu, control, this, this.scale);
              ctrl.isProtoItem = false;
              ctrl.offset = this.offset;
              ctrl.node = node;
              ctrl.setList( this );
              this.children.push(ctrl);

              ctrl.highlight.color = new THREE.Color(0.83203125, 1, 0.83203125);
              ctrl.border.color = new THREE.Color(0, 0.658823549747467, 0.9803921580314636);

              widget = ctrl.createControl();
              ctrl.setText(node.getName());

              this.itemGroup.add(widget);

              ctrl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.select(ctrl);

                if(typeof onClick === 'function')
                  onClick(node, ctrl);
              });
            }catch(e){
              console.log(e);
            }
          break;
          default:
            console.error('GUIListBox.add', 'Unknown ControlType', type);
          break;
        }
      }else{
        ctrl = new this.GUIProtoItemClass(this.menu, control, this, this.scale);
        ctrl.isProtoItem = true;
        ctrl.offset = this.offset;
        ctrl.node = node;
        ctrl.setList( this );
        this.children.push(ctrl);

        ctrl.highlight.color = new THREE.Color(0.83203125, 1, 0.83203125);
        ctrl.border.color = new THREE.Color(0, 0.658823549747467, 0.9803921580314636);

        index = this.itemGroup.children.length;
        widget = ctrl.createControl();

        this.itemGroup.add(widget);

        //widget.position.x += 52/2;

        ctrl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.select(ctrl);

          if(typeof onClick === 'function')
            onClick(node, ctrl);
        });
      }
    }

    this.updateList();
    this.scrollbar.update();

  }

  select(item = null){
    try{
      let len = this.children.length;
      for(let i = 0; i < len; i++){
        this.children[i].selected = false;
        if(typeof this.children[i].onSelect === 'function'){
          this.children[i].onSelect();
        }
      }

      if(item instanceof GUIControl){
        item.selected = true;
        this.selectedItem = item;
        if(typeof item.onSelect === 'function'){
          item.onSelect();
        }
        if(typeof this.onSelected === 'function')
          this.onSelected(item.node);
      }
    }catch(e){
      console.error(e);
    }
  }

  updateList(){
    
    //update scrollbar
    this.calculateBox();

    let oldMaxScroll = this.maxScroll;
    this.maxScroll = 0;
    let maxContentHeight = this.getContentHeight();
    let innerOffset = 0;

    if(!this.children.length)
      return;

    for(let i = 0; i < this.children.length; i++){
      let node = this.children[i];
      let height = this.getNodeHeight(node) + 5;
      innerOffset = node.border.inneroffset;
      if((height + this.padding)*i >= this.extent.height - 5)
        this.maxScroll++;
    }

    let topY = this.extent.height/2;
    let nodeOffset = parseInt(-this.scroll * (this.getNodeHeight()) + this.padding);

    for(let i = 0; i < this.children.length; i++){
      let node = this.children[i];
      let height = this.getNodeHeight(node);
      if(this.getProtoItemType() == 6){
        node.widget.position.y = (topY - nodeOffset - this.getNodeHeight()/2);
      }else{
        node.widget.position.y = (topY - nodeOffset - height/2) + 5;
        height += 5;
      }
      nodeOffset += parseInt(height);
    }
    
    if(this.scrollbar){
      //this.scrollbar.updateScrollThumb();
    }

    if(!this.maxScroll){
      this.scrollbar.hide();
    }else{
      this.scrollbar.show();
    }

    this.calculateBox();
    this.cullOffscreen();

  }

  cullOffscreen(){
    let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3())
    this.minY = parentPos.y + this.extent.height/2;
    this.maxY = parentPos.y - this.extent.height/2;

    let nodePadding = 0;//(this.getNodeHeight()/2);

    let nodes = this.itemGroup.children;
    for(let i = 0; i < nodes.length; i++){
      let control = nodes[i].control;
      let nodePos = control.updateWorldPosition(); //getWorldPosition(nodes[i].control.worldPosition);
      let nodeTop = nodePos.y + control.extent.height/2 - nodePadding;
      let nodeBottom = nodePos.y - control.extent.height/2 + nodePadding;
      let height = nodeBottom - nodeTop;
      let nodeCenter = nodeTop + height/2;
      let inside = ( (nodeTop < this.minY && nodeBottom > this.maxY) || (nodeCenter < this.minY && nodeCenter > this.maxY) );
      nodes[i].visible = inside;
    }
  }

  isScrollBarLeft(){
    if(this.control.HasField('LEFTSCROLLBAR')){
      return this.control.GetFieldByLabel('LEFTSCROLLBAR').GetValue() == 1 ? true : false;
    }
    return false;
  }

  getNodeHeight(node = null){
    let height = 0;
    //console.log(!node)
    if(!node){

      if(this.protoItem.HasField('EXTENT')){
        let extent = this.protoItem.GetFieldByLabel('EXTENT').GetChildStructs()[0];
        height += extent.GetFieldByLabel('HEIGHT').GetValue() || 0;
      }

      if(this.protoItem.HasField('BORDER')){
        let border = this.protoItem.GetFieldByLabel('BORDER').GetChildStructs()[0];
        height += (border.GetFieldByLabel('DIMENSION').GetValue() || 0) / 2;
      }

    }else{
      let control = node;
      let cHeight = (node.extent.height + (node.getBorderSize()/2));

      if(control.text.geometry){
        //console.log('tSize')
        control.text.geometry.computeBoundingBox();
        let tSize = control.text.geometry.boundingBox.getSize(new THREE.Vector3());
        if(tSize.y > cHeight){
          cHeight = tSize.y;
        }
      }
      height += cHeight;
    }

    return height;
  }

  getContentHeight(){
    let height = 0;
    for(let i = 0; i < this.itemGroup.children.length; i++){
      let node = this.itemGroup.children[i];
      let control = node.control;

      let cHeight = (control.extent.height + (control.getBorderSize()/2));

      if(control.text.geometry){
        control.text.geometry.computeBoundingBox();
        //let tSize = new THREE.Box3();
        let tSize = control.text.geometry.boundingBox.getSize(new THREE.Vector3());
        if(tSize.y > cHeight){
          cHeight = tSize.y;
        }
      }
      height += cHeight;
    }
    return height;
  }

  scrollUp(){
    this.scroll -= 1;
    if(this.scroll <= 0)
      this.scroll = 0;

    if(this.scrollbar){
      let scrollThumbOffset = (this.scrollbar.extent.height - this.scrollbar.thumb.scale.y)
      this.scrollbar.thumb.position.y = scrollThumbOffset/2 - (scrollThumbOffset * this.scroll / this.maxScroll)
    }

    this.updateList();
  }

  scrollDown(){    
    this.scroll += 1;
    if(this.scroll >= this.maxScroll)
      this.scroll = this.maxScroll;

    if(this.scrollbar){
      let scrollThumbOffset = (this.scrollbar.extent.height - this.scrollbar.thumb.scale.y)
      this.scrollbar.thumb.position.y = scrollThumbOffset/2 - (scrollThumbOffset * this.scroll / this.maxScroll)
    }
      
    this.updateList();
  }

  getActiveControls(){

    if(!this.widget.visible)
      return [];

    let controls = [];
    for(let i = 0; i < this.children.length; i++){
      let control = this.children[i];
      //Check to see if the control is onscreen
      if(control.widget.visible){
        //check to see if the mouse is inside the control
        if(control.box.containsPoint(Game.mouseUI)){
          controls.push(control);
          controls = controls.concat( control.getActiveControls() );
        }else{
          this.menu.SetWidgetHoverActive(control, false);
        }
      }
    }

    if(this.scrollbar.box.containsPoint(Game.mouseUI)){
      controls.push(this.scrollbar);
      //controls = controls.concat( this.scrollbar.getActiveControls() );
    }

    if(this.scrollbar.upArrow.box.containsPoint(Game.mouseUI)){
      controls.push(this.scrollbar);
      //controls = controls.concat( this.scrollbar.getActiveControls() );
    }

    if(this.scrollbar.downArrow.box.containsPoint(Game.mouseUI)){
      controls.push(this.scrollbar);
      //controls = controls.concat( this.scrollbar.getActiveControls() );
    }

    controls = controls.concat( this.scrollbar.getActiveControls() );
    
    return controls;
  }

  calculateBox(){
    let worldPosition = this.parent.widget.position.clone();
    //console.log('worldPos', worldPosition);

    this.box.min.x = this.widget.position.x - this.extent.width/2 + worldPosition.x;
    this.box.min.y = this.widget.position.y - this.extent.height/2 + worldPosition.y;
    this.box.max.x = this.widget.position.x + this.extent.width/2 + worldPosition.x;
    this.box.max.y = this.widget.position.y + this.extent.height/2 + worldPosition.y;

    /*this.box = new THREE.Box2(
      new THREE.Vector2(
        this.widget.position.x - this.extent.width/2 + worldPosition.x,
        this.widget.position.y - this.extent.height/2 + worldPosition.y
      ),
      new THREE.Vector2(
        this.widget.position.x + this.extent.width/2 + worldPosition.x,
        this.widget.position.y + this.extent.height/2 + worldPosition.y
      )
    );*/

    for(let i = 0; i < this.children.length; i++){
      this.children[i].calculateBox();
    }

    if(this.scrollbar instanceof GUIScrollBar){
      this.scrollbar.calculatePosition();
    }


  }

  _onCreate(){
    super._onCreate();

    //let extent = this.getFillExtent();
    //let sprite = this.widget.fill.children[0];
    //sprite.material.color = new THREE.Color(0.0, 0.658824, 0.980392);

    //this.setProgress(this.curValue);
    
  }

}

GUIListBox.hexTextures = new Map();

GUIListBox.InitTextures = function(){
  if(GameKey != 'TSL'){
    for(let i = 0; i < 7; i++){
      let name = '';
      if(!i){
        name = 'lbl_hex';
      }else{
        name = 'lbl_hex_'+(i+1);
      }
      TextureLoader.Load(name, (texture) => {
        GUIListBox.hexTextures.set(texture.name, texture);
      });
    }
  }
}

module.exports = GUIListBox;