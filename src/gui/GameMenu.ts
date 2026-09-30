import * as THREE from "three";
import { GFFObject } from "@/resource/GFFObject";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import type { MenuManager } from "@/managers/MenuManager";
import { ResolutionManager } from "@/managers/ResolutionManager";
import { ShaderManager } from "@/managers/ShaderManager"
import { ResourceLoader, TextureLoader } from "@/loaders";
import { GUIControl } from "@/gui/GUIControl";
import { GUIControlFactory } from "@/gui/GUIControlFactory";
import { commitGuiTransform, freezeGuiTree } from "@/gui/guiMatrix";
import { BitWise } from "@/utility/BitWise";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { KeyMapper } from "@/controls";
import { shouldSuppressGameMenuHoverForListRow } from "@/gui/listrow/listRowHover";
import { GUIPanelCoordFlags } from "@/gui/GUICoord";
import { getGodRayTexture } from "@/shaders/datatextures/godray.datatexture";
import {
  createGUIFogVolumeTexture,
  GUI_FOG_VOLUME
} from "@/shaders/datatextures/fog.datatexture";
import { EngineModeController } from '@/engine/EngineModeController';

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
      await this.buildMenu(this.menuGFF);
    }catch(e){
      console.error(e);
    };
    return this;
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
      for(var i = this.activeControls.length; i--;){
        const control = this.activeControls[i];
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

    for(let i = 0; i < this.tGuiPanel.children.length; i++){
      if(this.tGuiPanel.children[i])
        this.tGuiPanel.children[i].updateScale();
    }

  }

  resize(){
    this.recalculatePosition();
  }

  triggerControllerAPress(){
    if(this._button_a){
      this._button_a.click();
    }else if(this.manager.activeGUIElement){
      this.manager.activeGUIElement.click();
    }
  }

  triggerControllerBPress(){
    if(this._button_b){
      this._button_b.click();
    }
  }

  triggerControllerXPress(){
    if(this._button_x){
      this._button_x.click();
    }
  }

  triggerControllerYPress(){
    if(this._button_y){
      this._button_y.click();
    }
  }

  triggerControllerDUpPress(){
    if(this.selectedControl){
      this.selectedControl.directionalNavigate('up');
    }
  }

  triggerControllerDDownPress(){
    if(this.selectedControl){
      this.selectedControl.directionalNavigate('down');
    }
  }

  triggerControllerDLeftPress(){
    if(this.selectedControl){
      this.selectedControl.directionalNavigate('left');
    }
  }

  triggerControllerDRightPress(){
    if(this.selectedControl){
      this.selectedControl.directionalNavigate('right');
    }
  }

  triggerControllerBumperLPress(){
    if(this.manager.activeGUIElement){
      //this.manager.activeGUIElement.click;
    }
  }

  triggerControllerBumperRPress(){
    if(this.manager.activeGUIElement){
      //this.manager.activeGUIElement.click;
    }
  }

  triggerControllerLStickXPress( positive = false ){
    
  }

  triggerControllerLStickYPress( positive = false ){

  }

  triggerControllerRStickXPress( positive = false ){

  }

  triggerControllerRStickYPress( positive = false ){

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
