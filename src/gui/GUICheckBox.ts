import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "@/loaders";
import { TextureType } from "@/enums/loaders/TextureType";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { GameState } from "@/GameState";
import { IGUIControlBorder } from "@/interface/gui/IGUIControlBorder";
import type { GUIChromeMapSlot } from "@/interface/gui/IGUIControlChrome";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import { asExtentInt, truncDiv } from "@/gui/GUICoord";
import { commitGuiTransform } from "@/gui/guiMatrix";
import {
  bindChromeTexture,
  buildFillChromeGeometry,
} from "@/gui/guiChrome";

/** K1 options checkbox fixed glyph size (`0x19`). */
const OPTIONS_CHECKBOX_SIZE = 0x19;
/** K1 options checkbox text strip starts at `left + 0x1e`. */
const OPTIONS_TEXT_OFFSET = 0x1e;

/**
 * GUICheckBox class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * Maps to K1 button-toggle controls. Tags starting with `CB_` use the
 * options-checkbox SetExtent layout (fixed 25×25 glyph + label strip).
 * 
 * Selected vs unselected textures are rebound onto the shared chrome material.
 * 
 * @file GUICheckBox.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUICheckBox extends GUIControl{
  value: number;
  onValueChanged: Function;

  borderSelected: IGUIControlBorder;
  highlightSelected: IGUIControlBorder;
  hasSelected: boolean;
  hashighlightSelected: boolean;

  private _texCache: Partial<Record<string, OdysseyTexture>> = {};

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUICheckBox;
    this.setControlType(GUIControlType.CheckBox);

    this.value = 0;

    this.borderSelected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      edge: '',
      fill: { texture: '' },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.highlightSelected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      edge: '',
      fill: { texture: '' },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    if(this.control instanceof GFFStruct){
      
      //Selected
      this.hasSelected = control.hasField('SELECTED');
      if(this.hasSelected){
        let selected = control.getFieldByLabel('SELECTED').getChildStructs()[0];

        if(selected.hasField('COLOR')){
          let color = selected.getFieldByLabel('COLOR').getVector();
          this.borderSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.borderSelected.color === 'undefined'){
          this.borderSelected.color = new THREE.Color(1, 1, 1);
        }

        this.borderSelected.dimension = selected.getFieldByLabel('DIMENSION').getValue() || 0;
        this.borderSelected.corner = selected.getFieldByLabel('CORNER').getValue();
        this.borderSelected.edge = selected.getFieldByLabel('EDGE').getValue();
        this.borderSelected.fill.texture = selected.getFieldByLabel('FILL').getValue();
        this.borderSelected.fillstyle = selected.getFieldByLabel('FILLSTYLE').getValue() || 0;
        this.borderSelected.inneroffset = this.borderSelected.inneroffsety = selected.getFieldByLabel('INNEROFFSET').getValue() || 0;

        if(selected.hasField('INNEROFFSETY'))
          this.borderSelected.inneroffsety = selected.getFieldByLabel('INNEROFFSETY').getValue();

        this.borderSelected.pulsing = selected.getFieldByLabel('PULSING').getValue() || 0;
      }
      
      //Highlight Selected
      this.hashighlightSelected = control.hasField('HILIGHTSELECTED');
      if(this.hashighlightSelected){
        let highlightSelected = control.getFieldByLabel('HILIGHTSELECTED').getChildStructs()[0];

        if(highlightSelected.hasField('COLOR')){
          let color = highlightSelected.getFieldByLabel('COLOR').getVector();
          this.highlightSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.highlightSelected.color === 'undefined'){
          this.highlightSelected.color = new THREE.Color(1, 1, 1);
        }

        this.highlightSelected.dimension = highlightSelected.getFieldByLabel('DIMENSION').getValue() || 0;
        this.highlightSelected.corner = highlightSelected.getFieldByLabel('CORNER').getValue();
        this.highlightSelected.edge = highlightSelected.getFieldByLabel('EDGE').getValue();
        this.highlightSelected.fill.texture = highlightSelected.getFieldByLabel('FILL').getValue();
        this.highlightSelected.fillstyle = highlightSelected.getFieldByLabel('FILLSTYLE').getValue() || 0;
        this.highlightSelected.inneroffset = this.highlightSelected.inneroffsety = highlightSelected.getFieldByLabel('INNEROFFSET').getValue() || 0;

        if(highlightSelected.hasField('INNEROFFSETY'))
          this.highlightSelected.inneroffsety = highlightSelected.getFieldByLabel('INNEROFFSETY').getValue();

        this.highlightSelected.pulsing = highlightSelected.getFieldByLabel('PULSING').getValue() || 0;
      }

      if(control.hasField('ISSELECTED')){
        this.value = control.getFieldByLabel('ISSELECTED').getValue() ? 1 : 0;
      }

    }

    this.preloadSelectedTextures();

    this.addEventListener( 'mouseMove', (_e: any) => { });

    this.addEventListener( 'click', () =>{
      this.setValue(!this.value);
    });

    this.addEventListener( 'mouseDown', (e: any) => {
      e.stopPropagation();
    });

    this.addEventListener( 'mouseUp', () => { });

    this.updateCBVisualState();
  }

  private enqueueNamed(name: string, onLoad?: (texture: OdysseyTexture) => void){
    if(!name) return;
    TextureLoader.enQueue(name, this.chrome.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      if(texture){
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        this._texCache[name.toLowerCase()] = texture;
      }
      onLoad?.(texture);
    });
  }

  private preloadSelectedTextures(){
    this.enqueueNamed(this.borderSelected.edge);
    this.enqueueNamed(this.borderSelected.corner);
    this.enqueueNamed(this.borderSelected.fill.texture, () => this.updateCBVisualState());
    this.enqueueNamed(this.highlightSelected.edge);
    this.enqueueNamed(this.highlightSelected.corner);
    this.enqueueNamed(this.highlightSelected.fill.texture, () => this.updateCBVisualState());
  }

  private texFor(name: string): OdysseyTexture | null {
    if(!name) return null;
    return this._texCache[name.toLowerCase()]
      ?? TextureLoader.textures.get(name.toLowerCase())
      ?? TextureLoader.guiTextures.get(name.toLowerCase())
      ?? null;
  }

  private bindSlot(slot: GUIChromeMapSlot, name: string){
    bindChromeTexture(this.chrome.material, slot, this.texFor(name));
  }

  /**
   * K1 options menus construct type-7 as an options checkbox (fixed glyph + label).
   * Overlay toggles (`TB_*`, party BTNs) stay as plain button toggles.
   * List PROTOITEM checkbox rows (e.g. optfeedback LB_OPTIONS) are OptionsCheckbox.
   */
  isOptionsStyleLayout(): boolean {
    if(typeof this.name !== 'string'){
      return false;
    }
    return this.name.startsWith('CB_') || this.name === 'PROTOITEM';
  }

  /** Glyph size for options checkboxes (`0x19`); unused for full-extent toggles. */
  getCBScale(): number {
    return OPTIONS_CHECKBOX_SIZE;
  }

  /**
   * Center of the 25×25 glyph in widget space.
   * K1: `(left, top + 2 + (height - 0x19) / 2)` → center-origin `(−(W−25)/2, −2)`.
   */
  getOptionsCheckboxCenter(): THREE.Vector2 {
    return new THREE.Vector2(
      -truncDiv(asExtentInt(this.extent.width) - OPTIONS_CHECKBOX_SIZE, 2),
      -2
    );
  }

  buildChrome(){
    if(this.isOptionsStyleLayout()){
      const cbSize = this.getCBScale();
      const center = this.getOptionsCheckboxCenter();

      if(this.chrome.geometry instanceof THREE.BufferGeometry){
        this.chrome.geometry.dispose();
      }
      this.chrome.geometry = buildFillChromeGeometry(cbSize, cbSize, center.x, center.y);
      if(this.chrome.mesh){
        this.chrome.mesh.geometry = this.chrome.geometry;
        this.chrome.mesh.position.z = this.zOffset;
        commitGuiTransform(this.chrome.mesh);
      }
      return;
    }
    super.buildChrome();
  }

  /** Options text lives in `(left+0x1e, top, width-0x1e, height)` — not the border inner rect. */
  getInnerSize(){
    if(this.isOptionsStyleLayout()){
      return {
        width: Math.max(0, asExtentInt(this.extent.width) - OPTIONS_TEXT_OFFSET),
        height: asExtentInt(this.extent.height),
      };
    }
    return super.getInnerSize();
  }

  alignText(){
    if(!this.isOptionsStyleLayout()){
      super.alignText();
      return;
    }

    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
    this.text.mesh.position.z = this.zOffset;

    // Text strip starts at left + 0x1e (widget left is −width/2).
    this.text.mesh.position.x = -truncDiv(asExtentInt(this.extent.width), 2) + OPTIONS_TEXT_OFFSET;

    const innerSize = this.getInnerSize();
    const vertical = this.text.alignment & GUIControlAlignment.VerticalMask;
    switch(vertical){
      case GUIControlAlignment.VerticalTop:
        this.text.mesh.position.y = truncDiv(asExtentInt(innerSize.height), 2);
        break;
      case GUIControlAlignment.VerticalCenter:
        this.text.mesh.position.y = truncDiv(asExtentInt(this.textSize.y), 2);
        break;
      case GUIControlAlignment.VerticalBottom:
        this.text.mesh.position.y =
          -truncDiv(asExtentInt(innerSize.height), 2) + asExtentInt(this.textSize.y);
        break;
    }
    commitGuiTransform(this.text.mesh);
  }

  hideHighlight(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.hideHighlight();
  }

  hideBorder(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.hideBorder();
  }

  hideFill(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.hideFill();
  }

  hideHighlightFill(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.hideHighlightFill();
  }

  showBorder(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.showBorder();
  }

  showHighlight(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.showHighlight();
  }

  showFill(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.showFill();
  }

  showHighlightFill(){
    if(this.isOptionsStyleLayout()){
      return;
    }
    super.showHighlightFill();
  }

  updateCBVisualState(){
    const borderSrc = this.value ? this.borderSelected : this.border;
    const highlightSrc = this.value ? this.highlightSelected : this.highlight;

    this.bindSlot('edgeMap', borderSrc.edge);
    this.bindSlot('cornerMap', borderSrc.corner);
    this.bindSlot('fillMap', borderSrc.fill.texture);
    this.bindSlot('highlightEdgeMap', highlightSrc.edge);
    this.bindSlot('highlightCornerMap', highlightSrc.corner);
    this.bindSlot('highlightFillMap', highlightSrc.fill.texture);

    this.chrome.material.uniforms.diffuse.value.copy(borderSrc.color);
    this.chrome.material.uniforms.highlightDiffuse.value.copy(
      this.value ? this.highlightSelected.color : this.defaultHighlightColor
    );
    this.chrome.material.uniforms.fillDiffuse.value.copy(
      this.isOptionsStyleLayout() ? this.defaultColor : new THREE.Color(1, 1, 1)
    );

    if(this.isOptionsStyleLayout()){
      this.borderEnabled = false;
      this.highlightEnabled = false;
      this.borderFillEnabled = true;
      this.highlightFillEnabled = true;
    }

    this.applyChromeHoverState(!!this.hover);
    this.list?.markListRttDirty?.();
  }

  _onCreate(){
    super._onCreate();
    this.updateCBVisualState();
    if(this.isOptionsStyleLayout() && this.text?.mesh){
      this.alignText();
    }
  }

  onHoverOut(){
    this.hover = false;
    this.pulsing = false;

    this.text.material.uniforms.diffuse.value.set(this.defaultColor);

    if(typeof this.onMouseOut === 'function')
      this.onMouseOut();

    this.updateCBVisualState();
    this.processEventListener('mouseOut');
  }

  onHoverIn(){
    if(!this.hover && typeof this.onHover === 'function')
      this.onHover();

    this.hover = true;
    this.pulsing = true;

    this.text.material.uniforms.diffuse.value.set(this.defaultHighlightColor);

    if(typeof this.onMouseIn === 'function')
      this.onMouseIn();

    this.updateCBVisualState();

    if(this.isClickable()){
      GameState.guiAudioEmitter.playSoundFireAndForget('gui_scroll');
    }
    
    this.processEventListener('hover');
    this.processEventListener('mouseIn');
  }

  onINIPropertyAttached(){
    if(this.iniProperty)
      this.setValue(GameState.iniConfig.getProperty(this.iniProperty));
  }

  setValue(value: boolean | number | string){
    // Coerce INI strings ("0"/"1") — bare `value ? 1 : 0` treats "0" as on.
    this.value = Number(value) ? 1 : 0;

    if(this.iniProperty){
      GameState.iniConfig.setProperty(this.iniProperty, this.value);
    }
    
    if(typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

    this.processEventListener('valueChanged', [this.value]);

    this.updateCBVisualState();
  }

}
