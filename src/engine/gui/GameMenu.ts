import * as THREE from "three";
import { GFFObject } from "@core/resource/GFFObject";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { GameState } from "@engine/runtime/GameState";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import type { MenuManager } from "@engine/managers/MenuManager";
import { ResolutionManager } from "@engine/managers/ResolutionManager";
import { ShaderManager } from "@engine/managers/ShaderManager"
import { ResourceLoader, TextureLoader } from "@engine/loaders";
import { GUIControl } from "@engine/gui/GUIControl";
import { GUIControlFactory } from "@engine/gui/GUIControlFactory";
import { commitGuiTransform, freezeGuiTree } from "@engine/gui/guiMatrix";
import { BitWise } from "@core/utility/BitWise";
import { GUIControlTypeMask } from "@core/enums/gui/GUIControlTypeMask";
import { KeyMapper } from "@engine/controls";
import { shouldSuppressGameMenuHoverForListRow } from "@engine/gui/listrow/listRowHover";
import { GUIPanelCoordFlags } from "@engine/gui/GUICoord";
import type { GUIListBox } from "@engine/gui/GUIListBox";
import type { GUISlider } from "@engine/gui/GUISlider";
import { GUISliderDirection } from "@core/enums/gui/GUISliderDirection";
import type { PadButton } from "@engine/controls/gamepad-glyphs";
import {
  pickBackButtonName,
  pickFirstInReadingOrder,
  pickSpatialNeighbor,
  type PadDirection,
  type PadRect,
} from "@engine/gui/padNavigation";
import { getGodRayTexture } from "@engine/render/shaders/datatextures/godray.datatexture";
import {
  createGUIFogVolumeTexture,
  GUI_FOG_VOLUME
} from "@engine/render/shaders/datatextures/fog.datatexture";
import { EngineModeController } from '@engine/runtime/EngineModeController';

/**
 * Render the heavy void-gui shader at this fraction of the viewport,
 * then upscale with LinearFilter.
 */
const VOID_GUI_RENDER_SCALE = 0.5;

let fogVolumeTexture: THREE.Data3DTexture = undefined;

let voidOffscreenTarget: THREE.WebGLRenderTarget = undefined;
let voidOffscreenScene: THREE.Scene = undefined;
let voidOffscreenCamera: THREE.Camera = undefined;
let voidOffscreenMesh: THREE.Mesh = undefined;

function ensureVoidOffscreenTarget(
  viewportWidth: number,
  viewportHeight: number
): THREE.WebGLRenderTarget {

  const width =
    Math.max(
      1,
      Math.ceil(
        viewportWidth *
        VOID_GUI_RENDER_SCALE
      )
    );

  const height =
    Math.max(
      1,
      Math.ceil(
        viewportHeight *
        VOID_GUI_RENDER_SCALE
      )
    );

  if(!voidOffscreenTarget){
    voidOffscreenTarget =
      new THREE.WebGLRenderTarget(
        width,
        height,
        {
          minFilter:
            THREE.LinearFilter,

          magFilter:
            THREE.LinearFilter,

          format:
            THREE.RGBAFormat,

          type:
            THREE.UnsignedByteType,

          depthBuffer:
            false,

          stencilBuffer:
            false,

          generateMipmaps:
            false
        }
      );

    voidOffscreenTarget.texture.generateMipmaps =
      false;
  }else if(
    voidOffscreenTarget.width !== width ||
    voidOffscreenTarget.height !== height
  ){
    voidOffscreenTarget.setSize(
      width,
      height
    );
  }

  return voidOffscreenTarget;
}

function renderVoidOffscreen(
  renderer: THREE.WebGLRenderer,
  material: THREE.ShaderMaterial
){
  if(!voidOffscreenTarget){
    return;
  }

  if(!voidOffscreenScene){
    voidOffscreenCamera =
      new THREE.Camera();

    voidOffscreenScene =
      new THREE.Scene();

    voidOffscreenMesh =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          2,
          2
        ),
        material
      );

    voidOffscreenMesh.frustumCulled =
      false;

    voidOffscreenScene.add(
      voidOffscreenMesh
    );
  }else{
    voidOffscreenMesh.material =
      material;
  }

  const oldRenderTarget =
    renderer.getRenderTarget();

  const oldAutoClear =
    renderer.autoClear;

  renderer.autoClear =
    true;

  renderer.setRenderTarget(
    voidOffscreenTarget
  );

  renderer.clear(
    true,
    false,
    false
  );

  renderer.render(
    voidOffscreenScene,
    voidOffscreenCamera
  );

  renderer.setRenderTarget(
    oldRenderTarget
  );

  renderer.autoClear =
    oldAutoClear;
}

/**
 * GameMenu class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameMenu.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/** A pad button and the on-screen control it presses. */
export interface PadControlGlyph {
  button: PadButton;
  control: GUIControl;
}

export class GameMenu {
  gui_resref: string;
  menuGFF: GFFObject;
  manager: typeof MenuManager;
  factory: typeof GUIControlFactory = GUIControlFactory;

  //This is for MenuTop
  childMenu: GameMenu = undefined;

  tGuiPanel: GUIControl;
  _button_a: GUIControl = undefined;
  _button_b: GUIControl = undefined;
  _button_x: GUIControl = undefined;
  _button_y: GUIControl = undefined;
  selectedControl: GUIControl;

  //Used for hoverstate tracking
  activeControls: GUIControl[] = [];

  bVisible: boolean = false;
  scale: number = 1;
  enablePositionScaling: boolean = false;
  isOverlayGUI: boolean = false;
  /**
   * Added to every mesh renderOrder in this menu so overlays sit above parents
   * (shared scene_gui + depthTest off — draw order is renderOrder only).
   */
  renderOrderBias: number = 0;
  textNeedsUpdate: boolean = false;

  userCanClose: boolean = true;
  width: number = 640;
  height: number = 480;
  /**
   * GUI panel bit_flags for GetLocalMouseCoords.
   * UseExtentOffset|CenterInViewport matches our centered Three.js panel projection
   * (clear UseExtentOffset for 640×480 mouse letterbox).
   */
  panelCoordFlags: number = GUIPanelCoordFlags.UseExtentOffset | GUIPanelCoordFlags.CenterInViewport;

  background: string;
  backgroundSprite: THREE.Mesh;
  backgroundMaterial: THREE.ShaderMaterial;

  voidFill: boolean = false;
  backgroundVoidSprite: THREE.Mesh;
  /** Heavy void-gui shader — rendered into the shared half-res target. */
  backgroundVoidMaterial: THREE.ShaderMaterial;
  /** Upscale blit of the half-res void target into scene_gui. */
  backgroundVoidBlitMaterial: THREE.MeshBasicMaterial;

  engineMode: EngineMode = EngineMode.GUI;

  eventListenters: Map<String, Function[]> = new Map<String, Function[]>();
  context: any = GameState;

  menuGroup: THREE.Group = new THREE.Group();

  constructor(){
    this._button_a = undefined;
    this._button_b = undefined;
    this._button_x = undefined;
    this._button_y = undefined;
    freezeGuiTree(this.menuGroup);
  }

  async load(): Promise<GameMenu> {
    GameState.PerformanceMonitor.start(this.constructor.name+'.load');
    await this.loadMenu();
    GameState.PerformanceMonitor.stop(this.constructor.name+'.load');
    return this;
  }

  async loadMenu(): Promise<GameMenu> {
    this.tGuiPanel = null;

    //mainmenu16x12
    await this.loadBackground();
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes.gui, this.gui_resref);
      this.menuGFF = new GFFObject(buffer);
      this.onMenuGFFLoaded(this.menuGFF);
      await this.buildMenu(this.menuGFF);
    }catch(e){
      console.error(e);
    };
    return this;
  }

  /**
   * Called after the menu's .gui is parsed and before any control is built.
   * Override to add, remove or edit control structs for layouts that only
   * exist in code.
   */
  protected onMenuGFFLoaded(gff: GFFObject): void {
    return;
  }

  async buildMenu(gff: GFFObject){
    GameState.PerformanceMonitor.start(this.constructor.name+'.buildMenu');
    this.tGuiPanel = new GUIControl(this, gff.RootNode, undefined, this.enablePositionScaling);
    this.tGuiPanel.allowClick = false;
    
    const extent = this.tGuiPanel.extent;
    this.width = Math.trunc(extent.width) | 0;
    this.height = Math.trunc(extent.height) | 0;

    const panelControl = this.tGuiPanel.createControl();

    if(this.voidFill && this.backgroundVoidSprite){
      this.menuGroup.add(this.backgroundVoidSprite);
    }

    if(this.backgroundSprite){
      this.menuGroup.add(this.backgroundSprite);
    }

    this.menuGroup.add(panelControl);
    
    panelControl.position.x = 0;
    panelControl.position.y = 0;
    commitGuiTransform(panelControl);

    //This auto assigns references for the controls to the menu object.
    //It is no longer required to use this.getControlByName('CONTROL_NAME') when initializing a menu
    //You can just use this.CONTROL_NAME 
    this.assignChildControlsToMenu(this.tGuiPanel);

    // StopLoadFromLayout — MOVETO IDs → control pointers
    this.resolveMoveToControls();

    await this.menuControlInitializer();

    // await TextureLoader.LoadQueue;
    GameState.PerformanceMonitor.stop(this.constructor.name+'.buildMenu');
    return this;
  }

  async menuControlInitializer(skipInit: boolean = false): Promise<any> {
    return;
  };

  assignChildControlsToMenu(object: GUIControl){
    if(!object){ return; }

    for(let i = 0, len = object.children.length; i < len; i++){
      const ctrl = object.children[i];
      if(!!ctrl && !isNaN(parseInt(ctrl.name[0]))) ctrl.name = '_'+ctrl.name;
      (this as any)[ctrl.name] = ctrl;
      this.assignChildControlsToMenu(ctrl);
    }
  }

  /**
   * StopLoadFromLayout — replace MOVETO control IDs with pointers.
   * IDs index the panel control list the same way InitControl places controls by GFF ID.
   */
  resolveMoveToControls(){
    if(!this.tGuiPanel){ return; }

    const byId = new Map<number, GUIControl>();
    const collect = (control: GUIControl) => {
      if(!control){ return; }
      if(typeof control.id === 'number' && control.id >= 0){
        byId.set(control.id, control);
      }
      for(let i = 0; i < control.children.length; i++){
        collect(control.children[i]);
      }
    };
    collect(this.tGuiPanel);

    const resolveControl = (control: GUIControl) => {
      if(!control){ return; }
      if(control.hasMoveTo){
        const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
        for(let i = 0; i < dirs.length; i++){
          const dir = dirs[i];
          const id = control.moveTo[dir];
          if(typeof id === 'number' && id >= 0 && byId.has(id)){
            control.setMoveToControl(dir, byId.get(id));
          }else{
            control.setMoveToControl(dir, undefined);
          }
        }
      }
      for(let i = 0; i < control.children.length; i++){
        resolveControl(control.children[i]);
      }
    };
    resolveControl(this.tGuiPanel);
  }

  /**
   * SetActiveControl — deactivate previous, activate next (hover visual).
   */
  setActiveControl(control?: GUIControl, _playSound: boolean = true){
    if(this.selectedControl === control){
      return;
    }

    if(this.selectedControl){
      this.setWidgetHoverActive(this.selectedControl, false);
      if(this.selectedControl.hover || this.selectedControl.mouseOver){
        this.selectedControl.onHoverOut();
      }
    }

    this.selectedControl = control;
    this.manager.activeGUIElement = control;

    if(control){
      this.setWidgetHoverActive(control, true);
      if(!control.hover){
        control.onHoverIn();
      }
    }
  }

  async loadBackground(renderer?: THREE.WebGLRenderer){
    /**
     * Background black void to fill the screen behind the menu
     */
    if(this.voidFill){
      const bakeRenderer = renderer ?? GameState.renderer;
      // Forge (and other hosts) may not have GameState.renderer yet — bake later via ensureVoidFogVolume.
      if(!fogVolumeTexture && bakeRenderer){
        fogVolumeTexture = createGUIFogVolumeTexture(bakeRenderer);
      }

      const viewportWidth =
        ResolutionManager.getViewportWidth();

      const viewportHeight =
        ResolutionManager.getViewportHeight();

      const offscreen =
        ensureVoidOffscreenTarget(
          viewportWidth,
          viewportHeight
        );

      this.backgroundVoidMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          ShaderManager.Shaders.get('void-gui').getUniforms(),
          {
            u_heightOverWidth: {
              value: viewportHeight / Math.max(viewportWidth, 1)
            },
            u_godRayMap: {
              value: getGodRayTexture(1024)
            },
            u_fogVolume: {
              value: fogVolumeTexture || null
            }
          }
        ]),
        vertexShader: ShaderManager.Shaders.get('void-gui').getVertex(),
        fragmentShader: ShaderManager.Shaders.get('void-gui').getFragment(),
        glslVersion: THREE.GLSL3,
        defines: {
          GUI_SORT: ''
        },
        depthTest: false,
        depthWrite: false,
        transparent: false,
        toneMapped: false
      });

      // Cool steel grey with a blue-metal hint (matches KotOR GUI panel metal).
      this.backgroundVoidMaterial.uniforms.u_color.value.setRGB(0.42, 0.50, 0.60);

      this.backgroundVoidBlitMaterial = new THREE.MeshBasicMaterial({
        map: offscreen.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });

      const geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      this.backgroundVoidSprite = new THREE.Mesh( geometry, this.backgroundVoidBlitMaterial );
      this.backgroundVoidSprite.position.z = -6;
      this.backgroundVoidSprite.renderOrder = this.renderOrderBias - 6;
      commitGuiTransform(this.backgroundVoidSprite);
    }

    /**
     * Background texture of the menu
     */
    if(this.background){
      const texture: OdysseyTexture = await TextureLoader.tpcLoader.fetch(this.background);
      const geometry = new THREE.PlaneGeometry( 1600, 1200, 1 );
      this.backgroundMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          ShaderManager.Shaders.get('background-gui').getUniforms(),
          {
            u_voidFill: {
              value: this.voidFill ? 1.0 : 0.0
            }
          }
        ]),
        vertexShader: ShaderManager.Shaders.get('background-gui').getVertex(),
        fragmentShader: ShaderManager.Shaders.get('background-gui').getFragment(),
        defines: {
          GUI_SORT: ''
        }
      });
      this.backgroundMaterial.transparent = true;
      this.backgroundMaterial.depthTest = false;
      this.backgroundMaterial.depthWrite = false;
      this.backgroundSprite = new THREE.Mesh( geometry, this.backgroundMaterial );
      this.backgroundSprite.position.z = -5;
      this.backgroundSprite.renderOrder = this.renderOrderBias - 5;
      commitGuiTransform(this.backgroundSprite);
      this.backgroundMaterial.uniforms.map.value = texture;
    }
  }

  async loadTexture( resRef: string ): Promise<OdysseyTexture> {
    return await TextureLoader.Load(resRef);
  }

  getControlByName(name: string): GUIControl {
    try{
      return (this as any)[name];//this.tGuiPanel.getControl.getObjectByName(name).userData.control;
    }catch(e){
      console.error('getControlByName', 'Control not found', name);
    }
    return;
  }

  hide(){
    this.bVisible = false;
    GameState.scene_gui.remove(this.menuGroup);

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.hide();
  }

  /**
   * Assign a menu-wide renderOrder layer and refresh all GUI meshes.
   * Propagates to childMenu (e.g. MenuTop under Character) so they stay in the same band.
   */
  setRenderOrderBias(bias: number){
    if(this.renderOrderBias === bias){
      if(this.childMenu instanceof GameMenu)
        this.childMenu.setRenderOrderBias(bias);
      return;
    }
    this.renderOrderBias = bias;
    this.refreshBackgroundRenderOrders();
    this.tGuiPanel?.refreshRenderOrder();
    if(this.childMenu instanceof GameMenu)
      this.childMenu.setRenderOrderBias(bias);
  }

  refreshBackgroundRenderOrders(){
    if(this.backgroundVoidSprite)
      this.backgroundVoidSprite.renderOrder = this.renderOrderBias - 6;
    if(this.backgroundSprite)
      this.backgroundSprite.renderOrder = this.renderOrderBias - 5;
  }

  show(){
    // this.Hide;
    if(!this.isOverlayGUI && GameState.Mode !== EngineMode.MOVIE)
      EngineModeController.SetEngineMode(this.engineMode);
      
    this.bVisible = true;
    GameState.scene_gui.add(this.menuGroup);

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.show();

    // Modal + parent share scene_gui; re-layer so overlay mesh orders sit above the parent.
    this.manager.syncGuiRenderOrderLayers();
  }

  close(){
    this.hide();
    this.manager.Remove(this);
    // if(!this.isOverlayGUI){
    // EngineModeController.RestoreEnginePlayMode;
    // }
  }

  open(){
    this.manager.Add(this);
    this.show();
  }

  remove(){
    //TODO
  }

  isVisible(){
    return this.bVisible;
  }

  /**
   * Bake/bind the void-gui fog volume once a WebGLRenderer is available.
   * Safe to call repeatedly (Forge attaches its canvas after the menu may already exist).
   */
  ensureVoidFogVolume(renderer?: THREE.WebGLRenderer){
    if(!this.backgroundVoidMaterial){
      return;
    }
    const bakeRenderer = renderer ?? GameState.renderer;
    if(!fogVolumeTexture && bakeRenderer){
      fogVolumeTexture = createGUIFogVolumeTexture(bakeRenderer);
    }
    if(fogVolumeTexture){
      this.backgroundVoidMaterial.uniforms.u_fogVolume.value = fogVolumeTexture;
    }
  }

  update(delta: number = 0){
    //Only update if the Menu is visible
    if(!this.bVisible)
      return;

    if(this.voidFill && this.backgroundVoidMaterial && this.backgroundVoidSprite){
      const viewportWidth =
        ResolutionManager.getViewportWidth();

      const viewportHeight =
        ResolutionManager.getViewportHeight();

      const offscreen =
        ensureVoidOffscreenTarget(
          viewportWidth,
          viewportHeight
        );

      if(
        this.backgroundVoidBlitMaterial &&
        this.backgroundVoidBlitMaterial.map !== offscreen.texture
      ){
        this.backgroundVoidBlitMaterial.map =
          offscreen.texture;

        this.backgroundVoidBlitMaterial.needsUpdate =
          true;
      }

      const t =
        this.context.deltaTimeFixed;

      const period =
        GUI_FOG_VOLUME.periodSeconds;

      /**
       * Temporal volume coordinate — once per frame, not per fragment.
       */
      this.backgroundVoidMaterial.uniforms.u_fogTime.value =
        (
          (
            (
              t %
              period
            ) +
            period
          ) %
          period
        ) /
        period;

      this.backgroundVoidMaterial.uniforms.u_heightOverWidth.value =
        viewportHeight /
        Math.max(
          viewportWidth,
          1
        );

      /*
       * The shader receives precomputed cos/sin.
       *
       * This means rotation is only:
       *
       * mul
       * add
       *
       * per fragment.
      */
      const rayAngle = t * 0.025;

      this.backgroundVoidMaterial.uniforms.u_godRayRotation.value.set(
        Math.cos(rayAngle),
        Math.sin(rayAngle)
      );

      const renderer =
        this.context.renderer ??
        GameState.renderer;

      if(renderer){
        renderVoidOffscreen(
          renderer,
          this.backgroundVoidMaterial
        );
      }

      const voidScaleX = this.backgroundVoidSprite.scale.x;
      const voidScaleY = this.backgroundVoidSprite.scale.y;
      if(voidScaleX !== viewportWidth || voidScaleY !== viewportHeight){
        this.backgroundVoidSprite.scale.set(
          viewportWidth,
          viewportHeight,
          1
        );
        commitGuiTransform(this.backgroundVoidSprite);
      }
    }

    if(this.background && this.backgroundMaterial){
      this.backgroundMaterial.uniforms.u_time.value = this.context.deltaTimeFixed;
      this.backgroundMaterial.uniforms.u_resolution.value.set(1600, 1200);
    }

    if(this.activeControls.length){
      const local = this.tGuiPanel?.getPanelLocalMouse?.();
      // While the pad drives the cursor, keep the pad-focused control lit.
      const padFocusHeld = !!GameState.controls?.controllerHidesCursor;
      for(var i = this.activeControls.length; i--;){
        const control = this.activeControls[i];
        if(padFocusHeld && control === this.selectedControl) continue;
        if(!local || !control.hitCheckMouse(local.x, local.y)){
          control.onHoverOut();
          this.activeControls.splice(i, 1);
        }
      }
    }

    if(this.tGuiPanel){
      // Update panel chrome (background fill/border) and recurse into children.
      this.tGuiPanel.update(delta);
    }
  }

  recalculatePosition(){
    try{
      this.tGuiPanel.recalculate();
    }catch(e){ console.error(e); }
  }

  /**
   * mouse-over is a single control (GUI manager hover slot /
   * SetActiveControl). Activating one clears any other hover.
   */
  setWidgetHoverActive(control: GUIControl, bActive: boolean = false){

    if(!BitWise.InstanceOfObject(control, GUIControlTypeMask.GUIControl))
      return false;

    if(shouldSuppressGameMenuHoverForListRow(control)){
      return false;
    }

    let idx = this.activeControls.indexOf(control);

    if(bActive){
      // Deactivate every other hovered control first (one-at-a-time).
      for(let i = this.activeControls.length - 1; i >= 0; i--){
        const other = this.activeControls[i];
        if(other === control){
          continue;
        }
        other.onHoverOut();
        this.activeControls.splice(i, 1);
      }
      idx = this.activeControls.indexOf(control);
      if(idx == -1){
        this.activeControls.push(control);
        if(control){
          control.onHoverIn();
        }
      }
    }else{
      if(idx > -1){
        if(control){
          control.onHoverOut();
        }
        this.activeControls.splice(idx, 1);
      }
    }

  }

  getActiveControls(){
    let controls: GUIControl[] = [];
    if(this.tGuiPanel){
      controls = this.tGuiPanel.getActiveControls();
    }
    if(this.childMenu){
      controls = controls.concat(controls, this.childMenu.getActiveControls());
    }
    return controls;
  }

  setScale(scale = 1.0){

    this.scale = scale;
    this.tGuiPanel.widget.scale.set(this.scale, this.scale, 1.0);
    commitGuiTransform(this.tGuiPanel.widget);

    // Anchored positions depend on scale, so re-run layout (also refreshes bounds).
    this.recalculatePosition();

  }

  resize(){
    this.recalculatePosition();
  }

  /**
   * Whether the pad should drive this menu when it is the top modal. Purely
   * visual overlays (barks, tooltips, transition prompts) turn this off so
   * input passes through to the menu underneath.
   */
  acceptsPadInput: boolean = true;

  /**
   * Sub-panel hosted inside this menu (character generation swaps its
   * content panel in as `childMenu`). The shared in-game tab bar is not a
   * pad target; LB / RB already drive it.
   */
  padTarget(): GameMenu {
    const child = this.childMenu;
    if(child instanceof GameMenu && child !== this && child !== this.manager?.MenuTop && child.isVisible()){
      return child.padTarget();
    }
    return this;
  }

  /** Control is shown, including every parent up to the panel. */
  protected isControlShown(control: GUIControl): boolean {
    let c: GUIControl | undefined = control;
    while(c){
      if(!c.widget || !c.widget.visible) return false;
      c = c.parent;
    }
    return true;
  }

  protected isPadListBox(control: GUIControl): control is GUIListBox {
    return !!control && BitWise.InstanceOfObject(control, GUIControlTypeMask.GUIListBox);
  }

  protected isPadSlider(control: GUIControl): control is GUISlider {
    return !!control && BitWise.InstanceOfObject(control, GUIControlTypeMask.GUISlider);
  }

  /** Description / read-only list boxes scroll with the right stick but never take focus. */
  protected isPadDescriptionList(control: GUIControl): boolean {
    if(!this.isPadListBox(control)) return false;
    return control.bitFlags.noSelectMode || /DESC/i.test(control.name || '');
  }

  /** Control can hold pad focus. */
  isPadFocusable(control: GUIControl | undefined): boolean {
    if(!control || control.disableSelection || !this.isControlShown(control)) return false;
    if(this.isPadListBox(control)){
      return !this.isPadDescriptionList(control) && control.children.length > 0;
    }
    if(this.isPadSlider(control)){
      return !!control.iniProperty || typeof control.onValueChanged === 'function';
    }
    if(BitWise.InstanceOfObject(control, GUIControlTypeMask.GUIScrollBar)) return false;
    return !!control.isClickable();
  }

  /** Every control on this menu that can hold pad focus. */
  getPadFocusables(): GUIControl[] {
    const out: GUIControl[] = [];
    const walk = (control: GUIControl) => {
      if(!control || !control.widget?.visible) return;
      if(control !== this.tGuiPanel && this.isPadFocusable(control)){
        out.push(control);
      }
      // List rows are reached through the list box, not on their own.
      if(this.isPadListBox(control)) return;
      for(let i = 0; i < control.children.length; i++){
        walk(control.children[i]);
      }
    };
    if(this.tGuiPanel) walk(this.tGuiPanel);
    return out;
  }

  protected padRect(control: GUIControl): PadRect {
    const pos = control.updateWorldPosition();
    return {
      x: pos.x,
      y: pos.y,
      w: Number(control.extent?.width) || 0,
      h: Number(control.extent?.height) || 0,
    };
  }

  /** Current focus when it can still be used, else undefined. */
  getPadFocus(): GUIControl | undefined {
    const focus = this.selectedControl;
    return focus && focus.menu === this && this.isPadFocusable(focus) ? focus : undefined;
  }

  /** Control the pad lands on first: the main list, then the A button, then reading order. */
  pickInitialPadFocus(): GUIControl | undefined {
    const focusables = this.getPadFocusables();
    if(!focusables.length) return undefined;
    const list = focusables.find((c) => this.isPadListBox(c));
    if(list) return list;
    if(this._button_a && focusables.includes(this._button_a)) return this._button_a;
    const idx = pickFirstInReadingOrder(focusables.map((c) => this.padRect(c)));
    return idx >= 0 ? focusables[idx] : undefined;
  }

  setPadFocus(control: GUIControl | undefined){
    if(!control) return;
    this.setActiveControl(control);
    if(this.isPadListBox(control) && control.selectionIndex < 0 && control.children.length){
      control.setSelectedControl(0, false);
    }
  }

  /**
   * Move focus one step: list rows first, then slider values, then the
   * control's own neighbour links, then the nearest control that way.
   */
  padNavigate(dir: PadDirection){
    const current = this.getPadFocus();
    if(!current){
      this.setPadFocus(this.pickInitialPadFocus());
      return;
    }

    if(this.isPadListBox(current) && (dir === 'up' || dir === 'down')){
      const index = current.selectionIndex;
      const top = current.topVisibleIndex;
      current.directionalNavigate(dir);
      if(current.selectionIndex !== index || current.topVisibleIndex !== top) return;
    }

    if(this.isPadSlider(current)){
      const horizontal = current.direction !== GUISliderDirection.Vertical;
      const step = (horizontal ? (dir === 'right' ? 1 : dir === 'left' ? -1 : 0) : (dir === 'up' ? 1 : dir === 'down' ? -1 : 0)) * 0.05;
      if(step){
        const value = Math.max(0, Math.min(1, (Number(current.value) || 0) + step));
        if(value !== current.value){
          current.setValue(value);
          GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_scroll');
        }
        return;
      }
    }

    let next = current.getMoveToControl(dir);
    for(let guard = 0; next && !this.isPadFocusable(next) && guard < 64; guard++){
      next = next.getMoveToControl(dir);
    }
    if(!next || !this.isPadFocusable(next) || next === current){
      const focusables = this.getPadFocusables().filter((c) => c !== current);
      const idx = pickSpatialNeighbor(this.padRect(current), focusables.map((c) => this.padRect(c)), dir);
      next = idx >= 0 ? focusables[idx] : undefined;
    }
    if(next) this.setPadFocus(next);
  }

  /**
   * Press the button `step` places on from index `current` in `buttons`
   * (filter and sort rows), skipping hidden or disabled ones. Pass -1 when
   * none is active yet.
   */
  padStepButtons(buttons: readonly (GUIControl | undefined)[], current: number, step: number, wrap: boolean = true): boolean {
    const n = buttons.length;
    if(!n || !step) return false;
    let i = current;
    for(let tries = 0; tries < n; tries++){
      i += step;
      if(wrap){
        i = ((i % n) + n) % n;
      }else if(i < 0 || i >= n){
        return false;
      }
      const button = buttons[i];
      if(button && this.isControlShown(button) && !button.disableSelection){
        button.click();
        GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_scroll');
        return true;
      }
    }
    return false;
  }

  /** Press the focused control: a list box presses its selected row. */
  activatePadControl(control: GUIControl){
    if(this.isPadListBox(control)){
      const row = control.selectedItem ?? control.children[Math.max(0, control.selectionIndex)];
      row?.click();
      return;
    }
    if(this.isPadSlider(control)) return;
    control.click();
  }

  /** Back / close button for B when the menu does not name one. */
  findPadBackButton(): GUIControl | undefined {
    if(this._button_b) return this._button_b;
    const candidates: GUIControl[] = [];
    const walk = (control: GUIControl) => {
      if(!control || !control.widget?.visible) return;
      if(control.name && control.isClickable()) candidates.push(control);
      if(this.isPadListBox(control)) return;
      for(let i = 0; i < control.children.length; i++) walk(control.children[i]);
    };
    if(this.tGuiPanel) walk(this.tGuiPanel);
    const idx = pickBackButtonName(candidates.map((c) => c.name));
    return idx >= 0 ? candidates[idx] : undefined;
  }

  /** List box the right stick scrolls: a description list first, then the focused list. */
  findPadScrollList(): GUIListBox | undefined {
    let found: GUIListBox | undefined;
    const walk = (control: GUIControl) => {
      if(found || !control || !control.widget?.visible) return;
      if(this.isPadListBox(control)){
        if(this.isPadDescriptionList(control) && control.children.length) found = control;
        return;
      }
      for(let i = 0; i < control.children.length; i++) walk(control.children[i]);
    };
    if(this.tGuiPanel) walk(this.tGuiPanel);
    if(found) return found;
    const focus = this.getPadFocus();
    return focus && this.isPadListBox(focus) ? focus : undefined;
  }

  triggerControllerAPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerAPress(); return; }
    const focus = this.getPadFocus();
    if(focus && this.isPadListBox(focus) && this._button_a && this.isPadFocusable(this._button_a)){
      // On a list, A runs the menu's main action on the highlighted row
      // (buy / sell, save / load, take).
      this._button_a.click();
    }else if(focus){
      this.activatePadControl(focus);
    }else if(this._button_a){
      this._button_a.click();
    }else if(this.manager.activeGUIElement){
      this.manager.activeGUIElement.click();
    }
  }

  triggerControllerBPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerBPress(); return; }
    const back = this.findPadBackButton();
    if(back){
      back.click();
    }
  }

  triggerControllerXPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerXPress(); return; }
    if(this._button_x){
      this._button_x.click();
    }
  }

  triggerControllerYPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerYPress(); return; }
    this.findPadYButton()?.click();
  }

  /**
   * Control Y clicks when the menu does not name one. In-game tab menus: the
   * first party swap portrait. Options pages: the defaults button.
   */
  findPadYButton(): GUIControl | undefined {
    if(this._button_y) return this._button_y;
    for(const name of ['BTN_CHANGE1', 'BTN_DEFAULT', 'BTN_DEFAULTS']){
      const button = (this as any)[name] as GUIControl | undefined;
      if(button && this.isControlShown(button) && button.isClickable()){
        return button;
      }
    }
    return undefined;
  }

  /**
   * Pad buttons and the on-screen controls they press, so each control can
   * carry the matching button symbol. Menus that remap buttons extend this.
   */
  getPadButtonGlyphs(): PadControlGlyph[] {
    const target = this.padTarget();
    if(target !== this) return target.getPadButtonGlyphs();
    const glyphs: PadControlGlyph[] = [];
    const focus = this.getPadFocus();
    if(focus && this.isPadListBox(focus) && this._button_a){
      this.addPadGlyph(glyphs, 'a', this._button_a);
    }
    this.addPadGlyph(glyphs, 'b', this.findPadBackButton());
    this.addPadGlyph(glyphs, 'x', this._button_x);
    this.addPadGlyph(glyphs, 'y', this.findPadYButton());
    // Tab menus: the bumpers sit on the two ends of the tab bar.
    const top = this.manager?.MenuTop;
    if(top && this.childMenu === top && this.triggerControllerBumperLPress !== GameMenu.prototype.triggerControllerBumperLPress){
      const tabs = ['BTN_EQU', 'BTN_INV', 'BTN_CHAR', 'BTN_ABI', 'BTN_MSG', 'BTN_JOU', 'BTN_MAP', 'BTN_OPT']
        .map((name) => (top as any)[name] as GUIControl | undefined)
        .filter((tab): tab is GUIControl => !!tab && this.isControlShown(tab));
      if(tabs.length > 1){
        glyphs.push({ button: 'lb', control: tabs[0] }, { button: 'rb', control: tabs[tabs.length - 1] });
      }
    }
    return glyphs;
  }

  /** Add a glyph for `control` when it is on screen; replaces an earlier glyph for the same button. */
  protected addPadGlyph(glyphs: PadControlGlyph[], button: PadButton, control: GUIControl | undefined){
    const existing = glyphs.findIndex((g) => g.button === button);
    if(existing >= 0) glyphs.splice(existing, 1);
    if(!control || !this.isControlShown(control)) return;
    glyphs.push({ button, control });
  }

  /** Back / View / Create: cancels like B on nearly every screen. */
  triggerControllerBackPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerBackPress(); return; }
    this.triggerControllerBPress();
  }

  /**
   * Start / Menu / Options: flips a focused check box; on the in-game tab
   * menus it closes the menu like B.
   */
  triggerControllerStartPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerStartPress(); return; }
    const focus = this.getPadFocus();
    if(focus && BitWise.InstanceOfObject(focus, GUIControlTypeMask.GUICheckBox)){
      focus.click();
      return;
    }
    if(this.childMenu && this.childMenu === this.manager?.MenuTop){
      this.triggerControllerBPress();
      return;
    }
    // Info boxes with only an OK close on Start too.
    const back = this.findPadBackButton();
    if(back && String(back.name).toUpperCase() === 'BTN_OK'){
      back.click();
    }
  }

  triggerControllerDUpPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerDUpPress(); return; }
    this.padNavigate('up');
  }

  triggerControllerDDownPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerDDownPress(); return; }
    this.padNavigate('down');
  }

  triggerControllerDLeftPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerDLeftPress(); return; }
    this.padNavigate('left');
  }

  triggerControllerDRightPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerDRightPress(); return; }
    this.padNavigate('right');
  }

  triggerControllerBumperLPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerBumperLPress(); return; }
  }

  triggerControllerBumperRPress(){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerBumperRPress(); return; }
  }

  /** Left stick moves focus like the d-pad. */
  triggerControllerLStickXPress( positive = false ){
    if(positive) this.triggerControllerDRightPress();
    else this.triggerControllerDLeftPress();
  }

  triggerControllerLStickYPress( positive = false ){
    if(positive) this.triggerControllerDDownPress();
    else this.triggerControllerDUpPress();
  }

  triggerControllerRStickXPress( positive = false ){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerRStickXPress(positive); return; }
  }

  /** Right stick scrolls the description (or focused) list. */
  triggerControllerRStickYPress( positive = false ){
    const target = this.padTarget();
    if(target !== this){ target.triggerControllerRStickYPress(positive); return; }
    const list = this.findPadScrollList();
    if(!list) return;
    if(positive) list.scrollDown();
    else list.scrollUp();
  }

  addEventListener(name: string, callback: Function){
    if(typeof callback !== 'function'){ return; }

    name = name.toUpperCase().trim();
    let listeners = this.eventListenters.get(name);
    if(!Array.isArray(listeners)){
      listeners = [callback];
      this.eventListenters.set(name, listeners);
    }else if(listeners.indexOf(callback) == -1){
      listeners.push(callback);
    }
  }

  removeEventListener(name: string, callback: Function){
    if(typeof callback !== 'function'){ return; }

    name = name.toUpperCase().trim();
    let listeners = this.eventListenters.get(name);
    if(Array.isArray(listeners)){
      let idx = listeners.indexOf(callback);
      if(idx >= 0){ listeners.splice(idx, 1); }
    }
  }

  triggerEventListener(name: string, ...args: any){
    name = name.toUpperCase().trim();
    let listeners = this.eventListenters.get(name);
    if(Array.isArray(listeners)){
      for(let i = 0; i < listeners.length; i++){
        listeners[i](...args);
      }
    }
  }

  gameStringParse(text: string){
    text = text.split('##')[0].replaceAll(/\{.*?\}/ig, '').trim();
    text = text.replace(/<FullName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getFieldByLabel('FirstName')?.getValue());
    text = text.replace(/<FirstName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getFieldByLabel('FirstName')?.getValue());
    text = text.replace(/<LastName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getFieldByLabel('LastName')?.getValue());

    // CTlkTable::ParseStr has one token per name. keymap.2da can share names
    // (Pause = PauseKey non-remappable + Space remappable); remappable wins.
    const tokenByName = new Map<string, (typeof KeyMapper.ACTIONS_ALL)[number]>();
    for(let i = 0; i < KeyMapper.ACTIONS_ALL.length; i++){
      const keymap = KeyMapper.ACTIONS_ALL[i];
      if(!keymap?.name) continue;
      const existing = tokenByName.get(keymap.name);
      if(!existing || (!existing.remappable && keymap.remappable)){
        tokenByName.set(keymap.name, keymap);
      }
    }
    tokenByName.forEach((keymap) => {
      text = text.replace(keymap.tokenRegEx, keymap.character);
    });

    text = text.replace(/<CUSTOM(\d+)>/gm, function(match, p1, offset, string){
      return GameState.module.getCustomToken(parseInt(p1));
    });

    return text;
  }

}
