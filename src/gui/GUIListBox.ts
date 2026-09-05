import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import type { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "@/loaders/TextureLoader";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { GameState } from "@/GameState";
import { GameEngineType } from "@/enums/engine";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIProtoItem } from "@/gui/GUIProtoItem";
import type { GUIScrollBar } from "@/gui/GUIScrollBar";
import { getExistingListRowIndex } from "@/gui/listrow/listRowAddItem";
import { measureListRowHeight } from "@/gui/listrow/listRowMeasure";
import {
  createDefaultListRowByProtoType,
  type GUIListItemCallbacks,
} from "@/gui/listrow/defaultListRows";
import {
  createDefaultListBoxBitFlags,
  type ListBoxBitFlags,
} from "@/gui/ListBoxBitFlags";
import {
  asExtentInt,
  centeredExtentMax,
  hitCheckMouseLocal,
  hitCheckMouseWorldBox,
  listLocalFromWorldBox,
  orthoAlignedUnitPlanePositions,
  orthoFrustumInt,
  truncDiv,
} from "@/gui/GUICoord";
import { ScrollBarHit } from "@/gui/GUIScrollBar";
import {
  listBoxLeftoverStretch,
  snapshotListBoxExtent,
  type ListBoxSavedExtent,
} from "@/gui/listBoxSavedExtents";

export type { ListBoxSavedExtent };

/**
 * GUIListBox — aligned with retail list box.
 *
 * Layout uses index-based OrganizeControls / OrganizeUnequal / OrganizeOversized.
 * RTT rendering and menu APIs (setItems / setProtoBuilder) are preserved.
 */
export class GUIListBox extends GUIControl {
  listItems: any[];
  /**
   * Compat scroll position for menus that read/write `.scroll`.
   * Equal/unequal: `topVisibleIndex`. Oversized: `scrollPosition - 1`.
   */
  get scroll(): number {
    if (this.shouldScroll()) {
      return Math.max(0, this.scrollPosition - 1);
    }
    return this.topVisibleIndex;
  }
  set scroll(value: number) {
    const v = Math.max(0, Math.floor(value) || 0);
    this.bitFlags.autoScrollToSelection = false;
    if (this.shouldScroll()) {
      this.scrollPosition = v + 1;
      this.organizeOversized();
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }
    this.topVisibleIndex = v;
    this.organizeControls();
  }
  /** Compat: max scroll index (`maxValue - 1` or oversized pages - 1). */
  get maxScroll(): number {
    if (this.shouldScroll()) {
      return Math.max(0, this.getPagesToScroll() - 1);
    }
    return Math.max(0, (this.scrollbar?.maxValue ?? 1) - 1);
  }
  set maxScroll(_value: number) {
    // read-only from retail's perspective; kept for assignment safety
  }

  GUIProtoItemClass: typeof GUIProtoItem;
  onSelected: (node: any, control: GUIControl, index: number) => void;
  onClicked: (node: any, control: GUIControl, index: number) => void;
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
  selectedItem: GUIControl | undefined;

  /** Retail bit flags / organize state */
  bitFlags: ListBoxBitFlags = createDefaultListBoxBitFlags();
  selectionIndex: number = -1;
  clickedIndex: number = -1;
  hoveredRowIndex: number = -1;
  /** When true, row classes expose an explicit click-to-select contract. */
  protoClickSelects: boolean = false;
  topVisibleIndex: number = 0;
  bottomVisibleIndex: number = 0;
  itemsPerPage: number = 0;
  itemHeight: number = 0;
  /** 1-based page scroll for oversized single items (retail scroll_position). */
  scrollPosition: number = 1;
  /** Viewport height / font height when in oversized mode. */
  pageCount: number = 1;
  listColor: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  /** Explicit override; when unset, heights are compared during organize. */
  forceVariableItemHeight: boolean | undefined;

  private itemHeightCache = new Map<number, number>();
  private cacheDirty = true;
  private listRttDirty = true;
  private mutationDepth = 0;
  private pendingPublish = false;
  private publishGeneration = 0;
  /**
   * Pass AN — retail control_extents parallel to children.
   * Restored before GetHeight when layoutDirty (OrganizeControls).
   */
  private savedExtents: ListBoxSavedExtent[] = [];
  /** Scrollbar thumb drag start. */
  private scrollDragStartValue = 0;
  private scrollBarDragState: 'none' | 'bar' | 'arrow_up' | 'arrow_down' | 'page_up' | 'page_down' = 'none';

  static hexTextures: Map<string, OdysseyTexture>;
  static InitTextures: () => void;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIListBox;

    this.listItems = [];
    this.offset = new THREE.Vector2(0, 0);
    this.scene = new THREE.Scene();
    this.bitFlags = createDefaultListBoxBitFlags();

    // Retail Load — LEFTSCROLLBAR default 1
    if (control.hasField('LEFTSCROLLBAR')) {
      this.bitFlags.scrollbarOnLeft = control.getFieldByLabel('LEFTSCROLLBAR').getValue() == 1;
    } else {
      this.bitFlags.scrollbarOnLeft = true;
    }

    if (control.hasField('LOOPING')) {
      this.bitFlags.looping = control.getFieldByLabel('LOOPING').getValue() == 1;
    }

    if (control.hasField('COLOR')) {
      const c = control.getFieldByLabel('COLOR').getVector();
      if (c) {
        this.listColor.set(c.x, c.y, c.z);
      }
    }

    //ProtoItem — retail LoadProtoItem
    this.hasProtoItem = control.hasField('PROTOITEM');
    if(this.hasProtoItem){
      this.protoItem = this.menu.factory.FromStruct(control.getFieldByLabel('PROTOITEM').getChildStructs()[0], this.menu, this, this.scale);
    }

    //ScrollBar
    this.hasScrollBar = control.hasField('SCROLLBAR');
    if(this.hasScrollBar){
      this._scrollbar = control.getFieldByLabel('SCROLLBAR').getChildStructs()[0];
    }

    if(this.hasScrollBar){
      this.scrollbar = new this.menu.factory.GUIScrollBar(this.menu, this._scrollbar, this, this.scale);
      // Retail Draw: scrollbar is outside AurGUISetupViewport — parent beside border, not inside RTT
      this.scrollWrapper = new THREE.Group();
      this.scrollWrapper.add(this.scrollbar.createControl());
      this.widget.add(this.scrollWrapper);
      this.scrollbar.setList(this);
    }

    this.itemGroup = new THREE.Group();
    this.itemGroup.name = 'ListItems';
    this.itemGroup.position.set(0, 0, 0);

    // RTT covers content viewport only (border-inner / fill), matching retail AurGUISetupViewport
    this.syncRttSizeFromViewport();

    const rttFrustum = orthoFrustumInt(this.width, this.height);
    this.camera = new THREE.OrthographicCamera(
      rttFrustum.left, rttFrustum.right,
      rttFrustum.top, rttFrustum.bottom,
      1, 500
    );
    this.camera.position.z = 100;

    // Mag nearest matches LBL_3DView / LBL_MapView — Linear mag softens 1–3px row borders
    // against alpha-0 clear when the RTT is blitted to the GUI scene.
    this.texture = new THREE.WebGLRenderTarget(Math.max(1, this.width), Math.max(1, this.height), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
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
    this.targetMesh.position.z = 4;
    this.targetMesh.renderOrder = this.getRenderOrder(5);
    this.layoutRttQuad();
    this.widget.add(this.targetMesh);

    this.scene.add(this.itemGroup);
    this.syncScrollBarExtent();
  }

  /**
   * Size RTT to fill/viewport (content area after scrollbar shrink).
   * Scrollbar sits on the widget beside this quad — not inside the render target.
   */
  private syncRttSizeFromViewport(): void {
    // RTT matches list viewport (GetInnerExtent), not the border Draw fill hole.
    this.width = Math.max(1, asExtentInt(this.getViewportWidth()));
    this.height = Math.max(1, asExtentInt(this.getViewportInnerHeight()));
  }

  /** Position the RTT quad over the content area (shifted away from the scrollbar). */
  private layoutRttQuad(): void {
    if (!this.targetMesh || !this.targetGeometry) return;
    // Integer TL-centered edges matching the RTT camera (not unit plane × float ±w/2).
    const corners = orthoAlignedUnitPlanePositions(this.width, this.height);
    const pos = this.targetGeometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 4; i++) {
      pos.setXYZ(i, corners[i][0], corners[i][1], 0);
    }
    pos.needsUpdate = true;
    this.targetGeometry.computeBoundingSphere();
    this.targetMesh.scale.set(1, 1, 1);
    const shrink = asExtentInt(this.getShrinkWidth());
    // Content is centered with -truncDiv(shrink, 2) offset (see getBorderExtent); match that.
    this.targetMesh.position.x = this.isScrollBarLeft() ? truncDiv(shrink, 2) : -truncDiv(shrink, 2);
    this.targetMesh.position.y = 0;
  }

  /**
   * Retail SetScrollBarExtent — bar height matches list; X from LEFTSCROLLBAR.
   */
  syncScrollBarExtent(): void {
    if (!this.scrollbar) return;
    this.scrollbar.syncToListHeight(this.extent.height);
    this.scrollbar.calculatePosition();
    this.scrollbar.layoutThumb();
  }

  resizeControl(): void {
    super.resizeControl();
    this.syncRttSizeFromViewport();
    this.texture.setSize(Math.max(1, this.width), Math.max(1, this.height));
    this.layoutRttQuad();
    this.updateCamera();
    this.syncScrollBarExtent();
    this.invalidateHeightCache();
    this.bitFlags.layoutDirty = true;
    this.updateList();
    this.updateScrollbarVisibility();
  }

  update(delta: number = 0){
    super.update(delta);

    if(!this.isVisible())
      return;

    if (this.mutationDepth > 0) {
      return;
    }

    if (this.pendingPublish) {
      const allReady = this.children.every(c => c.isTextureReady);
      if (allReady) {
        this.pendingPublish = false;
        this._doPublish();
      }
      return;
    }

    // Retail Draw: arrow pulse + hold-repeat on the live scrollbar mesh (outside RTT)
    if (this.scrollbar && this.scrollWrapper?.visible) {
      // Scrollbar is not in children[] — must update chrome enable flags / pulse itself.
      this.scrollbar.update(delta);
      this.scrollbar.updateArrowPulse(delta);
      this.scrollbar.updateHoldRepeat(delta);
    }

    const wantsAnimated = this.children.some(c => c.wantsPulseAnimation());
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

  refreshRenderOrder(){
    super.refreshRenderOrder();
    if(this.targetMesh){
      this.targetMesh.renderOrder = this.getRenderOrder(5);
    }
    this.scrollbar?.refreshRenderOrder();
  }

  // ---------------------------------------------------------------------------
  // Mutation API
  // ---------------------------------------------------------------------------

  /**
   * Multi-item replace. Clears noSelectMode for multi-row lists unless requestNoSelect.
   */
  setItems(nodes: readonly any[], options: GUIListItemCallbacks & {
    getItemOptions?: (node: any, index: number) => GUIListItemCallbacks;
    selectIndex?: number;
    /** Keep scroll-only mode (description-style). */
    requestNoSelect?: boolean;
  } = {} as any): void {
    const { getItemOptions, selectIndex, requestNoSelect, ...sharedOpts } = options as any;
    if (requestNoSelect) {
      this.bitFlags.noSelectMode = true;
    } else if (nodes.length > 1) {
      this.bitFlags.noSelectMode = false;
    }
    this.mutate((tx) => {
      tx.clear();
      for (let i = 0; i < nodes.length; i++) {
        tx.add(nodes[i], getItemOptions ? getItemOptions(nodes[i], i) : sharedOpts);
      }
    });
    if (typeof selectIndex === 'number' && selectIndex >= 0) {
      if (this.children[selectIndex]) {
        this.select(this.children[selectIndex]);
      }
    }
  }

  /**
   * Replace the list with zero or one row. Description panes use this path
   * retail treats them as noSelectMode (scroll-only, visibleValue = 1).
   */
  setItem(node: any, options: GUIListItemCallbacks = {} as GUIListItemCallbacks): void {
    const nodes = (node != null && node !== '') ? [node] : [];
    this.setItems(nodes, { ...options, requestNoSelect: true } as any);
  }

  mutate(fn: (tx: { clear(): void; add(node: any, options?: GUIListItemCallbacks): GUIControl }) => void): void {
    this.mutationDepth++;
    if (this.mutationDepth === 1) {
      this.targetMesh.visible = false;
    }
    const tx = {
      clear: () => this._clearItems(),
      add: (node: any, opts?: GUIListItemCallbacks) => this._addItem(node, opts ?? {} as GUIListItemCallbacks),
    };
    fn(tx);
    this._commit();
  }

  appendItems(nodes: readonly any[], options: GUIListItemCallbacks & {
    getItemOptions?: (node: any, index: number) => GUIListItemCallbacks;
  } = {} as any): void {
    const { getItemOptions, ...sharedOpts } = options as any;
    this.mutate((tx) => {
      for (let i = 0; i < nodes.length; i++) {
        tx.add(nodes[i], getItemOptions ? getItemOptions(nodes[i], i) : sharedOpts);
      }
    });
  }

  appendItem(node: any, options: GUIListItemCallbacks = {} as GUIListItemCallbacks): void {
    this.appendItems([node], options);
  }

  removeItem(node: any): void {
    const index = this.listItems.indexOf(node);
    if (index >= 0) {
      this.removeItemAt(index);
    }
  }

  removeItemAt(index: number): void {
    if (index >= 0 && index < this.children.length) {
      const removed = this.children[index];
      removed.widget.parent?.remove(removed.widget);
      this.children.splice(index, 1);
      if (index < this.listItems.length) {
        this.listItems.splice(index, 1);
      }
      if (index < this.savedExtents.length) {
        this.savedExtents.splice(index, 1);
      }
      if (this.selectedItem === removed) {
        this.selectedItem = undefined;
        this.selectionIndex = -1;
        if (this.children.length > 0) {
          this.select(this.children[Math.min(index, this.children.length - 1)]);
        }
      } else if (this.selectionIndex > index) {
        this.selectionIndex--;
      }
      this.invalidateHeightCache();
      this.bitFlags.layoutDirty = true;
      this.updateList();
      this.updateScrollbarVisibility();
      this.markListRttDirty();
    }
  }

  private _commit(): void {
    this.mutationDepth = 0;
    this.publishGeneration++;
    this.pendingPublish = true;
    // Do not reset scrollbar cur here — organize/publish (and callers restoring .scroll) own it
  }

  private _doPublish(): void {
    this.bitFlags.layoutDirty = true;
    this.updateList();
    if (this.scrollbar) {
      this.scrollbar.layoutThumb();
    }
    this.updateScrollbarVisibility();
    this.listRttDirty = false;
    this.render();
    this.targetMesh.visible = true;
  }

  refreshAfterTextures(): void {
    this.markListRttDirty();
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
      this.scrollbar.layoutThumb();
    }
  }

  private _clearItems(){
    for (let i = this.itemGroup.children.length - 1; i >= 0; i--) {
      this.itemGroup.remove(this.itemGroup.children[i]);
    }
    this.listItems = [];
    this.children = [];
    this.savedExtents = [];
    this.topVisibleIndex = 0;
    this.bottomVisibleIndex = 0;
    this.scrollPosition = 1;
    this.selectionIndex = -1;
    this.selectedItem = undefined;
    this.invalidateHeightCache();
    this.bitFlags.layoutDirty = true;
    this.updateScrollbarVisibility();
  }

  removeItemByIndex(index = -1){
    this.removeItemAt(index);
  }

  getProtoItemType(){
    return this.protoItem.type;
  }

  setProtoBuilder(ctor: typeof GUIProtoItem): void {
    this.GUIProtoItemClass = ctor;
    // Custom proto rows use click-to-select (inventory/equip/container contract).
    this.protoClickSelects = true;
  }

  setVariableItemHeight(value: boolean): void {
    this.forceVariableItemHeight = value;
    this.bitFlags.variableItemHeight = value;
    this.bitFlags.layoutDirty = true;
  }

  setNoSelectMode(value: boolean): void {
    this.bitFlags.noSelectMode = value;
    this.bitFlags.layoutDirty = true;
  }

  setSelectOnLeftClick(value: boolean): void {
    this.bitFlags.selectOnLeftClick = value;
  }

  /**
   * Retail SetTopVisible — clamp topVisibleIndex into scroll range.
   */
  setTopVisible(newTopIndex: number): void {
    const maxTop = Math.max(0, this.children.length - this.itemsPerPage);
    if (newTopIndex < maxTop) {
      this.topVisibleIndex = Math.max(0, newTopIndex | 0);
    } else {
      this.topVisibleIndex = maxTop;
    }
    this.bitFlags.autoScrollToSelection = false;
    this.organizeControls();
  }

  /**
   * Whether hover should change selection (retail HandleMouseMove).
   * Retail ctor default selectOnLeftClick=false → hover-select unless protoClickSelects.
   */
  shouldHoverSelect(): boolean {
    if (this.bitFlags.noSelectMode) return false;
    if (this.bitFlags.selectOnLeftClick) return false;
    if (this.protoClickSelects) return false;
    return true;
  }

  /**
   * Hover over a row. When hover-select is enabled, updates selection.
   * Otherwise only tracks hoveredRowIndex (highlight via row mouseIn).
   */
  onRowHover(control: GUIControl | undefined): void {
    if (!control || control.disableSelection) {
      this.hoveredRowIndex = -1;
      return;
    }
    const index = this.children.indexOf(control);
    this.hoveredRowIndex = index;
    if (!this.shouldHoverSelect()) {
      return;
    }
    if (index < 0 || index === this.selectionIndex) {
      return;
    }
    this.setSelectedControl(index, false);
  }

  setLooping(value: boolean): void {
    this.bitFlags.looping = value;
  }

  private _addItem(node: any, options: GUIListItemCallbacks = {} as GUIListItemCallbacks): GUIControl {
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
      const protoRow = new this.GUIProtoItemClass(this.menu, control.control, this, this.scale);
      // Retail: menu/entry class supplies the base extent, proto supplies params only.
      protoRow.initializeRow(protoRow.getRetailBaseExtent(this), this.protoItem);
      ctrl = protoRow;
      ctrl.isProtoItem = true;
      ctrl.offset = this.offset;
      ctrl.node = node;
      ctrl.setList( this );
      idx = this.children.push(ctrl) - 1;

      ctrl.highlight.color = ctrl.defaultHighlightColor.clone();
      ctrl.border.color = ctrl.defaultColor.clone();
      
      const widget = ctrl.createControl();
      ctrl.setList(this);

      this.itemGroup.add(widget);

      // Description / noSelectMode rows must not take hover hilight chrome.
      if (this.bitFlags.noSelectMode) {
        ctrl.disableHover = true;
      }
          
      if (!ctrl.disableSelection && !this.bitFlags.noSelectMode) {
        if (this.bitFlags.selectOnLeftClick || this.protoClickSelects) {
          ctrl.addEventListener('mouseDown', (e) => {
            e.stopPropagation();
            const index = this.children.indexOf(ctrl);
            if (index >= 0 && index !== this.selectionIndex) {
              this.setSelectedControl(index, true);
            }
          });
        }
        ctrl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.select(ctrl);
          if (typeof options.onClick === 'function') {
            options.onClick(node, ctrl);
          }
        });
      }
    }

    // Retail AddControls: Add(&control_extents, value->extent)
    this.savedExtents.push(snapshotListBoxExtent(ctrl.extent));

    this.invalidateHeightCache();
    this.bitFlags.layoutDirty = true;

    return this.children[idx];
  }

  setSelectedIndex(index: number = 0){
    this.setSelectedControl(index, false);
  }

  /**
   * Retail SetSelectedControl — always AutoScroll + OrganizeControls.
   */
  setSelectedControl(controlId: number, _playSound: boolean = false): void {
    const sameIndex = controlId === this.selectionIndex && controlId >= 0;

    if (!sameIndex) {
      if (this.selectionIndex >= 0 && this.selectionIndex < this.children.length) {
        const prev = this.children[this.selectionIndex];
        if (prev.selected) {
          prev.selected = false;
          if (typeof prev.onSelect === 'function') {
            prev.onSelect.call(this);
          }
        }
      }

      if (controlId < 0 || controlId >= this.children.length) {
        this.selectionIndex = -1;
        this.selectedItem = undefined;
      } else {
        this.selectionIndex = controlId;
        const ctrl = this.children[controlId];
        ctrl.selected = true;
        this.selectedItem = ctrl;
        if (typeof ctrl.onSelect === 'function') {
          ctrl.onSelect.call(this);
        }
        if (typeof this.onSelected === 'function') {
          this.onSelected(ctrl.node, ctrl, controlId);
        }
      }
    }

    // Retail always sets AutoScroll and re-organizes (brings selection back into view)
    this.bitFlags.autoScrollToSelection = true;
    this.organizeControls();
    if (this.scrollbar) {
      this.scrollbar.setCurValue(this.topVisibleIndex);
    }
    this.markListRttDirty();
  }

  /**
   * Row click / left-up. Retail:
   * - selectOnLeftClick (or protoClickSelects): select on down/click
   * - else: selection already from hover; click only fires onClicked
   */
  select(control: GUIControl){
    try{
      if (this.bitFlags.noSelectMode) {
        return;
      }
      if (control instanceof GUIControl && control.disableSelection) {
        return;
      }
      if (!(control instanceof GUIControl)) {
        this.setSelectedControl(-1, false);
        if (typeof this.onClicked === 'function') {
          this.onClicked(undefined, undefined as any, -1);
        }
        return;
      }
      const index = this.children.indexOf(control);
      if (index < 0) return;

      this.clickedIndex = index;

      if (this.bitFlags.selectOnLeftClick || this.protoClickSelects) {
        this.setSelectedControl(index, false);
      } else if (this.selectionIndex !== index) {
        // Hover path missed (e.g. touch); still select on click
        this.setSelectedControl(index, false);
      }

      if (typeof this.onClicked === 'function') {
        this.onClicked(control.node, control, index);
      }
      this.clickedIndex = -1;
    }catch(e){
      console.error(e);
    }
  }

  clearSelection(){
    this.setSelectedControl(-1, false);
  }

  selectItem(item: any){
    let idx = this.listItems.indexOf(item);
    if(idx >= 0){
      this.setSelectedControl(idx, false);
    }
  }

  getListElementByNode(node: any): GUIControl | undefined {
    return this.children.find(c => c.node === node) as GUIControl | undefined;
  }

  getListElementByIndex(index: number): GUIControl | undefined {
    return this.children[index] as GUIControl | undefined;
  }

  removeItemByNode(node: any){
    this.removeItem(node);
  }

  rebuildItems() {
    this.setItems(this.listItems.slice());
  }

  listMarginTop = 0;
  listMarginBottom = 0;
  listItemMarginTop = 0;
  listItemMarginBottom = 0;

  getViewportInnerHeight(): number {
    // Retail SetExtent: viewport_height = border GetInnerExtent height
    // (INNEROFFSET applied — not the Draw fill hole from getFillExtent)
    return this.getInnerSize().height;
  }

  getViewportWidth(): number {
    // Retail viewport_width = GetInnerExtent width after scrollbar shrink
    return Math.max(0, this.getInnerSize().width - asExtentInt(this.getShrinkWidth()));
  }

  /** Retail shouldScroll — single item taller than viewport. */
  shouldScroll(): boolean {
    const count = this.children.length;
    if (count <= 0) return false;
    if (this.bitFlags.variableItemHeight) return false;
    const vh = this.getViewportInnerHeight();
    return vh < (this.padding + this.itemHeight);
  }

  /** Retail getPagesToScroll. */
  getPagesToScroll(): number {
    const vh = this.getViewportInnerHeight();
    if (vh === 0) return 1;
    const a = Math.floor(((this.itemHeight * this.pageCount) / vh) + 0.9999);
    const b = Math.floor(this.pageCount);
    return (a - b) + 1;
  }

  private getFontHeight(): number {
    const src = this.children[0] || this.protoItem;
    if (src?.guiFont?.height) {
      return src.guiFont.height;
    }
    return 16;
  }

  private inferVariableHeights(heights: number[]): boolean {
    if (typeof this.forceVariableItemHeight === 'boolean') {
      return this.forceVariableItemHeight;
    }
    if (heights.length <= 1) return false;
    const first = heights[0];
    for (let i = 1; i < heights.length; i++) {
      if (Math.abs(heights[i] - first) > 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Place a row using retail top-down extents converted to Three.js Y-up center coords.
   * Origin top=0 is the top of the border-inner viewport (retail AurGUISetupViewport).
   * Retail SetExtent: left = padding, width = viewport - 2*padding (center X = 0 in RTT).
   */
  private placeItem(ctrl: GUIControl, top: number, height: number, width: number): void {
    const vh = this.getViewportInnerHeight();
    const visibleTop = truncDiv(asExtentInt(vh), 2);
    const topI = asExtentInt(top);
    const heightI = asExtentInt(height);
    ctrl.setExtentLeft(asExtentInt(this.padding));
    ctrl.setExtentTop(topI);
    ctrl.setExtentHeight(heightI);
    if (width > 0) {
      ctrl.setExtentWidth(asExtentInt(width));
    }
    // Leftover stretch can change height after createControl — rebuild chrome to match.
    ctrl.resizeControl();
    // Re-center text for stretched slots; skip wrap→extent path (would re-enter organize).
    if (ctrl.hasText && !ctrl.listRowAlignExtentToWrappedText) {
      ctrl.alignText();
    }
    ctrl.widget.position.x = 0;
    ctrl.widget.position.y = asExtentInt(visibleTop - topI - truncDiv(heightI, 2));
    ctrl.updateBounds();
  }

  /**
   * Retail OrganizeControls layoutDirty: SetExtent from control_extents[i] before GetHeight.
   */
  private restoreSavedExtentsToChildren(): void {
    const n = Math.min(this.children.length, this.savedExtents.length);
    for (let i = 0; i < n; i++) {
      const ctrl = this.children[i];
      const saved = this.savedExtents[i];
      ctrl.setExtentLeft(saved.left);
      ctrl.setExtentTop(saved.top);
      // A retail base extent may carry width 0 (save rows); OrganizeControls resolves the
      // real width via SetExtent later. Skip restoring 0 so we don't reflow text and perturb GetHeight.
      if (saved.width > 0) {
        ctrl.setExtentWidth(saved.width);
      }
      ctrl.setExtentHeight(saved.height);
    }
  }

  /**
   * Retail Draw clip test — whether a row intersects (or is fully inside) the viewport.
   */
  private isRowInViewport(top: number, height: number, vh: number): boolean {
    const bottom = top + height;
    if (bottom <= 0 || top > vh) {
      return false;
    }
    if (this.bitFlags.clipPartiallyVisibleItems) {
      return bottom < vh && top >= 0;
    }
    return true;
  }

  /** Public entry used by menus and scrollbar; maps to retail OrganizeControls. */
  updateList(){
    this.organizeControls();
  }

  /**
   * Retail OrganizeControls (with Unequal / Oversized branches).
   */
  organizeControls(): void {
    const count = this.children.length;
    const vh = this.getViewportInnerHeight();
    const vw = this.getViewportWidth();

    if (count === 0) {
      if (!this.bitFlags.layoutDirty) {
        this.calculateBox();
        this.markListRttDirty();
        return;
      }
      if (this.scrollbar) {
        this.scrollbar.setMaxValue(1, false);
        this.scrollbar.setCurValue(1);
        this.scrollbar.setVisibleValue(1);
      }
      this.bitFlags.layoutDirty = false;
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }

    // Pass AN: restore control_extents before GetHeight when layoutDirty.
    if (this.bitFlags.layoutDirty) {
      this.restoreSavedExtentsToChildren();
      this.invalidateHeightCache();
    }

    const heights: number[] = [];
    for (let i = 0; i < count; i++) {
      heights.push(this.getItemHeight(this.children[i]));
    }
    this.bitFlags.variableItemHeight = this.inferVariableHeights(heights);

    if (this.bitFlags.variableItemHeight) {
      this.organizeUnequal(heights);
      this.cacheDirty = false;
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }

    if (this.bitFlags.layoutDirty) {
      this.itemHeight = 0;
      for (let i = 0; i < count; i++) {
        if (heights[i] > this.itemHeight) {
          this.itemHeight = heights[i];
        }
      }
      // Only reset scroll window when content/layout metrics change (retail layoutDirty path).
      // Intentionally does not clobber topVisibleIndex on every organize — callers that clear
      // items already reset indices in _clearItems.
      if (this.topVisibleIndex < 0) {
        this.topVisibleIndex = 0;
      }

      if (this.itemHeight === 0) {
        if (this.scrollbar) {
          this.scrollbar.setMaxValue(1, false);
          this.scrollbar.setCurValue(1);
          this.scrollbar.setVisibleValue(1);
        }
        this.bitFlags.layoutDirty = false;
        this.updateScrollbarVisibility();
        this.calculateBox();
        this.markListRttDirty();
        return;
      }

      const pitch = this.padding + this.itemHeight;
      let itemsPerPage = Math.floor(vh / pitch);
      this.itemsPerPage = itemsPerPage;

      if (itemsPerPage === 0) {
        // Oversized: drive scrollbar in page units (scroll_position / getPagesToScroll)
        if (vh < (this.padding + this.itemHeight)) {
          const fontH = this.getFontHeight();
          if (fontH !== 0) {
            this.pageCount = vh / fontH;
          }
        }
        if (this.scrollbar) {
          const pages = this.getPagesToScroll();
          this.scrollbar.setMaxValue(Math.max(1, pages), this.bitFlags.noSelectMode);
          this.scrollbar.setVisibleValue(1);
        }
      } else {
        let maxVal = (count - itemsPerPage) + 1;
        if (maxVal < 2) maxVal = 1;
        if (this.scrollbar) {
          this.scrollbar.setMaxValue(maxVal, this.bitFlags.noSelectMode);
          // Retail OrganizeControls: noSelectMode → visibleValue = 1
          let visible = 1;
          if (!this.bitFlags.noSelectMode) {
            visible = itemsPerPage;
            if (count <= itemsPerPage) {
              visible = count;
            }
          }
          this.scrollbar.setVisibleValue(visible);
        }
        const maxTop = Math.max(0, maxVal - 1);
        if (this.topVisibleIndex > maxTop) {
          this.topVisibleIndex = maxTop;
        }
      }

      if (vh < (this.padding + this.itemHeight) && count > 0) {
        const fontH = this.getFontHeight();
        if (fontH !== 0) {
          this.pageCount = vh / fontH;
        }
      }

      this.bitFlags.layoutDirty = false;
    }

    if (vh < (this.padding + this.itemHeight) && count > 0 && !this.bitFlags.variableItemHeight) {
      this.organizeOversized();
      this.cacheDirty = false;
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }

    // AutoScrollToSelection
    if (this.bitFlags.autoScrollToSelection && this.selectionIndex >= 0) {
      const sel = this.selectionIndex;
      const top = this.topVisibleIndex;
      if (sel < top) {
        this.topVisibleIndex = sel;
      } else if (sel >= top + this.itemsPerPage) {
        let next = (sel - this.itemsPerPage) + 1;
        if (next < 0) next = 0;
        this.topVisibleIndex = next;
      }
    }

    if (this.scrollbar) {
      this.scrollbar.setCurValue(this.topVisibleIndex);
    }

    const pitch = this.padding + this.itemHeight;
    const ipp = this.itemsPerPage;
    const pad = this.padding;
    const itemWidth = Math.max(0, vw - pad * 2);

    // Retail leftover stretch : distribute into visible slot heights.
    // Place at original top; remainder bumps next cursor (+1), advance by pad + baseSlotH.
    const { stretchPerItem, remainderPixels } = listBoxLeftoverStretch(vh, ipp, pitch, pad);
    let rem = remainderPixels;
    const baseSlotH = this.itemHeight + stretchPerItem;

    let cursorTop = pad - this.topVisibleIndex * pitch;
    const tops: number[] = new Array(count);
    const rowHeights: number[] = new Array(count);

    // Items above the visible window
    for (let i = 0; i < this.topVisibleIndex; i++) {
      tops[i] = cursorTop;
      rowHeights[i] = this.itemHeight;
      this.placeItem(this.children[i], cursorTop, this.itemHeight, itemWidth);
      cursorTop += pitch;
    }

    let visibleEnd = this.topVisibleIndex + ipp;
    if (visibleEnd > count) visibleEnd = count;

    for (let i = this.topVisibleIndex; i < visibleEnd; i++) {
      let slotH = baseSlotH;
      let nextTop = cursorTop;
      if (rem !== 0) {
        slotH = baseSlotH + 1;
        nextTop = cursorTop + 1;
        rem -= 1;
      }
      tops[i] = cursorTop;
      rowHeights[i] = slotH;
      this.placeItem(this.children[i], cursorTop, slotH, itemWidth);
      cursorTop = nextTop + pad + baseSlotH;
    }

    this.bottomVisibleIndex = visibleEnd - 1;

    // Items below
    for (let i = visibleEnd; i < count; i++) {
      tops[i] = cursorTop;
      rowHeights[i] = this.itemHeight;
      this.placeItem(this.children[i], cursorTop, this.itemHeight, itemWidth);
      cursorTop += pitch;
    }

    // Retail Draw viewport clip — RTT still renders; we hide meshes that fail the clip test
    for (let i = 0; i < count; i++) {
      this.children[i].widget.visible = this.isRowInViewport(tops[i], rowHeights[i], vh);
    }

    this.cacheDirty = false;
    this.updateScrollbarVisibility();
    if (this.scrollbar) {
      this.scrollbar.layoutThumb();
      this.scrollbar.syncArrowVisibility();
    }
    this.calculateBox();
    this.markListRttDirty();
  }

  /**
   * Retail OrganizeUnequal.
   */
  private organizeUnequal(heights: number[]): void {
    const count = this.children.length;
    const vh = this.getViewportInnerHeight();
    const vw = this.getViewportWidth();
    const pad = this.padding;
    const itemWidth = Math.max(0, vw - pad * 2);

    if (this.bitFlags.layoutDirty) {
      if (count === 1) {
        this.itemHeight = heights[0];
      } else {
        this.itemHeight = 0;
        for (let i = 0; i < count - 1; i++) {
          if (heights[i] > this.itemHeight) {
            this.itemHeight = heights[i];
          }
        }
      }
      // Preserve scroll window across republish when possible (inventory restore).
      if (this.topVisibleIndex < 0 || this.topVisibleIndex >= count) {
        this.topVisibleIndex = 0;
      }
      this.bottomVisibleIndex = -1;
      this.bitFlags.anchorTop = true;
      if (this.itemHeight === 0) {
        this.bitFlags.layoutDirty = false;
        return;
      }
      this.bitFlags.layoutDirty = false;
      // retail sets scrollbarVisible bit alongside
      this.bitFlags.scrollbarVisible = true;
    }

    if (this.bitFlags.autoScrollToSelection && this.selectionIndex >= 0) {
      const sel = this.selectionIndex;
      if (this.topVisibleIndex >= 0 && sel < this.topVisibleIndex) {
        this.topVisibleIndex = sel;
        this.bottomVisibleIndex = -1;
        this.bitFlags.anchorTop = true;
      } else if (this.bottomVisibleIndex >= 0 && sel > this.bottomVisibleIndex) {
        this.topVisibleIndex = -1;
        this.bottomVisibleIndex = sel;
        this.bitFlags.anchorTop = false;
      }
    }

    let anchorIndex: number;
    let cursorTop: number;
    if (this.bitFlags.anchorTop) {
      anchorIndex = Math.max(0, this.topVisibleIndex);
      cursorTop = pad;
    } else {
      anchorIndex = Math.max(0, this.bottomVisibleIndex);
      cursorTop = vh - heights[anchorIndex] - pad;
    }

    // Place anchor, then walk up, then walk down
    const tops: number[] = new Array(count);
    tops[anchorIndex] = cursorTop;
    this.placeItem(this.children[anchorIndex], cursorTop, heights[anchorIndex], itemWidth);

    let y = cursorTop;
    for (let i = anchorIndex - 1; i >= 0; i--) {
      y = y - (pad + heights[i]);
      tops[i] = y;
      this.placeItem(this.children[i], y, heights[i], itemWidth);
    }

    y = tops[anchorIndex] + heights[anchorIndex] + pad;
    for (let i = anchorIndex + 1; i < count; i++) {
      tops[i] = y;
      this.placeItem(this.children[i], y, heights[i], itemWidth);
      y = y + pad + heights[i];
    }

    if (this.bitFlags.anchorTop) {
      let bottom = -1;
      let filled = true;
      for (let i = this.topVisibleIndex + 1; i < count; i++) {
        if (tops[i] + heights[i] > vh) {
          bottom = i - 1;
          filled = false;
          break;
        }
      }
      if (this.bottomVisibleIndex === -1 || filled) {
        this.bottomVisibleIndex = count - 1;
      } else {
        this.bottomVisibleIndex = bottom;
      }
    } else {
      for (let i = this.bottomVisibleIndex - 1; i >= 0; i--) {
        if (tops[i] < 0) {
          this.topVisibleIndex = i + 1;
          break;
        }
      }
      if (this.topVisibleIndex < 0) {
        this.topVisibleIndex = 0;
      }
      this.bitFlags.anchorTop = true;
    }

    this.itemsPerPage = (this.bottomVisibleIndex - this.topVisibleIndex) + 1;
    let maxVal = (count - this.itemsPerPage) + 1;
    if (maxVal < 2) maxVal = 1;

    if (this.scrollbar) {
      this.scrollbar.setMaxValue(maxVal, this.bitFlags.noSelectMode);
      this.scrollbar.setVisibleValue((this.bottomVisibleIndex - this.topVisibleIndex) + 1);
      this.scrollbar.setCurValue(this.topVisibleIndex);
      this.scrollbar.layoutThumb();
      this.scrollbar.syncArrowVisibility();
    }

    // Visibility for retail Draw clip (shader RTT — hide meshes, do not switch to immediate mode)
    for (let i = 0; i < count; i++) {
      this.children[i].widget.visible = this.isRowInViewport(tops[i], heights[i], vh);
    }
  }

  /**
   * Retail OrganizeOversized.
   */
  private organizeOversized(): void {
    const vh = this.getViewportInnerHeight();
    const vw = this.getViewportWidth();
    const pad = this.padding;
    const itemWidth = Math.max(0, vw - pad * 2);
    const pages = Math.max(1, this.getPagesToScroll());
    if (this.scrollPosition < 1) this.scrollPosition = 1;
    if (this.scrollPosition > pages) this.scrollPosition = pages;

    let top: number;
    if (this.scrollPosition === pages) {
      top = (vh - this.itemHeight) - pad;
    } else {
      const iVar2 = this.scrollPosition - 1;
      top = pad - Math.floor((iVar2 * vh) / Math.max(this.pageCount, 0.0001));
    }

    if (this.scrollbar) {
      this.scrollbar.setMaxValue(pages, this.bitFlags.noSelectMode);
      this.scrollbar.setVisibleValue(1);
      // Map 1-based scrollPosition onto 0..max for thumb (cur 0 = top)
      this.scrollbar.setCurValue(this.scrollPosition - 1);
      this.scrollbar.layoutThumb();
      this.scrollbar.syncArrowVisibility();
    }

    const ctrl = this.children[0];
    this.placeItem(ctrl, top, this.itemHeight, itemWidth);
    ctrl.widget.visible = true;
    for (let i = 1; i < this.children.length; i++) {
      this.children[i].widget.visible = false;
    }
  }

  isScrollBarLeft(){
    return this.bitFlags.scrollbarOnLeft;
  }

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

  /** Total virtual content height — used by older callers; prefer scrollbar max/visible. */
  getContentHeight(): number {
    if (!this.children.length) return 0;
    if (!this.bitFlags.variableItemHeight && this.itemHeight > 0) {
      return this.children.length * (this.itemHeight + this.padding) + this.padding;
    }
    let height = 0;
    for (let i = 0; i < this.children.length; i++) {
      height += this.getItemHeight(this.children[i]) + this.padding;
    }
    height += this.padding;
    return height;
  }

  /** One retail scroll step for wheel/arrows (index unit). */
  getScrollStep(): number {
    return 1;
  }

  /**
   * Scroll toward earlier items (retail ScrollDownArrow / wheel up).
   */
  scrollUp(){
    this.bitFlags.autoScrollToSelection = false;
    if (this.shouldScroll()) {
      this.scrollPosition = Math.max(1, this.scrollPosition - 1);
      this.organizeOversized();
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }
    if (this.topVisibleIndex < 1) return;
    this.topVisibleIndex--;
    this.organizeControls();
  }

  /**
   * Scroll toward later items (retail ScrollUpArrow / wheel down).
   */
  scrollDown(){
    this.bitFlags.autoScrollToSelection = false;
    if (this.shouldScroll()) {
      const pages = this.getPagesToScroll();
      this.scrollPosition = Math.min(pages, this.scrollPosition + 1);
      this.organizeOversized();
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }
    const maxTop = Math.max(0, (this.scrollbar?.maxValue ?? 1) - 1);
    if (this.topVisibleIndex >= maxTop) return;
    this.topVisibleIndex++;
    this.organizeControls();
  }

  scrollPageUp(){
    this.bitFlags.autoScrollToSelection = false;
    if (this.shouldScroll()) {
      const step = Math.floor(this.pageCount) || 1;
      this.scrollPosition = Math.max(1, this.scrollPosition - step);
      this.organizeOversized();
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }
    if (this.topVisibleIndex < 1) return;
    const page = this.scrollbar?.visibleItemCount || this.itemsPerPage || 1;
    this.topVisibleIndex = Math.max(0, this.topVisibleIndex - page);
    this.organizeControls();
  }

  scrollPageDown(){
    this.bitFlags.autoScrollToSelection = false;
    if (this.shouldScroll()) {
      const step = Math.floor(this.pageCount) || 1;
      const pages = this.getPagesToScroll();
      this.scrollPosition = Math.min(pages, this.scrollPosition + step);
      this.organizeOversized();
      this.updateScrollbarVisibility();
      this.calculateBox();
      this.markListRttDirty();
      return;
    }
    const maxTop = Math.max(0, (this.scrollbar?.maxValue ?? 1) - 1);
    if (this.topVisibleIndex >= maxTop) return;
    const page = this.scrollbar?.visibleItemCount || this.itemsPerPage || 1;
    this.topVisibleIndex = Math.min(maxTop, this.topVisibleIndex + page);
    this.organizeControls();
  }

  /** Apply scrollbar thumb drag value (retail HandleMouseCapturedMovement). */
  applyScrollBarDragValue(curValue: number): void {
    this.bitFlags.autoScrollToSelection = false;
    if (this.shouldScroll()) {
      // curValue is 0-based from scrollbar; scrollPosition is 1-based
      const pages = this.getPagesToScroll();
      this.scrollPosition = Math.max(1, Math.min(pages, curValue + 1));
      this.organizeOversized();
    } else {
      const maxTop = Math.max(0, (this.scrollbar?.maxValue ?? 1) - 1);
      this.topVisibleIndex = Math.max(0, Math.min(maxTop, curValue));
      this.organizeControls();
    }
    this.updateScrollbarVisibility();
    this.calculateBox();
    this.markListRttDirty();
  }

  beginScrollBarDrag(): void {
    if (this.shouldScroll()) {
      // Retail field = scroll_position (1-based)
      this.scrollDragStartValue = this.scrollPosition;
    } else {
      this.scrollDragStartValue = this.scrollbar?.currentValue ?? this.topVisibleIndex;
    }
    this.scrollBarDragState = 'bar';
  }

  getScrollBarDragStartValue(): number {
    return this.scrollDragStartValue;
  }

  /**
   * List-control-local mouse from the world/UI box (not panelLocal − extent).
   * Keeps row picking correct when the list is viewport-docked (dialog replies).
   */
  getListLocalMouseFromBox(): { x: number; y: number } {
    const ui = this.getCenteredUIMouseInt();
    return listLocalFromWorldBox(
      ui.x,
      ui.y,
      this.box.min.x,
      this.box.min.y,
      this.box.max.y,
    );
  }

  /**
   * Viewport-docked lists (InGameDialog LB_REPLIES) write viewport coords into
   * extent.left/top for layout; panel-local AABB misses. Use world/UI box.
   */
  hitCheckMouse(_localX: number, _localY: number): boolean {
    if (!this.widget.visible) {
      return false;
    }
    const ui = this.getCenteredUIMouseInt();
    return hitCheckMouseWorldBox(
      ui.x,
      ui.y,
      this.box.min.x,
      this.box.min.y,
      this.box.max.x,
      this.box.max.y,
    );
  }

  getActiveControls(panelLocalX?: number, panelLocalY?: number){

    if(!this.widget.visible)
      return [];

    let localX = panelLocalX;
    let localY = panelLocalY;
    if (localX === undefined || localY === undefined) {
      const local = this.getPanelLocalMouse();
      localX = local.x;
      localY = local.y;
    }

    let controls: GUIControl[] = [];
    const vh = asExtentInt(this.getViewportInnerHeight());
    let hoveredRow: GUIControl | undefined;

    const listLocal = this.getListLocalMouseFromBox();
    const borderSize = asExtentInt(this.getBorderSize());
    const shrink = asExtentInt(this.getShrinkWidth());
    const viewportX = this.isScrollBarLeft() ? borderSize + shrink : borderSize;
    const viewportY = borderSize;
    // Retail HitCheckMouseLocal — viewport-local mouse for rows
    const vx = listLocal.x - viewportX;
    const vy = listLocal.y - viewportY;

    // Retail HitCheckMouseLocal — scrollbar is tested before rows and wins if hit.
    if(this.scrollbar && this.scrollWrapper?.visible){
      const sb = this.scrollbar;
      const sbHit = sb.hitCheckScrollbar(localX, localY);
      if(sbHit !== ScrollBarHit.MISS){
        for(let i = 0; i < this.children.length; i++){
          this.children[i].clearHoverTree();
        }
        this.onRowHover(undefined);
        controls.push(sb);
        return controls.concat(sb.getActiveControls(localX, localY));
      }
    }

    // Forward walk, first row hit only (retail HitCheckMouseLocal).
    for(let i = 0; i < this.children.length; i++){
      let control = this.children[i];
      if(!control.widget.visible){
        control.clearHoverTree();
        continue;
      }

      const rowH = asExtentInt(control.extent?.height || 0);
      const itemTop = asExtentInt(control.extent?.top || 0);
      if (!this.isRowInViewport(itemTop, rowH, vh)) {
        control.clearHoverTree();
        continue;
      }

      if(hitCheckMouseLocal(control.extent, vx, vy)){
        if (!hoveredRow) {
          hoveredRow = control;
          controls.push(control);
          controls = controls.concat( control.getActiveControls(localX, localY) );
        }else{
          control.clearHoverTree();
        }
      }else{
        control.clearHoverTree();
      }
    }

    // Retail HandleMouseMove — hover-select when !selectOnLeftClick
    this.onRowHover(hoveredRow);

    return controls;
  }

  calculateBox(){
    let worldPosition = this.parent.widget.position.clone();
    const w = asExtentInt(this.extent.width);
    const h = asExtentInt(this.extent.height);
    const wx = asExtentInt(this.widget.position.x);
    const wy = asExtentInt(this.widget.position.y);
    const px = asExtentInt(worldPosition.x);
    const py = asExtentInt(worldPosition.y);

    this.box.min.x = wx - truncDiv(w, 2) + px;
    this.box.min.y = wy - truncDiv(h, 2) + py;
    this.box.max.x = wx + centeredExtentMax(w) + px;
    this.box.max.y = wy + centeredExtentMax(h) + py;

    for(let i = 0; i < this.children.length; i++){
      this.children[i].calculateBox();
    }

    if(this.scrollbar){
      this.scrollbar.calculatePosition();
    }
  }

  _onCreate(){
    super._onCreate();
  }

  /**
   * Retail HandleInputEvent up/down — move selection; scroll via AutoScroll.
   */
  directionalNavigate(direction = ''){
    const maxItems = this.children.length;
    if(maxItems <= 0){
      return;
    }

    if (this.bitFlags.noSelectMode) {
      if (direction === 'up') this.scrollUp();
      else if (direction === 'down') this.scrollDown();
      return;
    }

    let index = this.selectionIndex;
    if (index < 0) {
      this.setSelectedControl(0, false);
      return;
    }

    switch(direction){
      case 'up':
        if (this.shouldScroll()) {
          this.scrollUp();
          return;
        }
        if (index < 1) {
          if (this.bitFlags.looping) {
            this.setSelectedControl(maxItems - 1, true);
          }
          return;
        }
        this.setSelectedControl(index - 1, true);
        return;
      case 'down':
        if (this.shouldScroll()) {
          this.scrollDown();
          return;
        }
        if (index >= maxItems - 1) {
          if (this.bitFlags.looping) {
            this.setSelectedControl(0, true);
          }
          return;
        }
        this.setSelectedControl(index + 1, true);
        return;
    }
    super.directionalNavigate(direction);
  }

  private getItemHeight(node: GUIControl): number {
    const nodeIndex = this.children.indexOf(node);
    
    if (!this.cacheDirty && this.itemHeightCache.has(nodeIndex)) {
      return this.itemHeightCache.get(nodeIndex) ?? 0;
    }
    
    const height = measureListRowHeight(this, node);
    
    this.itemHeightCache.set(nodeIndex, height);
    return height;
  }

  private invalidateHeightCache() {
    this.cacheDirty = true;
    this.itemHeightCache.clear();
  }

  relayoutAfterRowHeightChange(){
    this.invalidateHeightCache();
    this.bitFlags.layoutDirty = true;
    this.updateList();
    if(this.scrollbar){
      this.scrollbar.layoutThumb();
    }
  }

  private updateScrollbarVisibility(){
    if(!this.scrollbar || !this.hasScrollBar || !this.scrollWrapper) return;

    const needsScrolling = this.shouldScroll()
      ? this.getPagesToScroll() > 1
      : (this.scrollbar.maxValue > 1);

    this.bitFlags.scrollbarVisible = needsScrolling;
    this.scrollWrapper.visible = needsScrolling && this.bitFlags.scrollbarVisible;

    if(this.scrollbar.widget) {
      this.scrollbar.widget.visible = this.scrollWrapper.visible;
    }
  }

  public refreshScrollbarVisibility(){
    this.updateScrollbarVisibility();
  }

  private updateCamera() {
    const frustum = orthoFrustumInt(this.width, this.height);
    this.camera.left = frustum.left;
    this.camera.right = frustum.right;
    this.camera.top = frustum.top;
    this.camera.bottom = frustum.bottom;
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
