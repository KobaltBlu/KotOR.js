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

    this.AxisFront = new THREE.Vector3(0.0, 1.0, 0.0);

    this.InitKeys();

    this.element.requestPointerLock = this.element.requestPointerLock;

    // Ask the browser to release the pointer
    document.exitPointerLock = document.exitPointerLock;

    document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);

    this.editor.$canvas.keydown( ( event ) => {

      if(event.which >= 48 && event.which <= 57){
        this.keys[event.key].down = this.keys[event.key].pressed = true;
      }else if(event.which >= 65 && event.which <= 90){
        this.keys[event.key].down = this.keys[event.key].pressed = true;
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
      }
      

      if(Game.activeGUIElement instanceof GUIControl){
        if(typeof Game.activeGUIElement.onKeyDown === 'function'){
          Game.activeGUIElement.onKeyDown(event);
        }
      }
    }).keyup( ( event ) => {

      if(event.which >= 48 && event.which <= 57){
        console.log(event.key)
        this.keys[event.key].down = this.keys[event.key].pressed = false;
      }else if(event.which >= 65 && event.which <= 90){
        this.keys[event.key].down = this.keys[event.key].pressed = false;
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

      console.log('DOWN');

      Game.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      Game.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

      Game.raycaster.setFromCamera( Game.mouse.clone(), Game.camera_gui );
      
      let clickCaptured = false;

      var customEvent = {
        propagate: true,
        stopPropagation: function(){
          this.propagate = false;
        }
      }

      Game.mouse.downItem = null;
      Game.mouse.clickItem = null;
      //Game.selected = undefined;

      

      let uiControls =this.MenuGetActiveUIElements();
      for(let i = 0; i < uiControls.length; i++){
        if(!customEvent.propagate)
          break;
        
        let control = uiControls[i];
        //if(control === Game.mouse.clickItem){
          if(!(control.widget.parent instanceof THREE.Scene) && control.widget.visible){
            clickCaptured = true;
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
              console.log('MouseDown', control, Game.mouse.downItem, Game.mouse.clickItem, typeof control.onMouseClick);
            }catch(e){

            }
          }
        //}
      }
      Game.mouse.leftDown = true;

    }).mousemove((event) => {

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
      console.log('UP');
      if(Game.mouse.leftDown){
        Game.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        Game.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  
        Game.raycaster.setFromCamera( Mouse.Vector, Game.camera_gui );
        
        let clickCaptured = false;
  
        var customEvent = {
          propagate: true,
          stopPropagation: function(){
            this.propagate = false;
          }
        }
  
        //Game.selected = undefined;

        //Try to fire mouse up regardless if mouse is still inside object
        if((Game.mouse.downItem instanceof GUIControl)){
          //if(typeof Game.mouse.downItem.widget.parent !== 'undefined'){
            if(!(Game.mouse.downItem.widget.parent instanceof THREE.Scene)){
              try{
                Game.mouse.downItem.processEventListener('mouseUp', [customEvent]);
                //Game.mouse.downItem.onMouseUp(customEvent);
                //Game.guiAudioEmitter.PlaySound('gui_click');
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
                  control.processEventListener('click', [customEvent]);
                  //control.onClick(customEvent);
                  Game.activeGUIElement = control;
                  Game.guiAudioEmitter.PlaySound('gui_click');
                  console.log('MouseClick', control, control.name);
                }catch(e){

                }
              }
            }
          }
        }

        let selectedObject = clickCaptured;
  
        if(!clickCaptured && !Game.inDialog){
          if(Game.Mode == Game.MODES.INGAME){
            Game.onMouseHitInteractive( (obj, obj2) => {
              console.log('Mesh', obj2)
              if(obj.moduleObject instanceof ModuleObject){
                if(obj.moduleObject.isUseable() && obj.moduleObject != Game.getCurrentPlayer()){

                  selectedObject = true;

                  let distance = Game.getCurrentPlayer().position.distanceTo(obj.position);
                  let distanceThreshold = 10;

                  if(Game.selectedObject == obj.moduleObject && distance <= distanceThreshold){
                    if(typeof obj.moduleObject.onClick === 'function'){
                      obj.moduleObject.onClick(Game.getCurrentPlayer());
                    }else{
                      let distance = Game.getCurrentPlayer().position.distanceTo(obj.position);
                      console.log(distance);
                      if(distance > 1.5){
                        obj.moduleObject.clearAllActions();
                        Game.getCurrentPlayer().actionQueue.push({
                          object: obj.moduleObject, goal: 'ACTION_DIALOGOBJECT'
                        });
                      }
                    }
                  }

                  if(obj.lookathook != undefined){
                    CursorManager.reticle2.position.copy(obj.lookathook.getWorldPosition(new THREE.Vector3()));
                    Game.selected = obj.lookathook;
                    Game.selectedObject = obj.moduleObject;
                  }else if(obj.headhook != undefined){
                    CursorManager.reticle2.position.copy(obj.headhook.getWorldPosition(new THREE.Vector3()));
                    Game.selected = obj.headhook;
                    Game.selectedObject = obj.moduleObject;
                  }else{
                    try{
                      CursorManager.reticle2.position.copy(obj.getObjectByName('camerahook').getWorldPosition(new THREE.Vector3()));
                      Game.selected = obj.getObjectByName('camerahook');
                      Game.selectedObject = obj.moduleObject;
                    }catch(e){
                      if(!(obj.moduleObject instanceof ModuleRoom)){
                        CursorManager.reticle2.position.copy(obj.position);
                        Game.selected = obj;
                        Game.selectedObject = obj.moduleObject;
                      }
                    }
                  }

                  if(obj.moduleObject instanceof ModuleDoor){      
                    CursorManager.setReticle2('reticleF2');
                  }else if(obj.moduleObject instanceof ModulePlaceable){
                    if(!obj.moduleObject.isUseable()){
                      return;
                    }      
                    CursorManager.setReticle2('reticleF2');
                  }else if(obj.moduleObject instanceof ModuleCreature){
                    if(obj.moduleObject.isHostile(Game.getCurrentPlayer())){
                      CursorManager.setReticle2('reticleH2');
                    }else{
                      CursorManager.setReticle2('reticleF2');
                    }
                  }
                  
                }
                console.log('Ingame Object', obj);
              }else{
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
      if(e.originalEvent.wheelDelta /120 > 0){
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

    var xoffset = 0;
    var yoffset = 0;

    if(Mouse.Dragging){
      xoffset = Mouse.OffsetX || 0;
      yoffset = Mouse.OffsetY || 0;
      //Reset the offset value to fix the lingering drag effect
      Mouse.OffsetX = Mouse.OffsetY = 0;
    }

    if(Game.inDialog){
      if(Game.InGameDialog.state == 1){
        if(this.keys['1'].pressed){
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

      }

      if(this.keys['escape'].pressed){
        Game.InGameDialog.EndConversation(true);
      }

    }else{
      if(this.keys['escape'].pressed && (Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME)){
        if(Game.MenuActive){
          Game.MenuActive = false;
          Game.InGameOverlay.Show();
        }else{
          Game.MenuActive = true;
          Game.MenuOptions.Show();
        }
      }
  
      if(this.keys['space'].pressed && !Game.MenuActive && (Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME)){
        Game.State = ( Game.State == Game.STATES.PAUSED ? Game.STATES.RUNNING : Game.STATES.PAUSED );
      }

      if(this.keys['z'].pressed){
        Game.getCurrentPlayer().flourish();
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
    if(Game.State == Game.STATES.RUNNING){

      if(!Game.inDialog){

        let followee = PartyManager.party[0];

        if(this.keys['ctrl'].pressed){
          Game.autoRun = !Game.autoRun;
        }

        if(followee.canMove()){

          let moveSpeed = followee.walk ? followee.getWalkSpeed() : followee.getRunSpeed();

          if((this.keys['w'].down || Game.autoRun) && !followee.isDead()){
            followee.clearAllActions(true);
            followee.force = moveSpeed;
            followee.setFacing(Utility.NormalizeRadian(Game.followerCamera.facing + Math.PI/2), true);
            //followee.facing = Utility.NormalizeRadian(Game.followerCamera.facing + Math.PI);
            followee.controlled = true;
            followee.invalidateCollision = true;

            followee.AxisFront.x = Math.cos(followee.model.rotation.z + Math.PI/2);// * Math.cos(0);
            followee.AxisFront.y = Math.sin(followee.model.rotation.z + Math.PI/2);// * Math.cos(0);

          }else if(this.keys['s'].down && !followee.isDead()){
            followee.clearAllActions(true);
            followee.force = moveSpeed;
            followee.setFacing(Utility.NormalizeRadian(Game.followerCamera.facing - Math.PI/2), true);
            //followee.facing = Utility.NormalizeRadian(Game.followerCamera.facing - Math.PI);
            followee.controlled = true;
            followee.invalidateCollision = true;

            followee.AxisFront.x = Math.cos(followee.model.rotation.z + Math.PI/2);// * Math.cos(0);
            followee.AxisFront.y = Math.sin(followee.model.rotation.z + Math.PI/2);

          }else{
            followee.controlled = false;
            followee.force = 0;
          }

          if(this.keys['s'].down || this.keys['w'].down && !followee.isDead()){
            followee.animState = ModuleCreature.AnimState.RUNNING;
          }

          if(this.keys['num-minus'].down && !followee.isDead()){
            followee.model.position.z -= 5 * delta;
          }

          if(this.keys['num-plus'].down && !followee.isDead()){
            followee.model.position.z += 5 * delta;
          }

        }

        if(this.keys['a'].down && !Game.MenuActive){
          Game.followerCamera.facing = (Utility.NormalizeRadian(Game.followerCamera.facing + 2.5 * delta));
          followee.invalidateCollision = true;
        }
    
        if(this.keys['d'].down && !Game.MenuActive){
          Game.followerCamera.facing = (Utility.NormalizeRadian(Game.followerCamera.facing - 2.5 * delta));
          followee.invalidateCollision = true;
        }

      }

    }else if(Game.State == Game.STATES.PAUSED && !Game.MenuActive && (Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME)){
      if(this.keys['a'].down && !Game.MenuActive){
        Game.followerCamera.facing = (Utility.NormalizeRadian(Game.followerCamera.facing + 2.5 * delta));
      }
  
      if(this.keys['d'].down && !Game.MenuActive){
        Game.followerCamera.facing = (Utility.NormalizeRadian(Game.followerCamera.facing - 2.5 * delta));
      }
    }
  }

  UpdateMiniGameControls(delta){
    switch(Game.module.area.MiniGame.Type){
      case 1: //SWOOPRACE
        if(Game.mouse.leftClick){
          Game.module.area.MiniGame.Player.FireGun();
        }
        if(this.keys['a'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.position.x += -Game.module.area.MiniGame.Player.accel_lateral_secs * delta;
        }
    
        if(this.keys['d'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.position.x += Game.module.area.MiniGame.Player.accel_lateral_secs * delta;
        }

        if(this.keys['space'].pressed){
          Game.module.area.MiniGame.Player.Jump();
        }

      break;
      case 2: //TURRET

        if(Game.mouse.leftClick || Mouse.MouseDown){
          Game.module.area.MiniGame.Player.FireGun();
        }

        if(this.keys['a'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.Rotate('z', 1 * delta);
        }
    
        if(this.keys['d'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.Rotate('z', -1 * delta);
        }

        if(this.keys['w'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.Rotate('x', 1 * delta);
        }
    
        if(this.keys['s'].down && !Game.MenuActive){
          Game.module.area.MiniGame.Player.Rotate('x', -1 * delta);
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

module.exports = IngameControls;
