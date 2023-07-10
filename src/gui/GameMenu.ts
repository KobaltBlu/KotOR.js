/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GUIControl, GUIProtoItem } from ".";
import * as THREE from "three";
import { GFFObject } from "../resource/GFFObject";
import { OdysseyTexture } from "../resource/OdysseyTexture";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameState } from "../GameState";
import { OdysseyObject3D } from "../three/odyssey";
import { AudioEmitter } from "../audio/AudioEmitter";
import { EngineMode } from "../enums/engine/EngineMode";
import { ShaderManager } from "../managers";
import type { MenuManager } from "../managers";
import { ResourceLoader, TextureLoader } from "../loaders";

/* @file
 * The base GameMenu class.
 */

export class GameMenu {
  gui_resref: string;
  menuGFF: GFFObject;
  manager: typeof MenuManager;

  //This is for MenuTop
  childMenu: GameMenu = undefined;

  tGuiPanel: GUIControl;
  _button_a: GUIControl = undefined;
  _button_b: GUIControl = undefined;
  _button_x: GUIControl = undefined;
  _button_y: GUIControl = undefined;
  selectedControl: GUIControl;

  //Used for hoverstate tracking
  activeWidget: GUIControl[] = [];

  bVisible: boolean = false;
  scale: number = 1;
  enablePositionScaling: boolean = false;
  isOverlayGUI: boolean = false;
  textNeedsUpdate: boolean = false;

  canCancel: boolean = true;
  width: number = 640;
  height: number = 480;

  background: string;
  backgroundSprite: THREE.Mesh;
  backgroundMaterial: THREE.ShaderMaterial;

  voidFill: boolean = false;
  backgroundVoidSprite: THREE.Mesh;
  backgroundVoidMaterial: THREE.ShaderMaterial;

  audioEmitter: AudioEmitter;

  engineMode: EngineMode = EngineMode.GUI;

  constructor(){
    this._button_a = undefined;
    this._button_b = undefined;
    this._button_x = undefined;
    this._button_y = undefined;
  }

  async load(): Promise<GameMenu> {
    await this.loadMenu();
    return this;
  }

  loadMenu(): Promise<GameMenu> {
    return new Promise( (resolve: Function, reject: Function) => {
      this.tGuiPanel = null;
  
      //mainmenu16x12
      this.loadBackground( () => {
        
        ResourceLoader.loadResource(ResourceTypes.gui, this.gui_resref, async (buffer: Buffer) => {
          
          this.menuGFF = new GFFObject(buffer);
          
          this.tGuiPanel = new GUIControl(this, this.menuGFF.RootNode, undefined, this.enablePositionScaling);
          this.tGuiPanel.allowClick = false;
          
          let extent = this.tGuiPanel.extent;
          this.width = extent.width;
          this.height = extent.height;
  
          let panelControl = this.tGuiPanel.createControl();
  
          if(this.voidFill){
            this.tGuiPanel.widget.add(this.backgroundVoidSprite);
          }
  
          if(this.backgroundSprite){
            this.tGuiPanel.widget.add(this.backgroundSprite);
          }
          
          panelControl.position.x = 0;
          panelControl.position.y = 0;
  
          //This auto assigns references for the controls to the menu object.
          //It is no longer required to use this.getControlByName('CONTROL_NAME') when initializing a menu
          //You can just use this.CONTROL_NAME 
          this.assignChildControlsToMenu(this.tGuiPanel);

          await this.menuControlInitializer();
  
          TextureLoader.LoadQueue(() => {
            resolve(this);
          });
  
        });
  
      });
    });
  }

  async menuControlInitializer(skipInit: boolean = false): Promise<any> {
    return;
  };

  assignChildControlsToMenu(object: GUIControl){
    if(object instanceof GUIControl){
      for(let i = 0, len = object.children.length; i < len; i++){
        let ctrl = object.children[i];
        if(!isNaN(parseInt(ctrl.name[0]))) ctrl.name = '_'+ctrl.name;
        (this as any)[ctrl.name] = ctrl;
        this.assignChildControlsToMenu(ctrl);
      }
    }
  }

  loadBackground( onLoad?: Function ){
    if(this.voidFill){
      const geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      // this.backgroundVoidMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0x000000), side: THREE.DoubleSide} );
      this.backgroundVoidMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          ShaderManager.Shaders.get('void-gui').getUniforms()
        ]),
        vertexShader: ShaderManager.Shaders.get('void-gui').getVertex(),
        fragmentShader: ShaderManager.Shaders.get('void-gui').getFragment(),
      })
      this.backgroundVoidSprite = new THREE.Mesh( geometry, this.backgroundVoidMaterial );
      this.backgroundVoidSprite.position.z = -6;
      this.backgroundVoidSprite.renderOrder = -6;

      // this.backgroundVoidMaterial.uniforms.u_color.value.setRGB(0.0, 0.658824, 0.980392);
      this.backgroundVoidMaterial.uniforms.u_color.value.setRGB(0.10196078568697, 0.69803923368454, 0.549019634723663);
      // this.backgroundVoidMaterial.uniforms.u_color.value.setRGB(1.0, 1.0, 1.0);
    }


    if(this.background){
      TextureLoader.tpcLoader.fetch(this.background, (texture: OdysseyTexture) => {
        const geometry = new THREE.PlaneGeometry( 1600, 1200, 1 );
        this.backgroundMaterial = new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.merge([
            ShaderManager.Shaders.get('background-gui').getUniforms()
          ]),
          vertexShader: ShaderManager.Shaders.get('background-gui').getVertex(),
          fragmentShader: ShaderManager.Shaders.get('background-gui').getFragment(),
        });
        this.backgroundMaterial.transparent = true;
        this.backgroundSprite = new THREE.Mesh( geometry, this.backgroundMaterial );
        this.backgroundSprite.position.z = -5;
        this.backgroundSprite.renderOrder = -5;
        this.backgroundMaterial.uniforms.map.value = texture;

        if(typeof onLoad === 'function')
          onLoad();

      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadTexture( resRef: string ): Promise<OdysseyTexture> {
    return new Promise<OdysseyTexture>( (resolve, reject) => {
      TextureLoader.Load(resRef, (texture: OdysseyTexture) => {
        resolve(texture);
      });
    });
  }

  getControlByName(name: string): GUIControl {
    try{
      return (this as any)[name];//this.tGuiPanel.getControl().getObjectByName(name).userData.control;
    }catch(e){
      console.error('getControlByName', 'Control not found', name);
    }
    return;
  }

  hide(){
    this.bVisible = false;
    GameState.scene_gui.remove(this.tGuiPanel.getControl());

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.hide();
  }

  show(){
    // this.Hide();
    if(!this.isOverlayGUI)
      GameState.Mode = this.engineMode;
      
    this.bVisible = true;
    GameState.scene_gui.add(this.tGuiPanel.getControl());

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.show();
  }

  close(){
    this.hide();
    this.manager.Remove(this);
    if(!this.isOverlayGUI){
      GameState.RestoreEnginePlayMode();
    }
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

  update(delta: number = 0){
    //Only update if the Menu is visible
    if(!this.bVisible)
      return;

    if(this.voidFill){
      this.backgroundVoidMaterial.uniforms.u_time.value = GameState.deltaTimeFixed;
      this.backgroundVoidMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
      this.backgroundVoidSprite.scale.set(window.innerWidth, window.innerHeight, 1);
    }

    if(this.background){
      this.backgroundMaterial.uniforms.u_time.value = GameState.deltaTimeFixed;
      this.backgroundMaterial.uniforms.u_resolution.value.set(1600, 1200);
    }

    if(this.tGuiPanel && this.tGuiPanel.children){
      let len = this.tGuiPanel.children.length;
      for(let i = 0; i < len; i++){
        this.tGuiPanel.children[i].update(delta);
      }
    }
  }

  recalculatePosition(){
    try{
      this.tGuiPanel.recalculate();
    }catch(e){ console.error(e); }
  }

  setWidgetHoverActive(widget: GUIControl, bActive: boolean = false){

    if(!(widget instanceof GUIControl) || (widget instanceof GUIProtoItem))
      return false;

    let idx = this.activeWidget.indexOf(widget);

    if(bActive){
      if(idx == -1){
        this.activeWidget.push(widget);
        if(widget instanceof GUIControl){
          widget.onHoverIn();
        }
      }
    }else{
      if(idx > -1){
        if(widget instanceof GUIControl){
          widget.onHoverOut();
        }
        this.activeWidget.splice(idx, 1);
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

    for(let i = 0; i < this.tGuiPanel.children.length; i++){
      if(this.tGuiPanel.children[i] instanceof GUIControl)
        this.tGuiPanel.children[i].updateScale();
    }

  }

  resize(){
    //STUB
  }

  triggerControllerAPress(){
    if(this._button_a instanceof GUIControl){
      this._button_a.click();
    }else if(this.manager.activeGUIElement instanceof GUIControl){
      this.manager.activeGUIElement.click();
    }
  }

  triggerControllerBPress(){
    if(this._button_b instanceof GUIControl){
      this._button_b.click();
    }
  }

  triggerControllerXPress(){
    if(this._button_x instanceof GUIControl){
      this._button_x.click();
    }
  }

  triggerControllerYPress(){
    if(this._button_y instanceof GUIControl){
      this._button_y.click();
    }
  }

  triggerControllerDUpPress(){
    if(this.manager.activeGUIElement instanceof GUIControl){
      //this.manager.activeGUIElement.click();
    }
  }

  triggerControllerDDownPress(){
    if(this.manager.activeGUIElement instanceof GUIControl){
      //this.manager.activeGUIElement.click();
    }
  }

  triggerControllerDLeftPress(){
    if(this.manager.activeGUIElement instanceof GUIControl){
      //this.manager.activeGUIElement.click();
    }
  }

  triggerControllerDRightPress(){
    if(this.manager.activeGUIElement instanceof GUIControl){
      //this.manager.activeGUIElement.click();
    }
  }

  triggerControllerBumperLPress(){
    if(this.manager.activeGUIElement instanceof GUIControl){
      //this.manager.activeGUIElement.click();
    }
  }

  triggerControllerBumperRPress(){
    if(this.manager.activeGUIElement instanceof GUIControl){
      //this.manager.activeGUIElement.click();
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

}
