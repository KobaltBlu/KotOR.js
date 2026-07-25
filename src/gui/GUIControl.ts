import * as THREE from "three";
import { Anchor } from "@/enums/gui/Anchor";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import { IDPadTarget } from "@/interface/gui/IDPadTarget";
import { IGUIControlBorder } from "@/interface/gui/IGUIControlBorder";
import { IGUIControlEventListeners } from "@/interface/gui/IGUIControlEventListeners";
import { IGUIControlExtent } from "@/interface/gui/IGUIControlExtent";
import { IGUIControlMoveTo } from "@/interface/gui/IGUIControlMoveTo";
import { IGUIControlText } from "@/interface/gui/IGUIControlText";
import { GFFStruct } from "@/resource/GFFStruct";
import { GameState } from "@/GameState";
import { TextureLoader } from "@/loaders";
import { TextureType } from "@/enums/loaders/TextureType";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { GameEngineType } from "@/enums/engine";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { KeyMapper, Mouse } from "@/controls";
import { IGUIControlColors } from "@/interface/gui/IGUIControlColors";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControlEventFactory } from "@/gui/GUIControlEventFactory";
import type { GameMenu } from "@/gui/GameMenu";
import { BitWise } from "@/utility/BitWise";
import { GUIListBox } from "@/gui/GUIListBox";
import { GUIFont } from "@/gui/GUIFont";
import { GUIControlEvent } from "@/gui/GUIControlEvent";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { KeyMapAction } from "@/enums/controls/KeyMapAction";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import {
  asExtentInt,
  extentToCenteredPosition,
  getLocalMouseCoords,
  GUI_DESIGN_HEIGHT,
  GUI_DESIGN_WIDTH,
  GUIPanelCoordFlags,
  hitCheckMouseLocal,
  truncDiv,
} from "@/gui/GUICoord";
import { borderInnerExtent } from "@/gui/borderInnerExtent";
import { ResolutionManager } from "@/managers/ResolutionManager";

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

  pulsing: boolean = false;
  pulse: number = 1;
  opacity: number = 1;
  hover: boolean;
  swapBorderAndHighliteOnHover = true;

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
  text: IGUIControlText;
  hasText: boolean;
  hasBorder: boolean;
  hasExtent: boolean;
  padding: number;
  objectParentId: number;
  objectParent: number;
  objectLocked: number;
  type: number;
  hasHighlight: any;
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

  /** Counts outstanding texture loads started by initTextures() and subclass overrides. */
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

    this.widget.userData.border = new THREE.Group();
    this.widget.userData.highlight = new THREE.Group();
    this.widget.userData.fill = new THREE.Group();
    this.widget.userData.text = new THREE.Group();

    this.widget.add(this.widget.userData.border);
    this.widget.add(this.widget.userData.highlight);
    this.widget.add(this.widget.userData.fill);
    this.widget.add(this.widget.userData.text);

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
    // Border
    //--------//

    this.border = {
      color: new THREE.Color(this.defaultColor),
      corner: '',
      corner_material: {} as THREE.ShaderMaterial,
      edge: '',
      edge_material: {} as THREE.ShaderMaterial,
      fill: {
        geometry: {} as THREE.BufferGeometry,
        material: {} as THREE.ShaderMaterial,
        mesh: {} as THREE.Mesh,
        texture: '',
      },
      geometry: {} as THREE.BufferGeometry,
      mesh: {} as THREE.Mesh,
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.border.geometry = new THREE.BufferGeometry();
    
    this.border.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.border.edge_material.defines.USE_UV = '';
    //this.border.edge_material.defines.USE_MAP = '';
    this.border.edge_material.uniforms.diffuse.value = this.border.color;

    this.border.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.border.corner_material.defines.USE_UV = '';
    //this.border.corner_material.defines.USE_MAP = '';
    this.border.corner_material.uniforms.diffuse.value = this.border.color;

    this.border.mesh = new THREE.Mesh( this.border.geometry, [this.border.edge_material, this.border.corner_material] );
    this.widget.userData.border.add(this.border.mesh);

    //-------------//
    // Border Fill
    //-------------//
    
    this.border.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.border.fill.material.defines.USE_UV = '';
    //this.border.fill.material.defines.USE_MAP = '';
    this.border.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.border.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 ) as THREE.BufferGeometry;
    this.border.fill.mesh = new THREE.Mesh( this.border.fill.geometry, this.border.fill.material );

    this.widget.userData.border.add( this.border.fill.mesh );

    //-----------//
    // Highlight
    //-----------//

    this.highlight = {
      color: new THREE.Color(this.defaultHighlightColor),
      corner: '',
      corner_material: {} as THREE.ShaderMaterial,
      edge: '',
      edge_material: {} as THREE.ShaderMaterial,
      fill: {
        geometry: {} as THREE.BufferGeometry,
        material: {} as THREE.ShaderMaterial,
        mesh: {} as THREE.Mesh,
        texture: '',
      },
      geometry: {} as THREE.BufferGeometry,
      mesh: {} as THREE.Mesh,
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.highlight.geometry = new THREE.BufferGeometry();

    this.highlight.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlight.edge_material.defines.USE_MAP = '';
    this.highlight.edge_material.uniforms.diffuse.value = this.highlight.color;

    this.highlight.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlight.corner_material.defines.USE_MAP = '';
    this.highlight.corner_material.uniforms.diffuse.value = this.highlight.color;

    this.highlight.mesh = new THREE.Mesh( this.highlight.geometry, [this.highlight.edge_material, this.highlight.corner_material] );
    this.widget.userData.highlight.add(this.highlight.mesh);

    //----------------//
    // Highlight Fill
    //----------------//
    
    this.highlight.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlight.fill.material.defines.USE_MAP = '';
    this.highlight.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.highlight.fill.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    this.highlight.fill.mesh = new THREE.Mesh( this.highlight.fill.geometry, this.highlight.fill.material );

    this.widget.userData.highlight.add( this.highlight.fill.mesh );

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

    this.text.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        GameState.ShaderManager.Shaders.get('odyssey-gui').getUniforms()
      ]),
      vertexShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getVertex(),
      fragmentShader: GameState.ShaderManager.Shaders.get('odyssey-gui').getFragment(),
      side: THREE.DoubleSide,
      transparent: true,
      fog: false,
      visible: true
    });
    //this.text.material.defines.USE_MAP = '';
    this.text.material.uniforms.diffuse.value = this.text.color;
    //new THREE.MeshBasicMaterial({color: this.text.color, side: THREE.DoubleSide, transparent: true});
    this.text.mesh = new THREE.Mesh( this.text.geometry, this.text.material );
    this.text.mesh.frustumCulled = false;
    //this.widget.userData.text.add(this.text.mesh);

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
    //---------//
    //  Border
    //---------//

    if(this.border.mesh){
      this.border.mesh.name = 'GUIBorder';
      this.border.mesh.position.z = this.zOffset;
      this.attachEventListenters( this.border.mesh );
    }

    //-------------//
    // Border Fill
    //-------------//

    if(this.border.fill.mesh){
      this.border.fill.mesh.renderOrder = this.id;
      this.attachEventListenters( this.border.fill.mesh );
    }

    //-----------//
    // Highlight
    //-----------//

    if(this.highlight.mesh){
      this.highlight.mesh.name = 'GUIHighlight';
      this.highlight.mesh.position.z = this.zOffset;
      this.attachEventListenters( this.highlight.mesh );
    }

    //----------------//
    // Highlight Fill
    //----------------//
    
    if(this.highlight.fill.mesh){
      this.highlight.fill.mesh.renderOrder = this.id;
      this.attachEventListenters( this.highlight.fill.mesh );
    }

    //------//
    // Text
    //------//

    if(this.text.mesh){
      this.text.mesh.name = 'GUIText';
      this.text.mesh.position.z = this.zOffset;
      this.text.mesh.renderOrder = 5;
      this.attachEventListenters( this.text.mesh );
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
    const control = new GFFStruct();
    //build the default control structure
    const extent = new GFFStruct();
    extent.addField(new GFFField(GFFDataType.INT, 'TOP', 0));
    extent.addField(new GFFField(GFFDataType.INT, 'LEFT', 0));
    extent.addField(new GFFField(GFFDataType.INT, 'WIDTH', 0));
    extent.addField(new GFFField(GFFDataType.INT, 'HEIGHT', 0));
    control.addField(new GFFField(GFFDataType.STRUCT, 'EXTENT', extent));
    //build the default border structure
    const border = new GFFStruct();
    border.addField(new GFFField(GFFDataType.VECTOR, 'COLOR', this.defaultColor));
    border.addField(new GFFField(GFFDataType.INT, 'DIMENSION', 0));
    border.addField(new GFFField(GFFDataType.INT, 'CORNER', 0));
    border.addField(new GFFField(GFFDataType.INT, 'EDGE', 0));
    border.addField(new GFFField(GFFDataType.RESREF, 'FILL', ''));
    border.addField(new GFFField(GFFDataType.INT, 'FILLSTYLE', 0));
    border.addField(new GFFField(GFFDataType.INT, 'INNEROFFSET', 0)); 
    if(GameState.GameKey == GameEngineType.TSL){
      border.addField(new GFFField(GFFDataType.INT, 'INNEROFFSETY', 0));
    }
    border.addField(new GFFField(GFFDataType.BYTE, 'PULSING', 0));
    control.addField(new GFFField(GFFDataType.STRUCT, 'BORDER', border));
    //build the default text structure
    const text = new GFFStruct();
    text.addField(new GFFField(GFFDataType.RESREF, 'FONT', ''));
    text.addField(new GFFField(GFFDataType.DWORD, 'STRREF', 0));
    text.addField(new GFFField(GFFDataType.INT, 'ALIGNMENT', GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter));
    text.addField(new GFFField(GFFDataType.BYTE, 'PULSING', 0));
    text.addField(new GFFField(GFFDataType.VECTOR, 'COLOR', this.defaultColor));
    control.addField(new GFFField(GFFDataType.STRUCT, 'TEXT', text));
    //build the default highlight structure
    const highlight = new GFFStruct();
    highlight.addField(new GFFField(GFFDataType.VECTOR, 'COLOR', this.defaultHighlightColor));
    highlight.addField(new GFFField(GFFDataType.INT, 'DIMENSION', 0));
    highlight.addField(new GFFField(GFFDataType.INT, 'CORNER', 0));
    highlight.addField(new GFFField(GFFDataType.RESREF, 'EDGE', ''));
    highlight.addField(new GFFField(GFFDataType.RESREF, 'FILL', ''));
    highlight.addField(new GFFField(GFFDataType.INT, 'FILLSTYLE', 0));
    highlight.addField(new GFFField(GFFDataType.INT, 'INNEROFFSET', 0));
    if(GameState.GameKey == GameEngineType.TSL){
      highlight.addField(new GFFField(GFFDataType.INT, 'INNEROFFSETY', 0));
    }
    highlight.addField(new GFFField(GFFDataType.BYTE, 'PULSING', 0));
    control.addField(new GFFField(GFFDataType.STRUCT, 'HILIGHT', highlight));
    //build the default moveTo structure
    const moveTo = new GFFStruct();
    moveTo.addField(new GFFField(GFFDataType.INT, 'DOWN', -1));
    moveTo.addField(new GFFField(GFFDataType.INT, 'LEFT', -1));
    moveTo.addField(new GFFField(GFFDataType.INT, 'RIGHT', -1));
    moveTo.addField(new GFFField(GFFDataType.INT, 'UP', -1));
    control.addField(new GFFField(GFFDataType.STRUCT, 'MOVETO', moveTo));
    //build the default control structure
    control.addField(new GFFField(GFFDataType.INT, 'TYPE', 0));
    control.addField(new GFFField(GFFDataType.RESREF, 'TAG', ''));
    control.addField(new GFFField(GFFDataType.INT, 'ID', 0));
    control.addField(new GFFField(GFFDataType.INT, 'Obj_Locked', 0));
    control.addField(new GFFField(GFFDataType.CEXOSTRING, 'Obj_Parent', ''));
    control.addField(new GFFField(GFFDataType.INT, 'Obj_ParentID', this.parent?.id || -1));
    return control;
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

    //Extent — retail CSWGuiExtent::Load @ 00409dc0 (ReadFieldINT)
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
            if(this.border.color && this.border.fill.material){
              this.border.color.setRGB(color.x, color.y, color.z);
              this.border.fill.material.uniforms.diffuse.value.set(this.border.color);
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
            if(this.highlight.color && this.highlight.fill.material){
              this.highlight.color.setRGB(color.x, color.y, color.z);
              this.highlight.fill.material.uniforms.diffuse.value.set(this.highlight.color);
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
      }
    }

    //Moveto — retail CSWGuiNavigable::Load (IDs into panel controls[]; resolved later)
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

    //--------//
    // Border
    //--------//

    if(this.border.edge != ''){
      this.border.edge_material.visible = false;
      this._beginTextureLoad();
      TextureLoader.enQueue(this.border.edge, this.border.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.border.edge, texture);
          this._endTextureLoad();
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if(!this.border.edge_material.transparent){
          this.border.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.border.edge_material.visible = true;
        if(typeof this.borderEnabled == 'undefined')
          this.borderEnabled = true;
        this._endTextureLoad();
      });
    }else{
      this.border.edge_material.visible = false;
      this.borderEnabled = false;
    }

    if(this.border.corner != ''){
      this.border.corner_material.visible = false;
      this._beginTextureLoad();
      TextureLoader.enQueue(this.border.corner, this.border.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.border.corner, texture);
          this._endTextureLoad();
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if(!this.border.corner_material.transparent){
          this.border.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.border.corner_material.visible = true;
        if(typeof this.borderEnabled == 'undefined')
          this.borderEnabled = true;
        this._endTextureLoad();
      });
    }else{
      this.border.corner_material.visible = false;
      this.borderEnabled = false;
    }

    if(this.border.fill.texture != ''){
      this.border.fill.material.visible = false;
      this._beginTextureLoad();
      TextureLoader.enQueue(this.border.fill.texture, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!(texture)){
          this.border.fill.material.visible = false;
          this._endTextureLoad();
          return;
        }

        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if(!this.border.fill.material.transparent){
          this.border.fill.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.border.fill.material.visible = true;
        if(typeof this.borderFillEnabled == 'undefined')
          this.borderFillEnabled = true;
        this._endTextureLoad();
      });
    }else{
      this.border.fill.material.visible = false;
      this.borderFillEnabled = false;
    }

    //-----------//
    // Highlight
    //-----------//

    if(this.highlight.edge != ''){
      this.highlight.edge_material.visible = false;
      this._beginTextureLoad();
      TextureLoader.enQueue(this.highlight.edge, this.highlight.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.highlight.edge, texture);
          this._endTextureLoad();
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if(!this.highlight.edge_material.transparent){
          this.highlight.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.highlight.edge_material.visible = true;
        if(typeof this.highlightEnabled == 'undefined')
          this.highlightEnabled = true;
        this._endTextureLoad();
      });
    }else{
      this.highlight.edge_material.visible = false;
      this.highlightEnabled = false;
    }

    if(this.highlight.corner != ''){
      this.highlight.corner_material.visible = false;
      this._beginTextureLoad();
      TextureLoader.enQueue(this.highlight.corner, this.highlight.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture){
          console.log('initTextures', this.highlight.corner, texture);
          this._endTextureLoad();
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if(!this.highlight.corner_material.transparent){
          this.highlight.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.highlight.corner_material.visible = true;
        if(typeof this.highlightEnabled == 'undefined')
          this.highlightEnabled = true;
        this._endTextureLoad();
      });
    }else{
      this.highlight.corner_material.visible = false;
      this.highlightEnabled = false;
    }

    if(this.highlight.fill.material){
      if(this.highlight.fill.texture != ''){
        this.highlight.fill.material.visible = false;
        this._beginTextureLoad();
        TextureLoader.enQueue(this.highlight.fill.texture, this.highlight.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          if(this.highlight.fill.material){
            if(!(texture)){
              this.highlight.fill.material.visible = false;
            }else{
              texture.anisotropy = 1;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              if(this.highlight.fill.mesh && !this.highlight.fill.material.transparent){
                this.highlight.fill.mesh.renderOrder = 0;
              }
              texture.needsUpdate = true;
              this.highlight.fill.material.visible = true;
              this.highlightFillEnabled = true;
            }
          }
          this._endTextureLoad();
        });
      }else{
        this.highlight.fill.material.visible = false;
        this.highlightFillEnabled = false;
      }
    }

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

        this.text.texture = texture;
        this.text.material.uniforms.map.value = texture;
        this.text.material.uniforms.diffuse = { value: this.text.color };
        this.text.material.alphaTest = 0;
        this.text.material.transparent = true;
        this.text.material.needsUpdate = true;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
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

    if(this.swapBorderAndHighliteOnHover){
      this.hideHighlight();

      if(this.border.edge != '')
        this.showBorder();
    }else{
      this.showBorder();
      this.hideHighlight();
    }

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

    if(this.swapBorderAndHighliteOnHover){
      if(this.highlight.edge != '' || this.highlight.fill.texture != '')
        this.showHighlight();

      if(this.highlight.edge != '')
        this.hideBorder();
    }else{
      this.showBorder();
      this.showHighlight();
    }

    if(this.isClickable()){
      GameState.guiAudioEmitter.playSoundFireAndForget('gui_scroll');
    }

    this.processEventListener('hover');
    this.processEventListener('mouseIn');
    this.list?.markListRttDirty?.();
    
    // this.setTooltipVisible(true);
  }

  onFontTextureLoaded(){
    this.buildText();
    if (this.list) {
      this.invalidateListRtt();
    }
  }

  resizeControl(){

    try{
      if(this.hasBorder){
        this.buildBorder();
      }
      if(this.hasHighlight){
        this.buildHighlight();
      }
    }catch(e: any){
      //Must not have a border
    }

    this.resizeFill();
    if(this.hasHighlight){
      this.resizeHighlightFill();
    }

  }

  createControl(){

    if(this.widget instanceof THREE.Object3D && this.widget.parent){
      this.widget.parent.remove(this.widget);
    }
    
    //if(this.parent === undefined){
    //  this.widget.add(this.menu.backgroundSprite);
    //}

    this.buildBorder();
    this.buildFill();

    this.buildHighlight();
    this.buildHighlightFill();

    this.hideHighlight();
    
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
   * Retail pulses only via GFF PULSING / SetPulsingAlpha — not hover or selected alone.
   */
  wantsPulseAnimation(): boolean {
    return !!(
      this.pulsing ||
      (this.border.pulsing | 0) ||
      (this.highlight.pulsing | 0) ||
      (this.text.pulsing | 0)
    );
  }

  update(delta: number){
    const opacity = this.disableSelection ? 0.5 : 1;
    // Retail CSWGuiBorder::Draw / CSWGuiText::Draw: use m_fPulsingAlpha when pulsing bits set.
    // GFF PULSING → SetPulsingAlpha(nonzero, bit0, bit1): bit0 = edges/corners, bit1 = fill.
    // `this.pulsing` is the runtime SetPulsingAlpha(enable, …) equivalent (menus/protoitems).
    const borderFlags = this.border.pulsing | 0;
    const highlightFlags = this.highlight.pulsing | 0;
    const textFlags = this.text.pulsing | 0;
    // Runtime `this.pulsing` ≈ SetPulsingAlpha(1, 1, 0): edges/corners + text, not fill.
    // Fill pulses only when GFF PULSING bit1 is set (retail SetPulsingAlpha fill flag).
    const pulseBorderEdge = this.pulsing || !!(borderFlags & 1);
    const pulseBorderFill = !!(borderFlags & 2);
    const pulseHighlightEdge = this.pulsing || !!(highlightFlags & 1);
    const pulseHighlightFill = !!(highlightFlags & 2);
    const pulseText = this.pulsing || !!textFlags;

    if(pulseBorderEdge || pulseBorderFill || pulseHighlightEdge || pulseHighlightFill || pulseText){
      const pulseAlpha = GameState.MenuManager.pulseOpacity * opacity;
      const solidAlpha = opacity;

      if(this.border.edge_material){
        this.border.edge_material.uniforms.opacity.value = pulseBorderEdge ? pulseAlpha : solidAlpha;
      }

      if(this.border.corner_material){
        this.border.corner_material.uniforms.opacity.value = pulseBorderEdge ? pulseAlpha : solidAlpha;
      }

      if(this.border.fill.material){
        this.border.fill.material.uniforms.opacity.value = pulseBorderFill ? pulseAlpha : solidAlpha;
      }

      if(this.highlight.edge_material){
        this.highlight.edge_material.uniforms.opacity.value = pulseHighlightEdge ? pulseAlpha : solidAlpha;
      }

      if(this.highlight.corner_material){
        this.highlight.corner_material.uniforms.opacity.value = pulseHighlightEdge ? pulseAlpha : solidAlpha;
      }

      if(this.highlight.fill.material){
        this.highlight.fill.material.uniforms.opacity.value = pulseHighlightFill ? pulseAlpha : solidAlpha;
      }

      if(this.text.material){
        this.text.material.uniforms.opacity.value = pulseText ? pulseAlpha : solidAlpha;
      }
    }else{
      this.resetPulse();
    }

    if(this.border.edge_material && this.border.corner_material){
      this.border.edge_material.visible = this.borderEnabled ? true : false;
      this.border.corner_material.visible = this.borderEnabled ? true : false;
    }

    if(this.highlight.edge_material && this.highlight.corner_material){
      this.highlight.edge_material.visible = this.highlightEnabled ? true : false;
      this.highlight.corner_material.visible = this.highlightEnabled ? true : false;
    }
    
    if(this.border.fill.material){
      this.border.fill.material.visible = this.borderFillEnabled;
    }
    
    if(this.highlight.fill.material){
      this.highlight.fill.material.visible = this.highlightFillEnabled;
    }

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
    if(this.border.edge_material){
      this.border.edge_material.uniforms.opacity.value = 1 * opacity;
    }

    if(this.border.corner_material){
      this.border.corner_material.uniforms.opacity.value = 1 * opacity;
    }

    if(this.highlight.edge_material){
      this.highlight.edge_material.uniforms.opacity.value = 1 * opacity;
    }

    if(this.highlight.corner_material){
      this.highlight.corner_material.uniforms.opacity.value = 1 * opacity;
    }

    if(this.text.material){
      this.text.material.uniforms.opacity.value = 1 * opacity;
      this.setTextColor(this.text.color.r, this.text.color.g, this.text.color.b);
    }
    
    if(this.border.fill.material)
      this.border.fill.material.uniforms.opacity.value = 1 * opacity;
    
    if(this.disableSelection || this.disableHover){
      this.hideHighlight();
    }
  }

  setHovering(bState: boolean = false){
    this.hovering = bState;
  }

  hideBorder(){
    this.border.mesh.visible = false;
    this.hideFill();
  }

  showBorder(){
    this.border.mesh.visible = true;
    this.showFill();
  }

  hideHighlight(){
    this.highlight.mesh.visible = false;
    this.hideHighlightFill();
  }

  showHighlight(){
    this.highlight.mesh.visible = true;
    this.highlight.corner_material.uniforms.diffuse.value.set(this.defaultHighlightColor);
    this.highlight.edge_material.uniforms.diffuse.value.set(this.defaultHighlightColor);
    this.showHighlightFill();
  }

  hideFill(){
    this.border.fill.mesh.visible = false;
  }

  showFill(){
    this.border.fill.mesh.visible = true;
  }

  hideHighlightFill(){
    this.highlight.fill.mesh.visible = false;
  }

  showHighlightFill(){
    this.highlight.fill.mesh.visible = true;
  }

  setBorderColor(r = 1, g = 1, b = 1){
    this.border.edge_material.uniforms.diffuse.value.setRGB(r, g, b);
    this.border.corner_material.uniforms.diffuse.value.setRGB(r, g, b);
  }

  setHighlightColor(r = 1, g = 1, b = 1){
    this.highlight.edge_material.uniforms.diffuse.value.setRGB(r, g, b);
    this.highlight.corner_material.uniforms.diffuse.value.setRGB(r, g, b);
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

  getFill(): THREE.Mesh {
    return this.border.fill.mesh;
  }

  getHighlightFill(){
    return this.highlight.fill.mesh;
  }

  setHighlightFillTexture(map: THREE.Texture){
    if(!(map instanceof THREE.Texture)){
      map = TextureLoader.textures.get('fx_static');
    }

    this.highlight.fill.material.uniforms.map.value = map;
    (this.highlight.fill as any).material.map = map;

    if(map instanceof THREE.Texture){
      this.highlight.fill.material.visible = true;
      this.highlight.fill.material.uniforms.opacity.value = 1;
      this.highlight.fill.material.uniforms.uvTransform.value = this.highlight.fill.material.uniforms.map.value.matrix;
      this.highlight.fill.material.uniforms.map.value.updateMatrix();
      this.highlight.fill.material.defines.USE_UV = '';
      this.highlight.fill.material.defines.USE_MAP = '';
    }else{
      this.highlight.fill.material.visible = false;
    }

    this.highlight.fill.material.needsUpdate = true;
    this.highlight.fill.material.uniformsNeedUpdate = true;
    this.highlight.fill.material.visible = (map instanceof THREE.Texture);
    this.highlightFillEnabled = true;
  }

  setFillColor(r = 1, g = 1, b = 1){
    //0.0, 0.658824, 0.980392
    if(typeof this.getFill() != 'undefined'){
      (this.getFill().material as THREE.ShaderMaterial).uniforms.diffuse.value.setRGB(r, g, b);
    }
  }

  getFillTexture(){
    return this.border.fill.material.uniforms.map.value;
  }

  setFillTexture(map: THREE.Texture){
    
    if(!(map instanceof THREE.Texture)){
      map = TextureLoader.textures.get('fx_static');
    }

    this.border.fill.material.uniforms.map.value = map;
    (this.border.fill as any).material.map = map;

    if(map instanceof THREE.Texture){
      this.border.fill.material.visible = true;
      this.border.fill.material.uniforms.opacity.value = 1;
      this.border.fill.material.uniforms.uvTransform.value = this.border.fill.material.uniforms.map.value.matrix;
      this.border.fill.material.uniforms.map.value.updateMatrix();
      this.border.fill.material.defines.USE_UV = '';
      this.border.fill.material.defines.USE_MAP = '';
    }else{
      this.border.fill.material.visible = false;
    }

    this.border.fill.material.needsUpdate = true;
    this.border.fill.material.uniformsNeedUpdate = true;
    this.border.fill.material.visible = (map instanceof THREE.Texture);
    this.borderFillEnabled = true;
  }

  getFillTextureName(){
    return this.border.fill.texture;
  }

  async setFillTextureName(name = '', bUpdateHighlight = true): Promise<OdysseyTexture> {
    this.border.fill.texture = name;
    this.borderFillEnabled = true;
    if(!name.length){ return; }
    
    if(bUpdateHighlight) this.highlightFillEnabled = true;
    if(bUpdateHighlight) this.highlight.fill.texture = name;
    TextureLoader.enQueue(this.border.fill.texture, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      this.setFillTexture(texture)
      if(bUpdateHighlight) this.setHighlightFillTexture(texture);
      return texture;
    });
    return;
  }

  setMaterialTexture(material: THREE.ShaderMaterial, texture: THREE.Texture|null){
    if(!(material instanceof THREE.ShaderMaterial))
      return false;

    if(texture == undefined)
      texture = null;

    material.uniforms.map.value = texture;
    (material as any).map = texture;

    if(texture instanceof THREE.Texture){
      material.visible = true;
      material.uniforms.opacity.value = 1;
      material.uniforms.uvTransform.value = material.uniforms.map.value.matrix;
      material.uniforms.map.value.updateMatrix();
      material.defines.USE_UV = '';
      material.defines.USE_MAP = '';
    }else{
      material.visible = false;
    }

    material.needsUpdate = true;
    material.uniformsNeedUpdate = true;
    material.visible = (texture instanceof THREE.Texture);

    if(material == this.border.fill.material){
      this.borderFillEnabled = true;
    }

    if(material == this.highlight.fill.material){
      this.highlightFillEnabled = true;
    }

  }

  flipY(flip = true){
    let texture = this.border.fill.material.uniforms.map.value;
    if(texture instanceof THREE.Texture){
      texture.repeat.y = flip ? -1 : 1;
      texture.updateMatrix();
      texture.needsUpdate = true;
    }

    texture = this.highlight.fill.material.uniforms.map.value;
    if(texture instanceof THREE.Texture){
      texture.repeat.y = flip ? -1 : 1;
      texture.updateMatrix();
      texture.needsUpdate = true;
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
   * (and optionally scaled on the root widget). This is retail GetLocalMouseCoords
   * with CenterInViewport when UseExtentOffset is set; letterbox path when cleared.
   */
  getPanelLocalMouse(): { x: number; y: number } {
    const panel = this.menu?.tGuiPanel;
    const extent = panel?.extent ?? this.extent;
    const flags = this.menu?.panelCoordFlags ?? (
      GUIPanelCoordFlags.UseExtentOffset | GUIPanelCoordFlags.CenterInViewport
    );
    const vpW = asExtentInt(ResolutionManager.getViewportWidth());
    const vpH = asExtentInt(ResolutionManager.getViewportHeight());

    // Retail 640×480 letterbox path (bit0 clear)
    if ((flags & GUIPanelCoordFlags.UseExtentOffset) === 0) {
      return getLocalMouseCoords(
        extent,
        Mouse.positionViewportInt.x,
        Mouse.positionViewportInt.y,
        vpW,
        vpH,
        flags,
        GameState.GameKey,
      );
    }

    // Inverse of centered (and scaled) Three.js GUI projection → panel-local ints
    let { x: uiX, y: uiY } = this.getCenteredUIMouseInt();
    const scale = this.menu?.scale ?? 1;
    if (scale !== 0 && scale !== 1) {
      uiX = asExtentInt(uiX / scale);
      uiY = asExtentInt(uiY / scale);
    }

    const panelW = asExtentInt(extent.width);
    const panelH = asExtentInt(extent.height);
    const panelLeft = asExtentInt(extent.left);
    const panelTop = asExtentInt(extent.top);

    // ui (0,0) is viewport center; panel design spans ±panelW/2, ±panelH/2 about origin
    return {
      x: uiX + truncDiv(panelW, 2) - panelLeft,
      y: truncDiv(panelH, 2) - uiY - panelTop,
    };
  }

  /**
   * Retail CSWGuiControl::HitCheckMouse @ 004187c0 — inclusive int AABB.
   * List rows store extents in list viewport-local space (HitCheckMouseLocal @ 0041a5e0).
   * Anchored HUD controls are viewport-pinned; test their integer world box instead.
   */
  hitCheckMouse(localX: number, localY: number): boolean {
    if (this.list) {
      const list = this.list;
      const listLocalX = asExtentInt(localX) - asExtentInt(list.extent.left);
      const listLocalY = asExtentInt(localY) - asExtentInt(list.extent.top);
      const borderSize = asExtentInt(list.getBorderSize());
      const shrink = asExtentInt(list.getShrinkWidth());
      const viewportX = list.isScrollBarLeft() ? borderSize + shrink : borderSize;
      const viewportY = borderSize;
      return hitCheckMouseLocal(this.extent, listLocalX - viewportX, listLocalY - viewportY);
    }
    if (this.anchor && this.anchor !== Anchor.None) {
      const ui = this.getCenteredUIMouseInt();
      // box is in world/UI space (root scale applied via getWorldPosition + sized extents)
      return (
        ui.x >= asExtentInt(this.box.min.x) && ui.x <= asExtentInt(this.box.max.x) &&
        ui.y >= asExtentInt(this.box.min.y) && ui.y <= asExtentInt(this.box.max.y)
      );
    }
    return hitCheckMouseLocal(this.extent, localX, localY);
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

    this.updateBounds();
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
    for(let i = 0; i < this.children.length; i++){
      let control = this.children[i];
      const hit = control.hitCheckMouse(localX, localY);
      if(hit && (control.allowClick || control.editable)){
        controls.push(control);
      }else if(!hit){
        this.menu.setWidgetHoverActive(control, false);
      }
      if(hit){
        controls = controls.concat( control.getActiveControls(localX, localY) );
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
      this.box.max.x = wx + truncDiv(w, 2) + px + ox;
      this.box.max.y = wy + truncDiv(h, 2) + py + oy;
      
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
      this.box.max.set(cx + truncDiv(bw, 2), cy + truncDiv(bh, 2));
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

    // Retail SetExtent: only shift content left when scrollbar is on the left
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

  getInnerSize(){
    // Retail CSWGuiBorder::GetInnerExtent @ 00415240 — int inset from border dim
    const dim = asExtentInt(this.border.dimension || this.highlight.dimension || 0);
    let width = Math.max(0, asExtentInt(this.extent.width) - dim);
    let height = Math.max(0, asExtentInt(this.extent.height) - dim);

    return {
      width: width,
      height: height
    };
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
   * Inner (fill / viewport) extent — mirrors CSWGuiBorder::GetInnerExtent @ 00415240.
   *
   * Corner/edge sizes come from the border DIMENSION (retail GetBorderDim). When DIMENSION
   * is 0 retail would derive them from the corner/edge image sizes; KotOR.js borders with
   * DIMENSION 0 carry no corner/edge geometry, so we treat those sizes as 0 (unchanged from
   * legacy behavior). INNEROFFSET is then applied — the previously missing step:
   *   width  = (w - 2*corner) + 2*min(INNEROFFSET,  DIMENSION)
   *   height = (h - 2*corner) + 2*INNEROFFSETY                 (raw, retail asymmetry)
   * with retail's degenerate-collapse test (content smaller than half an edge tile → 0).
   * Scrollbar shrink (listbox SetExtent @ 0041bf80) is subtracted after, separately.
   */
  getFillExtent(){
    const extent = this.getControlExtent();
    const shrinkWidth = asExtentInt(this.getShrinkWidth());

    const inner = borderInnerExtent({
      width: asExtentInt(this.extent.width),
      height: asExtentInt(this.extent.height),
      dimension: asExtentInt(this.getBorderSize()),
      innerOffset: asExtentInt(this.border.inneroffset || 0),
      innerOffsetY: asExtentInt(this.border.inneroffsety ?? this.border.inneroffset ?? 0),
    });

    // Scrollbar shrink (listbox SetExtent @ 0041bf80) is content-width only, applied after.
    const width = Math.max(0, inner.width - shrinkWidth);
    const height = Math.max(0, inner.height);

    return {
      top: extent.top,
      left: extent.left,
      width: this.meshSize(width),
      height: this.meshSize(height)
    };
  }

  getBorderSize(){
    if(GameState.GameKey == GameEngineType.TSL){
      return this.border.dimension || 0;
    }else{
      return this.border.dimension || 0;
    }
  }

  getHightlightSize(){
    if(GameState.GameKey == GameEngineType.TSL){
      return this.highlight.dimension || 0;
    }else{
      return this.highlight.dimension || 0;
    }
  }

  getShrinkWidth() {
    let shrinkWidth = 0;
    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIListBox)){
      const lb = this as any;
      // Retail SetExtent @ 0041bf80: content width -= scrollbar.extent.width only
      if (lb.scrollbar?.extent?.width) {
        shrinkWidth = lb.scrollbar.extent.width;
      }
    }
    return shrinkWidth;
  }

  /**
   * Border edge/corner quads in widget-local space (ints).
   * Retail CSWGuiBorder::Draw @ 004168c0 uses int left/top/width/height.
   */
  getBorderExtent(side: string){
    const shrinkWidth = asExtentInt(this.getShrinkWidth());
    const ew = asExtentInt(this.extent.width);
    const eh = asExtentInt(this.extent.height);
    const borderSize = Math.min(asExtentInt(this.getBorderSize()), truncDiv(ew, 2), truncDiv(eh, 2));

    let innerW = Math.max(0, ew - borderSize);
    let innerH = Math.max(0, eh - borderSize);

    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIProtoItem)){
      innerW = Math.min(ew, innerW);
    }

    const halfInnerW = truncDiv(innerW, 2);
    const halfInnerH = truncDiv(innerH, 2);
    const halfShrink = truncDiv(shrinkWidth, 2);

    let top = 0, left = 0, width = 0, height = 0;

    switch(side){
      case 'top':
        top = -halfInnerH;
        left = -halfShrink;
        width = innerW - borderSize - shrinkWidth;
        height = borderSize;
      break;
      case 'bottom':
        top = halfInnerH;
        left = -halfShrink;
        width = innerW - borderSize - shrinkWidth;
        height = borderSize;
      break;
      case 'left':
        top = 0;
        left = -halfInnerW;
        width = innerH - borderSize;
        height = borderSize;
      break;
      case 'right':
        top = 0;
        left = halfInnerW - shrinkWidth;
        width = innerH - borderSize;
        height = borderSize;
      break;
      case 'topLeft':
        top = halfInnerH;
        left = -halfInnerW;
        width = borderSize;
        height = borderSize;
      break;
      case 'topRight':
        top = halfInnerH;
        left = halfInnerW - shrinkWidth;
        width = borderSize;
        height = borderSize;
      break;
      case 'bottomLeft':
        top = -halfInnerH;
        left = -halfInnerW;
        width = borderSize;
        height = borderSize;
      break;
      case 'bottomRight':
        top = -halfInnerH;
        left = halfInnerW - shrinkWidth;
        width = borderSize;
        height = borderSize;
      break;
    }

    return {
      top: top,
      left: left + (this.flipLeft() ? shrinkWidth : 0),
      width: this.meshSize(width),
      height: this.meshSize(height)
    };

  }

  getHighlightExtent(side: string){
    const shrinkWidth = asExtentInt(this.getShrinkWidth());
    const ew = asExtentInt(this.extent.width);
    const eh = asExtentInt(this.extent.height);
    const highlightSize = Math.min(asExtentInt(this.getHightlightSize()), truncDiv(ew, 2), truncDiv(eh, 2));

    let innerW = Math.max(0, ew - highlightSize);
    let innerH = Math.max(0, eh - highlightSize);

    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIProtoItem)){
      innerW = Math.min(ew, innerW);
    }

    const halfInnerW = truncDiv(innerW, 2);
    const halfInnerH = truncDiv(innerH, 2);
    const halfShrink = truncDiv(shrinkWidth, 2);

    let top = 0, left = 0, width = 0, height = 0;

    switch(side){
      case 'top':
        top = -halfInnerH;
        left = -halfShrink;
        width = innerW - highlightSize - shrinkWidth;
        height = highlightSize;
      break;
      case 'bottom':
        top = halfInnerH;
        left = -halfShrink;
        width = innerW - highlightSize - shrinkWidth;
        height = highlightSize;
      break;
      case 'left':
        top = 0;
        left = -halfInnerW;
        width = innerH - highlightSize;
        height = highlightSize;
      break;
      case 'right':
        top = 0;
        left = halfInnerW - shrinkWidth;
        width = innerH - highlightSize;
        height = highlightSize;
      break;
      case 'topLeft':
        top = halfInnerH;
        left = -halfInnerW;
        width = highlightSize;
        height = highlightSize;
      break;
      case 'topRight':
        top = halfInnerH;
        left = halfInnerW - shrinkWidth;
        width = highlightSize;
        height = highlightSize;
      break;
      case 'bottomLeft':
        top = -halfInnerH;
        left = -halfInnerW;
        width = highlightSize;
        height = highlightSize;
      break;
      case 'bottomRight':
        top = -halfInnerH;
        left = halfInnerW - shrinkWidth;
        width = highlightSize;
        height = highlightSize;
      break;
    }

    return {
      top: top,
      left: left + (this.flipLeft() ? shrinkWidth : 0),
      width: this.meshSize(width),
      height: this.meshSize(height)
    };
  }

  /** ListBox content fill X: shift away from scrollbar (matches layoutRttQuad). */
  private getFillShrinkOffsetX(): number {
    const shrink = asExtentInt(this.getShrinkWidth());
    const half = truncDiv(shrink, 2);
    return this.flipLeft() ? half : -half;
  }

  buildFill(){
    const extent = this.getFillExtent();
    
    if(this.border.fill.mesh){
      this.border.fill.mesh.name = this.widget.name+' center fill';
      this.border.fill.mesh.scale.x = extent.width || 0.000001;
      this.border.fill.mesh.scale.y = extent.height || 0.000001;
      this.border.fill.mesh.position.z = this.zOffset;
      this.border.fill.mesh.position.x = this.getFillShrinkOffsetX();
    }
  }

  buildBorder(){

    const edgeGeometries = 4;
    const cornerGeometries = 4;
    const geomCount = edgeGeometries + cornerGeometries;

    const planes: THREE.BufferGeometry[] = [];
    let extent;

    for(let i = 0; i < geomCount; i++){
      switch(i){
        case 0: //top-border
          extent = this.getBorderExtent('top');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 1: //right-border
          extent = this.getBorderExtent('right');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 2: //bottom-border
          extent = this.getBorderExtent('bottom');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 3: //left-border
          extent = this.getBorderExtent('left');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 4: //top-left-corner
          extent = this.getBorderExtent('topLeft');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 5: //top-right-corner
          extent = this.getBorderExtent('topRight');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 6: //bottom-right-corner
          extent = this.getBorderExtent('bottomRight');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 7: //bottom-left-corner
          extent = this.getBorderExtent('bottomLeft');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
      }
    }

    if(this.border.geometry instanceof THREE.BufferGeometry)
      this.border.geometry.dispose();

    this.border.geometry = BufferGeometryUtils.mergeBufferGeometries(planes, false);
    this.border.geometry.computeBoundingBox();

    //Edge Group
    this.border.geometry.addGroup(0, 24, 0);
    //Corner Group
    this.border.geometry.addGroup(24, 24, 1);

    if(this.border.mesh)
      this.border.mesh.geometry = this.border.geometry;

    //Clean up the temporary plane geometries
    let _plane: THREE.BufferGeometry | undefined;
    while(planes.length){
      _plane = planes.shift();
      if(_plane){
        _plane.dispose();
      }
    }

  }

  buildHighlight(){

    let edgeGeometries = 4;
    let cornerGeometries = 4;
    let geomCount = edgeGeometries + cornerGeometries;

    let planes: THREE.BufferGeometry[] = [];
    let extent;

    for(let i = 0; i < geomCount; i++){
      switch(i){
        case 0: //top-border
          extent = this.getHighlightExtent('top');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 1: //right-border
          extent = this.getHighlightExtent('right');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 2: //bottom-border
          extent = this.getHighlightExtent('bottom');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 3: //left-border
          extent = this.getHighlightExtent('left');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 4: //top-left-corner
          extent = this.getHighlightExtent('topLeft');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 5: //top-right-corner
          extent = this.getHighlightExtent('topRight');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 6: //bottom-right-corner
          extent = this.getHighlightExtent('bottomRight');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 7: //bottom-left-corner
          extent = this.getHighlightExtent('bottomLeft');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
      }
    }

    if(this.highlight.geometry instanceof THREE.BufferGeometry)
      this.highlight.geometry.dispose();

    this.highlight.geometry = BufferGeometryUtils.mergeBufferGeometries(planes, false);
    this.highlight.geometry.computeBoundingBox();

    //Edge Group
    this.highlight.geometry.addGroup(0, 24, 0);
    //Corner Group
    this.highlight.geometry.addGroup(24, 24, 1);

    if(this.highlight.mesh)
      this.highlight.mesh.geometry = this.highlight.geometry;

    //Clean up the temporary plane geometries
    let _plane: THREE.BufferGeometry | undefined;
    while(planes.length){
      _plane = planes.shift();
      if(_plane){
        _plane.dispose();
      }
    }

  }

  buildHighlightFill(){
    let extent = this.getFillExtent();
    if(this.highlight.fill.mesh){
      this.highlight.fill.mesh.name = this.widget.name+' center fill';
      this.highlight.fill.mesh.scale.x = extent.width || 0.000001;
      this.highlight.fill.mesh.scale.y = extent.height || 0.000001;
      this.highlight.fill.mesh.position.z = this.zOffset;
      this.highlight.fill.mesh.position.x = this.getFillShrinkOffsetX();
    }
  }

  buildText(){
    let self = this;

    if(!this.text.texture)
      return;

    if(this.text.mesh.parent)
      this.text.mesh.parent.remove(this.text.mesh);

    this.widget.userData.text.add(this.text.mesh);
    
    let texture = this.text.texture;
    texture.flipY = false;
    texture.anisotropy = 1;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    if(this.text.text != '' || (this.text.strref != 0 && typeof GameState.TLKManager.TLKStrings[this.text.strref] != 'undefined'))
      this.updateTextGeometry(this.text.text != '' ? this.menu.gameStringParse(this.text.text) : this.menu.gameStringParse(GameState.TLKManager.TLKStrings[this.text.strref].Value));
    
    this.text.geometry.computeBoundingSphere = function () {
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
      // this.computeSphere(positions, this.boundingSphere)
      if (isNaN(this.boundingSphere.radius)) {
        console.error('THREE.BufferGeometry.computeBoundingSphere(): ' +
          'Computed radius is NaN. The ' +
          '"position" attribute is likely to have NaN values.')
      }
    }
    
    this.text.geometry.computeBoundingBox = function () {
      if (this.boundingBox === null) {
        this.boundingBox = new THREE.Box3()
      }
    
      let bbox = this.boundingBox
      let positions = this.attributes.position.array
      let itemSize = this.attributes.position.itemSize
      if (!positions || !itemSize || positions.length < 2) {
        bbox.makeEmpty()
        return
      }
      self.computeBox(positions, bbox)
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
    
  }

  textSize: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  alignText(){
    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
    this.widget.userData.text.position.z = this.zOffset;

    const innerSize = this.getInnerSize();
    const innerW = asExtentInt(innerSize.width);
    const innerH = asExtentInt(innerSize.height);
    const textH = asExtentInt(this.textSize.y);

    // Horizontal alignment is handled in GUIFont; origin sits at left edge of inner box.
    this.widget.userData.text.position.x = -truncDiv(innerW, 2);

    const vertical = this.text.alignment & GUIControlAlignment.VerticalMask;
    switch(vertical){
      case GUIControlAlignment.VerticalTop:
        this.widget.userData.text.position.y = truncDiv(innerH, 2);
      break;
      case GUIControlAlignment.VerticalCenter:
        this.widget.userData.text.position.y = truncDiv(textH, 2);
      break;
      case GUIControlAlignment.VerticalBottom:
        this.widget.userData.text.position.y = -truncDiv(innerH, 2) + textH;
      break;
    }

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
  }

  disableBorderFill(){
    this.borderFillEnabled = false;
  }

  disableHighlight(){
    this.highlightEnabled = false;
  }

  disableHighlightFill(){
    this.highlightFillEnabled = false;
  }

  enableBorder(){
    this.borderEnabled = true;
  }

  enableBorderFill(){
    this.borderFillEnabled = true;
  }

  enableHighlight(){
    this.highlightEnabled = true;
  }

  enableHighlightFill(){
    this.highlightFillEnabled = true;
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
      this.text.mesh.renderOrder = undefined;//renderOrder;
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

  resizeFill(){
    if(this.border.fill.mesh){
      let extent = this.getFillExtent();
      this.border.fill.mesh.scale.x = extent.width || 0.000001;
      this.border.fill.mesh.scale.y = extent.height || 0.000001;
      this.border.fill.mesh.position.x = this.getFillShrinkOffsetX();
    }
  }

  resizeHighlightFill(){
    if(this.highlight.fill.mesh){
      let extent = this.getFillExtent();
      this.highlight.fill.mesh.scale.x = extent.width || 0.000001;
      this.highlight.fill.mesh.scale.y = extent.height || 0.000001;
      this.highlight.fill.mesh.position.x = this.getFillShrinkOffsetX();
    }
  }

  resizeBorder(side: string){

    let extent = this.getBorderExtent(side);

    switch(side){
      case 'top':
        this.widget.userData.border.children[0].position.set( extent.left, extent.top, 1 ); // top
        this.widget.userData.border.children[0].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[0].scale.y = extent.height || 0.000001;
      break;
      case 'left':
        this.widget.userData.border.children[1].position.set( extent.left, extent.top, 1 ); // left
        this.widget.userData.border.children[1].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[1].scale.y = extent.height || 0.000001;
      break;
      case 'right':
        this.widget.userData.border.children[2].position.set( extent.left, extent.top, 1 ); // right
        this.widget.userData.border.children[2].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[2].scale.y = extent.height || 0.000001;
      break;
      case 'bottom':
        this.widget.userData.border.children[3].position.set( extent.left, extent.top, 1 ); // bottom
        this.widget.userData.border.children[3].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[3].scale.y = extent.height || 0.000001;
      break;
    }

  }

  resizeCorner(side: string){
    
    let extent = this.getBorderExtent(side);

    switch(side){
      case 'topLeft':
        this.widget.userData.border.children[4].position.set( extent.left, extent.top, 1 ); // top
        this.widget.userData.border.children[4].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[4].scale.y = extent.height || 0.000001;
      break;
      case 'topRight':
        this.widget.userData.border.children[5].position.set( extent.left, extent.top, 1 ); // left
        this.widget.userData.border.children[5].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[5].scale.y = extent.height || 0.000001;
      break;
      case 'bottomLeft':
        this.widget.userData.border.children[6].position.set( extent.left, extent.top, 1 ); // right
        this.widget.userData.border.children[6].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[6].scale.y = extent.height || 0.000001;
      break;
      case 'bottomRight':
        this.widget.userData.border.children[7].position.set( extent.left, extent.top, 1 ); // bottom
        this.widget.userData.border.children[7].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[7].scale.y = extent.height || 0.000001;
      break;
    }

  }

  resizeHighlight(side: string){
    
    /*let extent = this.getHighlightExtent(side);

    let geometry = new THREE.PlaneGeometry( extent.width, extent.height, 1 );
    let material = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
    let sprite = new THREE.Mesh( geometry, material );

    if(this.highlight.edge != ''){
      TextureLoader.enQueue(this.highlight.edge, material, TextureType.TEXTURE);
    }
    sprite.position.set( extent.left, extent.top, 1 ); // top left

    switch(side){
      case 'top':
        sprite.rotation.z = Math.PI;
      break;
      case 'bottom':
      break;
      case 'left':
        sprite.rotation.z = Math.PI/2;
      break;
      case 'right':
        sprite.rotation.z = -Math.PI/2;
      break;
    }

    sprite.name = side+' edge';
    this.widget.highlight.add(sprite);

    sprite.isClickable = (e: any) => {
      return this.isClickable();
    };

    sprite.onClick = (e: any) => {
      if(typeof this.onClick == 'function')
        this.onClick(e: any);
    };

    sprite.onMouseMove = (e: any) =>{
      if(typeof this.onMouseMove == 'function')
        this.onMouseMove(e: any);
    }

    sprite.onMouseDown = (e: any) => {
      if(typeof this.onMouseDown == 'function')
        this.onMouseDown(e: any);
    };

    sprite.onMouseUp = (e: any) => {
      if(typeof this.onMouseUp == 'function')
        this.onMouseUp(e: any);
    };
    
    sprite.onHover = (e: any) => {
      if(typeof this.onMouseIn == 'function')
        this.onMouseIn(e: any);
    };

    sprite.getControl = () => {
      return this;
    }*/

  }

  resizeHighlightCorner(side: string){
    
    /*let extent = this.getHighlightExtent(side);

    let geometry = new THREE.PlaneGeometry( extent.width, extent.height, 1 );
    let material = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
    let sprite = new THREE.Mesh( geometry, material );

    if(this.highlight.corner != ''){
      TextureLoader.enQueue(this.highlight.corner, material, TextureType.TEXTURE);
    }

    switch(side){
      case 'topRight':
        sprite.rotation.z = - (Math.PI / 2);
      break;
      case 'bottomRight':
        sprite.rotation.z = - Math.PI;
      break;
      case 'bottomLeft':
        sprite.rotation.z = (Math.PI / 2);
      break;
    }

    sprite.position.set( extent.left, extent.top, 0 ); // top left
    sprite.name = side+' corner';
    this.widget.highlight.add(sprite);*/

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
   * Retail CSWGuiNavigable::SetMoveToControl — stores a resolved neighbor pointer
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

  /** Retail CSWGuiNavigable::GetMoveToControl — neighbor pointer after resolve. */
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
   * Retail CSWGuiNavigable::HandleInputEvent for D-pad / arrow keys.
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

    // Skip non-focusable / hidden neighbors (retail clears bit 0x8 to keep walking).
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
    this.border.fill.material.depthFunc = mode;
    this.highlight.fill.material.depthFunc = mode;
  }

}
