import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import type { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "@/loaders/TextureLoader";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { GameState } from "@/GameState";
import { GameEngineType } from "@/enums/engine";
import { Mouse } from "@/controls/Mouse";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIProtoItem } from "@/gui/GUIProtoItem";
import type { GUIScrollBar } from "@/gui/GUIScrollBar";
import { GUIControlEvent } from "@/gui/GUIControlEvent";
import { getExistingListRowIndex } from "@/gui/listrow/listRowAddItem";
import { measureListRowHeight } from "@/gui/listrow/listRowMeasure";
import {
  createDefaultListRowByProtoType,
  type GUIListItemCallbacks,
} from "@/gui/listrow/defaultListRows";
import { applyCustomProtoRowSkin } from "@/gui/listrow/applyProtoTemplateSkin";

/**
 * GUIListBox class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIListBox.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * 
 * Features:
 * - Automatic scrollbar visibility based on content height
 * - Scrollbar is hidden when all items fit within the listbox height
 * - Scrollbar is shown when content exceeds the visible area
 */
export class GUIListBox extends GUIControl {
  listItems: any[];
  /** Vertical scroll offset in pixels (content scrolled up). */
  scroll: number;
  /** Maximum scroll offset in pixels (total content height minus viewport). */
  maxScroll: number;
  GUIProtoItemClass: typeof GUIProtoItem;
  onSelected: (node: any, control: GUIControl, index: number) => void;
  onActivated?: (node: any, control: GUIControl, index: number) => void;
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
  
  // Height caching for performance
  private itemHeightCache = new Map<number, number>();
  private cacheDirty = true;
  /** When false and no row animation, RTT can skip a frame (see {@link markListRttDirty}). */
  private listRttDirty = true;

  static hexTextures: Map<string, OdysseyTexture>;
  static InitTextures: () => void;

  private lastClickTime = 0;
  private lastClickItem: GUIControl;
  private doubleClickThreshold = 350;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIListBox;

    this.listItems = [];
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
      // scrollWrapper must exist before setList: setList → update → updateList → updateScrollbarVisibility uses scrollWrapper.
      this.scrollWrapper = new THREE.Group();
      this.scrollWrapper.add(this.scrollbar.createControl());
      this.scene.add(this.scrollWrapper);
      this.scrollbar.setList(this);
    }

    this.itemGroup = new THREE.Group();
    this.itemGroup.name = 'ListItems';
    this.itemGroup.position.set(0, 0, 0);

    const shrinkWidth = this.scrollbar ? this.scrollbar.extent.width/2 : 0;
    this.itemGroup.position.x += this.isScrollBarLeft() ? shrinkWidth : (shrinkWidth) * -1;

    let extent = this.getOuterSize();
    this.width = extent.width;
    this.height = extent.height;

    this.camera = new THREE.OrthographicCamera(
      this.width / -2, this.width / 2,
      this.height / 2, this.height / -2,
      1, 500
    );
    this.camera.position.z = 100;

    this.texture = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    this.clearColor = new THREE.Color(0x000000);

    this.targetMaterial = new THREE.MeshBasicMaterial();
    this.targetMaterial.blending = THREE.NormalBlending;
    this.targetMaterial.transparent = true;
    this.targetMaterial.depthWrite = false;
    this.targetMaterial.depthTest = true;

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
    this.texture.setSize(this.width, this.height);
    this.targetMesh.scale.set(this.width, this.height, 1);
    this.updateCamera();
    this.invalidateHeightCache();
    this.updateList();
    if(this.scrollbar) {
      this.scrollbar.update();
    }
    // Update scrollbar visibility after resize
    this.updateScrollbarVisibility();
  }

  update(delta: number = 0){
    super.update(delta);

    if(!this.isVisible())
      return;

    const wantsAnimated = this.children.some(c =>
      c.pulsing || (c.hover && c.isClickable()),
    );
    if (!wantsAnimated && !this.listRttDirty) {
      return;
    }
    if (!wantsAnimated) {
      this.listRttDirty = false;
    }
    this.render();
  }

  markListRttDirty(): void {
    this.listRttDirty = true;
  }

  render(){
    const oldClearColor = new THREE.Color();
    this.menu.context.renderer.getClearColor(oldClearColor);
    const oldClearAlpha =
      typeof (this.menu.context.renderer as any).getClearAlpha === 'function'
        ? (this.menu.context.renderer as any).getClearAlpha()
        : 1;
    this.menu.context.renderer.setClearColor(this.clearColor, 0);
    this.menu.context.renderer.setRenderTarget(this.texture);
    this.menu.context.renderer.clear(true, true, true);
    this.menu.context.renderer.render(this.scene, this.camera);
    (this.texture as any).needsUpdate = true;
    this.menu.context.renderer.setRenderTarget(null);
    this.targetMaterial.needsUpdate = true;
    this.menu.context.renderer.setClearColor(oldClearColor, oldClearAlpha);
  }

  calculatePosition(){
    super.calculatePosition();
    for(let i = 0; i < this.children.length; i++){
      this.children[i].calculatePosition();
    }

    if(this.scrollbar){
      this.scrollbar.calculatePosition();
      this.scrollbar.update();
    }

  }

  clearItems(){
    for (let i = this.itemGroup.children.length - 1; i >= 0; i--) {
      this.itemGroup.remove(this.itemGroup.children[i]);
    }
    this.listItems = [];
    this.children = [];
    this.scroll = 0;
    this.maxScroll = 0;
    this.invalidateHeightCache();
    this.updateScrollbarVisibility();
    this.render();
  }

  removeItemByIndex(index = -1){
    if(index >= 0 && index < this.children.length){
      const removed = this.children[index];
      removed.widget.parent.remove(removed.widget);
      this.children.splice(index, 1);
      if(index < this.listItems.length){
        this.listItems.splice(index, 1);
      }

      if(this.selectedItem === removed){
        this.selectedItem = undefined;
        if(this.children.length > 0){
          const newIndex = Math.min(index, this.children.length - 1);
          this.select(this.children[newIndex]);
        }
      }

      this.invalidateHeightCache();
      this.updateList();
      this.updateScrollbarVisibility();
    }
  }

  getProtoItemType(){
    return this.protoItem.type;
  }

  /** Registers the custom list row presenter (same as assigning {@link GUIProtoItemClass}). */
  setProtoBuilder(ctor: typeof GUIProtoItem): void {
    this.GUIProtoItemClass = ctor;
  }

  addItem(node: any, options: GUIListItemCallbacks = {} as GUIListItemCallbacks): GUIControl {
    const control = this.protoItem;
    const type = control.type;

    let ctrl: GUIControl;
    let idx: number;

    const existingIdx = getExistingListRowIndex(this.listItems, node);
    if (existingIdx !== -1) {
      return this.children[existingIdx];
    }
    this.listItems.push(node);

    if(typeof this.GUIProtoItemClass === 'undefined'){
      const created = createDefaultListRowByProtoType(
        this,
        this.protoItem,
        type,
        node,
        this.scale,
        options,
      );
      if(!created){
        this.listItems.pop();
        return undefined as any;
      }
      ctrl = created;
      idx = this.children.push(ctrl) - 1;
    }else{
      ctrl = new this.GUIProtoItemClass(this.menu, control.control, this, this.scale);
      applyCustomProtoRowSkin(ctrl, this.protoItem);
      ctrl.isProtoItem = true;
      ctrl.offset = this.offset;
      ctrl.node = node;
      ctrl.setList( this );
      idx = this.children.push(ctrl) - 1;

      ctrl.highlight.color = ctrl.defaultHighlightColor.clone();
      ctrl.border.color = ctrl.defaultColor.clone();
      
      const widget = ctrl.createControl();

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
        this.handleItemClick(ctrl);
      });
    }

    this.invalidateHeightCache();
    this.updateList();
    if(this.scrollbar) {
      this.scrollbar.update();
    }
    // Update scrollbar visibility after adding item
    this.updateScrollbarVisibility();

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
      const len = this.children.length;
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
          this.onSelected(control.node, control, this.children.indexOf(control));
      }
        
      if(control instanceof GUIControl && typeof this.onClicked === 'function')
        this.onClicked(control.node, control, this.children.indexOf(control));

      this.markListRttDirty();
    }catch(e){
      console.error(e);
    }
  }

  activateSelected(){
    if(this.selectedItem && typeof this.onActivated === 'function'){
      this.onActivated(this.selectedItem.node, this.selectedItem, this.children.indexOf(this.selectedItem));
    }
  }

  private handleItemClick(control: GUIControl){
    this.select(control);
    const now = performance.now();
    const isDoubleClick =
      this.lastClickItem === control &&
      (now - this.lastClickTime) <= this.doubleClickThreshold;
    this.lastClickTime = now;
    this.lastClickItem = control;
    if(isDoubleClick && typeof this.onActivated === 'function'){
      this.onActivated(control.node, control, this.children.indexOf(control));
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

  getListElementByNode(node: any): GUIControl | undefined {
    return this.children.find(c => c.node === node) as GUIControl | undefined;
  }

  getListElementByIndex(index: number): GUIControl | undefined {
    return this.children[index] as GUIControl | undefined;
  }

  removeItemByNode(node: any){
    const index = this.listItems.indexOf(node);
    if(index >= 0){
      this.removeItemByIndex(index);
    }
  }

  rebuildItems() {
    const items = this.listItems.slice();
    this.clearItems();
    for(let i = 0; i < items.length; i++){
      this.addItem(items[i]);
    }
  }

  listMarginTop = 0;
  listMarginBottom = 0;
  listItemMarginTop = 0;
  listItemMarginBottom = 0;

  /** Height of the inner list area between border vertical insets (matches scrollable viewport). */
  getViewportInnerHeight(): number {
    const visibleTop = this.extent.height / 2;// - this.border.inneroffsety;
    const visibleBottom = -this.extent.height / 2;// + this.border.inneroffsety;
    return visibleTop - visibleBottom;
  }

  updateList(){
    if(!this.children.length){
      this.maxScroll = 0;
      this.scroll = 0;
      this.updateScrollbarVisibility();
      this.updateScrollbarThumb();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }

    const visibleTop = this.extent.height / 2;// - this.border.inneroffsety;
    const visibleBottom = -this.extent.height / 2;// + this.border.inneroffsety;
    const visibleHeight = visibleTop - visibleBottom;

    const heights: number[] = [];
    for (let i = 0; i < this.children.length; i++) {
      heights.push(this.getItemHeight(this.children[i]));
    }

    const prefix: number[] = [0];
    for (let i = 0; i < heights.length; i++) {
      prefix.push(prefix[i] + heights[i] + this.padding);
    }

    const totalContentHeight = prefix[heights.length] + this.padding;
    this.maxScroll = Math.max(0, totalContentHeight - visibleHeight);

    this.scroll = Math.max(0, Math.min(this.scroll, this.maxScroll));

    const topBase = visibleTop - this.padding;

    for (let i = 0; i < this.children.length; i++) {
      const height = heights[i];
      const itemY = topBase - prefix[i] - height / 2 + this.scroll;
      this.children[i].widget.position.y = itemY;
      this.children[i].updateBounds();
    }

    this.cacheDirty = false;

    this.updateScrollbarVisibility();
    this.updateScrollbarThumb();
    this.calculateBox();
    this.markListRttDirty();
  }

  isScrollBarLeft(){
    if(this.control.hasField('LEFTSCROLLBAR')){
      return this.control.getFieldByLabel('LEFTSCROLLBAR').getValue() == 1;
    }
    return false;
  }

  /** Returns the raw drawn height of the row widget — no padding included. Padding is applied by the caller as part of slot pitch. */
  getNodeHeight(node?: GUIControl): number {
    if (!node) {
      console.warn('GUIListBox.getNodeHeight', 'No proto item found', `${this.menu.gui_resref}.gui`, this.name);
      return 0;
    }

    let cHeight = node.extent.height;

    if (node.text.geometry) {
      node.text.geometry.computeBoundingBox();
      const tSize = new THREE.Vector3();
      node.text.geometry.boundingBox.getSize(tSize);
      if (tSize.y > cHeight) {
        cHeight = tSize.y;
      }
    }

    return cHeight;
  }

  /** Total virtual content height matching the scroll range used in {@link updateList}. Used by the scrollbar for thumb sizing. */
  getContentHeight(): number {
    if (!this.children.length) return 0;
    let height = 0;
    for (let i = 0; i < this.children.length; i++) {
      height += this.getItemHeight(this.children[i]) + this.padding;
    }
    height += this.padding; // trailing padding after last row
    return height;
  }

  /** Pixels per arrow/wheel step; scrollbar thumb uses the same quanta when dragging. */
  getScrollStep(): number {
    if(!this.children.length){
      return 24;
    }
    return Math.max(8, this.getItemHeight(this.children[0]) + this.padding);
  }

  scrollUp(){
    const step = this.getScrollStep();
    this.scroll -= step;
    if(this.scroll <= 0){
      this.scroll = 0;
    }

    this.updateList();
  }

  scrollDown(){
    const step = this.getScrollStep();
    this.scroll += step;
    if(this.scroll > this.maxScroll){
      this.scroll = this.maxScroll;
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

    if(this.scrollbar){
      if(this.scrollbar.box.containsPoint(Mouse.positionUI)){
        controls.push(this.scrollbar);
      }

      if(this.scrollbar.upArrow?.userData?.box?.containsPoint(Mouse.positionUI)){
        controls.push(this.scrollbar);
      }

      if(this.scrollbar.downArrow?.userData?.box?.containsPoint(Mouse.positionUI)){
        controls.push(this.scrollbar);
      }

      controls = controls.concat(this.scrollbar.getActiveControls());
    }

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
    const maxItems = this.children.length;
    if(maxItems <= 0){
      return;
    }
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

  // Unified height calculation method
  private getItemHeight(node: GUIControl): number {
    const nodeIndex = this.children.indexOf(node);
    
    if (!this.cacheDirty && this.itemHeightCache.has(nodeIndex)) {
      return this.itemHeightCache.get(nodeIndex);
    }
    
    let height = 0;
    
    height = measureListRowHeight(this, node);
    
    this.itemHeightCache.set(nodeIndex, height);
    return height;
  }

  // Invalidate height cache when items change
  private invalidateHeightCache() {
    this.cacheDirty = true;
    this.itemHeightCache.clear();
  }

  /** Row text wrapped / extent changed — height cache must clear or rows stay overlapped. */
  relayoutAfterRowHeightChange(){
    this.invalidateHeightCache();
    this.updateList();
    if(this.scrollbar){
      this.scrollbar.update();
    }
  }

  // Update scrollbar visibility based on content height
  private updateScrollbarVisibility(){
    if(!this.scrollbar || !this.hasScrollBar || !this.scrollWrapper) return;
    
    // Calculate if scrolling is needed
    // maxScroll > 0 means there are more items than can fit in the visible area
    const needsScrolling = this.maxScroll > 0;
    
    // Show/hide scrollbar based on whether scrolling is needed
    this.scrollWrapper.visible = needsScrolling;
    
    // Also update the scrollbar's internal visibility state if it has one
    if(this.scrollbar.widget) {
      this.scrollbar.widget.visible = needsScrolling;
    }
  }

  // Public method to manually update scrollbar visibility
  public refreshScrollbarVisibility(){
    this.updateScrollbarVisibility();
  }

  // Update scrollbar thumb position
  private updateScrollbarThumb(){
    if(!this.scrollbar) return;
    if(this.maxScroll <= 0){
      this.scrollbar.scrollPos = 0;
      return;
    }

    const scrollPercent = this.scroll / this.maxScroll;
    this.scrollbar.scrollPos = scrollPercent;

    const scrollThumbOffset = (this.scrollbar.extent.height - this.scrollbar.thumb.scale.y);
    const maxThumbY = scrollThumbOffset / 2;
    const minThumbY = -maxThumbY;
    
    this.scrollbar.thumb.position.y = maxThumbY - (scrollThumbOffset * scrollPercent);
    
    // Clamp to bounds
    this.scrollbar.thumb.position.y = Math.max(minThumbY, Math.min(maxThumbY, this.scrollbar.thumb.position.y));
    
    // Handle NaN
    if(isNaN(this.scrollbar.thumb.position.y)){
      this.scrollbar.thumb.position.y = 0;
    }
  }

  // Update camera to match coordinate system
  private updateCamera() {
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.updateProjectionMatrix();
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

