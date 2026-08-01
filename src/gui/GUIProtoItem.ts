import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import type { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import { Anchor } from "@/enums/gui/Anchor";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { ResolutionManager } from "@/managers/ResolutionManager";
import type { GUIListBox } from "@/gui/GUIListBox";
import { asExtentInt, truncDiv } from "@/gui/GUICoord";
import { resolveProtoItemHeight } from "@/gui/listrow/protoItemHeight";
import { applyProtoTemplateSkin } from "@/gui/listrow/applyProtoTemplateSkin";

/** Retail CSWGuiExtent supplied to a row by menu/entry-class code (never the PROTOITEM GFF). */
export type RetailRowExtent = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// build a normalized unit rect, scale to extent
const points = [
  new THREE.Vector3(-0.5, -0.5, 0),
  new THREE.Vector3( 0.5, -0.5, 0),
  new THREE.Vector3( 0.5,  0.5, 0),
  new THREE.Vector3(-0.5,  0.5, 0),
  new THREE.Vector3(-0.5, -0.5, 0), // close loop
];

/**
 * GUIProtoItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIProtoItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIProtoItem extends GUIControl{

  static debugExtentLine: THREE.Line;
  static debugGeom = new THREE.BufferGeometry().setFromPoints(points);
  static debugMaterial  = new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false });

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUIProtoItem;
    this.zOffset = 2;
    this.isProtoItem = false;

    if(this.parent && this.parent.objectType & GUIControlTypeMask.GUIListBox){
      const list = this.parent as GUIListBox;
      // Match organizeControls item width: viewport (fill) minus 2*padding
      const vw = typeof list.getViewportWidth === 'function'
        ? list.getViewportWidth()
        : list.extent.width - (list.scrollbar ? list.scrollbar.extent.width : 0);
      this.setExtentWidth(Math.max(1, asExtentInt(vw - list.padding * 2)));
    }

    // Retail CSWGuiListBox::SetSelectedControl @ 0041c040 drives row chrome via
    // HandleInputEvent on selection change — not mouse hover. Hover-select lists
    // still pulse because hover calls SetSelectedControl first.
    this.onSelect = () => {
      this.onSelectStateChanged();
    };
  }

  /**
   * Retail base row extent — supplied by the menu / entry class, NOT the PROTOITEM GFF.
   *
   * In retail, PopulateGameList (K1 @ 006cc160), CSWGuiSaveLoadEntry (TSL @ 005d5140)
   * and CSWGuiInGameItemEntry::Initialize (K1 @ 006b4db0) each construct a stack extent
   * and pass it into CSWGuiButton::Initialize @ 00417970, which copies the extent then
   * re-initializes border/text from the proto's PARAMS. The proto extent is never read
   * for height. Override per row class with the Ghidra-sourced value.
   *
   * This base implementation is the UNVERIFIED fallback: it returns the PROTOITEM extent
   * (matching legacy KotOR.js behavior) so unmigrated rows keep working.
   */
  getRetailBaseExtent(list: GUIListBox): RetailRowExtent {
    return {
      left: 0,
      top: 0,
      width: asExtentInt(this.extent.width),
      height: asExtentInt(this.extent.height),
    };
  }

  /**
   * Mirrors CSWGuiButton::Initialize @ 00417970: assign the caller-supplied base extent,
   * then take font/texture (params analog) from the PROTOITEM template. Must NOT read
   * `template.extent` — retail derives row height only from the base extent above.
   */
  initializeRow(base: RetailRowExtent, template: GUIControl): void {
    this.setExtentLeft(asExtentInt(base.left));
    this.setExtentTop(asExtentInt(base.top));
    if (asExtentInt(base.width) > 0) {
      this.setExtentWidth(asExtentInt(base.width));
    }
    this.setExtentHeight(asExtentInt(base.height));
    applyProtoTemplateSkin(this, template);
  }

  createControl(){
    const widget = super.createControl();

    GUIProtoItem.debugExtentLine = new THREE.Line(GUIProtoItem.debugGeom, GUIProtoItem.debugMaterial);
    GUIProtoItem.debugExtentLine.scale.set(this.extent.width, this.extent.height, 1);
    GUIProtoItem.debugExtentLine.position.z = 50; // above all UI layers
    GUIProtoItem.debugExtentLine.visible = true;//GameState.debug[EngineDebugType.GUI_PROTO_EXTENTS];
    // this.widget.add(GUIProtoItem.debugExtentLine);
    return widget;
  }

  /**
   * Selected-row chrome only. Do not key off hover — description panes
   * (LB_DESC / noSelectMode) are hoverable for scroll hit-tests but must not
   * pulse or take the highlight text color (retail OptionsMain sets field22_0x2c1).
   */
  onSelectStateChanged(){
    if(this.selected){
      this.showHighlight();
      this.hideBorder();
      this.pulsing = true;
      this.text.color.copy(this.defaultHighlightColor);
      this.text.material.uniforms.diffuse.value = this.text.color;
      this.text.material.needsUpdate = true;
    }else{
      this.hideHighlight();
      this.showBorder();
      this.pulsing = false;
      this.text.color.copy(this.defaultColor);
      this.text.material.uniforms.diffuse.value = this.text.color;
      this.text.material.needsUpdate = true;
    }
  }

  buildText(){
    super.buildText();
    this.text.color.copy( this.selected ? this.defaultHighlightColor : this.defaultColor );
    this.text.material.uniforms.diffuse.value = this.text.color;
    this.text.material.needsUpdate = true;
  }

  calculatePosition(){
    /*let posX = ((this.list.extent.width - this.extent.width)/2) - this.list.border.inneroffset;

    if(!this.list.isScrollBarLeft()){
      posX -= this.parent.border.inneroffset/2;
      posX = posX * -1;
    }else{
      posX -= this.parent.border.inneroffset + this.list.border.inneroffset;
    }

    let height = this.getItemHeight();
    let posY = this.list.lastHeight + (this.list.extent.height/2) - height;
    posY += height/2;
    this.list.lastHeight += height + this.list.padding;
    this.startX = posX;
    this.startY = posY;

    this.anchor = Anchor.None;
    this.anchorOffset.set(0, 0);

    this.widget.position.x = this.anchorOffset.x + this.offset.x;
    this.widget.position.y = this.anchorOffset.y + this.offset.y;
    
    this.calculateBox();*/
  }

  getItemHeight(){
    const height = asExtentInt(this.extent.height);
    if((this.objectType & GUIControlTypeMask.GUIButton)){
      return height;
    }

    // Fixed-PROTOITEM rows (save/inventory): pitch from extent only.
    if(!this.listRowAlignExtentToWrappedText){
      return resolveProtoItemHeight(height, 0, false);
    }

    let textH = 0;
    if(this.text.geometry){
      this.text.geometry.computeBoundingBox();
      const tSize = new THREE.Vector3();
      this.text.geometry.boundingBox.getSize(tSize);
      textH = asExtentInt(tSize.y);
    }

    return resolveProtoItemHeight(height, textH, true);
  }

  calculateBox(){
    let worldPosition = this.parent.widget.position.clone();
    const rtt = (this.list as GUIListBox | undefined)?.targetMesh;
    const ox = asExtentInt(rtt?.position?.x ?? 0);
    const oy = asExtentInt(rtt?.position?.y ?? 0);
    const w = asExtentInt(this.extent.width);
    const h = asExtentInt(this.extent.height);
    const wx = asExtentInt(this.widget.position.x);
    const wy = asExtentInt(this.widget.position.y);
    const px = asExtentInt(worldPosition.x);
    const py = asExtentInt(worldPosition.y);
    this.box.min.x = wx - truncDiv(w, 2) + px + ox;
    this.box.min.y = wy - truncDiv(h, 2) + py + oy;
    this.box.max.x = wx + truncDiv(w, 2) + px + ox;
    this.box.max.y = wy + truncDiv(h, 2) + py + oy;
    
    for(let i = 0; i < this.children.length; i++){
      this.children[i].updateBounds();
    }
  }

  directionalNavigate(direction = ''){
    if(this.list){
      this.list.directionalNavigate(direction);
    }
  }

}
