import * as THREE from "three";
import { Anchor } from "@core/enums/gui/Anchor";
import { GUIControlAlignment } from "@core/enums/gui/GUIControlAlignment";
import { IDPadTarget } from "@engine/interface/gui/IDPadTarget";
import { IGUIControlBorder } from "@engine/interface/gui/IGUIControlBorder";
import type { GUIChromeMapSlot, IGUIControlChrome } from "@engine/interface/gui/IGUIControlChrome";
import { IGUIControlEventListeners } from "@engine/interface/gui/IGUIControlEventListeners";
import { IGUIControlExtent } from "@engine/interface/gui/IGUIControlExtent";
import { IGUIControlMoveTo } from "@engine/interface/gui/IGUIControlMoveTo";
import { IGUIControlText } from "@engine/interface/gui/IGUIControlText";
import { GFFStruct } from "@core/resource/GFFStruct";
import { GameState } from "@engine/runtime/GameState";
import { TextureLoader } from "@engine/loaders";
import { TextureType } from "@core/enums/loaders/TextureType";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { GameEngineType } from "@core/enums/engine";
import { KeyMapper, Mouse } from "@engine/controls";
import { IGUIControlColors } from "@engine/interface/gui/IGUIControlColors";
import { GUIControlTypeMask } from "@core/enums/gui/GUIControlTypeMask";
import { GUIControlEventFactory } from "@engine/gui/GUIControlEventFactory";
import type { GameMenu } from "@engine/gui/GameMenu";
import { BitWise } from "@core/utility/BitWise";
import { GUIListBox } from "@engine/gui/GUIListBox";
import { commitGuiTransform, freezeGuiObject } from "@engine/gui/guiMatrix";
import { GUIFont, computeBoundingBoxXY } from "@engine/gui/GUIFont";
import { GUIControlEvent } from "@engine/gui/GUIControlEvent";
import { GUIControlType } from "@core/enums/gui/GUIControlType";
import { KeyMapAction } from "@core/enums/controls/KeyMapAction";
import { GFFField } from "@core/resource/GFFField";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { RenderPerfStats } from "@engine/render/RenderPerfStats";
import {
  asExtentInt,
  asGuiSize,
  centeredExtentMax,
  clampFrameDim,
  extentToCenteredPosition,
  getLocalMouseCoords,
  GUI_DESIGN_HEIGHT,
  GUI_DESIGN_WIDTH,
  GUIPanelCoordFlags,
  hitCheckMouseLocal,
  hitCheckMouseWorldBox,
  listLocalFromWorldBox,
  panelLocalFromCenteredUI,
  applyPanelOffsetToLetterboxLocal,
  selectTopmostHitChildIndex,
  truncDiv,
} from "@engine/gui/GUICoord";
import { borderInnerExtent } from "@engine/gui/borderInnerExtent";
import { borderSideExtent } from "@engine/gui/borderSideExtent";
import { ResolutionManager } from "@engine/managers/ResolutionManager";
import { createGuiControlStruct, isTslGuiGame } from "@engine/gui/guiControlSchema";
import {
  bindChromeTexture,
  buildChromeGeometryForControl,
  chromeFrameDimension,
  chromeTextureGuiSize,
  createGuiChrome,
  GUI_HOVER_MODE_OVERLAY,
  GUI_HOVER_MODE_SWAP,
  odysseyBorderDim,
} from "@engine/gui/guiChrome";

const itemSize = 2
const box = { min: [0, 0], max: [0, 0] }

/**
 * GUIControl class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIControl.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIControl {
  objectType: number = GUIControlTypeMask.GUIControl;
  position: THREE.Vector3 = new THREE.Vector3();
  list: GUIListBox;
  isProtoItem: boolean;
  node: any;
  visible: boolean = true;
  keymapAction: KeyMapAction;

  calculateBox() {
    return;
  }
  
  static COLORS: IGUIControlColors = {
    BORDER: new THREE.Color(1, 1, 1),
    BORDER_HOVER: new THREE.Color(1, 1, 1),
    BORDER_HIGHLIGHT: new THREE.Color(1, 1, 1),
    BORDER_HIGHLIGHT_HOVER: new THREE.Color(1, 1, 1),
    TEXT: new THREE.Color(1, 1, 1),
    TEXT_HIGHLIGHT: new THREE.Color(1, 1, 1),
    LOCKED: new THREE.Color(1, 0, 0),
  };

  id: number = 0;
  name: string;
  menu: GameMenu;
  control: GFFStruct;
  parent: GUIControl;
  scale: boolean;
  iniProperty: string = "";
  autoCalculatePosition: boolean = true;
  guiFont: GUIFont;

  dPadTarget: IDPadTarget = {
    up: undefined,
    down: undefined,
    left: undefined,
    right: undefined
  };

  anchor: Anchor = Anchor.None;

  offset: THREE.Vector2;
  worldPosition: THREE.Vector3;
  widget: THREE.Group;
  box: THREE.Box2;
  children: GUIControl[] = [];
  zOffset: number = 1;
  zIndex: number = 0;

  eventListeners: IGUIControlEventListeners = {
    click:      [],
    mouseIn:    [],
    mouseOut:   [],
    mouseDown:  [],
    mouseMove:  [],
    mouseUp:    [],
    hover:      []
  };

  defaultColor: THREE.Color;
  defaultHighlightColor: THREE.Color;
  defaultLockedColor: THREE.Color;

  allowClick: boolean = true;
  disableSelection: boolean = false;
  disableHover: boolean = false;
  /** When set on a list row, overrides GameMenu hover suppression for custom PROTOITEM presenters. */
  listRowSuppressGameMenuHover?: boolean;
  /**
   * List rows: when false, wrapped text does not mutate extent / trigger list relayout from {@link alignText}
   * (composite rows like inventory set this on the row root).
   */
  listRowAlignExtentToWrappedText = true;

  onClick?: Function;
  onMouseMove?: Function;
  onMouseDown?: Function;
  onMouseUp?: Function;
  onMouseIn?: Function;
  onMouseOut?: Function;
  onDrag?: Function;
  onDragEnd?: Function;
  onHover?: Function;

  onKeyUp?: (e: KeyboardEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;

  /** Backing field for `pulsing` (enable / text pulse). */
  private _pulsing: boolean = false;
  /** SetPulsingAlpha edge flag (Draw bit for corners/edges). */
  runtimePulseEdge: boolean = false;
  /** SetPulsingAlpha fill flag (Draw bit for fill). */
  runtimePulseFill: boolean = false;
  pulse: number = 1;
  opacity: number = 1;
  hover: boolean;
  swapBorderAndHighlightOnHover = true;

  /**
   * Runtime pulse enable. Assigning true pulses edge + fill + text together;
   * use setPulsingAlpha when edge/fill must differ (HUD fill-only, etc.).
   */
  get pulsing(): boolean {
    return this._pulsing;
  }
  set pulsing(value: boolean) {
    this._pulsing = !!value;
    this.runtimePulseEdge = this._pulsing;
    this.runtimePulseFill = this._pulsing;
  }

  extent: IGUIControlExtent = {
    top: 0,
    left: 0,
    width: 0,
    height: 0
  };

  moveTo: IGUIControlMoveTo = {
    up: 0,
    down: 0,
    left: 0,
    right: 0
  }

  border: IGUIControlBorder;
  highlight: IGUIControlBorder;
  /** Single chrome drawable (frame + fill). Border/highlight are data only. */
  chrome: IGUIControlChrome;
  text: IGUIControlText;
  hasText: boolean;
  hasBorder: boolean;
  hasExtent: boolean;
  padding: number;
  objectParentId: number;
  objectParent: number;
  objectLocked: number;
  type: number;
  hasHighlight: boolean;
  hasMoveTo: any;
  borderEnabled: boolean;
  borderFillEnabled: boolean;
  highlightEnabled: boolean;
  highlightFillEnabled: boolean;
  hovering: boolean;
  anchorOffset: THREE.Vector2 = new THREE.Vector2(0, 0);
  editable: boolean;
  selected: boolean;
  onSelect: Function;

  userData: any = {};

  /** When true, the control will be rebuilt on the next update. */
  needsUpdate: boolean = false;

  /** Counts outstanding texture loads started by initTextures and subclass overrides. */
  private _pendingTextureCount: number = 0;

  /** True when all texture slots queued by this control have finished loading. */
  get isTextureReady(): boolean {
    return this._pendingTextureCount === 0;
  }

  /** Called when _pendingTextureCount reaches zero. Override in subclasses for sequenced secondary loads. */
  protected onTexturesReady(): void {
    this.invalidateListRtt();
  }

  /** Increment pending texture count before an enQueue; call this helper to decrement and fire onTexturesReady when done. */
  protected _beginTextureLoad(): void {
    this._pendingTextureCount++;
  }

  protected _endTextureLoad(): void {
    if (this._pendingTextureCount > 0) {
      this._pendingTextureCount--;
    }
    if (this._pendingTextureCount === 0) {
      this.onTexturesReady();
    }
  }
  
  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl|undefined, scale: boolean = false){

    this.menu = menu;
    this.control = control;
    this.parent = parent;
    this.scale = scale;

    this.offset = new THREE.Vector2();

    this.widget = new THREE.Group();
    this.widget.userData.control = this;
    freezeGuiObject(this.widget);

    this.worldPosition = new THREE.Vector3();
    this.box = new THREE.Box2(
      new THREE.Vector2(
        0,
        0
      ),
      new THREE.Vector2(
        0,
        0
      )
    );

    this.defaultColor = new THREE.Color(0.0, 0.658824, 0.980392);
    this.defaultHighlightColor = new THREE.Color(1, 1, 0);
    this.defaultLockedColor = new THREE.Color(1, 0, 0);

    if(GameState.GameKey == GameEngineType.TSL){
      this.defaultColor = new THREE.Color(0.10196078568697, 0.69803923368454, 0.549019634723663);
      this.defaultHighlightColor = new THREE.Color(0.800000011920929, 0.800000011920929, 0.6980392336845398);
      this.defaultLockedColor = new THREE.Color(1, 0, 0);
    }

    this.allowClick = true;

    this.pulsing = false;
    this.pulse = 1;
    this.opacity = 1;
    this.hover = false;

    this.initObjects();
    this.initInputListeners();
    this.initProperties();
    this.initTextures();

  }

  initObjects(){
    //--------//
    // Extent
    //--------//

    this.extent = {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    };

    //--------//
    // Border (data)
    //--------//

    this.border = {
      color: new THREE.Color(this.defaultColor),
      corner: '',
      edge: '',
      fill: {
        texture: '',
      },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    //-----------//
    // Highlight (data)
    //-----------//

    this.highlight = {
      color: new THREE.Color(this.defaultHighlightColor),
      corner: '',
      edge: '',
      fill: {
        texture: '',
      },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    //--------//
    // Chrome
    //--------//

    this.chrome = createGuiChrome();
    this.chrome.material.uniforms.diffuse.value = this.border.color;
    this.chrome.material.uniforms.highlightDiffuse.value = this.highlight.color;
    this.widget.add(this.chrome.mesh);

    //------//
    // Text
    //------//

    this.text = {
      color: new THREE.Color(this.defaultColor),
      font: '', //fnt_d16x16b
      strref: -1,
      text: '',
      alignment: 9, //9 //18 //17
      pulsing: 0,
      geometry: {} as THREE.BufferGeometry,
      mesh: {} as THREE.Mesh,
      material: {} as THREE.ShaderMaterial,
      texture: {} as OdysseyTexture,
    };

    this.text.geometry = new THREE.BufferGeometry();
    this.text.geometry.index = new THREE.BufferAttribute( new Uint16Array(), 1 ).setUsage( THREE.StaticDrawUsage );

    let posAttribute = new THREE.BufferAttribute( new Float32Array(), 2 ).setUsage( THREE.StaticDrawUsage );
    let uvAttribute = new THREE.BufferAttribute( new Float32Array(), 2 ).setUsage( THREE.StaticDrawUsage );
    this.text.geometry.setAttribute( 'position', posAttribute );
    this.text.geometry.setAttribute( 'uv', uvAttribute );

    this.text.geometry.index.needsUpdate = true;
    this.text.geometry.attributes.position.needsUpdate = true;
    this.text.geometry.attributes.uv.needsUpdate = true;

    // itemSize-2 positions: install before any setText/buildGeometry (Three r186 getZ NaN).
    this.installTextGeometryBoundsOverrides();

    this.text.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      transparent: true,
      fog: false,
      visible: true,
      defines: {
        GUI_SORT: ''
      }
    });
    //this.text.material.defines.USE_MAP = '';
    this.text.material.uniforms.diffuse.value = this.text.color;
    //new THREE.MeshBasicMaterial({color: this.text.color, side: THREE.DoubleSide, transparent: true});
    this.text.mesh = new THREE.Mesh( this.text.geometry, this.text.material );
    this.text.mesh.frustumCulled = false;
    this.text.mesh.visible = false;

    //--------//
    // MoveTo
    //--------//

    this.moveTo = {
      up: 0,
      down: 0,
      left: 0,
      right: 0
    };
  }

  setList(list: GUIListBox){
    this.list = list;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child && child !== list && child !== list.scrollbar) {
        child.setList(list);
      }
    }
  }

  /** Marks the owning {@link GUIListBox} RTT dirty after async border/highlight textures load. */
  invalidateListRtt(): void {
    let control: GUIControl | undefined = this;
    while (control) {
      if (control.list) {
        control.list.markListRttDirty();
        return;
      }
      control = control.parent as GUIControl | undefined;
    }
  }

  initInputListeners(){
    if(this.chrome?.mesh){
      this.chrome.mesh.name = 'GUIChrome';
      this.chrome.mesh.position.z = this.zOffset;
      this.chrome.mesh.renderOrder = this.getRenderOrder(this.id);
      commitGuiTransform(this.chrome.mesh);
      this.attachEventListenters( this.chrome.mesh );
    }

    if(this.text.mesh){
      this.text.mesh.name = 'GUIText';
      this.text.mesh.position.z = this.zOffset;
      this.text.mesh.renderOrder = this.getRenderOrder(5);
      commitGuiTransform(this.text.mesh);
      this.attachEventListenters( this.text.mesh );
    }
    
  }

  /** Local GUI order + menu layer bias (overlays above parents). */
  getRenderOrder(local: number): number {
    return (this.menu?.renderOrderBias ?? 0) + local;
  }

  /**
   * Re-apply chrome/text renderOrder after the menu bias changes.
   * Subclasses with extra meshes should override and call super.
   */
  refreshRenderOrder(){
    if(this.chrome?.mesh){
      this.chrome.mesh.renderOrder = this.getRenderOrder(this.id);
    }
    if(this.text?.mesh){
      this.text.mesh.renderOrder = this.getRenderOrder(5);
    }
    for(let i = 0, len = this.children.length; i < len; i++){
      this.children[i].refreshRenderOrder();
    }
  }

  attachEventListenters( object: THREE.Object3D ){
    if( object instanceof THREE.Object3D ){
      object.userData.isClickable = (e: any) => {
        return this.isClickable();
      };

      object.userData.onClick = (e: any) => {
        this.processEventListener('click', [e]);
      };

      object.userData.onMouseMove = (e: any) =>{
        this.processEventListener('mouseMove', [e]);
      }

      object.userData.onMouseDown = (e: any) => {
        this.processEventListener('mouseDown', [e]);
      };

      object.userData.onMouseUp = (e: any) => {
        this.processEventListener('mouseUp', [e]);
      };
      
      object.userData.onHover = (e: any) => {
        this.processEventListener('hover', [e]);
      };

      object.userData.getControl = () => {
        return this;
      }
    }
  }

  /** List-row extents must not mutate the shared PROTOITEM GFF template. */
  private shouldSkipExtentGffWriteback(): boolean {
    if (this.list || this.isProtoItem) {
      return true;
    }
    if (this.parent && BitWise.InstanceOfObject(this.parent, GUIControlTypeMask.GUIListBox)) {
      return true;
    }
    return false;
  }

  setExtentTop(top: number){
    this.extent.top = asExtentInt(top);
    if(!this.shouldSkipExtentGffWriteback() && this.control.hasField('EXTENT')){
      const extent = this.control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
      if(extent){
        extent.getFieldByLabel('TOP')?.setValue(this.extent.top);
      }
    }
  }

  setExtentLeft(left: number){
    this.extent.left = asExtentInt(left);
    if(!this.shouldSkipExtentGffWriteback() && this.control.hasField('EXTENT')){
      const extent = this.control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
      if(extent){
        extent.getFieldByLabel('LEFT')?.setValue(this.extent.left);
      }
    }
  }

  setExtentWidth(width: number){
    this.extent.width = asExtentInt(width);
    if(!this.shouldSkipExtentGffWriteback() && this.control.hasField('EXTENT')){
      const extent = this.control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
      if(extent){
        extent.getFieldByLabel('WIDTH')?.setValue(this.extent.width);
      }
    }
  }

  setExtentHeight(height: number){
    this.extent.height = asExtentInt(height);
    if(!this.shouldSkipExtentGffWriteback() && this.control.hasField('EXTENT')){
      const extent = this.control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
      if(extent){
        extent.getFieldByLabel('HEIGHT')?.setValue(this.extent.height);
      }
    }
  }

  setControlType(type: number){
    this.type = type;
    if(this.control.hasField('CONTROLTYPE')){
      this.control.getFieldByLabel('CONTROLTYPE')?.setValue(type);
    }else{
      this.control.addField(new GFFField(GFFDataType.INT, 'CONTROLTYPE', type));
    }
  }

  /**
   * Re-applies data from {@link control} after GFF edits in Forge (no full menu rebuild).
   * Safe to call after mutating fields on this control's `GFFStruct`.
   */
  syncFromGFFPartial(): void {
    this.initProperties();
    this.calculatePosition();
    this.resizeControl();
    if(this.hasText && this.text.texture){
      this.buildText();
    }
  }

  buildDefaultControl(){
    const borderColor = {
      x: this.defaultColor?.r ?? 1,
      y: this.defaultColor?.g ?? 1,
      z: this.defaultColor?.b ?? 1,
    };
    const highlightColor = {
      x: this.defaultHighlightColor?.r ?? 1,
      y: this.defaultHighlightColor?.g ?? 1,
      z: this.defaultHighlightColor?.b ?? 0,
    };
    return createGuiControlStruct({
      type: typeof this.type === "number" && this.type >= 0 ? this.type : GUIControlType.Panel,
      tag: "",
      parentTag: "",
      parentId: this.parent?.id ?? -1,
      id: 0,
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      includeInnerOffsetY: isTslGuiGame(GameState.GameKey),
      borderColor,
      highlightColor,
      textColor: borderColor,
      includeTypeNests: false,
    });
  }

  initProperties(){
    if(!(this.control instanceof GFFStruct)){
      this.control = this.buildDefaultControl();
    }

    const control = this.control;
    this.type = ( control.hasField('CONTROLTYPE') ? control.getFieldByLabel('CONTROLTYPE')?.getValue() : -1 );
    this.widget.name = this.name = ( control.hasField('TAG') ? control.getFieldByLabel('TAG')?.getValue() : -1 );
    this.id = ( control.hasField('ID') ? control.getFieldByLabel('ID')?.getValue() : -1 );
    this.objectLocked = ( control.hasField('Obj_Locked') ? control.getFieldByLabel('Obj_Locked')?.getValue() : -1 );
    this.objectParent = ( control.hasField('Obj_Parent') ? control.getFieldByLabel('Obj_Parent')?.getValue() : -1 );
    this.objectParentId = ( control.hasField('Obj_ParentID') ? control.getFieldByLabel('Obj_ParentID')?.getValue() : -1 );

    this.padding = ( control.hasField('PADDING') ? control.getFieldByLabel('PADDING')?.getValue() : 0 );

    //Extent — Load (ReadFieldINT)
    this.hasExtent = control.hasField('EXTENT');
    if(this.hasExtent){
      let extent = control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
      if(extent){
        this.extent.top = asExtentInt(extent.getFieldByLabel('TOP')?.getValue());
        this.extent.left = asExtentInt(extent.getFieldByLabel('LEFT')?.getValue());
        this.extent.width = asExtentInt(extent.getFieldByLabel('WIDTH')?.getValue());
        this.extent.height = asExtentInt(extent.getFieldByLabel('HEIGHT')?.getValue());
      }
    }

    //Border
    this.hasBorder = control.hasField('BORDER');
    if(this.hasBorder){
      let border = control.getFieldByLabel('BORDER')?.getChildStructs()[0];
      if(border){
        if(border.hasField('COLOR')){
          let color = border.getFieldByLabel('COLOR')?.getVector();
          if(color && (color.x * color.y * color.z) < 1 ){
            if(this.border.color){
              this.border.color.setRGB(color.x, color.y, color.z);
              this.chrome.material.uniforms.diffuse.value.set(this.border.color);
              this.chrome.material.uniforms.fillDiffuse.value.set(this.border.color);
            }
          }
        }

        if(typeof this.border.color === 'undefined'){
          this.border.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }
  
        this.border.dimension = border.getFieldByLabel('DIMENSION')?.getValue() || 0;
        this.border.corner = border.getFieldByLabel('CORNER')?.getValue();
        this.border.edge = border.getFieldByLabel('EDGE')?.getValue();
        this.border.fill.texture = border.getFieldByLabel('FILL')?.getValue();
        this.border.fillstyle = border.getFieldByLabel('FILLSTYLE')?.getValue() || 0;
        this.border.inneroffset = this.border.inneroffsety = border.getFieldByLabel('INNEROFFSET')?.getValue() || 0;

        if(border.hasField('INNEROFFSETY'))
          this.border.inneroffsety = border.getFieldByLabel('INNEROFFSETY')?.getValue();

        this.border.pulsing = border.getFieldByLabel('PULSING')?.getValue() || 0;
      }

    }

    //Text
    this.hasText = control.hasField('TEXT');
    if(this.hasText){
      let text = control.getFieldByLabel('TEXT')?.getChildStructs()[0];
      if(text){
        this.text.font = text.getFieldByLabel('FONT')?.getValue();
        this.text.strref = text.getFieldByLabel('STRREF')?.getValue();
        this.text.text = ( text.hasField('TEXT') ? this.menu.gameStringParse(text.getFieldByLabel('TEXT')?.getValue()) : '' );
        if(this.text.text == ''){
          this.text.text = this.menu.gameStringParse(GameState.TLKManager.TLKStrings[this.text.strref]?.Value || '');
        }
        this.text.alignment = text.getFieldByLabel('ALIGNMENT')?.getValue();
          this.text.pulsing = text.getFieldByLabel('PULSING')?.getValue() || 0;

        if(this.text.font == 'fnt_d16x16'){
          this.text.font = 'fnt_d16x16b';
        }

        if(text.hasField('COLOR')){
          let color = text.getFieldByLabel('COLOR')?.getVector();
          if(color) this.text.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.text.color === 'undefined'){
          this.text.color = this.defaultColor.clone();
        }
      }
    }

    //Highlight
    this.hasHighlight = control.hasField('HILIGHT');
    if(this.hasHighlight){
      let highlight = control.getFieldByLabel('HILIGHT')?.getChildStructs()[0];
      if(highlight){
        if(highlight.hasField('COLOR')){
          let color = highlight.getFieldByLabel('COLOR')?.getVector();
          if(color && (color.x * color.y * color.z) < 1 ){
            if(this.highlight.color){
              this.highlight.color.setRGB(color.x, color.y, color.z);
              this.chrome.material.uniforms.highlightDiffuse.value.set(this.highlight.color);
            }
          }
        }
  
        if(typeof this.highlight.color === 'undefined'){
          this.highlight.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.highlight.dimension = highlight.getFieldByLabel('DIMENSION')?.getValue() || 0;
        this.highlight.corner = highlight.getFieldByLabel('CORNER')?.getValue() || '';
        this.highlight.edge = highlight.getFieldByLabel('EDGE')?.getValue() || '';
        this.highlight.fill.texture = highlight.getFieldByLabel('FILL')?.getValue() || '';
        this.highlight.fillstyle = highlight.getFieldByLabel('FILLSTYLE')?.getValue() || 0;
        this.highlight.inneroffset = this.highlight.inneroffsety = highlight.getFieldByLabel('INNEROFFSET')?.getValue() || 0;

        if(highlight.hasField('INNEROFFSETY'))
          this.highlight.inneroffsety = highlight.getFieldByLabel('INNEROFFSETY')?.getValue();

        this.highlight.pulsing = highlight.getFieldByLabel('PULSING')?.getValue() || 0;
        this.chrome.material.uniforms.highlightDiffuse.value.copy(this.highlight.color);
      }
    }

    //Moveto — Load (IDs into panel controls; resolved later)
    this.hasMoveTo = control.hasField('MOVETO');
    if(this.hasMoveTo){
      let moveTo = control.getFieldByLabel('MOVETO')?.getChildStructs()[0];
      if(moveTo){
        this.moveTo.down = moveTo.getFieldByLabel('DOWN')?.getValue() ?? 0;
        this.moveTo.left = moveTo.getFieldByLabel('LEFT')?.getValue() ?? 0;
        this.moveTo.right = moveTo.getFieldByLabel('RIGHT')?.getValue() ?? 0;
        this.moveTo.up = moveTo.getFieldByLabel('UP')?.getValue() ?? 0;
      }
    }
  }

  initTextures(){

    const enqueueChrome = (name: string, slot: GUIChromeMapSlot, onReady?: (texture: OdysseyTexture) => void) => {
      if(!name) return;
      this._beginTextureLoad();
      TextureLoader.enQueue(name, this.chrome.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          bindChromeTexture(this.chrome.material, slot, null);
          this.syncChromeEnableFlags();
          this._endTextureLoad();
          return;
        }
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        bindChromeTexture(this.chrome.material, slot, texture);
        onReady?.(texture);
        this.syncChromeEnableFlags();
        // GetBorderDim falls back to edge/corner image size when DIMENSION is 0.
        // Rebuild chrome (and let subclasses remeasure) once that size is known.
        const isFrameSlot =
          slot === 'edgeMap' || slot === 'cornerMap' ||
          slot === 'highlightEdgeMap' || slot === 'highlightCornerMap';
        const dimField = slot.startsWith('highlight') ? this.highlight.dimension : this.border.dimension;
        if(isFrameSlot && !(dimField > 0)){
          this.resizeControl();
          this.onChromeTextureLoaded();
        }
        this._endTextureLoad();
      }, undefined, slot);
    };

    // Enable chrome layers from GFF texture names immediately (do not wait on async load,
    // and do not clear frame when only one of edge/corner is empty).
    this.borderEnabled = !!(this.border.edge || this.border.corner);
    this.borderFillEnabled = !!this.border.fill.texture;
    this.highlightEnabled = !!(this.highlight.edge || this.highlight.corner);
    this.highlightFillEnabled = !!this.highlight.fill.texture;

    //--------//
    // Border
    //--------//

    if(this.border.edge != ''){
      enqueueChrome(this.border.edge, 'edgeMap');
    }else{
      bindChromeTexture(this.chrome.material, 'edgeMap', null);
    }

    if(this.border.corner != ''){
      enqueueChrome(this.border.corner, 'cornerMap');
    }else{
      bindChromeTexture(this.chrome.material, 'cornerMap', null);
    }

    if(this.border.fill.texture != ''){
      enqueueChrome(this.border.fill.texture, 'fillMap');
    }else{
      bindChromeTexture(this.chrome.material, 'fillMap', null);
    }

    //-----------//
    // Highlight
    //-----------//

    if(this.highlight.edge != ''){
      enqueueChrome(this.highlight.edge, 'highlightEdgeMap');
    }else{
      bindChromeTexture(this.chrome.material, 'highlightEdgeMap', null);
    }

    if(this.highlight.corner != ''){
      enqueueChrome(this.highlight.corner, 'highlightCornerMap');
    }else{
      bindChromeTexture(this.chrome.material, 'highlightCornerMap', null);
    }

    if(this.highlight.fill.texture != ''){
      enqueueChrome(this.highlight.fill.texture, 'highlightFillMap');
    }else{
      bindChromeTexture(this.chrome.material, 'highlightFillMap', null);
    }

    this.syncChromeEnableFlags();

    //------//
    // Text
    //------//

    if(this.text.font != ''){
      this.text.material.visible = false;
      this._beginTextureLoad();
      TextureLoader.enQueue(this.text.font, this.text.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.text.font, texture);
          this._endTextureLoad();
          return;
        }

        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        this.text.texture = texture;
        this.text.material.uniforms.map.value = texture;
        this.text.material.uniforms.diffuse = { value: this.text.color };
        this.text.material.alphaTest = 0;
        this.text.material.depthTest = false;
        this.text.material.depthWrite = false;
        this.text.material.transparent = true;
        this.text.material.needsUpdate = true;
        this.guiFont = new GUIFont(texture);
        this.onFontTextureLoaded();
        this.text.material.visible = true;
        this._endTextureLoad();
      });
    }else{
      this.text.material.visible = false;
    }

  }

  isClickable(){
    return (this.eventListeners['click'].length || this.onClick) && this.isVisible() && !this.disableSelection;
  }

  /**
   * GetIsSelectable — mouse hover / click targets are
   * navigable controls (buttons, etc.), not decorative labels (LBLH_*, slot
   * icon LBL_INV_*). Labels only qualify when they actually have click handlers.
   */
  receivesGuiMouseHover(): boolean {
    if(!this.isVisible() || this.disableHover || this.disableSelection){
      return false;
    }
    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUILabel)){
      return this.isClickable();
    }
    return this.allowClick || this.editable || this.isClickable();
  }

  isVisible(){
    return this.widget.visible;
  }

  mouseOver: boolean = false;
  onHoverOut(){
    this.hover = false;
    this.mouseOver = false;
    if(this.disableSelection || this.disableHover){
      return;
    }

    if(typeof this.onMouseOut === 'function')
      this.onMouseOut();

    this.applyChromeHoverState(false);
    this.processEventListener('mouseOut');
    this.setTooltipVisible(false);
    this.list?.markListRttDirty?.();
  }

  onHoverIn(){
    this.mouseOver = true;
    if(this.disableSelection || this.disableHover){
      this.hover = false;
      return;
    }

    if(!this.hover && typeof this.onHover === 'function')
      this.onHover();

    this.hover = true;

    if(typeof this.onMouseIn === 'function')
      this.onMouseIn();

    this.applyChromeHoverState(true);

    if(this.isClickable()){
      GameState.guiAudioEmitter.playSoundFireAndForget('gui_scroll');
    }

    this.processEventListener('hover');
    this.processEventListener('mouseIn');
    this.list?.markListRttDirty?.();
    
    // this.setTooltipVisible(true);
  }

  /** Drive chrome hovered/hoverMode uniforms from control hover state. */
  protected applyChromeHoverState(hovered: boolean){
    if(!this.chrome?.material) return;
    const u = this.chrome.material.uniforms;
    u.hoverMode.value = this.swapBorderAndHighlightOnHover
      ? GUI_HOVER_MODE_SWAP
      : GUI_HOVER_MODE_OVERLAY;
    const hasHighlightAssets = this.highlight.edge != '' || this.highlight.fill.texture != '';
    if(hovered){
      if(this.swapBorderAndHighlightOnHover){
        u.hovered.value = hasHighlightAssets ? 1 : 0;
      }else{
        u.hovered.value = 1;
      }
      if(hasHighlightAssets){
        // Use GFF HILIGHT COLOR (e.g. K1 saveload ~off-white), not engine default yellow.
        u.highlightDiffuse.value.copy(this.highlight.color);
      }
    }else{
      u.hovered.value = 0;
    }
    this.syncChromeEnableFlags();
    this.chrome.material.uniformsNeedUpdate = true;
  }

  protected syncChromeEnableFlags(){
    if(!this.chrome?.material) return;
    const u = this.chrome.material.uniforms;
    const hovered = u.hovered.value > 0.5;
    const swap = this.swapBorderAndHighlightOnHover;
    let enableFrame: number;
    let enableFill: number;
    if(hovered && swap){
      enableFrame = this.highlightEnabled ? 1 : 0;
      enableFill = this.highlightFillEnabled ? 1 : 0;
    }else{
      enableFrame = this.borderEnabled ? 1 : 0;
      enableFill = this.borderFillEnabled ? 1 : 0;
    }
    const flagsChanged = u.enableFrame.value !== enableFrame || u.enableFill.value !== enableFill;
    if(flagsChanged){
      u.enableFrame.value = enableFrame;
      u.enableFill.value = enableFill;
    }
    if(this.chrome.mesh){
      const drawChrome = enableFrame !== 0 || enableFill !== 0;
      if(this.chrome.mesh.visible !== drawChrome){
        this.chrome.mesh.visible = drawChrome;
        if(!drawChrome){
          RenderPerfStats.noteGuiEmptyDrawSkipped();
        }
      }
    }
  }

  /** Hide text mesh when geometry has no indices (Spector empty draws). */
  protected syncTextMeshVisibility(){
    if(!this.text?.mesh) return;
    const count = this.text.geometry?.index?.count ?? 0;
    const show = count > 0;
    if(this.text.mesh.visible !== show){
      this.text.mesh.visible = show;
      if(!show){
        RenderPerfStats.noteGuiEmptyDrawSkipped();
      }
    }
  }

  onFontTextureLoaded(){
    this.buildText();
    if (this.list) {
      this.invalidateListRtt();
    }
  }

  /**
   * Called when a border/hilight edge or corner texture finishes loading and
   * DIMENSION was 0 (GetBorderDim texture-size fallback). Default
   * rebuilds chrome via the caller; subclasses may remeasure extents.
   */
  protected onChromeTextureLoaded(): void {
    // no-op — MessageItem re-syncs LabelHilight row height
  }

  resizeControl(){

    try{
      this.buildChrome();
    }catch(e: any){
      //Must not have a border
    }

  }

  createControl(){

    if(this.widget instanceof THREE.Object3D && this.widget.parent){
      this.widget.parent.remove(this.widget);
    }
    
    //if(this.parent === undefined){
    // this.widget.add(this.menu.backgroundSprite);
    //}

    this.buildChrome();
    this.applyChromeHoverState(false);
    
    this._onCreate();
    //Calculate the widget screen position
    this.calculatePosition();
    this.buildChildren();

    //Load any textures in the queue
    TextureLoader.LoadQueue();
    return this.widget;

  }

  buildChildren(){

    if(!(this.menu))
      return false;

    if(!(this.menu.tGuiPanel.control instanceof GFFStruct))
      return false;

    if(this.menu.tGuiPanel.control.hasField('CONTROLS')){
      let children = this.menu.tGuiPanel.control.getFieldByLabel('CONTROLS')?.getChildStructs() || [];
      
      for(let i = 0; i < children.length; i++){
        let childParent = ( children[i].hasField('Obj_Parent') ? children[i].getFieldByLabel('Obj_Parent')?.getValue() : '' );
        if(childParent == this.name){

          const control: GUIControl = this.menu.factory.FromStruct(children[i], this.menu, this, this.scale);

          control.zIndex = this.zIndex+1;

          this.children.push(control);

          let _cWidget = control.createControl();
          _cWidget.position.z = control.zIndex;
          commitGuiTransform(_cWidget);
          
          //this.widget.add(_cWidget);
          this.menu.tGuiPanel.widget.add(_cWidget);

        }
      }

    }
  }

  reattach(parent: GUIControl){
    if(typeof this.parent != 'undefined'){
      this.parent.widget.remove(this.widget);
    }
    
    this.parent = parent;
    this.parent.widget.add(this.widget);
  }

  getControl(){
    return this.widget;
  }

  hide(){
    this.widget.visible = false;
  }

  show(){
    this.updateWorldPosition();
    this.widget.visible = true;
  }

  /**
   * Whether this control needs continuous opacity animation.
   * pulses only via GFF PULSING / SetPulsingAlpha — not hover or selected alone.
   */
  wantsPulseAnimation(): boolean {
    return !!(
      this._pulsing ||
      this.runtimePulseEdge ||
      this.runtimePulseFill ||
      (this.border.pulsing | 0) ||
      (this.highlight.pulsing | 0) ||
      (this.text.pulsing | 0)
    );
  }

  /**
   * (enable, pulseEdge, pulseFill).
   * Edge/fill map to Draw bits (GFF PULSING bit0 / bit1). Prefer this when edge and
   * fill must differ (HUD icons are fill-only; key-capture is both).
   */
  setPulsingAlpha(
    enable: boolean | number,
    pulseEdge: boolean | number = true,
    pulseFill: boolean | number = true,
  ){
    const on = !!enable;
    this._pulsing = on;
    this.runtimePulseEdge = on && !!pulseEdge;
    this.runtimePulseFill = on && !!pulseFill;
  }

  update(delta: number){
    const opacity = this.disableSelection ? 0.5 : 1;
    // : m_fPulsingAlpha when enable + edge/fill bits set.
    // GFF PULSING → SetPulsingAlpha(nonzero, bit0, bit1): bit0 = edges/corners, bit1 = fill.
    // Runtime flags from `pulsing = true` / setPulsingAlpha; GFF bits still apply.
    const borderFlags = this.border.pulsing | 0;
    const highlightFlags = this.highlight.pulsing | 0;
    const textFlags = this.text.pulsing | 0;
    const hovered = this.chrome?.material?.uniforms?.hovered?.value > 0.5;
    const swap = this.swapBorderAndHighlightOnHover;
    const useHighlightPulse = hovered && swap;
    const pulseEdge =
      this.runtimePulseEdge ||
      !!((useHighlightPulse ? highlightFlags : borderFlags) & 1);
    const pulseFill =
      this.runtimePulseFill ||
      !!((useHighlightPulse ? highlightFlags : borderFlags) & 2);
    const pulseText = this._pulsing || !!textFlags;

    if(pulseEdge || pulseFill || pulseText){
      const pulseAlpha = GameState.MenuManager.pulseOpacity * opacity;
      const solidAlpha = opacity;

      if(this.chrome?.material){
        this.chrome.material.uniforms.edgeOpacity.value = pulseEdge ? pulseAlpha : solidAlpha;
        this.chrome.material.uniforms.fillOpacity.value = pulseFill ? pulseAlpha : solidAlpha;
        this.chrome.material.uniforms.opacity.value = 1;
        this.chrome.material.uniformsNeedUpdate = true;
      }

      if(this.text.material){
        this.text.material.uniforms.opacity.value = pulseText ? pulseAlpha : solidAlpha;
      }
    }else{
      this.resetPulse();
    }

    this.syncChromeEnableFlags();

    let len = this.children.length;
    for(let i = 0; i < len; i++){
      this.children[i].update(delta);
    }

    //Tooltip timer
    this.tooltipTimer = (this.mouseOver ? this.tooltipTimer + (1000 *delta) : 0);
    if(this.tooltipTimer > 3000 && this.tooltipText != ''){
      this.setTooltipVisible(true);
    }
  }

  resetPulse(){
    const opacity = this.disableSelection ? 0.5 : 1;
    if(this.chrome?.material){
      this.chrome.material.uniforms.edgeOpacity.value = 1 * opacity;
      this.chrome.material.uniforms.fillOpacity.value = 1 * opacity;
      this.chrome.material.uniforms.opacity.value = 1;
      this.chrome.material.uniformsNeedUpdate = true;
    }

    if(this.text.material){
      this.text.material.uniforms.opacity.value = 1 * opacity;
      this.setTextColor(this.text.color.r, this.text.color.g, this.text.color.b);
    }
    
    if(this.disableSelection || this.disableHover){
      this.applyChromeHoverState(false);
    }
  }

  setHovering(bState: boolean = false){
    this.hovering = bState;
  }

  hideBorder(){
    this.borderEnabled = false;
    this.borderFillEnabled = false;
    this.syncChromeEnableFlags();
  }

  showBorder(){
    this.borderEnabled = !!(this.border.edge || this.border.corner);
    this.borderFillEnabled = !!this.border.fill.texture;
    this.syncChromeEnableFlags();
  }

  hideHighlight(){
    if(this.chrome?.material){
      this.chrome.material.uniforms.hovered.value = 0;
      this.chrome.material.uniformsNeedUpdate = true;
    }
    this.syncChromeEnableFlags();
  }

  showHighlight(){
    if(this.chrome?.material){
      this.chrome.material.uniforms.hovered.value = 1;
      this.chrome.material.uniforms.highlightDiffuse.value.copy(this.highlight.color);
      this.chrome.material.uniformsNeedUpdate = true;
    }
    this.highlightEnabled = !!(this.highlight.edge || this.highlight.corner);
    this.highlightFillEnabled = !!this.highlight.fill.texture;
    this.syncChromeEnableFlags();
  }

  hideFill(){
    this.borderFillEnabled = false;
    this.syncChromeEnableFlags();
  }

  showFill(){
    this.borderFillEnabled = !!this.border.fill.texture;
    this.syncChromeEnableFlags();
  }

  hideHighlightFill(){
    this.highlightFillEnabled = false;
    this.syncChromeEnableFlags();
  }

  showHighlightFill(){
    this.highlightFillEnabled = !!this.highlight.fill.texture;
    this.syncChromeEnableFlags();
  }

  setBorderColor(r = 1, g = 1, b = 1){
    this.border.color.setRGB(r, g, b);
    this.chrome.material.uniforms.diffuse.value.setRGB(r, g, b);
    this.chrome.material.uniformsNeedUpdate = true;
  }

  setHighlightColor(r = 1, g = 1, b = 1){
    this.highlight.color.setRGB(r, g, b);
    this.chrome.material.uniforms.highlightDiffuse.value.setRGB(r, g, b);
    this.chrome.material.uniformsNeedUpdate = true;
  }

  setChromeOpacity(edgeAlpha: number, fillAlpha?: number){
    if(!this.chrome?.material) return;
    this.chrome.material.uniforms.edgeOpacity.value = edgeAlpha;
    this.chrome.material.uniforms.fillOpacity.value = fillAlpha ?? edgeAlpha;
    this.chrome.material.uniformsNeedUpdate = true;
  }

  setTextColor(r = 1, g = 1, b = 1){
    //0.0, 0.658824, 0.980392
    this.text.color.setRGB(r, g, b);
    this.text.material.uniforms.diffuse.value = this.text.color;
    this.text.material.needsUpdate = true;
  }

  /*setText(text = '', renderOrder){
    //0.0, 0.658824, 0.980392
    if(typeof this.text.geometry != 'undefined'){
      this.text.geometry.update(text);
    }
  }*/

  /**
   * @deprecated Fill is a chrome region, not a separate mesh. Prefer setFillTexture /
   * setFillOpaque / setChromeBlending / markChromeNeedsUpdate. Still returns chrome.mesh
   * for legacy mesh-transform callers (e.g. timing bar).
   */
  getFill(): THREE.Mesh {
    return this.chrome.mesh;
  }

  /**
   * Solid vs alpha GUI fill. Chrome must stay on the transparent pass —
   * renderPassGUI composites with needsSwap:false over the prior color
   * buffer, and opaque/NoBlending meshes are dropped there (PORTCUST /
   * mainmenu LBL_3DView went black when transparent was forced false).
   */
  setFillOpaque(opaque: boolean){
    if(!this.chrome?.material) return;
    this.chrome.material.transparent = true;
    this.chrome.material.visible = true;
    if(this.chrome.material.uniforms?.fillOpacity){
      this.chrome.material.uniforms.fillOpacity.value = 1;
    }
    // opaque=true: NormalBlending solid RTT; false: keep default blending
    // for alpha PNGs. Both remain transparent=true for the GUI pass.
    if(opaque){
      this.chrome.material.blending = THREE.NormalBlending;
    }
    this.chrome.material.needsUpdate = true;
  }

  setChromeBlending(mode: number){
    if(!this.chrome?.material) return;
    this.chrome.material.blending = mode;
    this.chrome.material.needsUpdate = true;
  }

  markChromeNeedsUpdate(){
    if(!this.chrome?.material) return;
    this.chrome.material.needsUpdate = true;
    this.chrome.material.uniformsNeedUpdate = true;
  }

  setHighlightFillTexture(map: THREE.Texture){
    if(!(map instanceof THREE.Texture)){
      map = TextureLoader.textures.get('fx_static');
    }

    bindChromeTexture(this.chrome.material, 'highlightFillMap', map instanceof THREE.Texture ? map : null);
    this.highlightFillEnabled = map instanceof THREE.Texture;
    this.syncChromeEnableFlags();
  }

  setFillColor(r = 1, g = 1, b = 1){
    this.chrome.material.uniforms.fillDiffuse.value.setRGB(r, g, b);
    this.chrome.material.uniformsNeedUpdate = true;
  }

  getFillTexture(){
    return this.chrome.material.uniforms.fillMap.value;
  }

  setFillTexture(map: THREE.Texture){
    
    if(!(map instanceof THREE.Texture)){
      map = TextureLoader.textures.get('fx_static');
    }

    bindChromeTexture(this.chrome.material, 'fillMap', map instanceof THREE.Texture ? map : null);
    this.borderFillEnabled = map instanceof THREE.Texture;
    this.syncChromeEnableFlags();
  }

  getFillTextureName(){
    return this.border.fill.texture;
  }

  clearFillTexture(){
    this.border.fill.texture = '';
    this.highlight.fill.texture = '';
    if(this.chrome?.material){
      bindChromeTexture(this.chrome.material, 'fillMap', null);
      bindChromeTexture(this.chrome.material, 'highlightFillMap', null);
    }
    this.borderFillEnabled = false;
    this.highlightFillEnabled = false;
    this.syncChromeEnableFlags();
  }

  async setFillTextureName(
    name = '',
    bUpdateHighlight = true,
    opts?: { transparent?: boolean },
  ): Promise<OdysseyTexture | void> {
    this.border.fill.texture = name;
    this.borderFillEnabled = !!name.length;
    if(!name.length){
      this.clearFillTexture();
      return;
    }

    if(bUpdateHighlight) this.highlightFillEnabled = true;
    if(bUpdateHighlight) this.highlight.fill.texture = name;
    this._beginTextureLoad();
    return new Promise<OdysseyTexture | void>((resolve) => {
      TextureLoader.enQueue(this.border.fill.texture, this.chrome.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        this.setFillTexture(texture);
        if(bUpdateHighlight) this.setHighlightFillTexture(texture);
        if(opts?.transparent !== undefined){
          this.setFillOpaque(!opts.transparent);
        }
        this._endTextureLoad();
        resolve(texture);
      }, undefined, 'fillMap');
    });
  }

  setMaterialTexture(material: THREE.ShaderMaterial, texture: THREE.Texture|null){
    if(!(material instanceof THREE.ShaderMaterial))
      return false;

    if(texture == undefined)
      texture = null;

    // Chrome materials use named map slots; map material identity to the fill slot.
    if(material === this.chrome?.material){
      bindChromeTexture(material, 'fillMap', texture);
      this.borderFillEnabled = texture instanceof THREE.Texture;
      this.syncChromeEnableFlags();
      return true;
    }

    TextureLoader.assignMaterialTexture(material, texture, 'map');

    if(texture instanceof THREE.Texture){
      material.visible = true;
      material.uniforms.opacity.value = 1;
      material.defines.USE_UV = '';
      material.defines.USE_MAP = '';
    }else{
      material.visible = false;
    }

    material.needsUpdate = true;
    material.uniformsNeedUpdate = true;
    material.visible = (texture instanceof THREE.Texture);
    return true;
  }

  /**
   * Vertically flip the chrome fill (action-panel down arrows, etc.).
   * Odyssey-gui chrome samples fill maps with raw vUv, so this sets the
   * fillFlipY uniform rather than texture.repeat (which the shader ignores).
   */
  flipY(flip = true){
    const u = this.chrome?.material?.uniforms;
    if(u?.fillFlipY){
      u.fillFlipY.value = flip ? 1 : 0;
      this.chrome.material.uniformsNeedUpdate = true;
    }
  }

  /**
   * Centered Y-up UI mouse as ints (same space as widget.position / box).
   */
  getCenteredUIMouseInt(): { x: number; y: number } {
    const vpW = asExtentInt(ResolutionManager.getViewportWidth());
    const vpH = asExtentInt(ResolutionManager.getViewportHeight());
    return {
      x: asExtentInt(Mouse.positionViewportInt.x) - truncDiv(vpW, 2),
      y: truncDiv(vpH, 2) - asExtentInt(Mouse.positionViewportInt.y),
    };
  }

  /**
   * Panel-local mouse (top-left Y-down ints) for this control's menu root panel.
   *
   * Matches our Three.js projection: panel design rect is centered in the viewport
   * (and optionally scaled / offset on the root widget). This is GetLocalMouseCoords
   * with CenterInViewport when UseExtentOffset is set; letterbox path when cleared.
   *
   * `tGuiPanel.offset` (MenuTop offset.y=198, CharGen offset.x/y, …) moves the widget in
   * centered Y-up space; subtract it here so hitCheckMouseLocal extents track the translate.
   */
  getPanelLocalMouse(): { x: number; y: number } {
    const panel = this.menu?.tGuiPanel;
    const extent = panel?.extent ?? this.extent;
    const flags = this.menu?.panelCoordFlags ?? (
      GUIPanelCoordFlags.UseExtentOffset | GUIPanelCoordFlags.CenterInViewport
    );
    const vpW = asExtentInt(ResolutionManager.getViewportWidth());
    const vpH = asExtentInt(ResolutionManager.getViewportHeight());
    const offsetX = asExtentInt(panel?.offset?.x ?? 0);
    const offsetY = asExtentInt(panel?.offset?.y ?? 0);

    // 640×480 letterbox path (bit0 clear)
    if ((flags & GUIPanelCoordFlags.UseExtentOffset) === 0) {
      return applyPanelOffsetToLetterboxLocal(
        getLocalMouseCoords(
          extent,
          Mouse.positionViewportInt.x,
          Mouse.positionViewportInt.y,
          vpW,
          vpH,
          flags,
          GameState.GameKey,
        ),
        offsetX,
        offsetY,
      );
    }

    // Inverse of centered (and scaled) Three.js GUI projection → panel-local ints
    let { x: uiX, y: uiY } = this.getCenteredUIMouseInt();
    const scale = this.menu?.scale ?? 1;
    if (scale !== 0 && scale !== 1) {
      uiX = asExtentInt(uiX / scale);
      uiY = asExtentInt(uiY / scale);
    }

    return panelLocalFromCenteredUI(uiX, uiY, extent, offsetX, offsetY);
  }

  /**
   * HitCheckMouse — inclusive int AABB.
   * List rows store extents in list viewport-local space (HitCheckMouseLocal).
   * Row mouse is derived from the list world/UI box so viewport-docked lists
   * (dialog LB_REPLIES) still pick correctly when extent.left/top are not panel-local.
   * Nested children of a list row keep parent-local extents — compose with ancestor
   * row extents before HitCheckMouseLocal (feat/power skill-flow slots).
   * Anchored HUD controls are viewport-pinned; test their integer world box instead.
   *
   * Nested Obj_Parent children may extend outside this control's AABB (abchrgen /
   * skchrgen: STR_POINTS_BTN → STR_PLUS_BTN / STR_LBL). HitCheckMouse
   * walks a flat panel control list, so those children are tested directly.
   * With a nested children tree, treat descendant hits as a hit on this control so
   * {@link getActiveControls} can recurse into the branch and prefer the child.
   */
  hitCheckMouse(localX: number, localY: number): boolean {
    if (this.list) {
      const list = this.list;
      const ui = this.getCenteredUIMouseInt();
      const listLocal = listLocalFromWorldBox(
        ui.x,
        ui.y,
        list.box.min.x,
        list.box.min.y,
        list.box.max.y,
      );
      const borderSize = asExtentInt(list.getBorderSize());
      const shrink = asExtentInt(list.getShrinkWidth());
      const viewportX = list.isScrollBarLeft() ? borderSize + shrink : borderSize;
      const viewportY = borderSize;
      const vx = listLocal.x - viewportX;
      const vy = listLocal.y - viewportY;

      // Nested under a list row: extent is parent-local, not list-viewport-local.
      if (this.parent && this.parent !== list) {
        let left = asExtentInt(this.extent.left);
        let top = asExtentInt(this.extent.top);
        let ancestor: GUIControl | undefined = this.parent;
        while (ancestor && ancestor !== list) {
          left += asExtentInt(ancestor.extent.left);
          top += asExtentInt(ancestor.extent.top);
          ancestor = ancestor.parent;
        }
        return hitCheckMouseLocal(
          {
            left,
            top,
            width: asExtentInt(this.extent.width),
            height: asExtentInt(this.extent.height),
          },
          vx,
          vy,
        );
      }

      return hitCheckMouseLocal(this.extent, vx, vy);
    }
    if (this.anchor && this.anchor !== Anchor.None) {
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
    if (hitCheckMouseLocal(this.extent, localX, localY)) {
      return true;
    }
    for (let i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i].hitCheckMouse(localX, localY)) {
        return true;
      }
    }
    return false;
  }

  calculatePosition(){
    if(!this.autoCalculatePosition || this.list)
      return;

    let parentExtent = { width: this.menu.width, height: this.menu.height };

    if( this.parent && this.parent != this.menu.tGuiPanel && !this.scale){
      parentExtent = this.menu.tGuiPanel.extent;
      const parentW = asExtentInt(parentExtent.width);
      const parentH = asExtentInt(parentExtent.height);
      const posX = asExtentInt(this.extent.left) - truncDiv(parentW - asExtentInt(this.extent.width), 2);
      const posY = asExtentInt(this.extent.top) - truncDiv(parentH - asExtentInt(this.extent.height), 2);

      this.widget.position.x = asExtentInt(this.offset.x + posX);
      this.widget.position.y = asExtentInt(-posY + this.offset.y);
      commitGuiTransform(this.widget);

      this.updateBounds();
      return;
    }

    const parentW = asExtentInt(parentExtent.width);
    const parentH = asExtentInt(parentExtent.height);
    const centered = extentToCenteredPosition(this.extent, parentW, parentH);
    this.anchorOffset = new THREE.Vector2(centered.x, centered.y);

    const vpW = asExtentInt(ResolutionManager.getViewportWidth());
    const vpH = asExtentInt(ResolutionManager.getViewportHeight());
    const w = asExtentInt(this.extent.width);
    const h = asExtentInt(this.extent.height);
    const left = asExtentInt(this.extent.left);
    const top = asExtentInt(this.extent.top);
    // HUD right/bottom dock previously hardcoded 800×600; use panel design size (often 800×600).
    const designW = parentW > 0 ? parentW : GUI_DESIGN_WIDTH;
    const designH = parentH > 0 ? parentH : GUI_DESIGN_HEIGHT;

    // Auto-dock HUD controls from design-canvas quadrants (no magic quatX=25).
    if(this.scale && this.anchor == Anchor.None){
      if(!(left == 0 && top == 0)){
        const cx = left + truncDiv(w, 2);
        const cy = top + truncDiv(h, 2);
        const midX = truncDiv(designW, 2);
        const midY = truncDiv(designH, 2);
        const bandLeft = truncDiv(designW, 3);
        const bandRight = designW - truncDiv(designW, 3);
        const isTop = cy < midY;
        let horiz: 'left' | 'center' | 'right';
        if(cx >= bandLeft && cx < bandRight){
          horiz = 'center';
        }else if(cx < midX){
          horiz = 'left';
        }else{
          horiz = 'right';
        }
        if(isTop){
          this.anchor = horiz === 'left' ? Anchor.TopLeft
            : horiz === 'center' ? Anchor.TopCenter
            : Anchor.TopRight;
        }else{
          this.anchor = horiz === 'left' ? Anchor.BottomLeft
            : horiz === 'center' ? Anchor.BottomCenter
            : Anchor.BottomRight;
        }
      }
    }

    switch(this.anchor){
      case Anchor.TopLeft:
        this.anchorOffset.x = -truncDiv(vpW, 2) + truncDiv(w, 2) + left;
        this.anchorOffset.y = truncDiv(vpH, 2) - (top + truncDiv(h, 2));
      break;
      case Anchor.TopCenter:
        this.anchorOffset.y = truncDiv(vpH, 2) - (top + truncDiv(h, 2));
      break;
      case Anchor.TopRight:
        this.anchorOffset.x = truncDiv(vpW, 2) + truncDiv(w, 2) + (left - designW);
        this.anchorOffset.y = truncDiv(vpH, 2) - (top + truncDiv(h, 2));
      break;
      case Anchor.BottomLeft:
        this.anchorOffset.x = -truncDiv(vpW, 2) + truncDiv(w, 2) + left;
        this.anchorOffset.y = -(truncDiv(vpH, 2) - (designH - top) + truncDiv(h, 2));
      break;
      case Anchor.BottomCenter:
        this.anchorOffset.y = -(truncDiv(vpH, 2) - (designH - top) + truncDiv(h, 2));
      break;
      case Anchor.BottomRight:
        this.anchorOffset.x = truncDiv(vpW, 2) + truncDiv(w, 2) + (left - designW);
        this.anchorOffset.y = -(truncDiv(vpH, 2) - (designH - top) + truncDiv(h, 2));
      break;
      case Anchor.User: {
        this.anchorOffset.x = -truncDiv(vpW, 2) + left + truncDiv(w, 2);
        this.anchorOffset.y = truncDiv(vpH, 2) - top - truncDiv(h, 2);
      } break;
      default:
        this.anchorOffset = new THREE.Vector2(centered.x, centered.y);
      break;
    }

    this.widget.position.x = asExtentInt(this.anchorOffset.x + this.offset.x);
    this.widget.position.y = asExtentInt(this.anchorOffset.y + this.offset.y);
    commitGuiTransform(this.widget);

    this.updateBounds();
  }

  /**
   * Clear hover on this control and descendants (occluded sibling subtrees).
   */
  clearHoverTree(){
    this.menu?.setWidgetHoverActive(this, false);
    for(let i = 0; i < this.children.length; i++){
      this.children[i].clearHoverTree();
    }
  }

  /**
   * HitCheckMouse — walk children reverse (topmost
   * first) and return only the first hit branch. Overlapping siblings do not both
   * receive hover/click.
   */
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

    const childHit: boolean[] = new Array(this.children.length);
    const childSelectable: boolean[] = new Array(this.children.length);
    for(let i = 0; i < this.children.length; i++){
      childHit[i] = this.children[i].hitCheckMouse(localX, localY);
      childSelectable[i] = this.children[i].receivesGuiMouseHover();
    }
    const topmost = selectTopmostHitChildIndex(childHit, childSelectable);

    let controls: GUIControl[] = [];
    for(let i = 0; i < this.children.length; i++){
      const control = this.children[i];
      if(i === topmost){
        if(control.receivesGuiMouseHover() || control.editable){
          controls.push(control);
        }
        controls = controls.concat( control.getActiveControls(localX, localY) );
      }else{
        // Miss or occluded — clear mouse hover. Sticky LBLH_* (direct onHoverIn,
        // not in activeControls) are left alone by setWidgetHoverActive(false).
        control.clearHoverTree();
      }
    }
    
    return controls;
  }

  updateBounds(){
    let worldPosition: THREE.Vector3 = new THREE.Vector3;
    const w = asExtentInt(this.extent.width);
    const h = asExtentInt(this.extent.height);
    if(this.list){
      worldPosition.copy(this.parent.widget.position.clone());
      // RTT content is drawn on list.targetMesh, which may be shifted for the scrollbar
      const rtt = (this.list as any).targetMesh as THREE.Mesh | undefined;
      const ox = asExtentInt(rtt?.position?.x ?? 0);
      const oy = asExtentInt(rtt?.position?.y ?? 0);
      const wx = asExtentInt(this.widget.position.x);
      const wy = asExtentInt(this.widget.position.y);
      const px = asExtentInt(worldPosition.x);
      const py = asExtentInt(worldPosition.y);
      this.box.min.x = wx - truncDiv(w, 2) + px + ox;
      this.box.min.y = wy - truncDiv(h, 2) + py + oy;
      this.box.max.x = wx + centeredExtentMax(w) + px + ox;
      this.box.max.y = wy + centeredExtentMax(h) + py + oy;
      
      for(let i = 0; i < this.children.length; i++){
        this.children[i].updateBounds();
      }
    }else{
      this.widget.getWorldPosition(worldPosition);
      const scale = this.menu?.scale ?? 1;
      const bw = asExtentInt(w * scale);
      const bh = asExtentInt(h * scale);
      const cx = asExtentInt(worldPosition.x);
      const cy = asExtentInt(worldPosition.y);
      this.box.min.set(cx - truncDiv(bw, 2), cy - truncDiv(bh, 2));
      this.box.max.set(cx + centeredExtentMax(bw), cy + centeredExtentMax(bh));
    }
  }

  updateScale(){
    this.updateBounds();
    for(let i = 0; i < this.children.length; i++){
      if(this.children[i] instanceof GUIControl)
        this.children[i].updateScale();
    }
  }

  recalculate(){
    this.calculatePosition();
    this.updateBounds();
    for(let i = 0; i < this.children.length; i++){
      this.children[i].recalculate();
    }
  }

  getControlExtent(){
    let parentExtent = { width: this.menu.width, height: this.menu.height };

    let left = asExtentInt(this.extent.left) - truncDiv(asExtentInt(parentExtent.width) - asExtentInt(this.extent.width), 2);
    let top = -asExtentInt(this.extent.top) + truncDiv(asExtentInt(parentExtent.height) - asExtentInt(this.extent.height), 2);

    // SetExtent: only shift content left when scrollbar is on the left
    const shrinkWidth = asExtentInt(this.getShrinkWidth());
    if (shrinkWidth && this.flipLeft()) {
      left += shrinkWidth;
    }

    return {
      top: top,
      left: left,
      width: asExtentInt(this.extent.width),
      height: asExtentInt(this.extent.height),
    };
  }

  /**
   * Text layout box — sets GUI text extent from border GetInnerExtent
   * (Label/EditBox). Buttons / hilight-labels use the
   * intersection of border + hilight GetInnerExtent (SetExtent).
   * Both rects are centered on the control, so intersecting sizes is enough.
   */
  getInnerSize(){
    const ew = asExtentInt(this.extent.width);
    const eh = asExtentInt(this.extent.height);

    const borderInner = borderInnerExtent({
      width: ew,
      height: eh,
      dimension: this.getBorderSize(),
      innerOffset: asExtentInt(this.border.inneroffset || 0),
      innerOffsetY: asExtentInt(this.border.inneroffsety ?? this.border.inneroffset ?? 0),
    });

    if(this.hasHighlight){
      const hilightInner = borderInnerExtent({
        width: ew,
        height: eh,
        dimension: this.getHighlightSize(),
        innerOffset: asExtentInt(this.highlight.inneroffset || 0),
        innerOffsetY: asExtentInt(this.highlight.inneroffsety ?? this.highlight.inneroffset ?? 0),
      });
      return {
        width: Math.min(borderInner.width, hilightInner.width),
        height: Math.min(borderInner.height, hilightInner.height),
      };
    }

    return borderInner;
  }

  getOuterSize(){
    let extent = this.getControlExtent();
    return {
      top: extent.top,
      left: extent.left,
      width: extent.width,
      height: extent.height
    };
  }

  flipLeft(): boolean {
    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIListBox) && (this as any).isScrollBarLeft()){
      return true;
    }
    return false;
  }

  /** Three.js rejects zero scale; apply only after int layout math. */
  private static readonly MESH_EPS = 1e-5;

  private meshSize(n: number): number {
    return n > 0 ? n : GUIControl.MESH_EPS;
  }

  /**
   * Center-fill image size — Draw fill pass.
   *
   * Draw sizes the fill to the hole inside the corner/edge tiles (w−2·dim × h−2·dim),
   * not GetInnerExtent. INNEROFFSET expands text/viewport only ({@link getInnerSize});
   * applying it here made thick-border fills (e.g. character BTN_AUTO) cover the frame.
   * Uses the same clamped chrome frame dim as the border quads so fill shrinks when
   * the frame grows, and becomes 0 when the frame consumes the control.
   * Scrollbar shrink (listbox SetExtent) is subtracted after, separately.
   */
  getFillExtent(){
    const extent = this.getControlExtent();
    const shrinkWidth = asExtentInt(this.getShrinkWidth());
    const ew = asExtentInt(this.extent.width);
    const eh = asExtentInt(this.extent.height);
    const dim = clampFrameDim(this.getChromeFrameSize(), ew, eh);

    const hole = borderInnerExtent({
      width: ew,
      height: eh,
      dimension: dim,
      innerOffset: 0,
      applyInnerOffset: false,
    });

    // Scrollbar shrink (listbox SetExtent) is content-width only, applied after.
    const width = Math.max(0, hole.width - shrinkWidth);
    const height = Math.max(0, hole.height);

    return {
      top: extent.top,
      left: extent.left,
      // Logical 0 when frame consumes the hole (mesh eps applied only at geometry build).
      width,
      height,
    };
  }

  getBorderSize(){
    const u = this.chrome?.material?.uniforms;
    return odysseyBorderDim(
      this.border.dimension || 0,
      chromeTextureGuiSize(u?.edgeMap?.value),
      chromeTextureGuiSize(u?.cornerMap?.value),
    );
  }

  getHighlightSize(){
    const u = this.chrome?.material?.uniforms;
    return odysseyBorderDim(
      this.highlight.dimension || 0,
      chromeTextureGuiSize(u?.highlightEdgeMap?.value),
      chromeTextureGuiSize(u?.highlightCornerMap?.value),
    );
  }

  /**
   * Frame thickness for the single chrome mesh.
   * When idle border has no edge/corner (K1 saveload buttons) but highlight does,
   * use highlight DIMENSION so hover boxlines are sized correctly. Otherwise take
   * the max so both visual states fit the same geometry. Clamped to half the
   * control so oversized dims leave fill=0 and the frame takes remaining space.
   */
  getChromeFrameSize(){
    return clampFrameDim(
      chromeFrameDimension(
        this.getBorderSize(),
        this.getHighlightSize(),
        !!(this.border.edge || this.border.corner),
        !!(this.highlight.edge || this.highlight.corner),
      ),
      this.extent.width,
      this.extent.height,
    );
  }

  getShrinkWidth() {
    let shrinkWidth = 0;
    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIListBox)){
      const lb = this as any;
      // SetExtent: content width -= scrollbar.extent.width only
      if (lb.scrollbar?.extent?.width) {
        shrinkWidth = lb.scrollbar.extent.width;
      }
    }
    return shrinkWidth;
  }

  /**
   * Border edge/corner quads in widget-local space (ints).
   * Draw uses int left/top/width/height.
   */
  getBorderExtent(side: string){
    return this.getFrameExtent(side, this.getBorderSize());
  }

  getHighlightExtent(side: string){
    return this.getFrameExtent(side, this.getHighlightSize());
  }

  /** Frame quads for the shared chrome mesh (may use highlight dim — see {@link getChromeFrameSize}). */
  getChromeFrameExtent(side: string){
    return this.getFrameExtent(side, this.getChromeFrameSize());
  }

  private getFrameExtent(side: string, frameSize: number){
    const shrinkWidth = asExtentInt(this.getShrinkWidth());
    const ew = asExtentInt(this.extent.width);
    const eh = asExtentInt(this.extent.height);
    const dim = clampFrameDim(frameSize, ew, eh);

    let innerW = Math.max(0, ew - dim);
    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIProtoItem)){
      innerW = Math.min(ew, innerW);
    }

    const extent = borderSideExtent({
      width: ew,
      height: eh,
      dimension: dim,
      side,
      shrinkWidth,
      innerW,
    });

    return {
      top: extent.top,
      left: extent.left + (this.flipLeft() ? shrinkWidth : 0),
      width: this.meshSize(extent.width),
      height: this.meshSize(extent.height)
    };
  }

  /** Build the single chrome mesh (8 frame quads + fill) with shared ring seams. */
  buildChrome(){
    const ew = asExtentInt(this.extent.width);
    const eh = asExtentInt(this.extent.height);
    const dim = this.getChromeFrameSize();
    const shrink = asExtentInt(this.getShrinkWidth());

    if(this.chrome.geometry instanceof THREE.BufferGeometry){
      this.chrome.geometry.dispose();
    }

    // Rings shrink from the right; fillOffset is baked into outerR (no extra X nudge).
    // flipLeft: translate the whole mesh so the missing strip sits on the left.
    this.chrome.geometry = buildChromeGeometryForControl(ew, eh, dim, shrink, 0);
    if(this.chrome.mesh){
      this.chrome.mesh.geometry = this.chrome.geometry;
      this.chrome.mesh.position.z = this.zOffset;
      this.chrome.mesh.position.x = this.flipLeft() ? shrink : 0;
      commitGuiTransform(this.chrome.mesh);
    }
  }

  buildText(){
    if(!this.text.texture)
      return;

    if(this.text.mesh.parent)
      this.text.mesh.parent.remove(this.text.mesh);

    this.widget.add(this.text.mesh);
    
    let texture = this.text.texture;
    texture.flipY = false;
    texture.anisotropy = 1;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    if(this.text.text != '' || (this.text.strref != 0 && typeof GameState.TLKManager.TLKStrings[this.text.strref] != 'undefined'))
      this.updateTextGeometry(this.text.text != '' ? this.menu.gameStringParse(this.text.text) : this.menu.gameStringParse(GameState.TLKManager.TLKStrings[this.text.strref].Value));
    else if(this.text.geometry?.index){
      // Keep empty index buffer; hide mesh so Three skips the draw.
      this.text.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(), 1).setUsage(THREE.StaticDrawUsage));
    }
    this.syncTextMeshVisibility();
    
    // Bounds overrides already installed at geometry creation; keep sphere override refresh here
    // in case an older control path replaced the geometry instance.
    this.installTextGeometryBoundsOverrides();

  }

  /** Safe AABB/sphere for vec2 GUI text positions (Three r186 getZ is OOB on itemSize 2). */
  private installTextGeometryBoundsOverrides(): void {
    if(!this.text?.geometry) return;
    const geometry = this.text.geometry;

    geometry.computeBoundingSphere = function () {
      if (this.boundingSphere === null) {
        this.boundingSphere = new THREE.Sphere()
      }
    
      let positions = this.attributes.position.array
      let itemSize = this.attributes.position.itemSize
      if (!positions || !itemSize || positions.length < 2) {
        this.boundingSphere.radius = 0
        this.boundingSphere.center.set(0, 0, 0)
        return
      }
      if (isNaN(this.boundingSphere.radius)) {
        console.error('THREE.BufferGeometry.computeBoundingSphere(): ' +
          'Computed radius is NaN. The ' +
          '"position" attribute is likely to have NaN values.')
      }
    }
    
    geometry.computeBoundingBox = function () {
      computeBoundingBoxXY(this);
    }
  }

  getCharPositions(char: number){
    return {
      ul: this.text.texture.txi.upperleftcoords[char],
      lr: this.text.texture.txi.lowerrightcoords[char]
    }
  }

  setTextAlignment(alignment: number){
    this.text.alignment = alignment;
    if(this.control.hasField('TEXT')){
      this.control.getFieldByLabel('TEXT')?.getFieldByLabel('ALIGNMENT')?.setValue(alignment);
    }else{
      this.control.addField(new GFFField(GFFDataType.INT, 'ALIGNMENT', alignment));
    }
  }

  updateTextGeometry(text: string){

    if(!(this.text.texture instanceof THREE.Texture))
      return;

    if(this.guiFont){
      this.guiFont.buildGeometry(this.text.geometry, this.text.text, this.text.alignment, this.getInnerSize().width);
      this.alignText();
    }
    
    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
    this.syncTextMeshVisibility();
    
  }

  textSize: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  alignText(){
    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
    this.text.mesh.position.z = this.zOffset;

    const innerSize = this.getInnerSize();
    const innerW = asExtentInt(innerSize.width);
    const innerH = asExtentInt(innerSize.height);
    const textH = asExtentInt(this.textSize.y);

    // Horizontal alignment is handled in GUIFont; origin sits at left edge of inner box.
    this.text.mesh.position.x = -truncDiv(innerW, 2);

    const vertical = this.text.alignment & GUIControlAlignment.VerticalMask;
    switch(vertical){
      case GUIControlAlignment.VerticalTop:
        this.text.mesh.position.y = truncDiv(innerH, 2);
      break;
      case GUIControlAlignment.VerticalCenter:
        this.text.mesh.position.y = truncDiv(textH, 2);
      break;
      case GUIControlAlignment.VerticalBottom:
        this.text.mesh.position.y = -truncDiv(innerH, 2) + textH;
      break;
    }
    commitGuiTransform(this.text.mesh);

    // ProtoItem rows (e.g. Messages dialog list) wrap text like Labels; without this, extent.height stays at
    // the single-line template height and list rows overlap after buildGeometry.
    if(
      this.listRowAlignExtentToWrappedText &&
      BitWise.InstanceOfObject(this.parent, GUIControlTypeMask.GUIListBox) &&
      this.list &&
      (this.type == GUIControlType.Label || this.type == GUIControlType.ProtoItem)
    ){
      this.extent.height = asExtentInt(this.textSize.y);
      this.resizeControl();
      this.list.relayoutAfterRowHeightChange();
    }
    
  }

  disableBorder(){
    this.borderEnabled = false;
    this.syncChromeEnableFlags();
  }

  disableBorderFill(){
    this.borderFillEnabled = false;
    this.syncChromeEnableFlags();
  }

  disableHighlight(){
    this.highlightEnabled = false;
    this.syncChromeEnableFlags();
  }

  disableHighlightFill(){
    this.highlightFillEnabled = false;
    this.syncChromeEnableFlags();
  }

  enableBorder(){
    this.borderEnabled = true;
    this.syncChromeEnableFlags();
  }

  enableBorderFill(){
    this.borderFillEnabled = true;
    this.syncChromeEnableFlags();
  }

  enableHighlight(){
    this.highlightEnabled = true;
    this.syncChromeEnableFlags();
  }

  enableHighlightFill(){
    this.highlightFillEnabled = true;
    this.syncChromeEnableFlags();
  }

  disableTextAlignment(){
    this.text.alignment = 0;
  }

  getRendererSize(){
    return {width: GameState.ResolutionManager.getViewportWidth(), height: GameState.ResolutionManager.getViewportHeight()};
  }

  setKeymapAction(action: KeyMapAction){
    this.keymapAction = action;
    return this;
  }

  tooltipText: string = '';
  tooltipTimer: number = 3000;
  tooltipVisible: boolean = false;
  setTooltipText(text: string){
    if(this.keymapAction){
      const action = KeyMapper.Actions[this.keymapAction];
      if(action){
        text += ` | ${action.character}`;
      }
    }
    this.tooltipText = text;
    return this;
  }

  setTooltipVisible(visible: boolean){
    const isChanged = this.tooltipVisible != visible;
    this.tooltipVisible = visible;
    if(this.tooltipVisible && isChanged){
      GameState.MenuManager.MenuToolTip.showToolTip(this.tooltipText, Mouse.positionViewport.x, Mouse.positionViewport.y, this);
    }else if(!this.tooltipVisible && isChanged){
      GameState.MenuManager.MenuToolTip.hide();
    }
    return this;
  }

  setText(str: any = '', renderOrder = 5){
    if(typeof str != 'string')
      str = str.toString();

    str = str.trim();

    let oldText = this.text.text;
    this.text.text = this.menu.gameStringParse(str);

    if(typeof this.text.geometry !== 'object')
      this.buildText();
    
    if(this.text.mesh){
      this.text.mesh.renderOrder = this.getRenderOrder(renderOrder);
    }

    if(oldText != this.text.text && typeof this.text.geometry === 'object'){
      //console.log('updateText', this.text.text);
      this.updateTextGeometry(this.text.text);
    }
    
    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }

  }

  getText(){
    return this.text.text;
  }

  getTextSize(){
    this.text.geometry.computeBoundingBox();
    this.text.geometry.boundingBox.getSize(this.textSize);
    return this.textSize;
  }

  /**
   * GetIdealHeight — line count < 0x10 → GetHeight()+1, else GetHeight(-1).
   * Uses built wrap lines + text mesh height as GetHeight.
   */
  getIdealHeight(): number {
    if(!this.text?.geometry || !this.guiFont){
      return 0;
    }
    this.getTextSize();
    const lineCount = this.guiFont.builtLines?.length ?? 0;
    if(lineCount < 1){
      return 0;
    }
    const h = asExtentInt(this.textSize.y);
    if(lineCount < 0x10){
      return h + 1;
    }
    return h;
  }

  _onCreate(){
    //Dummy Method
  }

  getHintText(){
    if(this.text.strref != 0 && typeof GameState.TLKManager.TLKStrings[this.text.strref+1] != 'undefined'){
      return GameState.TLKManager.TLKStrings[this.text.strref].Value;
    }else{
      return '';
    }
  }

  //Add an event listener
  addEventListener(name: string = '', callback?: (event: GUIControlEvent, ...args: any) => void){
    if(typeof callback === 'function'){
      if(this.eventListeners.hasOwnProperty(name)){
        (this.eventListeners as any)[name].push(callback);
      }
    }
    return this;
  }

  //Remove an event listener
  removeEventListener(name: string = '', callback?: Function){

    if(this.eventListeners.hasOwnProperty(name)){
      if(typeof callback === 'function'){
        //Remove this specific callback from the event listener
        let cbIndex = (this.eventListeners as any)[name].indexOf(callback);
        if(cbIndex > -1){
          (this.eventListeners as any)[name].splice(cbIndex, 1);
        }
      }else{
        //Remove all callbacks for this listener
        (this.eventListeners as any)[name] = [];
      }
    }
    return this;

  }

  //Process an event listener
  processEventListener(name = '', args: any[] = []){
    let processed = false;

    const event = GUIControlEventFactory.generateEventObject();
    event.data = args;

    if(!args.length){
      args = [event];
    }else{
      args = [event, ...args];
    }

    if(this.eventListeners.hasOwnProperty(name)){
      let len = (this.eventListeners as any)[name].length;
      for(let i = 0; i < len; i++){
        if(typeof (this.eventListeners as any)[name][i] === 'function'){
          processed = true;
          (this.eventListeners as any)[name][i].apply(null, args);
        }
      }
    }
    return processed;
  }

  click(){
    if(this.disableSelection){
      return;
    }

    this.processEventListener('click');
  }

  /**
   * SetMoveToControl — stores a resolved neighbor pointer
   * (or clears the link). Before panel resolve, GFF MOVETO IDs live in {@link moveTo}.
   */
  setMoveToControl(direction: string, control?: GUIControl){
    if(typeof direction == 'string'){
      direction = direction.toLowerCase();
    }

    const target = (control instanceof GUIControl) ? control : undefined;
    switch(direction){
      case 'up':
        this.dPadTarget.up = target;
      break;
      case 'down':
        this.dPadTarget.down = target;
      break;
      case 'left':
        this.dPadTarget.left = target;
      break;
      case 'right':
        this.dPadTarget.right = target;
      break;
    }
  }

  /** GetMoveToControl — neighbor pointer after resolve. */
  getMoveToControl(direction: string): GUIControl | undefined {
    if(typeof direction == 'string'){
      direction = direction.toLowerCase();
    }
    switch(direction){
      case 'up': return this.dPadTarget.up;
      case 'down': return this.dPadTarget.down;
      case 'left': return this.dPadTarget.left;
      case 'right': return this.dPadTarget.right;
      default: return undefined;
    }
  }

  /** @deprecated Prefer {@link setMoveToControl}. */
  setDPadTarget(direction = '', control: GUIControl){
    this.setMoveToControl(direction, control);
  }

  /**
   * HandleInputEvent for D-pad / arrow keys.
   * Follows resolved MoveTo neighbors and activates via the parent menu.
   */
  directionalNavigate(direction = ''){
    if(typeof direction == 'string'){
      direction = direction.toLowerCase();
    }
    if(direction !== 'up' && direction !== 'down' && direction !== 'left' && direction !== 'right'){
      return;
    }

    let next = this.getMoveToControl(direction);

    // Skip non-focusable / hidden neighbors (clears bit 0x8 to keep walking).
    while(next && (!next.isVisible() || next.disableSelection)){
      next = next.getMoveToControl(direction);
    }

    if(!next || next === this){
      return;
    }

    this.menu?.setActiveControl(next);
  }

  onINIPropertyAttached(){
    //Stub
  }

  attachINIProperty(key = ''){
    let property = key;
    if(property){
      this.iniProperty = property;
      this.onINIPropertyAttached();
    }
  }

  updateWorldPosition(){

    let pos = this.widget.position.clone();
    let parent = this.parent;
    while(parent instanceof GUIControl){
      pos.add(parent.widget.position);
      parent = parent.parent;
    }
    this.worldPosition = pos;
    return pos;

  }

  bounds(positions: number[] = []) {
    let count = positions.length / itemSize
    box.min[0] = positions[0]
    box.min[1] = positions[1]
    box.max[0] = positions[0]
    box.max[1] = positions[1]

    for (let i = 0; i < count; i++) {
      let x = positions[i * itemSize + 0]
      let y = positions[i * itemSize + 1]
      box.min[0] = Math.min(x, box.min[0])
      box.min[1] = Math.min(y, box.min[1])
      box.max[0] = Math.max(x, box.max[0])
      box.max[1] = Math.max(y, box.max[1])
    }
  }

  computeBox(positions: number[] = [], output: THREE.Box3) {
    this.bounds(positions)
    output.min.set(box.min[0], box.min[1], 0)
    output.max.set(box.max[0], box.max[1], 0)
  }

  computeSphere (positions: number[] = [], output: THREE.Sphere) {
    this.bounds(positions)
    let minX = box.min[0]
    let minY = box.min[1]
    let maxX = box.max[0]
    let maxY = box.max[1]
    let width = maxX - minX
    let height = maxY - minY
    let length = Math.sqrt(width * width + height * height)
    output.center.set(minX + width / 2, minY + height / 2, 0)
    output.radius = length / 2
  }

  setDepthMode(mode: THREE.DepthModes) {
    if(this.chrome?.material){
      this.chrome.material.depthFunc = mode;
    }
  }

}
