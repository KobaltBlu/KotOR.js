import type { GameMenu } from "./GameMenu";
import { GUIControl } from "./GUIControl";
import type { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "../loaders/TextureLoader";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { GameState } from "../GameState";
import { GameEngineType } from "../enums/engine";
import { Mouse } from "../controls/Mouse";
import { GUIControlType } from "../enums/gui/GUIControlType";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import type { GUIProtoItem } from "./GUIProtoItem";
import type { GUIScrollBar } from "./GUIScrollBar";
import { GUIControlEvent } from "./GUIControlEvent";

interface GUIListItemCallbacks {
  onClick?: (e: GUIControlEvent, ...args: any) => void;
  onValueChanged?: (e: GUIControlEvent, ...args: any) => void;
  onHover?: (e: GUIControlEvent, ...args: any) => void;
}

/**
 * GUIListBox class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIListBox.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIListBox extends GUIControl {
  listItems: any[];
  lastHeight: number;
  scroll: number;
  maxScroll: number;
  GUIProtoItemClass: typeof GUIProtoItem;
  onSelected: Function;
  hasProtoItem: boolean;
  protoItem: GUIControl;
  hasScrollBar: boolean;
  _scrollbar: GFFStruct;
  itemGroup: THREE.Group;
  scene: THREE.Scene;
  scrollbar: GUIScrollBar;
  scrollWrapper: THREE.Group;
  width: number;
  height: number;
  camera: THREE.OrthographicCamera;
  texture: THREE.WebGLRenderTarget;
  clearColor: THREE.Color;
  targetMaterial: THREE.MeshBasicMaterial;
  targetGeometry: THREE.PlaneGeometry;
  targetMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  selectedItem: GUIControl;
  minY: number;
  maxY: number;
  static hexTextures: Map<string, OdysseyTexture>;
  static InitTextures: () => void;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIListBox;

    this.listItems = [];
    this.lastHeight = 0;
    this.scroll = 0;
    this.maxScroll = 0;
    this.offset = new THREE.Vector2(0, 0);
    this.scene = new THREE.Scene();

    //ProtoItem
    this.hasProtoItem = control.hasField('PROTOITEM');
    if(this.hasProtoItem){
      //console.log(control.getFieldByLabel('PROTOITEM'))
      this.protoItem = this.menu.factory.FromStruct(control.getFieldByLabel('PROTOITEM').getChildStructs()[0], this.menu, this, this.scale);
    }

    //ScrollBar
    this.hasScrollBar = control.hasField('SCROLLBAR');
    if(this.hasScrollBar){
      //console.log(control.getFieldByLabel('SCROLLBAR'))
      this._scrollbar = control.getFieldByLabel('SCROLLBAR').getChildStructs()[0];
    }

    if(this.hasScrollBar){
      this.scrollbar = new this.menu.factory.GUIScrollBar(this.menu, this._scrollbar, this, this.scale);
      this.scrollbar.setList( this );
      //this.widget.add(this.scrollbar.createControl());
      this.scrollWrapper = new THREE.Group();
      this.scrollWrapper.add(this.scrollbar.createControl())
      this.scene.add(this.scrollWrapper);
    }

    this.itemGroup = new THREE.Group();
    this.itemGroup.name = 'ListItems';
    this.itemGroup.position.set(0, 0, 0);
    //this.widget.add(this.itemGroup);

    if(!this.isScrollBarLeft()){
      this.itemGroup.position.x -= this.getShrinkWidth()/2;
    }

    let extent = this.getOuterSize();
    this.width = extent.width;
    this.height = extent.height;

    this.camera = new THREE.OrthographicCamera(
      this.width / -2, this.width / 2,
      this.height / 2, this.height / -2,
      1, 500
    );
    this.camera.position.z = 100;

    this.texture = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
		//this.tDepth = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat } );
    this.clearColor = new THREE.Color(0x000000);

    this.targetMaterial = new THREE.MeshBasicMaterial()
    this.targetMaterial.blending = THREE.CustomBlending;

    this.targetMaterial.blendEquation = THREE.AddEquation;
    this.targetMaterial.blendSrc = THREE.OneFactor;
    this.targetMaterial.blendDst = THREE.OneMinusSrcColorFactor;
    //this.targetMaterial.blendSrcAlpha = THREE.OneFactor;
    //this.targetMaterial.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;

    this.targetGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.targetMesh = new THREE.Mesh(this.targetGeometry, this.targetMaterial);
    this.targetMaterial.map = this.texture.texture;
    this.targetMesh.position.x = 0;
    this.targetMesh.position.y = 0;
    this.targetMesh.position.z = 4;
    this.targetMesh.renderOrder = 5;
    this.targetMesh.scale.set(this.width, this.height, 1);
    this.widget.add(this.targetMesh);

    this.scene.add(this.itemGroup);

  }

  resizeControl(): void {
    super.resizeControl();
    this.width = this.extent.width;
    this.height = this.extent.height;
    // this.targetGeometry.dispose();
    // this.targetGeometry = new THREE.PlaneGeometry(this.width, this.height, 1, 1);
    // this.targetMesh.geometry = this.targetGeometry;
    this.texture.setSize(this.width, this.height);
    this.targetMesh.scale.set(this.width, this.height, 1);
    this.camera.left = this.width / -2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = this.height / -2;
    this.camera.updateProjectionMatrix();
    this.updateList();
    this.scrollbar.update();
  }

  update(delta: number = 0){
    super.update(delta);

    if(!this.isVisible())
      return;

    this.render();
  }

  render(){
    let oldClearColor = new THREE.Color()
    this.menu.context.renderer.getClearColor(oldClearColor);
    this.menu.context.renderer.setClearColor(this.clearColor, 1);
    this.menu.context.renderer.setRenderTarget(this.texture);
    this.menu.context.renderer.clear(true);
    this.menu.context.renderer.render(this.scene, this.camera);
    (this.texture as any).needsUpdate = true;
    this.menu.context.renderer.setRenderTarget(null);
    this.targetMaterial.transparent = true;
    this.targetMaterial.needsUpdate = true;
    this.menu.context.renderer.setClearColor(oldClearColor, 1);
  }

  calculatePosition(){
    super.calculatePosition();
    this.lastHeight = 0;
    for(let i = 0; i < this.children.length; i++){
      this.children[i].calculatePosition();
    }

    if(this.scrollbar){
      this.scrollbar.calculatePosition();
      this.scrollbar.update();
    }

  }

  clearItems(){
    this.lastHeight = 0;
    for (let i = this.itemGroup.children.length - 1; i >= 0; i--) {
      this.itemGroup.remove(this.itemGroup.children[i]);
    }
    this.listItems = [];
    this.children = [];
    this.render();
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
    return this.protoItem.type;
  }

  addItem(node: any, options: GUIListItemCallbacks = {} as GUIListItemCallbacks): GUIControl {
    let control = this.protoItem;
    let type = control.type;
    
    let ctrl: GUIControl;
    let widget: THREE.Object3D;

    let idx = this.listItems.indexOf(node);
    if(idx == -1 || typeof node === 'string'){
      this.listItems.push(node);
    }else{
      return this.children[idx];
    }

    if(typeof this.GUIProtoItemClass === 'undefined'){
      switch(type){
        case GUIControlType.Label:
        case GUIControlType.ProtoItem:
          ctrl = new this.menu.factory.GUIProtoItem(this.menu, control.control, this, this.scale);
          ctrl.text.texture = this.protoItem.text.texture;
          ctrl.text.material.uniforms.map.value = this.protoItem.text.material.uniforms.map.value;
          ctrl.isProtoItem = false;
          ctrl.offset = this.offset;
          ctrl.node = node;
          ctrl.setList( this );
          idx = this.children.push(ctrl) - 1;

          widget = ctrl.createControl();
          ctrl.setText(node);
          ctrl.buildText();

          this.itemGroup.add(widget);
          
          if(typeof options.onClick === 'function'){
            ctrl.addEventListener('click', (e) => {
              e.stopPropagation();
              
              options.onClick(node, ctrl);
            });
          }
        break;
        case GUIControlType.CheckBox:
          ctrl = new this.menu.factory.GUICheckBox(this.menu, control.control, this, this.scale);
          ctrl.text.texture = this.protoItem.text.texture;
          ctrl.text.material.uniforms.map.value = this.protoItem.text.material.uniforms.map.value;
          ctrl.isProtoItem = false;
          ctrl.offset = this.offset;
          ctrl.node = node;
          ctrl.setList( this );
          idx = this.children.push(ctrl) - 1;

          widget = ctrl.createControl();
          ctrl.setText(node);
          this.itemGroup.add(widget);
          
          if(typeof options.onClick === 'function'){
            ctrl.addEventListener('click', (e) => {
              e.stopPropagation();

              options.onClick(node, ctrl);
            });
          }
          
          if(typeof options.onValueChanged === 'function'){
            ctrl.addEventListener('valueChanged', (e) => {
              e.stopPropagation();
              
              options.onValueChanged(node, ctrl);
            });
          }
        break;
        case GUIControlType.Button:
          try{
            ctrl = new this.menu.factory.GUIButton(this.menu, control.control, this, this.scale);
            ctrl.isProtoItem = false;
            ctrl.offset = this.offset;
            ctrl.node = node;
            ctrl.setList( this );
            idx = this.children.push(ctrl) - 1;

            ctrl.highlight.color = new THREE.Color(0.83203125, 1, 0.83203125);
            ctrl.border.color = new THREE.Color(0, 0.658823549747467, 0.9803921580314636);

            widget = ctrl.createControl();
            ctrl.setText(node.getName());

            this.itemGroup.add(widget);
          
            if(typeof options.onClick === 'function'){
              ctrl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.select(ctrl);

                options.onClick(node, ctrl);
              });
            }
          }catch(e){
            console.log(e);
          }
        break;
        default:
          console.error('GUIListBox.add', 'Unknown ControlType', type);
        break;
      }
    }else{
      ctrl = new this.GUIProtoItemClass(this.menu, control.control, this, this.scale);
      ctrl.isProtoItem = true;
      ctrl.offset = this.offset;
      ctrl.node = node;
      ctrl.setList( this );
      idx = this.children.push(ctrl) - 1;

      ctrl.highlight.color = ctrl.defaultHighlightColor.clone();
      ctrl.border.color = ctrl.defaultColor.clone();
      
      widget = ctrl.createControl();

      this.itemGroup.add(widget);
          
      if(typeof options.onClick === 'function' && !ctrl.disableSelection){
        ctrl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.select(ctrl);

          options.onClick(node, ctrl);
        });
      }
    }

    if(ctrl){
      ctrl.addEventListener('click', (e) => {
        this.select(ctrl);
      });
    }

    this.updateList();
    this.scrollbar.update();

    return this.children[idx];
  }

  setSelectedIndex(index: number = 0){
    if(index >= 0 && index < this.children.length){
      let lastSelectedIndex = 0;
      for(let i = 0, len = this.children.length; i < len; i++){
        if(this.children[i].selected == true) lastSelectedIndex = i;
        this.children[i].selected = false;
      }

      this.children[index].selected = true;
      if(index != lastSelectedIndex && typeof this.children[index].onSelect === 'function'){
        this.children[index].onSelect.call(this);
      }
    }
  }

  select(control: GUIControl){
    try{
      let len = this.children.length;
      let bWasSelected = false;
      let bWasItemSelected = false;

      //deselect all 
      for(let i = 0; i < len; i++){
        bWasSelected = this.children[i].selected;
        if(this.children[i] == control){
          bWasItemSelected = this.children[i].selected;
          continue; 
        }

        this.children[i].selected = false;
        if(bWasSelected && typeof this.children[i].onSelect === 'function'){
          this.children[i].onSelect.call(this);
        }
      }

      if(control instanceof GUIControl && this.selectedItem != control){
        control.selected = true;
        this.selectedItem = control;
        if(!bWasItemSelected && typeof control.onSelect === 'function'){
          control.onSelect.call(this);
          // item.processEventListener('select');
        }
        if(!bWasItemSelected && typeof this.onSelected === 'function')
          this.onSelected(control.node, control);
      }
    }catch(e){
      console.error(e);
    }
  }

  clearSelection(){
    this.select(undefined);
  }

  selectItem(item: any){
    let idx = this.listItems.indexOf(item);
    if(idx >= 0){
      this.select(this.children[idx]);
      this.setSelectedIndex(idx);
    }
  }

  updateList(){
    
    this.maxScroll = 0;
    let maxContentHeight = this.getContentHeight();

    if(!this.children.length)
      return;

    for(let i = 0; i < this.children.length; i++){
      let node = this.children[i];
      let height = node.extent.height + this.padding;
      if(height * (i+1) >= this.extent.height)
        this.maxScroll++;
    }

    if(this.scroll > this.maxScroll){
      this.scroll = this.maxScroll;
    }

    if (this.children.length) {
      const topY = this.extent.height / 2;
      if (this.getProtoItemType() == GUIControlType.Button || this.getProtoItemType() == GUIControlType.ProtoItem) {
        const scrollPercent = Math.max(0, this.scroll/this.maxScroll);
        const startOffsetY = (-this.extent.height/2) + this.border.inneroffsety;

        let nodeOffset = startOffsetY - (this.scroll * (this.children[0].extent.height + this.padding))  //((maxContentHeight - (this.extent.height - this.border.inneroffsety)) * -scrollPercent) + this.padding;

        if(this.children.length){
          const height = (this.children[0] as GUIProtoItem).getItemHeight();
          nodeOffset += height/2;
        }

        for (let i = 0; i < this.children.length; i++) {
          const node = this.children[i];
          const height = (node as GUIProtoItem).getItemHeight();
          node.widget.position.y = -nodeOffset;
          nodeOffset += height + this.padding;
          node.updateBounds();
        }

      } else {
        let nodeOffset = (-this.scroll * (this.getNodeHeight())) + (-topY + this.getNodeHeight()/2);
        for (let i = 0; i < this.children.length; i++) {
          const node = this.children[i];
          const height = this.getNodeHeight(node);
          node.widget.position.y = -nodeOffset;
          nodeOffset += height;
          node.updateBounds();
        }
      }
    }
    
    if(this.scrollbar){
      //this.scrollbar.updateScrollThumb();
    }

    // if(!this.maxScroll){
    //   this.scrollbar.hide();
    // }else{
    //   this.scrollbar.show();
    // }

    this.calculateBox();
    this.cullOffscreen();

  }

  cullOffscreen(){
    return;
    let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3())
    this.minY = parentPos.y + this.extent.height/2;
    this.maxY = parentPos.y - this.extent.height/2;

    let nodePadding = 0;//(this.getNodeHeight()/2);

    let nodes = this.itemGroup.children;
    for(let i = 0; i < nodes.length; i++){
      let control = nodes[i].userData.control;
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
    if(this.control.hasField('LEFTSCROLLBAR')){
      return this.control.getFieldByLabel('LEFTSCROLLBAR').getValue() == 1;
    }
    return false;
  }

  getNodeHeight(node?: GUIControl): number {
    let height = 0;
    //console.log(!node)
    if(!node){

      if(this.protoItem.control.hasField('EXTENT')){
        let extent = this.protoItem.control.getFieldByLabel('EXTENT').getChildStructs()[0];
        height += extent.getFieldByLabel('HEIGHT').getValue() || 0;
      }

      if(this.protoItem.control.hasField('BORDER')){
        let border = this.protoItem.control.getFieldByLabel('BORDER').getChildStructs()[0];
        height += (border.getFieldByLabel('DIMENSION').getValue() || 0) / 2;
      }

    }else{
      let control = node;
      let cHeight = (node.extent.height + (node.getBorderSize()/2));

      if(control.text.geometry){
        //console.log('tSize')
        control.text.geometry.computeBoundingBox();
        let tSize = new THREE.Vector3();
        control.text.geometry.boundingBox.getSize(tSize);
        if(tSize.y > cHeight){
          cHeight = tSize.y;
        }
      }
      height += cHeight;
      return node.extent.height + this.padding;
    }

    return height;
  }

  getContentHeight(){
    let height = this.border.inneroffsety * 2;//this.padding * 2;
    for(let i = 0; i < this.children.length; i++){
      let control = this.children[i];
      // let node = this.listItems[i];

      // let cHeight = (control.extent.height + (control.getBorderSize()/2));

      // if(control.text.geometry){
      //   control.text.geometry.computeBoundingBox();
      //   //let tSize = new THREE.Box3();
      //   let tSize = control.text.geometry.boundingBox.getSize(new THREE.Vector3());
      //   if(tSize.y > cHeight){
      //     cHeight = tSize.y;
      //   }
      // }
      height += control.extent.height + this.padding;
    }
    return height;
  }

  scrollUp(){
    this.scroll -= 1;
    if(this.scroll <= 0)
      this.scroll = 0;

    if(this.scrollbar){
      let scrollThumbOffset = (this.scrollbar.extent.height - this.scrollbar.thumb.scale.y);
      this.scrollbar.thumb.position.y = scrollThumbOffset/2 - (scrollThumbOffset * this.scroll / this.maxScroll);
      
      let scrollBarHeight = this.scrollbar.extent.height;
      if(this.scrollbar.thumb.position.y < -((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 ){
        this.scrollbar.thumb.position.y = -((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 || 0
      }

      if(this.scrollbar.thumb.position.y > ((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 ){
        this.scrollbar.thumb.position.y = ((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 || 0
      }

      if(isNaN(this.scrollbar.thumb.position.y)){
        this.scrollbar.thumb.position.y = 0;
      }
    }

    this.updateList();
  }

  scrollDown(){    
    this.scroll += 1;
    if(this.scroll >= this.maxScroll)
      this.scroll = this.maxScroll;

    if(this.scrollbar){
      let scrollThumbOffset = (this.scrollbar.extent.height - this.scrollbar.thumb.scale.y);
      this.scrollbar.thumb.position.y = scrollThumbOffset/2 - (scrollThumbOffset * this.scroll / this.maxScroll);
      
      let scrollBarHeight = this.scrollbar.extent.height;
      if(this.scrollbar.thumb.position.y < -((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 ){
        this.scrollbar.thumb.position.y = -((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 || 0
      }

      if(this.scrollbar.thumb.position.y > ((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 ){
        this.scrollbar.thumb.position.y = ((scrollBarHeight - this.scrollbar.thumb.scale.y))/2 || 0
      }

      if(isNaN(this.scrollbar.thumb.position.y)){
        this.scrollbar.thumb.position.y = 0;
      }
    }
      
    this.updateList();
  }

  getActiveControls(){

    if(!this.widget.visible)
      return [];

    let controls: GUIControl[] = [];
    for(let i = 0; i < this.children.length; i++){
      let control = this.children[i];
      //Check to see if the control is onscreen
      if(control.widget.visible){
        //check to see if the mouse is inside the control
        if(control.box.containsPoint(Mouse.positionUI)){
          controls.push(control);
          controls = controls.concat( control.getActiveControls() );
        }else{
          this.menu.setWidgetHoverActive(control, false);
        }
      }else{
        this.menu.setWidgetHoverActive(control, false);
      }
    }

    if(this.scrollbar.box.containsPoint(Mouse.positionUI)){
      controls.push(this.scrollbar);
      //controls = controls.concat( this.scrollbar.getActiveControls() );
    }

    if(this.scrollbar.upArrow.userData.box.containsPoint(Mouse.positionUI)){
      controls.push(this.scrollbar);
      //controls = controls.concat( this.scrollbar.getActiveControls() );
    }

    if(this.scrollbar.downArrow.userData.box.containsPoint(Mouse.positionUI)){
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

    if(this.scrollbar){
      this.scrollbar.calculatePosition();
    }


  }

  _onCreate(){
    super._onCreate();

    //let extent = this.getFillExtent();
    //let sprite = this.getFill();
    //sprite.material.color = new THREE.Color(0.0, 0.658824, 0.980392);

    //this.setProgress(this.curValue);
    
  }

  directionalNavigate(direction = ''){
    let maxItems = this.children.length;
    let index = this.children.indexOf(this.selectedItem);
    switch(direction){
      case 'up':
        index--;
        if(index < 0){
          index = 0;
        }
        this.select(this.children[index]);
        this.scrollUp();
      return;
      case 'down':
        index++;
        if(index >= maxItems){
          index = maxItems-1;
        }
        this.select(this.children[index]);
        this.scrollDown();
      return;
    }
    super.directionalNavigate(direction);
  }

}

GUIListBox.hexTextures = new Map();

GUIListBox.InitTextures = function(){
  if(GameState.GameKey != GameEngineType.TSL){
    for(let i = 0; i < 7; i++){
      let name = '';
      if(!i){
        name = 'lbl_hex';
      }else{
        name = 'lbl_hex_'+(i+1);
      }
      TextureLoader.Load(name).then((texture: OdysseyTexture) => {
        GUIListBox.hexTextures.set(texture?.name, texture);
      });
    }
  }else{
    TextureLoader.Load('uibit_eqp_itm1').then((texture: OdysseyTexture) => {
      GUIListBox.hexTextures.set(texture?.name, texture);
    });
    TextureLoader.Load('uibit_eqp_itm2').then((texture: OdysseyTexture) => {
      GUIListBox.hexTextures.set(texture?.name, texture);
    });
    TextureLoader.Load('uibit_eqp_itm3').then((texture: OdysseyTexture) => {
      GUIListBox.hexTextures.set(texture?.name, texture);
    });
  }
}
