/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The IngameControls class.
 */

class IngameControls {

  constructor(camera, element, editor){

    this.camera = camera;
    this.element = element || document;
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

    $(window).keydown( ( event ) => {

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
      

      if(Game.activeGUIElement instanceof GUIControl){
        if(typeof Game.activeGUIElement.onKeyDown === 'function'){
          Game.activeGUIElement.onKeyDown(event);
        }
      }
    }).keyup( ( event ) => {
      if(Game.debug.controls)
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

      if( (Game.Mode == Game.MODES.INGAME) && !this.keys['w'].down && !this.keys['s'].down && !Game.autoRun){
        let followee = PartyManager.party[0];
        if(followee.canMove()){
          followee.animState = ModuleCreature.AnimState.IDLE;
        }
      }

      if(Game.activeGUIElement instanceof GUIControl){
        if(typeof Game.activeGUIElement.onKeyUp === 'function'){
          Game.activeGUIElement.onKeyUp(event);
        }
      }

    }).mousedown((event) => {
      if(event.target == this.element){
        Game.activeGUIElement = undefined;
        if(Game.debug.controls)
          console.log('Valid Mouse Target');
        Mouse.ButtonState = event.which;
        Mouse.MouseDown = true;
        let parentOffset = this.editor.$canvas.offset();
        Mouse.MouseDownX = event.pageX - parentOffset.left;
        Mouse.MouseDownY = event.pageY - parentOffset.top;

        if(Mouse.ButtonState == Mouse.State.LEFT){

        }else{
          // Ask the browser to lock the pointer
          this.element.requestPointerLock();
        }
      }else{
        //console.log('Invalid Mouse Target', this.element);
      }

      if(Game.debug.controls)
        console.log('DOWN');

      Game.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      Game.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

      Game.raycaster.setFromCamera( Game.mouse.clone(), Game.camera_gui );
      
      let clickCaptured = false;

      let customEvent = GUIControl.generateEventObject();

      Game.mouse.downItem = null;
      Game.mouse.clickItem = null;
      //Game.selected = undefined;

      

      let uiControls = this.MenuGetActiveUIElements();
      for(let i = 0; i < uiControls.length; i++){
        if(!customEvent.propagate)
          break;
        
        let control = uiControls[i];
        //if(control === Game.mouse.clickItem){
          if(!(control.widget.parent instanceof THREE.Scene) && control.widget.visible){
            clickCaptured = true;
            if(Game.debug.controls)
              console.log('uiControls', control)
            try{
              if(control.processEventListener('mouseDown', [customEvent])){
                Game.mouse.downItem = control;
                customEvent.propagate = false;
                //control.onMouseDown(customEvent);
              }

              if(control.eventListeners['click'].length){
                Game.mouse.clickItem = control;
                customEvent.propagate = false;
              }
              
              //Game.guiAudioEmitter.PlaySound('gui_click');
              if(Game.debug.controls)
                console.log('MouseDown', control, Game.mouse.downItem, Game.mouse.clickItem, typeof control.onMouseClick);
            }catch(e){

            }
          }
        //}
      }
      Game.mouse.leftDown = true;

    }).mousemove((event) => {
      Game.scene_cursor_holder.visible = true;

      Game.mouse.x = Mouse.Vector.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      Game.mouse.y = Mouse.Vector.y = - ( event.clientY / window.innerHeight ) * 2 + 1; 
      Game.mouseUI.x = Mouse.Vector.x = ( event.clientX - (window.innerWidth/2) );
      Game.mouseUI.y = Mouse.Vector.y = - ( event.clientY -(window.innerHeight/2) ); 
      Mouse.Client.x = event.clientX;
      Mouse.Client.y = event.clientY;

      //onMouseMove events HERE
      //console.log('move', Game.mouse.downItem, Game.mouse.leftDown);
      if(Game.mouse.downItem && Game.mouse.leftDown){
        if((Game.mouse.downItem instanceof GUIControl)){
          //if(typeof Game.mouse.downItem.widget.parent !== 'undefined'){
            if(!(Game.mouse.downItem.widget.parent instanceof THREE.Scene)){
              Game.mouse.downItem.processEventListener('mouseMove', [])
              /*if(typeof Game.mouse.downItem.onMouseMove === 'function'){
                //console.log('Dragging');
                Game.mouse.downItem.onMouseMove();
              }*/
            }
          //}
        }
      }

      let parentOffset = this.editor.$canvas.offset();
      Mouse.MouseX = event.pageX - parentOffset.left;
      Mouse.MouseY = event.pageY - parentOffset.top;
      //Mouse.Vector.x = ( (Mouse.MouseX) / this.editor.$canvas.width() ) * 2 - 1;
      //Mouse.Vector.y = - ( (Mouse.MouseY) / this.editor.$canvas.height() ) * 2 + 1;

      if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == Mouse.State.RIGHT){
        Mouse.Dragging = true;
      }else if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == Mouse.State.LEFT){
        Mouse.Dragging = true;
      }

    }).mouseup((event) => {
      Mouse.MouseDown = false;
      Mouse.Dragging = false;
      Mouse.ButtonState = Mouse.State.NONE;

      Game.mouse.leftClick = true;

      // Ask the browser to release the pointer
      document.exitPointerLock();

      //event.preventDefault();
      if(Game.debug.controls)
        console.log('UP');

      if(Game.mouse.leftDown){
        Game.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        Game.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        //If the NoClickTimer is active then we will return out of this function
        if(Game.noClickTimer){
          return;
        }
  
        Game.raycaster.setFromCamera( Mouse.Vector, Game.camera_gui );
        
        let clickCaptured = false;

        let customEvent = GUIControl.generateEventObject();
  
        //Game.selected = undefined;

        //Try to fire mouse up regardless if mouse is still inside object
        if((Game.mouse.downItem instanceof GUIControl)){
          //if(typeof Game.mouse.downItem.widget.parent !== 'undefined'){
            if(!(Game.mouse.downItem.widget.parent instanceof THREE.Scene)){
              try{
                Game.mouse.downItem.processEventListener('mouseUp', [customEvent]);
                //Game.mouse.downItem.onMouseUp(customEvent);
                //Game.guiAudioEmitter.PlaySound('gui_click');
                if(Game.debug.controls)
                  console.log('MouseUp', Game.mouse.downItem, Game.mouse.downItem.name);
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
          if(control === Game.mouse.clickItem){
            if(typeof control.widget.parent !== 'undefined'){
              if(!(control.widget.parent instanceof THREE.Scene) && control.widget.visible){
                clickCaptured = true;
                try{
                  Game.mouse.clickItem = null;
                  //control.onClick(customEvent);
                  Game.activeGUIElement = control;
                  control.processEventListener('click', [customEvent]);
                  Game.guiAudioEmitter.PlaySound('gui_click');
                  if(Game.debug.controls)
                    console.log('MouseClick', control, control.name);
                }catch(e){

                }
              }
            }
          }
        }

        let selectedObject = clickCaptured;
  
        if(!clickCaptured && !Game.inDialog){
          if(Game.Mode == Game.MODES.INGAME && MenuManager.GetCurrentMenu() == Game.InGameOverlay){
            Game.onMouseHitInteractive( (obj, obj2) => {
              if(Game.debug.selectedObject)
                console.log('Mesh', obj2)
              if(obj.moduleObject instanceof ModuleObject){
                if(obj.moduleObject.isUseable() && obj.moduleObject != Game.getCurrentPlayer()){

                  selectedObject = true;

                  let distance = Game.getCurrentPlayer().position.distanceTo(obj.position);
                  let distanceThreshold = 20;

                  if(Game.selectedObject == obj.moduleObject && distance <= distanceThreshold){
                    if(typeof obj.moduleObject.onClick === 'function'){
                      Game.getCurrentPlayer().clearAllActions();
                      obj.moduleObject.onClick(Game.getCurrentPlayer());
                    }else{
                      let distance = Game.getCurrentPlayer().position.distanceTo(obj.position);
                      //console.log(distance);
                      if(distance > 1.5){
                        Game.getCurrentPlayer().clearAllActions();
                        obj.moduleObject.clearAllActions();
                        Game.getCurrentPlayer().actionDialogObject(obj.moduleObject);
                      }
                    }
                  }

                  Game.setReticleSelectedObject(obj.moduleObject);
                  
                }
                if(Game.debug.selectedObject)
                  console.log('Ingame Object', obj);
              }else{
                if(Game.debug.selectedObject)
                  console.log('Object', obj);
              }
            });
            if(!selectedObject){
              Game.hovered = Game.hoveredObject = Game.selected = Game.selectedObject = undefined;
            }
          }
        }

        

      }
      Game.mouse.downItem = undefined;
      Game.mouse.clickItem = undefined;
      Game.mouse.leftDown = false;


    });

    $('body').bind('mousewheel', function(e){
      if(e.originalEvent.wheelDelta > 0){
        if(Game.hoveredGUIElement instanceof GUIListBox){
          Game.hoveredGUIElement.scrollUp();
        }else if(Game.hoveredGUIElement instanceof GUIScrollBar){
          Game.hoveredGUIElement.list.scrollUp();
        }
      }else{
        if(Game.hoveredGUIElement instanceof GUIListBox){
          Game.hoveredGUIElement.scrollDown();
        }else if(Game.hoveredGUIElement instanceof GUIScrollBar){
          Game.hoveredGUIElement.list.scrollDown();
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
    let elements = [];

    for(let i = 0; i < Game.scene_gui.children.length; i++){
      if(Game.scene_gui.children[i].control){
        elements = elements.concat(Game.scene_gui.children[i].control.menu.GetActiveControls());
      }
    }

    return elements.reverse();
  }

  Update(delta){

    let xoffset = 0;
    let yoffset = 0;
    let currentMenu = MenuManager.GetCurrentMenu();

    let gp = undefined;
    if(currentGamepad instanceof Gamepad){
      gp = navigator.getGamepads()[currentGamepad.index];
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

    /*if(Game.activeGUIElement instanceof GUIControl){
      if(this.gamePad.button_d_up.pressed){
        Game.activeGUIElement.directionalNavigate('up');
      }else if(this.gamePad.button_d_down.pressed){
        Game.activeGUIElement.directionalNavigate('down');
      }else if(this.gamePad.button_d_left.pressed){
        Game.activeGUIElement.directionalNavigate('left');
      }else if(this.gamePad.button_d_right.pressed){
        Game.activeGUIElement.directionalNavigate('right');
      }
    }*/
    if(Game.Mode == Game.MODES.MINIGAME || Game.Mode == Game.MODES.INGAME){
      if(Game.inDialog){
        if(Game.InGameDialog.bVisible){

          if(Game.InGameDialog.state == 1){
            if(this.keys['1'].pressed){
              if(Game.debug.controls)
                console.log('Tried to press 1');
              try{ Game.InGameDialog.LB_REPLIES.children[0].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['2'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[1].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['3'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[2].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['4'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[3].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['5'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[4].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['6'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[5].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['7'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[6].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['8'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[7].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }else if(this.keys['9'].pressed){
              try{ Game.InGameDialog.LB_REPLIES.children[8].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){}
            }
          }else{
            if(this.keys['space'].pressed || this.gamePad.button_a.pressed){
              if(Game.InGameDialog.isListening){
                Game.InGameDialog.PlayerSkipEntry(Game.InGameDialog.currentEntry);
              }
            }else if(Game.mouse.leftClick){
              if(Game.InGameDialog.isListening){
                Game.InGameDialog.PlayerSkipEntry(Game.InGameDialog.currentEntry);
              }
            }
          }

          if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
            Game.InGameDialog.EndConversation(true);
          }

        }else if(Game.InGameComputer.bVisible){

          if(Game.InGameComputer.state == 1){
            if(this.keys['1'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[0].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['2'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[1].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['3'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[2].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['4'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[3].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['5'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[4].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['6'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[5].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['7'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[6].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['8'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[7].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }else if(this.keys['9'].pressed){
              try{ Game.InGameComputer.LB_REPLIES.children[8].processEventListener('click', [{stopPropagation: () => {}}]); }catch(e){ console.error(e); }
            }
          }else{

          }

          if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
            Game.InGameComputer.EndConversation(true);
          }

        }else if(Game.InGameComputerCam.bVisible){
          if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
            Game.InGameComputerCam.Close();
          }else if( this.keys['space'].pressed || this.gamePad.button_a.pressed ){
            Game.InGameComputerCam.Close();
          }
        }

      }else{

        if( (this.keys['escape'].pressed || this.gamePad.button_start.pressed) ){
          if(currentMenu != Game.InGameOverlay){
            currentMenu.Close();
          }else{
            Game.MenuOptions.Open();
          }
        }

        if( (this.keys['tab'].pressed || this.gamePad.button_back.pressed) && (Game.Mode == Game.MODES.INGAME)){
          if(!Game.MenuActive){
            PartyManager.ShiftLeader();
            //PartyManager.party.push(PartyManager.party.shift());
          }
        }
    
        if(this.keys['space'].pressed && !Game.MenuActive && (Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME) && currentMenu == Game.InGameOverlay){
          Game.State = ( Game.State == Game.STATES.PAUSED ? Game.STATES.RUNNING : Game.STATES.PAUSED );
        }else if( (this.keys['space'].pressed || this.gamePad.button_a.pressed) && currentMenu == Game.InGameConfirm){
          Game.InGameConfirm.Close();
        }

        if(this.keys['z'].pressed || this.gamePad.button_y.pressed){
          Game.getCurrentPlayer().flourish();
        }
      }
    }

    //Set all pressed keys to false so they can only be triggered on this frame 
    //May need to move this to the end of the Game Loop
    for (let key in this.keys) {
      this.keys[key].pressed = false;
    }

    Game.mouse.leftClick = false;

    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;
  }

  UpdatePlayerControls(delta){
    let gp = undefined;
    if(currentGamepad instanceof Gamepad){
      gp = navigator.getGamepads()[currentGamepad.index];
    }
    let currentMenu = MenuManager.GetCurrentMenu();
    let turningCamera = false;
    if(Game.State == Game.STATES.RUNNING){

      if(!Game.inDialog && currentMenu != Game.InGameConfirm && currentMenu != Game.MenuContainer){

        let followee = PartyManager.party[0];

        if(followee.canMove()){

          if( this.gamePad.stick_l_x.value || this.gamePad.stick_l_y.value ){
            followee.clearAllActions(true);
            followee.force = 1;
            followee.setFacing( Utility.NormalizeRadian( Math.atan2(-this.gamePad.stick_l_x.value, -this.gamePad.stick_l_y.value) + Game.followerCamera.facing + Math.PI/2 ) , false);
            followee.controlled = true;
            Game.scene_cursor_holder.visible = false;
          }else{
            if((this.keys['w'].down || Game.autoRun ) && !followee.isDead()){
              followee.clearAllActions(true);
              followee.force = 1;
              followee.setFacing(Utility.NormalizeRadian(Game.followerCamera.facing + Math.PI/2));
              followee.controlled = true;
              Game.scene_cursor_holder.visible = true;
            }else if( this.keys['s'].down && !followee.isDead()){
              followee.clearAllActions(true);
              followee.force = 1;
              followee.setFacing(Utility.NormalizeRadian(Game.followerCamera.facing - Math.PI/2));
              followee.controlled = true;
              Game.scene_cursor_holder.visible = true;
            }else{
              followee.force = 0;
            }

            if( (this.keys['s'].down || this.keys['w'].down) && !followee.isDead()){
              followee.animState = ModuleCreature.AnimState.RUNNING;
              Game.scene_cursor_holder.visible = true;
            }
          }

          if(this.keys['num-minus'].down && !followee.isDead()){
            followee.position.z -= 5 * delta;
          }

          if(this.keys['num-plus'].down && !followee.isDead()){
            followee.position.z += 5 * delta;
          }

        }

        if((this.keys['a'].down || this.gamePad.stick_r_x.value < 0) && !Game.MenuActive){
          turningCamera = true;
          if(this.gamePad.stick_r_x.value){
            Game.scene_cursor_holder.visible = false;
            this.camDir = -this.gamePad.stick_r_x.value;
          }else{
            this.camDir = 1;
            Game.scene_cursor_holder.visible = true;
          }
        }
    
        if((this.keys['d'].down || this.gamePad.stick_r_x.value > 0) && !Game.MenuActive){
          turningCamera = true;
          if(this.gamePad.stick_r_x.value){
            Game.scene_cursor_holder.visible = false;
            this.camDir = -this.gamePad.stick_r_x.value;
          }else{
            this.camDir = -1;
            Game.scene_cursor_holder.visible = true;
          }
        }

      }
      
      if(currentMenu == Game.InGameConfirm){
        if(this.keys['space'].down || this.gamePad.button_a.pressed){
          Game.InGameConfirm.Close();
        }
      }

    }else if(Game.State == Game.STATES.PAUSED && !Game.MenuActive && (Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME)){
      if((this.keys['a'].down || this.gamePad.stick_r_x.value < 0) && !Game.MenuActive){
        turningCamera = true;
        if(this.gamePad.stick_r_x.value){
          this.camDir = -this.gamePad.stick_r_x.value;
        }else{
          this.camDir = 1;
        }
      }
  
      if((this.keys['d'].down || this.gamePad.stick_r_x.value > 0) && !Game.MenuActive){
        turningCamera = true;
        if(this.gamePad.stick_r_x.value){
          this.camDir = -this.gamePad.stick_r_x.value;
        }else{
          this.camDir = -1;
        }
      }
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
      Game.followerCamera.facing = (Utility.NormalizeRadian(Game.followerCamera.facing + (this.camSpeed * this.camDir) * delta))
    }

  }

  UpdateMiniGameControls(delta){
    switch(Game.module.area.MiniGame.Type){
      case 1: //SWOOPRACE
        if(Game.mouse.leftClick){
          Game.module.area.MiniGame.Player.fire();
        }
        if(this.keys['a'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.lateralForce = -Game.module.area.MiniGame.Player.accel_lateral_secs;
        }else if(this.keys['d'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.lateralForce = Game.module.area.MiniGame.Player.accel_lateral_secs;
        }else {
          Game.module.area.MiniGame.Player.lateralForce = 0;
        }

        if(this.keys['space'].pressed){
          //Game.module.area.MiniGame.Player.jump();
        }

      break;
      case 2: //TURRET

        if(Game.mouse.leftClick || Mouse.MouseDown){
          Game.module.area.MiniGame.Player.fire();
        }

        if(this.keys['a'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.rotate('z', 1 * delta);
        }
    
        if(this.keys['d'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.rotate('z', -1 * delta);
        }

        if(this.keys['w'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.rotate('x', 1 * delta);
        }
    
        if(this.keys['s'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.rotate('x', -1 * delta);
        }

      break;
    }
  }

  plChangeCallback(e){
    if(document.pointerLockElement === this.element) {
      this.element.addEventListener("mousemove", this.plMoveEvent = (e) => { this.plMouseMove(e); }, true);
      Mouse.Dragging = true;
    } else {
      //console.log('The pointer lock status is now unlocked');
      this.element.removeEventListener("mousemove", this.plMoveEvent, true);
      Mouse.Dragging = false;
    }
  }

  plMouseMove(event){

    Mouse.OffsetX = event.movementX || 0;
    Mouse.OffsetY = (event.movementY || 0)*-1.0;

    //console.log(Mouse.OffsetX, Mouse.OffsetY, Mouse.Dragging, event);
  }

}

class KeyInput {

  static RepeatThreshold = 0.5;

  constructor( label = 'N/A' ){
    //Input label
    this.label = label;
    //Stores the current down value
    this.down = false;
    //Stores the previous down value
    this.pDown = false;

    //This should only trigger once at the beginning of a button press event
    this.pressed = false;
    //the index of the button object on the gamepad's buttons array
    this.buttonIndex = -1;

    this.repeating = false;
    this.repeatTimer = 0;
    this.repeatPulseTimer = 0;
  }

  update(gamePad, delta = 0){
    this.pressed = false;
    this.repeating = false;
    this.pDown = this.down;
    if( gamePad instanceof Gamepad ){
      if( gamePad.buttons[this.buttonIndex] ){
        this.down = gamePad.buttons[this.buttonIndex].pressed;

        //If the key is pressed, but was previously not pressed then set the pressed value to true
        if( !this.pDown && this.down ){
          this.pressed = true;
        }

        if( this.down ){
          this.repeatTimer += delta;
          this.reapeatSpeed = Math.floor(this.repeatTimer / AnalogInput.RepeatThreshold) < 5 ? 1 : 2;
          if( this.repeatTimer >= KeyInput.RepeatThreshold ){
            if( !this.repeatPulseTimer ){
              this.pressed = true;
              this.repeating = true;
              this.repeatPulseTimer += delta;
            }else{
              this.repeatPulseTimer += delta;
              if( this.repeatPulseTimer >= (0.1 / this.reapeatSpeed) ){
                this.repeatPulseTimer = 0;
              }
            }
          }
        }else{
          this.repeatTimer = 0;
          this.repeatPulseTimer = 0;
        }
      }
    }
  }

}

class AnalogInput {

  static RepeatThreshold = 0.5;

  constructor( label = 'N/A', deadZone = 0.0, axes = false ){
    //Input label
    this.label = label;
    //Analog deadzone
    this.deadZone = Math.abs(deadZone);
    //Gamepad Axes or Button
    this.axes = axes ? true : false;
    //Gamepad Axes Index
    this.axesIndex = -1;
    //Gamepad Button Index
    this.buttonIndex = -1;
    //Input value
    this.value = 0.0;
    //This should only trigger once at the after the value crosses the pressThreshold
    this.pressed = false;

    this.pressThreshold = 0.50;
    this.pressThresholdActive = false;

    this.repeating = false;
    this.repeatTimer = 0;
    this.repeatPulseTimer = 0;
  }

  update(gamePad, delta = 0){
    this.pressed = false;
    this.repeating = false;
    if( gamePad instanceof Gamepad ){
      if( this.axes && gamePad.axes[this.axesIndex] ){
        this.value = gamePad.axes[this.axesIndex] * ( Math.max(0, Math.abs( gamePad.axes[this.axesIndex] ) - this.deadZone ) / ( 1 - this.deadZone ) );
      }else if( !this.axes && gamePad.buttons[this.buttonIndex] ){
        this.value = gamePad.buttons[this.buttonIndex].value * ( Math.max(0, Math.abs( gamePad.buttons[this.buttonIndex].value ) - this.deadZone ) / ( 1 - this.deadZone ) );
      }

      if( !this.pressed && Math.abs(this.value) >= this.pressThreshold ){
        if( !this.pressThresholdActive ){
          this.pressed = true;
          this.pressThresholdActive = true;
        }
      }

      if( Math.abs(this.value) < this.pressThreshold ){
        this.pressThresholdActive = false;
      }

      if( this.pressThresholdActive ){
        this.repeatTimer += delta;
        this.reapeatSpeed = Math.floor(this.repeatTimer / AnalogInput.RepeatThreshold) < 5 ? 1 : 2;
        if( this.repeatTimer >= AnalogInput.RepeatThreshold ){
          if( !this.repeatPulseTimer ){
            this.pressed = true;
            this.repeating = true;
            this.repeatPulseTimer += delta;
          }else{
            this.repeatPulseTimer += delta;
            if( this.repeatPulseTimer >= (0.1 / this.reapeatSpeed) ){
              this.repeatPulseTimer = 0;
            }
          }
        }
      }else{
        this.repeatTimer = 0;
        this.repeatPulseTimer = 0;
      }

    }
  }

}

class GamePad {

  button_a = new KeyInput('A');
  button_b = new KeyInput('B');
  button_x = new KeyInput('X');
  button_y = new KeyInput('Y');

  button_back = new KeyInput('BACK');
  button_start = new KeyInput('START');

  button_d_up = new KeyInput('D_UP');
  button_d_down = new KeyInput('D_DOWN');
  button_d_left = new KeyInput('D_LEFT');
  button_d_right = new KeyInput('D_RIGHT');

  button_bumper_l = new KeyInput('BUMPER_LEFT');
  button_bumper_r = new KeyInput('BUMPER_RIGHT');

  trigger_l = new AnalogInput('TRIGGER_LEFT', 0.0);
  trigger_r = new AnalogInput('TRIGGER_RIGHT', 0.0);

  stick_l_x = new AnalogInput('L_STICK_X', 0.1, true);
  stick_l_y = new AnalogInput('L_STICK_Y', 0.1, true);
  stick_l = new KeyInput('L_STICK');

  stick_r_x = new AnalogInput('R_STICK_X', 0.1, true);
  stick_r_y = new AnalogInput('R_STICK_Y', 0.1, true);
  stick_r = new KeyInput('R_STICK');

  constructor(){
    this.gamePad = undefined;
    this.controlsMapped = false;
    this.mapKeys();
  }

  setGamePad( gamePad = undefined ){
    this.gamePad = gamePad;
  }

  updateState(delta = 0){
    if(this.gamePad instanceof Gamepad){
      this.button_a.update(this.gamePad, delta);
      this.button_b.update(this.gamePad, delta);
      this.button_x.update(this.gamePad, delta);
      this.button_y.update(this.gamePad, delta);

      this.button_bumper_l.update(this.gamePad, delta);
      this.button_bumper_r.update(this.gamePad, delta);

      this.trigger_l.update(this.gamePad, delta);
      this.trigger_r.update(this.gamePad, delta);

      this.button_back.update(this.gamePad, delta);
      this.button_start.update(this.gamePad, delta);

      this.button_d_up.update(this.gamePad, delta);
      this.button_d_down.update(this.gamePad, delta);
      this.button_d_left.update(this.gamePad, delta);
      this.button_d_right.update(this.gamePad, delta);

      this.stick_l.update(this.gamePad, delta);
      this.stick_l_x.update(this.gamePad, delta);
      this.stick_l_y.update(this.gamePad, delta);
      
      this.stick_r.update(this.gamePad, delta);
      this.stick_r_x.update(this.gamePad, delta);
      this.stick_r_y.update(this.gamePad, delta);
    }
  }

  mapKeys(){
    //A B X Y | X O ◻ △
    this.button_a.buttonIndex = 0; //A | X == 0
    this.button_b.buttonIndex = 1; //B | O == 1
    this.button_x.buttonIndex = 2; //X | ◻ == 2
    this.button_y.buttonIndex = 3; //Y | △ == 3

    //Bumpers
    this.button_bumper_l.buttonIndex = 4; //bumper_l == 4
    this.button_bumper_r.buttonIndex = 5; //bumper_r == 5

    //Triggers
    this.trigger_l.buttonIndex = 6; //trigger_l == 6
    this.trigger_r.buttonIndex = 7; //trigger_r == 7

    //Start / Select
    this.button_back.buttonIndex = 8; //back == 8
    this.button_start.buttonIndex = 9; //start == 9

    //Left Stick
    this.stick_l.buttonIndex = 10; //stick_l == 10
    this.stick_l_x.axesIndex = 0;
    this.stick_l_y.axesIndex = 1;

    //Right Stick
    this.stick_r.buttonIndex = 11; //stick_r == 11
    this.stick_r_x.axesIndex = 2;
    this.stick_r_y.axesIndex = 3;

    //D Pad
    this.button_d_up.buttonIndex = 12; //d_up == 12
    this.button_d_down.buttonIndex = 13; //d_down == 13
    this.button_d_left.buttonIndex = 14; //d_left == 14
    this.button_d_right.buttonIndex = 15; //d_right == 15


    //16 //home_button
    //17 //dualshock4 trackpad button

    this.controlsMapped = true;
  }

  onDisconnected(){

  }

  onConnected(){

  }

}

module.exports = IngameControls;
