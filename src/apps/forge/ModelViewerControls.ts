import { EditorControlsTool } from "./enum/EditorControlsTool";
import { TabState } from "./states/tabs/TabState";

import * as KotOR from "./KotOR";
import { TabModelViewerState } from "./states/tabs/TabModelViewerState";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "./UI3DRenderer";

export class ModelViewerControls {

  context: UI3DRenderer;
  element: HTMLCanvasElement;

  editor: TabModelViewerState;
  axisFront: KotOR.THREE.Vector3 = new KotOR.THREE.Vector3();
  pitch: number = 0;
  yaw: number = 0;
  pointerLockVector: KotOR.THREE.Vector2 = new KotOR.THREE.Vector2();
  currentTool: EditorControlsTool;

  static CameraMoveSpeed: number = 10;

  keys: any = {};
  plMoveEvent: Function;

  eventListeners: any = {
    onMouseDown: [],
    onMouseUp: [],
    onKeyDown: [],
    onKeyUp: [],
    onSelect: []
  };

  attachEventListener(key: string, cb: Function){
    let event = this.eventListeners.hasOwnProperty(key);
    if(!!event){
      event = this.eventListeners[key];
      let cbIndex = event.indexOf(cb);
      if(cbIndex == -1){
        event.push(cb);
      }
    }
  }

  removeEventListener(key: string, cb: Function){
    let event = this.eventListeners.hasOwnProperty(key);
    if(!!event){
      event = this.eventListeners[key];
      let cbIndex = event.indexOf(cb);
      if(cbIndex >= 0){
        event.splice(cbIndex, 1);
      }
    }
  }

  processEventListener(key: string, data: any = {}){
    let event = this.eventListeners.hasOwnProperty(key);
    if(!!event){
      event = this.eventListeners[key];
      event.forEach( (cb: Function) => {
        cb(data);
      });
    }
  }

  constructor(context: UI3DRenderer, editor: TabModelViewerState){

    this.context = context;
    this.editor = editor;

    this.axisFront = new KotOR.THREE.Vector3(0.0, 1.0, 0.0);

    this.pitch = 0;
    this.yaw = -90;

    this.currentTool = EditorControlsTool.NONE;

    this.keys = {
      'w':false,
      'a':false,
      's':false,
      'd':false,
      'space':false,
      'shift':false
    };

  }

  attachCanvasElement(canvas: HTMLCanvasElement){
    this.element = canvas;
    //this.element.requestPointerLock = this.element.requestPointerLock;

    // Ask the browser to release the pointer
    document.exitPointerLock = document.exitPointerLock;

    document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);

    this.element.addEventListener('keydown', ( event: KeyboardEvent ) => {
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
    })
    
    this.element.addEventListener('keyup', ( event: KeyboardEvent ) => {
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
    })
    
    this.element.addEventListener('mousedown', (event: MouseEvent) => {
      if(event.target == this.element){
        //console.log('Valid Mouse Target');
        KotOR.Mouse.ButtonState = event.which;
        KotOR.Mouse.MouseDown = true;
        KotOR.Mouse.MouseDownX = event.pageX - this.element.offsetLeft;
        KotOR.Mouse.MouseDownY = event.pageY - this.element.offsetTop;

        if(KotOR.Mouse.ButtonState == KotOR.MouseState.LEFT){
          //let axisMoverSelected = false;
          //this.editor.axes.selected = null;
          this.context.raycaster.setFromCamera( KotOR.Mouse.Vector, this.context.camera );
          /*let axisMoverIntersects = this.editor.renderComponent.raycaster.intersectObjects( this.editor.sceneOverlay.children, true );
          if(axisMoverIntersects.length){
            this.editor.axes.selected = axisMoverIntersects[0].object.name;
            axisMoverSelected = true;
          }*/

          //if(!axisMoverSelected){
            let intersects = this.context.raycaster.intersectObjects( this.context.selectable.children, true );
            if(intersects.length){
              let intersection = intersects[ 0 ],
                obj = intersection.object;
              this.processEventListener('onSelect', obj);
            }else{
              this.processEventListener('onSelect', undefined);
            }
          //}
        }else{
          // Ask the browser to lock the pointer
          this.element.requestPointerLock();
        }
      }else{
        //console.log('Invalid Mouse Target', this.element);
      }

    })
    
    this.element.addEventListener('mousemove', (event: MouseEvent) => {
      KotOR.Mouse.MouseX = event.pageX - this.element.offsetLeft;
      KotOR.Mouse.MouseY = event.pageY - this.element.offsetTop;
      KotOR.Mouse.Vector.x = ( (KotOR.Mouse.MouseX) / this.element.width ) * 2 - 1;
      KotOR.Mouse.Vector.y = - ( (KotOR.Mouse.MouseY) / this.element.height ) * 2 + 1;

      if(KotOR.Mouse.MouseDown && !KotOR.Mouse.Dragging && KotOR.Mouse.ButtonState == KotOR.MouseState.RIGHT){
        KotOR.Mouse.Dragging = true;
        this.currentTool = EditorControlsTool.CAMERA_MOVE;
      }else if(KotOR.Mouse.MouseDown && !KotOR.Mouse.Dragging && KotOR.Mouse.ButtonState == KotOR.MouseState.LEFT){
        KotOR.Mouse.Dragging = true;
        this.currentTool = EditorControlsTool.CAMERA_MOVE;
      }

    })
    
    this.element.addEventListener('mouseup', (event: MouseEvent) => {
      KotOR.Mouse.MouseDown = false;
      KotOR.Mouse.Dragging = false;
      KotOR.Mouse.ButtonState = KotOR.MouseState.NONE;

      // Ask the browser to release the pointer
      document.exitPointerLock();


      /*document.removeEventListener('mozpointerlockchange', this.plChangeCallback.bind(this), false);
      document.removeEventListener("webkitpointerlockchange", this.plChangeCallback.bind(this), false);*/
    });
  }

  update(delta: number = 0){
    //console.log('Camera.Update')
    let speed = ModelViewerControls.CameraMoveSpeed * delta;
    let speed2 = 0.5 * delta;

    let xoffset = 0;
    let yoffset = 0;

    let _cacheZ = this.context.camera.position.z;

    if(KotOR.Mouse.Dragging){
      xoffset = KotOR.Mouse.OffsetX || 0;
      yoffset = KotOR.Mouse.OffsetY || 0;

      //Reset the offset value to fix the lingering drag effect
      KotOR.Mouse.OffsetX = KotOR.Mouse.OffsetY = 0;
    }

    if(this.keys['w']){
      //console.log(this.AxisFront, this.AxisFront.clone().multiplyScalar(speed));
      this.context.camera.position.add(this.axisFront.clone().multiplyScalar(speed));
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['s']){
      //console.log(this.AxisFront.clone().multiplyScalar(speed));
      this.context.camera.position.sub(this.axisFront.clone().multiplyScalar(speed));
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['a']){
      this.context.camera.position.sub((new KotOR.THREE.Vector3().crossVectors(this.axisFront, this.context.camera.up)).multiplyScalar(speed));
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['d']){
      this.context.camera.position.add((new KotOR.THREE.Vector3().crossVectors(this.axisFront, this.context.camera.up)).multiplyScalar(speed));
      this.context.camera.updateProjectionMatrix();
    }

    this.context.camera.position.z = _cacheZ;

    if(this.keys['space']){
      this.context.camera.position.z += speed/2;
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['shift']){
      this.context.camera.position.z -= speed/2;
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['escape']){
      // if(this.editor instanceof ModelViewerTab){
      //   this.editor.selectionBox.visible = false;
      //   this.editor.selectionBox.update();
      //   this.editor.modelViewSideBarComponent.selected = null;
      // }
    }

    if(this.currentTool == EditorControlsTool.CAMERA_MOVE){

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

        this.axisUpdate();

      }

    }

    KotOR.Mouse.OldMouseX = KotOR.Mouse.MouseX;
    KotOR.Mouse.OldMouseY = KotOR.Mouse.MouseY;

  }


  axisUpdate(axisFront: KotOR.THREE.Vector3 = new KotOR.THREE.Vector3()){
    let front = new KotOR.THREE.Vector3();
    front.x = Math.cos(KotOR.THREE.MathUtils.degToRad(this.yaw)) * Math.cos(KotOR.THREE.MathUtils.degToRad(this.pitch));
    front.y = Math.sin(KotOR.THREE.MathUtils.degToRad(this.yaw)) * Math.cos(KotOR.THREE.MathUtils.degToRad(this.pitch));
    front.z = Math.sin(KotOR.THREE.MathUtils.degToRad(this.pitch));

    // if(axisFront != null)
    //   front = axisFront;

    this.axisFront = front.normalize();

    let lookAt = new KotOR.THREE.Vector3();
    lookAt.addVectors(this.context.camera.position, this.axisFront);
    this.context.camera.lookAt(lookAt);
    this.context.camera.updateProjectionMatrix();
  }

  plChangeCallback(e: any){
    // document.pointerLockElement = this.element;
    //console.log('ModelViewerControls', document.pointerLockElement, this.element);
    if(document.pointerLockElement === this.element) {
      //console.log('The pointer lock status is now locked');
      document.body.addEventListener("mousemove", this.plMoveEvent = (e: any) => { this.plMouseMove(e); }, true);
      KotOR.Mouse.Dragging = true;
    } else {
      //console.log('The pointer lock status is now unlocked');
      document.body.removeEventListener("mousemove", this.plMoveEvent as any, true);
      //this.plMoveEvent = undefined;
      KotOR.Mouse.Dragging = false;
      //document.removeEventListener('pointerlockchange', this.plEvent, true);
    }
  }

  plMouseMove(event: any){
    if(KotOR.Mouse.Dragging && (event.movementX || event.movementY)){
      let range = 100;
      //console.log(event.movementX, event.movementY);
      if(event.movementX > -range && event.movementX < range){
        KotOR.Mouse.OffsetX = event.movementX || 0;
      }
      if(event.movementY > -range && event.movementY < range){
        KotOR.Mouse.OffsetY = (event.movementY || 0)*-1.0;
      }
    }
  }

}
