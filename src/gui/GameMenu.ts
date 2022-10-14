/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GUIControl, GUIProtoItem, MenuManager } from ".";
import * as THREE from "THREE";
import { GFFObject } from "../resource/GFFObject";
import { TextureLoader } from "../loaders/TextureLoader";
import { OdysseyTexture } from "../resource/OdysseyTexture";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameState } from "../GameState";
import { ResourceLoader } from "../resource/ResourceLoader";
import { OdysseyObject3D } from "../three/odyssey";
import { AudioEmitter } from "../audio/AudioEmitter";

/* @file
 * The base GameMenu class.
 */

export class GameMenu {
  args: any;
  _button_a: any;
  _button_b: any;
  _button_x: any;
  _button_y: any;
  bVisible: boolean;
  gui_resref: string;
  scale: number;
  enablePositionScaling: boolean = false;
  isOverlayGUI: boolean;
  textNeedsUpdate: boolean = false;
  selectedControl: GUIControl;

  background: any;
  backgroundSprite: any;
  canCancel: boolean;
  childMenu: any;
  activeWidget: any[];
  tGuiPanel: any;
  menuGFF: any;
  width: any;
  height: any;
  voidFill: any;
  backgroundVoidMaterial: any;
  backgroundMaterial: any;
  backgroundVoidSprite: any;
  audioEmitter: AudioEmitter;

  constructor(){
    this._button_a = undefined;
    this._button_b = undefined;
    this._button_x = undefined;
    this._button_y = undefined;

    this.bVisible = false;
    this.scale = 1;
    this.background = null;
    this.backgroundSprite = new OdysseyObject3D();
    this.canCancel = true;

    this.childMenu = undefined; //This is for MenuTop

    this.activeWidget = [];//undefined; //Used for hoverstate tracking
  }

  async Load(): Promise<GameMenu> {
    await this.LoadMenu();
    return this;
  }

  LoadMenu(): Promise<GameMenu> {
    return new Promise( (resolve: Function, reject: Function) => {
      this.tGuiPanel = null;
  
      //mainmenu16x12
      this.LoadBackground( () => {
        
        ResourceLoader.loadResource(ResourceTypes.gui, this.gui_resref, (buffer: Buffer) => {
          
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
  
          this.tGuiPanel.widget.add(this.backgroundSprite);
          
          panelControl.position.x = 0;//tGuiPanel.extent.left - ( (jQuery(window).innerWidth() - tGuiPanel.extent.width) / 2 );
          panelControl.position.y = 0;//-tGuiPanel.extent.top + ( (jQuery(window).innerHeight() - tGuiPanel.extent.height) / 2 );
  
          //This auto assigns references for the controls to the menu object.
          //It is no longer required to use this.getControlByName('CONTROL_NAME') when initializing a menu
          //You can just use this.CONTROL_NAME 
          this.AssignChildControlsToMenu(this.tGuiPanel);
  
          TextureLoader.LoadQueue(() => {
            resolve(this);
          });
  
        });
  
      });
    });
  }

  async MenuControlInitializer(): Promise<any> {
    return;
  };

  AssignChildControlsToMenu(object: GUIControl){
    if(object instanceof GUIControl){
      for(let i = 0, len = object.children.length; i < len; i++){
        let ctrl = object.children[i];
        if(!isNaN(parseInt(ctrl.name[0]))) ctrl.name = '_'+ctrl.name;
        (this as any)[ctrl.name] = ctrl;
        this.AssignChildControlsToMenu(ctrl);
      }
    }
  }

  LoadBackground( onLoad?: Function ){
    if(this.voidFill){
      let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      this.backgroundVoidMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0x000000), side: THREE.DoubleSide} );
      this.backgroundVoidSprite = new THREE.Mesh( geometry, this.backgroundVoidMaterial );
      this.backgroundVoidSprite.position.z = -6;
      this.backgroundVoidSprite.renderOrder = -6;
    }


    if(this.background){
      TextureLoader.tpcLoader.fetch(this.background, (texture: OdysseyTexture) => {

        let geometry = new THREE.PlaneGeometry( 1600, 1200, 1 );
        this.backgroundMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), map: texture, side: THREE.DoubleSide} );
        this.backgroundSprite = new THREE.Mesh( geometry, this.backgroundMaterial );
        this.backgroundSprite.position.z = -5;
        this.backgroundSprite.renderOrder = -5;

        if(typeof onLoad === 'function')
          onLoad();

      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  LoadTexture( resRef: string, onLoad?: Function ){
    TextureLoader.Load(resRef, (texture: OdysseyTexture) => {
      if(typeof onLoad === 'function')
        onLoad(texture);
    });
  }

  getControlByName(name: string): GUIControl {
    try{
      return this.tGuiPanel.getControl().getObjectByName(name).control;
    }catch(e){
      console.error('getControlByName', 'Control not found', name);
    }
    return;
  }

  Hide(){
    this.bVisible = false;
    GameState.scene_gui.remove(this.tGuiPanel.getControl());

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.Hide();
  }

  Show(){
    this.Hide();
    this.bVisible = true;
    GameState.scene_gui.add(this.tGuiPanel.getControl());

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.Show();
  }

  Close(){
    MenuManager.Remove(this);
    this.Hide();
  }

  Open(){
    MenuManager.Add(this);
    this.Show();
  }

  Remove(){
    //TODO
  }

  IsVisible(){
    return this.bVisible;
  }

  Update(delta: number = 0){
    //Only update if the Menu is visible
    if(!this.bVisible)
      return;

    if(this.voidFill){
      this.backgroundVoidSprite.scale.set(window.innerWidth, window.innerHeight, 1);
    }

    if(this.tGuiPanel && this.tGuiPanel.children){
      let len = this.tGuiPanel.children.length;
      for(let i = 0; i < len; i++){
        this.tGuiPanel.children[i].update(delta);
      }
    }
  }

  RecalculatePosition(){
    try{
      this.tGuiPanel.recalculate();
    }catch(e){ console.error(e); }
  }

  SetWidgetHoverActive(widget: GUIControl, bActive: boolean = false){

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

  GetActiveControls(){
    let controls = [];
    if(this.tGuiPanel){
      controls = this.tGuiPanel.getActiveControls();
    }
    return controls;
  }

  Scale(scale = 1.0){

    this.scale = scale;
    this.tGuiPanel.widget.scale.set(this.scale, this.scale, 1.0);

    for(let i = 0; i < this.tGuiPanel.children.length; i++){
      if(this.tGuiPanel.children[i] instanceof GUIControl)
        this.tGuiPanel.children[i].updateScale();
    }

  }

  Resize(){
    //STUB
  }

  triggerControllerAPress(){
    if(this._button_a instanceof GUIControl){
      this._button_a.click();
    }else if(GameState.activeGUIElement instanceof GUIControl){
      GameState.activeGUIElement.click();
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
    if(GameState.activeGUIElement instanceof GUIControl){
      //GameState.activeGUIElement.click();
    }
  }

  triggerControllerDDownPress(){
    if(GameState.activeGUIElement instanceof GUIControl){
      //GameState.activeGUIElement.click();
    }
  }

  triggerControllerDLeftPress(){
    if(GameState.activeGUIElement instanceof GUIControl){
      //GameState.activeGUIElement.click();
    }
  }

  triggerControllerDRightPress(){
    if(GameState.activeGUIElement instanceof GUIControl){
      //GameState.activeGUIElement.click();
    }
  }

  triggerControllerBumperLPress(){
    if(GameState.activeGUIElement instanceof GUIControl){
      //GameState.activeGUIElement.click();
    }
  }

  triggerControllerBumperRPress(){
    if(GameState.activeGUIElement instanceof GUIControl){
      //GameState.activeGUIElement.click();
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
