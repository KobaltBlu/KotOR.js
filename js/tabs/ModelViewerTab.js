class ModelViewerTab extends EditorTab {
  constructor(file, isLocal = false){
    super();
    this.animLoop = false;
    console.log('Model Viewer');
    $('a', this.$tab).text('Model Viewer');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      autoClear: false
    });
    this.renderer.autoClear = false;
    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );

    this.clock = new THREE.Clock();
    this.stats = new Stats();

    this.scene = new THREE.Scene();

    this.selectable = new THREE.Group();
    this.unselectable = new THREE.Group();

    this.scene.add(this.selectable);
    this.scene.add(this.unselectable);

    this.camera = new THREE.PerspectiveCamera( 55, this.$tabContent.innerWidth() / this.$tabContent.innerHeight(), 0.1, 15000 );
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
      title: 'Model Viewer Tools'
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

    this.BuildGround();

    this.OpenFile(file);

  }

  UpdateUI(){

    this.$ui_selected[0].$content.html(`
      <div class="tab-host">
        <div class="tabs">
          <ul class="tabs-menu">
            <li class="btn btn-tab" rel="#camera">Camera</li>
            <li class="btn btn-tab" rel="#animations">Animation</li>
            <li class="btn btn-tab" rel="#selected_object">Object</li>
          </ul>
        </div>
        <div class="tab-container">
          <div class="tab-content" id="camera">
            <b>Camera Speed</b><br>
            <input id="camera_speed" type="range" min="1" max="25" value="${this.controls.CameraMoveSpeed}" />
          </div>
          <div class="tab-content" id="animations">
            <b>Animation List</b><br>
            <select id="animation_list">
              <option value="-1">None</option>
            </select>
            <b>Loop? </b><input type="checkbox" id="anim_loop"/>
          </div>
          <div class="tab-content" id="selected_object">
            <b>Name</b><br>
            <input id="selected_name" type="text" class="input" disabled />
            <b>Texture</b><br>
            <input id="selected_texture" type="text" class="input" disabled />
            <button id="selected_change_texture">Change Texture</button>
          </div>
        </div>
      </div>
    `);

    //Setup the tabs
    this.$ui_selected.$tabHost = $('.tab-host', this.$ui_selected[0].$content);

    $('.tabs-menu', this.$ui_selected.$tabHost).css({
      whiteSpace: 'initial',
      width: '100%',
      height: 'initial'
    });

    $('.tabs-menu > .btn-tab', this.$ui_selected.$tabHost).on('click', (e) => {
      e.preventDefault();
      $('.tabs-menu > .btn-tab', this.$ui_selected.$tabHost).removeClass('current');
      $(e.target).addClass('current');
      $('.tab-container .tab-content', this.$ui_selected.$tabHost).hide()
      $('.tab-container .tab-content'+e.target.attributes.rel.value, this.$ui_selected.$tabHost).show();
    });

    $('.tabs > .btn-tab[rel="#animations"]', this.$ui_selected.$tabHost).trigger('click');

    //Camera Properties
    this.$ui_selected.$inputCameraSpeed = $('input#camera_speed', this.$ui_selected[0].$content);
    this.$ui_selected.$inputCameraSpeed.on('change', () => {
      this.controls.CameraMoveSpeed = parseInt(this.$ui_selected.$inputCameraSpeed.val());
    });

    //Animation Properties

    this.$ui_selected.$animSelect = $('select#animation_list', this.$ui_selected[0].$content);
    this.$ui_selected.$animLoop = $('input#anim_loop', this.$ui_selected[0].$content);

    for(let i = 0; i < this.model.animations.length; i++){
      this.$ui_selected.$animSelect.append('<option value="'+i+'">'+this.model.animations[i].name.replace(/\0[\s\S]*$/g,'')+'</option>')
    }

    this.$ui_selected.$animSelect.on('change', () => {
      let val = parseInt(this.$ui_selected.$animSelect.val());

      this.model.stopAnimation();

      if(val != '-1')
        this.model.playAnimation(this.model.animations[val], this.animLoop)

    });

    this.$ui_selected.$animLoop.on('change', () => {
      this.animLoop = this.$ui_selected.$animLoop.is(':checked');
      this.$ui_selected.$animSelect.trigger('change');
    });

    //Selected Object Properties
    this.$ui_selected.$selected_object = $('div#selected_object', this.$ui_selected[0].$content);
    this.$ui_selected.$input_name = $('input#selected_name', this.$ui_selected[0].$content);
    this.$ui_selected.$input_texture = $('input#selected_texture', this.$ui_selected[0].$content);
    this.$ui_selected.$btn_change_texture = $('button#selected_change_texture', this.$ui_selected[0].$content);

    this.$ui_selected.$btn_change_texture.on('click', (e) => {

      let originalTextureName = this.selected._node.TextureMap1;

      let file = dialog.showOpenDialog({
        title: 'Replace Texture',
        filters: [
          {name: 'TPC Image', extensions: ['tpc']},
          {name: 'TGA Image', extensions: ['tga']}
      ]});
  
      if(typeof file != 'undefined' && file != null){
        if(file.length){
          file = file[0];
          let file_info = path.parse(file);
          TextureLoader.tpcLoader.fetch_local(file, (texture) => {
            this.selected._node.TextureMap1 = file_info.name;
            this.selected.material.uniforms.map.value = texture;
            this.selected.material.uniformsNeedsUpdate = true;

            let replaceAll = dialog.showMessageBox(
              remote.getCurrentWindow(), {
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Replace All',
                message: 'Would you like to replace all occurrences of the texture?'
              });

            if(replaceAll == 0){
              this.model.traverse( (obj) => {
                if(obj instanceof THREE.Mesh){
                  if(obj._node.TextureMap1.equalsIgnoreCase(originalTextureName)){
                    obj._node.TextureMap1 = file_info.name;
                    obj.material.uniforms.map.value = texture;
                    obj.material.uniformsNeedsUpdate = true;
                  }
                }
              });
            }

          });
        }
        
      }
    });

  }

  OpenFile(file){

    console.log('Model Loading', file);

    if(file instanceof EditorFile){

      file.readFile( (mdlBuffer, mdxBuffer) => {
        try{
          let auroraModel = new AuroraModel(new BinaryReader(mdlBuffer), new BinaryReader(mdxBuffer));

          try{
            this.$tabName.text(file.getFilename());
          }catch(e){}

          THREE.AuroraModel.FromMDL(auroraModel, {
            manageLighting: false,
            onComplete: (model) => {
              this.model = model;
              //this.model.buildSkeleton();
              this.selectable.add(model);

              TextureLoader.LoadQueue(() => {
                console.log('Textures Loaded');
                this.TabSizeUpdate();
                this.UpdateUI();
                this.Render();
                setTimeout( () => {
                  let center = model.box.getCenter();
                  //Center the object to 0
                  model.position.set(-center.x, -center.y, -center.z);
                  //Stand the object on the floor by adding half it's height back to it's position
                  //model.position.z += model.box.getSize().z/2;
                }, 10);
              }, (texName) => {
                // loader.SetMessage('Loading Textures: '+texName);
              });
            }
          });
        }
        catch (e) {
          console.log(e);
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

    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  TabSizeUpdate(){
    this.camera.aspect = this.$tabContent.innerWidth() / this.$tabContent.innerHeight();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
  }

  Render(){
    requestAnimationFrame( () => { this.Render(); } );
    if(!this.visible)
      return;

    this.selectionBox.update();

    var delta = this.clock.getDelta();
    this.controls.Update(delta);
    for(let i = 0; i < this.selectable.children.length; i++){
      let obj = this.selectable.children[i];
      if(obj instanceof THREE.AuroraModel){
        obj.update(delta);
      }
    }

    for(let i = 0; i < AnimatedTextures.length; i++){
      AnimatedTextures[i].Update(delta);
    }
    //this.scene.children[1].rotation.z += 0.01;
    this.renderer.clear();
    this.renderer.render( this.scene, this.currentCamera );
    this.stats.update();

  }

  select ( object ) {
    //console.log('ModuleEditorTab', 'select', object);
    if(this.selected === object) return;

    if(object == null || object == undefined) return;

    //this.axes.detach();
    //this.axes.attach( object );
    //this.axes.visible = true;

    this.selected = object;


    console.log('Signal', 'objectSelected', this.selected);
    this.selectionBox.object = this.selected;
    this.selectionBox.visible = true;
    this.selectionBox.update();

    console.log(this.selectionBox);

    if(this.selected instanceof THREE.Mesh){
      this.$ui_selected.$selected_object.show();
      this.$ui_selected.$input_name.val(this.selected._node.name);
      this.$ui_selected.$input_texture.val(this.selected._node.TextureMap1);
    }else{
      this.$ui_selected.$selected_object.hide();
    }

    let centerX = this.selectionBox.geometry.boundingSphere.center.x;
    let centerY = this.selectionBox.geometry.boundingSphere.center.y;
    let centerZ = this.selectionBox.geometry.boundingSphere.center.z;

    //console.log(this.editor.axes, centerX, centerY, centerZ);

    //this.editor.axes.position.set(centerX, centerY, centerZ);
    //this.editor.axes.visible = true;

    //this.signals.objectSelected.dispatch( object );
  }

  BuildGround(){

    // Geometry
    let cbgeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 25, 25, 25, 25 ));
    // Materials
    /*let cbmaterials = [];

    cbmaterials.push( new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide }) );
    cbmaterials.push( new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.DoubleSide }) );

    let l = cbgeometry.faces.length / 2; // <-- Right here. This should still be 8x8 (64)

    console.log("This should be 64: " + l);// Just for debugging puporses, make sure this is 64

    for( let i = 0; i < l; i ++ ) {
        let j = i * 2; // <-- Added this back so we can do every other 'face'
        cbgeometry.faces[ j ].materialIndex = ((i + Math.floor(i/8)) % 2); // The code here is changed, replacing all 'i's with 'j's. KEEP THE 8
        cbgeometry.faces[ j + 1 ].materialIndex = ((i + Math.floor(i/8)) % 2); // Add this line in, the material index should stay the same, we're just doing the other half of the same face
    }*/

    //var geo = new THREE.EdgesGeometry( new THREE.CylinderGeometry( 6, 1, 12, 4) ); // or WireframeGeometry( geometry )
    var mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
    var wireframe = new THREE.LineSegments( cbgeometry, mat );

    // Mesh
    //let cb = new THREE.Mesh( cbgeometry, new THREE.MeshFaceMaterial( cbmaterials ) );
    this.unselectable.add( wireframe );

  }

}

module.exports = ModelViewerTab;
