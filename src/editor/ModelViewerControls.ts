import * as THREE from "three";
import { Mouse, MouseState } from "../controls/Mouse";
import { EditorControls } from "./EditorControls";
import { EditorTab } from "./tabs/EditorTab";
import { EditorControlsTool } from "./enum/EditorControlsTool";
import { LIPEditorTab } from "./tabs/LIPEditorTab";
import { ModelViewerTab } from "./tabs/ModelViewerTab";
import { WalkmeshViewerTab } from "./tabs/WalkmeshViewerTab";

export class ModelViewerControls {
  camera: THREE.PerspectiveCamera;
  element: HTMLElement;
  editor: LIPEditorTab|ModelViewerTab|WalkmeshViewerTab;
  AxisFront: THREE.Vector3;
  CameraMoveSpeed: number;
  pitch: number;
  yaw: number;
  pointerLockVector: THREE.Vector2;
  CurrentTool: EditorControlsTool;
  keys: any = {};
  plMoveEvent: Function;

  constructor(camera: THREE.PerspectiveCamera, element: HTMLElement, editor: LIPEditorTab|ModelViewerTab|WalkmeshViewerTab){

    this.camera = camera;
    this.element = element;
    this.editor = editor;

    this.AxisFront = new THREE.Vector3(0.0, 1.0, 0.0);
    this.CameraMoveSpeed = EditorControls.CameraMoveSpeed;

    this.pitch = 0;
    this.yaw = -90;

    this.pointerLockVector = new THREE.Vector2();

    this.CurrentTool = EditorControlsTool.NONE;

    this.keys = {
      'w':false,
      'a':false,
      's':false,
      'd':false,
      'space':false,
      'shift':false
    };

    //this.element.requestPointerLock = this.element.requestPointerLock;

    // Ask the browser to release the pointer
    document.exitPointerLock = document.exitPointerLock;

    document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);

    this.editor.$canvas.keydown( ( event: any ) => {
      //console.log(event.which)
      if ( event.which == 87 )
        this.keys['w'] = true;
      if ( event.which == 65 )
        this.keys['a'] = true;
      if ( event.which == 83 )
        this.keys['s'] = true;
      if ( event.which == 68 )
        this.keys['d'] = true;
      if ( event.which == 32 )
        this.keys['space'] = true;
      if ( event.which == 16 )
        this.keys['shift'] = true;
      if ( event.which == 27 )
        this.keys['escape'] = true;
      if ( event.which == 70 )
        this.keys['f'] = true;
    }).keyup( ( event: any ) => {
      if ( event.which == 87 )
        this.keys['w'] = false;
      if ( event.which == 65 )
        this.keys['a'] = false;
      if ( event.which == 83 )
        this.keys['s'] = false;
      if ( event.which == 68 )
        this.keys['d'] = false;
      if ( event.which == 32 )
        this.keys['space'] = false;
      if ( event.which == 16 )
        this.keys['shift'] = false;
      if ( event.which == 27 )
        this.keys['escape'] = false;
      if ( event.which == 70 )
        this.keys['f'] = false;
    }).mousedown((event: any) => {
      if(event.target == this.element){
        //console.log('Valid Mouse Target');
        Mouse.ButtonState = event.which;
        Mouse.MouseDown = true;
        let parentOffset = this.editor.$canvas.offset();
        Mouse.MouseDownX = event.pageX - parentOffset.left;
        Mouse.MouseDownY = event.pageY - parentOffset.top;

        if(Mouse.ButtonState == MouseState.LEFT){
          //let axisMoverSelected = false;
          //this.editor.axes.selected = null;
          //@ts-expect-error
          this.editor.raycaster.setFromCamera( Mouse.Vector, this.camera );
          /*let axisMoverIntersects = this.editor.raycaster.intersectObjects( this.editor.sceneOverlay.children, true );
          if(axisMoverIntersects.length){
            this.editor.axes.selected = axisMoverIntersects[0].object.name;
            axisMoverSelected = true;
          }*/

          //if(!axisMoverSelected){
            //@ts-expect-error
            let intersects = this.editor.raycaster.intersectObjects( this.editor.selectable.children, true );

      //@ts-expect-error
            this.editor.selectionBox.visible = false;
            //@ts-expect-error
            this.editor.selectionBox.update();
            //@ts-expect-error
            this.editor.selected = null;

      //@ts-expect-error
            if(this.editor.$ui_selected.$selected_object){
              //@ts-expect-error
              this.editor.$ui_selected.$selected_object.hide();
            }

            if(intersects.length){

              let intersection = intersects[ 0 ],
                obj = intersection.object;

              if(obj instanceof THREE.Mesh){
                //@ts-expect-error
                if(typeof this.editor.select === 'function'){
                  //@ts-expect-error
                  this.editor.select(obj);
                }
              }else{
                obj.traverseAncestors( (obj: any) => {
                  if(obj instanceof THREE.Mesh){
                    //@ts-expect-error
                    if(typeof this.editor.select === 'function'){
                      //@ts-expect-error
                      this.editor.select(obj);
                    }
                    return;
                  }
                });
              }
              
            }
          //}
        }else{
          // Ask the browser to lock the pointer
          this.element.requestPointerLock();
        }
      }else{
        //console.log('Invalid Mouse Target', this.element);
      }

    }).mousemove((event: any) => {


      let parentOffset = this.editor.$canvas.offset();
      Mouse.MouseX = event.pageX - parentOffset.left;
      Mouse.MouseY = event.pageY - parentOffset.top;
      Mouse.Vector.x = ( (Mouse.MouseX) / this.editor.$canvas.width() ) * 2 - 1;
      Mouse.Vector.y = - ( (Mouse.MouseY) / this.editor.$canvas.height() ) * 2 + 1;

      if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == MouseState.RIGHT){
        Mouse.Dragging = true;
        this.CurrentTool = EditorControlsTool.CAMERA_MOVE;
      }else if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == MouseState.LEFT){
        Mouse.Dragging = true;
        this.CurrentTool = EditorControlsTool.CAMERA_MOVE;
      }

    }).mouseup((event: any) => {
      Mouse.MouseDown = false;
      Mouse.Dragging = false;
      Mouse.ButtonState = MouseState.NONE;

      // Ask the browser to release the pointer
      document.exitPointerLock();


      /*document.removeEventListener('mozpointerlockchange', this.plChangeCallback.bind(this), false);
      document.removeEventListener("webkitpointerlockchange", this.plChangeCallback.bind(this), false);*/
    });

  }

  Update(delta: number = 0){
    //console.log('Camera.Update')
    let speed = EditorControls.CameraMoveSpeed * delta;
    let speed2 = 0.5 * delta;

    let xoffset = 0;
    let yoffset = 0;

    let _cacheZ = this.camera.position.z;

    if(Mouse.Dragging){
      xoffset = Mouse.OffsetX || 0;
      yoffset = Mouse.OffsetY || 0;

      //Reset the offset value to fix the lingering drag effect
      Mouse.OffsetX = Mouse.OffsetY = 0;
    }

    if(this.keys['w']){
      //console.log(this.AxisFront, this.AxisFront.clone().multiplyScalar(speed));
      this.camera.position.add(this.AxisFront.clone().multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['s']){
      //console.log(this.AxisFront.clone().multiplyScalar(speed));
      this.camera.position.sub(this.AxisFront.clone().multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['a']){
      this.camera.position.sub((new THREE.Vector3().crossVectors(this.AxisFront, this.camera.up)).multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['d']){
      this.camera.position.add((new THREE.Vector3().crossVectors(this.AxisFront, this.camera.up)).multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.z = _cacheZ;

    if(this.keys['space']){
      this.camera.position.z += speed/2;
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['shift']){
      this.camera.position.z -= speed/2;
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['escape']){
      //@ts-expect-error
      this.editor.selected = null;
    }

    if(this.CurrentTool == EditorControlsTool.CAMERA_MOVE){

      if(xoffset != 0 || yoffset != 0){
        let sensitivity = 0.05;
        xoffset *= sensitivity;
        yoffset *= sensitivity;

        this.yaw -= xoffset*2;
        this.pitch += yoffset*2;

        if (this.pitch > 89.0)
            this.pitch = 89.0;
        if (this.pitch < -89.0)
            this.pitch = -89.0;

        this.AxisUpdate();

      }

    }

    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;

  }


  AxisUpdate(axisFront: THREE.Vector3 = new THREE.Vector3()){
    let front = new THREE.Vector3();
    front.x = Math.cos(THREE.MathUtils.degToRad(this.yaw)) * Math.cos(THREE.MathUtils.degToRad(this.pitch));
    front.y = Math.sin(THREE.MathUtils.degToRad(this.yaw)) * Math.cos(THREE.MathUtils.degToRad(this.pitch));
    front.z = Math.sin(THREE.MathUtils.degToRad(this.pitch));

    if(axisFront != null)
      front = axisFront;

    this.AxisFront = front.normalize();

    let lookAt = new THREE.Vector3();
    lookAt.addVectors(this.camera.position, this.AxisFront);
    this.camera.lookAt(lookAt);
    this.camera.updateProjectionMatrix();
  }

  plChangeCallback(e: any){
    // document.pointerLockElement = this.element;
    //console.log('ModelViewerControls', document.pointerLockElement, this.element);
    if(document.pointerLockElement === this.element) {
      //console.log('The pointer lock status is now locked');
      document.body.addEventListener("mousemove", this.plMoveEvent = (e: any) => { this.plMouseMove(e); }, true);
      Mouse.Dragging = true;
    } else {
      //console.log('The pointer lock status is now unlocked');
      //@ts-expect-error
      document.body.removeEventListener("mousemove", this.plMoveEvent, true);
      //this.plMoveEvent = undefined;
      Mouse.Dragging = false;
      //document.removeEventListener('pointerlockchange', this.plEvent, true);
    }
  }

  plMouseMove(event: any){
    if(Mouse.Dragging && (event.movementX || event.movementY)){
      let range = 100;
      //console.log(event.movementX, event.movementY);
      if(event.movementX > -range && event.movementX < range){
        Mouse.OffsetX = event.movementX || 0;
      }
      if(event.movementY > -range && event.movementY < range){
        Mouse.OffsetY = (event.movementY || 0)*-1.0;
      }
    }
  }

}
