/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GamePad, Mouse, MouseState, Keyboard, KeyMapper, AnalogInput } from "./";
import * as THREE from "three";
import { GameState } from "../GameState";
import { GameMenu, GUIControl, GUIListBox, GUIScrollBar, MenuManager } from "../gui";
import { Utility } from "../utility/Utility";
import { PartyManager } from "../managers/PartyManager";
import { EngineMode } from "../enums/engine/EngineMode";
import { EngineState } from "../enums/engine/EngineState";
import { ModuleObject } from "../module";
import { KeyMapAction } from "../enums/controls/KeyMapAction";
import { MiniGameType } from "../enums/engine/MiniGameType";
import { FollowerCamera } from "../engine/FollowerCamera";

/* @file
 * The IngameControls class.
 */

interface KeyboardKey {
  down: boolean,
  pressed: boolean
}

export class IngameControls {
  camera: THREE.Camera;
  element: HTMLElement;

  //controllers
  keyboard: Keyboard = new Keyboard();
  gamePad: GamePad;

  gamePadMovement: boolean = false;

  plMoveEvent: (e: any) => void;

  constructor(camera: THREE.Camera, element: HTMLElement){

    this.camera = camera;
    this.element = element;

    this.gamePad = new GamePad();

    this.initKeys();

    this.element.requestPointerLock = this.element.requestPointerLock;

    // Ask the browser to release the pointer
    document.exitPointerLock = document.exitPointerLock;
    document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);

    this.keyboard.init();

    window.addEventListener('mousedown', (event: MouseEvent) => {
      Mouse.Update(event.clientX, event.clientY);
      if(event.target == this.element){
        GameState.activeGUIElement = undefined;
        if(GameState.debug.controls)
          console.log('Valid Mouse Target');
        Mouse.ButtonState = event.which;
        Mouse.MouseDown = true;
        // let parentOffset = this.editor.canvas.offset();
        Mouse.MouseDownX = event.pageX - this.element.offsetLeft;
        Mouse.MouseDownY = event.pageY - this.element.offsetTop;

        if(Mouse.ButtonState == MouseState.LEFT){

        }else{
          // Ask the browser to lock the pointer
          this.element.requestPointerLock();
        }
      }else{
        //console.log('Invalid Mouse Target', this.element);
      }

      if(GameState.debug.controls)
        console.log('DOWN');

      // GameState.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      // GameState.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

      GameState.raycaster.setFromCamera( GameState.mouse, GameState.camera_gui );
      
      let clickCaptured = false;

      let customEvent = GUIControl.generateEventObject();

      Mouse.downItem = null;
      Mouse.clickItem = null;

      let uiControls = this.MenuGetActiveUIElements();
      for(let i = 0; i < uiControls.length; i++){
        if(!customEvent.propagate)
          break;
        
        let control = uiControls[i];
        if(!(control.widget.parent instanceof THREE.Scene) && control.widget.visible){
          clickCaptured = true;
          if(GameState.debug.controls)
            console.log('uiControls', control)
          try{
            if(control.processEventListener('mouseDown', [customEvent])){
              Mouse.downItem = control;
              customEvent.propagate = false;
              //control.onMouseDown(customEvent);
            }

            if(control.eventListeners['click'].length){
              Mouse.clickItem = control;
              customEvent.propagate = false;
            }
            
            //GameState.guiAudioEmitter.PlaySound('gui_click');
            if(GameState.debug.controls)
              console.log('MouseDown', control, Mouse.downItem, Mouse.clickItem, typeof control.onClick);
          }catch(e){

          }
        }
      }
      Mouse.leftDown = true;
    });

    window.addEventListener('mousemove', (event: MouseEvent) => {
      GameState.scene_cursor_holder.visible = true;

      Mouse.Update( event.clientX, event.clientY );

      //onMouseMove events HERE
      //console.log('move', Mouse.downItem, Mouse.leftDown);
      if(Mouse.downItem && Mouse.leftDown){
        if((Mouse.downItem instanceof GUIControl)){
          //if(typeof Mouse.downItem.widget.parent !== 'undefined'){
            if(!(Mouse.downItem.widget.parent instanceof THREE.Scene)){
              Mouse.downItem.processEventListener('mouseMove', [])
              /*if(typeof Mouse.downItem.onMouseMove === 'function'){
                //console.log('Dragging');
                Mouse.downItem.onMouseMove();
              }*/
            }
          //}
        }
      }

      // let parentOffset = this.element.offset();
      Mouse.MouseX = event.pageX - this.element.offsetLeft;
      Mouse.MouseY = event.pageY - this.element.offsetTop;

      if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == MouseState.RIGHT){
        Mouse.Dragging = true;
      }else if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == MouseState.LEFT){
        Mouse.Dragging = true;
      }
    });

    window.addEventListener('mouseup', (event: MouseEvent) => {
      Mouse.MouseDown = false;
      Mouse.Dragging = false;
      Mouse.ButtonState = MouseState.NONE;

      Mouse.leftClick = true;

      // Ask the browser to release the pointer
      document.exitPointerLock();

      //event.preventDefault();
      if(GameState.debug.controls)
        console.log('UP');

      if(Mouse.leftDown){
        Mouse.Update( event.clientX, event.clientY );
        // GameState.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        // GameState.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        //If the NoClickTimer is active then we will return out of this function
        if(GameState.noClickTimer){
          return;
        }
        
        let clickCaptured = false;

        let customEvent = GUIControl.generateEventObject();
  
        //GameState.selected = undefined;

        //Try to fire mouse up regardless if mouse is still inside object
        if((Mouse.downItem instanceof GUIControl)){
          //if(typeof Mouse.downItem.widget.parent !== 'undefined'){
            if(!(Mouse.downItem.widget.parent instanceof THREE.Scene)){
              try{
                Mouse.downItem.processEventListener('mouseUp', [customEvent]);
                //Mouse.downItem.onMouseUp(customEvent);
                //GameState.guiAudioEmitter.PlaySound('gui_click');
                if(GameState.debug.controls)
                  console.log('MouseUp', Mouse.downItem, Mouse.downItem.name);
                Mouse.leftClick = false;
              }catch(e){

              }

            }
          //}
        }

        let uiControls = this.MenuGetActiveUIElements();
        for(let i = 0; i < uiControls.length; i++){
          if(!customEvent.propagate)
            break;

          let control = uiControls[i];
          if(control === Mouse.clickItem){
            if(typeof control.widget.parent !== 'undefined'){
              if(!(control.widget.parent instanceof THREE.Scene) && control.widget.visible){
                clickCaptured = true;
                try{
                  Mouse.clickItem = null;
                  //control.onClick(customEvent);
                  GameState.activeGUIElement = control;
                  control.processEventListener('click', [customEvent]);
                  GameState.guiAudioEmitter.PlaySound('gui_click');
                  if(GameState.debug.controls)
                    console.log('MouseClick', control, control.name);
                  Mouse.leftClick = false;
                }catch(e){

                }
              }
            }
          }
        }

        let selectedObject = clickCaptured;
  
        if(!clickCaptured && (GameState.Mode != EngineMode.DIALOG)){
          if(GameState.Mode == EngineMode.INGAME && MenuManager.GetCurrentMenu() == MenuManager.InGameOverlay){
            GameState.onMouseHitInteractive( (moduleObject: ModuleObject, intersection: any) => {
              if(GameState.debug.selectedObject)
                console.log('Mesh', intersection)
              if(moduleObject instanceof ModuleObject){
                if(moduleObject.isUseable() && moduleObject != GameState.getCurrentPlayer()){

                  selectedObject = true;

                  let distance = GameState.getCurrentPlayer().position.distanceTo(moduleObject.position);
                  let distanceThreshold = 20;

                  if(GameState.selectedObject == moduleObject && distance <= distanceThreshold){
                    if(typeof moduleObject.onClick === 'function'){
                      GameState.getCurrentPlayer().clearAllActions();
                      moduleObject.onClick(GameState.getCurrentPlayer());
                    }else{
                      let distance = GameState.getCurrentPlayer().position.distanceTo(moduleObject.position);
                      //console.log(distance);
                      if(distance > 1.5){
                        GameState.getCurrentPlayer().clearAllActions();
                        moduleObject.clearAllActions();
                        GameState.getCurrentPlayer().actionDialogObject(moduleObject);
                      }
                    }
                  }
                  GameState.setReticleSelectedObject(moduleObject);
                }
                if(GameState.debug.selectedObject)
                  console.log('Ingame Object', moduleObject);
              }else{
                if(GameState.debug.selectedObject)
                  console.log('Object', moduleObject);
              }
            });
            if(!selectedObject){
              GameState.hovered = GameState.hoveredObject = GameState.selected = GameState.selectedObject = undefined;
            }
          }
        }
      }
      Mouse.downItem = undefined;
      Mouse.clickItem = undefined;
      Mouse.leftDown = false;
    });

    document.body.addEventListener('wheel', (e: WheelEvent) => {
      if(e.deltaY < 0){
        if(GameState.hoveredGUIElement instanceof GUIListBox){
          GameState.hoveredGUIElement.scrollUp();
        }else if(GameState.hoveredGUIElement instanceof GUIScrollBar){
          GameState.hoveredGUIElement.list.scrollUp();
        }
      }else{
        if(GameState.hoveredGUIElement instanceof GUIListBox){
          GameState.hoveredGUIElement.scrollDown();
        }else if(GameState.hoveredGUIElement instanceof GUIScrollBar){
          GameState.hoveredGUIElement.list.scrollDown();
        }
      }
    });

  }

  initKeys(){
    KeyMapper.BindKeyboard(this.keyboard);
    KeyMapper.BindGamepad(this.gamePad);

    //W
    KeyMapper.Actions[KeyMapAction.ActionUp].setProcessor( (keymap) => {
      if(GameState.State == EngineState.PAUSED) return;
      if(!keymap.keyboardInput?.down) return;
      if(this.gamePadMovement) return;
      const followee = PartyManager.party[0];
      if(!followee) return;
      if(!followee.canMove()) return;

      followee.clearAllActions(true);
      followee.force = 1;
      followee.setFacing(Utility.NormalizeRadian(FollowerCamera.facing + Math.PI/2));
      followee.controlled = true;
      GameState.scene_cursor_holder.visible = true;
    });

    //S
    KeyMapper.Actions[KeyMapAction.ActionDown].setProcessor( (keymap) => {
      if(GameState.State == EngineState.PAUSED) return;
      if(!keymap.keyboardInput?.down) return;
      if(this.gamePadMovement) return;
      const followee = PartyManager.party[0];
      if(!followee) return;
      if(!followee.canMove()) return;
      
      followee.clearAllActions(true);
      followee.force = 1;
      followee.setFacing(Utility.NormalizeRadian(FollowerCamera.facing - Math.PI/2));
      followee.controlled = true;
      GameState.scene_cursor_holder.visible = true;
    });

    //Z
    KeyMapper.Actions[KeyMapAction.ActionLeft].setProcessor( (keymap) => {
      if(GameState.State == EngineState.PAUSED) return;
      if(!keymap.keyboardInput?.down) return;
      const followee = PartyManager.party[0];
      if(!followee) return;
      if(!followee.canMove()) return;
    });

    //C
    KeyMapper.Actions[KeyMapAction.ActionRight].setProcessor( (keymap) => {
      if(GameState.State == EngineState.PAUSED) return;
      if(!keymap.keyboardInput?.down) return;
      const followee = PartyManager.party[0];
      if(!followee) return;
      if(!followee.canMove()) return;
    });

    //A
    KeyMapper.Actions[KeyMapAction.CameraRotateLeft].setProcessor( (keymap) => {
      // if(GameState.State == EngineState.PAUSED) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      if(
        (keymap.keyboardInput.down || 
        (keymap.gamepadInput as AnalogInput).value < 0)
      ){
        FollowerCamera.turning = true;
        if(this.gamePad.stick_r_x.value){
          GameState.scene_cursor_holder.visible = false;
          FollowerCamera.dir = -this.gamePad.stick_r_x.value;
        }else{
          FollowerCamera.dir = 1;
          GameState.scene_cursor_holder.visible = true;
        }
      }
    });

    //D
    KeyMapper.Actions[KeyMapAction.CameraRotateRight].setProcessor( (keymap) => {
      // if(GameState.State == EngineState.PAUSED) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      if(
        (keymap.keyboardInput.down || 
        (keymap.gamepadInput as AnalogInput).value > 0)
      ){
        FollowerCamera.turning = true;
        if(this.gamePad.stick_r_x.value){
          GameState.scene_cursor_holder.visible = false;
          FollowerCamera.dir = -this.gamePad.stick_r_x.value;
        }else{
          FollowerCamera.dir = -1;
          GameState.scene_cursor_holder.visible = true;
        }
      }
    });

    //ChangeLeader
    KeyMapper.Actions[KeyMapAction.ChangeChar].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      PartyManager.ShiftLeader();
    });

    //Dialog1
    KeyMapper.Actions[KeyMapAction.Dialog1].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[0].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[0].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog2
    KeyMapper.Actions[KeyMapAction.Dialog2].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[1].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[1].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog3
    KeyMapper.Actions[KeyMapAction.Dialog3].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[2].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[2].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog4
    KeyMapper.Actions[KeyMapAction.Dialog4].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[3].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[3].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog5
    KeyMapper.Actions[KeyMapAction.Dialog5].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[4].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[4].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog6
    KeyMapper.Actions[KeyMapAction.Dialog6].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[5].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[5].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog7
    KeyMapper.Actions[KeyMapAction.Dialog7].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[6].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[6].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog8
    KeyMapper.Actions[KeyMapAction.Dialog8].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[7].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[7].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //Dialog9
    KeyMapper.Actions[KeyMapAction.Dialog9].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.state == 1){
        try{ MenuManager.InGameDialog.LB_REPLIES.children[8].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }else if(MenuManager.InGameComputer.bVisible){
        try{ MenuManager.InGameComputer.LB_REPLIES.children[8].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
      }
    });

    //DialogSkip
    KeyMapper.Actions[KeyMapAction.DialogSkip].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed && !Mouse.leftClick) return;

      //Dialog
      if(MenuManager.InGameDialog.bVisible && MenuManager.InGameDialog.isListening){
        if(keymap.keyboardInput?.pressed || keymap.gamepadInput?.pressed){
          MenuManager.InGameDialog.playerSkipEntry(MenuManager.InGameDialog.currentEntry);
        }else if(Mouse.leftClick){
          MenuManager.InGameDialog.playerSkipEntry(MenuManager.InGameDialog.currentEntry);
        }
      }
      
      //Computer
      else if(MenuManager.InGameComputer.bVisible && MenuManager.InGameComputer.isListening){
        if(keymap.keyboardInput?.pressed || keymap.gamepadInput?.pressed){
          MenuManager.InGameComputer.playerSkipEntry(MenuManager.InGameComputer.currentEntry);
        }else if(Mouse.leftClick){
          MenuManager.InGameComputer.playerSkipEntry(MenuManager.InGameComputer.currentEntry);
        }
      }

      //Computer Camera
      else if(MenuManager.InGameComputerCam.bVisible){
        MenuManager.InGameComputerCam.Close();
      }
    });

    //DialogAbort
    KeyMapper.Actions[KeyMapAction.DialogAbort].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;

      if(MenuManager.InGameDialog.bVisible){
        MenuManager.InGameDialog.endConversation(true);
      }else if(MenuManager.InGameComputer.bVisible){
        MenuManager.InGameComputer.endConversation(true);
      }else if(MenuManager.InGameComputerCam.bVisible){
        MenuManager.InGameDialog.endConversation(true);
      }
    })

    KeyMapper.Actions[KeyMapAction.MGActionUp].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      switch(GameState.module.area.MiniGame.Type){
        case MiniGameType.SWOOPRACE:

        break;
        case MiniGameType.TURRET:
          GameState.module.area.MiniGame.Player.rotate('x', 1 * delta);
        break;
      }
    });

    KeyMapper.Actions[KeyMapAction.MGActionDown].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      switch(GameState.module.area.MiniGame.Type){
        case MiniGameType.SWOOPRACE:
        
        break;
        case MiniGameType.TURRET:
          GameState.module.area.MiniGame.Player.rotate('z', -1 * delta);
        break;
      }
    });

    KeyMapper.Actions[KeyMapAction.MGActionLeft].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      switch(GameState.module.area.MiniGame.Type){
        case MiniGameType.SWOOPRACE:
          GameState.module.area.MiniGame.Player.lateralForce = -GameState.module.area.MiniGame.Player.accel_lateral_secs;
        break;
        case MiniGameType.TURRET:
          GameState.module.area.MiniGame.Player.rotate('z', 1 * delta);
        break;
      }
    });

    KeyMapper.Actions[KeyMapAction.MGActionRight].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      switch(GameState.module.area.MiniGame.Type){
        case MiniGameType.SWOOPRACE:
          GameState.module.area.MiniGame.Player.lateralForce = GameState.module.area.MiniGame.Player.accel_lateral_secs;
        break;
        case MiniGameType.TURRET:
          GameState.module.area.MiniGame.Player.rotate('x', -1 * delta);
        break;
      }
    });

    KeyMapper.Actions[KeyMapAction.PauseMinigame].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.State = ( GameState.State == EngineState.PAUSED ? EngineState.RUNNING : EngineState.PAUSED );
    });

    KeyMapper.Actions[KeyMapAction.MGshoot].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed && !(Mouse.leftClick || Mouse.MouseDown)) return;
      switch(GameState.module.area.MiniGame.Type){
        case 1:
          GameState.module.area.MiniGame.Player.fire();
        break;
        case 2:
          GameState.module.area.MiniGame.Player.jump();
        break;
      }
    });

    KeyMapper.Actions[KeyMapAction.GUI].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      const currentMenu = MenuManager.GetCurrentMenu();
      switch(GameState.Mode){
        case EngineMode.GUI:
          if(currentMenu != MenuManager.InGameOverlay){
            currentMenu.Close();
          }
        break;
        default:
          MenuManager.MenuOptions.Open();
        break;
      }
    });

    KeyMapper.Actions[KeyMapAction.Pause1].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;

      const currentMenu = MenuManager.GetCurrentMenu();
      if(currentMenu == MenuManager.InGameOverlay){
        GameState.State = ( GameState.State == EngineState.PAUSED ? EngineState.RUNNING : EngineState.PAUSED );
      }else if( currentMenu == MenuManager.InGameConfirm){
        MenuManager.InGameConfirm.Close();
      }
    });

    KeyMapper.Actions[KeyMapAction.Flourish].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.getCurrentPlayer().flourish();
    });

    KeyMapper.Actions[KeyMapAction.FlyUp].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      const followee = PartyManager.party[0];
      if(!followee) return;
      followee.position.z += 5 * delta;
    });

    KeyMapper.Actions[KeyMapAction.FlyDown].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      const followee = PartyManager.party[0];
      if(!followee) return;
      followee.position.z -= 5 * delta;
    });

    KeyMapper.Actions[KeyMapAction.ResolutionScaleUp].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
       GameState.rendererUpscaleFactor += 0.25;
      if(GameState.rendererUpscaleFactor >= 4) GameState.rendererUpscaleFactor = 4;
      GameState.updateRendererUpscaleFactor();
    });

    KeyMapper.Actions[KeyMapAction.ResolutionScaleDown].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      GameState.rendererUpscaleFactor -= 0.25;
      if(GameState.rendererUpscaleFactor <= 0.25) GameState.rendererUpscaleFactor = 0.25;
      GameState.updateRendererUpscaleFactor();
    });

    KeyMapper.Actions[KeyMapAction.ResolutionScaleReset].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      GameState.rendererUpscaleFactor = 1.0;
      GameState.updateRendererUpscaleFactor();
    });

  }

  MenuGetActiveUIElements(){
    let elements: GUIControl[] = [];

    for(let i = 0; i < GameState.scene_gui.children.length; i++){
      if(GameState.scene_gui.children[i].userData.control){
        elements = elements.concat((GameState.scene_gui.children[i].userData.control.menu as GameMenu).GetActiveControls());
      }
    }

    return elements.reverse();
  }

  Update(delta: number = 0){

    let xoffset = 0;
    let yoffset = 0;
    let currentMenu = MenuManager.GetCurrentMenu();

    this.gamePadMovement = false;

    let gp = undefined;
    if(GamePad.CurrentGamePad instanceof Gamepad){
      gp = navigator.getGamepads()[GamePad.CurrentGamePad.index];
      this.gamePad.setGamePad(gp);
      KeyMapper.BindGamepad(this.gamePad);
    }
    this.gamePad.updateState(delta);

    if(Mouse.Dragging){
      xoffset = Mouse.OffsetX || 0;
      yoffset = Mouse.OffsetY || 0;
      //Reset the offset value to fix the lingering drag effect
      Mouse.OffsetX = Mouse.OffsetY = 0;
    }

    if(currentMenu instanceof GameMenu){
      if(this.gamePad.button_a.pressed){
        currentMenu.triggerControllerAPress();
      }else if(this.gamePad.button_b.pressed){
        currentMenu.triggerControllerBPress();
      }else if(this.gamePad.button_x.pressed){
        currentMenu.triggerControllerXPress();
      }else if(this.gamePad.button_y.pressed){
        currentMenu.triggerControllerYPress();
      }else if(this.gamePad.button_bumper_l.pressed){
        currentMenu.triggerControllerBumperLPress();
      }else if(this.gamePad.button_bumper_r.pressed){
        currentMenu.triggerControllerBumperRPress();
      }else if(this.gamePad.button_d_up.pressed){
        currentMenu.triggerControllerDUpPress();
      }else if(this.gamePad.button_d_down.pressed){
        currentMenu.triggerControllerDDownPress();
      }else if(this.gamePad.button_d_left.pressed){
        currentMenu.triggerControllerDLeftPress();
      }else if(this.gamePad.button_d_right.pressed){
        currentMenu.triggerControllerDRightPress();
      }else if(this.gamePad.stick_l_x.pressed){
        currentMenu.triggerControllerLStickXPress( this.gamePad.stick_l_x.value > 0 ? true : false );
      }else if(this.gamePad.stick_l_y.pressed){
        currentMenu.triggerControllerLStickYPress( this.gamePad.stick_l_y.value > 0 ? true : false );
      }else if(this.gamePad.stick_r_x.pressed){
        currentMenu.triggerControllerRStickXPress( this.gamePad.stick_r_x.value > 0 ? true : false );
      }else if(this.gamePad.stick_r_y.pressed){
        currentMenu.triggerControllerRStickYPress( this.gamePad.stick_r_y.value > 0 ? true : false );
      }
    }

    if(GameState.State == EngineState.RUNNING){

      if(
        (GameState.Mode == EngineMode.INGAME) && 
        currentMenu != MenuManager.InGameConfirm && 
        currentMenu != MenuManager.MenuContainer
      ){
        const followee = PartyManager.party[0];
        if(followee){
          if(followee.canMove()){
            if( this.gamePad.stick_l_x.value || this.gamePad.stick_l_y.value ){
              followee.clearAllActions(true);
              followee.force = 1;
              followee.setFacing( Utility.NormalizeRadian( Math.atan2(-this.gamePad.stick_l_x.value, -this.gamePad.stick_l_y.value) + FollowerCamera.facing + Math.PI/2 ) , false);
              followee.controlled = true;
              GameState.scene_cursor_holder.visible = false;
              this.gamePadMovement = true;
            }
          }
        }
      }
    }
    
    KeyMapper.ProcessMappings(GameState.Mode, delta);

    //Keyboard: onFrameEnd
    this.keyboard.onFrameEnd(delta);

    //Mouse: onFrameEnd
    Mouse.leftClick = false;

    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;
  }

  plChangeCallback(e: any){
    if(document.pointerLockElement === this.element) {
      this.element.addEventListener("mousemove", this.plMoveEvent = (e: any) => { this.plMouseMove(e); }, true);
      Mouse.Dragging = true;
    } else {
      //console.log('The pointer lock status is now unlocked');
      this.element.removeEventListener("mousemove", this.plMoveEvent, true);
      Mouse.Dragging = false;
    }
  }

  plMouseMove(event: any){

    Mouse.OffsetX = event.movementX || 0;
    Mouse.OffsetY = (event.movementY || 0)*-1.0;

    //console.log(Mouse.OffsetX, Mouse.OffsetY, Mouse.Dragging, event);
  }

}
