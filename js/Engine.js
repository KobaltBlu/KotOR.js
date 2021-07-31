/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The Engine class.
 */

class Engine {

  static Init(){
    
  }

  static updateFrustumObjects(object){

    // every time the camera or objects change position (or every frame)
    Engine.currentCamera.updateMatrixWorld(); // make sure the camera matrix is updated
    Engine.currentCamera.matrixWorldInverse.copy(Engine.currentCamera.matrixWorld).invert();
    Engine.viewportProjectionMatrix.multiplyMatrices( Engine.currentCamera.projectionMatrix, Engine.currentCamera.matrixWorldInverse );
    Engine.viewportFrustum.setFromMatrix( Engine.viewportProjectionMatrix );

    // frustum is now ready to check all the objects you need
    //frustum.intersectsObject( object )
  }

  static onMouseHitInteractive( onSuccess = null ){
    
    Engine.raycaster.setFromCamera( Engine.mouse, Engine.camera );
    let intersects = Engine.raycaster.intersectObjects( Engine.interactableObjects, true );

    if(intersects.length){
      let intersection = intersects[0],
          obj = intersection.object;

      obj.traverseAncestors( (obj) => {
        if(obj instanceof THREE.AuroraModel){
          if(obj != Engine.getCurrentPlayer().getModel()){
            if(typeof onSuccess === 'function')
              onSuccess(obj, intersection.object);

            return;
          }else{
            if(intersects.length >=2){
              intersection = intersects[1],
              obj = intersection.object;
              obj.traverseAncestors( (obj) => {
                if(obj instanceof THREE.AuroraModel){
                  if(typeof onSuccess === 'function')
                    onSuccess(obj, intersection.object);

                  return;
                }
              });
            }
          }
          
        }
      });
    }
  }

  static Start(){

  }

  static onHeartbeat(){

    if(Engine.module){

      Engine.Heartbeat = setTimeout( () => {
        Engine.onHeartbeat();
      }, Engine.HeartbeatTimer);

      for(let i = 0; i < Engine.module.party.length; i++){
        if(Engine.module.party[i].scripts.onHeartbeat){
          Engine.module.party[i].scripts.onHeartbeat.run(
            Engine.module.party[i]
          );
        }
      }

      for(let i = 0; i < Engine.module.area.creatures.length; i++){
        if(Engine.module.area.creatures[i].scripts.onHeartbeat){
          Engine.module.area.creatures[i].scripts.onHeartbeat.run(
            Engine.module.area.creatures[i]
          );
        }
      }

      for(let i = 0; i < Engine.module.area.placeables.length; i++){
        if(Engine.module.area.placeables[i].scripts.onHeartbeat){
          Engine.module.area.placeables[i].scripts.onHeartbeat.run(
            Engine.module.area.placeables[i]
          );
        }
      }

      for(let i = 0; i < Engine.module.area.doors.length; i++){
        if(Engine.module.area.doors[i].scripts.onHeartbeat){
          Engine.module.area.doors[i].scripts.onHeartbeat.run(
            Engine.module.area.doors[i]
          );
        }
      }

      for(let i = 0; i < Engine.module.area.triggers.length; i++){
        if(Engine.module.area.triggers[i].scripts.onHeartbeat){
          Engine.module.area.triggers[i].scripts.onHeartbeat.run(
            Engine.module.area.triggers[i]
          );
        }
      }

      for(let i = 0; i < Engine.module.encounters.length; i++){
        if(Engine.module.encounters[i].scripts.onHeartbeat){
          Engine.module.encounters[i].scripts.onHeartbeat.run(
            Engine.module.encounters[i]
          );
        }
      }

    }

  }

  static LoadModule(name = '', waypoint = null){
    clearTimeout(Engine.Heartbeat);
    Engine.holdWorldFadeInForDialog = false;
    Engine.audioEngine.stopBackgroundMusic();
    Engine.audioEngine.Reset();

    Engine.InGameOverlay.Show();
    Engine.InGameOverlay.Hide();

    LightManager.clearLights();

    Engine.selected = undefined;
    Engine.hovered = undefined;

    if(!AudioEngine.isMuted)
      AudioEngine.Mute();

    //Engine.InGameOverlay.Hide();
    Engine.Mode = Engine.MODES.LOADING;
    Engine.collisionList = [];

    //Cleanup texture cache ignoring GUI & LBL textures
    Object.keys(TextureLoader.textures).forEach( (key) => {

      if(key.substr(0, 3) == 'lbl' || key.substr(0, 3) == 'gui')
        return;

      TextureLoader.textures[key].dispose();
      delete TextureLoader.textures[key]; 

    });

    //Clear walkmesh list
    while (Engine.walkmeshList.length){
      let wlkmesh = Engine.walkmeshList.shift();
      //wlkmesh.dispose();
      Engine.scene.remove(wlkmesh);
      Engine.octree_walkmesh.remove(wlkmesh);
    }

    Engine.octree_walkmesh.rebuild();

    Engine.emitters = {};

    //Clear emitters
    while (Engine.group.emitters.children.length){
      Engine.group.emitters.remove(Engine.group.emitters.children[0]);
    }

    //Clear room geometries
    while (Engine.group.rooms.children.length){
      Engine.group.rooms.remove(Engine.group.rooms.children[0]);
    }

    //Clear creature geometries
    while (Engine.group.creatures.children.length){
      Engine.group.creatures.remove(Engine.group.creatures.children[0]);
    }

    //Clear placeable geometries
    while (Engine.group.placeables.children.length){
      Engine.group.placeables.remove(Engine.group.placeables.children[0]);
    }

    //Clear door geometries
    while (Engine.group.doors.children.length){
      Engine.group.doors.remove(Engine.group.doors.children[0]);
    }

    //Clear party geometries
    while (Engine.group.party.children.length){
      Engine.group.party.remove(Engine.group.party.children[0]);
    }

    //Clear sound geometries
    while (Engine.group.sounds.children.length){
      Engine.group.sounds.remove(Engine.group.sounds.children[0]);
    }

    //Clear trigger geometries
    while (Engine.group.triggers.children.length){
      Engine.group.triggers.remove(Engine.group.triggers.children[0]);
    }

    //Resets all keys to their default state
    Engine.controls.InitKeys();

    Module.BuildFromExisting(name, waypoint, (module) => {

      Engine.scene.visible = false;

      Engine.LoadScreen.setLoadBackground('load_'+name, () => {
        Engine.LoadScreen.lbl_hint.setText('@ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        Engine.InGameOverlay.Hide();
        Engine.MainMenu.Hide();
        Engine.LoadScreen.Show();

        module.loadScene( (d) => {
          //Engine.scene_gui.background = null;
          Engine.scene.visible = true;
          Engine.LoadScreen.Hide();
          Engine.FadeOverlay.FadeOut(0, 0, 0, 0);
          Engine.Mode = Engine.MODES.INGAME;
          console.log('loadScene', d);

          process.nextTick( ()=> {
            if(Engine.module.area.scripts.onEnter instanceof NWScriptInstance){
              Engine.module.area.scripts.onEnter.enteringObject = Engine.player;
              Engine.module.area.scripts.onEnter.run(Engine.module.area, 0, () => {
                AudioEngine.Unmute();
                Engine.InGameDialog.audioEmitter = undefined
                Engine.InGameOverlay.RecalculatePosition();
                Engine.InGameOverlay.Show();
                console.log('HOLDFADE', Engine.holdWorldFadeInForDialog, Engine.inDialog);
                if(!Engine.holdWorldFadeInForDialog)
                  Engine.FadeOverlay.FadeIn(1, 0, 0, 0);


                console.log('onEnter Completed', Engine.module);

                //console.log('Running creature onSpawn scripts');
                for(let i = 0; i < Engine.module.area.creatures.length; i++){
                  if(Engine.module.area.creatures[i] instanceof ModuleCreature){
                    if(Engine.module.area.creatures[i].scripts.onSpawn instanceof NWScriptInstance){
                      try{
                        Engine.module.area.creatures[i].scripts.onSpawn.run(Engine.module.area.creatures[i]);
                      }catch(e){
                        console.error(e);
                      }
                    }
                  }
                }

              });
            }
          });

          //Disable lighting because it no worky right
          //LightManager.clearLights();

        })

        console.log(module);

        Engine.LoadScreen.setProgress(0);

      });

    });

  }

  static UpdateFollowerCamera(delta = 0) {
    
    for(let i = 0; i < Engine.collisionList.length; i++){
      let obj = Engine.collisionList[i];
      if(obj instanceof THREE.Mesh){
        obj.visible = true;
      }
    }

    let followee = Engine.getCurrentPlayer();

    let camStyle = Engine.module.getCameraStyle();

    let camHeight = new THREE.Vector3(0, 0, 1.6);
    let distance = camStyle.distance;
    
    let camPosition = followee.getModel().position.clone().add(new THREE.Vector3(distance*Math.cos(Engine.followerCamera.facing), distance*Math.sin(Engine.followerCamera.facing), 1.8));
    
    let frontRay = followee.getModel().position.clone().add(new THREE.Vector3(-1*Math.cos(Engine.followerCamera.facing), -1*Math.sin(Engine.followerCamera.facing), 1.8));
    let backRay = followee.getModel().position.clone().add(new THREE.Vector3(1*Math.cos(Engine.followerCamera.facing), 1*Math.sin(Engine.followerCamera.facing), 1.8));
    let detect = false;
    let fDir = new THREE.Vector3(1*Math.cos(Engine.followerCamera.facing), 1*Math.sin(Engine.followerCamera.facing), 0);
    //let bDir = new THREE.Vector3(-1*Math.cos(Engine.followerCamera.facing), -1*Math.sin(Engine.followerCamera.facing), 0);
    Engine.raycaster.ray.direction.set(fDir.x,fDir.y,0);
    Engine.raycaster.ray.origin.set(frontRay.x,frontRay.y,frontRay.z);
    
    let intersects = Engine.raycaster.intersectObjects( Engine.collisionList );
    if ( intersects.length > 0 ) {
      if(intersects[ 0 ].distance < 2){
        distance = intersects[ 0 ].distance * .75;
        detect = true
      }
    }

    if(!detect){
      Engine.raycaster.ray.direction.set(fDir.x,fDir.y,0);
      Engine.raycaster.ray.origin.set(backRay.x,backRay.y,backRay.z);
      let intersects = Engine.raycaster.intersectObjects( Engine.collisionList );
      if ( intersects.length > 0 ) {
        if(intersects[ 0 ].distance < 2){
          distance = intersects[ 0 ].distance * .75;
        }
      }
    }

    for(let i = 0; i < Engine.collisionList.length; i++){
      let obj = Engine.collisionList[i];
      if(obj instanceof THREE.Mesh){
        obj.visible = false;
      }
    }

    Engine.followerCamera.position.copy(followee.getModel().position.clone().add(new THREE.Vector3(distance*Math.cos(Engine.followerCamera.facing), distance*Math.sin(Engine.followerCamera.facing), 1.8)));
    Engine.followerCamera.lookAt(followee.getModel().position.clone().add(camHeight));
    Engine.followerCamera.updateProjectionMatrix();

  }

  static getCurrentPlayer(){
    let p = Engine.module.party[0];
    return p ? p : Engine.player;
  }


  static updateCursor(){
    CursorManager.setCursor('default');
    Engine.scene_cursor_holder.position.x = Mouse.Client.x - (window.innerWidth/2) + (32/2);
    Engine.scene_cursor_holder.position.y = (Mouse.Client.y*-1) + (window.innerHeight/2) - (32/2);
    
    let cursorCaptured = false;
    let guiHoverCaptured = false;

    let uiControls = Engine.controls.MenuGetActiveUIElements();
    for(let i = 0; i < uiControls.length; i++){
      let control = uiControls[i];
      //if(control === Engine.mouse.clickItem){
      if(!(control.widget.parent instanceof THREE.Scene)){
        try{
          if(!guiHoverCaptured){
            let cMenu = control.menu;
            cMenu.SetWidgetHoverActive(control);
            guiHoverCaptured = true;
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

    /*Engine.raycaster.setFromCamera( Mouse.Vector, Engine.camera_gui );
    
    let intersects = Engine.raycaster.intersectObjects( Engine.scene_gui.children, true ).reverse();
    if(intersects.length){
      intersects.forEach(function(element){
        if(element.object instanceof THREE.Mesh){
          if(typeof element.object.parent.parent !== 'undefined'){
            if(!(element.object.parent.parent instanceof THREE.Scene)){
              try{
                if(!guiHoverCaptured){
                  let cMenu = element.object.getControl().menu;
                  cMenu.SetWidgetHoverActive(element.object.getControl());
                  guiHoverCaptured = true;
                }

                if(typeof element.object.isClickable == 'function'){
                  if(element.object.isClickable()){
                    CursorManager.setCursor('select');
                    cursorCaptured = true;
                  }
                }
              }catch(e){}
            }
          }
        }
      });
    }*/

    if(!cursorCaptured && Engine.Mode == Engine.MODES.INGAME && !Engine.inDialog && !Engine.MenuActive){
      //console.log(Engine.scene_cursor_holder.position);
      Engine.onMouseHitInteractive( (obj) => {
        if(typeof obj.moduleObject !== 'undefined'){
          if(obj != Engine.getCurrentPlayer().getModel()){

            if(obj.moduleObject instanceof ModuleDoor){
              CursorManager.setCursor('door');
              CursorManager.setReticle('reticleF');
            }else if(obj.moduleObject instanceof ModulePlaceable){
              if(!obj.moduleObject.isUseable()){
                return;
              }
              CursorManager.setCursor('use');
              CursorManager.setReticle('reticleF');
            }else if(obj.moduleObject instanceof ModuleCreature){

              if(obj.moduleObject.isHostile(Engine.getCurrentPlayer())){
                CursorManager.setCursor('attack');
                CursorManager.setReticle('reticleH');
              }else{
                CursorManager.setCursor('talk');
                CursorManager.setReticle('reticleF');
              }

            }else{
              console.log()
              //Engine.hovered = undefined;
            }

            if(obj.lookathook != undefined){
              CursorManager.reticle.position.copy(obj.lookathook.getWorldPosition(new THREE.Vector3()));
              Engine.hovered = obj.lookathook;
            }else if(obj.headhook != undefined){
              CursorManager.reticle.position.copy(obj.headhook.getWorldPosition(new THREE.Vector3()));
              Engine.hovered = obj.headhook;
            }else{
              try{
                CursorManager.reticle.position.copy(obj.getObjectByName('camerahook').getWorldPosition(new THREE.Vector3()));
                Engine.hovered = obj.getObjectByName('camerahook');
              }catch(e){ }
            }

          }
        }
      });
    }

    if(Engine.hovered instanceof THREE.Object3D && !Engine.inDialog){
      CursorManager.reticle.position.copy(Engine.hovered.getWorldPosition(new THREE.Vector3()));
      CursorManager.reticle.visible = true;
    }else{
      CursorManager.reticle.visible = false;
    }
  }

  static getCameraById(id = 0){

    for(let i = 0; i < Game.staticCameras.length; i++){
      if(Game.staticCameras[i].ingameID == id)
        return Game.staticCameras[i];
    }

    return Game.camera;

  }

  static isPartyMemberAvailable(nPartyMember = 0){
    return true;
  }

  static rollD2(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*2) + 1
    }
    return rolled;
  }

  static rollD3(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*3) + 1
    }
    return rolled;
  }

  static rollD4(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*4) + 1
    }
    return rolled;
  }

  static rollD6(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*6) + 1
    }
    return rolled;
  }

  static rollD8(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*8) + 1
    }
    return rolled;
  }

  static rollD10(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*10) + 1
    }
    return rolled;
  }

  static rollD12(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*12) + 1
    }
    return rolled;
  }

  static rollD20(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*20) + 1
    }
    return rolled;
  }

  static rollD100(nNumDice = 1){
    let rolled = 0;
    for(let i = 0; i < nNumDice; i++){
      rolled += Math.round(Math.random()*100) + 1
    }
    return rolled;
  }

  static GetObjectByTag(sTag = '', iNum = 0, oType = OBJECT_TYPE_ALL){

    /*OBJECT_TYPE_CREATURE         = 1;
    OBJECT_TYPE_ITEM             = 2;
    OBJECT_TYPE_TRIGGER          = 4;
    OBJECT_TYPE_DOOR             = 8;
    OBJECT_TYPE_AREA_OF_EFFECT   = 16;
    OBJECT_TYPE_WAYPOINT         = 32;
    OBJECT_TYPE_PLACEABLE        = 64;
    OBJECT_TYPE_STORE            = 128;
    OBJECT_TYPE_ENCOUNTER        = 256;
    OBJECT_TYPE_SOUND            = 512;
    OBJECT_TYPE_ALL              = 32767;*/

    sTag = sTag.toLowerCase();
    let len = Game.module.area.placeables.length;
    let results = [];
    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_PLACEABLE){
      for(let i = 0; i < len; i++){
        if(Game.module.area.placeables[i].getTag().toLowerCase() == sTag)
          results.push(Game.module.area.placeables[i]);
      }
    }

    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_CREATURE){
      len = Game.module.area.creatures.length;
      for(let i = 0; i < len; i++){
        if(Game.module.area.creatures[i].getTag().toLowerCase() == sTag)
          results.push(Game.module.area.creatures[i]);
      }
    }

    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_CREATURE){
      len = PartyManager.party.length;
      for(let i = 0; i < len; i++){
        if(PartyManager.party[i].getTag().toLowerCase() == sTag)
          results.push(PartyManager.party[i]);
      }
    }

    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_STORE){
      len = Game.module.area.stores.length;
      for(let i = 0; i < len; i++){
        if(Game.module.area.stores[i].getTag().toLowerCase() == sTag)
          results.push(Game.module.area.stores[i]);
      }
    }

    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_DOOR){
      len = Game.module.area.doors.length;
      for(let i = 0; i < len; i++){
        if(Game.module.area.doors[i].getTag().toLowerCase() == sTag)
          results.push(Game.module.area.doors[i]);
      }
    }

    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_TRIGGER){
      len = Game.module.area.triggers.length;
      for(let i = 0; i < len; i++){
        if(Game.module.area.triggers[i].getTag().toLowerCase() == sTag)
          results.push(Game.module.area.triggers[i]);
      }
    }

    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_WAYPOINT){
      len = Game.module.area.waypoints.length;
      for(let i = 0; i < len; i++){
        if(Game.module.area.waypoints[i].getTag().toLowerCase() == sTag)
          results.push(Game.module.area.waypoints[i]);
      }
    }

    if(oType === OBJECT_TYPE_ALL || oType === OBJECT_TYPE_SOUND){
      len = Game.module.area.sounds.length;
      for(let i = 0; i < len; i++){
        if(Game.module.area.sounds[i].getTag().toLowerCase() == sTag)
          results.push(Game.module.area.sounds[i]);
      }
    }

    if(sTag == ''){
      return Game.player;
    }else if(results.length){
      return results[iNum];
    }

    return undefined;

  }

  static GetNearestObjectByTag(sTag = '', oObject = null, iNum = 0){
    sTag = sTag.toLowerCase();
    let results = [];
    let len = Game.module.area.placeables.length;
    for(let i = 0; i < len; i++){
      if(Game.module.area.placeables[i].getTag().toLowerCase() == sTag)
        if(oObject != Game.module.area.placeables[i])
          results.push(Game.module.area.placeables[i]);
    }

    len = PartyManager.party.length;
    for(let i = 0; i < len; i++){
      if(PartyManager.party[i].getTag().toLowerCase() == sTag)
        if(oObject != PartyManager.party[i])
          results.push(PartyManager.party[i]);
    }

    len = Game.module.area.creatures.length;
    for(let i = 0; i < len; i++){
      if(Game.module.area.creatures[i].getTag().toLowerCase() == sTag)
        if(oObject != Game.module.area.creatures[i])
          results.push(Game.module.area.creatures[i]);
    }

    len = Game.module.area.doors.length;
    for(let i = 0; i < len; i++){
      if(Game.module.area.doors[i].getTag().toLowerCase() == sTag)
        if(oObject != Game.module.area.doors[i])
          results.push(Game.module.area.doors[i]);
    }

    len = Game.module.area.triggers.length;
    for(let i = 0; i < len; i++){
      if(Game.module.area.triggers[i].getTag().toLowerCase() == sTag)
        if(oObject != Game.module.area.triggers[i])
          results.push(Game.module.area.triggers[i]);
    }

    len = Game.module.area.waypoints.length;
    for(let i = 0; i < len; i++){
      if(Game.module.area.waypoints[i].getTag().toLowerCase() == sTag)
        if(oObject != Game.module.area.waypoints[i])
          results.push(Game.module.area.waypoints[i]);
    }

    len = Game.module.area.sounds.length;
    for(let i = 0; i < len; i++){
      if(Game.module.area.sounds[i].getTag().toLowerCase() == sTag)
        if(oObject != Game.module.area.sounds[i])
          results.push(Game.module.area.sounds[i]);
    }

    results.sort(
      function(a,b) {
        try{
          let distanceA = a.getModel().position.distanceTo(oObject.getModel().position);
          let distanceB = b.getModel().position.distanceTo(oObject.getModel().position);
          return (distanceB > distanceA) ? -1 : ((distanceA > distanceB) ? 1 : 0);
        }catch(e){
          return 0;
        }
      }
    );

    if(results.length){
      return results[iNum];
    }

    return undefined;

  }

  static GetNearestObject(nObjectFilter = 0, oObject = null, iNum = 0){
    let results = [];
    switch(nObjectFilter){
      case    OBJECT_TYPE_CREATURE:
        results = Game.module.area.creatures;
      break;
      case    OBJECT_TYPE_ITEM:
        results = [];
      break;
      case    OBJECT_TYPE_TRIGGER:
        results = Game.module.area.triggers;
      break;
      case    OBJECT_TYPE_DOOR:
        results = Game.module.area.doors;
      break;
      case    OBJECT_TYPE_AREA_OF_EFFECT:
        results = [];
      break;
      case    OBJECT_TYPE_WAYPOINT:
        results = Game.module.area.waypoints;
      break;
      case    OBJECT_TYPE_PLACEABLE:
        results = Game.module.area.placeables;
      break;
      case    OBJECT_TYPE_STORE:
        results = Game.module.stores;
      break;
      case    OBJECT_TYPE_ENCOUNTER:
        results = Game.module.encounters;
      break;
      case    OBJECT_TYPE_SOUND:
        results = Game.module.area.sounds;
      break;
      case    OBJECT_TYPE_ALL:
        results = results.concat(Game.module.area.creatures);
        results = results.concat(Game.module.area.triggers);
        results = results.concat(Game.module.area.doors);
        results = results.concat(Game.module.area.waypoints);
        results = results.concat(Game.module.area.placeables);
        results = results.concat(Game.module.area.stores);
        results = results.concat(Game.module.area.encounters);
        results = results.concat(Game.module.area.sounds);
      break;
    }

    results.sort(
      function(a,b) {
        try{
          let distanceA = a.position.distanceTo(oObject.position);
          let distanceB = b.position.distanceTo(oObject.position);
          return (distanceB > distanceA) ? -1 : ((distanceA > distanceB) ? 1 : 0);
        }catch(e){
          return 0;
        }
      }
    );

    if(results.length){
      return results[iNum];
    }

    return undefined;

  }

  static GetFirstObjectInArea(oArea = Game.module.area, nObjectFilter = 0){

    if(!(oArea instanceof ModuleArea)){
      console.error(oArea);
      oArea = Game.module.area;
    }
      

    Game.objSearchIndex = 0;
    switch(nObjectFilter){
      case    OBJECT_TYPE_CREATURE:
        if(oArea.creatures.length){
          return oArea.creatures[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_ITEM:
        return undefined;
      break;
      case    OBJECT_TYPE_TRIGGER:
        if(oArea.triggers.length){
          return oArea.triggers[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_DOOR:
        if(oArea.doors.length){
          return oArea.doors[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_AREA_OF_EFFECT:

      break;
      case    OBJECT_TYPE_WAYPOINT:
        if(oArea.waypoints.length){
          return oArea.waypoints[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_PLACEABLE:
        if(oArea.placeables.length){
          return oArea.placeables[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_STORE:
        if(Game.module.stores.length){
          return Game.module.stores[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_ENCOUNTER:
        if(Game.module.encounters.length){
          return Game.module.encounters[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_SOUND:
        if(oArea.sounds.length){
          return oArea.sounds[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_ALL:
        return undefined;
      break;
    }
  }

  static GetNextObjectInArea(oArea = Game.module.area, nObjectFilter = 0){
    if(!(oArea instanceof ModuleArea)){
      console.error(oArea);
      oArea = Game.module.area;
    }
    ++Game.objSearchIndex;
    switch(nObjectFilter){
      case    OBJECT_TYPE_CREATURE:
        if(Game.objSearchIndex < oArea.creatures.length-1){
          return oArea.creatures[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_ITEM:
        return undefined;
      break;
      case    OBJECT_TYPE_TRIGGER:
        if(Game.objSearchIndex < oArea.triggers.length-1){
          return oArea.triggers[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_DOOR:
        if(Game.objSearchIndex < oArea.doors.length-1){
          return oArea.doors[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_AREA_OF_EFFECT:

      break;
      case    OBJECT_TYPE_WAYPOINT:
        if(Game.objSearchIndex < oArea.waypoints.length-1){
          return oArea.waypoints[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_PLACEABLE:
        if(Game.objSearchIndex < oArea.placeables.length-1){
          return oArea.placeables[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_STORE:
        if(Game.objSearchIndex < Game.module.stores.length-1){
          return Game.module.stores[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_ENCOUNTER:
        if(Game.objSearchIndex < Game.module.encounters.length-1){
          return Game.module.encounters[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_SOUND:
        if(Game.objSearchIndex < oArea.sounds.length-1){
          return oArea.sounds[Game.objSearchIndex];
        }
        return undefined;
      break;
      case    OBJECT_TYPE_ALL:
        return undefined;
      break;
    }
  }

  static GetNearestCreature(nFirstCriteriaType, nFirstCriteriaValue, oTarget=null, nNth=1, nSecondCriteriaType=-1, nSecondCriteriaValue=-1, nThirdCriteriaType=-1,  nThirdCriteriaValue=-1, list = null ){
    
    if(!list){
      list = Game.module.area.creatures;
      list = list.concat(PartyManager.party);
    }

    let results = [];
    
    switch(nFirstCriteriaType){
      case CREATURE_TYPE_RACIAL_TYPE:

      break;
      case CREATURE_TYPE_PLAYER_CHAR:

      break;
      case CREATURE_TYPE_CLASS:

      break;
      case CREATURE_TYPE_REPUTATION:
        switch(nFirstCriteriaValue){
          case REPUTATION_TYPE_FRIEND:
            for(let i = 0; i < list.length; i++){
              if(list[i].isFriendly(oTarget) && oTarget.hasLineOfSight(list[i])){
                results.push(list[i]);
              }
            }
          break;
          case REPUTATION_TYPE_ENEMY:
            for(let i = 0; i < list.length; i++){
              if(list[i].isHostile(oTarget) && oTarget.hasLineOfSight(list[i])){
                results.push(list[i]);
              }
            }
          break;  
          case REPUTATION_TYPE_NEUTRAL:
            for(let i = 0; i < list.length; i++){
              if(list[i].isNeutral(oTarget) && oTarget.hasLineOfSight(list[i])){
                results.push(list[i]);
              }
            }
          break;
        }
      break;
      case CREATURE_TYPE_IS_ALIVE:
        for(let i = 0; i < list.length; i++){
          if(!list[i].isDead()){
            results.push(list[i]);
          }
        }
      break;
      case CREATURE_TYPE_HAS_SPELL_EFFECT:

      break;
      case CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT:

      break;
      case CREATURE_TYPE_PERCEPTION:
        for(let i = 0; i < list.length; i++){
          switch(nFirstCriteriaValue){
            case 0:// PERCEPTION_SEEN_AND_HEARD	0	Both seen and heard (Spot beats Hide, Listen beats Move Silently).
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && o.seen && o.heard ).length){
                results.push(list[i]);
              }
            break;
            case 1:// PERCEPTION_NOT_SEEN_AND_NOT_HEARD	1	Neither seen nor heard (Hide beats Spot, Move Silently beats Listen).
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !o.seen && !o.heard ).length){
                results.push(list[i]);
              }
            break;
            case 2:// PERCEPTION_HEARD_AND_NOT_SEEN	2	 Heard only (Hide beats Spot, Listen beats Move Silently). Usually arouses suspicion for a creature to take a closer look.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !o.seen && o.heard ).length){
                results.push(list[i]);
              }
            break;
            case 3:// PERCEPTION_SEEN_AND_NOT_HEARD	3	Seen only (Spot beats Hide, Move Silently beats Listen). Usually causes a creature to take instant notice.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && o.seen && !o.heard ).length){
                results.push(list[i]);
              }
            break;
            case 4:// PERCEPTION_NOT_HEARD 4 Not heard (Move Silently beats Listen), no line of sight.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !o.heard ).length){
                results.push(list[i]);
              }
            break;
            case 5:// PERCEPTION_HEARD 5 Heard (Listen beats Move Silently), no line of sight.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && o.heard ).length){
                results.push(list[i]);
              }
            break;
            case 6:// PERCEPTION_NOT_SEEN	6	Not seen (Hide beats Spot), too far away to heard or magically silcenced.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !o.seen ).length){
                results.push(list[i]);
              }
            break;
            case 7:// PERCEPTION_SEEN	7	Seen (Spot beats Hide), too far away to heard or magically silcenced.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && o.seen ).length){
                results.push(list[i]);
              }
            break;
          }

        }
      break;
    }

    if(nSecondCriteriaType >= 0){
      return Game.GetNearestCreature(nSecondCriteriaType, nSecondCriteriaValue, oTarget, nNth, nThirdCriteriaType, nThirdCriteriaValue, -1, -1, results);
    }

    if(results.length){
      return (results.sort((a, b) => {
        return oTarget.position.distanceTo(a.position) - oTarget.position.distanceTo(b.position);
      }))[nNth-1];
    }

    return undefined;
  }

  static GetObjectsInShape(shape = -1, size = 1, target = new THREE.Vector3, lineOfSight = false, objectFilter = -1, origin = new THREE.Vector3, idx = -1){

    let object_pool = [];
    let results = [];

    /*
    int    OBJECT_TYPE_CREATURE         = 1;
    int    OBJECT_TYPE_ITEM             = 2;
    int    OBJECT_TYPE_TRIGGER          = 4;
    int    OBJECT_TYPE_DOOR             = 8;
    int    OBJECT_TYPE_AREA_OF_EFFECT   = 16;
    int    OBJECT_TYPE_WAYPOINT         = 32;
    int    OBJECT_TYPE_PLACEABLE        = 64;
    int    OBJECT_TYPE_STORE            = 128;
    int    OBJECT_TYPE_ENCOUNTER        = 256;
    int    OBJECT_TYPE_SOUND            = 512;
    int    OBJECT_TYPE_ALL              = 32767;
    */

    //console.log('GetObjectsInShape', objectFilter, shape);

    if(objectFilter & 1 == 1){ //CREATURE
      object_pool = object_pool.concat(Game.module.area.creatures);
    }

    if(objectFilter & 1 == 2){ //ITEM
      object_pool = object_pool.concat(Game.module.area.items);
    }

    if(objectFilter & 1 == 4){ //TRIGGER
      object_pool = object_pool.concat(Game.module.area.triggers); 
    }

    if(objectFilter & 1 == 8){ //DOOR
      object_pool = object_pool.concat(Game.module.area.doors); 
    }

    if(objectFilter & 1 == 16){ //AOE
              
    }

    if(objectFilter & 1 == 32){ //WAYPOINTS
      object_pool = object_pool.concat(Game.module.area.waypoints);
    }
    
    if(objectFilter & 1 == 64){ //PLACEABLE
      object_pool = object_pool.concat(Game.module.area.placeables);
    }

    if(objectFilter & 1 == 128){ //STORE
          
    }
    
    if(objectFilter & 1 == 256){ //ENCOUNTER
          
    }
    
    if(objectFilter & 1 == 512){ //SOUND
      object_pool = object_pool.concat(Game.module.area.sounds);
    }

    if(objectFilter & 1 == 32767){ //ALL
          
    }

    for(let i = 0, len = object_pool.length; i < len; i++){
      if(object_pool[i] instanceof ModuleObject){
        if(object_pool[i].position.distanceTo(target) < size){
          results.push(object_pool[i]);
        }
      }
    }

    if(idx == -1){
      return results;
    }else{
      return results[idx];
    }

  }

  static getNPCResRefById(nId){
    switch(nId){
      case 0:
        return 'p_bastilla'
      break;
      case 1:
        return 'p_cand'
      break;
      case 2:
        return 'p_carth'
      break;
      case 3:
        return 'p_hk47'
      break;
      case 4:
        return 'p_jolee'
      break;
      case 5:
        return 'p_juhani'
      break;
      case 6:
        return 'p_mission'
      break;
      case 7:
        return 'p_t3m4'
      break;
      case 8:
        return 'p_zaalbar'
      break;
    }
    return '';
  }

  static isObjectPC(object = undefined){
    return Game.player === object;
  }

  static setGlobalBoolean(name = '', value = false){
    if(Game.Globals.Boolean[name.toLowerCase()])
      Game.Globals.Boolean[name.toLowerCase()].value = value ? true : false;
  }

  static getGlobalBoolean(name = ''){
    if(Game.Globals.Boolean[name.toLowerCase()])
      return Game.Globals.Boolean[name.toLowerCase()].value ? true : false;

    return false;
  }

  static setGlobalNumber(name = '', value = 0){
    if(Game.Globals.Number[name.toLowerCase()])
      Game.Globals.Number[name.toLowerCase()].value = parseInt(value);
  }

  static getGlobalNumber(name = ''){
    if(Game.Globals.Number[name.toLowerCase()])
      return Game.Globals.Number[name.toLowerCase()].value;

    return 0;
  }

  static setGlobalLocation(name = '', value = new Engine.Location){
    if(Game.Globals.Location[name.toLowerCase()] && value instanceof Engine.Location)
      Game.Globals.Location[name.toLowerCase()].value = value;
  }

  static getGlobalLocation(name = ''){
    if(Game.Globals.Location[name.toLowerCase()])
      return Game.Globals.Location[name.toLowerCase()].value;

    return new Engine.Location;
  }

  static updateTime(delta){
    Game.time += delta;
    Game.deltaTime += delta;

    if(Game.deltaTime > 1000)
      Game.deltaTime = Game.deltaTime % 1;

    Game.updateTimers(delta);
    
    //let minutes = Math.floor(Game.time / 60);
    //let seconds = Game.timer - minutes * 60;
    //let milSeconds = Math.floor( (seconds - Math.floor(seconds)) * 100);

    /*let minTens = Math.floor(minutes / 10);
    let minOnes = minutes - minTens * 10;

    let secTens = Math.floor(seconds / 10);
    let secOnes = seconds - secTens * 10;

    let milTens = Math.floor(milSeconds / 10);
    let milOnes = milSeconds - milTens * 10;*/
  }

  static initTimers(){
    Game._timeoutIdx = 0;
    Game._timers = new Map();
  }

  static setTimeout( callback = null, delay = 0){
    let idx = Game._timeoutIdx++;
    Game._timers.set(idx, {callback: callback, delay: delay});
    return idx;
  }

  static clearTimeout(idx){
    return Game._timers.delete(idx);
  }

  static updateTimers(delta){

    Game._timers.forEach( (timer, idx) => {

      timer.delay -= 1000 * delta;
      if(timer.delay <= 0){
        if(typeof timer.callback === 'function')
          timer.callback();
        
        Game._timers.delete(idx);
      }

    });

  }

  static getHours(){
    return Math.floor(Game.time / 3600);
  }

  static getMinutes(){
    return Math.floor(Game.time / 60);
  }

  static getSeconds(){
    return Math.floor(Game.time - Game.getMinutes() * 60);
  }

  static getMiliseconds(){
    return Math.floor( ( (Game.time - Game.getMinutes() * 60) - Math.floor(Game.getSeconds())) * 100);
  }

  static setTestingGlobals(){
    //Set the current planet
    ///Game.setGlobalNumber('K_CURRENT_PLANET', 15)
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

  static togglePause(){
    Game.State = (Game.State == Game.STATES.RUNNING ? Game.STATES.PAUSED : Game.STATES.RUNNING);
  }

}

Engine.CameraDebugZoom = 1;

Engine.raycaster = new THREE.Raycaster();
Engine.mouse = new THREE.Vector3();
Engine.mouseUI = new THREE.Vector2();
Engine.screenCenter = new THREE.Vector3();

Engine.SOLOMODE = false;
Engine.isLoadingSave = false;
Engine.Heartbeat = undefined;
Engine.HeartbeatTimer = 3000;
Engine.Flags = {
  EnableAreaVIS: false,
  LogScripts: false,
  EnableOverride: false,
  WalkmeshVisible: false,
  CombatEnabled: false
}

Engine.debug = {
  controls: false,
  selectedObject: false
};

Engine.IsPaused = false;
Engine.inDialog = false;

Engine.STATES = {
  EXIT: -1,
  RUNNING: 1,
  PAUSED: 2
};

Engine.MODES = {
  LOADING: -1,
  MAINMENU: 1,
  CHARGEN: 2,
  INGAME: 3,
  MINIGAME: 4
};

Engine.Mode = Engine.MODES.MAINMENU;
Engine.holdWorldFadeInForDialog = false;
Engine.autoRun = false;
Engine.AlphaTest = 0.5;
Engine.noClickTimer = 0;

Engine._emitters = {};

class Location {

  constructor(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, area = undefined){
    this.position = new THREE.Vector3(x, y, z);
    this.rotation = new THREE.Vector3(rx, ry, rz);
    this.area = area;
    this.updateFacing();
  }

  getPosition(){
    return this.position;
  }

  setPosition(x = 0, y = 0, z = 0){
    this.position.set(x, y, z);
  }

  getRotation(){
    return this.rotation;
  }

  setRotation(rx = 0, ry = 0, rz = 0){
    this.rotation.set(rx, ry, rz);
    this.updateFacing();
  }

  //Set rotation from bearing in degrees
  setBearing( bearing = 0 ){
    let facing = bearing / 180;
    this.setFacing(facing);
  }

  //Bearing is facing in degrees
  getBearing(){
    return this.facing * 180;
  }

  //Set the facing value and then update the rotation values
  setFacing( facing = 0 ){
    this.facing = 0;
    let theta = facing;

    this.rotation.x = 1 * Math.cos(theta);
    this.rotation.y = 1 * Math.sin(theta);
    this.rotation.z = 0;
  }

  //Bearing is facing in radians
  getFacing(){
    return this.facing;
  }

  //Use the rotation values to update the facing value
  updateFacing(){
    this.facing = -Math.atan2(this.rotation.x, this.rotation.y);
  }

  getArea(){
    return this.area;
  }

  setArea(area){
    this.area = area;
  }

  //HACK
  getModel(){
    return this;
  }

}

Engine.Location = Location;


module.exports = Engine;