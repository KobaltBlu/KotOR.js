/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The main engine file that runs KotOR II.
 * It extends Engine.js which holds shared methods for both games.
 */

class Game extends Engine {

  static Init(){

    Game.ModelLoader = new THREE.MDLLoader();

    Game.Globals = {
      'Boolean': {},
      'Number': {},
      'String': {}
    };
    Game.models = [];
    Game.videoEffect = null;
    Game.activeGUIElement = undefined;
    Game.hoveredGUIElement = undefined;

    Game.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    Game.renderer.autoClear = false;
    
    Game.renderer.setSize( $(window).innerWidth(), $(window).innerHeight() );
    Game.renderer.setClearColor(0x000000);
    window.renderer = Game.renderer;

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
    Game.selectedObject = undefined;
    Game.hovered = undefined;
    Game.hoveredObject = undefined;

    Game.scene = new THREE.Scene();
    Game.scene_gui = new THREE.Scene();
    Game.scene_cursor = new THREE.Scene();
    Game.camera = Game.followerCamera = new THREE.PerspectiveCamera( 55, $(window).innerWidth() / $(window).innerHeight(), 0.1, 15000 );
    Game.camera_dialog = new THREE.PerspectiveCamera( 55, $(window).innerWidth() / $(window).innerHeight(), 0.1, 15000 );
    Game.camera_dialog.up = new THREE.Vector3( 0, 0, 1 );
    Game.camera_animated = new THREE.PerspectiveCamera( 55, $(window).innerWidth() / $(window).innerHeight(), 0.1, 15000 );
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

    Game.canvas = Game.renderer.domElement;
    Game.$canvas = $(Game.canvas);

    Game.$canvas.addClass('noselect').attr('tabindex', 1);

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
      sounds: new THREE.Group(),
      triggers: new THREE.Group(),
      waypoints: new THREE.Group(),
      party: new THREE.Group(),
      lights: new THREE.Group(),
      light_helpers: new THREE.Group(),
      emitters: new THREE.Group(),
      stunt: new THREE.Group()
    };

    Game.grassGroup = new THREE.Group();

    Game.scene.add(Game.group.rooms);
    Game.scene.add(Game.group.placeables);
    Game.scene.add(Game.group.doors);
    Game.scene.add(Game.group.creatures);
    Game.scene.add(Game.group.waypoints);
    Game.scene.add(Game.group.sounds);
    Game.scene.add(Game.group.triggers);
    Game.scene.add(Game.group.stunt);

    Game.scene.add(Game.group.lights);
    //Game.scene.add(Game.group.light_helpers);
    Game.scene.add(Game.group.emitters);

    Game.scene.add(Game.group.party);

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

    Game.octree.visualMaterial.visible = false;
    Game.octree_walkmesh.visualMaterial.visible = false;

    Game.interactableObjects = new THREE.Group();

    Game.interactableObjects = [
      Game.group.placeables, 
      Game.group.doors, 
      Game.group.creatures, 
      Game.group.party,
      Game.group.rooms
    ];

    Game.scene_cursor_holder = new THREE.Group();
    Game.scene_cursor.add(Game.scene_cursor_holder);

    Game.controls = new IngameControls(Game.currentCamera, Game.canvas, Game);

    $('#renderer-container').append(Game.$canvas).append(Game.stats.dom);

    /* Fade Geometry */
    Game.FadeOverlay = {
      fading: false,
      override: false,
      length: 0,
      elapsed: 0,
      state: 0,
      STATES: {
        NONE: 0,
        FADE_IN: 1,
        FADE_OUT: 2
      },
      FadeOut: function(length = 0, r = 0, g = 0, b = 0){

        if(Game.FadeOverlay.override){
          length = r = g = b = 0;
        }

        Game.FadeOverlay.material.opacity = 0;
        Game.FadeOverlay.material.visible = true;
        Game.FadeOverlay.material.color.setRGB(r,g,b);
        Game.FadeOverlay.length = length;
        Game.FadeOverlay.elapsed = 0;
        Game.FadeOverlay.state = Game.FadeOverlay.STATES.FADE_OUT;
      },
      FadeIn: function(length = 0, r = 0, g = 0, b = 0){

        if(Game.FadeOverlay.state == Game.FadeOverlay.STATES.FADE_OUT){

          if(Game.FadeOverlay.override){
            Game.FadeOverlay.FadeOut(0, 0, 0, 0);
            return;
          }

          Game.FadeOverlay.material.opacity = 1;
          Game.FadeOverlay.material.visible = true;
          Game.FadeOverlay.material.color.setRGB(r,g,b);
          Game.FadeOverlay.length = length;
          Game.FadeOverlay.elapsed = 0;
          Game.FadeOverlay.state = Game.FadeOverlay.STATES.FADE_IN;

        }
      },
      Update(delta = 0){
        if(Game.FadeOverlay.state == Game.FadeOverlay.STATES.NONE || Game.FadeOverlay.override){
          return;
        }

        Game.FadeOverlay.elapsed += 1*delta;

        if(Game.FadeOverlay.elapsed > Game.FadeOverlay.length){
          Game.FadeOverlay.elapsed = Game.FadeOverlay.length;
        }

        switch(Game.FadeOverlay.state){
          case Game.FadeOverlay.STATES.FADE_IN:


            if(Game.FadeOverlay.elapsed >= Game.FadeOverlay.length){
              Game.FadeOverlay.material.visible = false;
            }else{
              Game.FadeOverlay.material.opacity = 1 - Game.FadeOverlay.elapsed / Game.FadeOverlay.length;
              if(isNaN(Game.FadeOverlay.material.opacity)){
                Game.FadeOverlay.material.opacity = 0;
              }
            }

            if(Game.FadeOverlay.elapsed >= Game.FadeOverlay.length){
              Game.FadeOverlay.state = Game.FadeOverlay.STATES.NONE
            }
          break;
          case Game.FadeOverlay.STATES.FADE_OUT:
            Game.FadeOverlay.material.opacity = Game.FadeOverlay.elapsed / Game.FadeOverlay.length;
            if(isNaN(Game.FadeOverlay.material.opacity)){
              Game.FadeOverlay.material.opacity = 1;
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
    Game.filmPass = new THREE.FilmPass(1, 0.325, 512, false);

    //Game.renderPassAA.sampleLevel = 1;

    Game.copyPass.renderToScreen = true
    Game.renderPassGUI.renderToScreen = true;
    Game.renderPassCursor.renderToScreen = true;

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

    Game.composer.addPass(Game.renderPass);
    //Game.composer.addPass(Game.renderPassAA);
    Game.composer.addPass(Game.filmPass);
    Game.composer.addPass(Game.colorPass);
    Game.composer.addPass(Game.saturationPass);
    Game.composer.addPass(Game.bloomPass);
    Game.composer.addPass(Game.copyPass);

    Game.composer.addPass(Game.renderPassGUI);
    Game.composer.addPass(Game.renderPassCursor);

    //END: PostProcessing

    $( window ).resize(() => {

      let width = $(window).innerWidth();
      let height = $(window).innerHeight();

      Game.composer.setSize(width, height);

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

      Game.InGameDialog.Resize();

      /*if(Game.scene_gui.background != null){
        let x = width / 1600;
        let y = height / 1200;

        Game.scene_gui.background.repeat.set(x, y);
        Game.scene_gui.background.offset.set( (1.0 - x) / 2, (1.0 - y) / 2);

      }*/

      
      Game.screenCenter.x = ( (window.innerWidth/2) / window.innerWidth ) * 2 - 1;
      Game.screenCenter.y = - ( (window.innerHeight/2) / window.innerHeight ) * 2 + 1; 

      if(Game.Mode == Game.MODES.INGAME){
        Game.InGameOverlay.RecalculatePosition();
      }
      
    });

    Game.Start();

  }

  static updateFrustumObjects(object){

    // every time the camera or objects change position (or every frame)
    Game.currentCamera.updateMatrixWorld(); // make sure the camera matrix is updated
    Game.currentCamera.matrixWorldInverse.getInverse( Game.currentCamera.matrixWorld );
    Game.viewportProjectionMatrix.multiplyMatrices( Game.currentCamera.projectionMatrix, Game.currentCamera.matrixWorldInverse );
    Game.viewportFrustum.setFromMatrix( Game.viewportProjectionMatrix );

    // frustum is now ready to check all the objects you need
    //frustum.intersectsObject( object )
  }

  static onMouseHitInteractive( onSuccess = null ){

    //Before picking hide all placeables onscreen that are not interactable
    for(let i = 0; i < Game.module.area.placeables.length; i++){
      let plc = Game.module.area.placeables[i];
      if(plc.model instanceof THREE.AuroraModel){
        plc.wasVisible = plc.model.visible;
        if(!plc.isUseable()){
          plc.model.visible = false;
        }
      }
    }
    
    Game.raycaster.setFromCamera( Game.mouse, Game.camera );
    let intersects = Game.raycaster.intersectObjects( Game.interactableObjects, true );

    if(intersects.length){
      let intersection = intersects[0],
          obj = intersection.object;

      obj.traverseAncestors( (obj) => {
        if(obj instanceof THREE.AuroraModel){
          if(obj != Game.getCurrentPlayer().getModel()){
            if(typeof onSuccess === 'function')
              onSuccess(obj, intersection.object);

            //After picking is done reshow all placeables that we hid
            /*for(let i = 0; i < Game.module.area.placeables.length; i++){
              let plc = Game.module.area.placeables[i];
              if(plc.model instanceof THREE.AuroraModel){
                plc.model.visible = plc.wasVisible;
              }
            }*/

            return;
          }else{
            if(intersects.length >=2){
              intersection = intersects[1],
              obj = intersection.object;
              obj.traverseAncestors( (obj) => {
                if(obj instanceof THREE.AuroraModel){

                  if(typeof onSuccess === 'function')
                    onSuccess(obj, intersection.object);

                  //After picking is done reshow all placeables that we hid
                  /*for(let i = 0; i < Game.module.area.placeables.length; i++){
                    let plc = Game.module.area.placeables[i];
                    if(plc.model instanceof THREE.AuroraModel){
                      plc.model.visible = plc.wasVisible;
                    }
                  }*/

                  return;
                }
              });
            }
          }
          
        }
      });
    }

    for(let i = 0; i < Game.module.area.placeables.length; i++){
      let plc = Game.module.area.placeables[i];
      if(plc.model instanceof THREE.AuroraModel){
        plc.model.visible = plc.wasVisible;
      }
    }

  }

  static Start(){

    Game.audioEngine = new AudioEngine();
    Game.initGUIAudio();
    LightManager.init();

    Planetary.Init();

    //AudioEngine.Unmute()
    Game.Mode = Game.MODES.MAINMENU;
    Game.State = Game.STATES.RUNNING;
    Game.inMenu = false;
    let _initGlobals = Global.kotor2DA.globalcat.rows;
    for (var key in _initGlobals) {
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

    SaveGame.getSaveGames( () => {

      CursorManager.init( () => {

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
          'LoadScreen',
          'InGameOverlay',
          'InGameDialog',
          'InGameComputer',
          'MenuContainer',

          /*'CharGenClass',
          'CharGenPortCust', //Character Portrait
          'CharGenMain',

          'MenuSaveLoad',
          'MainOptions',
          'MainMovies',
          'MenuSound',
          'MenuGraphics',
          'MenuResolutions',
          'InGameOverlay',
          'InGameAreaTransition',
          'InGamePause',
          'MenuOptions',
          'MenuMap',
          'MenuJournal',
          'MenuInventory',
          'MenuEquipment',
          'MenuCharacter',
          'MenuMessages',
          'MenuPartySelection',
          'MenuTop',
          'InGameDialog',
          'MenuContainer',
          'MenuGalaxyMap',
          'MenuLevelUp',
          'CharGenQuickOrCustom',
          'CharGenQuickPanel',
          'CharGenCustomPanel',
          'CharGenName',*/
        ];

        let menuLoader = (i = 0, onComplete) => {
          if(i < menus.length){
            let menuName = menus[i++];
            Game[menuName] = new window[menuName]({
              onLoad: () => {
                menuLoader(i, onComplete);
              }
            });
          }else{
            if(typeof onComplete === 'function')
              onComplete();
          }
        }

        menuLoader(0, () => {
          Game.MainMenu.Show();
          $( window ).trigger('resize');
          this.setTestingGlobals();
          Game.Update();
        })

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
    ModuleObject.COUNT = 0;
    Game.renderer.setClearColor(new THREE.Color(0, 0, 0));
    Game.AlphaTest = 0.5;
    clearTimeout(Game.Heartbeat);
    Game.audioEngine.stopBackgroundMusic();
    Game.audioEngine.Reset();

    Game.InGameOverlay.Show();
    Game.InGameOverlay.Hide();

    LightManager.clearLights();

    Game.selected = undefined;
    Game.selectedObject = undefined;
    Game.hovered = undefined;
    Game.hoveredObject = undefined;

    if(!AudioEngine.isMuted)
      AudioEngine.Mute();

    Game.InGameOverlay.Hide();
    Game.Mode = Game.MODES.LOADING;
    Game.collisionList = [];

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
      Game.scene.remove(wlkmesh);
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
      while (Game.module.rooms.length){
        Game.module.rooms[0].destroy();
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
      while (Game.group.party.children.length > 1){
        Game.group.party.children[1].dispose();
        Game.group.party.remove(Game.group.party.children[1]);
      }
      //Clear sound geometries
      while (Game.group.sounds.children.length){
        Game.group.sounds.remove(Game.group.sounds.children[0]);
      }

      //Clear party geometries
      /*while (PartyManager.party.length){
        PartyManager.party[0].destroy();
        PartyManager.party.shift();
      }*/

    }

    //Resets all keys to their default state
    Game.controls.InitKeys();

    Module.BuildFromExisting(name, waypoint, (module) => {

      Game.scene.visible = false;

      Game.LoadScreen.setLoadBackground('load_'+name, () => {
        Game.LoadScreen.showRandomHint();
        Game.InGameOverlay.Hide();
        Game.MainMenu.Hide();
        Game.LoadScreen.Show();

        module.loadScene( (d) => {
          module.initScripts();
          //Game.scene_gui.background = null;
          Game.scene.visible = true;
          Game.LoadScreen.Hide();
          Game.FadeOverlay.FadeOut(0, 0, 0, 0);

          if(Game.module.area.MiniGame){
            Game.Mode = Game.MODES.MINIGAME
          }else{
            Game.Mode = Game.MODES.INGAME;
          }

          console.log('loadScene', d);

          Game.InGameDialog.audioEmitter = new AudioEmitter({
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
              volume: 100,
              positional: 0
            },
            onLoad: () => {
            },
            onError: () => {
            }
          });
          Game.audioEngine.AddEmitter(Game.InGameDialog.audioEmitter);

          process.nextTick( ()=> {
            if(Game.module.area.scripts.OnEnter instanceof NWScript){
              Game.module.area.scripts.OnEnter.enteringObject = Game.player;
              Game.module.area.scripts.OnEnter.run(Game.module.area, 0, () => {
                AudioEngine.Unmute();
                //Game.InGameDialog.audioEmitter = undefined
                Game.InGameOverlay.RecalculatePosition();
                Game.InGameOverlay.Show();
                setTimeout( () => {
                  console.log('HOLDFADE', Game.holdWorldFadeInForDialog, Game.inDialog);
                  if(!Game.holdWorldFadeInForDialog)
                    Game.FadeOverlay.FadeIn(1, 0, 0, 0);
                  console.log('onEnter Completed', Game.module);

                  //console.log('Running creature onSpawn scripts');
                  for(let i = 0; i < Game.module.area.creatures.length; i++){
                    if(Game.module.area.creatures[i] instanceof ModuleCreature){
                      if(Game.module.area.creatures[i].scripts.onSpawn instanceof NWScript){
                        try{
                          //Game.module.area.creatures[i].scripts.onSpawn.run(Game.module.area.creatures[i]);
                        }catch(e){
                          console.error(e);
                        }
                      }
                    }
                  }
                }, 1000);

              });
              if(Game.module.area.MiniGame){
                Game.Mode = Game.MODES.MINIGAME
              }else{
                Game.Mode = Game.MODES.INGAME;
              }
              AudioEngine.Unmute();
            }else{
              if(Game.module.area.MiniGame){
                Game.Mode = Game.MODES.MINIGAME
              }else{
                Game.Mode = Game.MODES.INGAME;
              }
              AudioEngine.Unmute();
              //Game.InGameDialog.audioEmitter = undefined
              Game.InGameOverlay.RecalculatePosition();
              Game.InGameOverlay.Show();
              setTimeout( () => {
                console.log('HOLDFADE', Game.holdWorldFadeInForDialog, Game.inDialog);
                if(!Game.holdWorldFadeInForDialog)
                  Game.FadeOverlay.FadeIn(1, 0, 0, 0);
                console.log('onEnter Completed', Game.module);

                //console.log('Running creature onSpawn scripts');
                for(let i = 0; i < Game.module.area.creatures.length; i++){
                  if(Game.module.area.creatures[i] instanceof ModuleCreature){
                    if(Game.module.area.creatures[i].scripts.onSpawn instanceof NWScript){
                      try{
                        //Game.module.area.creatures[i].scripts.onSpawn.run(Game.module.area.creatures[i]);
                      }catch(e){
                        console.error(e);
                      }
                    }
                  }
                }
              }, 1000);
            }
            Game.renderer.setClearColor(new THREE.Color(Game.module.area.SunFogColor));
          });

          //Disable lighting because it no worky right
          //LightManager.clearLights();

        })

        console.log(module);

        Game.LoadScreen.setProgress(0);

      });

    });

  }

  static UpdateFollowerCamera(delta = 0) {
    
    for(let i = 0; i < Game.collisionList.length; i++){
      let obj = Game.collisionList[i];
      if(obj instanceof THREE.Mesh){
        obj.visible = true;
      }
    }

    let followee = Game.getCurrentPlayer();

    let camStyle = Game.module.getCameraStyle();
    let cameraHeight = 0.45; //Should be aquired from the appropriate camerastyle.2da row set by the current module

    let offsetHeight = 0;

    if(Game.Mode == Game.MODES.MINIGAME){
      offsetHeight = 1;
    }else{
      if(!isNaN(parseFloat(followee.getAppearance().cameraheightoffset))){
        offsetHeight = parseFloat(followee.getAppearance().cameraheightoffset);
      }
    }
    
    let camHeight = new THREE.Vector3(0, 0, (1+cameraHeight)-offsetHeight);
    let distance = camStyle.distance;
    
    let camPosition = followee.getModel().position.clone().add(new THREE.Vector3(distance*Math.cos(Game.followerCamera.facing), distance*Math.sin(Game.followerCamera.facing), 1.8));
    
    let frontRay = followee.getModel().position.clone().add(new THREE.Vector3(-1*Math.cos(Game.followerCamera.facing), -1*Math.sin(Game.followerCamera.facing), 1.8));
    let backRay = followee.getModel().position.clone().add(new THREE.Vector3(1*Math.cos(Game.followerCamera.facing), 1*Math.sin(Game.followerCamera.facing), 1.8));
    let detect = false;
    let fDir = new THREE.Vector3(1*Math.cos(Game.followerCamera.facing), 1*Math.sin(Game.followerCamera.facing), 0);
    //let bDir = new THREE.Vector3(-1*Math.cos(Game.followerCamera.facing), -1*Math.sin(Game.followerCamera.facing), 0);
    Game.raycaster.ray.direction.set(fDir.x,fDir.y,0);
    Game.raycaster.ray.origin.set(frontRay.x,frontRay.y,frontRay.z);
    
    let intersects = Game.raycaster.intersectObjects( Game.collisionList );
    if ( intersects.length > 0 ) {
      if(intersects[ 0 ].distance < 2){
        distance = intersects[ 0 ].distance * .75;
        detect = true
      }
    }

    if(!detect){
      Game.raycaster.ray.direction.set(fDir.x,fDir.y,0);
      Game.raycaster.ray.origin.set(backRay.x,backRay.y,backRay.z);
      let intersects = Game.raycaster.intersectObjects( Game.collisionList );
      if ( intersects.length > 0 ) {
        if(intersects[ 0 ].distance < 2){
          distance = intersects[ 0 ].distance * .75;
        }
      }
    }

    for(let i = 0; i < Game.collisionList.length; i++){
      let obj = Game.collisionList[i];
      if(obj instanceof THREE.Mesh){
        obj.visible = false;
      }
    }

    if(Game.Mode == Game.MODES.MINIGAME){
      Game.followerCamera.position.copy(followee.camera.camerahook.getWorldPosition(new THREE.Vector3()));
      Game.followerCamera.quaternion.copy(followee.camera.camerahook.getWorldQuaternion(new THREE.Quaternion()));

      switch(Game.module.area.MiniGame.Type){
        case 1: //SWOOPRACE
          Game.followerCamera.fov = Game.module.area.MiniGame.CameraViewAngle;
        break;
        case 2: //TURRET
          Game.followerCamera.fov = Game.module.area.MiniGame.CameraViewAngle;
        break;
      }

      Game.followerCamera.fov =Game.module.area.MiniGame.CameraViewAngle;

    }else{
      Game.followerCamera.position.copy(followee.getModel().position.clone().add(new THREE.Vector3(distance*Math.cos(Game.followerCamera.facing), distance*Math.sin(Game.followerCamera.facing), 1.8)));
      Game.followerCamera.lookAt(followee.getModel().position.clone().add(camHeight));
    }
    
    Game.followerCamera.updateProjectionMatrix();

  }

  static UpdateVideoEffect(){
    if(!isNaN(parseInt(Game.videoEffect))){
      let effect = Global.kotor2DA.videoeffects.rows[Game.videoEffect];

      if(parseInt(effect.enablesaturation)){
        Game.saturationPass.enabled = true;
        Game.colorPass.enabled = true;
        
        Game.saturationPass.uniforms.saturation.value = parseFloat(effect.saturation_pc);
        
        Game.colorPass.uniforms.addRGB.value.set(
          parseFloat(effect.modulationred_pc)-1,
          parseFloat(effect.modulationgreen_pc)-1,
          parseFloat(effect.modulationblue_pc)-1
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
    requestAnimationFrame( () => { Game.Update() } );
    if(!Game.visible)
      return;

    Game.UpdateVideoEffect();

    var delta = Game.clock.getDelta();

    Game.limiter.now = Date.now();
    Game.limiter.elapsed = Game.limiter.now - Game.limiter.then;

    Game.currentRoom = null;
    Game.currentDistance = 10000000;

    Game.__rooms = [];

    for(let emitter in Game.emitters){
      //console.log(emitter);
      Game.emitters[emitter].tick(delta);
    }

    // if enough time has elapsed, draw the next frame
    if (Game.limiter.elapsed > Game.limiter.fpsInterval) {

      if(Game.Mode == Game.MODES.MINIGAME || (Game.Mode == Game.MODES.INGAME && Game.State != Game.STATES.PAUSED && !Game.MenuActive)){

        let walkCount = Game.walkmeshList.length;
        let roomCount = Game.group.rooms.children.length;

        let trigCount = Game.module.area.triggers.length;
        let creatureCount = Game.module.area.creatures.length;
        let placeableCount = Game.module.area.placeables.length;
        let doorCount = Game.module.area.doors.length;
        let partyCount = PartyManager.party.length;
        let animTexCount = AnimatedTextures.length;

        for(let i = 0; i < walkCount; i++){
          let obj = Game.walkmeshList[i];
          if(obj instanceof THREE.Mesh){
            obj.visible = true;
          }
        }
      
        for(let i = 0; i < roomCount; i++){
          let obj = Game.group.rooms.children[i];
          if(obj instanceof THREE.AuroraModel){
            obj.moduleObject.hide();
            //obj.turnLightsOff();
            obj.update(delta);
          }
        }

        Game.UpdateVisibleRooms();

        //Check triggers
        for(let i = 0; i < trigCount; i++){
          Game.module.area.triggers[i].update(delta);
        }

        for(let i = 0; i < partyCount; i++){
          PartyManager.party[i].update(delta);
        }
    
        for(let i = 0; i < creatureCount; i++){
          Game.module.area.creatures[i].update(delta);
        }
    
        for(let i = 0; i < placeableCount; i++){
          Game.module.area.placeables[i].update(delta);
        }
    
        for(let i = 0; i < doorCount; i++){
          Game.module.area.doors[i].update(delta);
        }

        for(let i = 0; i < animTexCount; i++){
          AnimatedTextures[i].Update(100 * delta);
        }

        if(Game.Mode == Game.MODES.MINIGAME){

        }

        for(let i = 0; i < Game.walkmeshList.length; i++){
          let obj = Game.walkmeshList[i];
          if(obj instanceof THREE.Mesh){
            obj.visible = false;
          }
        }

        if(Game.inDialog){
          Game.InGameDialog.Update(delta);
        }/*else if(Game.MenuCharacter.bVisible){
          Game.MenuCharacter.Update(delta);
        }else if(Game.MenuGalaxyMap.bVisible){
          Game.MenuGalaxyMap.Update(delta);
        }*/

        Game.UpdateFollowerCamera(delta);

      }else if(Game.Mode == Game.MODES.MAINMENU){
        //if(Game.CharGenClass.bVisible){
        //  Game.CharGenClass.Update(delta);
        //}else{
          Game.MainMenu.Update(delta);
        //}
      }/*else if(Game.MenuCharacter.bVisible){
        Game.MenuCharacter.Update(delta);
      }else if(Game.MenuGalaxyMap.bVisible){
        Game.MenuGalaxyMap.Update(delta);
      }*/

      //Game.limiter.then = Game.limiter.now - (Game.limiter.elapsed % Game.limiter.fpsInterval);
      
    }

    if(Game.Mode == Game.MODES.INGAME){

      Game.FadeOverlay.Update(delta);
      LightManager.update(delta);

      Game.InGameOverlay.Update(delta);
      //Game.InGameAreaTransition.Update(delta);
      
      if(Game.State == Game.STATES.PAUSED && !Game.MenuActive){
        //if(!Game.InGamePause.IsVisible())
        //  Game.InGamePause.Show();
        //Game.InGamePause.Update(delta);
      }else{
        //if(Game.InGamePause.IsVisible() || Game.MenuActive)
        //  Game.InGamePause.Hide();
      }
    }else if(Game.Mode == Game.MODES.MINIGAME){
      Game.FadeOverlay.Update(delta);
      LightManager.update(delta);
      Game.InGameOverlay.Hide();
    }

    Game.updateCursor();

    try{
      Game.audioEngine.Update(Game.currentCamera.position, Game.currentCamera.rotation);
    }catch(e){ }

    Game.controls.Update(delta);

    if (Game.limiter.elapsed > Game.limiter.fpsInterval) {
      Game.renderPass.camera = Game.currentCamera;
      Game.composer.render();
    }

    if(Game.Mode == Game.MODES.INGAME || Game.Mode == Game.MODES.MINIGAME){
      Game.octree.update();
      Game.octree_walkmesh.update();
    }

    Game.stats.update();
  }

  static UpdateVisibleRooms(){
    if(Game.inDialog){

      let rooms = [];
      //let _room = undefined;
      //let _distance = 1000000000;
      for(let i = 0; i < Game.module.rooms.length; i++){
        let room = Game.module.rooms[i];
        let model = room.model;
        if(model instanceof THREE.AuroraModel){
          let pos = Game.currentCamera.position.clone().add(Game.playerFeetOffset);
          if(model.box.containsPoint(pos)){
            rooms.push(room);
            /*let roomCenter = model.box.getCenter(new THREE.Vector3()).clone();
            let distance = pos.distanceTo(roomCenter);
            if(distance < _distance){
              _distance = distance;
              _room = room;
            }*/
          }
        }
      }

      //if(_room)
        //_room.show(true);

      for(let i = 0; i < rooms.length; i++){
        rooms[i].show(true);
      }

    }else if(PartyManager.party[0]){

      let rooms = [];
      //let _room = undefined;
      //let _distance = 1000000000;
      for(let i = 0; i < Game.module.rooms.length; i++){
        let room = Game.module.rooms[i];
        let model = room.model;
        if(model instanceof THREE.AuroraModel){
          let pos = PartyManager.party[0].model.position.clone().add(Game.playerFeetOffset);
          if(model.box.containsPoint(pos)){
            rooms.push(room);
            /*let roomCenter = model.box.getCenter(new THREE.Vector3()).clone();
            let distance = pos.distanceTo(roomCenter);
            if(distance < _distance){
              _distance = distance;
              _room = room;
            }*/
          }
        }
      }

      //if(_room)
        //_room.show(true);

      for(let i = 0; i < rooms.length; i++){
        rooms[i].show(true);
      }

    }
  }

  static getCurrentPlayer(){
    let p = PartyManager.party[0];
    return p ? p : Game.player;
  }


  static updateCursor(){
    CursorManager.setCursor('default');
    Game.scene_cursor_holder.position.x = Mouse.Client.x - (window.innerWidth/2) + (32/2);
    Game.scene_cursor_holder.position.y = (Mouse.Client.y*-1) + (window.innerHeight/2) - (32/2);
    
    let cursorCaptured = false;
    let guiHoverCaptured = false;

    let uiControls = Game.controls.MenuGetActiveUIElements();
    for(let i = 0; i < uiControls.length; i++){
      let control = uiControls[i];
      //if(control === Game.mouse.clickItem){
      if(control instanceof GUIListBox && Game.hoveredGUIElement == undefined){
        Game.hoveredGUIElement = control;
      }
      
      if(!(control.widget.parent instanceof THREE.Scene)){
        try{
          if(!guiHoverCaptured){
            let cMenu = control.menu;
            cMenu.SetWidgetHoverActive(control);
            guiHoverCaptured = false;
          }

          if(typeof control.isClickable == 'function'){
            if(control.isClickable()){
              CursorManager.setCursor('select');
              cursorCaptured = true;
            }
          }
        }catch(e){}
      }
      //}
    }

    if(!cursorCaptured && Game.Mode == Game.MODES.INGAME && !Game.inDialog && !Game.MenuActive){
      //console.log(Game.scene_cursor_holder.position);
      let hoveredObject = false;
      Game.onMouseHitInteractive( (obj) => {
        if(obj.moduleObject instanceof ModuleObject && obj.moduleObject.isUseable()){
          if(obj != Game.getCurrentPlayer().getModel()){

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
                if(canChangeCursor)
                  CursorManager.setCursor('attack');
                else
                  CursorManager.setCursor('select');

                CursorManager.setReticle('reticleH');
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

    if(Game.hovered instanceof THREE.Object3D && !Game.inDialog && !Game.MenuContainer.bVisible){
      CursorManager.reticle.position.copy(Game.hovered.getWorldPosition(new THREE.Vector3()));
      CursorManager.reticle.visible = true;
    }else{
      CursorManager.reticle.visible = false;
    }

    if(Game.selected instanceof THREE.Object3D && !Game.inDialog && !Game.MenuContainer.bVisible){
      CursorManager.reticle2.position.copy(Game.selected.getWorldPosition(new THREE.Vector3()));
      CursorManager.reticle2.visible = true;
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