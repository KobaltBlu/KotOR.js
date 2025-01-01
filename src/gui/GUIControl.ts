import * as THREE from "three";
import { Anchor } from "../enums/gui/Anchor";
import { GUIControlAlignment } from "../enums/gui/GUIControlAlignment";
import { IDPadTarget } from "../interface/gui/IDPadTarget";
import { IGUIControlBorder } from "../interface/gui/IGUIControlBorder";
import { IGUIControlEventListeners } from "../interface/gui/IGUIControlEventListeners";
import { IGUIControlExtent } from "../interface/gui/IGUIControlExtent";
import { IGUIControlMoveTo } from "../interface/gui/IGUIControlMoveTo";
import { IGUIControlText } from "../interface/gui/IGUIControlText";
import { GFFStruct } from "../resource/GFFStruct";
import { GameState } from "../GameState";
import { TextureLoader } from "../loaders";
import { TextureType } from "../enums/loaders/TextureType";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { GameEngineType } from "../enums/engine";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Mouse } from "../controls";
import { IGUIControlColors } from "../interface/gui/IGUIControlColors";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import { GUIControlEventFactory } from "./GUIControlEventFactory";
import type { GameMenu } from "./GameMenu";
import { BitWise } from "../utility/BitWise";
import { GUIListBox } from "./GUIListBox";
import GUIFont from "./GUIFont";
import { GUIControlEvent } from "./GUIControlEvent";
import { GUIControlType } from "../enums/gui/GUIControlType";

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

  allowClick: boolean = true;
  disableSelection: boolean = false;

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

    if(GameState.GameKey == GameEngineType.TSL){
      this.defaultColor = new THREE.Color(0.10196078568697, 0.69803923368454, 0.549019634723663);
      this.defaultHighlightColor = new THREE.Color(0.800000011920929, 0.800000011920929, 0.6980392336845398);
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

  initProperties(){
    if(this.control instanceof GFFStruct){
      let control = this.control;

      this.type = ( control.hasField('CONTROLTYPE') ? control.getFieldByLabel('CONTROLTYPE')?.getValue() : -1 );
      this.widget.name = this.name = ( control.hasField('TAG') ? control.getFieldByLabel('TAG')?.getValue() : -1 );
      this.id = ( control.hasField('ID') ? control.getFieldByLabel('ID')?.getValue() : -1 );
      this.objectLocked = ( control.hasField('Obj_Locked') ? control.getFieldByLabel('Obj_Locked')?.getValue() : -1 );
      this.objectParent = ( control.hasField('Obj_Parent') ? control.getFieldByLabel('Obj_Parent')?.getValue() : -1 );
      this.objectParentId = ( control.hasField('Obj_ParentID') ? control.getFieldByLabel('Obj_ParentID')?.getValue() : -1 );
  
      this.padding = ( control.hasField('PADDING') ? control.getFieldByLabel('PADDING')?.getValue() : 0 );
  
      //Extent
      this.hasExtent = control.hasField('EXTENT');
      if(this.hasExtent){
        let extent = control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
        if(extent){
          this.extent.top = extent.getFieldByLabel('TOP')?.getValue();
          this.extent.left = extent.getFieldByLabel('LEFT')?.getValue();
          this.extent.width = extent.getFieldByLabel('WIDTH')?.getValue();
          this.extent.height = extent.getFieldByLabel('HEIGHT')?.getValue();
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
          this.text.pulsing = text.getFieldByLabel('PULSING')?.getValue();

          if(this.text.font == 'fnt_d16x16'){
            this.text.font = 'fnt_d16x16b';
          }

          if(text.hasField('COLOR')){
            let color = text.getFieldByLabel('COLOR')?.getVector();
            if(color) this.text.color.setRGB(color.x, color.y, color.z)
          }

          if(typeof this.text.color === 'undefined'){
            this.text.color = this.defaultColor;
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
  
      //Moveto
      this.hasMoveTo = control.hasField('MOVETO');
      if(this.hasMoveTo){
        let moveTo = control.getFieldByLabel('MOVETO')?.getChildStructs()[0];
        if(moveTo){
          this.moveTo.down = moveTo.getFieldByLabel('DOWN')?.getValue();
          this.moveTo.left = moveTo.getFieldByLabel('LEFT')?.getValue();
          this.moveTo.right = moveTo.getFieldByLabel('RIGHT')?.getValue();
          this.moveTo.up = moveTo.getFieldByLabel('UP')?.getValue();
        }
      }
    }else if(typeof this.control !== 'undefined'){
      //TODO
    }
  }

  initTextures(){

    //--------//
    // Border
    //--------//

    if(this.border.edge != ''){
      this.border.edge_material.visible = false;
      TextureLoader.enQueue(this.border.edge, this.border.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture)
          console.log('initTextures', this.border.edge, texture);

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
      });
    }else{
      this.border.edge_material.visible = false;
      this.borderEnabled = false;
    }

    if(this.border.corner != ''){
      this.border.corner_material.visible = false;
      TextureLoader.enQueue(this.border.corner, this.border.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture)
          console.log('initTextures', this.border.corner, texture);

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
      });
    }else{
      this.border.corner_material.visible = false;
      this.borderEnabled = false;
    }

    if(this.border.fill.texture != ''){
      this.border.fill.material.transparent = true;
      this.border.fill.material.visible = false;
      TextureLoader.enQueue(this.border.fill.texture, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!(texture)){
          this.border.fill.material.visible = false;
        }else{
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
        }
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
      TextureLoader.enQueue(this.highlight.edge, this.highlight.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture)
          console.log('initTextures', this.highlight.edge, texture);

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
      });
    }else{
      this.highlight.edge_material.visible = false;
      this.highlightEnabled = false;
    }

    if(this.highlight.corner != ''){
      this.highlight.corner_material.visible = false;
      TextureLoader.enQueue(this.highlight.corner, this.highlight.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture)
          console.log('initTextures', this.highlight.corner, texture);

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
      });
    }else{
      this.highlight.corner_material.visible = false;
      this.highlightEnabled = false;
    }

    if(this.highlight.fill.material){
      if(this.highlight.fill.texture != ''){
        this.highlight.fill.material.transparent = true;
        this.highlight.fill.material.visible = false;
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
      TextureLoader.enQueue(this.text.font, this.text.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if(!texture)
          console.log('initTextures', this.text.font, texture);

        if(texture){
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
        }
      });
    }else{
      this.text.material.visible = false;
    }

  }

  isClickable(){
    return this.eventListeners['click'].length && this.isVisible();
  }

  isVisible(){
    return this.widget.visible;
  }

  onHoverOut(){

    this.hover = false;

    if(typeof this.onMouseOut === 'function')
      this.onMouseOut();

    this.hideHighlight();

    if(this.border.edge != '')
      this.showBorder();

    this.processEventListener('mouseOut');
  }

  onHoverIn(){

    if(!this.hover && typeof this.onHover === 'function')
      this.onHover();

    this.hover = true;

    if(typeof this.onMouseIn === 'function')
      this.onMouseIn();

    if(this.highlight.edge != '' || this.highlight.fill.texture != '')
      this.showHighlight();

    if(this.highlight.edge)
      this.hideBorder();

    if(this.isClickable()){
      GameState.guiAudioEmitter.playSound('gui_scroll');
    }

    this.processEventListener('hover');
    this.processEventListener('mouseIn');
    
  }

  onFontTextureLoaded(){
    this.buildText();
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
    TextureLoader.LoadQueue(() => {});
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

  update(delta: number){
    if(this.pulsing || (this.hover && this.onClick) || this.selected){
      if(this.border.edge_material){
        this.border.edge_material.uniforms.opacity.value = 1 - (0.5 *GameState.MenuManager.pulseOpacity);
      }

      if(this.border.corner_material){
        this.border.corner_material.uniforms.opacity.value = 1 - (0.5 *GameState.MenuManager.pulseOpacity);
      }

      if(this.highlight.edge_material){
        this.highlight.edge_material.uniforms.opacity.value = 1 - (0.5 *GameState.MenuManager.pulseOpacity);
      }

      if(this.highlight.corner_material){
        this.highlight.corner_material.uniforms.opacity.value = 1 - (0.5 *GameState.MenuManager.pulseOpacity);
      }

      if(this.text.material){
        this.text.material.uniforms.opacity.value = 1 - (0.5 *GameState.MenuManager.pulseOpacity);
      }
  
      if(this.border.fill.material)
        this.border.fill.material.uniforms.opacity.value = 1 - (0.5 *GameState.MenuManager.pulseOpacity);
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
  }

  resetPulse(){
    if(this.border.edge_material){
      this.border.edge_material.uniforms.opacity.value = 1;
    }

    if(this.border.corner_material){
      this.border.corner_material.uniforms.opacity.value = 1;
    }

    if(this.highlight.edge_material){
      this.highlight.edge_material.uniforms.opacity.value = 1;
    }

    if(this.highlight.corner_material){
      this.highlight.corner_material.uniforms.opacity.value = 1;
    }

    if(this.text.material){
      this.text.material.uniforms.opacity.value = 1;
    }
    
    if(this.border.fill.material)
      this.border.fill.material.uniforms.opacity.value = 1;
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
    this.text.material.uniforms.diffuse.value.setRGB(r, g, b);
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

  setFillTextureName(name = ''): Promise<OdysseyTexture> {
    return new Promise<OdysseyTexture>( (resolve, reject) => {
      this.border.fill.texture = name;
      this.borderFillEnabled = true;
      if(name.length){
        this.highlightFillEnabled = true;
        this.highlight.fill.texture = name;
        TextureLoader.enQueue(this.border.fill.texture, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          this.setFillTexture(texture)
          this.setHighlightFillTexture(texture);
          resolve(texture);
        });
      }
    });
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

  calculatePosition(){
    if(!this.autoCalculatePosition || this.list)
      return;

    let parentExtent = { width: this.menu.width, height: this.menu.height };
    let parentOffsetX, parentOffsetY;
    //if(!(this.parent instanceof THREE.Scene)){
      //parentExtent = this.menu.tGuiPanel.extent;
      //console.log(this.parent)
      //parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x;
      //parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y;

    //}else{
    //  parentOffsetX = parentOffsetY = 0;
    //}

    if( this.parent && this.parent != this.menu.tGuiPanel && !this.scale){
      parentExtent = this.menu.tGuiPanel.extent;
      parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x;
      parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y;

      let posX = (this.extent.left - ( (parentExtent.width  - this.extent.width) / 2 ) );
      let posY = ((this.extent.top - ( (parentExtent.height - this.extent.height) / 2 ) ));

      this.widget.position.x = this.offset.x + (posX);
      this.widget.position.y = (-posY);
      
      this.updateBounds();

      return;
    }else{
      parentOffsetX = this.menu.tGuiPanel.extent.left;
      parentOffsetY = this.menu.tGuiPanel.extent.top;
    }

    // let wRatio = ResolutionManager.getViewportWidth() / this.menu.tGuiPanel.extent.width;
    // let hRatio = ResolutionManager.getViewportHeight() / this.menu.tGuiPanel.extent.height;

    let posX = (this.extent.left - ( (parentExtent.width  - this.extent.width) / 2 ) );
    let posY = ((-this.extent.top + ( (parentExtent.height - this.extent.height) / 2 ) ));

    this.anchorOffset = new THREE.Vector2(posX, posY);

    let halfX = parentExtent.width/2;
    let quatX = 25; //parentExtent.width/4;
    let halfY = parentExtent.height/2;
    let quatY = 25; //parentExtent.height/4;

    if(this.scale && this.anchor == 'none'){
      if(this.extent.left == 0 && this.extent.top == 0){
        //Screen centered
      }else{
        if(this.extent.left < (halfX/2) && this.extent.top > halfY){
          this.anchor = Anchor.BottomLeft;
        }else if( ( this.extent.left > quatX && this.extent.left < (halfX+quatX) ) && this.extent.top > halfY){
          this.anchor = Anchor.BottomCenter;
        }else if(this.extent.left > (halfX/2) && this.extent.top > halfY){
          this.anchor = Anchor.BottomRight;
        }

        if(this.extent.left < (halfX/2) && this.extent.top < halfY){
          this.anchor = Anchor.TopLeft;
        }else if( ( this.extent.left > quatX && this.extent.left < (halfX+quatX) ) && this.extent.top < halfY){
          this.anchor = Anchor.TopCenter
        }else if(this.extent.left > (halfX/2) && this.extent.top < halfY){
          this.anchor = Anchor.TopRight;
        }
      }
    }

    switch(this.anchor){
      case Anchor.TopLeft:
        this.anchorOffset.x = -((GameState.ResolutionManager.getViewportWidth()) / 2) + ((this.extent.width/2)) + this.extent.left;
        this.anchorOffset.y = ((GameState.ResolutionManager.getViewportHeight()) / 2) - (this.extent.top + (this.extent.height/2));
      break;
      case Anchor.TopCenter:
        if(this.extent.left < halfX){
          this.anchorOffset.y = ((GameState.ResolutionManager.getViewportHeight()) / 2) - (this.extent.top + (this.extent.height/2));
        }else{
          this.anchorOffset.y = ((GameState.ResolutionManager.getViewportHeight()) / 2) - (this.extent.top + (this.extent.height/2));
        }
      break;
      case Anchor.TopRight:
        this.anchorOffset.x = ((GameState.ResolutionManager.getViewportWidth()) / 2) + ((this.extent.width/2) + (this.extent.left - 800));
        this.anchorOffset.y = ((GameState.ResolutionManager.getViewportHeight()) / 2) - (this.extent.top + (this.extent.height/2));
      break;
      case Anchor.BottomLeft:
        this.anchorOffset.x = -((GameState.ResolutionManager.getViewportWidth()) / 2) + ((this.extent.width/2)) + this.extent.left;
        this.anchorOffset.y = -(((GameState.ResolutionManager.getViewportHeight()) / 2) - (600 - this.extent.top) + (this.extent.height/2));
      break;
      case Anchor.BottomCenter:
        if(this.extent.left < (halfX)){
          this.anchorOffset.y = -(((GameState.ResolutionManager.getViewportHeight()) / 2) - (600 - this.extent.top) + (this.extent.height/2));
        }else{
          this.anchorOffset.y = -(((GameState.ResolutionManager.getViewportHeight()) / 2) - (600 - this.extent.top) + (this.extent.height/2));  
        }
      break;
      case Anchor.BottomRight:
        this.anchorOffset.x = ((GameState.ResolutionManager.getViewportWidth()) / 2) + ((this.extent.width/2) + (this.extent.left - 800));
        this.anchorOffset.y = -(((GameState.ResolutionManager.getViewportHeight()) / 2) - (600 - this.extent.top) + (this.extent.height/2));
      break;
      default:
        this.anchorOffset = new THREE.Vector2(posX, posY);
      break;
    }

    this.widget.position.x = this.anchorOffset.x + this.offset.x;
    this.widget.position.y = this.anchorOffset.y + this.offset.y;

    this.updateBounds();

  }

  getActiveControls(){

    if(!this.widget.visible)
      return [];

    let controls: GUIControl[] = [];
    for(let i = 0; i < this.children.length; i++){
      let control = this.children[i];
      if(control.box && control.box.containsPoint(Mouse.positionUI) && (control.allowClick || control.editable)){
        controls.push(control);
      }else{
        this.menu.setWidgetHoverActive(control, false);
      }
      if(control.box && control.box.containsPoint(Mouse.positionUI)){
        controls = controls.concat( control.getActiveControls() );
      }
    }
    
    return controls;
  }

  updateBounds(){
    let worldPosition: THREE.Vector3 = new THREE.Vector3;
    if(this.list){
      worldPosition.copy(this.parent.widget.position.clone());
      //console.log('worldPos', worldPosition);
      this.box.min.x = this.widget.position.x - this.extent.width/2 + worldPosition.x;
      this.box.min.y = this.widget.position.y - this.extent.height/2 + worldPosition.y;
      this.box.max.x = this.widget.position.x + this.extent.width/2 + worldPosition.x;
      this.box.max.y = this.widget.position.y + this.extent.height/2 + worldPosition.y;
      
      for(let i = 0; i < this.children.length; i++){
        this.children[i].updateBounds();
      }
    }else{
      this.widget.getWorldPosition(worldPosition);
      this.box.setFromCenterAndSize((new THREE.Vector2(worldPosition.x, worldPosition.y)), new THREE.Vector2(this.extent.width * this.menu.scale, this.extent.height * this.menu.scale));
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
    let renderSize = this.getRendererSize();

    let wRatio = GameState.ResolutionManager.getViewportWidth() / this.menu.tGuiPanel.extent.width;
    let hRatio = GameState.ResolutionManager.getViewportHeight() / this.menu.tGuiPanel.extent.height;

    let parentExtent = { width: this.menu.width, height: this.menu.height };
    //if(!(this.parent instanceof THREE.Scene)){
      //parentExtent = this.parent.control.extent;
    //}

    let left = this.extent.left - ( (parentExtent.width - this.extent.width) / 2 );
    let top = -this.extent.top + ( (parentExtent.height - this.extent.height) / 2 );

    let shrinkWidth = this.getShrinkWidth();
    left += shrinkWidth;

    return {
      top: top,
      left: left,// + this.border.dimension,
      width: this.extent.width,
      height: this.extent.height,
    };

  }

  getInnerSize(){
    let width = this.extent.width - this.border.dimension;
    if(width < this.border.dimension) width = this.border.dimension;

    let height = this.extent.height - this.border.dimension;
    if(height < this.border.dimension) height = this.border.dimension;

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

  getFillExtent(){
    let extent = this.getControlExtent();
    let inner = this.getInnerSize();
    //console.log('size', extent, inner);

    let shrinkWidth = this.getShrinkWidth();

    let width = inner.width - this.border.dimension - shrinkWidth;
    let height = inner.height - this.border.dimension;

    if(width < 0){
      width = 0.00001;
    }

    if(height < 0){
      height = 0.00001;
    }

    return {
      top: extent.top, 
      left: extent.left, 
      width: width,
      height: height
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
      shrinkWidth = ((this as any).scrollbar.extent.width) + ((this as any).scrollbar.border.dimension * 2);
    }
    return shrinkWidth;
  }

  getBorderExtent(side: string){
    // let extent = this.getControlExtent();
    let inner = this.getInnerSize();

    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIProtoItem)){
      inner.width += this.parent.border.inneroffset * 2;
      inner.width = Math.min(this.extent.width, inner.width);
    }

    let top = 0, left = 0, width = 0, height = 0;

    let shrinkWidth = this.getShrinkWidth();

    switch(side){
      case 'top':
        top = -(inner.height/2); 
        left =  -shrinkWidth/2; 
        width = inner.width - (this.getBorderSize()) - shrinkWidth;
        height = this.getBorderSize();
      break;
      case 'bottom':
        top = (inner.height/2); 
        left = -shrinkWidth/2; 
        width = inner.width - (this.getBorderSize()) - shrinkWidth;
        height = this.getBorderSize();
      break;
      case 'left':
        top = 0
        left = -(inner.width/2); 
        width = inner.height - (this.getBorderSize()) < 0 ? 0.000001 : inner.height - (this.getBorderSize());
        height = this.getBorderSize();
      break;
      case 'right':
        top = 0; 
        left = (inner.width/2) - shrinkWidth; 
        width = inner.height - (this.getBorderSize()) < 0 ? 0.000001 : inner.height - (this.getBorderSize());
        height = this.getBorderSize();
      break;
      case 'topLeft':
        top = ((inner.height/2)); 
        left = -((inner.width/2)); 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
      case 'topRight':
        top = (inner.height/2); 
        left = (inner.width/2) - shrinkWidth; 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
      case 'bottomLeft':
        top = -((inner.height/2)); 
        left = -((inner.width/2)); 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
      case 'bottomRight':
        top = -((inner.height/2)); 
        left = ((inner.width / 2)) - shrinkWidth; 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
    }

    if(width < 0){
      width = 0.00001;
    }

    if(height < 0){
      height = 0.00001;
    }

    return {
      top: top, 
      left: left + (this.flipLeft() ? shrinkWidth : 0), 
      width: width,
      height: height
    };

  }

  getHighlightExtent(side: string){
    let extent = this.getControlExtent();
    let inner = this.getInnerSize();

    let top = 0, left = 0, width = 0, height = 0;

    if(BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIProtoItem)){
      inner.width += this.parent.border.inneroffset * 2;
      inner.width = Math.min(this.extent.width, inner.width);
    }

    let shrinkWidth = this.getShrinkWidth();

    switch(side){
      case 'top':
        top = -( (inner.height/2) );
        left = -shrinkWidth/2;
        width = inner.width - (this.getHightlightSize()) - shrinkWidth;
        height = this.getHightlightSize();
      break;
      case 'bottom':
        top = (inner.height/2); 
        left = -shrinkWidth/2; 
        width = inner.width - (this.getHightlightSize()) - shrinkWidth;
        height = this.getHightlightSize();
      break;
      case 'left':
        top = 0; 
        left = -(inner.width/2); 
        width = inner.height - (this.getHightlightSize());
        height = this.getHightlightSize();
      break;
      case 'right':
        top = 0; 
        left = (inner.width/2); 
        width = inner.height - (this.getHightlightSize());
        height = this.getHightlightSize();
      break;
      case 'topLeft':
        top = ((inner.height/2)); 
        left = -((inner.width/2)); 
        width = this.getHightlightSize();
        height = this.getHightlightSize();
      break;
      case 'topRight':
        top = (inner.height/2); 
        left = (inner.width/2) - shrinkWidth; 
        width = this.getHightlightSize();
        height = this.getHightlightSize();
      break;
      case 'bottomLeft':
        top = -((inner.height/2)); 
        left = -((inner.width/2)); 
        width = this.getHightlightSize();
        height = this.getHightlightSize();
      break;
      case 'bottomRight':
        top = -((inner.height/2)); 
        left = ((inner.width / 2)) - shrinkWidth; 
        width = this.getHightlightSize();
        height = this.getHightlightSize();
      break;
    }

    if(width < 0){
      width = 0.00001;
    }

    if(height < 0){
      height = 0.00001;
    }

    return {
      top: top, 
      left: left + (this.flipLeft() ? shrinkWidth : 0), 
      width: width,
      height: height
    };
  }

  buildFill(){
    let extent = this.getFillExtent();
    
    if(this.border.fill.mesh){
      this.border.fill.mesh.name = this.widget.name+' center fill';
      this.border.fill.mesh.scale.x = extent.width || 0.000001;
      this.border.fill.mesh.scale.y = extent.height || 0.000001;
      this.border.fill.mesh.position.z = this.zOffset;

      let shrinkWidth = this.getShrinkWidth();
      this.border.fill.mesh.position.x = (this.flipLeft() ? shrinkWidth/2 : -shrinkWidth/2);
    }
  }

  buildBorder(){

    let edgeGeometries = 4;
    let cornerGeometries = 4;
    let geomCount = edgeGeometries + cornerGeometries;

    let planes: THREE.BufferGeometry[] = [];
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

  updateTextGeometry(text: string){

    if(!(this.text.texture instanceof THREE.Texture))
      return;

    if(this.guiFont){
      this.guiFont.buildGeometry(this.text.geometry, this.text.text, this.text.alignment, this.getOuterSize().width);
      this.alignText();
    }
    
  }

  textSize: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  alignText(){
    if(this.text.geometry && this.text.geometry.boundingBox){
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
    this.widget.userData.text.position.z = this.zOffset;

    const innerSize = this.getInnerSize()

    //Horizontal Alignment moved to GUIFont
    // const horizontal = this.text.alignment & GUIControlAlignment.HorizontalMask;
    this.widget.userData.text.position.x = -(innerSize.width/2 - this.textSize.x/2) - this.textSize.x/2;

    const vertical   = this.text.alignment & GUIControlAlignment.VerticalMask;
    switch(vertical){
      case GUIControlAlignment.VerticalTop:
        this.widget.userData.text.position.y = (innerSize.height/2 - this.textSize.y/2) + this.textSize.y/2;
      break;
      case GUIControlAlignment.VerticalCenter:
        this.widget.userData.text.position.y = this.textSize.y/2;
      break;
      case GUIControlAlignment.VerticalBottom:
        this.widget.userData.text.position.y = -(innerSize.height/2 - this.textSize.y/2) + this.textSize.y/2;
      break;
    }

    if(BitWise.InstanceOfObject(this.parent, GUIControlTypeMask.GUIListBox) && this.type == GUIControlType.Label){
      // this.widget.userData.text.position.x -= (this.parent.scrollbar.extent.width) + (this.parent.scrollbar.border.dimension * 2);
      this.extent.height = this.textSize.y;
      this.resizeControl();
      this.list.updateList();
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
    //window.renderer;
    return {width: GameState.ResolutionManager.getViewportWidth(), height: GameState.ResolutionManager.getViewportHeight()};
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

  }

  getText(){
    return this.text.text;
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
    }
  }

  resizeHighlightFill(){
    if(this.highlight.fill.mesh){
      let extent = this.getFillExtent();
      this.highlight.fill.mesh.scale.x = extent.width || 0.000001;
      this.highlight.fill.mesh.scale.y = extent.height || 0.000001;
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
    this.processEventListener('click');
  }

  setDPadTarget(direction = '', control: GUIControl){
    if(typeof direction == 'string'){
      direction = direction.toLowerCase();
    }

    if(control instanceof GUIControl){
      switch(direction){
        case 'up':
          this.dPadTarget.up = control;
        break;
        case 'down':
          this.dPadTarget.down = control;
        break;
        case 'left':
          this.dPadTarget.left = control;
        break;
        case 'right':
          this.dPadTarget.right = control;
        break;
      }
    }
  }

  directionalNavigate(direction = ''){
    switch(direction){
      case 'up':

      break;
      case 'down':

      break;
      case 'left':

      break;
      case 'right':

      break;
    }
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

}
