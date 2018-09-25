class ModelViewerTab extends EditorTab {
  constructor(file, isLocal = false){
    super();
    this.animLoop = true;
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
    this.camera = new THREE.PerspectiveCamera( 75, this.$tabContent.innerWidth() / this.$tabContent.innerHeight(), 0.1, 15000 );
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

    this.$animations = $('<div style="position: absolute; top: 25px; right: 25px; z-index:1000; height: auto!important;" />');

    //0x60534A
    this.globalLight = new THREE.AmbientLight(0xFFFFFF); //0x60534A
    this.globalLight.position.x = 0
    this.globalLight.position.y = 0
    this.globalLight.position.z = 0
    this.globalLight.intensity  = 1

    this.scene.add(this.globalLight);

    //this.BuildGround();

    /*this.grid = new THREE.GridHelper( 30, 60, 0xbbbbbb, 0x888888 );
	  this.scene.add( this.grid );*/

    this.controls = new ModelViewerControls(this.currentCamera, this.canvas, this);
    this.controls.AxisUpdate(); //always call this after the Yaw or Pitch is updated

    this.$tabContent.append($(this.stats.dom));
    this.$tabContent.append(this.$canvas);

    this.$tabContent.append(this.$animations);

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

    this.$animations.html('');

    this.$animSelect = $('<select />');
    this.$animLoop = $('<input type="checkbox" checked />');
    this.$animSelect.append('<option value="-1">None</option>');

    for(let i = 0; i < this.model.animations.length; i++){
      this.$animSelect.append('<option value="'+i+'">'+this.model.animations[i].name.replace(/\0[\s\S]*$/g,'')+'</option>')
    }

    this.$animSelect.on('change', () => {
      let val = parseInt(this.$animSelect.val());

      this.model.stopAnimation();

      if(val != '-1')
        this.model.playAnimation(this.model.animations[val], this.animLoop)

    });

    this.$animLoop.on('change', () => {
      this.animLoop = this.$animLoop.is(':checked');
      this.$animSelect.trigger('change');
    });

    this.$animations.append(this.$animSelect).append(this.$animLoop);

  }

  OpenFile(_file){

    console.log('Model Loading', _file);

    let info = Utility.filePathInfo(_file);

    console.log(info);

    if(info.location == 'local'){

      let file = path.parse(info.path);

      let mdlPath = path.join(file.dir, file.name+'.mdl');
      let mdxPath = path.join(file.dir, file.name+'.mdx');

      this.file = mdlPath;

      fs.readFile(mdlPath, (err, mdlBuffer) => {
        if (err) throw err;

        try{
          fs.readFile(mdxPath, (err, mdxBuffer) => {
            if (err){
              mdxBuffer = new Buffer(0);
            }

            try{
              let auroraModel = new AuroraModel(new BinaryReader(mdlBuffer), new BinaryReader(mdxBuffer));

              THREE.AuroraModel.FromMDL(auroraModel, { 
                onComplete: (model) => {
                  this.model = model;
                  //this.model.buildSkeleton();
                  this.scene.add(model);
                  model.currentAnimation = model.animations[3];
                  TextureLoader.LoadQueue(() => {
                    console.log('Textures Loaded');
                    this.TabSizeUpdate();
                    this.UpdateUI();
                    this.Render();
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
        catch (e) {
          console.log(e);
          this.Remove();
        }

      });

    }else if(info.location == 'archive'){

      switch(info.archive.type){
        case 'bif':
          Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes['mdl']), (mdlBuffer) => {
            Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes['mdx']), (mdxBuffer) => {
              try{

                let auroraModel = new AuroraModel( new BinaryReader(new Buffer(mdlBuffer)), new BinaryReader(new Buffer(mdxBuffer)) );

                console.log('Model Loaded', auroraModel);
                THREE.AuroraModel.FromMDL(auroraModel, { 
                  onComplete: (model) => {
                    this.model = model;
                    //this.model.buildSkeleton();
                    this.scene.add(model);
                    model.currentAnimation = model.animations[3];
                    TextureLoader.LoadQueue(() => {
                      console.log('Textures Loaded');
                      this.TabSizeUpdate();
                      this.UpdateUI();
                      this.Render();
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
            }, (e) => {
              throw 'Resource not found in BIF archive '+info.archive.name;
              this.Remove();
            });
          }, (e) => {
            throw 'Resource not found in BIF archive '+info.archive.name;
            this.Remove();
          });
        break;
      }

    }

    this.fileType = info.file.ext;
    this.location = info.location;

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

    var delta = this.clock.getDelta();
    this.controls.Update(delta);
    for(let i = 0; i < this.scene.children.length; i++){
      let obj = this.scene.children[i];
      if(obj instanceof THREE.AuroraModel){
        obj.update(delta);
      }
    }

    for(let i = 0; i < AnimatedTextures.length; i++){
      AnimatedTextures[i].Update(1000 * delta);
    }
    //this.scene.children[1].rotation.z += 0.01;
    this.renderer.clear();
    this.renderer.render( this.scene, this.currentCamera );
    this.stats.update();

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
    this.scene.add( wireframe );

  }

}

module.exports = ModelViewerTab;
