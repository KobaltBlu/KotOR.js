/* KotOR.js - A remake of the Odyssey Game Engine that powered KotOR I & II written in JavaScript
 */

const ConfigManager = require("../../ConfigManager");

/* @file
 * The main engine file that runs KotOR I.
 * It extends Engine.js which holds shared methods for both games.
 */

class Game extends Engine {

  static Init(){

    Game.ModelLoader = new THREE.MDLLoader();
    
    Game.Globals = {
      'Boolean': {},
      'Number': {},
      'String': {},
      'Location': {}
    };
    Game.models = [];

    Game.videoEffect = null;

    Game.activeGUIElement = undefined;
    Game.hoveredGUIElement = undefined;

    Game.time = 0;
    Game.deltaTime = 0;

    Game.canvas = document.createElement( 'canvas' );
    //Game.canvas = Game.renderer.domElement;
    Game.$canvas = $(Game.canvas);

    Game.$canvas.addClass('noselect').attr('tabindex', 1);
    $('#renderer-container').append(Game.$canvas);
    Game.canvas = Game.canvas.transferControlToOffscreen();
    Game.canvas.style = { width: 0, height: 0};
    Game.context = Game.canvas.getContext( 'webgl' );

    Game.rendererUpscaleFactor = 2;
    Game.renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas: Game.canvas,
      context: Game.context,
      logarithmicDepthBuffer: false,
      alpha: true
    });

    Game.renderer.autoClear = false;
    Game.renderer.setSize( $(window).innerWidth(), $(window).innerHeight() );
    Game.renderer.setClearColor(0x000000);

    let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
		Game.depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
    Game.depthTarget.texture.generateMipmaps = false;
    Game.depthTarget.stencilBuffer = false;
    Game.depthTarget.depthBuffer = true;
    Game.depthTarget.depthTexture = new THREE.DepthTexture();
    Game.depthTarget.depthTexture.type = THREE.UnsignedShortType;

    global.renderer = Game.renderer;

    Game.clock = new THREE.Clock();
    Game.stats = new Stats();

    Game.activeMenu = undefined;

    Game.limiter = {
      fps : 60,
      fpsInterval: 1000/60,
      startTime: Date.now(),
      now: 0,
      then: 0,
      elapsed: 0,
      setFPS: function(fps = 30){
        this.fps = fps;
        this.fpsInterval = 1000 / this.fps;
      }
    };

    Game.limiter.then = Game.limiter.startTime;

    Game.visible = true;

    Game.selected = undefined;
    Game.hovered = undefined;

    Game.scene = new THREE.Scene();
    Game.scene_gui = new THREE.Scene();
    Game.scene_cursor = new THREE.Scene();
    Game.frustumMat4 = new THREE.Matrix4();
    Game.camera = Game.followerCamera = new THREE.PerspectiveCamera( 55, $(window).innerWidth() / $(window).innerHeight(), 0.01, 15000 );

    Game.camera_shake = {
      position: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(0, 0, 0, 1),
      active: false,
      cache: {
        position: new THREE.Vector3(0, 0, 0),
        quaternion: new THREE.Quaternion(0, 0, 0, 1),
      },
      time: 0,
      beforeRender: () => {
        if(Game.Mode == Game.MODES.INGAME){
          //Cache the current camera properties
          Game.camera_shake.cache.position.copy(Game.currentCamera.position);
          //Game.camera_shake.cache.quaternion.copy(Game.currentCamera.quaternion);
        }
      },
      lsamples: [],
      rsamples: [],
      playRumblePattern: (idx = 0) => {
        Game.camera_shake.lsamples = [];
        Game.camera_shake.rsamples = [];
        Game.camera_shake.time = 0;
        let rumble = Global.kotor2DA.rumble.rows[idx];
        let lsamples = parseInt(rumble.lsamples);
        let rsamples = parseInt(rumble.rsamples);
        
        for(let i = 0; i < lsamples; i++){
          Game.camera_shake.lsamples.push({
            lmagnitude: parseFloat(rumble['lmagnitude'+(i+1)]),
            ltime: parseFloat(rumble['ltime'+(i+1)]),
            ltimeMax: parseFloat(rumble['ltime'+(i+1)])
          })
        }
        
        for(let i = 0; i < rsamples; i++){
          Game.camera_shake.rsamples.push({
            rmagnitude: parseFloat(rumble['rmagnitude'+(i+1)]),
            rtime: parseFloat(rumble['rtime'+(i+1)]),
            rtimeMax: parseFloat(rumble['rtime'+(i+1)])
          })
        }

      },
      stopRumblePattern: () => {
        Game.camera_shake.lsamples = [];
        Game.camera_shake.rsamples = [];
        Game.camera_shake.time = 0;
      },
      update: (delta) => {
        if(Game.Mode == Game.MODES.INGAME){

          Game.camera_shake.position.set(0, 0, 0);

          for(let i = 0; i < Game.camera_shake.lsamples.length; i++){
            let sample = Game.camera_shake.lsamples[i];
            if(sample.ltime > 0){
              let lPower = (sample.ltime/sample.ltimeMax);

              Game.camera_shake.position.x += (((Math.random() * 2 - 1) * sample.lmagnitude) * lPower) * .1;

              sample.ltime -= delta*2;
            }
          }

          for(let i = 0; i < Game.camera_shake.rsamples.length; i++){
            let sample = Game.camera_shake.rsamples[i];
            if(sample.rtime > 0){
              let rPower = (sample.rtime/sample.rtimeMax);

              Game.camera_shake.position.y += (((Math.random() * 2 - 1) * sample.rmagnitude) * rPower) * .1;

              sample.rtime -= delta*2;
            }
          }

          Game.camera_shake.position.applyQuaternion(Game.currentCamera.quaternion);
          Game.currentCamera.position.add(Game.camera_shake.position);

        }
      },
      afterRender: () => {
        if(Game.Mode == Game.MODES.INGAME){
          //Restore the current camera's cached properties
          Game.currentCamera.position.copy(Game.camera_shake.cache.position);
          //Game.currentCamera.copy(Game.camera_shake.cache.quaternion);
        }
      }
    };

    Game.camera_dialog = new THREE.PerspectiveCamera( 55, $(window).innerWidth() / $(window).innerHeight(), 0.01, 15000 );
    Game.camera_dialog.up = new THREE.Vector3( 0, 0, 1 );
    Game.camera_animated = new THREE.PerspectiveCamera( 55, $(window).innerWidth() / $(window).innerHeight(), 0.01, 15000 );
    Game.camera_animated.up = new THREE.Vector3( 0, 1, 0 );
    Game.camera.up = new THREE.Vector3( 0, 0, 1 );
    Game.camera.position.set( .1, 5, 1 );              // offset the camera a bit
    Game.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    
    Game.camera_gui = new THREE.OrthographicCamera(
      $(window).innerWidth() / -2,
      $(window).innerWidth() / 2,
      $(window).innerHeight() / 2,
      $(window).innerHeight() / -2,
      1, 1000
    );
    Game.camera_gui.up = new THREE.Vector3( 0, 0, 1 );
    Game.camera_gui.position.z = 500;
    Game.camera_gui.updateProjectionMatrix();
    Game.scene_gui.add(new THREE.AmbientLight(0x60534A));
    Game.scene_cursor.position.z = 450;

    Game.CameraMode = {
      EDITOR: 0,
      STATIC: 1,
      ANIMATED: 2
    };

    Game.followerCamera.facing = Math.PI/2;
    Game.followerCamera.speed = 0;

    //Static Camera's that are in the .git file of the module
    Game.staticCameras = [];
    //Animates Camera's are MDL files that have a camera_hook and animations for use in dialog
    Game.animatedCameras = [];

    Game.staticCameraIndex = 0;
    Game.animatedCameraIndex = 0;
    Game.cameraMode = Game.CameraMode.EDITOR;
    Game.currentCamera = Game.camera;

    Game.viewportFrustum = new THREE.Frustum();
    Game.viewportProjectionMatrix = new THREE.Matrix4();

    //0x60534A
    Game.globalLight = new THREE.AmbientLight(0xFFFFFF);
    Game.globalLight.position.x = 0;
    Game.globalLight.position.y = 0;
    Game.globalLight.position.z = 0;
    Game.globalLight.intensity  = 1;

    Game.scene.add(Game.globalLight);

    Game.player = undefined;//new ModuleCreature();//THREE.Object3D();
    Game.playerFeetOffset = new THREE.Vector3(0,0,1);

    Game.collisionList = [];
    Game.walkmeshList = [];
    Game.emitters = {};
    Game.group = {
      creatures: new THREE.Group(),
      doors: new THREE.Group(),
      placeables: new THREE.Group(),
      rooms: new THREE.Group(),
      grass: new THREE.Group(),
      sounds: new THREE.Group(),
      triggers: new THREE.Group(),
      waypoints: new THREE.Group(),
      party: new THREE.Group(),
      lights: new THREE.Group(),
      light_helpers: new THREE.Group(),
      shadow_lights: new THREE.Group(),
      emitters: new THREE.Group(),
      effects: new THREE.Group(),
      stunt: new THREE.Group(),
      weather_effects: new THREE.Group(),
      room_walkmeshes: new THREE.Group(),
    };

    Game.weather_effects = [];

    Game.scene.add(Game.group.rooms);
    Game.scene.add(Game.group.grass);
    Game.scene.add(Game.group.placeables);
    Game.scene.add(Game.group.doors);
    Game.scene.add(Game.group.creatures);
    //Game.scene.add(Game.group.waypoints);
    //Game.scene.add(Game.group.sounds);
    Game.scene.add(Game.group.triggers);
    Game.scene.add(Game.group.stunt);
    Game.scene.add(Game.group.weather_effects);

    Game.scene.add(Game.group.lights);
    Game.scene.add(Game.group.light_helpers);
    Game.scene.add(Game.group.shadow_lights);
    Game.scene.add(Game.group.emitters);
    Game.scene.add(Game.group.effects);

    Game.scene.add(Game.group.party);
    Game.scene.add(Game.group.room_walkmeshes);

    Game.group.light_helpers.visible = false;

    Game.octree = new THREE.Octree({
      // when undeferred = true, objects are inserted immediately
      // instead of being deferred until next octree.update() call
      // this may decrease performance as it forces a matrix update
      undeferred: false,
      // set the max depth of tree
      depthMax: Infinity,
      // max number of objects before nodes split or merge
      objectsThreshold: 8,
      // percent between 0 and 1 that nodes will overlap each other
      // helps insert objects that lie over more than one node
      overlapPct: 0.15,
      // pass the scene to visualize the octree
      scene: Game.scene
    });

    Game.octree.visualMaterial.visible = false

    Game.octree_walkmesh = new THREE.Octree({
      // when undeferred = true, objects are inserted immediately
      // instead of being deferred until next octree.update() call
      // this may decrease performance as it forces a matrix update
      undeferred: false,
      // set the max depth of tree
      depthMax: Infinity,
      // max number of objects before nodes split or merge
      objectsThreshold: 8,
      // percent between 0 and 1 that nodes will overlap each other
      // helps insert objects that lie over more than one node
      overlapPct: 0.15,
      // pass the scene to visualize the octree
      scene: Game.scene
    });

    Game.octree_walkmesh.visualMaterial.visible = false

    Game.interactableObjects = new THREE.Group();

    Game.interactableObjects = [
      Game.group.placeables, 
      Game.group.doors, 
      Game.group.creatures, 
      Game.group.party,
      //Game.group.rooms
      Game.group.room_walkmeshes
    ];

    Game.scene_cursor_holder = new THREE.Group();
    Game.scene_cursor.add(Game.scene_cursor_holder);

    Game.controls = new IngameControls(Game.currentCamera, Game.canvas, Game);

    $('#renderer-container').append(Game.stats.dom);
    if(!Config.get('Game.debug.show_fps'))
      Game.stats.showPanel(false);

    /* Fade Geometry */
    Game.FadeOverlay = {
      fading: false,
      length: 0,
      elapsed: 0,
      state: 0,
      STATES: {
        NONE: 0,
        FADING_IN: 1,
        FADING_OUT: 2,
        FADED_IN: 3,
        FADED_OUT: 4
      },
      FadeOut: function(length = 0, r = 0, g = 0, b = 0){
        //Game.FadeOverlay.material.opacity = 0;
        Game.FadeOverlay.material.visible = true;
        Game.FadeOverlay.material.color.setRGB(r,g,b);
        Game.FadeOverlay.length = length*2;
        Game.FadeOverlay.elapsed = 0;
        Game.FadeOverlay.state = Game.FadeOverlay.STATES.FADING_OUT;
      },
      FadeIn: function(length = 0, r = 0, g = 0, b = 0){
        //Game.FadeOverlay.material.opacity = 1;
        Game.FadeOverlay.material.visible = true;
        Game.FadeOverlay.material.color.setRGB(r,g,b);
        Game.FadeOverlay.length = length*2;
        Game.FadeOverlay.elapsed = 0;
        Game.FadeOverlay.state = Game.FadeOverlay.STATES.FADING_IN;
      },
      Update(delta = 0){

        if(Game.FadeOverlay.state == Game.FadeOverlay.STATES.NONE || Game.FadeOverlay.state == Game.FadeOverlay.STATES.FADED_IN || Game.FadeOverlay.state == Game.FadeOverlay.STATES.FADED_OUT){
          return;
        }

        Game.FadeOverlay.elapsed += 1*delta;

        if(Game.FadeOverlay.elapsed > Game.FadeOverlay.length){
          Game.FadeOverlay.elapsed = Game.FadeOverlay.length;
        }

        switch(Game.FadeOverlay.state){
          case Game.FadeOverlay.STATES.FADING_IN:
            if(Game.FadeOverlay.elapsed >= Game.FadeOverlay.length){
              Game.FadeOverlay.material.visible = false;
            }else{
              Game.FadeOverlay.material.opacity += ( 0 - Game.FadeOverlay.material.opacity ) * (Game.FadeOverlay.elapsed / Game.FadeOverlay.length);
              if(isNaN(Game.FadeOverlay.material.opacity)){
                Game.FadeOverlay.material.opacity = 0;
              }
            }

            if(Game.FadeOverlay.elapsed >= Game.FadeOverlay.length){
              Game.FadeOverlay.state = Game.FadeOverlay.STATES.FADED_IN;
            }
          break;
          case Game.FadeOverlay.STATES.FADING_OUT:
            Game.FadeOverlay.material.opacity += ( 1 - Game.FadeOverlay.material.opacity ) * (Game.FadeOverlay.elapsed / Game.FadeOverlay.length);
            if(isNaN(Game.FadeOverlay.material.opacity)){
              Game.FadeOverlay.material.opacity = 1;
            }

            if(Game.FadeOverlay.elapsed >= Game.FadeOverlay.length){
              Game.FadeOverlay.state = Game.FadeOverlay.STATES.FADED_OUT;
            }
          break;
        }

      }
    };
    Game.FadeOverlay.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    Game.FadeOverlay.material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0} );
    Game.FadeOverlay.plane = new THREE.Mesh( Game.FadeOverlay.geometry, Game.FadeOverlay.material );
    Game.scene_gui.add( Game.FadeOverlay.plane );
    Game.FadeOverlay.plane.position.z = 499;
    Game.FadeOverlay.plane.renderOrder = Infinity;
    Game.FadeOverlay.material.visible = false;

    //BEGIN: PostProcessing

    Game.composer = new THREE.EffectComposer(Game.renderer);
    Game.renderPass = new THREE.RenderPass(Game.scene, Game.currentCamera);
    //Game.renderPassAA = new THREE.SSAARenderPass (Game.scene, Game.currentCamera);
    Game.saturationPass = new THREE.ShaderPass(saturationShader);
    Game.colorPass = new THREE.ShaderPass(THREE.ColorCorrectionShader);
    Game.copyPass = new THREE.ShaderPass(THREE.CopyShader);
    Game.renderPassGUI = new THREE.RenderPass(Game.scene_gui, Game.camera_gui);
    Game.renderPassCursor = new THREE.RenderPass(Game.scene_cursor, Game.camera_gui);
    
    Game.bloomPass = new THREE.BloomPass(0.5);
    Game.bokehPass = new THREE.BokehPass(Game.scene, Game.currentCamera, {
      focus: 1.0,
      aperture:	0.0001,
      maxblur:	1.0,
      width: Game.renderer.width,
      height: Game.renderer.height
    });
    Game.filmPass = new THREE.FilmPass(1, 0.325, 512, false);

    //Game.renderPassAA.sampleLevel = 1;

    Game.renderPass.renderToScreen = true;
    Game.copyPass.renderToScreen = false;
    Game.renderPassGUI.renderToScreen = false;
    Game.renderPassCursor.renderToScreen = false;

    Game.renderPass.clear = true;
    Game.bloomPass.clear = false;
    Game.filmPass.clear = false;
    Game.colorPass.clear = false;
    Game.saturationPass.clear = false;
    //Game.renderPassAA.clear = false;
    Game.copyPass.clear = false;
    Game.renderPassGUI.clear = false;
    Game.renderPassCursor.clear = false;
    Game.renderPassGUI.clearDepth = true;

    Game.colorPass.uniforms.powRGB.value.set(1,1,1);
    Game.colorPass.uniforms.mulRGB.value.set(0.5,.5,.5);

    Game.bokehPass.needsSwap = true;
    Game.bokehPass.enabled = false;

    Game.composer.addPass(Game.renderPass);
    //Game.composer.addPass(Game.bokehPass);
    //Game.composer.addPass(Game.renderPassAA);
    //Game.composer.addPass(Game.filmPass);
    //Game.composer.addPass(Game.colorPass);
    //Game.composer.addPass(Game.saturationPass);
    //Game.composer.addPass(Game.bloomPass);

    Game.composer.addPass(Game.renderPassGUI);
    Game.composer.addPass(Game.renderPassCursor);
    Game.composer.addPass(Game.copyPass);

    Game.renderPass.clearDepth = true;
    Game.renderPassGUI.clearDepth = true;
    Game.renderPassCursor.clearDepth = true;
    Game.renderPass.clear = true;
    Game.renderPassGUI.clear = false;
    Game.renderPassCursor.clear = false;
    Game.renderPass.needsSwap = false;
    Game.renderPassGUI.needsSwap = false;
    Game.renderPassCursor.needsSwap = false;

    $( window ).resize(() => {

      let width = $(window).innerWidth();
      let height = $(window).innerHeight();

      Game.composer.setSize(width * Game.rendererUpscaleFactor, height * Game.rendererUpscaleFactor);

      Game.FadeOverlay.plane.scale.set(width, height, 1);
      
      Game.camera_gui.left = width / -2;
      Game.camera_gui.right = width / 2;
      Game.camera_gui.top = height / 2;
      Game.camera_gui.bottom = height / -2;

      Game.camera_gui.updateProjectionMatrix();

      Game.camera.aspect = width / height;
      Game.camera.updateProjectionMatrix();

      Game.renderer.setSize(width, height);  
      
      Game.camera_dialog.aspect = Game.camera.aspect;
      Game.camera_dialog.updateProjectionMatrix();

      Game.camera_animated.aspect = Game.camera.aspect;
      Game.camera_animated.updateProjectionMatrix();

      for(let i = 0; i < Game.staticCameras.length; i++){
        Game.staticCameras[i].aspect = Game.camera.aspect;
        Game.staticCameras[i].updateProjectionMatrix();
      }

      //Game.bokehPass.renderTargetColor.setSize(width * Game.rendererUpscaleFactor, height * Game.rendererUpscaleFactor);

      /*if(Game.scene_gui.background != null){
        let x = width / 1600;
        let y = height / 1200;

        Game.scene_gui.background.repeat.set(x, y);
        Game.scene_gui.background.offset.set( (1.0 - x) / 2, (1.0 - y) / 2);
      }*/

      Game.screenCenter.x = ( (window.innerWidth/2) / window.innerWidth ) * 2 - 1;
      Game.screenCenter.y = - ( (window.innerHeight/2) / window.innerHeight ) * 2 + 1; 

      MenuManager.Resize();

      Game.depthTarget.setSize(window.innerWidth * Game.rendererUpscaleFactor, window.innerHeight * Game.rendererUpscaleFactor);
      
    });
    console.log('Game: Start')
    Game.Start();

  }

  static updateFrustumObjects(object){

    // every time the camera or objects change position (or every frame)
    Game.currentCamera.updateMatrixWorld(); // make sure the camera matrix is updated
    Game.currentCamera.matrixWorldInverse.copy(Game.currentCamera.matrixWorld).invert();
    //Game.currentCamera.matrixWorldInverse.getInverse( Game.currentCamera.matrixWorld );
    Game.viewportProjectionMatrix.multiplyMatrices( Game.currentCamera.projectionMatrix, Game.currentCamera.matrixWorldInverse );
    Game.viewportFrustum.setFromProjectionMatrix( Game.viewportProjectionMatrix );

    // frustum is now ready to check all the objects you need
    //frustum.intersectsObject( object )
  }

  static onMouseHitInteractive( onSuccess = null ){

    //Before picking hide all placeables onscreen that are not interactable
    for(let i = 0, len = Game.module.area.placeables.length; i < len; i++){
      let plc = Game.module.area.placeables[i];
      if(plc.model.type === 'AuroraModel'){
        plc.wasVisible = plc.model.visible;
        if(!plc.isUseable()){
          plc.model.visible = false;
        }
      }
    }
    
    //Remove the currently controlled PC from the SceneGraph, so it will be ignored during the next check
    Game.group.party.remove(Game.getCurrentPlayer().model);

    Game.raycaster.setFromCamera( Game.mouse, Game.camera );
    let intersects = Game.raycaster.intersectObjects( Game.interactableObjects, true );

    //Add the currently controlled PC back to the SceneGraph
    Game.group.party.add(Game.getCurrentPlayer().model);

    //!!!! This needs to be optimized. It's causing a lot of GC calls every few frames
    if(intersects.length){
      let intersection = intersects[0],
        obj = intersection.object;

      if(obj.moduleObject){
        if(obj.moduleObject.model.type === 'AuroraModel'){
          if(typeof onSuccess === 'function')
            onSuccess(obj.moduleObject.model);
        }
      }else if(typeof obj.auroraModel !== 'undefined'){
        obj = obj.auroraModel;
        if(obj.type === 'AuroraModel'){
          if(obj != Game.getCurrentPlayer().getModel()){
            if(typeof onSuccess === 'function')
              onSuccess(obj, intersection.object);
          }
        }
      }
    }

    //After picking is done reshow all placeables that we hid
    for(let i = 0, len = Game.module.area.placeables.length; i < len; i++){
      let plc = Game.module.area.placeables[i];
      if(!plc.model)
        continue;

      if(plc.model.type === 'AuroraModel'){
        plc.model.visible = plc.wasVisible;
      }
    }

  }

  static Start(){

    Game.TutorialWindowTracker = [];
    LightManager.setLightHelpersVisible(Config.get('Game.debug.light_helpers') ? true : false);

    Game.audioEngine = new AudioEngine();
    Game.initGUIAudio();
    LightManager.init();

    Planetary.Init();

    Game.audioEmitter = new AudioEmitter({
      engine: Game.audioEngine,
      props: {
        XPosition: 0,
        YPosition: 0,
        ZPosition: 0
      },
      template: {
        sounds: [],
        isActive: true,
        isLooping: false,
        isRandom: false,
        isRandomPosition: false,
        interval: 0,
        intervalVariation: 0,
        maxDistance: 100,
        volume: 127,
        positional: 0
      },
      onLoad: () => {
      },
      onError: () => {
      }
    });

    //AudioEngine.Unmute()
    Game.Mode = Game.MODES.MAINMENU;
    Game.State = Game.STATES.RUNNING;
    Game.inMenu = false;
    let _initGlobals = Global.kotor2DA.globalcat.rows;
    for (let key in _initGlobals) {
      if (_initGlobals.hasOwnProperty(key)) {
        let globItem = _initGlobals[key];

        switch(globItem.type){
          case 'Number':
            Game.Globals.Number[globItem.name.toLowerCase()] = 0;
          break;
          case 'String':
            Game.Globals.String[globItem.name.toLowerCase()] = '';
          break;
          case 'Boolean':
            Game.Globals.Boolean[globItem.name.toLowerCase()] = false;
          break;
        }

      }
    }
    
    console.log('SaveGames: Loading');
    SaveGame.getSaveGames( () => {
      console.log('SaveGames: Complete');
      
      console.log('CursorManager: Init');
      CursorManager.init( () => {
        console.log('CursorManager: Complete');

        //MENU LOADER

        /*
          Thus begins a hacky piece of code in my attempt to get away from the callback soup  
          that was becoming a problem because of the async nature of loading menus.
          All the menu class names are stored in the array below and are called in order until the list is exhausted.

          let menuName = menus[i++];
          Game[menuName] = new window[menuName]({
            onLoad: () => {

              ...
              
            }
          })

          is where the magic happens. This is a replacement for:

          Game.MainMenu = new MainMenu({
            onLoad: () => {

              ...

            }
          })

        */

        let menus = [
          'MainMenu',
          'CharGenClass',
          'CharGenPortCust', //Character Portrait
          'CharGenMain',
          'MenuSaveLoad',
          'MainOptions',
          'MainMovies',
          'MenuSound',
          'MenuSoundAdvanced',
          'MenuGraphics',
          'MenuResolutions',
          'LoadScreen',
          'InGameOverlay',
          'InGameAreaTransition',
          'InGamePause',
          'MenuAbilities',
          'MenuOptions',
          'MenuMap',
          'MenuJournal',
          'MenuInventory',
          'MenuEquipment',
          'MenuCharacter',
          'MenuMessages',
          'MenuPartySelection',
          'MenuStore',
          'MenuTop',
          'InGameDialog',
          'InGameBark',
          'InGameComputer',
          'InGameComputerCam',
          'InGameConfirm',
          'MenuContainer',
          'MenuGalaxyMap',
          'MenuLevelUp',
          'CharGenQuickOrCustom',
          'CharGenQuickPanel',
          'CharGenCustomPanel',
          'CharGenName',
          'CharGenAbilities',
          'CharGenSkills',
          'CharGenFeats',
        ];

        let menuLoader = new AsyncLoop({
          array: menus,
          onLoop: (menuName, asyncLoop) => {
            Game[menuName] = new window[menuName]({
              onLoad: () => {
                asyncLoop.next();
              }
            });
  
          }
        });
        console.log('MenuLoader: Init');
        menuLoader.iterate(() => {
          console.log('MenuLoader: Complete');

          Game.MenuJournal.childMenu = Game.MenuTop;
          Game.MenuInventory.childMenu = Game.MenuTop;
          Game.MenuEquipment.childMenu = Game.MenuTop;
          Game.MenuCharacter.childMenu = Game.MenuTop;
          Game.MenuMessages.childMenu = Game.MenuTop;
          Game.MenuOptions.childMenu = Game.MenuTop;
          Game.MenuMap.childMenu = Game.MenuTop;
          Game.MenuAbilities.childMenu = Game.MenuTop;

          Game.binkVideo = new BIKObject();

          //Preload fx textures
          TextureLoader.enQueue(
            ['fx_tex_01', 'fx_tex_02', 'fx_tex_03', 'fx_tex_04', 'fx_tex_05', 'fx_tex_06', 'fx_tex_07', 'fx_tex_08',
            'fx_tex_09', 'fx_tex_10', 'fx_tex_11', 'fx_tex_12', 'fx_tex_13', 'fx_tex_14', 'fx_tex_15', 'fx_tex_16',
            'fx_tex_17', 'fx_tex_18', 'fx_tex_19', 'fx_tex_20', 'fx_tex_21', 'fx_tex_22', 'fx_tex_23', 'fx_tex_24',
            'fx_tex_25', 'fx_tex_26', 'fx_tex_stealth'],
            undefined,
            TextureLoader.Type.TEXTURE
          );

          TextureLoader.LoadQueue(() => {
            Game.MainMenu.Open();
            $( window ).trigger('resize');
            this.setTestingGlobals();
            Game.Update();
            loader.Hide();
          });
        });

      });

    });

  }

  static onHeartbeat(){

    if(Game.module){

      Game.Heartbeat = setTimeout( () => {
          process.nextTick( ()=> {
        Game.onHeartbeat();
          });
      }, Game.HeartbeatTimer);

      for(let i = 0; i < PartyManager.party.length; i++){
          process.nextTick( ()=> {
            PartyManager.party[i].triggerHeartbeat();
          });
      }

      for(let i = 0; i < Game.module.area.creatures.length; i++){
        process.nextTick( ()=> {
            Game.module.area.creatures[i].triggerHeartbeat();
        });
      }

      for(let i = 0; i < Game.module.area.placeables.length; i++){
          process.nextTick( ()=> {
        Game.module.area.placeables[i].triggerHeartbeat();
          });
      }

      for(let i = 0; i < Game.module.area.doors.length; i++){
          process.nextTick( ()=> {
        Game.module.area.doors[i].triggerHeartbeat();
          });
      }

      for(let i = 0; i < Game.module.area.triggers.length; i++){
          process.nextTick( ()=> {
        Game.module.area.triggers[i].triggerHeartbeat();
          });
      }

      /*for(let i = 0; i < Game.module.encounters.length; i++){
        Game.module.encounters[i].triggerHeartbeat();
      }*/

    }

  }

  static LoadModule(name = '', waypoint = null){
    MenuManager.ClearMenus();
    Game.deltaTime = 0;
    Game.scene.visible = false;
    Game.inDialog = false;
    Game.initTimers();
    ResourceLoader.clearCache();
    
    ModuleObject.COUNT = 0;
    Game.renderer.setClearColor(new THREE.Color(0, 0, 0));
    Game.AlphaTest = 0;
    clearTimeout(Game.Heartbeat);
    Game.holdWorldFadeInForDialog = false;
    Game.audioEngine.stopBackgroundMusic();
    Game.audioEngine.Reset();
    CombatEngine.Reset();

    //Game.InGameOverlay.Show();
    //Game.InGameOverlay.Hide();

    LightManager.clearLights();

    Game.selected = undefined;
    Game.hovered = undefined;

    Game.staticCameras = [];

    if(!AudioEngine.isMuted)
      AudioEngine.Mute();

    //Game.InGameOverlay.Hide();
    Game.Mode = Game.MODES.LOADING;
    Game.collisionList = [];
    
    //Remove all weather effects
    while(Game.weather_effects.length){
      Game.weather_effects[0].dispose();
      Game.weather_effects.shift();
    }
    
    //Remove all effects
    if(Game.module){
      while(Game.module.effects.length){
        Game.module.effects[0].dispose();
        Game.module.effects.shift();
      }
    }

    //Cleanup texture cache ignoring GUI & LBL textures
    Object.keys(TextureLoader.textures).forEach( (key) => {

      if(key.substr(0, 3) == 'lbl' || key.substr(0, 3) == 'gui')
        return;

      TextureLoader.textures[key].dispose();
      delete TextureLoader.textures[key]; 

    });

    //Clear walkmesh list
    while (Game.walkmeshList.length){
      let wlkmesh = Game.walkmeshList.shift();
      //wlkmesh.dispose();
      Game.group.room_walkmeshes.remove(wlkmesh);
      Game.octree_walkmesh.remove(wlkmesh);
    }

    Game.octree_walkmesh.rebuild();

    Game.emitters = {};

    if(Game.module instanceof Module){

      //Clear emitters
      while (Game.group.emitters.children.length){
        Game.group.emitters.remove(Game.group.emitters.children[0]);
      }

      //Clear room geometries
      while (Game.module.area.rooms.length){
        Game.module.area.rooms[0].destroy();
      }

      //Clear creature geometries
      while (Game.module.area.creatures.length){
        Game.module.area.creatures[0].destroy();
      }

      //Clear placeable geometries
      while (Game.module.area.placeables.length){
        Game.module.area.placeables[0].destroy();
      }

      //Clear door geometries
      while (Game.module.area.doors.length){
        Game.module.area.doors[0].destroy();
      }

      //Clear party geometries
      // while (Game.group.party.children.length > 1){
      //   Game.group.party.children[1].dispose();
      //   Game.group.party.remove(Game.group.party.children[1]);
      // }

      /*while (PartyManager.party.length){
        Game.group.party.children[0].dispose();
        Game.group.party.remove(Game.group.party.children[0]);
      }*/

      //Clear sound geometries
      while (Game.group.sounds.children.length){
        Game.group.sounds.remove(Game.group.sounds.children[0]);
      }

      //Clear grass geometries
      while (Game.group.grass.children.length){
        Game.group.grass.children[0].geometry.dispose();
        Game.group.grass.children[0].material.dispose();
        Game.group.grass.remove(Game.group.grass.children[0]);
      }

      //Clear party geometries
      /*while (PartyManager.party.length){
        PartyManager.party[0].destroy();
        PartyManager.party.shift();
      }*/

    }

    //Remove all cached scripts and kill all running instances
    NWScript.Reload();

    //Resets all keys to their default state
    Game.controls.InitKeys();

    Module.BuildFromExisting(name, waypoint, (module) => {

      Game.scene.visible = false;

      Game.LoadScreen.setLoadBackground('load_'+name, () => {
        //Game.LoadScreen.lbl_hint.setText('@ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        Game.LoadScreen.showRandomHint();
        //Game.InGameOverlay.Hide();
        //Game.MainMenu.Hide();
        Game.LoadScreen.Open();

        module.loadScene( (d) => {
          Game.FadeOverlay.FadeOut(0, 0, 0, 0);
          module.initEventQueue();
          module.initScripts( () => {
            Game.LoadScreen.Close();
            process.nextTick( ()=> {
              //Game.scene_gui.background = null;
              Game.scene.visible = true;
              
              console.log('loadScene', d);
              AudioEngine.Unmute();
              if(Game.module.area.MiniGame){
                Game.Mode = Game.MODES.MINIGAME
              }else{
                Game.Mode = Game.MODES.INGAME;
              }

              let runSpawnScripts = !Game.isLoadingSave;
              Game.isLoadingSave = false;
              
              Game.InGameComputer.audioEmitter = Game.InGameDialog.audioEmitter = this.audioEmitter = new AudioEmitter({
                engine: Game.audioEngine,
                channel: AudioEngine.CHANNEL.VO,
                props: {
                  XPosition: 0,
                  YPosition: 0,
                  ZPosition: 0
                },
                template: {
                  sounds: [],
                  isActive: true,
                  isLooping: false,
                  isRandom: false,
                  isRandomPosition: false,
                  interval: 0,
                  intervalVariation: 0,
                  maxDistance: 50,
                  volume: 127,
                  positional: 0
                },
                onLoad: () => {
                },
                onError: () => {
                }
              });
              Game.audioEngine.AddEmitter(this.audioEmitter);
              Game.InGameOverlay.RecalculatePosition();
              Game.InGameOverlay.Open();
              Game.renderer.compile(Game.scene, Game.currentCamera);

              if(Game.module.area.MiniGame){
                Game.Mode = Game.MODES.MINIGAME
              }else{
                Game.Mode = Game.MODES.INGAME;
              }
              
              setTimeout( () => {
                console.log('inDialog', Game.inDialog);
                console.log('HOLDFADE', Game.holdWorldFadeInForDialog, Game.inDialog);
                if(!Game.holdWorldFadeInForDialog)
                  Game.FadeOverlay.FadeIn(1, 0, 0, 0);
                
                Game.module.readyToProcessEvents = true;
                console.log('runSpawnScripts', runSpawnScripts);
                for(let i = 0; i < Game.module.area.creatures.length; i++){
                  if(Game.module.area.creatures[i] instanceof ModuleObject){
                    Game.module.area.creatures[i].onSpawn(runSpawnScripts);
                  }
                }

                for(let i = 0; i < PartyManager.party.length; i++){
                  if(PartyManager.party[i] instanceof ModuleObject){
                    PartyManager.party[i].onSpawn(runSpawnScripts);
                  }
                }

                for(let i = 0; i < Game.module.area.placeables.length; i++){
                  if(Game.module.area.placeables[i] instanceof ModuleObject){
                    Game.module.area.placeables[i].onSpawn(runSpawnScripts);
                  }
                }

                for(let i = 0; i < Game.module.area.doors.length; i++){
                  if(Game.module.area.doors[i] instanceof ModuleObject){
                    Game.module.area.doors[i].onSpawn(runSpawnScripts);
                  }
                }

                for(let i = 0; i < Game.module.area.triggers.length; i++){
                  if(Game.module.area.triggers[i] instanceof ModuleObject){
                    Game.module.area.triggers[i].onSpawn(runSpawnScripts);
                  }
                }

                for(let i = 0; i < Game.module.area.waypoints.length; i++){
                  if(Game.module.area.waypoints[i] instanceof ModuleObject){
                    Game.module.area.waypoints[i].onSpawn(runSpawnScripts);
                  }
                }

              }, 1000);                
              
              Game.renderer.setClearColor(new THREE.Color(Game.module.area.SunFogColor));
            });

          });

        })

        //console.log(module);

        Game.LoadScreen.setProgress(0);

      });

    });

  }

  static UpdateFollowerCamera(delta = 0) {

    let followee = Game.getCurrentPlayer();

    let camStyle = Game.module.getCameraStyle();
    let cameraHeight = parseFloat(camStyle.height); //Should be aquired from the appropriate camerastyle.2da row set by the current module

    let offsetHeight = 0;

    if(Game.Mode == Game.MODES.MINIGAME){
      offsetHeight = 1;
    }else{
      if(!isNaN(parseFloat(followee.getAppearance().cameraheightoffset))){
        offsetHeight = parseFloat(followee.getAppearance().cameraheightoffset);
      }
    }

    Game.followerCamera.pitch = THREE.Math.degToRad(camStyle.pitch);
    
    let camHeight = (1.35 + cameraHeight)-offsetHeight;
    let distance = camStyle.distance * Game.CameraDebugZoom;

    Game.raycaster.far = 10;
    
    Game.raycaster.ray.direction.set(Math.cos(Game.followerCamera.facing), Math.sin(Game.followerCamera.facing), 0).normalize();
    Game.raycaster.ray.origin.set(followee.position.x, followee.position.y, followee.position.z + camHeight);

    let aabbFaces = [];
    let intersects;

    if(typeof this.cameraBoundingBox == 'undefined'){
      this.cameraBoundingBox = new THREE.Box3(Game.raycaster.ray.origin.clone(), Game.raycaster.ray.origin.clone());
    }

    this.cameraBoundingBox.min.copy(Game.raycaster.ray.origin);
    this.cameraBoundingBox.max.copy(Game.raycaster.ray.origin);
    this.cameraBoundingBox.expandByScalar(distance * 1.5);
    
    for(let j = 0, jl = Game.module.area.rooms.length; j < jl; j++){
      let room = Game.module.area.rooms[j];
      if(room && room.walkmesh && room.walkmesh.aabbNodes.length){
        aabbFaces.push({
          object: room, 
          faces: room.walkmesh.getAABBCollisionFaces(this.cameraBoundingBox)
        });
      }
    }

    for(let j = 0, jl = Game.module.area.doors.length; j < jl; j++){
      let door = Game.module.area.doors[j];
      if(door && door.walkmesh && !door.isOpen()){
        if(door.box.intersectsBox(this.cameraBoundingBox) || door.box.containsBox(this.cameraBoundingBox)){
          aabbFaces.push({
            object: door,
            faces: door.walkmesh.faces
          });
        }
      }
    }
    
    for(let k = 0, kl = aabbFaces.length; k < kl; k++){
      let castableFaces = aabbFaces[k];
      intersects = castableFaces.object.walkmesh.raycast(Game.raycaster, castableFaces.faces) || [];
      if ( intersects.length > 0 ) {
        for(let i = 0; i < intersects.length; i++){
          if(intersects[i].distance < distance){
            distance = intersects[i].distance * .75;
          }
        }
      }
    }

    Game.raycaster.far = Infinity;

    if(Game.Mode == Game.MODES.MINIGAME){

      followee.camera.camerahook.getWorldPosition(Game.followerCamera.position);
      followee.camera.camerahook.getWorldQuaternion(Game.followerCamera.quaternion);

      switch(Game.module.area.MiniGame.Type){
        case 1: //SWOOPRACE
          Game.followerCamera.fov = Game.module.area.MiniGame.CameraViewAngle;
        break;
        case 2: //TURRET
          Game.followerCamera.fov = Game.module.area.MiniGame.CameraViewAngle;
        break;
      }
      Game.followerCamera.fov = Game.module.area.MiniGame.CameraViewAngle;

    }else{
      Game.followerCamera.position.copy(followee.position);

      //If the distance is greater than the last distance applied to the camera. 
      //Increase the distance by the frame delta so it will grow overtime until it
      //reaches the max allowed distance wether by collision or camera settings.
      if(distance > Game.followerCamera.distance){
        distance = Game.followerCamera.distance += 2 * delta;
      }
        
      Game.followerCamera.position.x += distance * Math.cos(Game.followerCamera.facing);
      Game.followerCamera.position.y += distance * Math.sin(Game.followerCamera.facing);
      Game.followerCamera.position.z += camHeight;

      Game.followerCamera.distance = distance;
    
      Game.followerCamera.rotation.order = 'YZX';
      Game.followerCamera.rotation.set(Game.followerCamera.pitch, 0, Game.followerCamera.facing+Math.PI/2);
    }
    
    Game.followerCamera.updateProjectionMatrix();

  }

  static UpdateVideoEffect(){
    if(!isNaN(parseInt(Game.videoEffect))){
      let effect = Global.kotor2DA.videoeffects.rows[Game.videoEffect];
      if(parseInt(effect.enablesaturation)){
        Game.saturationPass.enabled = true;
        Game.colorPass.enabled = true;
        Game.saturationPass.uniforms.saturation.value = parseFloat(effect.saturation);
        Game.colorPass.uniforms.addRGB.value.set(
          parseFloat(effect.modulationred)-1,
          parseFloat(effect.modulationgreen)-1,
          parseFloat(effect.modulationblue)-1
        );
      }else{
        Game.saturationPass.enabled = false;
        Game.colorPass.enabled = false;
      }

      if(parseInt(effect.enablescannoise)){
        Game.filmPass.uniforms.grayscale.value = true;
        Game.filmPass.enabled = true;
        Game.filmPass.uniforms.sCount.value = Math.floor(Math.random() * 256) + 250;
      }else{
        Game.filmPass.uniforms.grayscale.value = false;
        Game.filmPass.enabled = false;
      }

    }else{
      Game.saturationPass.enabled = false;
      Game.filmPass.enabled = false;
      Game.colorPass.enabled = false;
    }
  }

  static Update(){
    
    /*if(!Game.visible){
      requestAnimationFrame( Game.Update );
      return;
    }*/

    if(!Config.get('Game.debug.show_fps')){
      Game.stats.showPanel(false);
    }

    let delta = Game.clock.getDelta();
    Game.limiter.now = Date.now();
    Game.limiter.elapsed = Game.limiter.now - Game.limiter.then;

    if(Game.binkVideo.isPlaying){
      Game.controls.Update(delta);
      Game.binkVideo.resize();
      Game.binkVideo.update(delta);

      Game.renderer.render(Game.binkVideo.scene, Game.camera_gui);
      requestAnimationFrame( Game.Update );
      return;
    }

    requestAnimationFrame( Game.Update );

    Game.UpdateVideoEffect();
    MenuManager.Update(delta);

    Game.currentRoom = null;
    Game.currentDistance = 10000000;

    Game.__rooms = [];

    for(let emitter in Game.emitters){
      //console.log(emitter);
      Game.emitters[emitter].tick(delta);
    }

    Game.scene_cursor_holder.visible = true;

    // if enough time has elapsed, draw the next frame
    if (Game.limiter.elapsed > Game.limiter.fpsInterval) {

      if(Game.Mode == Game.MODES.MINIGAME || (Game.Mode == Game.MODES.INGAME && Game.State != Game.STATES.PAUSED && !Game.MenuActive && !Game.InGameConfirm.bVisible)){
        //Game.viewportFrustum.setFromProjectionMatrix(Game.currentCamera.projectionMatrix);
        Game.frustumMat4.multiplyMatrices( Game.currentCamera.projectionMatrix, Game.currentCamera.matrixWorldInverse )
        Game.viewportFrustum.setFromProjectionMatrix(Game.frustumMat4);
        Game.updateTime(delta);

        if(Game.Mode == Game.MODES.MINIGAME || MenuManager.GetCurrentMenu() == Game.InGameOverlay || MenuManager.GetCurrentMenu() == Game.InGameDialog || MenuManager.GetCurrentMenu() == Game.InGameComputer){
          Game.module.tick(delta);
          CombatEngine.Update(delta);
        }

        //PartyMember cleanup
        for(let i = 0; i < Game.group.party.children.length; i++){
          let pm = Game.group.party.children[i].moduleObject;
          if(Game.player != pm){
            if(PartyManager.party.indexOf(pm) == -1){
              pm.destroy();
            }
          }
        }

        let walkCount = Game.walkmeshList.length;
        let roomCount = Game.group.rooms.children.length;

        let trigCount = Game.module.area.triggers.length;
        let creatureCount = Game.module.area.creatures.length;
        let placeableCount = Game.module.area.placeables.length;
        let doorCount = Game.module.area.doors.length;
        let partyCount = PartyManager.party.length;
        let animTexCount = AnimatedTextures.length;
        let obj = undefined;

        //update triggers
        for(let i = 0; i < trigCount; i++){
          Game.module.area.triggers[i].update(delta);
        }

        //update party
        for(let i = 0; i < partyCount; i++){
          PartyManager.party[i].update(delta);
        }
        
        //update creatures
        for(let i = 0; i < creatureCount; i++){
          Game.module.area.creatures[i].update(delta);
        }
        
        //update placeables
        for(let i = 0; i < placeableCount; i++){
          Game.module.area.placeables[i].update(delta);
        }
        
        //update doors
        for(let i = 0; i < doorCount; i++){
          Game.module.area.doors[i].update(delta);
        }

        //update animated textures
        for(let i = 0; i < animTexCount; i++){
          AnimatedTextures[i].Update(delta);
        }

        //unset party controlled
        for(let i = 0; i < partyCount; i++){
          PartyManager.party[i].controlled = false;
        }

        if(Game.Mode == Game.MODES.MINIGAME){
          for(let i = 0; i < Game.module.area.MiniGame.Enemies.length; i++){
            Game.module.area.MiniGame.Enemies[i].update(delta);
          }
        }

        //update rooms
        for(let i = 0; i < roomCount; i++){
          Game.module.area.rooms[i].update(delta);
          Game.module.area.rooms[i].hide();
        }

        Game.module.area.grassMaterial.uniforms.time.value += delta;
        Game.module.area.grassMaterial.uniforms.playerPosition.value = Game.player.position;

        Game.UpdateVisibleRooms();

        for(let i = 0; i < partyCount; i++){
          PartyManager.party[i].controlled = false;
        }
        
        if(Game.inDialog){
          if(Game.InGameDialog.IsVisible() && !Game.InGameDialog.LB_REPLIES.isVisible() && Game.scene_cursor_holder.visible){
            Game.scene_cursor_holder.visible = false;
          }
        }

        for(let i = 0, len = Game.weather_effects.length; i < len; i++){
          Game.weather_effects[i].position.copy( Game.getCurrentPlayer().position.clone().add( new THREE.Vector3(0,0,3) ) );
          Game.weather_effects[i].update(delta);
        } 

        Game.UpdateFollowerCamera(delta);

      }else if(Game.Mode == Game.MODES.INGAME && Game.State == Game.STATES.PAUSED && !Game.MenuActive){
        Game.controls.UpdatePlayerControls(delta);
        Game.UpdateFollowerCamera(delta);
      }
      //Game.limiter.then = Game.limiter.now - (Game.limiter.elapsed % Game.limiter.fpsInterval);
    }

    if(Game.Mode == Game.MODES.INGAME){

      Game.FadeOverlay.Update(delta);
      Game.frustumMat4.multiplyMatrices( Game.currentCamera.projectionMatrix, Game.currentCamera.matrixWorldInverse )
      Game.viewportFrustum.setFromProjectionMatrix(Game.frustumMat4);
      LightManager.update(delta);
      //Game.InGameOverlay.Update(delta);
      //Game.InGameAreaTransition.Update(delta);

      if(!Game.inDialog){
        Game.currentCamera = Game.camera;
      }
      
      if(Game.State == Game.STATES.PAUSED && !Game.MenuActive){
        if(!Game.InGamePause.IsVisible())
          Game.InGamePause.Show();
        
        Game.InGamePause.Update(delta);
      }else{
        if(Game.InGamePause.IsVisible() || Game.MenuActive)
          Game.InGamePause.Hide();
      }
    }else if(Game.Mode == Game.MODES.MINIGAME){
      Game.FadeOverlay.Update(delta);
      LightManager.update(delta);
      //Game.InGameOverlay.Hide();
    }
    
    Game.updateCursor();

    if(Game.Mode == Game.MODES.INGAME){
      let obj = undefined;
      for(let i = 0, len = Game.group.room_walkmeshes.children.length; i < len; i++){
        obj = Game.group.room_walkmeshes.children[i];
        if(obj.type === 'Mesh'){
          obj.material.visible = Config.get('Game.debug.show_collision_meshes');
        }
      }

      for(let i = 0, len = Game.walkmeshList.length; i < len; i++){
        obj = Game.walkmeshList[i];
        if(obj.type === 'Mesh'){
          obj.material.visible = Config.get('Game.debug.show_collision_meshes');
        }
      }
  
      for(let i = 0, len = Game.collisionList.length; i < len; i++){
        obj = Game.collisionList[i];
        if(obj.type === 'Mesh'){
          obj.material.visible = false;
        }
      }
    }

    Game.audioEngine.Update(Game.currentCamera.position, Game.currentCamera.rotation);
    Game.controls.Update(delta);
    Game.camera_shake.beforeRender();
    Game.camera_shake.update(delta);

    Game.updateCursorPosition();
    if (Game.limiter.elapsed > Game.limiter.fpsInterval) {
      Game.renderPass.camera = Game.currentCamera;
      //Game.renderPassAA.camera = Game.currentCamera;
      Game.bokehPass.camera = Game.currentCamera;

      // render scene into target
      //Game.renderer.setRenderTarget( Game.depthTarget );
      //Game.renderer.render( Game.scene, Game.currentCamera );
      // render post FX
      //Game.renderer.setRenderTarget( null );

      Game.composer.render(delta);
    }

    if(Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME){
      Game.octree.update();
      Game.octree_walkmesh.update();
    }

    Game.camera_shake.afterRender();

    //NoClickTimer
    if( ((Game.Mode == Game.MODES.MINIGAME) || (Game.Mode == Game.MODES.INGAME)) && Game.State != Game.STATES.PAUSED){
      if(Game.noClickTimer){
        Game.noClickTimer -= (1 * delta);
        if(Game.noClickTimer < 0){
          Game.noClickTimer = 0;
        }
      }
    }

    Game.stats.update();
    
  }

  static UpdateVisibleRooms(){

    let rooms = [];
    let room = undefined;
    let model = undefined;
    let pos = 0;
    
    if(Game.inDialog){
      pos = Game.currentCamera.position.clone().add(Game.playerFeetOffset);
      for(let i = 0, il = Game.module.area.rooms.length; i < il; i++){
        room = Game.module.area.rooms[i] || undefined;
        if(room){
          model = room.model || undefined;
          if(model != undefined && model.type === 'AuroraModel'){
            
            if(!room.hasVISObject || model.box.containsPoint(pos)){
              rooms.push(room);
            }
          }
        }
      }

      for(let i = 0; i < rooms.length; i++){
        rooms[i].show(true);
      }

    }else if(PartyManager.party[0]){

      let player = Game.getCurrentPlayer();
      if(player && player.room){
        player.room.show(true);
      }

      //SKYBOX Fix
      if(player){
        for(let i = 0, len = Game.module.area.rooms.length; i < len; i++){
          let room = Game.module.area.rooms[i];
          if(room.model instanceof THREE.AuroraModel){
            if(!room.hasVISObject || room.model.box.containsPoint(player.position)){
              //Show the room, but don't recursively show it's children
              room.show(false);
            }
          }
        }
      }

    }

  }

  static getCurrentPlayer(){
    let p = PartyManager.party[0];
    return p ? p : Game.player;
  }

  static updateCursorPosition(){
    CursorManager.setCursor('default');
    Game.scene_cursor_holder.position.x = Mouse.Client.x - (window.innerWidth/2) + (32/2);
    Game.scene_cursor_holder.position.y = (Mouse.Client.y*-1) + (window.innerHeight/2) - (32/2);
  }


  static updateCursor(){
    let cursorCaptured = false;
    let guiHoverCaptured = false;

    Game.hoveredGUIElement = undefined;

    let uiControls = Game.controls.MenuGetActiveUIElements();
    let controlCount = uiControls.length;
    for(let i = 0; i < controlCount; i++){
      let control = uiControls[i];
      if(!control.isVisible())
        continue;

      //if(control === Game.mouse.clickItem){
      if(control instanceof GUIListBox && Game.hoveredGUIElement == undefined){
        Game.hoveredGUIElement = control;
      }

      if(!(control.widget.parent.type === 'Scene')){
        if(!guiHoverCaptured){
          let cMenu = control.menu;
          cMenu.SetWidgetHoverActive(control, true);
          guiHoverCaptured = false;
        }

        if(typeof control.isClickable == 'function'){
          if(control.isClickable()){
            CursorManager.setCursor('select');
            cursorCaptured = true;
          }
        }
      }
      //}
    }

    if(!cursorCaptured && Game.Mode == Game.MODES.INGAME && !Game.inDialog && !Game.MenuActive){
      if(MenuManager.GetCurrentMenu() == Game.InGameOverlay){
        //console.log(Game.scene_cursor_holder.position);
        let hoveredObject = false;
        Game.onMouseHitInteractive( (obj) => {
          if(obj.moduleObject instanceof ModuleObject && obj.moduleObject.isUseable()){
            if(obj.moduleObject != Game.getCurrentPlayer()){

              let distance = Game.getCurrentPlayer().getModel().position.distanceTo(obj.position);
              let distanceThreshold = 10;

              let canChangeCursor = (distance <= distanceThreshold) || (Game.hoveredObject == Game.selectedObject);

              if(obj.moduleObject instanceof ModuleDoor){
                if(canChangeCursor)
                  CursorManager.setCursor('door');
                else
                  CursorManager.setCursor('select');

                CursorManager.setReticle('reticleF');
              }else if(obj.moduleObject instanceof ModulePlaceable){
                if(!obj.moduleObject.isUseable()){
                  return;
                }
                if(canChangeCursor)
                  CursorManager.setCursor('use');
                else
                  CursorManager.setCursor('select');

                CursorManager.setReticle('reticleF');
              }else if(obj.moduleObject instanceof ModuleCreature){

                if(obj.moduleObject.isHostile(Game.getCurrentPlayer())){
                  if(!obj.moduleObject.isDead()){
                    if(canChangeCursor)
                      CursorManager.setCursor('attack');
                    else
                      CursorManager.setCursor('select');

                    CursorManager.setReticle('reticleH');
                  }else{
                    if(canChangeCursor)
                      CursorManager.setCursor('use');
                    else
                      CursorManager.setCursor('select');
      
                    CursorManager.setReticle('reticleF');
                  }
                }else{
                  if(canChangeCursor)
                    CursorManager.setCursor('talk');
                  else
                    CursorManager.setCursor('select');

                  CursorManager.setReticle('reticleF');
                }

              }else{
                //console.log()
                //Game.hovered = undefined;
              }

              if(obj.lookathook != undefined){
                CursorManager.reticle.position.copy(obj.lookathook.getWorldPosition(new THREE.Vector3()));
                Game.hovered = obj.lookathook;
                Game.hoveredObject = obj.moduleObject;
              }else if(obj.headhook != undefined){
                CursorManager.reticle.position.copy(obj.headhook.getWorldPosition(new THREE.Vector3()));
                Game.hovered = obj.headhook;
                Game.hoveredObject = obj.moduleObject;
              }else{
                try{
                  CursorManager.reticle.position.copy(obj.getObjectByName('camerahook').getWorldPosition(new THREE.Vector3()));
                  Game.hovered = obj.getObjectByName('camerahook');
                  Game.hoveredObject = obj.moduleObject;
                }catch(e){
                  if(!(obj.moduleObject instanceof ModuleRoom)){
                    CursorManager.reticle.position.copy(obj.position);
                    Game.hovered = obj;
                    Game.hoveredObject = obj.moduleObject;
                  }
                }
              }

            }
          }else{
            Game.hovered = Game.hoveredObject = undefined;
          }
        });
      }
    }

    if(Game.hovered instanceof THREE.Object3D && !Game.inDialog){
      Game.hovered.getWorldPosition(CursorManager.reticle.position);
      CursorManager.reticle.visible = true;
    }else{
      CursorManager.reticle.visible = false;
    }

    if(Game.selected instanceof THREE.Object3D && !Game.inDialog && !Game.MenuContainer.bVisible){
      Game.selected.getWorldPosition(CursorManager.reticle2.position);
      CursorManager.reticle2.visible = true;
      if(Game.selectedObject instanceof ModuleDoor){      
        CursorManager.setReticle2('reticleF2');
      }else if(Game.selectedObject instanceof ModulePlaceable){
        if(!Game.selectedObject.isUseable()){
          return;
        }      
        CursorManager.setReticle2('reticleF2');
      }else if(Game.selectedObject instanceof ModuleCreature){
        if(Game.selectedObject.isHostile(Game.getCurrentPlayer())){
          CursorManager.setReticle2('reticleH2');
        }else{
          CursorManager.setReticle2('reticleF2');
        }
      }
    }else{
      CursorManager.reticle2.visible = false;
    }

  }

  static initGUIAudio(){
    try{

      Game.guiAudioEmitter = new AudioEmitter({
        engine: Game.audioEngine,
        props: {
          XPosition: 0,
          YPosition: 0,
          ZPosition: 0
        },
        template: {
          sounds: [],
          isActive: true,
          isLooping: false,
          isRandom: false,
          isRandomPosition: false,
          interval: 0,
          intervalVariation: 0,
          maxDistance: 100,
          volume: 127,
          positional: 0
        },
        onLoad: () => {
        },
        onError: () => {
        }
      });

      Game.audioEngine.AddEmitter(Game.guiAudioEmitter);
    }catch(e){

    }
  }

}


module.exports = Game;