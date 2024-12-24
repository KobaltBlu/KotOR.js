import { EditorControlsTool } from "./enum/EditorControlsTool";

import * as KotOR from "./KotOR";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "./UI3DRenderer";
import * as THREE from 'three';

export class ModelViewerControls {

  context: UI3DRenderer;
  element: HTMLCanvasElement;

  axisFront: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
  lookAt: THREE.Vector3 = new THREE.Vector3();
  pitch: number = 0;
  yaw: number = 0;
  pointerLockVector: THREE.Vector2 = new THREE.Vector2();
  currentTool: EditorControlsTool;

  static CameraMoveSpeed: number = 10;

  _onKeyDown: (this: HTMLCanvasElement, ev: KeyboardEvent) => any;
  _onKeyUp: (this: HTMLCanvasElement, ev: KeyboardEvent) => any;
  _onMouseMove: (this: HTMLCanvasElement, ev: MouseEvent) => any;
  _onMouseDown: (this: HTMLCanvasElement, ev: MouseEvent) => any;
  _onMouseUp: (this: HTMLCanvasElement, ev: MouseEvent) => any;

  keys: any = {};

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

  processEventListener(key: string, data: any = undefined){
    let event = this.eventListeners.hasOwnProperty(key);
    if(!!event){
      event = this.eventListeners[key];
      event.forEach( (cb: Function) => {
        cb(data);
      });
    }
  }

  constructor(context: UI3DRenderer){

    this.context = context;

    this.axisFront = new THREE.Vector3(0.0, -1.0, 0.0);

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

    // this._onPointerLockChange = this.plChangeCallback.bind(this);

  }

  attachCanvasElement(canvas: HTMLCanvasElement){
    this.detachCanvasElement();
    this.element = canvas;

    if(this.element){
      this._onKeyDown = this.onKeyDown.bind(this);
      this._onKeyUp = this.onKeyUp.bind(this);
      this._onMouseMove = this.onMouseMove.bind(this);
      this._onMouseDown = this.onMouseDown.bind(this);
      this._onMouseUp = this.onMouseUp.bind(this);
      this.element.addEventListener('keydown', this._onKeyDown, false);
      this.element.addEventListener('keyup', this._onKeyUp, false);
      this.element.addEventListener('mousedown', this._onMouseDown, false);
      this.element.addEventListener('mousemove', this._onMouseMove, false);
      this.element.addEventListener('mouseup', this._onMouseUp, false);
    }
  }

  detachCanvasElement(){
    try{ document.exitPointerLock(); } catch(e) { console.error(e); }

    if(this.element){
      this.element.removeEventListener('keydown', this._onKeyDown);
      this.element.removeEventListener('keyup', this._onKeyUp);
      this.element.removeEventListener('mousedown', this._onMouseDown);
      this.element.removeEventListener('mousemove', this._onMouseMove);
      this.element.removeEventListener('mouseup', this._onMouseUp);
    }
  }

  onKeyDown(event: KeyboardEvent){
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
  }

  onKeyUp( event: KeyboardEvent ) {
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
  }

  onMouseMove(event: MouseEvent) {
    const offset = this.element.getBoundingClientRect();
    KotOR.Mouse.MouseX = event.pageX - offset.left;
    KotOR.Mouse.MouseY = event.pageY - offset.top;
    KotOR.Mouse.Vector.x = ( (KotOR.Mouse.MouseX) / this.element.width ) * 2 - 1;
    KotOR.Mouse.Vector.y = - ( (KotOR.Mouse.MouseY) / this.element.height ) * 2 + 1;

    if(KotOR.Mouse.MouseDown && !KotOR.Mouse.Dragging && KotOR.Mouse.ButtonState == KotOR.MouseState.RIGHT){
      KotOR.Mouse.Dragging = true;
      this.currentTool = EditorControlsTool.CAMERA_MOVE;
    }else if(KotOR.Mouse.MouseDown && !KotOR.Mouse.Dragging && KotOR.Mouse.ButtonState == KotOR.MouseState.LEFT){
      KotOR.Mouse.Dragging = true;
      this.currentTool = EditorControlsTool.CAMERA_MOVE;
    }
  }

  onMouseDown(event: MouseEvent) {
    if(event.target != this.element){
      return;
    }

    const offset = this.element.getBoundingClientRect();
    KotOR.Mouse.ButtonState = event.which;
    KotOR.Mouse.MouseDown = true;
    KotOR.Mouse.MouseX = event.pageX - offset.left;
    KotOR.Mouse.MouseY = event.pageY - offset.top;

    if(KotOR.Mouse.ButtonState != KotOR.MouseState.LEFT){
      // Ask the browser to lock the pointer
      this.element.requestPointerLock();
      return;
    }

    if(KotOR.Mouse.ButtonState == KotOR.MouseState.LEFT){
      //let axisMoverSelected = false;
      //this.editor.axes.selected = null;
      this.context.raycaster.setFromCamera( KotOR.Mouse.Vector, this.context.camera );
      /*let axisMoverIntersects = this.editor.renderComponent.raycaster.intersectObjects( this.editor.sceneOverlay.children, true );
      if(axisMoverIntersects.length){
        this.editor.axes.selected = axisMoverIntersects[0].object.name;
        axisMoverSelected = true;
      }*/

      const isObjectTransformControl = (intersection?: THREE.Intersection) => {
        if(!intersection) return false;
        return (intersection.object as any).isTransformControls 
          || (intersection.object as any).isTransformControlsGizmo 
          || (intersection.object as any).isTransformControlsPlane
      }

      //if(!axisMoverSelected){
        const selectable = [...this.context.selectable.children];

        if(this.context.transformControls.visible && this.context.transformControls.enabled){
          const gizmo = (this.context.transformControls as any)._gizmo.picker[
            this.context.transformControls.mode
          ]
          if(gizmo){
            selectable.push(gizmo);
          }
        }

        let intersects = this.context.raycaster.intersectObjects( selectable, true );
        if(intersects.length){
          let intersection = intersects.shift();
          this.processEventListener('onSelect', intersection);
        }else{
          this.processEventListener('onSelect', undefined);
        }
      //}
    }
  }

  onMouseUp(event: MouseEvent) {
    KotOR.Mouse.MouseDown = false;
    KotOR.Mouse.Dragging = false;
    KotOR.Mouse.ButtonState = KotOR.MouseState.NONE;

    // Ask the browser to release the pointer
    document.exitPointerLock();
  }

  dispose(){
    this.detachCanvasElement();
  }

  update(delta: number = 0){
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
      this.context.camera.position.add(this.axisFront.clone().multiplyScalar(speed));
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['s']){
      this.context.camera.position.sub(this.axisFront.clone().multiplyScalar(speed));
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['a']){
      this.context.camera.position.sub((new THREE.Vector3().crossVectors(this.axisFront, this.context.camera.up)).multiplyScalar(speed));
      this.context.camera.updateProjectionMatrix();
    }

    if(this.keys['d']){
      this.context.camera.position.add((new THREE.Vector3().crossVectors(this.axisFront, this.context.camera.up)).multiplyScalar(speed));
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

  axisUpdate(){
    this.axisFront.x = Math.cos(THREE.MathUtils.degToRad(this.yaw)) * Math.cos(THREE.MathUtils.degToRad(this.pitch));
    this.axisFront.y = Math.sin(THREE.MathUtils.degToRad(this.yaw)) * Math.cos(THREE.MathUtils.degToRad(this.pitch));
    this.axisFront.z = Math.sin(THREE.MathUtils.degToRad(this.pitch));

    this.axisFront.normalize();

    this.lookAt.set(0, 0, 0);
    this.lookAt.addVectors(this.context.camera.position, this.axisFront);
    this.context.camera.lookAt(this.lookAt);
    this.context.camera.updateProjectionMatrix();
  }

}
