/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GamePad } from "./GamePad";
import * as THREE from "three";
import { GameState } from "../GameState";
import { GameMenu, GUIControl, GUIListBox, GUIScrollBar, MenuManager } from "../gui";
import { Mouse, MouseState } from "./Mouse";
import { Utility } from "../utility/Utility";
import { PartyManager } from "../managers/PartyManager";
import { EngineMode } from "../enums/engine/EngineMode";
import { EngineState } from "../enums/engine/EngineState";
import { VideoPlayer } from "../VideoPlayer";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { ModuleObject } from "../module";

/* @file
 * The IngameControls class.
 */

export class IngameControls {
  camera: THREE.Camera;
  element: HTMLElement;
  editor: any;
  camSpeed: number;
  maxCamSpeed: number;
  camRampSpeed: number;
  AxisFront: THREE.Vector3;
  gamePad: GamePad;
  keys: any;
  camDir: number;
  plMoveEvent: (e: any) => void;

  constructor(camera: THREE.Camera, element: HTMLElement, editor: any){

    this.camera = camera;
    this.element = element;
    this.editor = editor;

    this.camSpeed = 0;
    this.maxCamSpeed = 2.5;
    this.camRampSpeed = 10;

    this.AxisFront = new THREE.Vector3(0.0, 1.0, 0.0);

    this.gamePad = new GamePad();

    this.InitKeys();

    this.element.requestPointerLock = this.element.requestPointerLock;

    // Ask the browser to release the pointer
    document.exitPointerLock = document.exitPointerLock;
    document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);

    window.addEventListener('keydown', (event) => {
      if(event.which >= 48 && event.which <= 57){
        this.keys[event.key.toLowerCase()].down = this.keys[event.key.toLowerCase()].pressed = true;
      }else if(event.which >= 65 && event.which <= 90){
        this.keys[event.key.toLowerCase()].down = this.keys[event.key.toLowerCase()].pressed = true;
      }else {
        if ( event.which == 32 )
          this.keys['space'].down = this.keys['space'].pressed = true;
        if ( event.which == 16 )
          this.keys['shift'].down = this.keys['shift'].pressed = true;
        if ( event.which == 27 )
          this.keys['escape'].down = this.keys['escape'].pressed = true;
        if ( event.which == 17 )
          this.keys['ctrl'].down = this.keys['ctrl'].pressed = true;
        if ( event.which == 107 )
          this.keys['num-plus'].down = this.keys['num-plus'].pressed = true;
        if ( event.which == 109 )
          this.keys['num-minus'].down = this.keys['num-minus'].pressed = true;
        if ( event.which == 9 )
          this.keys['tab'].down = this.keys['tab'].pressed = true;
      }
      

      if(GameState.activeGUIElement instanceof GUIControl){
        if(typeof GameState.activeGUIElement.onKeyDown === 'function'){
          GameState.activeGUIElement.onKeyDown(event);
        }
      }
    });

    
    window.addEventListener('keyup', (event) => {
      if(GameState.debug.controls)
        console.log(event.key)

      
      if(VideoPlayer.Sessions.length){
        if( (this.keys['escape'].pressed || this.keys['space'].pressed || this.gamePad.button_start.pressed) ){
          let player = VideoPlayer.Sessions[0];
          player.stop();
        }
      }

      if(event.which >= 48 && event.which <= 57){
        this.keys[event.key.toLowerCase()].down = this.keys[event.key.toLowerCase()].pressed = false;
      }else if(event.which >= 65 && event.which <= 90){
        this.keys[event.key.toLowerCase()].down = this.keys[event.key.toLowerCase()].pressed = false;
      }else {
        if ( event.which == 32 )
          this.keys['space'].down = this.keys['space'].pressed = false;
        if ( event.which == 16 )
          this.keys['shift'].down = this.keys['shift'].pressed = false;
        if ( event.which == 27 )
          this.keys['escape'].down = this.keys['escape'].pressed = false;
        if ( event.which == 17 )
          this.keys['ctrl'].down = this.keys['ctrl'].pressed = false;
        if ( event.which == 107 )
          this.keys['num-plus'].down = this.keys['num-plus'].pressed = false;
        if ( event.which == 109 )
          this.keys['num-minus'].down = this.keys['num-minus'].pressed = false;
        if ( event.which == 9 )
        this.keys['tab'].down = this.keys['tab'].pressed = false;
      }

      if( (GameState.Mode == EngineMode.INGAME) && !this.keys['w'].down && !this.keys['s'].down && !GameState.autoRun){
        let followee = PartyManager.party[0];
        if(followee.canMove()){
          followee.animState = ModuleCreatureAnimState.IDLE;
        }
      }

      if(GameState.activeGUIElement instanceof GUIControl){
        if(typeof GameState.activeGUIElement.onKeyUp === 'function'){
          GameState.activeGUIElement.onKeyUp(event);
        }
      }
    });

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

      GameState.raycaster.setFromCamera( GameState.mouse.clone(), GameState.camera_gui );
      
      let clickCaptured = false;

      let customEvent = GUIControl.generateEventObject();

      Mouse.downItem = null;
      Mouse.clickItem = null;
      //GameState.selected = undefined;

      

      let uiControls = this.MenuGetActiveUIElements();
      for(let i = 0; i < uiControls.length; i++){
        if(!customEvent.propagate)
          break;
        
        let control = uiControls[i];
        //if(control === Mouse.clickItem){
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
        //}
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
                }catch(e){

                }
              }
            }
          }
        }

        let selectedObject = clickCaptured;
  
        if(!clickCaptured && !GameState.inDialog){
          if(GameState.Mode == EngineMode.INGAME && MenuManager.GetCurrentMenu() == MenuManager.InGameOverlay){
            GameState.onMouseHitInteractive( (obj: any, obj2: any) => {
              if(GameState.debug.selectedObject)
                console.log('Mesh', obj2)
              if(obj.moduleObject instanceof ModuleObject){
                if(obj.moduleObject.isUseable() && obj.moduleObject != GameState.getCurrentPlayer()){

                  selectedObject = true;

                  let distance = GameState.getCurrentPlayer().position.distanceTo(obj.position);
                  let distanceThreshold = 20;

                  if(GameState.selectedObject == obj.moduleObject && distance <= distanceThreshold){
                    if(typeof obj.moduleObject.onClick === 'function'){
                      GameState.getCurrentPlayer().clearAllActions();
                      obj.moduleObject.onClick(GameState.getCurrentPlayer());
                    }else{
                      let distance = GameState.getCurrentPlayer().position.distanceTo(obj.position);
                      //console.log(distance);
                      if(distance > 1.5){
                        GameState.getCurrentPlayer().clearAllActions();
                        obj.moduleObject.clearAllActions();
                        GameState.getCurrentPlayer().actionDialogObject(obj.moduleObject);
                      }
                    }
                  }

                  GameState.setReticleSelectedObject(obj.moduleObject);
                  
                }
                if(GameState.debug.selectedObject)
                  console.log('Ingame Object', obj);
              }else{
                if(GameState.debug.selectedObject)
                  console.log('Object', obj);
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
      if(e.deltaY > 0){
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

  InitKeys(){
    this.keys = {
      'a': {down: false, pressed: false},
      'b': {down: false, pressed: false},
      'c': {down: false, pressed: false},
      'd': {down: false, pressed: false},
      'e': {down: false, pressed: false},
      'f': {down: false, pressed: false},
      'g': {down: false, pressed: false},
      'h': {down: false, pressed: false},
      'i': {down: false, pressed: false},
      'j': {down: false, pressed: false},
      'k': {down: false, pressed: false},
      'l': {down: false, pressed: false},
      'm': {down: false, pressed: false},
      'n': {down: false, pressed: false},
      'o': {down: false, pressed: false},
      'p': {down: false, pressed: false},
      'q': {down: false, pressed: false},
      'r': {down: false, pressed: false},
      's': {down: false, pressed: false},
      't': {down: false, pressed: false},
      'u': {down: false, pressed: false},
      'v': {down: false, pressed: false},
      'w': {down: false, pressed: false},
      'x': {down: false, pressed: false},
      'y': {down: false, pressed: false},
      'z': {down: false, pressed: false},
      'space': {down: false, pressed: false},
      'shift': {down: false, pressed: false},
      'ctrl':  {down: false, pressed: false},
      'escape':  {down: false, pressed: false},
      'num-plus':  {down: false, pressed: false},
      'num-minus':  {down: false, pressed: false},
      'tab':  {down: false, pressed: false},
      '0': {down: false, pressed: false},
      '1': {down: false, pressed: false},
      '2': {down: false, pressed: false},
      '3': {down: false, pressed: false},
      '4': {down: false, pressed: false},
      '5': {down: false, pressed: false},
      '6': {down: false, pressed: false},
      '7': {down: false, pressed: false},
      '8': {down: false, pressed: false},
      '9': {down: false, pressed: false},
    };
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

    let gp = undefined;
    if(GamePad.CurrentGamePad instanceof Gamepad){
      gp = navigator.getGamepads()[GamePad.CurrentGamePad.index];
      this.gamePad.setGamePad(gp);
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

    /*if(GameState.activeGUIElement instanceof GUIControl){
      if(this.gamePad.button_d_up.pressed){
        GameState.activeGUIElement.directionalNavigate('up');
      }else if(this.gamePad.button_d_down.pressed){
        GameState.activeGUIElement.directionalNavigate('down');
      }else if(this.gamePad.button_d_left.pressed){
        GameState.activeGUIElement.directionalNavigate('left');
      }else if(this.gamePad.button_d_right.pressed){
        GameState.activeGUIElement.directionalNavigate('right');
      }
    }*/
    if(GameState.Mode == EngineMode.MINIGAME || GameState.Mode == EngineMode.INGAME){
      if(GameState.inDialog){
        if(MenuManager.InGameDialog.bVisible){

          if(MenuManager.InGameDialog.state == 1){
            if(this.keys['1'].pressed){
              if(GameState.debug.controls)
                console.log('Tried to press 1');
              try{ MenuManager.InGameDialog.LB_REPLIES.children[0].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['2'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[1].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['3'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[2].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['4'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[3].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['5'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[4].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['6'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[5].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['7'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[6].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['8'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[7].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['9'].pressed){
              try{ MenuManager.InGameDialog.LB_REPLIES.children[8].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }
          }else{
            if(this.keys['space'].pressed || this.gamePad.button_a.pressed){
              if(MenuManager.InGameDialog.isListening){
                MenuManager.InGameDialog.PlayerSkipEntry(MenuManager.InGameDialog.currentEntry);
              }
            }else if(Mouse.leftClick){
              if(MenuManager.InGameDialog.isListening){
                MenuManager.InGameDialog.PlayerSkipEntry(MenuManager.InGameDialog.currentEntry);
              }
            }
          }

          if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
            MenuManager.InGameDialog.EndConversation(true);
          }

        }else if(MenuManager.InGameComputer.bVisible){

          if(MenuManager.InGameComputer.state == 1){
            if(this.keys['1'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[0].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['2'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[1].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['3'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[2].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['4'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[3].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['5'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[4].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['6'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[5].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['7'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[6].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['8'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[7].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['9'].pressed){
              try{ MenuManager.InGameComputer.LB_REPLIES.children[8].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }
          }else{

          }

          if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
            MenuManager.InGameComputer.EndConversation(true);
          }

        }else if(MenuManager.InGameComputerCam.bVisible){
          if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
            MenuManager.InGameComputerCam.Close();
          }else if( this.keys['space'].pressed || this.gamePad.button_a.pressed ){
            MenuManager.InGameComputerCam.Close();
          }
        }

      }else{

        if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
          if(currentMenu != MenuManager.InGameOverlay){
            currentMenu.Close();
          }else{
            MenuManager.MenuOptions.Open();
          }
        }

        if( (this.keys['tab'].pressed || this.gamePad.button_back.pressed) && (GameState.Mode == EngineMode.INGAME)){
          if(!GameState.MenuActive){
            PartyManager.ShiftLeader();
            //PartyManager.party.push(PartyManager.party.shift());
          }
        }
    
        if(this.keys['space'].pressed && !GameState.MenuActive && (GameState.Mode == EngineMode.INGAME || GameState.Mode == EngineMode.MINIGAME) && currentMenu == MenuManager.InGameOverlay){
          GameState.State = ( GameState.State == EngineState.PAUSED ? EngineState.RUNNING : EngineState.PAUSED );
        }else if( (this.keys['space'].pressed || this.gamePad.button_a.pressed) && currentMenu == MenuManager.InGameConfirm){
          MenuManager.InGameConfirm.Close();
        }

        if(this.keys['z'].pressed || this.gamePad.button_y.pressed){
          GameState.getCurrentPlayer().flourish();
        }
      }
    }

    //Set all pressed keys to false so they can only be triggered on this frame 
    //May need to move this to the end of the Game Loop
    for (let key in this.keys) {
      this.keys[key].pressed = false;
    }

    Mouse.leftClick = false;

    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;
  }

  UpdatePlayerControls(delta: number = 0){
    let gp = undefined;
    if(GamePad.CurrentGamePad instanceof Gamepad){
      gp = navigator.getGamepads()[GamePad.CurrentGamePad.index];
    }
    let currentMenu = MenuManager.GetCurrentMenu();
    let turningCamera = false;
    if(GameState.State == EngineState.RUNNING){

      if(!GameState.inDialog && currentMenu != MenuManager.InGameConfirm && currentMenu != MenuManager.MenuContainer){

        let followee = PartyManager.party[0];

        if(followee.canMove()){

          if( this.gamePad.stick_l_x.value || this.gamePad.stick_l_y.value ){
            followee.clearAllActions(true);
            followee.force = 1;
            followee.setFacing( Utility.NormalizeRadian( Math.atan2(-this.gamePad.stick_l_x.value, -this.gamePad.stick_l_y.value) + GameState.followerCamera.userData.facing + Math.PI/2 ) , false);
            followee.controlled = true;
            GameState.scene_cursor_holder.visible = false;
          }else{
            if((this.keys['w'].down || GameState.autoRun ) && !followee.isDead()){
              followee.clearAllActions(true);
              followee.force = 1;
              followee.setFacing(Utility.NormalizeRadian(GameState.followerCamera.userData.facing + Math.PI/2));
              followee.controlled = true;
              GameState.scene_cursor_holder.visible = true;
            }else if( this.keys['s'].down && !followee.isDead()){
              followee.clearAllActions(true);
              followee.force = 1;
              followee.setFacing(Utility.NormalizeRadian(GameState.followerCamera.userData.facing - Math.PI/2));
              followee.controlled = true;
              GameState.scene_cursor_holder.visible = true;
            }else{
              followee.force = 0;
            }

            if( (this.keys['s'].down || this.keys['w'].down) && !followee.isDead()){
              followee.animState = ModuleCreatureAnimState.RUNNING;
              GameState.scene_cursor_holder.visible = true;
            }
          }

          if(this.keys['num-minus'].down && !this.keys['shift'].down && !this.keys['ctrl'].down && !followee.isDead()){
            followee.position.z -= 5 * delta;
          }

          if(this.keys['num-plus'].down && !this.keys['shift'].down && !this.keys['ctrl'].down && !followee.isDead()){
            followee.position.z += 5 * delta;
          }

        }

        if((this.keys['a'].down || this.gamePad.stick_r_x.value < 0) && !GameState.MenuActive){
          turningCamera = true;
          if(this.gamePad.stick_r_x.value){
            GameState.scene_cursor_holder.visible = false;
            this.camDir = -this.gamePad.stick_r_x.value;
          }else{
            this.camDir = 1;
            GameState.scene_cursor_holder.visible = true;
          }
        }
    
        if((this.keys['d'].down || this.gamePad.stick_r_x.value > 0) && !GameState.MenuActive){
          turningCamera = true;
          if(this.gamePad.stick_r_x.value){
            GameState.scene_cursor_holder.visible = false;
            this.camDir = -this.gamePad.stick_r_x.value;
          }else{
            this.camDir = -1;
            GameState.scene_cursor_holder.visible = true;
          }
        }

      }
      
      if(currentMenu == MenuManager.InGameConfirm){
        if(this.keys['space'].down || this.gamePad.button_a.pressed){
          MenuManager.InGameConfirm.Close();
        }
      }

    }else if(GameState.State == EngineState.PAUSED && !GameState.MenuActive && (GameState.Mode == EngineMode.INGAME || GameState.Mode == EngineMode.MINIGAME)){
      if((this.keys['a'].down || this.gamePad.stick_r_x.value < 0) && !GameState.MenuActive){
        turningCamera = true;
        if(this.gamePad.stick_r_x.value){
          this.camDir = -this.gamePad.stick_r_x.value;
        }else{
          this.camDir = 1;
        }
      }
  
      if((this.keys['d'].down || this.gamePad.stick_r_x.value > 0) && !GameState.MenuActive){
        turningCamera = true;
        if(this.gamePad.stick_r_x.value){
          this.camDir = -this.gamePad.stick_r_x.value;
        }else{
          this.camDir = -1;
        }
      }
    }

    

    if(this.keys['num-minus'].pressed && this.keys['shift'].down && !this.keys['ctrl'].down){
      GameState.rendererUpscaleFactor -= 0.25;
      if(GameState.rendererUpscaleFactor <= 0.25) GameState.rendererUpscaleFactor = 0.25;
      // @ts-expect-error
      GameState.updateRendererUpscaleFactor();
    }

    if(this.keys['0'].pressed && this.keys['shift'].down && !this.keys['ctrl'].down){
      GameState.rendererUpscaleFactor = 1.0;
      // @ts-expect-error
      GameState.updateRendererUpscaleFactor();
    }

    if(this.keys['num-plus'].pressed && this.keys['shift'].down && !this.keys['ctrl'].down){
      GameState.rendererUpscaleFactor += 0.25;
      if(GameState.rendererUpscaleFactor >= 4) GameState.rendererUpscaleFactor = 4;
      // @ts-expect-error
      GameState.updateRendererUpscaleFactor();
    }

    if(turningCamera && this.camSpeed < this.maxCamSpeed){
      this.camSpeed += this.camRampSpeed * delta;

      if(this.camSpeed > this.maxCamSpeed)
        this.camSpeed = this.maxCamSpeed;
    }else if(this.camSpeed > 0){
      this.camSpeed -= this.camRampSpeed * delta;

      if(this.camSpeed < 0)
        this.camSpeed = 0;
    }

    if(this.camSpeed > 0){
      GameState.followerCamera.userData.facing = (Utility.NormalizeRadian(GameState.followerCamera.userData.facing + (this.camSpeed * this.camDir) * delta))
    }

  }

  UpdateMiniGameControls(delta: number = 0){
    switch(GameState.module.area.MiniGame.Type){
      case 1: //SWOOPRACE
        if(Mouse.leftClick){
          GameState.module.area.MiniGame.Player.fire();
        }
        if(this.keys['a'].down && !GameState.MenuActive){
          GameState.module.area.MiniGame.Player.lateralForce = -GameState.module.area.MiniGame.Player.accel_lateral_secs;
        }else if(this.keys['d'].down && !GameState.MenuActive){
          GameState.module.area.MiniGame.Player.lateralForce = GameState.module.area.MiniGame.Player.accel_lateral_secs;
        }else {
          GameState.module.area.MiniGame.Player.lateralForce = 0;
        }

        if(this.keys['space'].pressed){
          //GameState.module.area.MiniGame.Player.jump();
        }

      break;
      case 2: //TURRET

        if(Mouse.leftClick || Mouse.MouseDown){
          GameState.module.area.MiniGame.Player.fire();
        }

        if(this.keys['a'].down && !GameState.MenuActive){
          GameState.module.area.MiniGame.Player.rotate('z', 1 * delta);
        }
    
        if(this.keys['d'].down && !GameState.MenuActive){
          GameState.module.area.MiniGame.Player.rotate('z', -1 * delta);
        }

        if(this.keys['w'].down && !GameState.MenuActive){
          GameState.module.area.MiniGame.Player.rotate('x', 1 * delta);
        }
    
        if(this.keys['s'].down && !GameState.MenuActive){
          GameState.module.area.MiniGame.Player.rotate('x', -1 * delta);
        }

      break;
    }
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
