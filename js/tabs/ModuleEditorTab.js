class ModuleEditorTab extends EditorTab {
  constructor(){
    super({
      toolbar: {
        items: [
          {name: 'Add', items: [
            {name: 'Doors', onClick: () => {
              this.addNewDoor();
            }},
            {name: 'Placeable', onClick: () => {
              this.addNewPlaceable();
            }},
            {name: 'Sound', onClick: () => {
              this.addNewSound();
            }}
          ]},
          {name: 'Toggle Creatures', icon: 'images/icon-creature.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.CREATURE);
          }},
          {name: 'Toggle Doors', icon: 'images/icon-door.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.DOOR);
          }},
          {name: 'Toggle Placeables', icon: 'images/icon-placeable.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.PLACEABLE);
          }},
          {name: 'Toggle Rooms', icon: 'images/icon-room.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.ROOM);
          }},
          {name: 'Toggle Sound Helpers', icon: 'images/icon-sound.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.SOUND);
          }},
          {name: 'Toggle Triggers', icon: 'images/icon-trigger.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.TRIGGER);
          }},
          {name: 'Toggle Waypoints', icon: 'images/icon-waypoint.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.WAYPOINT);
          }},
          {name: 'Toggle Walkmesh On/Off', icon: 'images/icon-walkmesh.png', onClick: () => {
            this.toggleNodeVisibility(ModuleEditorTab.NODES.WALKMESH);
          }}
        ]
      }
    });
    this.singleInstance = true;

    $('a', this.$tab).text('Module Editor');
    this.$stats = $('<div id="render-stats"></div>');
    //this.$tabContent.append(this.$canvas);

    this.toolbar = null;
    this.$toolbar = null;
    this.sidebar = null;
    this.$sidebar = null;

    this.$toolsUI = $('<div class="float-ui" style="z-index: 99;"><div class="float-ui-header"></div><div class="float-ui-content"><ul></ul></div></div>');
    this.toolsUI = this.$toolsUI[0];

    this.toolsUI.$header = $('float-ui-header', this.$toolsUI);
    this.toolsUI.$content = $('float-ui-content', this.$toolsUI);
    this.toolsUI.$list = $('ul', this.$toolsUI);

    this.toolsUI.tools = [
      { type: UIItem.TYPE.GLYPHICON,
        name : "Select",
        icon: 'glyphicon-hand-up',
        color: 'white',
        onClick: () => {
          this.axes.visible = false;
          this.controls.CurrentTool = this.controls.TOOL.SELECT;
        }
      },
      { type: UIItem.TYPE.GLYPHICON,
        name : "Move",
        icon: 'glyphicon-screenshot',
        color: 'green',
        onClick: () => {
          this.controls.CurrentTool = this.controls.TOOL.OBJECT_MOVE;
          this.axes.visible = true;
          this.axes.setMode('translate');
        }
      },
      { type: UIItem.TYPE.GLYPHICON,
        name : "Rotate",
        icon: 'glyphicon-retweet',
        color: 'blue',
        onClick: () => {
          this.controls.CurrentTool = this.controls.TOOL.OBJECT_ROTATE;
          this.axes.visible = true;
          this.axes.setMode('rotate');
        }
      }
    ];

    this.toolsUI.buildUI = () => {

      for(let i = 0; i < this.toolsUI.tools.length; i++){

        let tool = this.toolsUI.tools[i];
        tool.parent = this.toolsUI.$list;
        let uiItem = new UIItem(tool);

      }

    };

    this.toolsUI.init = () => {
      this.$tabContent.append(this.$toolsUI);
      this.$toolsUI.draggable({
        handle: '.float-ui-header',
        containment: this.$tabContent
      });
      this.toolsUI.buildUI();
    }

    this.toolsUI.init();

    this.walkmeshVisibility = false;
    this.isDestroyed = false;

    /* RENDERER Global variables */
    this.canvas = null;
    this.engine = null;
    this.audio = null;
    this.scene = null;
    this.sceneOverlay = null;
    this.camera = null;
    this.controls = null;
    this.selected = null;

    this.group = {
      creatures: new THREE.Group(),
      doors: new THREE.Group(),
      placeables: new THREE.Group(),
      rooms: new THREE.Group(),
      sounds: new THREE.Group(),
      triggers: new THREE.Group(),
      waypoints: new THREE.Group(),
      lights: new THREE.Group(),
      light_helpers: new THREE.Group(),
      emitters: new THREE.Group(),
      stunt: new THREE.Group()
    };

    this.emitters = {};
    this._emitters = {};

    this.group.creatures.visible = Config.options.Editor.Module.Helpers.creature.visible;
    this.group.doors.visible = Config.options.Editor.Module.Helpers.door.visible;
    this.group.placeables.visible = Config.options.Editor.Module.Helpers.placeable.visible;
    //this.group.rooms.visible = Config.options.Editor.Module.Helpers.room.visible;
    this.group.sounds.visible = Config.options.Editor.Module.Helpers.sound.visible;
    this.group.triggers.visible = Config.options.Editor.Module.Helpers.trigger.visible;
    this.group.waypoints.visible = Config.options.Editor.Module.Helpers.waypoint.visible;

    this.signals = {
		    objectSelected: new Signal(),
    		objectFocused: new Signal(),
    		objectAdded: new Signal(),
    		objectChanged: new Signal(),
    		objectRemoved: new Signal()
    };

    TemplateEngine.GetTemplateAsync('templates/editor-module-3d.html', {tabId: this.id}, (tpl) => {
      this.$tabContent.append(tpl);

      this.$container = $(this.ElementId('#container'), this.$tabContent);

      this.$containerRenderer = $(this.ElementId('#renderer'), this.$tabContent);

      this.$containerScene = $(this.ElementId('#project-templates'), this.$tabContent);

      this.$containerExplorer = $(this.ElementId('#project-explorer'), this.$tabContent);

      this.$containerObjProps = $(this.ElementId('#object-properties'), this.$tabContent);

      this.$container.layout();



      this.Init();

    });

  }

  EngineSizeUpdate(){
    setTimeout( () => {
      this.camera.aspect = this.$content.innerWidth() / this.$content.innerHeight();
      this.camera.updateProjectionMatrix();

      //Update the static cameras
      for(let i = 0; i < this.staticCameras.length; i++){
        this.staticCameras[i].aspect = this.$content.innerWidth() / this.$content.innerHeight();
        this.staticCameras[i].updateProjectionMatrix();
      }

      this.renderer.setSize( this.$content.innerWidth(), this.$content.innerHeight() );
    }, 1000 );
  }

  Render(){
    if(this.isDestroyed)
      return;

    requestAnimationFrame(  () => { this.Render(); }  );

    if(!this.visible)
      return;

    var delta = this.clock.getDelta();
    //this.axes.update();
    this.controls.Update(delta);

    editor3d.selectionBox.update()

    /*for(let i = 0; i < this.group.rooms.children.length; i++){
      let obj = this.group.rooms.children[i];
      if(obj instanceof THREE.AuroraModel){
        obj.update(delta);
      }
    }

    for(let i = 0; i < this.group.creatures.children.length; i++){
      let obj = this.group.creatures.children[i];
      if(obj instanceof THREE.AuroraModel){
        obj.update(delta);
      }
    }*/

    for(let i = 0; i < this.group.placeables.children.length; i++){
      let obj = this.group.placeables.children[i];
      if(obj instanceof THREE.AuroraModel){
        obj.update(delta);
      }
    }

    /*for(let i = 0; i < this.group.doors.children.length; i++){
      let obj = this.group.doors.children[i];
      if(obj instanceof THREE.AuroraModel){
        obj.update(delta);
      }
    }*/

    for(let i = 0; i < AnimatedTextures.length; i++){
      AnimatedTextures[i].Update(1000 * delta);
    }

    this.audio.Update(this.camera.position, this.camera.rotation);

    this.cam_controls.update();

    this.renderer.clear();
    this.renderer.render( this.scene, this.currentCamera );
    this.renderer.clearDepth();
    this.renderer.render( this.sceneOverlay, this.currentCamera );

    this.stats.update();

  }

  Init(){

    loader.Show();
    loader.SetMessage("Loading Module...");

    window.editor3d = this;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      autoClear: false,
      depth: false,
    });
    this.renderer.autoClear = false;
    //this.renderer.sortObjects = false;

    this.$content = $('<div style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; overflow: hidden;" />');
    this.$infoPane = $('<div class="info-pane" />');

    this.$containerRenderer.append(this.$content);

    this.renderer.setSize( this.$content.innerWidth(), this.$content.innerHeight() );

    this.canvas = this.renderer.domElement;
    this.$canvas = $(this.canvas);
    this.$canvas.addClass('noselect').attr('tabindex', 1);

    this.audio = new AudioEngine();

    this.clock = new THREE.Clock();
    this.stats = new Stats();

    this.$content.append($(this.stats.dom));
    this.$content.append(this.$canvas);
    this.$content.append(this.$infoPane);

    this.scene = new THREE.Scene();
    this.sceneOverlay = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 50, this.$content.innerWidth() / this.$content.innerHeight(), 0.1, 15000 );
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    //this.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    //this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

    //Static Camera's that are in the .git file of the module
    this.staticCameras = [];
    //Animates Camera's are MDL files that have a camera_hook and animations for use in dialog
    this.animatedCameras = [];

    this.staticCameraIndex = 0;
    this.animatedCameraIndex = 0;
    this.currentCamera = this.camera;

    this.raycaster = new THREE.Raycaster();

    this.axes = new THREE.TransformControls( this.currentCamera, this.canvas );//new THREE.AxisHelper(10);            // add axes
    this.axes.selected = null;
    this.scene.add(this.axes);

    //This works
    this.selectionBox = new THREE.BoundingBoxHelper(new THREE.Object3D(), 0xffffff);
    this.selectionBox.update();
    this.selectionBox.visible = false;
    this.scene.add( this.selectionBox );

    this.controls = new EditorControls(this.currentCamera, this.canvas, this);
    this.controls.AxisUpdate(); //always call this after the Yaw or Pitch is updated
    this.controls.SetCameraMode(EditorControls.CameraMode.EDITOR);

    this.cam_controls = new THREE.MapControls( this.camera, this.renderer.domElement );
    this.cam_controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    this.cam_controls.dampingFactor = 0.25;
    this.cam_controls.screenSpacePanning = false;
    this.cam_controls.minDistance = 10;
    this.cam_controls.maxDistance = 500;
    this.cam_controls.maxPolarAngle = Math.PI;
    this.cam_controls.panSpeed = .5;
    this.cam_controls.rotateSpeed = .1;

    //0x60534A
    this.globalLight = new THREE.AmbientLight(0xFFFFFF);
    this.globalLight.position.x = 0
    this.globalLight.position.y = 0
    this.globalLight.position.z = 0
    this.globalLight.intensity  = 0.5

    this.scene.add(this.globalLight);

    //this.camera.position.z = 2.5;

    this.doors = [];
    this.placeables = [];
    this.sounds = [];
    this.triggers = [];
    this.waypoints = [];
    this.creatures = [];

    this.scene.add(this.group.rooms);
    this.scene.add(this.group.placeables);
    this.scene.add(this.group.doors);
    this.scene.add(this.group.creatures);
    this.scene.add(this.group.waypoints);
    this.scene.add(this.group.sounds);
    this.scene.add(this.group.triggers);

    this.cursorGroup = new THREE.Group();
    this.scene.add(this.cursorGroup);

    Game.scene = this.scene;

    try{

      Module.FromProject(Global.Project.directory, (module) => {
        console.log('Module', module);
        this.module = module;
        this.globalLight.color.setHex('0x'+this.module.area.DynAmbientColor.toString(16));
  
        try{
          /*console.log('SunFog', this.module.area.SunFogOn == 1)
          if(this.module.area.SunFogOn == 1){
            console.log('SunFog', '0x'+this.module.area.SunFogColor.toString(16), this.module.area.SunFogNear, this.module.area.SunFogFar)
            this.scene.fog = new THREE.Fog(this.module.area.SunFogColor, this.module.area.SunFogNear, this.module.area.SunFogFar);
          }*/
        }
        catch(e){ console.error('SunFog error', e); }
  
        //this.camera.position.setX(this.module['Mod_Entry_X']);
        //this.camera.position.setY(this.module['Mod_Entry_Y']);
        //this.camera.position.setZ(this.module['Mod_Entry_Z'] + 2);
        //this.camera.rotation.set(Math.PI / 2, -Math.atan2(this.module['Mod_Entry_Dir_X'], this.module['Mod_Entry_Dir_Y']), 0);
  
        //this.camera.pitch = THREE.Math.radToDeg(this.camera.rotation.y) * -1;
        //this.camera.yaw = THREE.Math.radToDeg(this.camera.rotation.x);
  
        let ypr = this.toEulerianAngle(this.camera.quaternion);
  
        this.camera.pitch = THREE.Math.radToDeg(ypr.pitch);
        this.camera.yaw = THREE.Math.radToDeg(ypr.yaw) * -1;
  
        if (this.camera.pitch > 89.0)
            this.camera.pitch = 89.0;
        if (this.camera.pitch < -89.0)
            this.camera.pitch = -89.0;
  
        for(let i = 0; i < this.module.area.cameras.length; i++){
          let cam = this.module.area.cameras[i];
          cam.InitProperties();
          let camera = new THREE.PerspectiveCamera(cam.FieldOfView, this.$tabContent.innerWidth() / this.$tabContent.innerHeight(), 0.1, 1500);
          camera.up = new THREE.Vector3( 0, 0, 1 );
          camera.AxisFront = new THREE.Vector3(0.0, 1.0, 0.0);
          camera.position.set(cam.position.x, cam.position.y, cam.position.z + cam.Height);
  
          camera.rotation.set(Math.PI / 2, Math.atan2(cam.quaternion.x, cam.quaternion.w), 0);
  
          let ypr = this.toEulerianAngle(camera.quaternion);
  
          camera.pitch = THREE.Math.radToDeg(ypr.pitch);
          camera.yaw = THREE.Math.radToDeg(ypr.roll) * -1;
  
          if (camera.pitch > 89.0)
              camera.pitch = 89.0;
          if (camera.pitch < -89.0)
              camera.pitch = -89.0;
  
  
          //let euler = new THREE.Euler();
          //euler.setFromQuaternion(camera.quaternion);
          //camera.testEuler = euler;
          //camera.yaw = THREE.Math.radToDeg(euler.x) - 90;
          //camera.pitch = cam.Pitch - 90.0;
  
          //camera.yaw = ypr.pitch;
          //camera.pitch = cam.Pitch;// - 90.0;
  
          this.staticCameras.push(camera);
  
        }
  
        //this.module.rooms.reverse();
        this.loadScene( () => {
          this.buildSceneTree();
          loader.Dismiss();
          this.Render();
  
          this.updateInfoBox();
        });
      });

    }catch(e){
      console.log(e);
    }
    console.log('Init Engine');

    this.signals.objectSelected.add( ( object ) => {

      let $content = $('div > div', this.$containerObjProps);
      $content.html('');

      if(object != null){

        let $inputName = $('<input type="text" disabled />');
        let $inputTemplateResRef = $('<input type="text" disabled />');
        let $btnTemplateResRef = $('<button class="btn btn-default">Choose</button>');
        let $btnTemplateResRefEdit = $('<button class="btn btn-default">Edit</button>');

        $inputName.val(object.name);
        $inputTemplateResRef.val(object.moduleObject.props.TemplateResRef);

        $content.append($inputTemplateResRef).append($btnTemplateResRef).append($btnTemplateResRefEdit);

        $btnTemplateResRef.click( (e) => {
          e.preventDefault();

          let picker = new TemplateResRefPickerWizard({
            selected: object.moduleObject.props.TemplateResRef,
            restype: object.moduleObject.template.resType,
            onChoose: (selected) => {
              console.log(selected, object.moduleObject);

              loader.SetMessage('Loading Template...');
              loader.Show();
              object.moduleObject.template.ChangeTemplate(selected, (template) => {
                this.select(template.model);
                object.moduleObject.props.TemplateResRef = selected;
                $inputTemplateResRef.val(selected);
                loader.Dismiss();
              });
            }
          });

        });

        $btnTemplateResRefEdit.click( (e) => {
          e.preventDefault();

          if(object.moduleObject.template instanceof UTCObject){
            let newUTCTab = tabManager.AddTab(new UTCEditorTab({gff: object.moduleObject.template.gff}));
          }else if(object.moduleObject.template instanceof UTDObject){
            let newUTDTab = tabManager.AddTab(new UTDEditorTab({gff: object.moduleObject.template.gff}));
          }else if(object.moduleObject.template instanceof UTPObject){
            let newUTPTab = tabManager.AddTab(new UTPEditorTab({gff: object.moduleObject.template.gff}));
          }

        });


      }

      /*
      if(this.editor.selected != null){
        if(this.editor.selected.parent.moduleObject != null){
          console.log('Set Object')
          //objProps.SetObject(this.editor.selected.parent.moduleObject);
        }else{
          console.log('Can\'t Set Object')
        }
      }
      */

    });

  }

  BuildProjectExplorerTree(){
    let treeIndex = 0;

    $('.tree', this.$containerExplorer).html('');
    let $audioFiles = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Audio Files</label><span></span><ul></ul></li>');
    let $bpCreatures = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Creatures</label><span></span><ul></ul></li>');
    let $bpDoors = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Doors</label><span></span><ul></ul></li>');
    let $bpEncounters = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Encounters</label><span></span><ul></ul></li>');
    let $bpItems = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Items</label><span></span><ul></ul></li>');
    let $bpMerchants = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Merchants</label><span></span><ul></ul></li>');
    let $bpPlaceables = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Placeables</label><span></span><ul></ul></li>');
    let $bpSounds = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Sounds</label><span></span><ul></ul></li>');
    let $bpTriggers = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Triggers</label><span></span><ul></ul></li>');
    let $bpWaypoints = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Blueprint Waypoints</label><span></span><ul></ul></li>');
    let $bpModule = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Module Files</label><span></span><ul></ul></li>');
    let $dialogs = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Dialogs</label><span></span><ul></ul></li>');
    let $scripts = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Scripts</label><span></span><ul></ul></li>');
    let $scriptsCompiled =  $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Scripts Compiled</label><span></span><ul></ul></li>');
    let $otherFiles = $('<li><input class="node-toggle" type="checkbox" checked id="tree-'+(treeIndex)+'" /><label for="tree-'+(treeIndex++)+'">Other Files</label><span></span><ul></ul></li>');


    $('.tree', this.$containerExplorer)
    .append($audioFiles)
    .append($bpCreatures)
    .append($bpDoors)
    .append($bpEncounters)
    .append($bpItems)
    .append($bpMerchants)
    .append($bpPlaceables)
    .append($bpSounds)
    .append($bpTriggers)
    .append($bpWaypoints)
    .append($bpModule)
    .append($dialogs)
    .append($scripts)
    .append($scriptsCompiled)
    .append($otherFiles);

    $.each(Global.Project.files, function(i, file){
      let $pFile = $('<li><span class="glyphicon glyphicon-file"></span>&nbsp;'+file.filename+'</li>');
      let ext = file.path.split('\\').pop().split('.')[1];
      $pFile.data('file', file);
      $pFile.on('click', function(){
        FileTypeManager.onOpenFile(file);
      });

      let $branch = $otherFiles;

      switch(ext){
        case 'dlg':
          $branch = $dialogs;
        break;
        case 'nss':
          $branch = $scripts;
        break;
        case 'ncs':
          $branch = $scriptsCompiled;
        break;
        case 'utc':
          $branch = $bpCreatures;
        break;
        case 'utd':
          $branch = $bpDoors;
        break;
        case 'ute':
          $branch = $bpEncounters;
        break;
        case 'uti':
          $branch = $bpItems;
        break;
        case 'utm':
          $branch = $bpMerchants;
        break;
        case 'utp':
          $branch = $bpPlaceables;
        break;
        case 'uts':
          $branch = $bpSounds;
        break;
        case 'utt':
          $branch = $bpTriggers;
        break;
        case 'utw':
          $branch = $bpWaypoints;
        break;
        case 'git':
        case 'are':
        case 'lyt':
        case 'ifo':
        case 'git':
        case 'pth':
        case 'vis':
          $branch = $bpModule;
        break;
      }

      $('ul', $branch).append($pFile);

    });
  }

  toEulerianAngle(q){
  	let ysqr = q.y * q.y;

  	// roll (x-axis rotation)
  	let t0 = +2.0 * (q.w * q.x + q.y * q.z);
  	let t1 = +1.0 - 2.0 * (q.x * q.x + ysqr);
  	let roll = Math.atan2(t0, t1);

  	// pitch (y-axis rotation)
  	let t2 = +2.0 * (q.w * q.y - q.z * q.x);
  	t2 = t2 > 1.0 ? 1.0 : t2;
  	t2 = t2 < -1.0 ? -1.0 : t2;
  	let pitch = Math.asin(t2);

  	// yaw (z-axis rotation)
  	let t3 = +2.0 * (q.w * q.z + q.x *q.y);
  	let t4 = +1.0 - 2.0 * (ysqr + q.z * q.z);
  	let yaw = Math.atan2(t3, t4);

    return {yaw: yaw, pitch: pitch, roll: roll};
  }

  onResize () {
    super.onResize();
    try{
      this.EngineSizeUpdate();
    }catch(e){

    }
  }

  onDestroy(){
    super.onDestroy();
    this.audio.Destroy();
  }

  updateInfoBox(){

    this.$infoPane.text(`Camera X: ${this.currentCamera.position.x}, Y: ${this.currentCamera.position.y}, Z: ${this.currentCamera.position.z}`);
    setTimeout( () => { this.updateInfoBox() }, 250 );

  }

  select ( object ) {
    console.log('ModuleEditorTab', 'select', object);
    if(this.selected === object) return;

    this.axes.detach();
    this.axes.attach( object );
    this.axes.visible = true;

    this.selected = object;
    this.signals.objectSelected.dispatch( object );
  }

  toggleNodeVisibility(nodeType = 0){
    switch(nodeType){
      case ModuleEditorTab.NODES.ROOM:
        this.group.rooms.visible = !this.group.rooms.visible;
      break;
      case ModuleEditorTab.NODES.CREATURE:
        this.group.creatures.visible = !this.group.creatures.visible;
        Config.options.Editor.Module.Helpers.creature.visible = this.group.creatures.visible;
      break;
      case ModuleEditorTab.NODES.PLACEABLE:
        this.group.placeables.visible = !this.group.placeables.visible;
        Config.options.Editor.Module.Helpers.placeable.visible = this.group.placeables.visible;
      break;
      case ModuleEditorTab.NODES.DOOR:
        this.group.doors.visible = !this.group.doors.visible;
        Config.options.Editor.Module.Helpers.door.visible = this.group.doors.visible;
      break;
      case ModuleEditorTab.NODES.WAYPOINT:
        this.group.waypoints.visible = !this.group.waypoints.visible;
        Config.options.Editor.Module.Helpers.waypoint.visible = this.group.waypoints.visible;
      break;
      case ModuleEditorTab.NODES.TRIGGER:
        this.group.triggers.visible = !this.group.triggers.visible;
        Config.options.Editor.Module.Helpers.trigger.visible = this.group.triggers.visible;
      break;
      case ModuleEditorTab.NODES.SOUND:
        this.group.sounds.visible = !this.group.sounds.visible;
        Config.options.Editor.Module.Helpers.sound.visible = this.group.sounds.visible;
      break;
      case ModuleEditorTab.NODES.WALKMESH:
        console.log('Toggle walkmeshVisibility', this.group.rooms)
        this.walkmeshVisibility = !this.walkmeshVisibility;

        this.group.rooms.traverse( (node) => {
          if(node.isWalkmesh){
            console.log('setNodeVisibility', node);
            node.visible = this.walkmeshVisibility;
            node.traverse( (node) => {
              node.visible = this.walkmeshVisibility;
            });
          }
        });

        //Config.options.Editor.Module.Helpers.sound.visible = this.group.sounds.visible;
      break;
    }
    Config.Save(null, true);
  }

  addNewDoor() {

    var vec = this.getCameraBasedPos();

    let door = new ModuleDoor({
      'TemplateResRef': 'sw_door_dan1',
      'X': vec.x,
      'Y': vec.y,
      'Z': vec.z
    });
    loader.Show();
    loader.SetMessage('Loading Door');
    door.LoadTemplate( (template) => {
      template.LoadModel( (model) => {

        //console.log('loaded', modelName);
        model.translateX(door.props['X']);
        model.translateY(door.props['Y']);
        model.translateZ(door.props['Z']);

        model.rotation.set(0, 0, door.props['Bearing']);
        template.model.moduleObject = door;

        this.group.doors.add( model );

        loader.Dismiss();
      });
    });

  }

  addNewPlaceable () {

    var vec = this.getCameraBasedPos();

    let viewportSize = this.renderer.getSize();
    let viewportMiddle = new THREE.Vector2(viewportSize.width / 2, viewportSize.height / 2);

    this.raycaster.setFromCamera( viewportMiddle, this.currentCamera );
    let intersections = this.raycaster.intersectObjects( this.group.rooms.children, true );
    let intersection = ( intersections.length ) > 0 ? intersections[ 0 ] : null;
    console.log('addNewPlaceable', intersection, intersections);
    if ( intersection !== null) {
      vec = intersection.point;
    }

    this.cursorGroup = new THREE.Group();


    let plc = new ModulePlaceable(
      ModuleObject.TemplateFromJSON({
        'TemplateResRef': 'plc_footlker',
        'X': vec.x,
        'Y': vec.y,
        'Z': vec.z
      })
    );
    loader.Show();
    loader.SetMessage('Loading Placeable');
    plc.LoadTemplate( (template) => {
      template.LoadModel( (model) => {

        //model.translateX(plc.props['X']);
        //model.translateY(plc.props['Y']);
        //model.translateZ(plc.props['Z']);
        template.model.moduleObject = plc;
        model.rotation.set(0, 0, plc.props['Bearing']);

        this.cursorGroup.add( model );

        loader.Dismiss();
      });
    });
  }

  addNewSound () {

  }

  getCameraBasedPos () {
    let cx, cy, cz, lx, ly, lz;
    let dir = new THREE.Vector3(0,0,-1);

    dir.applyAxisAngle(new THREE.Vector3( 1, 0, 0 ), this.camera.rotation.x);
    dir.applyAxisAngle(new THREE.Vector3( 0, 1, 0 ), this.camera.rotation.y);
    dir.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.camera.rotation.z);
    let dist = -5;

    cx = this.camera.position.x;
    cy = this.camera.position.y;
    cz = this.camera.position.z;

    lx = dir.x;
    ly = dir.y;
    lz = dir.z;

    let l = Math.sqrt((dist*dist)/(lx*lx+ly*ly+lz*lz));

    let x1, x2;
    let y1, y2;
    let z1, z2;

    x1 = cx + lx*l;
    x2 = cx - lx*l;

    y1 = cy + ly*l;
    y2 = cy - ly*l;

    z1 = cz + lz*l;
    z2 = cz - lz*l;

    return {x: x1, y: y1, z: this.camera.position.z};
  }

  buildSceneTree(){
    $('#scene-tree').html('');
    let treeIndex = 0;

    let $nodeScene = $('<li><input class="node-toggle" type="checkbox" checked="checked" id="module-scene-tree-'+(treeIndex)+'"><label for="module-scene-tree-'+(treeIndex++)+'">Scene</label><span></span><ul></ul></li>');

    let $nodeSceneUL = $('ul', $nodeScene);

    for (var group in this.group) {
      if (this.group.hasOwnProperty(group)) {

        let $nodeGroup = $('<li><input class="node-toggle" type="checkbox" checked="" id="module-scene-tree-'+(treeIndex)+'"><label for="module-scene-tree-'+(treeIndex++)+'">'+group.titleCase()+'</label><span></span><ul></ul></li>');
        let $nodeGroupUL = $('ul', $nodeGroup);

        let len = this.group[group].children.length;
        let children = this.group[group].children;

        for(let i = 0; i < len; i++){
          let child = children[i];
          let nth = i+1;
          let $node = $('<li><label for="module-scene-tree-'+(treeIndex++)+'">'+group.slice(0, -1).titleCase()+' '+((nth < 10) ? ("0" + nth) : nth)+'</label><span></span></li>');
          $node.on('click', (e) => {
            e.preventDefault();

            if(child.moduleObject instanceof ModuleObject){
              if(child.moduleObject.template != null){

                if(child.moduleObject.template.model instanceof THREE.AuroraModel){
                  this.select(child.moduleObject.template.model);
                }

              }
            }

          });
          $nodeGroupUL.append($node);



        }

        $nodeSceneUL.append($nodeGroup);

      }
    }

    $('#scene-tree', this.$containerScene).append($nodeScene);




  }

  loadScene( onLoad = null ){

    Game.module.rooms = [];

    for(let ri = 0; ri != Game.module.area.rooms.length; ri++ ){
      let room = Game.module.area.rooms[ri];
      let linked_rooms = [];
      if(Game.module.area.visObject.GetRoom(room.RoomName)){
        linked_rooms = Game.module.area.visObject.GetRoom(room.RoomName).rooms;
      }
      //console.log(room.RoomName, Game.module.area.visObject.GetRoom(room.RoomName));
      Game.module.rooms.push( 
        new ModuleRoom({
          room: room, 
          linked_rooms: linked_rooms
        }) 
      );
    }

    this.loadDoors( () => {
      this.loadPlaceables( () => {
        this.loadCreatures( () => {
          //this.loadSoundTemplates( () => {
            //this.loadTriggers( () => {
              //this.loadWaypoints( () => {*/
                this.loadRooms( () => {
                  this.loadTextures( () => {
                    this.loadAudio( () => {
                      if(typeof onLoad === 'function')
                        onLoad();
                    });
                  });
                });
              //});
            //});
          //});
        });
      });
    });

  }

  loadDoors( onLoad = null, i = 0) {

    let loader = new AsyncLoop({
      array: this.module.area.doors,
      onLoop: (door, asyncLoop) => {
        
        door.Load( () => {
          door.LoadModel( (model) => {
            model.translateX(door.getX());
            model.translateY(door.getY());
            model.translateZ(door.getZ());

            model.rotation.set(0, 0, door.getBearing());
            door.model.box = door.box = new THREE.Box3().setFromObject(door.getModel());
            //model.rebuildEmitters();
            this.group.doors.add( model );

            asyncLoop._Loop();
          });
        });
      }
    });
    loader.Begin(() => {
      console.log('Done!')
      if(typeof onLoad === 'function')
        onLoad();
    });

  }


  loadPlaceables( onLoad = null, i = 0 ){
    console.log('load placeables', this.module.area.placeables);
    if(i < this.module.area.placeables.length){
      //console.log('i', i, this.area.placeables.length);
      let plc = this.module.area.placeables[i];
      plc.Load( () => {
        plc.LoadModel( (model) => {
          //plc.LoadWalkmesh(model.name, (pwk) => {
            //console.log('loaded', modelName);
            
            model.translateX(plc.getX());
            model.translateY(plc.getY());
            model.translateZ(plc.getZ());
            model.rotation.set(0, 0, plc.getBearing());
            try{ 
              //model.buildSkeleton();
              //model.rebuildEmitters(); 
            }catch(e){}
            //model.rebuildEmitters();

            this.group.placeables.add( model );

            try{
              //model.add(pwk.model);
              //model.pwk = pwk;
              //Game.walkmeshList.push(pwk.mesh);
            }catch(e){
              console.error('Failed to add pwk', model.name, pwk);
            }

            process.nextTick( () => {
              this.loadPlaceables( onLoad, ++i );
            })
          //});
        });
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadWaypoints( onLoad = null, i = 0 ){

    if(i < this.waypoints.length){
      let waypnt = this.waypoints[i];
      console.log('wli', i, this.waypoints.length);
      loader.SetMessage('Loading Waypoint: '+(i+1)+'/'+this.waypoints.length);

      waypnt.LoadTemplate( (template) => {

        template.LoadModel( (mesh) => {

          template.mesh.position.set(waypnt.props.XPosition, waypnt.props.YPosition, waypnt.props.ZPosition);

          template.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(waypnt.props['XOrientation'], waypnt.props['YOrientation']));

          template.mesh.moduleObject = waypnt;
          this.group.waypoints.add(template.mesh);

          i++;
          this.loadWaypoints( onLoad, i );
        });

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadTriggers( onLoad = null, i = 0 ){

    if(i < this.triggers.length){
      let trig = this.triggers[i];
      console.log('tli', i, this.triggers.length);
      loader.SetMessage('Loading Trigger: '+(i+1)+'/'+this.triggers.length);

      trig.LoadTemplate( (template) => {

        let type = template.gff.GetFieldByLabel('Type').Value;

        var trigGeom = new THREE.Geometry();

        //Push verticies
        for(let tgvi = 0; tgvi < trig.props.Geometry.length; tgvi++){
          let tgv = trig.props.Geometry[tgvi];
          trigGeom.vertices[tgvi] = new THREE.Vector3( tgv.PointX,  tgv.PointY, tgv.PointZ );
        }

        //Set Faces
        trigGeom.faces.push(
          new THREE.Face3(2,0,1),
          new THREE.Face3(3,0,2)
        );

        trigGeom.computeBoundingSphere();

        let material = new THREE.MeshBasicMaterial({
           color: new THREE.Color( 0xFFFFFF ),
           side: THREE.DoubleSide
        });

        switch(type){
          case UTTObject.Type.GENERIC:
            material.color.setHex(0xFF0000)
          break;
          case UTTObject.Type.TRANSITION:
            material.color.setHex(0x00FF00)
          break;
          case UTTObject.Type.TRAP:
            material.color.setHex(0xFFEB00)
          break;
        }

        template.mesh = new THREE.Mesh( trigGeom, material );
        template.mesh.position.set(trig.props.XPosition, trig.props.YPosition, trig.props.ZPosition);
        template.mesh.rotation.set(trig.props.XOrientation, trig.props.YOrientation, trig.props.ZOrientation);
        template.mesh.moduleObject = trig;
        this.group.triggers.add(template.mesh);

        i++;
        this.loadTriggers( onLoad, i );

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadCreatures( onLoad = null, i = 0 ){

    console.log('Loading Creature')

    if(i < this.module.area.creatures.length){
      //console.log('cli', i, this.area.creatures.length);
      
      let crt = this.module.area.creatures[i];
      crt.Load( () => {
        //crt.LoadScripts( () => {
          crt.LoadModel( (model) => {
            
            crt.model.moduleObject = crt;
            model.translateX(crt.getXPosition());
            model.translateY(crt.getYPosition());
            model.translateZ(crt.getZPosition());
            
            model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(crt.getXOrientation(), crt.getYOrientation()));

            model.hasCollision = true;
            model.name = crt.getTag();
            //try{ model.buildSkeleton(); }catch(e){}
            this.group.creatures.add( model );

            process.nextTick( () => {
              this.loadCreatures( onLoad, ++i );
            })
          });
        //});
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadRooms( onLoad = null, i = 0 ){

    console.log('Rooms:', this.module.rooms);

    if(i < this.module.rooms.length){
      let room = this.module.rooms[i];
      loader.SetMessage('Loading Model: '+room.room['RoomName']);
      console.log('loading ', room);
      if(!Utility.is2daNULL(room.room['RoomName'])){
        Game.ModelLoader.load({
          file: room.room['RoomName'],
          onLoad: (auroraModel) => {
            console.log('context', this);
            THREE.AuroraModel.FromMDL(auroraModel, {
              onComplete: (model) => {
                console.log(model);
                model.position.set(
                  parseFloat(room.room['x']), 
                  parseFloat(room.room['y']), 
                  parseFloat(room.room['z'])
                );
                model.moduleObject = room;
                this.group.rooms.add(model);
    
                console.log('loaded '+room.room['RoomName']);
                this.loadRooms(onLoad, ++i);
              },
              context: this,
              castShadow: false,
              receiveShadow: true
            });
          }
          
        });
      }else{
        this.loadRooms(onLoad, ++i);
      }
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadSoundTemplates ( onLoad = null, i = 0 ){

    if(i < this.sounds.length){
      console.log('sli', i, this.sounds.length);
      loader.SetMessage('Loading Sound: '+(i+1)+'/'+this.sounds.length);
      let snd = this.sounds[i];
      snd.LoadTemplate( (template) => {
        template.LoadSound( () => {
          template.LoadModel( (mesh) => {

            template.mesh.position.set(snd.props.XPosition, snd.props.YPosition, snd.props.ZPosition);
            template.mesh.moduleObject = snd;
            this.group.sounds.add(template.mesh);

            i++;
            this.loadSoundTemplates( onLoad, i );
          });
        });
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadAudio( onLoad = null ){

    let ambientDay = Global.kotor2DA['ambientsound'].rows[editor3d.module.audio.AmbientSndDay].resource;

    AudioLoader.LoadAmbientSound(ambientDay, (data) => {
      console.log('Loaded Ambient Sound', ambientDay);
      this.audio.SetAmbientSound(data);

      let bgMusic = Global.kotor2DA['ambientmusic'].rows[editor3d.module.audio.MusicDay].resource;

      AudioLoader.LoadMusic(bgMusic, (data) => {
        console.log('Loaded Background Music', bgMusic);
        this.audio.SetBackgroundMusic(data);
        if(typeof onLoad === 'function')
          onLoad();

      }, () => {
        console.error('Background Music not found', bgMusic);
        if(typeof onLoad === 'function')
          onLoad();
      });

    }, () => {
      console.error('Ambient Audio not found', ambientDay);
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  loadTextures( onLoad = null){
    TextureLoader.LoadQueue(() => {
      if(typeof onLoad === 'function')
        onLoad();
    }, (texName) => {
      loader.SetMessage('Loading Textures: '+texName);
    });
  }

}

ModuleEditorTab.NODES = {
  NA: 0,
  ROOM: 1,
  CREATURE: 2,
  PLACEABLE: 3,
  DOOR: 4,
  WAYPOINT: 5,
  TRIGGER: 6,
  SOUND: 7,
  WALKMESH: 8,
};

module.exports = ModuleEditorTab;
