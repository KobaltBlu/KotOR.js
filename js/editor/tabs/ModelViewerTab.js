class ModelViewerTab extends EditorTab {
  constructor(file, isLocal = false){
    super();
    this.animLoop = false;
    this.deltaTime = 0;
    console.log('Model Viewer');
    $('a', this.$tab).text('Model Viewer');

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
            <li class="btn btn-tab" rel="#selected_object">Nodes</li>
          </ul>
        </div>
        <div class="tab-container">
          <div class="tab-content" id="camera">
            <b>Camera Speed</b><br>
            <input id="camera_speed" type="range" min="1" max="25" value="${EditorControls.CameraMoveSpeed}" />
            <button id="btn_camerahook">Align to camera hook</button>
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

            <ul id="node_tree_ele" class="tree css-treeview js"></ul>
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
      EditorControls.CameraMoveSpeed = parseInt(this.$ui_selected.$inputCameraSpeed.val());
      localStorage.setItem('camera_speed', EditorControls.CameraMoveSpeed);
    });

    this.$ui_selected.$btn_camerahook = $('#btn_camerahook', this.$ui_selected[0].$content);
    this.$ui_selected.$btn_camerahook.on('click', (e) => {
      e.preventDefault();
      if(this.model.camerahook instanceof THREE.Object3D){
        this.model.camerahook.getWorldPosition(this.camera.position);
        this.model.camerahook.getWorldQuaternion(this.camera.quaternion);
      }else{
        NotificationManager.Notify(NotificationManager.Types.WARNING, 'There is no camerahook present in this model.');
      }
    })

    //Animation Properties

    this.$ui_selected.$animSelect = $('select#animation_list', this.$ui_selected[0].$content);
    this.$ui_selected.$animLoop = $('input#anim_loop', this.$ui_selected[0].$content);

    let animations = this.model.animations.slice();
    animations.sort( (a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      let comparison = 0;
      if (nameA > nameB) {
        comparison = 1;
      } else if (nameA < nameB) {
        comparison = -1;
      }
      return comparison;
    });

    for(let i = 0; i < animations.length; i++){
      let name = animations[i].name.replace(/\0[\s\S]*$/g,'');
      this.$ui_selected.$animSelect.append('<option value="'+name+'">'+name+'</option>')
    }

    this.$ui_selected.$animSelect.on('change', () => {
      let val = this.$ui_selected.$animSelect.val();
      this.model.stopAnimation();
      if(val != '-1')
        this.model.playAnimation(val, this.animLoop)

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

    this.$ui_selected.$btn_change_texture.on('click', async (e) => {

      let originalTextureName = this.selected._node.TextureMap1;

      let payload = await dialog.showOpenDialog({
        title: 'Replace Texture',
        filters: [
          {name: 'TPC Image', extensions: ['tpc']},
          {name: 'TGA Image', extensions: ['tga']}
        ],
        properties: ['createDirectory'],
      });

      if(!payload.canceled && payload.filePaths.length){
        if(payload.filePaths.length){
          let file = payload.filePaths[0];
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

    //Node Tree Tab
    //this.$nodeTreeTab = $('#node_tree', this.$ui_selected.$tabHost);
    this.$nodeTreeEle = $('#node_tree_ele', this.$ui_selected.$tabHost);

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
            context: this, 
            onComplete: (model) => {
              this.model = model;
              //this.model.buildSkeleton();
              this.selectable.add(model);
              model.position.set(0, 0, 0);
              TextureLoader.LoadQueue(() => {
                console.log('Textures Loaded');
                this.TabSizeUpdate();
                this.UpdateUI();
                this.Render();
                this.BuildNodeTree();
                setTimeout( () => {
                  let center = model.box.getCenter();
                  if(!isNaN(center.length())){
                    //Center the object to 0
                    model.position.set(-center.x, -center.y, -center.z);
                    //Stand the object on the floor by adding half it's height back to it's position
                    //model.position.z += model.box.getSize().z/2;
                  }else{
                    model.position.set(0, 0, 0);
                  }
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
    this.depthTarget.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
  }

  BuildNodeTree(){

    let nodeList = [];
    this.treeIndex = 0;

    for (const [key, value] of this.model.nodes) {
      nodeList.push({
        name: key,
        type: 'resource',
        data: {
          node: value,
        },
        nodeList: []
      });
    }

    this.$nodeTreeEle.html(
      this.buildNodeList(nodeList)
    );

    $('li.link', this.$nodeTreeEle).off('click').on('click', (e) => {
      e.preventDefault();
      if(this.model.nodes.has(e.target.dataset.node)){
        this.select(this.model.nodes.get(e.target.dataset.node));
      }
      console.log(e.target.dataset.node);
    });

  }

  buildNodeList(nodeList = [], canOrphan = false){

    let str = '';
    if(nodeList instanceof Array){
      for(let i = 0; i < nodeList.length; i++){
        str += this.buildNodeList(nodeList[i], canOrphan);
      }
    }else{

      let node = nodeList;
      if(node.type == 'group'){
        if(node.nodeList.length == 1 && canOrphan){
          for(let i = 0; i < node.nodeList.length; i++){
            str += this.buildNodeList(node.nodeList[i], false);
          }
        }else{
          str += '<li><input type="checkbox" checked id="list-'+this.treeIndex+'"><label for="list-'+(this.treeIndex++)+'">'+node.name+'</label><span></span><ul>';
          for(let i = 0; i < node.nodeList.length; i++){
            str += this.buildNodeList(node.nodeList[i], true);
          }
          str += '</ul></li>';
        }
      }else{
        str += '<li class="link" data-node="'+node.name+'">'+node.name+'</li>';
      }

    }

    return str;

  }

  Render(){
    requestAnimationFrame( () => { this.Render(); } );
    if(!this.visible)
      return;

    this.selectionBox.update();

    let delta = this.clock.getDelta();
    this.controls.Update(delta);
    this.deltaTime += delta;
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
    }else if(this.selected instanceof THREE.Group){
      for(let i = 0; i < this.selected.children.length; i++){
        let child = this.selected.children[i];
        if(child instanceof THREE.Mesh){
          this.selected = child;
          this.$ui_selected.$selected_object.show();
          this.$ui_selected.$input_name.val(this.selected._node.name);
          this.$ui_selected.$input_texture.val(this.selected._node.TextureMap1);
          break;
        }
      }
    }else{
      this.$ui_selected.$selected_object.hide();
    }

    //let centerX = this.selectionBox.geometry.boundingSphere.center.x;
    //let centerY = this.selectionBox.geometry.boundingSphere.center.y;
    //let centerZ = this.selectionBox.geometry.boundingSphere.center.z;

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

    //let geo = new THREE.EdgesGeometry( new THREE.CylinderGeometry( 6, 1, 12, 4) ); // or WireframeGeometry( geometry )
    let mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
    let wireframe = new THREE.LineSegments( cbgeometry, mat );

    // Mesh
    //let cb = new THREE.Mesh( cbgeometry, new THREE.MeshFaceMaterial( cbmaterials ) );
    this.unselectable.add( wireframe );

  }

}

module.exports = ModelViewerTab;
