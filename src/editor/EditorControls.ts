import * as THREE from "three"
import { Mouse, MouseState } from "../controls/Mouse";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { ModuleCreature } from "../module";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import { Utility } from "../utility/Utility";
import { EditorControlsCameraMode } from "./enum/EditorControlsCameraMode";
import { EditorControlsTool } from "./enum/EditorControlsTool";
import { ModuleEditorTabMode } from "./enum/ModuleEditorTabMode";
import { ModuleEditorTab } from "./tabs/ModuleEditorTab";

export class EditorControls {

  static CameraMoveSpeed = localStorage.getItem('camera_speed') || 1;
  camera: THREE.Camera;
  element: HTMLCanvasElement | Document;
  editor: ModuleEditorTab;
  cameraMode: EditorControlsCameraMode;
  camSpeed: number;
  maxCamSpeed: number;
  camRampSpeed: number;
  signals: any;
  CurrentTool: EditorControlsTool;
  keys: any = {};
  camDir: number;

  constructor(camera: THREE.Camera, element: HTMLCanvasElement, editor: ModuleEditorTab){

    this.camera = camera;
    this.element = element || document;
    this.editor = editor;
    this.cameraMode = EditorControlsCameraMode.EDITOR;

    this.camera.userData.AxisFront = new THREE.Vector3(0.0, 1.0, 0.0);
    this.camera.userData.pitch = 0.00;
    this.camera.userData.yaw = 0.0;

    this.camSpeed = 0;
    this.maxCamSpeed = 2.5;
    this.camRampSpeed = 10;

    this.signals = this.editor.signals;

    this.CurrentTool = EditorControlsTool.SELECT;

    this.keys = {};

    this.InitKeys();

    /*this.workerPointer = new Worker('worker/worker-pointer-raycaster.js');
    this.workerPointer.addEventListener('message', function(e) {
      this.workerPointerWorking = false;
    }, false);

    this.workerPointerWorking = false;*/

    this.element.requestPointerLock = this.element.requestPointerLock ||
			     this.element.webkitRequestPointerLock;

    // Ask the browser to release the pointer
    this.element.exitPointerLock = this.element.exitPointerLock ||
   			   this.element.webkitExitPointerLock;

    //document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);

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
        if ( event.which == 9 )
          this.keys['tab'].down = this.keys['tab'].pressed = true;
      }

      /*if(this.keys['delete']){
        if(this.editor.selected != null){
          let index = this.editor.scene.children.indexOf(this.editor.selected.parent);
          if(index !== -1) {
            this.editor.scene.children.splice(index, 1);
          }
          console.log('delete', index, this.editor.selected.parent);
        }
      }

      if(this.keys['f']){
        if(this.editor.selected != null){
          console.log('warp', this.camera.position, this.editor.selected.parent.position);
          this.camera.position.set(
            this.editor.selectionBox.geometry.boundingSphere.center.x,
            this.editor.selectionBox.geometry.boundingSphere.center.y,
            this.editor.selectionBox.geometry.boundingSphere.center.z
          );

          this.AxisUpdate();
        }
      }*/
    }).keyup( ( event ) => {
      if(event.which >= 48 && event.which <= 57){
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
        if ( event.which == 9 )
        this.keys['tab'].down = this.keys['tab'].pressed = false;
      }

      if(!this.keys['w'].down && !this.keys['s'].down){
        let followee = this.editor.player;
        if(followee.canMove()){
          followee.animState = ModuleCreatureAnimState.IDLE;
        }
      }

    }).mousedown((event) => {
      if(event.target == this.element){
        console.log('Valid Mouse Target');
        Mouse.ButtonState = event.which;
        Mouse.MouseDown = true;
        let parentOffset = this.editor.$canvas.offset();
        Mouse.MouseDownX = event.pageX - parentOffset.left;
        Mouse.MouseDownY = event.pageY - parentOffset.top;

        if(Mouse.ButtonState == MouseState.LEFT){
          //if(this.CurrentTool == EditorControlsTool.SELECT){
            let axisMoverSelected = false;
            this.editor.axes.selected = null;
            this.editor.raycaster.setFromCamera( Mouse.Vector, this.editor.currentCamera );
            let axisMoverIntersects = this.editor.raycaster.intersectObjects( this.editor.sceneOverlay.children, true );
            if(axisMoverIntersects.length){
              //console.log(Mouse.MouseDownX, Mouse.MouseDownY);
              //console.log('axisMoverIntersects', axisMoverIntersects);
              this.editor.axes.selected = axisMoverIntersects[0].object.name;
              axisMoverSelected = true;
            }

            if(!axisMoverSelected){
              let intersects = this.editor.raycaster.intersectObjects( this.editor.scene.children, true );

              this.editor.selectionBox.visible = false;
              //this.editor.selectionBox.update();
              this.editor.selected = null;

              this.editor.axes.visible = false;

              if(intersects.length){

                let intersection = intersects[ 0 ],
                    obj = intersection.object;

                //console.log('Init', obj);
                obj.traverseAncestors( (obj: OdysseyObject3D) => {
                  if(obj instanceof OdysseyModel3D){
                    this.editor.select(obj);
                    return;
                  }

                });
              }
            }
          //}
        }else{


          //this.element.removeEventListener('pointerlockchange', this.plEvent, true);
          //console.log('PointerLockRequest', this.element.requestPointerLock());

        }
      }else{
        console.log('Invalid Mouse Target', this.element);
      }


    }).mousemove((event) => {


      let parentOffset = this.editor.$canvas.offset();
      Mouse.MouseX = event.pageX - parentOffset.left;
      Mouse.MouseY = event.pageY - parentOffset.top;
      Mouse.Vector.x = ( (Mouse.MouseX) / this.editor.$canvas.width() ) * 2 - 1;
      Mouse.Vector.y = - ( (Mouse.MouseY) / this.editor.$canvas.height() ) * 2 + 1;

      if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == MouseState.RIGHT){
        Mouse.Dragging = true;
        this.CurrentTool = EditorControlsTool.CAMERA_MOVE;
        // Ask the browser to lock the pointer
        //this.element.requestPointerLock();
      }else if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == MouseState.LEFT){
        Mouse.Dragging = true;
        this.CurrentTool = EditorControlsTool.OBJECT_MOVE;
      }

      this.editor.raycaster.setFromCamera( Mouse.Vector, this.editor.currentCamera );
      let intersections = this.editor.raycaster.intersectObjects( this.editor.group.rooms.children, true );
      let intersection = ( intersections.length ) > 0 ? intersections[ 0 ] : null;
			if ( intersection !== null) {
				Mouse.CollisionPosition = intersection.point;
			}

    }).mouseup((event) => {
      Mouse.MouseDown = false;
      Mouse.Dragging = false;
      Mouse.ButtonState = MouseState.NONE;

      //document.removeEventListener('pointerlockchange', this.plEvent, true);
      // Ask the browser to release the pointer
      //document.exitPointerLock();

      /*if(!this.workerPointerWorking){
        this.workerPointer.postMessage({
          Raycaster: this.editor.raycaster,
          Scene: this.editor.scene
        });
        this.workerPointerWorking = true;
      }*/


      //document.removeEventListener('mozpointerlockchange', this.plChangeCallback.bind(this), false);
      //document.removeEventListener("webkitpointerlockchange", this.plChangeCallback.bind(this), false);


    });


    this.signals.objectSelected.add( ( object ) => {

      console.log('Signal', 'objectSelected', object);
      this.editor.selectionBox.setFromObject(object || null);
      this.editor.selectionBox.visible = true;
      //this.editor.selectionBox.update();

      console.log(this.editor.selectionBox);

      let centerX = this.editor.selectionBox.geometry.boundingSphere.center.x;
      let centerY = this.editor.selectionBox.geometry.boundingSphere.center.y;
      let centerZ = this.editor.selectionBox.geometry.boundingSphere.center.z;

      console.log(this.editor.axes, centerX, centerY, centerZ);

      this.editor.selected = object.children[0] || null;

      this.editor.axes.position.set(centerX, centerY, centerZ);
      this.editor.axes.visible = false;

  	} );

    this.AxisUpdate();

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

  SetCameraMode(cameraMode){
    this.cameraMode = cameraMode;
  }

  Update(delta){

    let speed = EditorControls.CameraMoveSpeed * delta;
    let speed2 = 0.5 * delta;

    let xoffset = 0;
    let yoffset = 0;

    let _cacheZ = this.editor.currentCamera.position.z;

    if(Mouse.Dragging){
      xoffset = Mouse.OffsetX || 0;
      yoffset = Mouse.OffsetY || 0;

      //Reset the offset value to fix the lingering drag effect
      Mouse.OffsetX = Mouse.OffsetY = 0;
    }

    this.editor.cursorGroup.position.set(Mouse.CollisionPosition.x, Mouse.CollisionPosition.y, Mouse.CollisionPosition.z);

    if(this.editor.mode == ModuleEditorTabMode.PREVIEW){
      if(this.editor.player instanceof ModuleCreature){
        this.updatePlayerControls(delta);
      }
    }

    /*if(this.keys['space'].down){
      this.camera.position.z += speed;
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['shift']){
      this.camera.position.z -= speed;
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['escape']){
      this.editor.selected = null;
      this.editor.selectionBox.visible = false;
      //this.editor.selectionBox.update();
      this.editor.axes.visible = false;
      this.editor.cursorGroup = new THREE.Group();
    }

    if(this.keys['j'] && this.editor.selected != null){

      let target = this.editor.selected;
      let frame = false;
      let center = this.camera.position.clone();

  		let scale = new THREE.Vector3();
  		target.matrixWorld.decompose( center, new THREE.Quaternion(), scale );

  		if ( frame && target.geometry ) {

  			scale = ( scale.x + scale.y + scale.z ) / 3;
  			center.add( target.geometry.boundingSphere.center.clone().multiplyScalar( scale ) );
  			let radius = target.geometry.boundingSphere.radius * ( scale );
  			let pos = object.position.clone().sub( center ).normalize().multiplyScalar( radius * 2 );
  			object.position.copy( center ).add( pos );

  		}

  		this.camera.lookAt( center );

      let front = new THREE.Vector3();
      front.x = Math.cos(this.camera.rotation.x) * THREE.MathUtils.degToRad(this.camera.rotation.z);
      front.y = Math.sin(this.camera.rotation.x) * THREE.MathUtils.degToRad(this.camera.rotation.z);
      front.z = Math.sin(this.camera.rotation.z);

      this.camera.AxisFront = front.normalize();

      let lookAt = new THREE.Vector3();
      lookAt.addVectors(this.camera.position, this.camera.AxisFront);
      this.camera.lookAt(lookAt);
      this.camera.updateProjectionMatrix();

    }

    if(this.CurrentTool == EditorControlsTool.CAMERA_MOVE){

      if(xoffset != 0 || yoffset != 0){
        let sensitivity = 0.05;
        xoffset *= sensitivity;
        yoffset *= sensitivity;

        this.camera.yaw -= xoffset*2;
        this.camera.pitch += yoffset*2;

        if (this.camera.pitch > 89.0)
            this.camera.pitch = 89.0;
        if (this.camera.pitch < -89.0)
            this.camera.pitch = -89.0;

        this.AxisUpdate();

      }

    }*/

    if(this.CurrentTool == EditorControlsTool.OBJECT_MOVE && this.editor.selected != null){

      /*if(xoffset != 0 || yoffset != 0){
        let sensitivity = 0.05;
        xoffset *= sensitivity;
        yoffset *= sensitivity;

        let originalRot = this.editor.selected.rotation.clone();
        this.editor.selected.rotation.set(0,0,0);
        this.editor.selected.updateMatrix();

        switch(this.editor.axes.selected){
          case 'x':
            this.editor.selected.translateOnAxis(new THREE.Vector3(1, 0, 0), xoffset);
          break;
          case 'y':
            this.editor.selected.translateOnAxis(new THREE.Vector3(0, 1, 0), xoffset);
          break;
          case 'z':
            this.editor.selected.translateOnAxis(new THREE.Vector3(0, 0, 1), yoffset);
          break;
        }

        this.editor.selected.rotation.set(originalRot.x, originalRot.y, originalRot.z);
        this.editor.selected.updateMatrix();

        //this.editor.selectionBox.update();

      }*/

    }

    //this.light.position = this.camera.position;

    if(this.editor.axes.visible){
      this.editor.axes.scale.setScalar(this.editor.currentCamera.position.distanceTo(this.editor.axes.position) * 0.25);
    }


    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;

  }


  AxisUpdate(axisFront = null){
    let front = new THREE.Vector3();
    front.x = Math.cos(THREE.MathUtils.degToRad(this.camera.yaw)) * Math.cos(THREE.MathUtils.degToRad(this.camera.pitch));
    front.y = Math.sin(THREE.MathUtils.degToRad(this.camera.yaw)) * Math.cos(THREE.MathUtils.degToRad(this.camera.pitch));
    front.z = Math.sin(THREE.MathUtils.degToRad(this.camera.pitch));

    if(axisFront != null)
      front = axisFront;

    this.camera.AxisFront = front.normalize();

    let lookAt = new THREE.Vector3();
    lookAt.addVectors(this.camera.position, this.camera.AxisFront);
    this.camera.lookAt(lookAt);
    this.camera.updateProjectionMatrix();
  }

  plChangeCallback(e){
    /*
    //document.pointerLockElement = this.element;
    //console.log('EditorControls', document.pointerLockElement, this.element);
    if(document.pointerLockElement === this.element) {
      //console.log('The pointer lock status is now locked');
      this.element.removeEventListener("mousemove", this.plMoveEvent, true);
      this.element.addEventListener("mousemove", this.plMoveEvent, true);
      Mouse.Dragging = true;
    } else {
      //console.log('The pointer lock status is now unlocked');
      this.element.removeEventListener("mousemove", this.plMoveEvent, true);
      Mouse.Dragging = false;

      //this.editor.canvas.removeEventListener('pointerlockchange', this.plEvent, true);
    }
    */
  }

  plMouseMove(event){

    Mouse.OffsetX = event.movementX || 0;
    Mouse.OffsetY = (event.movementY || 0)*-1.0;
  }

  updatePlayerControls(delta){
    let followee = this.editor.player;
    let turningCamera = false;

    if(followee.canMove()){

      let moveSpeed = followee.walk ? followee.getWalkSpeed() : followee.getRunSpeed();

      if((this.keys['w'].down) && !followee.isDead()){
        followee.clearAllActions(true);
        followee.force = moveSpeed;
        followee.setFacing(Utility.NormalizeRadian(this.editor.followerCamera.facing + Math.PI/2), true);
        //followee.facing = Utility.NormalizeRadian(this.editor.followerCamera.facing + Math.PI);
        followee.controlled = true;
        followee.invalidateCollision = true;

        followee.AxisFront.x = Math.cos(followee.rotation.z + Math.PI/2);// * Math.cos(0);
        followee.AxisFront.y = Math.sin(followee.rotation.z + Math.PI/2);// * Math.cos(0);

      }else if( this.keys['s'].down && !followee.isDead()){
        followee.clearAllActions(true);
        followee.force = moveSpeed;
        followee.setFacing(Utility.NormalizeRadian(this.editor.followerCamera.facing - Math.PI/2), true);
        //followee.facing = Utility.NormalizeRadian(this.editor.followerCamera.facing - Math.PI);
        followee.controlled = true;
        followee.invalidateCollision = true;

        followee.AxisFront.x = Math.cos(followee.rotation.z + Math.PI/2);// * Math.cos(0);
        followee.AxisFront.y = Math.sin(followee.rotation.z + Math.PI/2);

      }else{
        //followee.controlled = false;
        followee.force = 0;
      }

      if( (this.keys['s'].down || this.keys['w'].down) && !followee.isDead()){
        followee.animState = ModuleCreatureAnimState.RUNNING;
      }

      if(this.keys['num-minus'].down && !followee.isDead()){
        followee.position.z -= 5 * delta;
      }

      if(this.keys['num-plus'].down && !followee.isDead()){
        followee.position.z += 5 * delta;
      }

    }

    if(this.keys['a'].down){
      //this.editor.followerCamera.facing = (Utility.NormalizeRadian(this.editor.followerCamera.facing + 2.5 * delta));
      followee.invalidateCollision = true;
      turningCamera = true;
      this.camDir = 1;
    }

    if(this.keys['d'].down){
      //this.editor.followerCamera.facing = (Utility.NormalizeRadian(this.editor.followerCamera.facing - 2.5 * delta));
      followee.invalidateCollision = true;
      turningCamera = true;
      this.camDir = -1;
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
      this.editor.followerCamera.facing = (Utility.NormalizeRadian(this.editor.followerCamera.facing + (this.camSpeed * this.camDir) * delta))
    }

  }

}
