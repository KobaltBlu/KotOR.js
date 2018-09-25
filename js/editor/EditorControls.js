class EditorControls {

  constructor(camera, element, editor){

    this.camera = camera;
    this.element = element || document;
    this.editor = editor;
    this.cameraMode = EditorControls.CameraMode.EDITOR;
    this.CameraMoveSpeed = 10.0;

    this.camera.AxisFront = new THREE.Vector3(0.0, 1.0, 0.0);
    this.camera.pitch = 0.00;
    this.camera.yaw = 0.0;

    this.signals = this.editor.signals;

    this.TOOL = {
      NONE: 0,
      SELECT: 1,
      OBJECT_MOVE: 1001,
      OBJECT_ROTATE: 1002,

      CAMERA_MOVE: 2001,
      CAMERA_ROTATE: 2002,

      PLACEABLE: 3001
    };

    this.CurrentTool = this.TOOL.SELECT;

    this.keys = {
      'w':false,
      'a':false,
      's':false,
      'd':false,
      'space':false,
      'shift':false
    };

    this.workerPointer = new Worker('worker/worker-pointer-raycaster.js');
    this.workerPointer.addEventListener('message', function(e) {
      this.workerPointerWorking = false;
    }, false);

    this.workerPointerWorking = false;

    this.element.requestPointerLock = this.element.requestPointerLock ||
			     this.element.webkitRequestPointerLock;

    // Ask the browser to release the pointer
    this.element.exitPointerLock = this.element.exitPointerLock ||
   			   this.element.webkitExitPointerLock;

    //document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);

    this.editor.$canvas.keydown( ( event ) => {
      //console.log(event.which)
      if ( event.which == 81 )
        this.keys['q'] = true;
      if ( event.which == 87 )
        this.keys['w'] = true;
      if ( event.which == 69 )
        this.keys['e'] = true;
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
      if ( event.which == 74 )
        this.keys['j'] = true;
      if ( event.which == 46 )
        this.keys['delete'] = true;



      if(this.keys['delete']){
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
      }
    }).keyup( ( event ) => {
      if ( event.which == 81 )
        this.keys['q'] = false;
      if ( event.which == 87 )
        this.keys['w'] = false;
      if ( event.which == 69 )
        this.keys['e'] = false;
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
      if ( event.which == 74 )
        this.keys['j'] = false;
      if ( event.which == 46 )
        this.keys['delete'] = false;
    }).mousedown((event) => {
      if(event.target == this.element){
        console.log('Valid Mouse Target');
        Mouse.ButtonState = event.which;
        Mouse.MouseDown = true;
        let parentOffset = this.editor.$canvas.offset();
        Mouse.MouseDownX = event.pageX - parentOffset.left;
        Mouse.MouseDownY = event.pageY - parentOffset.top;

        if(Mouse.ButtonState == Mouse.State.LEFT){
          //if(this.CurrentTool == this.TOOL.SELECT){
            let axisMoverSelected = false;
            this.editor.axes.selected = null;
            this.editor.raycaster.setFromCamera( Mouse.Vector, this.camera );
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
              this.editor.selectionBox.update();
              this.editor.selected = null;

              this.editor.axes.visible = false;

              if(intersects.length){

                let intersection = intersects[ 0 ],
                    obj = intersection.object;

                //console.log('Init', obj);
                obj.traverseAncestors( (obj) => {
                  if(obj instanceof THREE.AuroraModel){
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

      if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == Mouse.State.RIGHT){
        Mouse.Dragging = true;
        this.CurrentTool = this.TOOL.CAMERA_MOVE;
        // Ask the browser to lock the pointer
        //this.element.requestPointerLock();
      }else if(Mouse.MouseDown && !Mouse.Dragging && Mouse.ButtonState == Mouse.State.LEFT){
        Mouse.Dragging = true;
        this.CurrentTool = this.TOOL.OBJECT_MOVE;
      }

      this.editor.raycaster.setFromCamera( Mouse.Vector, this.camera );
      let intersections = this.editor.raycaster.intersectObjects( this.editor.group.rooms.children, true );
      let intersection = ( intersections.length ) > 0 ? intersections[ 0 ] : null;
			if ( intersection !== null) {
				Mouse.CollisionPosition = intersection.point;
			}

    }).mouseup((event) => {
      Mouse.MouseDown = false;
      Mouse.Dragging = false;
      Mouse.ButtonState = Mouse.State.NONE;

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
      this.editor.selectionBox.object = object || null;
      this.editor.selectionBox.visible = true;
      this.editor.selectionBox.update();

      console.log(this.editor.selectionBox);

      let centerX = this.editor.selectionBox.geometry.boundingSphere.center.x;
      let centerY = this.editor.selectionBox.geometry.boundingSphere.center.y;
      let centerZ = this.editor.selectionBox.geometry.boundingSphere.center.z;

      console.log(this.editor.axes, centerX, centerY, centerZ);

      this.editor.selected = object.children[0] || null;

      this.editor.axes.position.set(centerX, centerY, centerZ);
      this.editor.axes.visible = true;

  	} );

    this.AxisUpdate();

  }

  SetCameraMode(cameraMode){
    this.cameraMode = cameraMode;
  }

  Update(delta){

    let speed = this.CameraMoveSpeed * delta;
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

    this.editor.cursorGroup.position.set(Mouse.CollisionPosition.x, Mouse.CollisionPosition.y, Mouse.CollisionPosition.z);

    /*if(this.keys['q']){
      //console.log(this.AxisFront, this.AxisFront.clone().multiplyScalar(speed));
      this.camera.rotation.y += 1 * delta
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['e']){
      //console.log(this.AxisFront, this.AxisFront.clone().multiplyScalar(speed));
      this.camera.rotation.y -= 1 * delta
      this.camera.updateProjectionMatrix();
    }*/

    /*if(this.keys['w']){
      //console.log(this.AxisFront, this.AxisFront.clone().multiplyScalar(speed));
      this.camera.position.add(this.camera.AxisFront.clone().multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['s']){
      //console.log(this.AxisFront.clone().multiplyScalar(speed));
      this.camera.position.sub(this.camera.AxisFront.clone().multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['a']){
      this.camera.position.sub((new THREE.Vector3().crossVectors(this.camera.AxisFront, this.camera.up)).multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    if(this.keys['d']){
      this.camera.position.add((new THREE.Vector3().crossVectors(this.camera.AxisFront, this.camera.up)).multiplyScalar(speed));
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.z = _cacheZ;*/

    if(this.keys['space']){
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
      this.editor.selectionBox.update();
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
      front.x = Math.cos(this.camera.rotation.x) * THREE.Math.degToRad(this.camera.rotation.z);
      front.y = Math.sin(this.camera.rotation.x) * THREE.Math.degToRad(this.camera.rotation.z);
      front.z = Math.sin(this.camera.rotation.z);

      this.camera.AxisFront = front.normalize();

      let lookAt = new THREE.Vector3();
      lookAt.addVectors(this.camera.position, this.camera.AxisFront);
      this.camera.lookAt(lookAt);
      this.camera.updateProjectionMatrix();

    }

    if(this.CurrentTool == this.TOOL.CAMERA_MOVE){

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

    }

    if(this.CurrentTool == this.TOOL.OBJECT_MOVE && this.editor.selected != null){

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

        this.editor.selectionBox.update();

      }*/

    }

    //this.light.position = this.camera.position;

    if(this.editor.axes.visible){
      this.editor.axes.scale.setScalar(this.camera.position.distanceTo(this.editor.axes.position) * 0.25);
    }


    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;

  }


  AxisUpdate(axisFront = null){
    let front = new THREE.Vector3();
    front.x = Math.cos(THREE.Math.degToRad(this.camera.yaw)) * Math.cos(THREE.Math.degToRad(this.camera.pitch));
    front.y = Math.sin(THREE.Math.degToRad(this.camera.yaw)) * Math.cos(THREE.Math.degToRad(this.camera.pitch));
    front.z = Math.sin(THREE.Math.degToRad(this.camera.pitch));

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

}

EditorControls.CameraMode = {
  EDITOR: 0,
  STATIC: 1,
  ANIMATED: 2
};

module.exports = EditorControls;
