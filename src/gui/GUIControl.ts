import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { KeyMapper, Mouse } from "@/controls";
import { KeyMapAction } from "@/enums/controls/KeyMapAction";
import { GameEngineType } from "@/enums/engine";
import { Anchor } from "@/enums/gui/Anchor";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { TextureType } from "@/enums/loaders/TextureType";
import { GameState } from "@/GameState";
import type { GameMenu } from "@/gui/GameMenu";
import { GUIControlEvent, type GUIControlEventData } from "@/gui/GUIControlEvent";
import { GUIControlEventFactory } from "@/gui/GUIControlEventFactory";
import { GUIFont } from "@/gui/GUIFont";
import { GUIListBox } from "@/gui/GUIListBox";
import { IDPadTarget } from "@/interface/gui/IDPadTarget";
import { IGUIControlBorder } from "@/interface/gui/IGUIControlBorder";
import { IGUIControlColors } from "@/interface/gui/IGUIControlColors";
import { IGUIControlEventListeners } from "@/interface/gui/IGUIControlEventListeners";
import { IGUIControlExtent } from "@/interface/gui/IGUIControlExtent";
import type { IGUIControlListNode } from "@/interface/gui/IGUIControlListNode";
import { IGUIControlMoveTo } from "@/interface/gui/IGUIControlMoveTo";
import { IGUIControlText } from "@/interface/gui/IGUIControlText";
import { TextureLoader } from "@/loaders";
import { GFFStruct } from "@/resource/GFFStruct";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { BitWise } from "@/utility/BitWise";
import { createScopedLogger, LogScope } from "@/utility/Logger";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-this-alias, @typescript-eslint/no-unused-vars */



const log = createScopedLogger(LogScope.Game);

/** Duck-typed source for control init (GFFStruct or plain object with same shape). */
interface IGUIControlInitSource {
  hasField?(label: string): boolean;
  getFieldByLabel?(label: string): unknown;
  [key: string]: unknown;
}
interface IGUIControlFieldLike { getValue(): unknown }
interface IGUIControlVectorLike { getVector(): THREE.Vector3 }
interface IGUIControlStructLike { hasField?(label: string): boolean; getFieldByLabel?(label: string): unknown; getChildStructs?(): unknown[] }

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
  /** List item payload (e.g. ModuleItem or string); set by GUIListBox. */
  node: IGUIControlListNode | string | undefined;
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
    click: [],
    mouseIn: [],
    mouseOut: [],
    mouseDown: [],
    mouseMove: [],
    mouseUp: [],
    hover: []
  };

  defaultColor: THREE.Color;
  defaultHighlightColor: THREE.Color;

  allowClick: boolean = true;
  disableSelection: boolean = false;

  onClick?: (e: GUIControlEvent) => void;
  onMouseMove?: (e: GUIControlEvent) => void;
  onMouseDown?: (e: GUIControlEvent) => void;
  onMouseUp?: (e: GUIControlEvent) => void;
  onMouseIn?: (e: GUIControlEvent) => void;
  onMouseOut?: (e: GUIControlEvent) => void;
  onDrag?: (e: GUIControlEvent) => void;
  onDragEnd?: (e: GUIControlEvent) => void;
  onHover?: (e: GUIControlEvent) => void;

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
  hasHighlight: boolean;
  hasMoveTo: boolean;
  borderEnabled: boolean;
  borderFillEnabled: boolean;
  highlightEnabled: boolean;
  highlightFillEnabled: boolean;
  hovering: boolean;
  anchorOffset: THREE.Vector2 = new THREE.Vector2(0, 0);
  editable: boolean;
  selected: boolean;
  onSelect?: () => void;

  userData: Record<string, unknown> = {};

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl | undefined, scale: boolean = false) {

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

    if (GameState.GameKey == GameEngineType.TSL) {
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

  initObjects() {
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

    this.border.mesh = new THREE.Mesh(this.border.geometry, [this.border.edge_material, this.border.corner_material]);
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
    this.border.fill.geometry = new THREE.PlaneGeometry(1, 1, 1) as THREE.BufferGeometry;
    this.border.fill.mesh = new THREE.Mesh(this.border.fill.geometry, this.border.fill.material);

    this.widget.userData.border.add(this.border.fill.mesh);

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

    this.highlight.mesh = new THREE.Mesh(this.highlight.geometry, [this.highlight.edge_material, this.highlight.corner_material]);
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
    this.highlight.fill.geometry = new THREE.PlaneGeometry(1, 1, 1);
    this.highlight.fill.mesh = new THREE.Mesh(this.highlight.fill.geometry, this.highlight.fill.material);

    this.widget.userData.highlight.add(this.highlight.fill.mesh);

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
    this.text.geometry.index = new THREE.BufferAttribute(new Uint16Array(), 1).setUsage(THREE.StaticDrawUsage);

    const posAttribute = new THREE.BufferAttribute(new Float32Array(), 2).setUsage(THREE.StaticDrawUsage);
    const uvAttribute = new THREE.BufferAttribute(new Float32Array(), 2).setUsage(THREE.StaticDrawUsage);
    this.text.geometry.setAttribute('position', posAttribute);
    this.text.geometry.setAttribute('uv', uvAttribute);

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
    this.text.mesh = new THREE.Mesh(this.text.geometry, this.text.material);
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

  setList(list: GUIListBox) {
    this.list = list;
  }

  initInputListeners() {
    //---------//
    //  Border
    //---------//

    if (this.border.mesh) {
      this.border.mesh.name = 'GUIBorder';
      this.border.mesh.position.z = this.zOffset;
      this.attachEventListenters(this.border.mesh);
    }

    //-------------//
    // Border Fill
    //-------------//

    if (this.border.fill.mesh) {
      this.border.fill.mesh.renderOrder = this.id;
      this.attachEventListenters(this.border.fill.mesh);
    }

    //-----------//
    // Highlight
    //-----------//

    if (this.highlight.mesh) {
      this.highlight.mesh.name = 'GUIHighlight';
      this.highlight.mesh.position.z = this.zOffset;
      this.attachEventListenters(this.highlight.mesh);
    }

    //----------------//
    // Highlight Fill
    //----------------//

    if (this.highlight.fill.mesh) {
      this.highlight.fill.mesh.renderOrder = this.id;
      this.attachEventListenters(this.highlight.fill.mesh);
    }

    //------//
    // Text
    //------//

    if (this.text.mesh) {
      this.text.mesh.name = 'GUIText';
      this.text.mesh.position.z = this.zOffset;
      this.text.mesh.renderOrder = 5;
      this.attachEventListenters(this.text.mesh);
    }

  }

  attachEventListenters(object: THREE.Object3D) {
    if (object instanceof THREE.Object3D) {
      object.userData.isClickable = (_e: GUIControlEvent) => {
        return this.isClickable();
      };

      object.userData.onClick = (e: GUIControlEvent) => {
        this.processEventListener('click', [e]);
      };

      object.userData.onMouseMove = (e: GUIControlEvent) => {
        this.processEventListener('mouseMove', [e]);
      }

      object.userData.onMouseDown = (e: GUIControlEvent) => {
        this.processEventListener('mouseDown', [e]);
      };

      object.userData.onMouseUp = (e: GUIControlEvent) => {
        this.processEventListener('mouseUp', [e]);
      };

      object.userData.onHover = (e: GUIControlEvent) => {
        this.processEventListener('hover', [e]);
      };

      object.userData.getControl = () => {
        return this;
      }
    }
  }

  initProperties() {
    if (this.control instanceof GFFStruct) {
      const control = this.control;

      this.type = control.hasField('CONTROLTYPE') ? control.getNumberByLabel('CONTROLTYPE') : -1;
      this.widget.name = this.name = control.hasField('TAG') ? control.getStringByLabel('TAG') : '';
      this.id = control.hasField('ID') ? control.getNumberByLabel('ID') : -1;
      this.objectLocked = control.hasField('Obj_Locked') ? control.getNumberByLabel('Obj_Locked') : -1;
      this.objectParent = control.hasField('Obj_Parent') ? control.getNumberByLabel('Obj_Parent') : -1;
      this.objectParentId = control.hasField('Obj_ParentID') ? control.getNumberByLabel('Obj_ParentID') : -1;

      this.padding = control.hasField('PADDING') ? control.getNumberByLabel('PADDING') : 0;

      //Extent
      this.hasExtent = control.hasField('EXTENT');
      if (this.hasExtent) {
        const extent = control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
        if (extent) {
          this.extent.top = extent.getNumberByLabel('TOP');
          this.extent.left = extent.getNumberByLabel('LEFT');
          this.extent.width = extent.getNumberByLabel('WIDTH');
          this.extent.height = extent.getNumberByLabel('HEIGHT');
        }
      }

      //Border
      this.hasBorder = control.hasField('BORDER');
      if (this.hasBorder) {
        const border = control.getFieldByLabel('BORDER')?.getChildStructs()[0];
        if (border) {
          if (border.hasField('COLOR')) {
            const color = border.getFieldByLabel('COLOR')?.getVector();
            if (color && (color.x * color.y * color.z) < 1) {
              if (this.border.color && this.border.fill.material) {
                this.border.color.setRGB(color.x, color.y, color.z);
                this.border.fill.material.uniforms.diffuse.value.set(this.border.color);
              }
            }
          }

          if (typeof this.border.color === 'undefined') {
            this.border.color = new THREE.Color(1, 1, 1); //this.defaultColor;
          }

          this.border.dimension = border.getNumberByLabel('DIMENSION') || 0;
          this.border.corner = border.getStringByLabel('CORNER');
          this.border.edge = border.getStringByLabel('EDGE');
          this.border.fill.texture = border.getStringByLabel('FILL');
          this.border.fillstyle = border.getNumberByLabel('FILLSTYLE') || 0;
          this.border.inneroffset = this.border.inneroffsety = border.getNumberByLabel('INNEROFFSET') || 0;

          if (border.hasField('INNEROFFSETY'))
            this.border.inneroffsety = border.getNumberByLabel('INNEROFFSETY');

          this.border.pulsing = border.getNumberByLabel('PULSING') || 0;
        }

      }

      //Text
      this.hasText = control.hasField('TEXT');
      if (this.hasText) {
        const text = control.getFieldByLabel('TEXT')?.getChildStructs()[0];
        if (text) {
          this.text.font = text.getStringByLabel('FONT');
          this.text.strref = text.getNumberByLabel('STRREF');
          this.text.text = (text.hasField('TEXT') ? this.menu.gameStringParse(text.getStringByLabel('TEXT')) : '');
          if (this.text.text == '') {
            this.text.text = this.menu.gameStringParse(GameState.TLKManager.TLKStrings[this.text.strref]?.Value || '');
          }
          this.text.alignment = text.getNumberByLabel('ALIGNMENT');
          this.text.pulsing = text.getNumberByLabel('PULSING');

          if (this.text.font == 'fnt_d16x16') {
            this.text.font = 'fnt_d16x16b';
          }

          if (text.hasField('COLOR')) {
            const color = text.getFieldByLabel('COLOR')?.getVector();
            if (color) this.text.color.setRGB(color.x, color.y, color.z)
          }

          if (typeof this.text.color === 'undefined') {
            this.text.color = this.defaultColor.clone();
          }
        }
      }

      //Highlight
      this.hasHighlight = control.hasField('HILIGHT');
      if (this.hasHighlight) {
        const highlight = control.getFieldByLabel('HILIGHT')?.getChildStructs()[0];
        if (highlight) {
          if (highlight.hasField('COLOR')) {
            const color = highlight.getFieldByLabel('COLOR')?.getVector();
            if (color && (color.x * color.y * color.z) < 1) {
              if (this.highlight.color && this.highlight.fill.material) {
                this.highlight.color.setRGB(color.x, color.y, color.z);
                this.highlight.fill.material.uniforms.diffuse.value.set(this.highlight.color);
              }
            }
          }

          if (typeof this.highlight.color === 'undefined') {
            this.highlight.color = new THREE.Color(1, 1, 1); //this.defaultColor;
          }

          this.highlight.dimension = highlight.getNumberByLabel('DIMENSION') || 0;
          this.highlight.corner = highlight.getStringByLabel('CORNER') || '';
          this.highlight.edge = highlight.getStringByLabel('EDGE') || '';
          this.highlight.fill.texture = highlight.getStringByLabel('FILL') || '';
          this.highlight.fillstyle = highlight.getNumberByLabel('FILLSTYLE') || 0;
          this.highlight.inneroffset = this.highlight.inneroffsety = highlight.getNumberByLabel('INNEROFFSET') || 0;

          if (highlight.hasField('INNEROFFSETY'))
            this.highlight.inneroffsety = highlight.getNumberByLabel('INNEROFFSETY');

          this.highlight.pulsing = highlight.getNumberByLabel('PULSING') || 0;
        }
      }

      //Moveto
      this.hasMoveTo = control.hasField('MOVETO');
      if (this.hasMoveTo) {
        const moveTo = control.getFieldByLabel('MOVETO')?.getChildStructs()[0];
        if (moveTo) {
          this.moveTo.down = moveTo.getNumberByLabel('DOWN');
          this.moveTo.left = moveTo.getNumberByLabel('LEFT');
          this.moveTo.right = moveTo.getNumberByLabel('RIGHT');
          this.moveTo.up = moveTo.getNumberByLabel('UP');
        }
      }
    } else if (this.control != null && typeof this.control === 'object') {
      const c = this.control as IGUIControlInitSource;
      const has = (label: string) => (typeof c.hasField === 'function' ? c.hasField(label) : label in c);
      const get = (label: string) => (typeof c.getFieldByLabel === 'function' ? c.getFieldByLabel(label) : (c as Record<string, unknown>)[label]);
      const val = (f: IGUIControlFieldLike | unknown) => (f != null && typeof (f as IGUIControlFieldLike).getValue === 'function' ? (f as IGUIControlFieldLike).getValue() : f);
      const vec = (f: IGUIControlVectorLike | undefined) => (f != null && typeof (f as IGUIControlVectorLike).getVector === 'function' ? (f as IGUIControlVectorLike).getVector() : f);
      const child = (f: IGUIControlStructLike | null | undefined): IGUIControlStructLike | undefined => {
        if (f == null) return undefined;
        if (typeof (f as IGUIControlStructLike).getChildStructs === 'function') {
          const arr = (f as IGUIControlStructLike).getChildStructs();
          return Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
        }
        return f as IGUIControlStructLike;
      };
      const childVal = (ch: IGUIControlStructLike | null | undefined, label: string) => {
        if (ch == null) return undefined;
        const f = typeof ch.getFieldByLabel === 'function' ? ch.getFieldByLabel(label) : (ch as Record<string, unknown>)[label];
        return val(f);
      };
      const childVec = (ch: IGUIControlStructLike | null | undefined, label: string) => {
        if (ch == null) return undefined;
        const f = typeof ch.getFieldByLabel === 'function' ? ch.getFieldByLabel(label) : (ch as Record<string, unknown>)[label];
        return vec(f);
      };

      this.type = has('CONTROLTYPE') ? val(get('CONTROLTYPE')) : -1;
      this.widget.name = this.name = has('TAG') ? (val(get('TAG')) ?? '') : '';
      this.id = has('ID') ? val(get('ID')) : -1;
      this.objectLocked = has('Obj_Locked') ? val(get('Obj_Locked')) : -1;
      this.objectParent = has('Obj_Parent') ? val(get('Obj_Parent')) : -1;
      this.objectParentId = has('Obj_ParentID') ? val(get('Obj_ParentID')) : -1;
      this.padding = has('PADDING') ? (val(get('PADDING')) ?? 0) : 0;

      const extentStruct = child(get('EXTENT'));
      this.hasExtent = has('EXTENT') && extentStruct != null;
      if (this.hasExtent && extentStruct) {
        this.extent.top = childVal(extentStruct, 'TOP');
        this.extent.left = childVal(extentStruct, 'LEFT');
        this.extent.width = childVal(extentStruct, 'WIDTH');
        this.extent.height = childVal(extentStruct, 'HEIGHT');
      }

      const borderStruct = child(get('BORDER'));
      this.hasBorder = has('BORDER') && borderStruct != null;
      if (this.hasBorder && borderStruct) {
        const color = childVec(borderStruct, 'COLOR');
        if (color && (color.x * color.y * color.z) < 1) {
          if (this.border.color && this.border.fill.material) {
            this.border.color.setRGB(color.x, color.y, color.z);
            this.border.fill.material.uniforms.diffuse.value.set(this.border.color);
          }
        }
        if (typeof this.border.color === 'undefined') {
          this.border.color = new THREE.Color(1, 1, 1);
        }
        this.border.dimension = childVal(borderStruct, 'DIMENSION') ?? 0;
        this.border.corner = childVal(borderStruct, 'CORNER');
        this.border.edge = childVal(borderStruct, 'EDGE');
        this.border.fill.texture = childVal(borderStruct, 'FILL');
        this.border.fillstyle = childVal(borderStruct, 'FILLSTYLE') ?? 0;
        this.border.inneroffset = this.border.inneroffsety = childVal(borderStruct, 'INNEROFFSET') ?? 0;
        if (borderStruct != null && (typeof borderStruct.hasField === 'function' ? borderStruct.hasField('INNEROFFSETY') : 'INNEROFFSETY' in borderStruct)) {
          this.border.inneroffsety = childVal(borderStruct, 'INNEROFFSETY');
        }
        this.border.pulsing = childVal(borderStruct, 'PULSING') ?? 0;
      }

      const textStruct = child(get('TEXT'));
      this.hasText = has('TEXT') && textStruct != null;
      if (this.hasText && textStruct) {
        this.text.font = childVal(textStruct, 'FONT');
        this.text.strref = childVal(textStruct, 'STRREF');
        this.text.text = (textStruct != null && (typeof textStruct.hasField === 'function' ? textStruct.hasField('TEXT') : 'TEXT' in textStruct))
          ? this.menu.gameStringParse(childVal(textStruct, 'TEXT') ?? '')
          : '';
        if (this.text.text === '') {
          this.text.text = this.menu.gameStringParse(GameState.TLKManager.TLKStrings[this.text.strref]?.Value ?? '');
        }
        this.text.alignment = childVal(textStruct, 'ALIGNMENT');
        this.text.pulsing = childVal(textStruct, 'PULSING');
        if (this.text.font === 'fnt_d16x16') {
          this.text.font = 'fnt_d16x16b';
        }
        const textColor = childVec(textStruct, 'COLOR');
        if (textColor) this.text.color.setRGB(textColor.x, textColor.y, textColor.z);
        if (typeof this.text.color === 'undefined') {
          this.text.color = this.defaultColor.clone();
        }
      }

      const highlightStruct = child(get('HILIGHT'));
      this.hasHighlight = has('HILIGHT') && highlightStruct != null;
      if (this.hasHighlight && highlightStruct) {
        const hlColor = childVec(highlightStruct, 'COLOR');
        if (hlColor && (hlColor.x * hlColor.y * hlColor.z) < 1) {
          if (this.highlight.color && this.highlight.fill.material) {
            this.highlight.color.setRGB(hlColor.x, hlColor.y, hlColor.z);
            this.highlight.fill.material.uniforms.diffuse.value.set(this.highlight.color);
          }
        }
        if (typeof this.highlight.color === 'undefined') {
          this.highlight.color = new THREE.Color(1, 1, 1);
        }
        this.highlight.dimension = childVal(highlightStruct, 'DIMENSION') ?? 0;
        this.highlight.corner = (childVal(highlightStruct, 'CORNER') ?? '') as string;
        this.highlight.edge = (childVal(highlightStruct, 'EDGE') ?? '') as string;
        this.highlight.fill.texture = (childVal(highlightStruct, 'FILL') ?? '') as string;
        this.highlight.fillstyle = childVal(highlightStruct, 'FILLSTYLE') ?? 0;
        this.highlight.inneroffset = this.highlight.inneroffsety = childVal(highlightStruct, 'INNEROFFSET') ?? 0;
        if (highlightStruct != null && (typeof highlightStruct.hasField === 'function' ? highlightStruct.hasField('INNEROFFSETY') : 'INNEROFFSETY' in highlightStruct)) {
          this.highlight.inneroffsety = childVal(highlightStruct, 'INNEROFFSETY');
        }
        this.highlight.pulsing = childVal(highlightStruct, 'PULSING') ?? 0;
      }

      const moveToStruct = child(get('MOVETO'));
      this.hasMoveTo = has('MOVETO') && moveToStruct != null;
      if (this.hasMoveTo && moveToStruct) {
        this.moveTo.down = childVal(moveToStruct, 'DOWN');
        this.moveTo.left = childVal(moveToStruct, 'LEFT');
        this.moveTo.right = childVal(moveToStruct, 'RIGHT');
        this.moveTo.up = childVal(moveToStruct, 'UP');
      }
    }
  }

  initTextures() {

    //--------//
    // Border
    //--------//

    if (this.border.edge != '') {
      this.border.edge_material.visible = false;
      TextureLoader.enQueue(this.border.edge, this.border.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if (!texture) {
          log.debug('initTextures', this.border.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (!this.border.edge_material.transparent) {
          this.border.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.border.edge_material.visible = true;
        if (typeof this.borderEnabled == 'undefined')
          this.borderEnabled = true;
      });
    } else {
      this.border.edge_material.visible = false;
      this.borderEnabled = false;
    }

    if (this.border.corner != '') {
      this.border.corner_material.visible = false;
      TextureLoader.enQueue(this.border.corner, this.border.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if (!texture) {
          log.debug('initTextures', this.border.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (!this.border.corner_material.transparent) {
          this.border.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.border.corner_material.visible = true;
        if (typeof this.borderEnabled == 'undefined')
          this.borderEnabled = true;
      });
    } else {
      this.border.corner_material.visible = false;
      this.borderEnabled = false;
    }

    if (this.border.fill.texture != '') {
      this.border.fill.material.transparent = true;
      this.border.fill.material.visible = false;
      TextureLoader.enQueue(this.border.fill.texture, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if (!(texture)) {
          this.border.fill.material.visible = false;
          return;
        }

        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (!this.border.fill.material.transparent) {
          this.border.fill.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.border.fill.material.visible = true;
        if (typeof this.borderFillEnabled == 'undefined')
          this.borderFillEnabled = true;
      });
    } else {
      this.border.fill.material.visible = false;
      this.borderFillEnabled = false;
    }

    //-----------//
    // Highlight
    //-----------//

    if (this.highlight.edge != '') {
      this.highlight.edge_material.visible = false;
      TextureLoader.enQueue(this.highlight.edge, this.highlight.edge_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if (!texture) {
          log.debug('initTextures', this.highlight.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (!this.highlight.edge_material.transparent) {
          this.highlight.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.highlight.edge_material.visible = true;
        if (typeof this.highlightEnabled == 'undefined')
          this.highlightEnabled = true;
      });
    } else {
      this.highlight.edge_material.visible = false;
      this.highlightEnabled = false;
    }

    if (this.highlight.corner != '') {
      this.highlight.corner_material.visible = false;
      TextureLoader.enQueue(this.highlight.corner, this.highlight.corner_material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if (!texture) {
          log.debug('initTextures', this.highlight.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (!this.highlight.corner_material.transparent) {
          this.highlight.mesh.renderOrder = 0;
        }
        texture.needsUpdate = true;
        this.highlight.corner_material.visible = true;
        if (typeof this.highlightEnabled == 'undefined')
          this.highlightEnabled = true;
      });
    } else {
      this.highlight.corner_material.visible = false;
      this.highlightEnabled = false;
    }

    if (this.highlight.fill.material) {
      if (this.highlight.fill.texture != '') {
        this.highlight.fill.material.transparent = true;
        this.highlight.fill.material.visible = false;
        TextureLoader.enQueue(this.highlight.fill.texture, this.highlight.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          if (this.highlight.fill.material) {
            if (!(texture)) {
              this.highlight.fill.material.visible = false;
            } else {
              texture.anisotropy = 1;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              if (this.highlight.fill.mesh && !this.highlight.fill.material.transparent) {
                this.highlight.fill.mesh.renderOrder = 0;
              }
              texture.needsUpdate = true;
              this.highlight.fill.material.visible = true;
              this.highlightFillEnabled = true;
            }
          }
        });
      } else {
        this.highlight.fill.material.visible = false;
        this.highlightFillEnabled = false;
      }
    }

    //------//
    // Text
    //------//

    if (this.text.font != '') {
      this.text.material.visible = false;
      TextureLoader.enQueue(this.text.font, this.text.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        if (!texture) {
          log.debug('initTextures', this.text.font, texture);
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
      });
    } else {
      this.text.material.visible = false;
    }

  }

  isClickable() {
    return (this.eventListeners['click'].length || this.onClick) && this.isVisible() && !this.disableSelection;
  }

  isVisible() {
    return this.widget.visible;
  }

  mouseOver: boolean = false;
  onHoverOut() {
    this.hover = false;
    this.mouseOver = false;
    if (this.disableSelection) {
      return;
    }

    if (typeof this.onMouseOut === 'function')
      this.onMouseOut();

    if (this.swapBorderAndHighliteOnHover) {
      this.hideHighlight();

      if (this.border.edge != '')
        this.showBorder();
    } else {
      this.showBorder();
      this.hideHighlight();
    }

    this.processEventListener('mouseOut');
    this.setTooltipVisible(false);
  }

  onHoverIn() {
    this.mouseOver = true;
    if (this.disableSelection) {
      this.hover = false;
      return;
    }

    if (!this.hover && typeof this.onHover === 'function')
      this.onHover();

    this.hover = true;

    if (typeof this.onMouseIn === 'function')
      this.onMouseIn();

    if (this.swapBorderAndHighliteOnHover) {
      if (this.highlight.edge != '' || this.highlight.fill.texture != '')
        this.showHighlight();

      if (this.highlight.edge != '')
        this.hideBorder();
    } else {
      this.showBorder();
      this.showHighlight();
    }

    if (this.isClickable()) {
      GameState.guiAudioEmitter.playSoundFireAndForget('gui_scroll');
    }

    this.processEventListener('hover');
    this.processEventListener('mouseIn');

    // this.setTooltipVisible(true);
  }

  onFontTextureLoaded() {
    this.buildText();
  }

  resizeControl() {

    try {
      if (this.hasBorder) {
        this.buildBorder();
      }
      if (this.hasHighlight) {
        this.buildHighlight();
      }
    } catch (_e: unknown) {
      //Must not have a border
    }

    this.resizeFill();
    if (this.hasHighlight) {
      this.resizeHighlightFill();
    }

  }

  createControl() {

    if (this.widget instanceof THREE.Object3D && this.widget.parent) {
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

  buildChildren() {

    if (!(this.menu))
      return false;

    if (!(this.menu.tGuiPanel.control instanceof GFFStruct))
      return false;

    if (this.menu.tGuiPanel.control.hasField('CONTROLS')) {
      const children = this.menu.tGuiPanel.control.getFieldByLabel('CONTROLS')?.getChildStructs() || [];

      for (let i = 0; i < children.length; i++) {
        const childParent = (children[i].hasField('Obj_Parent') ? children[i].getStringByLabel('Obj_Parent') : '');
        if (childParent == this.name) {

          const control: GUIControl = this.menu.factory.FromStruct(children[i], this.menu, this, this.scale);

          control.zIndex = this.zIndex + 1;

          this.children.push(control);

          const _cWidget = control.createControl();
          _cWidget.position.z = control.zIndex;

          //this.widget.add(_cWidget);
          this.menu.tGuiPanel.widget.add(_cWidget);

        }
      }

    }
  }

  reattach(parent: GUIControl) {
    if (typeof this.parent != 'undefined') {
      this.parent.widget.remove(this.widget);
    }

    this.parent = parent;
    this.parent.widget.add(this.widget);
  }

  getControl() {
    return this.widget;
  }

  hide() {
    this.widget.visible = false;
  }

  show() {
    this.updateWorldPosition();
    this.widget.visible = true;
  }

  update(delta: number) {
    const opacity = this.disableSelection ? 0.5 : 1;
    if (this.pulsing || (this.hover && this.isClickable()) || this.selected) {
      const pulseOpacity = 1 - (0.5 * GameState.MenuManager.pulseOpacity) * opacity;
      /**
       * Border
       */
      if (this.border.edge_material) {
        this.border.edge_material.uniforms.opacity.value = this.hover ? 1 : pulseOpacity;
      }

      if (this.border.corner_material) {
        this.border.corner_material.uniforms.opacity.value = this.hover ? 1 : pulseOpacity;
      }

      if (this.border.fill.material) {
        this.border.fill.material.uniforms.opacity.value = this.hover ? 1 : pulseOpacity;
      }

      /**
       * Highlight
       */
      if (this.highlight.edge_material) {
        this.highlight.edge_material.uniforms.opacity.value = pulseOpacity;
      }

      if (this.highlight.corner_material) {
        this.highlight.corner_material.uniforms.opacity.value = pulseOpacity;
      }

      if (this.highlight.fill.material) {
        this.highlight.fill.material.uniforms.opacity.value = pulseOpacity;
      }

      /**
       * Text
       */
      if (this.text.material) {
        this.text.material.uniforms.opacity.value = !this.hover ? 1 : pulseOpacity;
        this.setTextColor(this.defaultHighlightColor.r, this.defaultHighlightColor.g, this.defaultHighlightColor.b);
      }
    } else {
      this.resetPulse();
    }

    if (this.border.edge_material && this.border.corner_material) {
      this.border.edge_material.visible = this.borderEnabled ? true : false;
      this.border.corner_material.visible = this.borderEnabled ? true : false;
    }

    if (this.highlight.edge_material && this.highlight.corner_material) {
      this.highlight.edge_material.visible = this.highlightEnabled ? true : false;
      this.highlight.corner_material.visible = this.highlightEnabled ? true : false;
    }

    if (this.border.fill.material) {
      this.border.fill.material.visible = this.borderFillEnabled;
    }

    if (this.highlight.fill.material) {
      this.highlight.fill.material.visible = this.highlightFillEnabled;
    }

    const len = this.children.length;
    for (let i = 0; i < len; i++) {
      this.children[i].update(delta);
    }

    //Tooltip timer
    this.tooltipTimer = (this.mouseOver ? this.tooltipTimer + (1000 * delta) : 0);
    if (this.tooltipTimer > 3000 && this.tooltipText != '') {
      this.setTooltipVisible(true);
    }
  }

  resetPulse() {
    const opacity = this.disableSelection ? 0.5 : 1;
    if (this.border.edge_material) {
      this.border.edge_material.uniforms.opacity.value = 1 * opacity;
    }

    if (this.border.corner_material) {
      this.border.corner_material.uniforms.opacity.value = 1 * opacity;
    }

    if (this.highlight.edge_material) {
      this.highlight.edge_material.uniforms.opacity.value = 1 * opacity;
    }

    if (this.highlight.corner_material) {
      this.highlight.corner_material.uniforms.opacity.value = 1 * opacity;
    }

    if (this.text.material) {
      this.text.material.uniforms.opacity.value = 1 * opacity;
      this.setTextColor(this.text.color.r, this.text.color.g, this.text.color.b);
    }

    if (this.border.fill.material)
      this.border.fill.material.uniforms.opacity.value = 1 * opacity;

    if (this.disableSelection) {
      this.hideHighlight();
    }
  }

  setHovering(bState: boolean = false) {
    this.hovering = bState;
  }

  hideBorder() {
    this.border.mesh.visible = false;
    this.hideFill();
  }

  showBorder() {
    this.border.mesh.visible = true;
    this.showFill();
  }

  hideHighlight() {
    this.highlight.mesh.visible = false;
    this.hideHighlightFill();
  }

  showHighlight() {
    this.highlight.mesh.visible = true;
    this.highlight.corner_material.uniforms.diffuse.value.set(this.defaultHighlightColor);
    this.highlight.edge_material.uniforms.diffuse.value.set(this.defaultHighlightColor);
    this.showHighlightFill();
  }

  hideFill() {
    this.border.fill.mesh.visible = false;
  }

  showFill() {
    this.border.fill.mesh.visible = true;
  }

  hideHighlightFill() {
    this.highlight.fill.mesh.visible = false;
  }

  showHighlightFill() {
    this.highlight.fill.mesh.visible = true;
  }

  setBorderColor(r = 1, g = 1, b = 1) {
    this.border.edge_material.uniforms.diffuse.value.setRGB(r, g, b);
    this.border.corner_material.uniforms.diffuse.value.setRGB(r, g, b);
  }

  setHighlightColor(r = 1, g = 1, b = 1) {
    this.highlight.edge_material.uniforms.diffuse.value.setRGB(r, g, b);
    this.highlight.corner_material.uniforms.diffuse.value.setRGB(r, g, b);
  }

  setTextColor(r = 1, g = 1, b = 1) {
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

  getHighlightFill() {
    return this.highlight.fill.mesh;
  }

  setHighlightFillTexture(map: THREE.Texture) {
    if (!(map instanceof THREE.Texture)) {
      map = TextureLoader.textures.get('fx_static');
    }

    this.highlight.fill.material.uniforms.map.value = map;
    (this.highlight.fill.material as THREE.ShaderMaterial & { map?: THREE.Texture }).map = map;

    if (map instanceof THREE.Texture) {
      this.highlight.fill.material.visible = true;
      this.highlight.fill.material.uniforms.opacity.value = 1;
      this.highlight.fill.material.uniforms.uvTransform.value = this.highlight.fill.material.uniforms.map.value.matrix;
      this.highlight.fill.material.uniforms.map.value.updateMatrix();
      this.highlight.fill.material.defines.USE_UV = '';
      this.highlight.fill.material.defines.USE_MAP = '';
    } else {
      this.highlight.fill.material.visible = false;
    }

    this.highlight.fill.material.needsUpdate = true;
    this.highlight.fill.material.uniformsNeedUpdate = true;
    this.highlight.fill.material.visible = (map instanceof THREE.Texture);
    this.highlightFillEnabled = true;
  }

  setFillColor(r = 1, g = 1, b = 1) {
    //0.0, 0.658824, 0.980392
    if (typeof this.getFill() != 'undefined') {
      (this.getFill().material as THREE.ShaderMaterial).uniforms.diffuse.value.setRGB(r, g, b);
    }
  }

  getFillTexture() {
    return this.border.fill.material.uniforms.map.value;
  }

  setFillTexture(map: THREE.Texture) {

    if (!(map instanceof THREE.Texture)) {
      map = TextureLoader.textures.get('fx_static');
    }

    this.border.fill.material.uniforms.map.value = map;
    (this.border.fill.material as THREE.ShaderMaterial & { map?: THREE.Texture }).map = map;

    if (map instanceof THREE.Texture) {
      this.border.fill.material.visible = true;
      this.border.fill.material.uniforms.opacity.value = 1;
      this.border.fill.material.uniforms.uvTransform.value = this.border.fill.material.uniforms.map.value.matrix;
      this.border.fill.material.uniforms.map.value.updateMatrix();
      this.border.fill.material.defines.USE_UV = '';
      this.border.fill.material.defines.USE_MAP = '';
    } else {
      this.border.fill.material.visible = false;
    }

    this.border.fill.material.needsUpdate = true;
    this.border.fill.material.uniformsNeedUpdate = true;
    this.border.fill.material.visible = (map instanceof THREE.Texture);
    this.borderFillEnabled = true;
  }

  getFillTextureName() {
    return this.border.fill.texture;
  }

  async setFillTextureName(name = '', bUpdateHighlight = true): Promise<OdysseyTexture> {
    this.border.fill.texture = name;
    this.borderFillEnabled = true;
    if (!name.length) { return; }

    if (bUpdateHighlight) this.highlightFillEnabled = true;
    if (bUpdateHighlight) this.highlight.fill.texture = name;
    TextureLoader.enQueue(this.border.fill.texture, this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      this.setFillTexture(texture)
      if (bUpdateHighlight) this.setHighlightFillTexture(texture);
      return texture;
    });
    return;
  }

  setMaterialTexture(material: THREE.ShaderMaterial, texture: THREE.Texture | null) {
    if (!(material instanceof THREE.ShaderMaterial))
      return false;

    if (texture == undefined)
      texture = null;

    material.uniforms.map.value = texture;
    (material as THREE.ShaderMaterial & { map?: THREE.Texture }).map = texture;

    if (texture instanceof THREE.Texture) {
      material.visible = true;
      material.uniforms.opacity.value = 1;
      material.uniforms.uvTransform.value = material.uniforms.map.value.matrix;
      material.uniforms.map.value.updateMatrix();
      material.defines.USE_UV = '';
      material.defines.USE_MAP = '';
    } else {
      material.visible = false;
    }

    material.needsUpdate = true;
    material.uniformsNeedUpdate = true;
    material.visible = (texture instanceof THREE.Texture);

    if (material == this.border.fill.material) {
      this.borderFillEnabled = true;
    }

    if (material == this.highlight.fill.material) {
      this.highlightFillEnabled = true;
    }

  }

  flipY(flip = true) {
    let texture = this.border.fill.material.uniforms.map.value;
    if (texture instanceof THREE.Texture) {
      texture.repeat.y = flip ? -1 : 1;
      texture.updateMatrix();
      texture.needsUpdate = true;
    }

    texture = this.highlight.fill.material.uniforms.map.value;
    if (texture instanceof THREE.Texture) {
      texture.repeat.y = flip ? -1 : 1;
      texture.updateMatrix();
      texture.needsUpdate = true;
    }
  }

  /**
   * Panel positioning: adjusts screen-space position from extent and bit_flags (centering).
   * THREE.js: orthographic camera center=(0,0), X-right, Y-up; game coords top-left=(0,0),
   * X-right, Y-down. Root panel at screen center; children relative to parent group.
   */
  calculatePosition() {
    if (!this.autoCalculatePosition || this.list)
      return;

    const vw = GameState.ResolutionManager.getViewportWidth();
    const vh = GameState.ResolutionManager.getViewportHeight();

    const isRootPanel = this === this.menu.tGuiPanel;

    if (isRootPanel) {
      const flags = this.menu.panelBitFlags;
      let screenLeft = this.extent.left;
      let screenTop = this.extent.top;

      if ((flags & 0x08) !== 0) {
        screenLeft += Math.trunc((vw - this.extent.width) / 2);
        screenTop += Math.trunc((vh - this.extent.height) / 2);
      } else {
        if ((flags & 0x20) !== 0) {
          screenLeft += Math.trunc((vw - 640) / 2);
        }
        if ((flags & 0x40) !== 0) {
          screenTop += Math.trunc((vh - 480) / 2);
        }
      }

      // Convert screen-space top-left to THREE.js orthographic center coords.
      // THREE.js: center=(0,0), X-right, Y-up
      // Screen:   origin=(0,0) at top-left, X-right, Y-down
      // Control center in screen space: (screenLeft + width/2, screenTop + height/2)
      // THREE.js x = screenCenterX - viewportWidth/2
      // THREE.js y = viewportHeight/2 - screenCenterY
      //
      // Apply this.offset so child-menu panels (e.g. CharGenQuickPanel,
      // CharGenCustomPanel) that set tGuiPanel.offset in their
      // menuControlInitializer can shift the root panel position and have
      // children's hit-test bounds recalculated correctly via recalculatePosition().
      this.widget.position.x = screenLeft + this.extent.width / 2 - vw / 2 + this.offset.x;
      this.widget.position.y = vh / 2 - screenTop - this.extent.height / 2 + this.offset.y;
      this.widget.position.z = 0;
      this.widget.scale.set(1, 1, 1);
      this.anchorOffset.set(this.widget.position.x, this.widget.position.y);
      this.updateBounds();
      return;
    }

    // ==========================================
    // Child control positioning
    // ==========================================
    // In the original game, AurGUISetupViewport creates a local coordinate
    // system for the panel. Controls' extents (left, top, width, height) are
    // in this local space, with origin at the panel's top-left corner.
    //
    // In THREE.js, the root panel's group is at the panel's CENTER.
    // So we convert from panel-local (top-left origin, Y-down) to
    // THREE.js local (center origin, Y-up):
    //   localX = extent.left + width/2 - panelWidth/2
    //   localY = panelHeight/2 - extent.top - height/2
    //
    // This is equivalent to:
    //   localX = extent.left - (panelWidth - width) / 2
    //   localY = -(extent.top - (panelHeight - height) / 2)

    const panelW = this.menu.width;
    const panelH = this.menu.height;

    // When enablePositionScaling is set, anchor controls to viewport edges (used by
    // menus that use a fixed-resolution layout at a different resolution).
    if (this.scale) {
      // Auto-detect anchor region based on position in the design-space panel
      if (this.anchor === Anchor.None) {
        const halfX = panelW / 2;
        const halfY = panelH / 2;
        const quatX = 25;

        if (this.extent.left === 0 && this.extent.top === 0) {
          // Screen centered - no anchor
        } else {
          // Determine vertical zone
          const isTop = this.extent.top < halfY;
          const isBottom = this.extent.top >= halfY;

          // Determine horizontal zone
          const isLeft = this.extent.left < (halfX / 2);
          const isRight = this.extent.left >= (halfX / 2);
          const isCenter = this.extent.left > quatX && this.extent.left < (halfX + quatX);

          if (isBottom) {
            if (isCenter) this.anchor = Anchor.BottomCenter;
            else if (isLeft) this.anchor = Anchor.BottomLeft;
            else if (isRight) this.anchor = Anchor.BottomRight;
          }
          if (isTop) {
            if (isCenter) this.anchor = Anchor.TopCenter;
            else if (isLeft) this.anchor = Anchor.TopLeft;
            else if (isRight) this.anchor = Anchor.TopRight;
          }
        }
      }

      // Position control relative to viewport edges.
      // This maps to how the main interface uses
      // resolution-specific layouts where controls maintain fixed distances
      // from screen edges.
      const edgeRight = panelW - this.extent.left - this.extent.width;
      const edgeBottom = panelH - this.extent.top - this.extent.height;

      switch (this.anchor) {
        case Anchor.TopLeft:
          this.anchorOffset.x = -(vw / 2) + this.extent.left + this.extent.width / 2;
          this.anchorOffset.y = (vh / 2) - this.extent.top - this.extent.height / 2;
          break;
        case Anchor.TopCenter:
          this.anchorOffset.x = this.extent.left + this.extent.width / 2 - panelW / 2;
          this.anchorOffset.y = (vh / 2) - this.extent.top - this.extent.height / 2;
          break;
        case Anchor.TopRight:
          this.anchorOffset.x = (vw / 2) - edgeRight - this.extent.width / 2;
          this.anchorOffset.y = (vh / 2) - this.extent.top - this.extent.height / 2;
          break;
        case Anchor.BottomLeft:
          this.anchorOffset.x = -(vw / 2) + this.extent.left + this.extent.width / 2;
          this.anchorOffset.y = -(vh / 2) + edgeBottom + this.extent.height / 2;
          break;
        case Anchor.BottomCenter:
          this.anchorOffset.x = this.extent.left + this.extent.width / 2 - panelW / 2;
          this.anchorOffset.y = -(vh / 2) + edgeBottom + this.extent.height / 2;
          break;
        case Anchor.BottomRight:
          this.anchorOffset.x = (vw / 2) - edgeRight - this.extent.width / 2;
          this.anchorOffset.y = -(vh / 2) + edgeBottom + this.extent.height / 2;
          break;
        default:
          // No anchor - standard panel-center-relative positioning
          this.anchorOffset.x = this.extent.left + this.extent.width / 2 - panelW / 2;
          this.anchorOffset.y = panelH / 2 - this.extent.top - this.extent.height / 2;
          break;
      }
    } else {
      // Standard child control positioning (non-scaled).
      // Convert from panel-local (top-left origin, Y-down) to
      // THREE.js group-local (center origin, Y-up).
      this.anchorOffset.x = this.extent.left + this.extent.width / 2 - panelW / 2;
      this.anchorOffset.y = panelH / 2 - this.extent.top - this.extent.height / 2;
    }

    this.widget.position.x = this.anchorOffset.x + this.offset.x;
    this.widget.position.y = this.anchorOffset.y + this.offset.y;
    this.widget.scale.set(1, 1, 1);

    this.updateBounds();

  }

  getActiveControls() {

    if (!this.widget.visible)
      return [];

    let controls: GUIControl[] = [];
    for (let i = 0; i < this.children.length; i++) {
      const control = this.children[i];
      if (control.box && control.box.containsPoint(Mouse.positionUI) && (control.allowClick || control.editable)) {
        controls.push(control);
      } else {
        this.menu.setWidgetHoverActive(control, false);
      }
      if (control.box && control.box.containsPoint(Mouse.positionUI)) {
        controls = controls.concat(control.getActiveControls());
      }
    }

    return controls;
  }

  /**
   * Updates the hit-test bounding box for this control.
   * Tests local coords against extent (left, top, width, height) directly; no scaling.
   * In THREE.js we compute world-space bounding box from widget position and extent.
   */
  updateBounds() {
    // Use raw extent dimensions for 1:1 pixel rendering.
    // menu.scale is only applied by setScale() for rare zoom effects (default = 1).
    const w = this.extent.width * this.menu.scale;
    const h = this.extent.height * this.menu.scale;

    if (this.list) {
      // List items: compute world position from parent offset
      const px = this.parent.widget.position.x;
      const py = this.parent.widget.position.y;
      this.box.min.x = this.widget.position.x - w / 2 + px;
      this.box.min.y = this.widget.position.y - h / 2 + py;
      this.box.max.x = this.widget.position.x + w / 2 + px;
      this.box.max.y = this.widget.position.y + h / 2 + py;

      for (let i = 0; i < this.children.length; i++) {
        this.children[i].updateBounds();
      }
    } else {
      // Compute world position from the flat hierarchy. All child widgets are
      // placed in tGuiPanel.widget (flat THREE.js group),
      // so world position = rootPanel.position + localPosition * menuScale.
      //
      // We avoid THREE.js getWorldPosition() here because during initial creation
      // in buildChildren(), the widget is not yet added to the root panel's group
      // when updateBounds() first runs (called from calculatePosition() inside
      // createControl(), before the widget.add() call). getWorldPosition() would
      // then return just the local position — missing the root panel's offset and
      // producing an incorrect hit-test box.
      const isRoot = this === this.menu.tGuiPanel;
      let wx: number, wy: number;
      if (isRoot) {
        wx = this.widget.position.x;
        wy = this.widget.position.y;
      } else {
        const s = this.menu.scale;
        wx = this.menu.tGuiPanel.widget.position.x + this.widget.position.x * s;
        wy = this.menu.tGuiPanel.widget.position.y + this.widget.position.y * s;
      }
      this.worldPosition.set(wx, wy, this.widget.position.z);
      this.box.min.x = wx - w / 2;
      this.box.min.y = wy - h / 2;
      this.box.max.x = wx + w / 2;
      this.box.max.y = wy + h / 2;
    }
  }

  updateScale() {
    this.updateBounds();
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i] instanceof GUIControl)
        this.children[i].updateScale();
    }
  }

  recalculate() {
    this.calculatePosition();
    this.updateBounds();
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].recalculate();
    }
  }

  /**
   * Recursively update hit-test Box2 bounds for this control and all children
   * WITHOUT recalculating widget positions.  Use this when the root panel's
   * widget.position has been changed externally (e.g. by a direct assignment in
   * a click handler) and only the bounding boxes need to catch up.
   */
  updateBoundsRecursive() {
    this.updateBounds();
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].updateBoundsRecursive();
    }
  }

  /**
   * Returns the control's position and size in THREE.js local coordinates
   * (relative to the parent group's center, Y-up).
   * Used internally for border/fill/highlight geometry layout.
   */
  getControlExtent() {
    const panelW = this.menu.width;
    const panelH = this.menu.height;

    // Convert from panel-local (top-left, Y-down) to THREE.js group-local (center, Y-up)
    let left = this.extent.left + this.extent.width / 2 - panelW / 2;
    const top = panelH / 2 - this.extent.top - this.extent.height / 2;

    const shrinkWidth = this.getShrinkWidth();
    left += shrinkWidth;

    return {
      top: top,
      left: left,
      width: this.extent.width,
      height: this.extent.height,
    };

  }

  getInnerSize() {
    let width = this.extent.width - this.border.dimension;
    if (width < this.border.dimension) width = this.border.dimension;

    let height = this.extent.height - this.border.dimension;
    if (height < this.border.dimension) height = this.border.dimension;

    return {
      width: width,
      height: height
    };
  }

  getOuterSize() {
    const extent = this.getControlExtent();
    return {
      top: extent.top,
      left: extent.left,
      width: extent.width,
      height: extent.height
    };
  }

  flipLeft(): boolean {
    if (BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIListBox) && (this as GUIListBox).isScrollBarLeft()) {
      return true;
    }
    return false;
  }

  getFillExtent() {
    const extent = this.getControlExtent();
    const inner = this.getInnerSize();
    //log.info('size', extent, inner);

    const shrinkWidth = this.getShrinkWidth();

    let width = inner.width - this.border.dimension - shrinkWidth;
    let height = inner.height - this.border.dimension;

    if (width < 0) {
      width = 0.00001;
    }

    if (height < 0) {
      height = 0.00001;
    }

    return {
      top: extent.top,
      left: extent.left,
      width: width,
      height: height
    };
  }

  getBorderSize() {
    if (GameState.GameKey == GameEngineType.TSL) {
      return this.border.dimension || 0;
    } else {
      return this.border.dimension || 0;
    }
  }

  getHightlightSize() {
    if (GameState.GameKey == GameEngineType.TSL) {
      return this.highlight.dimension || 0;
    } else {
      return this.highlight.dimension || 0;
    }
  }

  getShrinkWidth() {
    let shrinkWidth = 0;
    if (BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIListBox)) {
      const listBox = this as GUIListBox;
      shrinkWidth = (listBox.scrollbar.extent.width) + (listBox.scrollbar.border.dimension * 2);
    }
    return shrinkWidth;
  }

  getBorderExtent(side: string) {
    // let extent = this.getControlExtent();
    const inner = this.getInnerSize();

    if (BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIProtoItem)) {
      inner.width += this.parent.border.inneroffset * 2;
      inner.width = Math.min(this.extent.width, inner.width);
    }

    let top = 0, left = 0, width = 0, height = 0;

    const shrinkWidth = this.getShrinkWidth();

    switch (side) {
      case 'top':
        top = -(inner.height / 2);
        left = -shrinkWidth / 2;
        width = inner.width - (this.getBorderSize()) - shrinkWidth;
        height = this.getBorderSize();
        break;
      case 'bottom':
        top = (inner.height / 2);
        left = -shrinkWidth / 2;
        width = inner.width - (this.getBorderSize()) - shrinkWidth;
        height = this.getBorderSize();
        break;
      case 'left':
        top = 0
        left = -(inner.width / 2);
        width = inner.height - (this.getBorderSize()) < 0 ? 0.000001 : inner.height - (this.getBorderSize());
        height = this.getBorderSize();
        break;
      case 'right':
        top = 0;
        left = (inner.width / 2) - shrinkWidth;
        width = inner.height - (this.getBorderSize()) < 0 ? 0.000001 : inner.height - (this.getBorderSize());
        height = this.getBorderSize();
        break;
      case 'topLeft':
        top = ((inner.height / 2));
        left = -((inner.width / 2));
        width = this.getBorderSize();
        height = this.getBorderSize();
        break;
      case 'topRight':
        top = (inner.height / 2);
        left = (inner.width / 2) - shrinkWidth;
        width = this.getBorderSize();
        height = this.getBorderSize();
        break;
      case 'bottomLeft':
        top = -((inner.height / 2));
        left = -((inner.width / 2));
        width = this.getBorderSize();
        height = this.getBorderSize();
        break;
      case 'bottomRight':
        top = -((inner.height / 2));
        left = ((inner.width / 2)) - shrinkWidth;
        width = this.getBorderSize();
        height = this.getBorderSize();
        break;
    }

    if (width < 0) {
      width = 0.00001;
    }

    if (height < 0) {
      height = 0.00001;
    }

    return {
      top: top,
      left: left + (this.flipLeft() ? shrinkWidth : 0),
      width: width,
      height: height
    };

  }

  getHighlightExtent(side: string) {
    const extent = this.getControlExtent();
    const inner = this.getInnerSize();

    let top = 0, left = 0, width = 0, height = 0;

    if (BitWise.InstanceOfObject(this, GUIControlTypeMask.GUIProtoItem)) {
      inner.width += this.parent.border.inneroffset * 2;
      inner.width = Math.min(this.extent.width, inner.width);
    }

    const shrinkWidth = this.getShrinkWidth();

    switch (side) {
      case 'top':
        top = -((inner.height / 2));
        left = -shrinkWidth / 2;
        width = inner.width - (this.getHightlightSize()) - shrinkWidth;
        height = this.getHightlightSize();
        break;
      case 'bottom':
        top = (inner.height / 2);
        left = -shrinkWidth / 2;
        width = inner.width - (this.getHightlightSize()) - shrinkWidth;
        height = this.getHightlightSize();
        break;
      case 'left':
        top = 0;
        left = -(inner.width / 2);
        width = inner.height - (this.getHightlightSize());
        height = this.getHightlightSize();
        break;
      case 'right':
        top = 0;
        left = (inner.width / 2);
        width = inner.height - (this.getHightlightSize());
        height = this.getHightlightSize();
        break;
      case 'topLeft':
        top = ((inner.height / 2));
        left = -((inner.width / 2));
        width = this.getHightlightSize();
        height = this.getHightlightSize();
        break;
      case 'topRight':
        top = (inner.height / 2);
        left = (inner.width / 2) - shrinkWidth;
        width = this.getHightlightSize();
        height = this.getHightlightSize();
        break;
      case 'bottomLeft':
        top = -((inner.height / 2));
        left = -((inner.width / 2));
        width = this.getHightlightSize();
        height = this.getHightlightSize();
        break;
      case 'bottomRight':
        top = -((inner.height / 2));
        left = ((inner.width / 2)) - shrinkWidth;
        width = this.getHightlightSize();
        height = this.getHightlightSize();
        break;
    }

    if (width < 0) {
      width = 0.00001;
    }

    if (height < 0) {
      height = 0.00001;
    }

    return {
      top: top,
      left: left + (this.flipLeft() ? shrinkWidth : 0),
      width: width,
      height: height
    };
  }

  buildFill() {
    const extent = this.getFillExtent();

    if (this.border.fill.mesh) {
      this.border.fill.mesh.name = this.widget.name + ' center fill';
      this.border.fill.mesh.scale.x = extent.width || 0.000001;
      this.border.fill.mesh.scale.y = extent.height || 0.000001;
      this.border.fill.mesh.position.z = this.zOffset;

      const shrinkWidth = this.getShrinkWidth();
      this.border.fill.mesh.position.x = (this.flipLeft() ? shrinkWidth / 2 : -shrinkWidth / 2);
    }
  }

  buildBorder() {

    const edgeGeometries = 4;
    const cornerGeometries = 4;
    const geomCount = edgeGeometries + cornerGeometries;

    const planes: THREE.BufferGeometry[] = [];
    let extent;

    for (let i = 0; i < geomCount; i++) {
      switch (i) {
        case 0: //top-border
          extent = this.getBorderExtent('top');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
          break;
        case 1: //right-border
          extent = this.getBorderExtent('right');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI / 2);
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
          planes[i].rotateZ(Math.PI / 2);
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
          planes[i].rotateZ(-Math.PI / 2);
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
          planes[i].rotateZ(Math.PI / 2);
          planes[i].translate(extent.left, extent.top, 0);
          break;
      }
    }

    if (this.border.geometry instanceof THREE.BufferGeometry)
      this.border.geometry.dispose();

    this.border.geometry = BufferGeometryUtils.mergeBufferGeometries(planes, false);
    this.border.geometry.computeBoundingBox();

    //Edge Group
    this.border.geometry.addGroup(0, 24, 0);
    //Corner Group
    this.border.geometry.addGroup(24, 24, 1);

    if (this.border.mesh)
      this.border.mesh.geometry = this.border.geometry;

    //Clean up the temporary plane geometries
    let _plane: THREE.BufferGeometry | undefined;
    while (planes.length) {
      _plane = planes.shift();
      if (_plane) {
        _plane.dispose();
      }
    }

  }

  buildHighlight() {

    const edgeGeometries = 4;
    const cornerGeometries = 4;
    const geomCount = edgeGeometries + cornerGeometries;

    const planes: THREE.BufferGeometry[] = [];
    let extent;

    for (let i = 0; i < geomCount; i++) {
      switch (i) {
        case 0: //top-border
          extent = this.getHighlightExtent('top');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
          break;
        case 1: //right-border
          extent = this.getHighlightExtent('right');
          planes[i] = new THREE.PlaneGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI / 2);
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
          planes[i].rotateZ(Math.PI / 2);
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
          planes[i].rotateZ(-Math.PI / 2);
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
          planes[i].rotateZ(Math.PI / 2);
          planes[i].translate(extent.left, extent.top, 0);
          break;
      }
    }

    if (this.highlight.geometry instanceof THREE.BufferGeometry)
      this.highlight.geometry.dispose();

    this.highlight.geometry = BufferGeometryUtils.mergeBufferGeometries(planes, false);
    this.highlight.geometry.computeBoundingBox();

    //Edge Group
    this.highlight.geometry.addGroup(0, 24, 0);
    //Corner Group
    this.highlight.geometry.addGroup(24, 24, 1);

    if (this.highlight.mesh)
      this.highlight.mesh.geometry = this.highlight.geometry;

    //Clean up the temporary plane geometries
    let _plane: THREE.BufferGeometry | undefined;
    while (planes.length) {
      _plane = planes.shift();
      if (_plane) {
        _plane.dispose();
      }
    }

  }

  buildHighlightFill() {
    const extent = this.getFillExtent();
    if (this.highlight.fill.mesh) {
      this.highlight.fill.mesh.name = this.widget.name + ' center fill';
      this.highlight.fill.mesh.scale.x = extent.width || 0.000001;
      this.highlight.fill.mesh.scale.y = extent.height || 0.000001;
      this.highlight.fill.mesh.position.z = this.zOffset;
    }
  }

  buildText() {
    if (!this.text.texture)
      return;

    if (this.text.mesh.parent)
      this.text.mesh.parent.remove(this.text.mesh);

    this.widget.userData.text.add(this.text.mesh);

    const texture = this.text.texture;
    texture.flipY = false;
    texture.anisotropy = 1;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    if (this.text.text != '' || (this.text.strref != 0 && typeof GameState.TLKManager.TLKStrings[this.text.strref] != 'undefined'))
      this.updateTextGeometry(this.text.text != '' ? this.menu.gameStringParse(this.text.text) : this.menu.gameStringParse(GameState.TLKManager.TLKStrings[this.text.strref].Value));

    this.text.geometry.computeBoundingSphere = function () {
      if (this.boundingSphere === null) {
        this.boundingSphere = new THREE.Sphere()
      }

      const positions = this.attributes.position.array
      const itemSize = this.attributes.position.itemSize
      if (!positions || !itemSize || positions.length < 2) {
        this.boundingSphere.radius = 0
        this.boundingSphere.center.set(0, 0, 0)
        return
      }
      // this.computeSphere(positions, this.boundingSphere)
      if (isNaN(this.boundingSphere.radius)) {
        log.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.');
      }
    };

    const ctrl = this;
    this.text.geometry.computeBoundingBox = function (this: THREE.BufferGeometry) {
      if (this.boundingBox === null) {
        this.boundingBox = new THREE.Box3();
      }
      const bbox = this.boundingBox;
      const positions = this.attributes.position.array;
      const itemSize = this.attributes.position.itemSize;
      if (!positions || !itemSize || positions.length < 2) {
        bbox.makeEmpty();
        return;
      }
      ctrl.computeBox(positions, bbox);
    };
  }


  getCharPositions(char: number) {
    return {
      ul: this.text.texture.txi.upperleftcoords[char],
      lr: this.text.texture.txi.lowerrightcoords[char]
    }
  }

  updateTextGeometry(text: string) {

    if (!(this.text.texture instanceof THREE.Texture))
      return;

    if (this.guiFont) {
      this.guiFont.buildGeometry(this.text.geometry, this.text.text, this.text.alignment, this.getOuterSize().width);
      this.alignText();
    }

    if (this.text.geometry && this.text.geometry.boundingBox) {
      this.text.geometry.boundingBox.getSize(this.textSize);
    }

  }

  textSize: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  alignText() {
    if (this.text.geometry && this.text.geometry.boundingBox) {
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
    this.widget.userData.text.position.z = this.zOffset;

    const innerSize = this.getInnerSize()

    //Horizontal Alignment moved to GUIFont
    // const horizontal = this.text.alignment & GUIControlAlignment.HorizontalMask;
    this.widget.userData.text.position.x = -(innerSize.width / 2 - this.textSize.x / 2) - this.textSize.x / 2;

    const vertical = this.text.alignment & GUIControlAlignment.VerticalMask;
    switch (vertical) {
      case GUIControlAlignment.VerticalTop:
        this.widget.userData.text.position.y = (innerSize.height / 2 - this.textSize.y / 2) + this.textSize.y / 2;
        break;
      case GUIControlAlignment.VerticalCenter:
        this.widget.userData.text.position.y = this.textSize.y / 2;
        break;
      case GUIControlAlignment.VerticalBottom:
        this.widget.userData.text.position.y = -(innerSize.height / 2 - this.textSize.y / 2) + this.textSize.y / 2;
        break;
    }

    if (BitWise.InstanceOfObject(this.parent, GUIControlTypeMask.GUIListBox) && this.type == GUIControlType.Label) {
      // this.widget.userData.text.position.x -= (this.parent.scrollbar.extent.width) + (this.parent.scrollbar.border.dimension * 2);
      this.extent.height = this.textSize.y;
      this.resizeControl();
      this.list.updateList();
    }

  }

  disableBorder() {
    this.borderEnabled = false;
  }

  disableBorderFill() {
    this.borderFillEnabled = false;
  }

  disableHighlight() {
    this.highlightEnabled = false;
  }

  disableHighlightFill() {
    this.highlightFillEnabled = false;
  }

  enableBorder() {
    this.borderEnabled = true;
  }

  enableBorderFill() {
    this.borderFillEnabled = true;
  }

  enableHighlight() {
    this.highlightEnabled = true;
  }

  enableHighlightFill() {
    this.highlightFillEnabled = true;
  }

  disableTextAlignment() {
    this.text.alignment = 0;
  }

  getRendererSize() {
    return { width: GameState.ResolutionManager.getViewportWidth(), height: GameState.ResolutionManager.getViewportHeight() };
  }

  setKeymapAction(action: KeyMapAction) {
    this.keymapAction = action;
    return this;
  }

  tooltipText: string = '';
  tooltipTimer: number = 3000;
  tooltipVisible: boolean = false;
  setTooltipText(text: string) {
    if (this.keymapAction) {
      const action = KeyMapper.Actions[this.keymapAction];
      if (action) {
        text += ` | ${action.character}`;
      }
    }
    this.tooltipText = text;
    return this;
  }

  setTooltipVisible(visible: boolean) {
    const isChanged = this.tooltipVisible != visible;
    this.tooltipVisible = visible;
    if (this.tooltipVisible && isChanged) {
      GameState.MenuManager.MenuToolTip.showToolTip(this.tooltipText, Mouse.positionViewport.x, Mouse.positionViewport.y, this);
    } else if (!this.tooltipVisible && isChanged) {
      GameState.MenuManager.MenuToolTip.hide();
    }
    return this;
  }

  setText(str: string | { toString(): string } = '', renderOrder = 5) {
    if (typeof str !== 'string')
      str = str.toString();

    str = str.trim();

    const oldText = this.text.text;
    this.text.text = this.menu.gameStringParse(str);

    if (typeof this.text.geometry !== 'object')
      this.buildText();

    if (this.text.mesh) {
      this.text.mesh.renderOrder = undefined;//renderOrder;
    }

    if (oldText != this.text.text && typeof this.text.geometry === 'object') {
      //log.info('updateText', this.text.text);
      this.updateTextGeometry(this.text.text);
    }

    if (this.text.geometry && this.text.geometry.boundingBox) {
      this.text.geometry.boundingBox.getSize(this.textSize);
    }

  }

  getText() {
    return this.text.text;
  }

  getTextSize() {
    this.text.geometry.computeBoundingBox();
    this.text.geometry.boundingBox.getSize(this.textSize);
    return this.textSize;
  }

  _onCreate() {
    //Dummy Method
  }

  getHintText() {
    if (this.text.strref != 0 && typeof GameState.TLKManager.TLKStrings[this.text.strref + 1] != 'undefined') {
      return GameState.TLKManager.TLKStrings[this.text.strref].Value;
    } else {
      return '';
    }
  }

  resizeFill() {
    if (this.border.fill.mesh) {
      const extent = this.getFillExtent();
      this.border.fill.mesh.scale.x = extent.width || 0.000001;
      this.border.fill.mesh.scale.y = extent.height || 0.000001;
    }
  }

  resizeHighlightFill() {
    if (this.highlight.fill.mesh) {
      const extent = this.getFillExtent();
      this.highlight.fill.mesh.scale.x = extent.width || 0.000001;
      this.highlight.fill.mesh.scale.y = extent.height || 0.000001;
    }
  }

  resizeBorder(side: string) {

    const extent = this.getBorderExtent(side);

    switch (side) {
      case 'top':
        this.widget.userData.border.children[0].position.set(extent.left, extent.top, 1); // top
        this.widget.userData.border.children[0].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[0].scale.y = extent.height || 0.000001;
        break;
      case 'left':
        this.widget.userData.border.children[1].position.set(extent.left, extent.top, 1); // left
        this.widget.userData.border.children[1].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[1].scale.y = extent.height || 0.000001;
        break;
      case 'right':
        this.widget.userData.border.children[2].position.set(extent.left, extent.top, 1); // right
        this.widget.userData.border.children[2].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[2].scale.y = extent.height || 0.000001;
        break;
      case 'bottom':
        this.widget.userData.border.children[3].position.set(extent.left, extent.top, 1); // bottom
        this.widget.userData.border.children[3].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[3].scale.y = extent.height || 0.000001;
        break;
    }

  }

  resizeCorner(side: string) {

    const extent = this.getBorderExtent(side);

    switch (side) {
      case 'topLeft':
        this.widget.userData.border.children[4].position.set(extent.left, extent.top, 1); // top
        this.widget.userData.border.children[4].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[4].scale.y = extent.height || 0.000001;
        break;
      case 'topRight':
        this.widget.userData.border.children[5].position.set(extent.left, extent.top, 1); // left
        this.widget.userData.border.children[5].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[5].scale.y = extent.height || 0.000001;
        break;
      case 'bottomLeft':
        this.widget.userData.border.children[6].position.set(extent.left, extent.top, 1); // right
        this.widget.userData.border.children[6].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[6].scale.y = extent.height || 0.000001;
        break;
      case 'bottomRight':
        this.widget.userData.border.children[7].position.set(extent.left, extent.top, 1); // bottom
        this.widget.userData.border.children[7].scale.x = extent.width || 0.000001;
        this.widget.userData.border.children[7].scale.y = extent.height || 0.000001;
        break;
    }

  }

  resizeHighlight(side: string) {

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

    sprite.isClickable = (_e: GUIControlEvent) => {
      return this.isClickable();
    };

    sprite.onClick = (e: GUIControlEvent) => {
      if (typeof this.onClick === 'function')
        this.onClick(e);
    };

    sprite.onMouseMove = (e: GUIControlEvent) => {
      if (typeof this.onMouseMove === 'function')
        this.onMouseMove(e);
    }

    sprite.onMouseDown = (e: GUIControlEvent) => {
      if (typeof this.onMouseDown === 'function')
        this.onMouseDown(e);
    };

    sprite.onMouseUp = (e: GUIControlEvent) => {
      if (typeof this.onMouseUp === 'function')
        this.onMouseUp(e);
    };

    sprite.onHover = (e: GUIControlEvent) => {
      if (typeof this.onMouseIn === 'function')
        this.onMouseIn(e);
    };

    sprite.getControl = () => {
      return this;
    }*/

  }

  resizeHighlightCorner(side: string) {

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
  addEventListener(name: string = '', callback?: (event: GUIControlEvent, ...args: GUIControlEventData[]) => void) {
    if (typeof callback === 'function') {
      if (Object.hasOwn(this.eventListeners, name)) {
        (this.eventListeners as Record<string, Array<(event: GUIControlEvent, ...args: GUIControlEventData[]) => void>>)[name].push(callback);
      }
    }
    return this;
  }

  //Remove an event listener
  removeEventListener(name: string = '', callback?: (event: GUIControlEvent, ...args: GUIControlEventData[]) => void) {

    if (Object.hasOwn(this.eventListeners, name)) {
      const arr = (this.eventListeners as Record<string, Array<(event: GUIControlEvent, ...args: GUIControlEventData[]) => void>>)[name];
      if (typeof callback === 'function') {
        const cbIndex = arr.indexOf(callback);
        if (cbIndex > -1) {
          arr.splice(cbIndex, 1);
        }
      } else {
        arr.length = 0;
      }
    }
    return this;

  }

  //Process an event listener
  processEventListener(name = '', args: GUIControlEventData[] = []) {
    let processed = false;

    const event = GUIControlEventFactory.generateEventObject();
    event.data = args;

    let invokeArgs: [GUIControlEvent, ...GUIControlEventData[]];
    if (!args.length) {
      invokeArgs = [event];
    } else {
      invokeArgs = [event, ...args];
    }

    if (Object.hasOwn(this.eventListeners, name)) {
      const arr = (this.eventListeners as Record<string, Array<(event: GUIControlEvent, ...args: GUIControlEventData[]) => void>>)[name];
      for (let i = 0; i < arr.length; i++) {
        const fn = arr[i];
        if (typeof fn === 'function') {
          processed = true;
          fn(...invokeArgs);
        }
      }
    }
    return processed;
  }

  click() {
    if (this.disableSelection) {
      return;
    }

    this.processEventListener('click');
  }

  setDPadTarget(direction = '', control: GUIControl) {
    if (typeof direction == 'string') {
      direction = direction.toLowerCase();
    }

    if (control instanceof GUIControl) {
      switch (direction) {
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

  directionalNavigate(direction = '') {
    switch (direction) {
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

  onINIPropertyAttached() {
    //Stub
  }

  attachINIProperty(key = '') {
    const property = key;
    if (property) {
      this.iniProperty = property;
      this.onINIPropertyAttached();
    }
  }

  updateWorldPosition() {

    const pos = this.widget.position.clone();
    let parent = this.parent;
    while (parent instanceof GUIControl) {
      pos.add(parent.widget.position);
      parent = parent.parent;
    }
    this.worldPosition = pos;
    return pos;

  }

  bounds(positions: number[] = []) {
    const count = positions.length / itemSize
    box.min[0] = positions[0]
    box.min[1] = positions[1]
    box.max[0] = positions[0]
    box.max[1] = positions[1]

    for (let i = 0; i < count; i++) {
      const x = positions[i * itemSize + 0]
      const y = positions[i * itemSize + 1]
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

  computeSphere(positions: number[] = [], output: THREE.Sphere) {
    this.bounds(positions)
    const minX = box.min[0]
    const minY = box.min[1]
    const maxX = box.max[0]
    const maxY = box.max[1]
    const width = maxX - minX
    const height = maxY - minY
    const length = Math.sqrt(width * width + height * height)
    output.center.set(minX + width / 2, minY + height / 2, 0)
    output.radius = length / 2
  }

}
