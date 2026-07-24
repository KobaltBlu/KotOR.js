import type { GFFStruct } from "@/resource/GFFStruct";

import * as THREE from "three";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { TextureType } from "@/enums/loaders/TextureType";
import { Mouse } from "@/controls/Mouse";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControl } from "@/gui/GUIControl";
import type { GUIListBox } from "@/gui/GUIListBox";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { asExtentInt, hitCheckMouseLocal, truncDiv } from "@/gui/GUICoord";
import type { IGUIControlExtent } from "@/interface/gui/IGUIControlExtent";

/** Retail CSWGuiScrollBarHitCheckResult */
export enum ScrollBarHit {
  MISS = 0,
  DOWN_ARROW = 1,
  UP_ARROW = 2,
  BAR = 3,
  BEFORE_BAR = 4,
  AFTER_BAR = 5,
}

/**
 * GUIScrollBar — aligned with retail CSWGuiScrollBar index-unit API
 * (setMaxValue / setCurValue / setVisibleValue @ 00418070+).
 */
export class GUIScrollBar extends GUIControl{
  _dir: GFFStruct | undefined;
  arrowTex: THREE.Texture;
  upArrowGeometry: THREE.PlaneGeometry;
  upArrowMaterial: THREE.MeshBasicMaterial;
  /** @deprecated prefer currentValue / maxValue — kept as 0..1 thumb fraction */
  scrollPos: number;
  scrollMax: number;
  mouseOffset: { x: number; y: number; };
  upArrow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  downArrowGeometry: THREE.PlaneGeometry;
  downArrowMaterial: THREE.MeshBasicMaterial;
  downArrow: THREE.Mesh<any, any>;
  _thumb: GFFStruct;
  geometry: THREE.PlaneGeometry;
  thumbMaterial: THREE.MeshBasicMaterial;
  thumb: THREE.Mesh<any, any>;
  inner_box: any;

  arrowSize: number = 16;

  /** Retail max_value */
  maxValue: number = 1;
  /** Retail current_value */
  currentValue: number = 0;
  /** Retail visible_item_count */
  visibleItemCount: number = 1;
  noSelectMode: boolean = false;
  /** Retail DRAWMODE bit (ScrollBar::Load) — when set, CanScroll gates arrow draw. */
  drawMode: boolean = false;
  /** Full control height including arrows (list-matched); extent.height is the track. */
  private listMatchedHeight: number = 0;

  private dragStartMouseY = 0;
  private dragging = false;

  /** Retail hold-repeat while mouse captured on arrow/page (Draw @ 0041a3e0). */
  private holdHit: ScrollBarHit = ScrollBarHit.MISS;
  private holdRepeatTimer = 0.5;
  private readonly HOLD_REPEAT_INTERVAL = 0.1;

  /** Shared arrow alpha pulse (retail UpdateArrowPulsing @ 00418300). */
  private static arrowPulseTime = 0.75;
  private static arrowPulseUp = true;
  private static arrowAlpha = 1.0;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIScrollBar;
    this.setControlType(GUIControlType.ScrollBar);

    this.scrollPos = 0;
    this.scrollMax = 1;
    this.mouseOffset = {x: 0, y: 0};
    this.arrowSize = this.extent.width;

    this.setExtentHeight(asExtentInt(this.extent.height) - (asExtentInt(this.arrowSize) + asExtentInt(this.border.dimension)) * 2);

    this.arrowTex = undefined;

    // Retail ScrollBar::Load @ 0041bcd0 — optional GFF seed values (list organize overrides later)
    if (this.control.hasField('MAXVALUE')) {
      this.setMaxValue(this.control.getFieldByLabel('MAXVALUE').getValue() | 0, false);
    }
    if (this.control.hasField('CURVALUE')) {
      this.setCurValue(this.control.getFieldByLabel('CURVALUE').getValue() | 0);
    }
    if (this.control.hasField('VISIBLEVALUE')) {
      this.setVisibleValue(this.control.getFieldByLabel('VISIBLEVALUE').getValue() | 0);
    }
    if (this.control.hasField('DRAWMODE')) {
      this.drawMode = (this.control.getFieldByLabel('DRAWMODE').getValue() | 0) === 1;
    }

    if(this.control.hasField('DIR')){
      this._dir = this.control.getFieldByLabel('DIR')?.getChildStructs()[0];
      if(this._dir?.hasField('IMAGE')){
        TextureLoader.tpcLoader.fetch(this._dir.getFieldByLabel('IMAGE')?.getValue()).then((texture: OdysseyTexture) => {
          this.arrowTex = texture;
          
          //Up Arrow
          this.upArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.upArrowMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), map: this.arrowTex, side: THREE.DoubleSide} );
          this.upArrow = new THREE.Mesh( this.upArrowGeometry, this.upArrowMaterial );

          this.widget.add(this.upArrow);
          this.upArrow.name = 'SCROLLBAR up arrow';
          this.upArrow.scale.x = this.arrowSize;
          this.upArrow.scale.y = this.arrowSize;
          this.upArrow.position.z = 5;

          this.upArrow.position.y = truncDiv(asExtentInt(this.extent.height), 2) + truncDiv(asExtentInt(this.arrowSize), 2);
          this.upArrow.userData.worldPosition = new THREE.Vector3();

          this.upArrowMaterial.transparent = true;
          this.upArrowMaterial.needsUpdate = true;

          this.upArrow.userData.updateBox = () => {
            this.upArrow.getWorldPosition(this.upArrow.userData.worldPosition);
            const half = truncDiv(asExtentInt(this.extent.width), 2);
            this.upArrow.userData.box = new THREE.Box2(
              new THREE.Vector2(-half, -half),
              new THREE.Vector2(half, half)
            );
            this.upArrow.userData.box.translate(this.upArrow.userData.worldPosition);
          };
          this.upArrow.userData.updateBox();

          //Down Arrow
          this.downArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.downArrowMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), map: this.arrowTex, side: THREE.DoubleSide} );
          this.downArrow = new THREE.Mesh( this.downArrowGeometry, this.downArrowMaterial );

          this.widget.add(this.downArrow);
          this.downArrow.name = 'SCROLLBAR down arrow';
          this.downArrow.scale.x = this.arrowSize;
          this.downArrow.scale.y = this.arrowSize;
          this.downArrow.position.z = 5;
          this.downArrow.position.y = -(truncDiv(asExtentInt(this.extent.height), 2) + truncDiv(asExtentInt(this.arrowSize), 2));
          this.downArrow.rotation.z = Math.PI;
          this.downArrow.userData.worldPosition = new THREE.Vector3();

          this.downArrowMaterial.transparent = true;
          this.downArrowMaterial.needsUpdate = true;

          this.downArrow.userData.updateBox = () => {
            this.downArrow.getWorldPosition(this.downArrow.userData.worldPosition);
            const half = truncDiv(asExtentInt(this.extent.width), 2);
            this.downArrow.userData.box = new THREE.Box2(
              new THREE.Vector2(-half, -half),
              new THREE.Vector2(half, half)
            );
            this.downArrow.userData.box.translate(this.downArrow.userData.worldPosition)
          };
          this.downArrow.userData.updateBox();
          // Arrow input is owned by mouseDown / hold-repeat (avoid double scroll via onClick)
        });
      }
    }

    if(this.control.hasField('THUMB')){
      this._thumb = this.control.getFieldByLabel('THUMB').getChildStructs()[0];

      this.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      this.thumbMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
      this.thumb = new THREE.Mesh( this.geometry, this.thumbMaterial );

      this.widget.add(this.thumb);
      this.thumb.name = 'SCROLLBAR thumb';
      this.thumb.scale.x = Math.max(1, asExtentInt(this.extent.width));
      this.thumb.scale.y = Math.max(1, asExtentInt(this.extent.height));
      this.thumb.position.z = 5;

      let parentPos = this.worldPosition;
      const halfW = truncDiv(asExtentInt(this.extent.width), 2);
      const halfH = truncDiv(asExtentInt(this.extent.height), 2);

      this.thumb.userData.box = new THREE.Box2(
        new THREE.Vector2(
          asExtentInt(parentPos.x) - halfW,
          asExtentInt(parentPos.y) - halfH
        ),
        new THREE.Vector2(
          asExtentInt(parentPos.x) + halfW,
          asExtentInt(parentPos.y) + halfH
        )
      )

      this.thumb.userData.onClick = (e: any) => {
        this.processEventListener('click', [e]);
      };

      this.thumb.userData.onMouseMove = (e: any) =>{
        this.processEventListener('mouseMove', [e]);
      }

      this.thumb.userData.onMouseDown = (e: any) => {
        this.processEventListener('mouseDown', [e]);
      };

      this.thumb.userData.onMouseUp = (e: any) => {
        this.processEventListener('mouseUp', [e]);
      };
      
      this.thumb.userData.onHover = (e: any) => {
        this.processEventListener('hover', [e]);
      };

      this.thumb.userData.getControl = (_e: any) => {
        return this;
      };

      if(this._thumb.hasField('IMAGE')){
        TextureLoader.enQueue(this._thumb.getFieldByLabel('IMAGE').getValue(), this.thumbMaterial, TextureType.TEXTURE);
        TextureLoader.LoadQueue();
      }
    }

    this.addEventListener('mouseMove', () => {
      if (this.dragging && Mouse.leftDown) {
        this.mouseInside();
      }
    });

    // Click is a no-op for scroll actions — mouseDown owns fire + hold-repeat (avoids double-step)
    this.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.addEventListener('mouseDown', (e) => {
      e.stopPropagation();
      this.upArrow?.userData?.updateBox?.();
      this.downArrow?.userData?.updateBox?.();

      const local = this.getPanelLocalMouse();
      const hit = this.hitCheckScrollbar(local.x, local.y);
      if (hit === ScrollBarHit.BAR) {
        this.dragging = true;
        this.dragStartMouseY = Mouse.positionViewportInt.y;
        this.list?.beginScrollBarDrag();
        this.endHoldRepeat();
      } else if (
        hit === ScrollBarHit.UP_ARROW ||
        hit === ScrollBarHit.DOWN_ARROW ||
        hit === ScrollBarHit.BEFORE_BAR ||
        hit === ScrollBarHit.AFTER_BAR
      ) {
        this.fireHitAction(hit);
        this.beginHoldRepeat(hit);
      }
    });

    this.addEventListener('mouseUp', () => {
      this.dragging = false;
      this.endHoldRepeat();
    });

  }

  /**
   * Retail SetScrollBarExtent — match full list height; keep track = full − 2×arrows.
   */
  syncToListHeight(listHeight: number): void {
    this.listMatchedHeight = Math.max(1, asExtentInt(listHeight));
    const arrowPad = (asExtentInt(this.arrowSize) + asExtentInt(this.border?.dimension || 0)) * 2;
    this.setExtentHeight(Math.max(1, this.listMatchedHeight - arrowPad));

    if (this.upArrow) {
      this.upArrow.position.y = truncDiv(asExtentInt(this.extent.height), 2) + truncDiv(asExtentInt(this.arrowSize), 2);
      this.upArrow.userData.updateBox?.();
    }
    if (this.downArrow) {
      this.downArrow.position.y = -(truncDiv(asExtentInt(this.extent.height), 2) + truncDiv(asExtentInt(this.arrowSize), 2));
      this.downArrow.userData.updateBox?.();
    }
  }

  /** Full hit height including up/down arrows. */
  getFullHitHeight(): number {
    if (this.listMatchedHeight > 0) return this.listMatchedHeight;
    return this.extent.height + this.arrowSize * 2;
  }

  /**
   * Retail setMaxValue @ 00418070.
   */
  setMaxValue(maxValue: number, noSelectMode: boolean = false): void {
    if (maxValue < 0) return;
    if (this.maxValue !== maxValue) {
      this.maxValue = maxValue;
      this.noSelectMode = noSelectMode;
      this.scrollMax = maxValue;
      this.layoutThumb();
    } else {
      this.noSelectMode = noSelectMode;
    }
  }

  /**
   * Retail setCurValue @ 004180a0.
   */
  setCurValue(curValue: number): void {
    if (curValue < 0) {
      curValue = 0;
    } else if (curValue > this.maxValue) {
      curValue = this.maxValue;
    }
    this.currentValue = curValue;
    const denom = Math.max(1, this.maxValue - 1);
    this.scrollPos = this.maxValue <= 1 ? 0 : curValue / denom;
    this.layoutThumb();
  }

  /**
   * Retail setVisibleValue @ 004180d0.
   */
  setVisibleValue(visibleValue: number): void {
    if (visibleValue < 0 || (visibleValue === 0 && this.maxValue !== 0)) {
      this.visibleItemCount = 1;
    } else {
      this.visibleItemCount = visibleValue;
    }
    this.layoutThumb();
  }

  /** Position/size thumb from max/cur/visible (retail SetExtent @ 004193f0). */
  layoutThumb(): void {
    if (!this.thumb) return;

    const track = asExtentInt(this.extent.height);
    // Retail: thumb = visible / (visible + max) * track when max > 1
    let scaleY: number;
    if (this.maxValue > 1) {
      scaleY = this.visibleItemCount / (this.visibleItemCount + this.maxValue);
    } else {
      scaleY = 1;
    }
    scaleY = Math.min(1, Math.max(0.01, scaleY));
    this.thumb.scale.y = asExtentInt(track * scaleY) || 1;
    this.thumb.scale.x = Math.max(1, asExtentInt(this.extent.width));

    const travel = Math.max(0, track - asExtentInt(this.thumb.scale.y));
    const denom = Math.max(1, this.maxValue - 1);
    const t = this.maxValue <= 1 ? 0 : this.currentValue / denom;
    this.thumb.position.y = asExtentInt(truncDiv(travel, 2) - t * travel);

    if (isNaN(this.thumb.position.y)) {
      this.thumb.position.y = 0;
    }

    this.syncArrowVisibility();
  }

  /** Retail CanScrollUp @ 00418010. */
  canScrollUp(): boolean {
    if (this.maxValue <= this.visibleItemCount) return false;
    return this.currentValue >= 1;
  }

  /** Retail CanScrollDown @ 00418030. */
  canScrollDown(): boolean {
    let limit = this.maxValue;
    // bit 2 = noSelectMode on scrollbar
    if (!this.noSelectMode && this.visibleItemCount < 2 && this.currentValue !== this.maxValue) {
      limit = this.maxValue + 1;
    }
    return this.visibleItemCount < this.maxValue
      && (this.currentValue + this.visibleItemCount) < limit;
  }

  /** Show/hide DIR arrows (retail ScrollBar::Draw DRAWMODE / CanScroll). */
  syncArrowVisibility(): void {
    if (this.drawMode) {
      if (this.upArrow) this.upArrow.visible = this.canScrollUp();
      if (this.downArrow) this.downArrow.visible = this.canScrollDown();
    } else {
      if (this.upArrow) this.upArrow.visible = true;
      if (this.downArrow) this.downArrow.visible = true;
    }
  }

  /**
   * Retail UpdateArrowPulsing — write alpha into arrow MeshBasicMaterial.
   * Keeps modern Three.js materials; does not use legacy GL immediate mode.
   */
  updateArrowPulse(delta: number): void {
    if (!this.list?.bitFlags?.animateScrollArrows) return;

    GUIScrollBar.arrowPulseTime -= delta;
    if (GUIScrollBar.arrowPulseTime <= 0) {
      GUIScrollBar.arrowPulseUp = !GUIScrollBar.arrowPulseUp;
      GUIScrollBar.arrowPulseTime = 0.75;
    }
    const from = GUIScrollBar.arrowPulseUp ? 1.0 : 0.2;
    const to = GUIScrollBar.arrowPulseUp ? 0.2 : 1.0;
    GUIScrollBar.arrowAlpha =
      (from - to) * (0.75 - GUIScrollBar.arrowPulseTime) * (1.3333334) + to;

    const a = GUIScrollBar.arrowAlpha;
    if (this.upArrowMaterial) {
      this.upArrowMaterial.opacity = a;
      this.upArrowMaterial.transparent = true;
      this.upArrowMaterial.needsUpdate = true;
    }
    if (this.downArrowMaterial) {
      this.downArrowMaterial.opacity = a;
      this.downArrowMaterial.transparent = true;
      this.downArrowMaterial.needsUpdate = true;
    }
  }

  /** Begin hold-repeat for arrow/page (retail mouse capture path). */
  beginHoldRepeat(hit: ScrollBarHit): void {
    this.holdHit = hit;
    this.holdRepeatTimer = 0.5;
  }

  endHoldRepeat(): void {
    this.holdHit = ScrollBarHit.MISS;
    this.holdRepeatTimer = 0.5;
  }

  /**
   * Retail Draw hold-repeat: while LMB held and hit region unchanged, fire scroll every 0.1s.
   */
  updateHoldRepeat(delta: number): void {
    if (this.holdHit === ScrollBarHit.MISS || !Mouse.leftDown || !this.list) {
      if (!Mouse.leftDown) {
        this.endHoldRepeat();
        this.dragging = false;
      }
      return;
    }

    const local = this.getPanelLocalMouse();
    const current = this.hitCheckScrollbar(local.x, local.y);
    if (current !== this.holdHit) {
      this.endHoldRepeat();
      return;
    }

    this.holdRepeatTimer -= delta;
    while (this.holdRepeatTimer < 0) {
      this.holdRepeatTimer += this.HOLD_REPEAT_INTERVAL;
      this.fireHitAction(this.holdHit);
    }
  }

  private fireHitAction(hit: ScrollBarHit): void {
    switch (hit) {
      case ScrollBarHit.UP_ARROW:
        this.list?.scrollUp();
        break;
      case ScrollBarHit.DOWN_ARROW:
        this.list?.scrollDown();
        break;
      case ScrollBarHit.BEFORE_BAR:
        this.list?.scrollPageUp();
        break;
      case ScrollBarHit.AFTER_BAR:
        this.list?.scrollPageDown();
        break;
      default:
        break;
    }
  }
  
  scrollUp() {
    this.list?.scrollUp();
  }
  scrollDown() {
    this.list?.scrollDown();
  }

  /**
   * Panel-space extent of the full scrollbar (track + arrows), matching ListBox placement.
   */
  getPanelExtent(): IGUIControlExtent {
    const w = asExtentInt(this.extent.width);
    const fullH = asExtentInt(this.getFullHitHeight());
    if (!this.list) {
      return {
        left: asExtentInt(this.extent.left),
        top: asExtentInt(this.extent.top),
        width: w,
        height: fullH,
      };
    }
    const listLeft = asExtentInt(this.list.extent.left);
    const listTop = asExtentInt(this.list.extent.top);
    const listW = asExtentInt(this.list.extent.width);
    const left = this.list.isScrollBarLeft() ? listLeft : listLeft + listW - w;
    return { left, top: listTop, width: w, height: fullH };
  }

  /**
   * Retail HitCheckScrollbar @ 004197c0 — int panel-local mouse vs arrow/thumb/track.
   * Our mesh places scroll-up at visual top (panel Y-down top) and scroll-down at bottom.
   */
  hitCheckScrollbar(panelLocalX?: number, panelLocalY?: number): ScrollBarHit {
    if (!this.list) return ScrollBarHit.MISS;

    let x = panelLocalX;
    let y = panelLocalY;
    if (x === undefined || y === undefined) {
      const local = this.getPanelLocalMouse();
      x = local.x;
      y = local.y;
    }
    x = asExtentInt(x);
    y = asExtentInt(y);

    const bar = this.getPanelExtent();
    if (!hitCheckMouseLocal(bar, x, y)) {
      return ScrollBarHit.MISS;
    }

    const arrow = asExtentInt(this.arrowSize);
    const trackH = asExtentInt(this.extent.height);
    const localX = x - bar.left;
    const localY = y - bar.top;

    // Up arrow = visual top (scroll up)
    if (hitCheckMouseLocal({ left: 0, top: 0, width: bar.width, height: arrow }, localX, localY)) {
      return ScrollBarHit.UP_ARROW;
    }
    // Down arrow = visual bottom (scroll down)
    if (hitCheckMouseLocal(
      { left: 0, top: bar.height - arrow, width: bar.width, height: arrow },
      localX,
      localY,
    )) {
      return ScrollBarHit.DOWN_ARROW;
    }

    const trackTop = arrow;
    const thumbH = this.thumb ? Math.max(1, asExtentInt(this.thumb.scale.y)) : 0;
    const thumbYThree = this.thumb ? asExtentInt(this.thumb.position.y) : 0;
    // Three.js Y-up thumb center → track-local Y-down top
    const thumbCenterFromTrackTop = truncDiv(trackH, 2) - thumbYThree;
    const thumbTop = trackTop + thumbCenterFromTrackTop - truncDiv(thumbH, 2);

    if (this.thumb && hitCheckMouseLocal(
      { left: 0, top: thumbTop, width: bar.width, height: thumbH },
      localX,
      localY,
    )) {
      return ScrollBarHit.BAR;
    }

    // Track page regions (before = above thumb = page up; after = below = page down)
    if (localY > trackTop && localY < trackTop + trackH && localX >= 0 && localX <= bar.width) {
      if (localY < thumbTop) {
        return ScrollBarHit.BEFORE_BAR;
      }
      if (localY > thumbTop + thumbH) {
        return ScrollBarHit.AFTER_BAR;
      }
    }

    return ScrollBarHit.MISS;
  }

  mouseInside(){
    if (!this.list || !this.thumb || !this.dragging) return;

    const travel = Math.max(1, asExtentInt(this.extent.height) - asExtentInt(this.thumb.scale.y));
    const start = this.list.getScrollBarDragStartValue();
    const deltaY = asExtentInt(this.dragStartMouseY) - Mouse.positionViewportInt.y;
    const maxIdx = this.list.shouldScroll()
      ? Math.max(0, this.list.getPagesToScroll() - 1)
      : Math.max(0, this.maxValue - 1);

    const delta = Math.round((deltaY / travel) * maxIdx);
    const next = Math.max(0, Math.min(maxIdx, start + delta));
    this.list.applyScrollBarDragValue(next);
  }

  setList(list: GUIListBox){
    this.list = list;
    this.calculatePosition();
    this.layoutThumb();
  }

  /** @deprecated use layoutThumb — kept for callers */
  update(){
    this.layoutThumb();
  }

  calculatePosition(){
    if(this.list){
      if(this.list.isScrollBarLeft()){
        this.anchorOffset.set(
          -(truncDiv(asExtentInt(this.list.extent.width), 2) - truncDiv(asExtentInt(this.extent.width), 2)),
          0,
        );
      }else{
        this.anchorOffset.set(
          truncDiv(asExtentInt(this.list.extent.width), 2) - truncDiv(asExtentInt(this.extent.width), 2),
          0,
        );
      }      
    }else{
      this.anchorOffset.set(0, 0);
    }

    this.widget.position.x = asExtentInt(this.anchorOffset.x);
    this.widget.position.y = asExtentInt(this.anchorOffset.y);

    let worldPosition = new THREE.Vector3();
    try{
      worldPosition = this.parent.widget.position.clone();
    }catch(e){
      console.error(e);
    }
    this.updateWorldPosition();
    const parentPos = this.worldPosition;
    const fullH = asExtentInt(this.getFullHitHeight());
    const halfW = truncDiv(asExtentInt(this.extent.width), 2);
    const halfFullH = truncDiv(fullH, 2);
    const halfTrackH = truncDiv(asExtentInt(this.extent.height), 2);
    const ax = asExtentInt(this.anchorOffset.x);
    const ay = asExtentInt(this.anchorOffset.y);
    const wx = asExtentInt(worldPosition.x);
    const wy = asExtentInt(worldPosition.y);

    this.box = new THREE.Box2(
      new THREE.Vector2(ax - halfW + wx, ay - halfFullH + wy),
      new THREE.Vector2(ax + halfW + wx, ay + halfFullH + wy)
    );

    this.inner_box = new THREE.Box2(
      new THREE.Vector2(ax - halfW + wx, ay - halfTrackH + wy),
      new THREE.Vector2(ax + halfW + wx, ay + halfTrackH + wy)
    );
    if(this.thumb){
      const halfThumbH = truncDiv(asExtentInt(this.thumb.scale.y), 2);
      const px = asExtentInt(parentPos.x);
      const py = asExtentInt(parentPos.y) + asExtentInt(this.thumb.position.y);
      this.thumb.userData.box = new THREE.Box2(
        new THREE.Vector2(px - halfW, py - halfThumbH),
        new THREE.Vector2(px + halfW, py + halfThumbH)
      );
    }

    if(this.upArrow){
      this.upArrow.userData.updateBox();
    }

    if(this.downArrow){
      this.downArrow.userData.updateBox();
    }

  }

  directionalNavigate(direction = ''){
    if(this.list){
      this.list.directionalNavigate(direction);
    }
  }

}
