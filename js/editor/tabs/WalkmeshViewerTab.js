class WalkmeshViewerTab extends EditorTab {
  constructor(file, isLocal = false){
    super();
    this.animLoop = false;
    this.deltaTime = 0;
    console.log('Walkmesh Viewer');
    $('a', this.$tab).text('Walkmesh Viewer');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      autoClear: false,
      logarithmicDepthBuffer: true
    });
    this.renderer.autoClear = false;
    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );

    this.referenceNode = new THREE.Object3D();

    this.clock = new THREE.Clock();
    this.stats = new Stats();

    this.scene = new THREE.Scene();

    this.selectable = new THREE.Group();
    this.unselectable = new THREE.Group();

    this.scene.add(this.selectable);
    this.scene.add(this.unselectable);
    this.scene.add(this.referenceNode);

    this.camera = new THREE.PerspectiveCamera( 55, this.$tabContent.innerWidth() / this.$tabContent.innerHeight(), 0.01, 15000 );
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

    this.CameraMode = {
      EDITOR: 0,
      STATIC: 1,
      ANIMATED: 2
    };

    //Static Camera's that are in the .git file of the module
    this.staticCameras = [];
    //Animates Camera's are MDL files that have a camera_hook and animations for use in dialog
    this.animatedCameras = [];

    this.staticCameraIndex = 0;
    this.animatedCameraIndex = 0;
    this.cameraMode = this.CameraMode.EDITOR;
    this.currentCamera = this.camera;

    this.canvas = this.renderer.domElement;
    this.$canvas = $(this.canvas);

    this.$canvas.addClass('noselect').attr('tabindex', 1);

    this.$controls = $('<div style="position: absolute; top: 25px; right: 25px; z-index:1000; height: auto!important;" />');

    //0x60534A
    this.globalLight = new THREE.AmbientLight(0xFFFFFF); //0x60534A
    this.globalLight.position.x = 0
    this.globalLight.position.y = 0
    this.globalLight.position.z = 0
    this.globalLight.intensity  = 1

    this.unselectable.add(this.globalLight);

    //Raycaster
    this.raycaster = new THREE.Raycaster();

    let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
		this.depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
    this.depthTarget.texture.generateMipmaps = false;
    this.depthTarget.stencilBuffer = false;
    this.depthTarget.depthBuffer = true;
    this.depthTarget.depthTexture = new THREE.DepthTexture();
    this.depthTarget.depthTexture.type = THREE.UnsignedShortType;

    //this.axes = new THREE.TransformControls( this.currentCamera, this.canvas );//new THREE.AxisHelper(10);            // add axes
    //this.axes.selected = null;
    //this.unselectable.add(this.axes);

    //Selection Box Helper
    this.selectionBox = new THREE.BoundingBoxHelper(new THREE.Object3D(), 0xffffff);
    this.selectionBox.update();
    this.selectionBox.visible = false;
    this.unselectable.add( this.selectionBox );

    this.controls = new ModelViewerControls(this.currentCamera, this.canvas, this);
    this.controls.AxisUpdate(); //always call this after the Yaw or Pitch is updated

    this.$tabContent.append($(this.stats.dom));
    this.$tabContent.append(this.$canvas);
    this.$tabContent.append(this.$controls);

    this.$ui_selected = $('<div style="position: absolute; top: 0; right: 0; bottom: 0;" />');

    this.$ui_selected.windowPane({
      title: 'Walkmesh Viewer Tools'
    });

    this.$tabContent.append(this.$ui_selected);


    this.data = new Uint8Array(0);
    this.file = file;

    window.addEventListener('resize', () => {
      try{
        this.TabSizeUpdate();
      }catch(e){

      }
    });

    $('#container').layout({ applyDefaultStyles: false,
      onresize: () => {
        try{
          this.TabSizeUpdate();
        }catch(e){

        }
      }
    });

    //Variables
    this.data = {
      walkmesh: undefined,
      selectedFace: undefined
    };

    this.ractive = Ractive({
      target: $('.windowpane-content', this.$ui_selected)[0],
      template: `
      {{#if selectedFace}}
        <div class="section-header first">Selected Face</div>
        <b>Face Index:</b> {{walkmesh.faces.indexOf(selectedFace)}}<br>
        <b>Walk Type:</b> {{selectedFace.walkIndex}}
        
        {{#if selectedFace.adjacent}}
          <div class="section-header">Adjacent Faces</div>
          <b>a:</b> {{selectedFace.adjacent[0]}}, 
          <b>b:</b> {{selectedFace.adjacent[1]}}, 
          <b>c:</b> {{selectedFace.adjacent[2]}}
        {{/if}}

        {{#if selectedFace.surfacemat}}
          <div class="section-header">Surface Material: {{selectedFace.surfacemat.label}}</div>
          <b>Index:</b> {{selectedFace.surfacemat.__index}}, <br>
          <b>Walkable:</b> {{selectedFace.surfacemat.walk}}, <br>
          <b>Blocks LOS:</b> {{selectedFace.surfacemat.lineofsight}}, <br>
          <b>Grass:</b> {{selectedFace.surfacemat.grass}}, <br>
          <b>Sound:</b> {{selectedFace.surfacemat.sound}},
        {{/if}}

      {{/if}}
      `,
      data: this.data,
      on: {}
    });

    this.BuildGround();
    this.OpenFile(file);

    // Get mouse position
    this.mousePosition = new THREE.Vector2(1,1);
    this.mouseMoveEvent = (e) => {
      this.mousePosition.x = ((e.clientX - this.$canvas.offset().left) / this.canvas.width) * 2 - 1;
      this.mousePosition.y = -((e.clientY - this.$canvas.offset().top) / this.canvas.height) * 2 + 1;
    };
    this.mouseDownEvent = (e) => {

    };
    this.mouseUpEvent = (e) => {
      this.onMouseUp(e);
    };
    document.addEventListener('mousemove', this.mouseMoveEvent);
    this.canvas.addEventListener('mouseup', this.mouseUpEvent);
    this.canvas.addEventListener('mousedown', this.mouseDownEvent);

  }

  OpenFile(file){

    console.log('Walkmesh Loading', file);

    if(file instanceof EditorFile){

      file.readFile( (buffer) => {
        try{
          let wok = new AuroraWalkMesh(new BinaryReader(buffer));
          this.ractive.set('walkmesh', wok);

          try{
            this.$tabName.text(file.getFilename());
          }catch(e){}

          this.model = wok;
          this.selectable.add(this.model.mesh);
          //this.model.mesh.position.set(0, 0, 0);
          this.model.mesh.material.visible = true;

          this.wireMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } );
          this.wireframe = new THREE.Mesh(this.model.geometry, this.wireMaterial);
          this.unselectable.add(this.wireframe);

          this.TabSizeUpdate();
          this.Render();

          setTimeout( () => {
            let center = this.model.box.getCenter();
            if(!isNaN(center.length())){
              //Center the object to 0
              //this.model.mesh.position.set(-center.x, -center.y, this.model.box.getSize().z/2);
              //Stand the object on the floor by adding half it's height back to it's position
              //model.position.z += model.box.getSize().z/2;
            }else{
              //this.model.mesh.position.set(0, 0, 0);
            }
          }, 10);
        }
        catch (e) {
          console.error(e);
          this.Remove();
        }
      });

    }    

  }

  onResize() {
    super.onResize();

    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  onDestroy() {
    super.onDestroy();
    document.removeEventListener('mousemove', this.mouseMoveEvent);
    this.canvas.removeEventListener('mouseup', this.mouseUpEvent);
    this.canvas.removeEventListener('mousedown', this.mouseDownEvent);

    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  TabSizeUpdate(){
    this.camera.aspect = this.$tabContent.innerWidth() / this.$tabContent.innerHeight();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
    this.depthTarget.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
  }

  Render(){
    requestAnimationFrame( () => { this.Render(); } );
    if(!this.visible)
      return;

    this.selectionBox.update();

    let delta = this.clock.getDelta();
    this.controls.Update(delta);
    this.deltaTime += delta;

    this.renderer.clear();
    this.renderer.render( this.scene, this.currentCamera );
    this.stats.update();
  }

  onMouseUp(e){
    if(e.button == 0){
      let face = undefined;
      for (let i = 0, len = this.model.geometry.faces.length; i < len; i++) {
        face = this.model.geometry.faces[i];
        face.color.copy((AuroraWalkMesh.TILECOLORS[face.walkIndex] || AuroraWalkMesh.TILECOLORS[0]));
      }
      
      // Raycasting
      Game.raycaster.setFromCamera(this.mousePosition, this.currentCamera);
      this.hit = Game.raycaster.intersectObjects(this.model.mesh.parent.children);
      if (this.hit.length > 0) {
        this.selectedFace = this.hit[0].face;
        this.hit[0].face.color.setHex(0x607D8B);
        this.ractive.set('selectedFace', this.selectedFace);
      }else{
        this.ractive.set('selectedFace', undefined);
      }

      this.model.mesh.geometry.colorsNeedUpdate = true;
    }
  }

  BuildGround(){
    // Geometry
    let cbgeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 25, 25, 25, 25 ));
    let mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
    let wireframe = new THREE.LineSegments( cbgeometry, mat );
    this.unselectable.add( wireframe );
  }

}

module.exports = WalkmeshViewerTab;
