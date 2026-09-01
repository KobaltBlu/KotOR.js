import type { GameMenu } from "@/gui/GameMenu";
import { GUIControl } from "@/gui/GUIControl";
import { GFFStruct } from "@/resource/GFFStruct";
import * as THREE from "three";
import { TextureLoader } from "@/loaders";
import { TextureType } from "@/enums/loaders/TextureType";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { GameState } from "@/GameState";
import { IGUIControlBorder } from "@/interface/gui/IGUIControlBorder";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import { asExtentInt, truncDiv, writeOrthoAlignedPlanePositions } from "@/gui/GUICoord";

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

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.objectType |= GUIControlTypeMask.GUICheckBox;
    this.setControlType(GUIControlType.CheckBox);

    this.value = 0;

    this.widget.userData.selected = new THREE.Group();
    this.widget.userData.highlightSelected = new THREE.Group();
    this.widget.add(this.widget.userData.selected);
    this.widget.add(this.widget.userData.highlightSelected);

    //----------//
    // Selected
    //----------//

    this.borderSelected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      corner_material: {} as THREE.ShaderMaterial,
      edge: '',
      edge_material: {} as THREE.ShaderMaterial,
      fill: {
        texture: '',
        material: {} as THREE.ShaderMaterial,
        mesh: {} as THREE.Mesh,
        geometry: {} as THREE.BufferGeometry,
      },
      mesh: {} as THREE.Mesh,
      geometry: {} as THREE.BufferGeometry,
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.borderSelected.geometry = new THREE.BufferGeometry();
    
    this.borderSelected.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true,
      defines: {
        GUI_SORT: ''
      }
    });
    this.borderSelected.edge_material.defines.USE_MAP = '';
    this.borderSelected.edge_material.uniforms.diffuse.value = this.borderSelected.color;

    this.borderSelected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true,
      defines: {
        GUI_SORT: ''
      }
    });
    //this.borderSelected.corner_material.defines.USE_MAP = '';
    this.borderSelected.corner_material.uniforms.diffuse.value = this.borderSelected.color;

    this.borderSelected.mesh = new THREE.Mesh( this.borderSelected.geometry, [this.borderSelected.edge_material, this.borderSelected.corner_material] );
    this.widget.userData.selected.add(this.borderSelected.mesh);

    //---------------//
    // Selected Fill
    //---------------//
    
    this.borderSelected.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true,
      defines: {
        GUI_SORT: ''
      }
    });
    //this.borderSelected.fill.material.defines.USE_MAP = '';
    this.borderSelected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.borderSelected.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.borderSelected.fill.mesh = new THREE.Mesh( this.borderSelected.fill.geometry, this.borderSelected.fill.material );

    this.widget.userData.selected.add( this.borderSelected.fill.mesh );

    //--------------------//
    // Highlight Selected
    //--------------------//

    this.highlightSelected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      corner_material: {} as THREE.ShaderMaterial,
      edge: '',
      edge_material: {} as THREE.ShaderMaterial,
      fill: {
        texture: '',
        material: {} as THREE.ShaderMaterial,
        mesh: {} as THREE.Mesh,
        geometry: {} as THREE.BufferGeometry,
      },
      mesh: {} as THREE.Mesh,
      geometry: {} as THREE.BufferGeometry,
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.highlightSelected.geometry = new THREE.BufferGeometry();
    
    this.highlightSelected.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.highlightSelected.edge_material.defines.USE_MAP = '';
    this.highlightSelected.edge_material.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true,
      defines: {
        GUI_SORT: ''
      }
    });
    //this.highlightSelected.corner_material.defines.USE_MAP = '';
    this.highlightSelected.corner_material.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.mesh = new THREE.Mesh( this.highlightSelected.geometry, [this.highlightSelected.edge_material, this.highlightSelected.corner_material] );
    this.widget.userData.highlightSelected.add(this.highlightSelected.mesh);

    //-------------------------//
    // Highlight Selected Fill
    //-------------------------//
    
    this.highlightSelected.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true,
      defines: {
        GUI_SORT: ''
      }
    });
    //this.highlightSelected.fill.material.defines.USE_MAP = '';
    this.highlightSelected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.highlightSelected.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.highlightSelected.fill.mesh = new THREE.Mesh( this.highlightSelected.fill.geometry, this.highlightSelected.fill.material );

    this.widget.userData.highlightSelected.add( this.highlightSelected.fill.mesh );

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
          this.borderSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
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
          this.highlightSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
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

    //Control Textures

    //----------//
    // Selected
    //----------//

    if(this.borderSelected.edge != ''){
      TextureLoader.enQueue(this.borderSelected.edge, this.borderSelected.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.borderSelected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        this.layoutCheckboxFills();
      });
    }

    if(this.borderSelected.corner != ''){
      TextureLoader.enQueue(this.borderSelected.corner, this.borderSelected.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.borderSelected.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.borderSelected.fill.texture != ''){
      this.borderSelected.fill.material.transparent = true;
      TextureLoader.enQueue(this.borderSelected.fill.texture, this.borderSelected.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(texture == null){
          this.borderSelected.fill.material.uniforms.opacity.value = 0.01;
        }
      });
    }else{
      this.borderSelected.fill.material.visible = false;
    }

    //--------------------//
    // Highlight Selected
    //--------------------//

    if(this.highlightSelected.edge != ''){
      TextureLoader.enQueue(this.highlightSelected.edge, this.highlightSelected.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.highlightSelected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlightSelected.corner != ''){
      TextureLoader.enQueue(this.highlightSelected.corner, this.highlightSelected.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.highlightSelected.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlightSelected.fill.texture != ''){
      this.highlightSelected.fill.material.transparent = true;
      TextureLoader.enQueue(this.highlightSelected.fill.texture, this.highlightSelected.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(texture == null){
          this.highlightSelected.fill.material.uniforms.opacity.value = 0.01;
        }
        this.layoutCheckboxFills();
      });
    }else{
      this.highlightSelected.fill.material.visible = false;
    }

    //Control Input Events

    //Selected
    this.attachEventListenters( this.borderSelected.mesh );

    //Highlight Selected
    this.attachEventListenters( this.highlightSelected.mesh );

    this.addEventListener( 'mouseMove', (e: any) => { });

    this.addEventListener( 'click', () =>{
      this.setValue(!this.value);
    });

    this.addEventListener( 'mouseDown', (e: any) => {
      e.stopPropagation();
    });

    this.addEventListener( 'mouseUp', () => { });

    this.borderSelected.fill.material.uniforms.diffuse.value.set(this.defaultColor);
    this.highlightSelected.fill.material.uniforms.diffuse.value.set(this.defaultHighlightColor);

    this.layoutCheckboxFills();
    this.updateCBVisualState();
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

  layoutCheckboxFills(){
    if(!this.isOptionsStyleLayout()){
      return;
    }

    const cbSize = this.getCBScale();
    const center = this.getOptionsCheckboxCenter();
    const fills = [
      this.border.fill.mesh,
      this.borderSelected.fill.mesh,
      this.highlight.fill.mesh,
      this.highlightSelected.fill.mesh,
    ];

    for(const mesh of fills){
      if(!mesh) continue;
      // Odd 25×25 glyph: int frustum edges, not float ±scale/2
      mesh.scale.set(1, 1, 1);
      const pos = (mesh.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
      if(pos && pos.count >= 4){
        writeOrthoAlignedPlanePositions(pos, cbSize, cbSize);
        (mesh.geometry as THREE.BufferGeometry).computeBoundingBox();
      }
      mesh.position.set(center.x, center.y, this.zOffset);
    }
  }

  buildFill(){
    super.buildFill();
    if(this.isOptionsStyleLayout()){
      this.layoutCheckboxFills();
      this.border.fill.material.uniforms.diffuse.value.set(this.defaultColor);
    }
  }

  buildHighlightFill(){
    super.buildHighlightFill();
    if(this.isOptionsStyleLayout()){
      this.layoutCheckboxFills();
      this.highlight.fill.material.uniforms.diffuse.value.set(this.defaultHighlightColor);
    }
  }

  resizeFill(){
    super.resizeFill();
    this.layoutCheckboxFills();
  }

  resizeHighlightFill(){
    super.resizeHighlightFill();
    this.layoutCheckboxFills();
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
    this.widget.userData.text.position.z = this.zOffset;

    // Text strip starts at left + 0x1e (widget left is −width/2).
    this.widget.userData.text.position.x = -truncDiv(asExtentInt(this.extent.width), 2) + OPTIONS_TEXT_OFFSET;

    const innerSize = this.getInnerSize();
    const vertical = this.text.alignment & GUIControlAlignment.VerticalMask;
    switch(vertical){
      case GUIControlAlignment.VerticalTop:
        this.widget.userData.text.position.y = truncDiv(asExtentInt(innerSize.height), 2);
        break;
      case GUIControlAlignment.VerticalCenter:
        this.widget.userData.text.position.y = truncDiv(asExtentInt(this.textSize.y), 2);
        break;
      case GUIControlAlignment.VerticalBottom:
        this.widget.userData.text.position.y =
          -truncDiv(asExtentInt(innerSize.height), 2) + asExtentInt(this.textSize.y);
        break;
    }
  }

  hideHighlight(){
    if(this.isOptionsStyleLayout()){
      // Options style: edges stay off; fill visibility is owned by updateCBVisualState.
      if(this.highlight.mesh) this.highlight.mesh.visible = false;
      return;
    }
    super.hideHighlight();
  }

  hideBorder(){
    if(this.isOptionsStyleLayout()){
      if(this.border.mesh) this.border.mesh.visible = false;
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
      if(this.border.mesh) this.border.mesh.visible = false;
      return;
    }
    super.showBorder();
  }

  showHighlight(){
    if(this.isOptionsStyleLayout()){
      if(this.highlight.mesh) this.highlight.mesh.visible = false;
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
    this.border.fill.mesh.visible = false;
    this.borderSelected.fill.mesh.visible = false;
    this.highlight.fill.mesh.visible = false;
    this.highlightSelected.fill.mesh.visible = false;

    if(this.isOptionsStyleLayout()){
      // K1 OptionsCheckbox: only the 25×25 fills draw; chrome edges stay off.
      if(this.border.mesh) this.border.mesh.visible = false;
      if(this.highlight.mesh) this.highlight.mesh.visible = false;
      if(this.borderSelected.mesh) this.borderSelected.mesh.visible = false;
      if(this.highlightSelected.mesh) this.highlightSelected.mesh.visible = false;
      this.layoutCheckboxFills();
    }

    if(this.hover){
      if(this.value){
        this.highlightSelected.fill.mesh.visible = true;
      }else{
        this.highlight.fill.mesh.visible = true;
      }
    }else{
      if(this.value){
        this.borderSelected.fill.mesh.visible = true;
      }else{
        this.border.fill.mesh.visible = true;
      }
    }

    this.list?.markListRttDirty?.();
  }

  _onCreate(){
    super._onCreate();
    this.layoutCheckboxFills();
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
