/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleMGPlayer class.
 */

class ModuleMGPlayer extends ModuleObject {

  constructor(template = null){
    super();
    console.log('ModuleMGPlayer', template, this);
    this.template = template;

    this.camera = null;
    this.gunBanks = [];
    this.models = [];
    this.modelProps = [];
    this.model = new THREE.Object3D();
    this.track = new THREE.Object3D();

    this.bullets = [];

    this.no_rotate = new THREE.Group();

    this.animationManagers = [];

    this.speed = 0;
    this.speed_min = 0;
    this.speed_max = 0;
    this.accel_secs = 0;
    this.accel_lateral_secs = 0;

    this.gear = -1;
    //this.timer = 0;
    this.gunTimer = 0;
    this.jumpVelcolity = 0;
    this.boostVelocity = 0;
    this.falling = true;
    this.alive = true;

    this.tunnel = {
      neg: {x: 0, y: 0, z: 0},
      pos: {x: 0, y: 0, z: 0}
    }

    this.setTrack(this.track);

    this._heartbeatTimerOffset = -2900;

  }

  canMove(){
    return false;
  }

  getHP(){
    return this.hit_points;
  }

  getMaxHP(){
    return this.max_hps;
  }

  setTrack(model = new THREE.Object3D()){
    console.log('track', model);
    this.track = model;
    this.position = model.position;
    this.rotation = model.rotation;
    this.quaternion = model.quaternion;

    this.rotation.reorder('YZX');

    this.Rotate('x', 0);
    this.Rotate('y', 0);
    this.Rotate('z', 0);

    if(this.model.parent)
      this.model.parent.remove(this.model);

    try{
      this.track.getObjectByName('modelhook').add(this.model);
    }catch(e){

    }

    try{
      this.track.parent.add(this.no_rotate);
      this.no_rotate.position.copy(this.track.position);
      this.no_rotate.quaternion.copy(this.track.quaternion);
    }catch(e){}

    this.onCreateRun = false;

    this._heartbeatTimeout = 0;

  }

  update(delta){

    //super.update(delta);
    //Process the heartbeat timer
    if(this._heartbeatTimeout <= 0){
      if(Game.module){
        this.triggerHeartbeat();
      }
      this._heartbeatTimeout = 100;
    }else{
      this._heartbeatTimeout -= 1000*delta;
    }

    if(Game.module){
      if(this === PartyManager.party[0])
        Game.controls.UpdateMiniGameControls(delta);
    }

    this.sphere.radius = this.sphere_radius;
    this.model.getWorldPosition(this.sphere.center);

    if(this.camera instanceof THREE.AuroraModel && this.camera.bonesInitialized && this.camera.visible){
      this.camera.update(delta);
    }else if(!this.camera){
      let camerahook = this.model.getObjectByName('camerahook');
      if(camerahook)
        this.camera = camerahook.parent.parent;
    }

    for(let i = 0; i < this.animationManagers.length; i++){
      const aManager = this.animationManagers[i];
      aManager.updateAnimation(aManager.currentAnimation, delta);
    }

    for(let i = 0; i < this.model.children.length; i++){
      const model = this.model.children[i];
      if(model instanceof THREE.AuroraModel && model.bonesInitialized && model.visible){
        model.update(delta);
      }
    }

    //this.animationManagers

    switch(Game.module.area.MiniGame.Type){
      case 1:

        //if(this.gear > -1){

          if(this.speed){

            if(this.speed < this.speed_min){
              this.speed = this.speed_min;
            }

            this.speed += 1 * delta;

            if(this.speed >= this.speed_max){
              this.speed = this.speed_max + 1;
            }

            this.track.position.y += (this.speed + this.accel_secs) * delta;
          
            this.model.position.z = this.jumpVelcolity;

          }

        //}


        this.track.updateMatrixWorld();
        this.updateCollision(delta);

        if(this.jumpVelcolity > 0){
          this.jumpVelcolity -= (2 *delta);
        }else{
          this.jumpVelcolity = 0;
        }

        if(this.boostVelocity > 0){
          this.boostVelocity -= (2 *delta);
        }else{
          this.boostVelocity = 0;
        }

      break;
      case 2:

      break;
    }
        
    for(let i = 0; i < this.gunBanks.length; i++){
      this.gunBanks[i].update(delta);
    }
    
  }

  damage(damage = 0){
    if(this.alive){
      this.hit_points -= damage;
      for(let i = 0; i < this.model.children.length; i++){
        if(this.model.children[i] instanceof THREE.AuroraModel && this.model.children[i].bonesInitialized && this.model.children[i].visible){
          this.model.children[i].playAnimation('damage', false);
        }
      }
      this.onDamage();
    }
  }

  Jump(){
    this.jumpVelcolity = 0.4;
    /*if(this.gear > -1 && !this.falling){
      this.jumpVelcolity = 0.4;
    }else{
      this.jumpVelcolity = 0;
    }*/
  }

  Boost(){
    if(this.gear > -1){
      this.boostVelocity = 0.8
    }else{
      this.boostVelocity = 0;
    }
  }

  ChangeGear(){
    this.gear++;
    if(this.gear >= 5)
      this.gear = -1;
  }

  FireGun(){
    if(this.gunBanks.length){
      for(let i = 0; i < this.gunBanks.length; i++){
        this.gunBanks[i].fire();
      }
    }
    this.onFire();
  }

  Rotate(axis = 'x', amount = 0){

    switch(axis){
      case 'x':

        this.rotation.x += amount;

        if(this.rotation.x > this.tunnel.pos.x)
          this.rotation.x = this.tunnel.pos.x;

        if(this.rotation.x < this.tunnel.neg.x)
          this.rotation.x = this.tunnel.neg.x;

      break;
      case 'y':

        this.rotation.y += amount;

        if(this.rotation.y > this.tunnel.pos.y)
          this.rotation.y = this.tunnel.pos.y;

        if(this.rotation.y < this.tunnel.neg.y)
          this.rotation.y = this.tunnel.neg.y;

      break;
      case 'z':

        this.rotation.z += amount;

        if(this.rotation.z > this.tunnel.pos.z)
          this.rotation.z = this.tunnel.pos.z;

        if(this.rotation.z < this.tunnel.neg.z)
          this.rotation.z = this.tunnel.neg.z;

      break;
    }

    this.rotation.x = Utility.NormalizeRadian(this.rotation.x);
    this.rotation.y = Utility.NormalizeRadian(this.rotation.y);
    this.rotation.z = Utility.NormalizeRadian(this.rotation.z);

  }

  GetOffset(){

    switch(Game.module.area.MiniGame.Type){
      case 1:
        return this.position.clone();
      case 2:
        let _rot = new THREE.Vector3(
          THREE.Math.radToDeg(this.rotation.x), 
          THREE.Math.radToDeg(this.rotation.y), 
          THREE.Math.radToDeg(this.rotation.z)
        );

        return _rot;
    }

  }

  PlayAnimation(name = '', n1 = 0, n2 = 0, n3 = 0){
    //I think n3 may be loop
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      const anim = model.getAnimationByName(name);
      if(anim){
        if(n3){
          console.log(anim);
          const animManager = new AuroraModelAnimationManager(model);
          animManager.currentAnimation = anim;
          anim.data = {
            loop: true,
            blend: true,
            cFrame: 0,
            elapsed: 0,
            lastTime: 0,
            delta: 0,
            lastEvent: -1,
            events: [],
            callback: undefined
          };
          this.animationManagers.push(animManager);
        }else{
          model.playAnimation(anim, false);
        }
      }
    }
  }

  RemoveAnimation(name = ''){
    console.log('RemoveAnimation', name);
    return;
    for(let i = 0; i < this.models.length; i++){
      let model = this.models[i];
      let anim = model.getAnimationByName(name);

      if(anim){
        let animLoopIdx = model.animLoops.indexOf(anim);
        if(animLoopIdx >= 0){
          model.animLoops.splice(animLoopIdx, 1);
        }

        if(model.animationManager.currentAnimation == anim){
          model.stopAnimation();
        }

      }

    }

  }

  updateCollision(delta = 0){
    return;

    if(!this.model || !Game.module || !Game.module.area)
      return;

    let _axisFront = this.AxisFront.clone();
    let _oPosition = this.position.clone();

    //this.getCurrentRoom();
    let hitdist = this.getAppearance().hitdist;
    let hitdist_half = hitdist/2;
    
    let box = new THREE.Box3()
    
    if(this.model && this.model.box){
      this.model.box.setFromObject(this.model);
      this.model.sphere = this.model.box.getBoundingSphere(this.model.sphere);
      box = this.model.box.clone();
      box.translate(_axisFront);
    }

    //START Gravity
    Game.raycaster.far = 10;
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.position.clone().add( ( scratchVec3 ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    Game.raycaster.ray.direction.set(0, 0,-1);

    let obj = undefined;

    //END: CREATURE COLLISION

    if(this.room){

      //START: PLACEABLE COLLISION
      this.tmpPos = this.position.clone().add(this.AxisFront);
      let plcEdgeLines = [];
      let face;
      let edge;
      let line;
      let closestPoint = new THREE.Vector3(0, 0, 0);
      let distance;
      let plcCollision = false;
      /*for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
        obj = this.room.placeables[j];
        if(obj && obj.walkmesh && obj.model && obj.model.visible){
          obj.box.setFromObject(obj.model);
          if(obj.box.intersectsBox(box) || obj.box.containsBox(box)){
            for(let l = 0, ll = obj.walkmesh.edgeKeys.length; l < ll; l++){
              edge = obj.walkmesh.edges[obj.walkmesh.edgeKeys[l]];
              edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
              distance = closestPoint.distanceTo(this.tmpPos);
              if(distance < hitdist_half){
                plcEdgeLines.push({
                  object: obj,
                  line: line,
                  closestPoint: closestPoint.clone(),
                  distance: distance,
                  maxDistance: hitdist_half,
                  position: this.position
                });
                plcCollision = true;
              }
            }
          }
        }
      }*/

      //END: PLACEABLE COLLISION
      
      //START: ROOM COLLISION
      if(!this.groundFace){
        this.findWalkableFace();
      }

      //room walkable edge check
      let roomCollision = false;
      for(let i = 0, len = this.room.walkmesh.edgeKeys.length; i < len; i++){
        edge = this.room.walkmesh.edges[this.room.walkmesh.edgeKeys[i]];
        if(edge && edge.transition == -1){
          edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
          distance = closestPoint.distanceTo(this.tmpPos);
          if(distance < hitdist_half){
            plcEdgeLines.push({
              object: this.room,
              line: edge.line,
              closestPoint: closestPoint.clone(),
              distance: distance,
              maxDistance: hitdist_half,
              position: this.position
            });
            roomCollision = true;
          }
        }
      }

      
        
      if(!(plcCollision && roomCollision)){
        if(plcEdgeLines.length){
          plcEdgeLines.sort((a, b) => (a.distance > b.distance) ? -1 : 1)
          let average = new THREE.Vector3();
          let edgeLine = undefined;
          let distanceOffset = 0;
          let force = 0;
          for(let i = 0, len = plcEdgeLines.length; i < len; i++){
            edgeLine = plcEdgeLines[i];
            distanceOffset = edgeLine.maxDistance - edgeLine.distance;
            force = edgeLine.closestPoint.clone().sub(edgeLine.position);
            force.multiplyScalar(distanceOffset * 2.5);
            force.z = 0;
            average.add( force.negate() );
          }
          this.position.copy(this.tmpPos);
          this.AxisFront.copy(average.divideScalar(plcEdgeLines.length));
        }
      }else{
        this.AxisFront.set(0, 0, 0);
      }
      //END: ROOM COLLISION

      //Check to see if we tp'd inside of a placeable
      if(this.AxisFront.length()){
        this.tmpPos.copy(this.position).add(this.AxisFront);
        for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
          obj = this.room.placeables[j];
          if(obj && obj.walkmesh && obj.model && obj.model.visible){
            for(let i = 0, iLen = obj.walkmesh.faces.length; i < iLen; i++){
              face = obj.walkmesh.faces[i];
              if(face.triangle.containsPoint(this.tmpPos) && face.surfacemat.walk == 0){
                //bail we should not be here
                this.AxisFront.set(0, 0, 0);
                this.position.copy(_oPosition);
              }
            }
          }
        }
      
        //DETECT: ROOM TRANSITION
        for(let i = 0, len = this.room.walkmesh.edgeKeys.length; i < len; i++){
          edge = this.room.walkmesh.edges[this.room.walkmesh.edgeKeys[i]];
          if(edge && edge.transition >= 0){
            if(
              Utility.LineLineIntersection(
                this.position.x,
                this.position.y,
                this.position.x + this.AxisFront.x,
                this.position.y + this.AxisFront.y,
                edge.line.start.x,
                edge.line.start.y,
                edge.line.end.x,
                edge.line.end.y
              )
            ){
              this.attachToRoom(Game.module.area.rooms[edge.transition]);
              break;
            }
          }
        }

        //update creature position
        this.position.add(this.AxisFront);
        //DETECT: GROUND FACE
        this.lastRoom = this.room;
        this.lastGroundFace = this.groundFace;
        this.groundFace = undefined;
        if(this.room){
          let face = this.room.findWalkableFace(this);
          if(!face){
            this.findWalkableFace();
          }
        }

        if(!this.groundFace){
          this.AxisFront.set(0, 0, 0);
          this.position.copy(_oPosition);
          this.groundFace = this.lastGroundFace;
          this.attachToRoom(this.lastRoom);
          this.AxisFront.set(0, 0, 0);
        }
      }
    }

    //END Gravity
    Game.raycaster.far = Infinity;
    this.track.updateMatrixWorld();

  }

  Load( onLoad = null ){
    this.InitProperties();
    if(onLoad != null)
      onLoad(this.template);
  }

  LoadCamera( onLoad = null ){
    if(this.cameraName){
      Game.ModelLoader.load({
        file: this.cameraName.replace(/\0[\s\S]*$/g,'').toLowerCase(),
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            onComplete: (model) => {
              try{
                this.camera = model;
                model.name = this.cameraName;
                this.model.add(model);

                if(typeof onLoad === 'function')
                  onLoad();
              }catch(e){
                console.error(e);
                if(typeof onLoad === 'function')
                  onLoad();
              }
            },
            context: this.context,
            castShadow: true,
            receiveShadow: true
          });
        }
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  LoadModel (onLoad = null){

    let loop = new AsyncLoop({
      array: this.modelProps,
      onLoop: (item, asyncLoop) => {
        Game.ModelLoader.load({
          file: item.model.replace(/\0[\s\S]*$/g,'').toLowerCase(),
          onLoad: (mdl) => {
            THREE.AuroraModel.FromMDL(mdl, {
              onComplete: (model) => {
                try{
                  if(item.isRotating){
                    this.model.add(model);
                  }else{
                    this.no_rotate.add(model);
                  }
                  this.models.push(model);
                  model.name = item.model;

                  if(this.camera && model.name == this.camera.name)
                    model.visible = false;

                  asyncLoop.next();
                }catch(e){
                  console.error(e);
                  asyncLoop.next();
                }
              },
              context: this.context,
              castShadow: true,
              receiveShadow: true
            });
          }
        });
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad(this.model);
    });

  }

  LoadGunBanks(onLoad = null){
    let loop = new AsyncLoop({
      array: this.gunBanks,
      onLoop: (gunbank, asyncLoop) => {
        gunbank.Load().then( () => {
          this.gun_hook = this.model.getObjectByName('gunbank'+gunbank.bankID);
          if(this.gun_hook instanceof THREE.Object3D){
            this.gun_hook.add(gunbank.model);
          }
          asyncLoop.next();
        });
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  onAnimEvent(){
    if(this.scripts.onAnimEvent instanceof NWScriptInstance){
      this.scripts.onAnimEvent.nwscript.newInstance().run(this, 0);
    }
  }

  onCreate(){
    if(this.scripts.onCreate instanceof NWScriptInstance){
      this.scripts.onCreate.nwscript.newInstance().run(this, 0);
    }
  }

  onDamage(){
    if(this.scripts.onDamage instanceof NWScriptInstance){
      this.scripts.onDamage.nwscript.newInstance().run(this, 0);
    }
  }

  onFire(){
    if(this.scripts.onFire instanceof NWScriptInstance){
      this.scripts.onFire.nwscript.newInstance().run(this, 0);
    }
  }

  onAccelerate(){
    if(this.scripts.onAccelerate instanceof NWScriptInstance){
      this.scripts.onAccelerate.nwscript.newInstance().run(this, 0);
    }
  }

  onHitBullet(){
    if(this.scripts.onHitBullet instanceof NWScriptInstance){
      this.scripts.onHitBullet.nwscript.newInstance().run(this, 0);
    }
  }

  onHitFollower(){
    if(this.scripts.onHitFollower instanceof NWScriptInstance){
      this.scripts.onHitFollower.nwscript.newInstance().run(this, 0);
    }
  }

  onHitObstacle(){
    if(this.scripts.onHitObstacle instanceof NWScriptInstance){
      this.scripts.onHitObstacle.nwscript.newInstance().run(this, 0);
    }
  }

  onTrackLoop(){
    if(this.scripts.onTrackLoop instanceof NWScriptInstance){
      this.scripts.onTrackLoop.nwscript.newInstance().run(this, 0);
    }
  }

  LoadScripts (onLoad = null){
    this.scripts = {
      onAccelerate: undefined,
      onAnimEvent: undefined,
      onBrake: undefined,
      onCreate: undefined,
      onDamage: undefined,
      onDeath: undefined,
      onFire: undefined,
      onHeartbeat: undefined,
      onHitBullet: undefined,
      onHitFollower: undefined,
      onHitObstacle: undefined,
      onHitWorld: undefined,
      onTrackLoop: undefined
    };

    let scriptsNode = this.template.GetFieldByLabel('Scripts').GetChildStructs()[0];
    if(scriptsNode){

      if(scriptsNode.HasField('OnAccelerate'))
        this.scripts.onAccelerate = scriptsNode.GetFieldByLabel('OnAccelerate').GetValue();
      
      if(scriptsNode.HasField('OnAnimEvent'))
        this.scripts.onAnimEvent = scriptsNode.GetFieldByLabel('OnAnimEvent').GetValue();

      if(scriptsNode.HasField('OnBrake'))
        this.scripts.onBrake = scriptsNode.GetFieldByLabel('OnBrake').GetValue();

      if(scriptsNode.HasField('OnCreate'))
        this.scripts.onCreate = scriptsNode.GetFieldByLabel('OnCreate').GetValue();

      if(scriptsNode.HasField('OnDamage'))
        this.scripts.onDamage = scriptsNode.GetFieldByLabel('OnDamage').GetValue();

      if(scriptsNode.HasField('OnDeath'))
        this.scripts.onDeath = scriptsNode.GetFieldByLabel('OnDeath').GetValue();

      if(scriptsNode.HasField('OnFire'))
        this.scripts.onFire = scriptsNode.GetFieldByLabel('OnFire').GetValue();

      if(scriptsNode.HasField('OnHeartbeat'))
        this.scripts.onHeartbeat = scriptsNode.GetFieldByLabel('OnHeartbeat').GetValue();
      
      if(scriptsNode.HasField('OnHitBullet'))
        this.scripts.onHitBullet = scriptsNode.GetFieldByLabel('OnHitBullet').GetValue();

      if(scriptsNode.HasField('OnHitFollower'))
        this.scripts.onHitFollower = scriptsNode.GetFieldByLabel('OnHitFollower').GetValue();

      if(scriptsNode.HasField('OnHitObstacle'))
        this.scripts.onHitObstacle = scriptsNode.GetFieldByLabel('OnHitObstacle').GetValue();

      if(scriptsNode.HasField('OnHitWorld'))
        this.scripts.onHitWorld = scriptsNode.GetFieldByLabel('OnHitWorld').GetValue();

      if(scriptsNode.HasField('OnTrackLoop'))
        this.scripts.onTrackLoop = scriptsNode.GetFieldByLabel('OnTrackLoop').GetValue();

    }

    let keys = Object.keys(this.scripts);
    let loop = new AsyncLoop({
      array: keys,
      onLoop: async (key, asyncLoop) => {
        let _script = this.scripts[key];
        if(_script != '' && !(_script instanceof NWScriptInstance)){
          //let script = await NWScript.Load(_script);
          this.scripts[key] = await NWScript.Load(_script);
          //this.scripts[key].name = _script;
          asyncLoop.next();
        }else{
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  InitProperties(){
    if(this.template.RootNode.HasField('Accel_Secs'))
      this.accel_secs = this.template.GetFieldByLabel('Accel_Secs').GetValue();

    if(this.template.RootNode.HasField('Bump_Damage'))
      this.bump_damage = this.template.GetFieldByLabel('Bump_Damage').GetValue();

    if(this.template.RootNode.HasField('Camera'))
      this.cameraName = this.template.GetFieldByLabel('Camera').GetValue();

    if(this.template.RootNode.HasField('CameraRotate'))
      this.cameraRotate = this.template.GetFieldByLabel('CameraRotate').GetValue();

    if(this.template.RootNode.HasField('Hit_Points'))
      this.hit_points = this.template.GetFieldByLabel('Hit_Points').GetValue();

    if(this.template.RootNode.HasField('Invince_Period'))
      this.invince_period = this.template.GetFieldByLabel('Invince_Period').GetValue();

    if(this.template.RootNode.HasField('Max_HPs'))
      this.max_hps = this.template.GetFieldByLabel('Max_HPs').GetValue();

    if(this.template.RootNode.HasField('Maximum_Speed'))
      this.speed_max = this.template.GetFieldByLabel('Maximum_Speed').GetValue();

    if(this.template.RootNode.HasField('Minimum_Speed'))
      this.speed_min = this.template.GetFieldByLabel('Minimum_Speed').GetValue();

    if(this.template.RootNode.HasField('Num_Loops'))
      this.num_loops = this.template.GetFieldByLabel('Num_Loops').GetValue();

    if(this.template.RootNode.HasField('Sphere_Radius'))
      this.sphere_radius = this.template.GetFieldByLabel('Sphere_Radius').GetValue();

    if(this.template.RootNode.HasField('Track'))
      this.trackName = this.template.GetFieldByLabel('Track').GetValue();

    if(this.template.RootNode.HasField('TunnelXNeg'))
      this.tunnel.neg.x = THREE.Math.degToRad(this.template.GetFieldByLabel('TunnelXNeg').GetValue());

    if(this.template.RootNode.HasField('TunnelXPos'))
      this.tunnel.pos.x = THREE.Math.degToRad(this.template.GetFieldByLabel('TunnelXPos').GetValue());
    
    if(this.template.RootNode.HasField('TunnelYNeg'))
      this.tunnel.neg.y = THREE.Math.degToRad(this.template.GetFieldByLabel('TunnelYNeg').GetValue());

    if(this.template.RootNode.HasField('TunnelYPos'))
      this.tunnel.pos.y = THREE.Math.degToRad(this.template.GetFieldByLabel('TunnelYPos').GetValue());

    if(this.template.RootNode.HasField('TunnelZNeg'))
      this.tunnel.neg.z = THREE.Math.degToRad(this.template.GetFieldByLabel('TunnelZNeg').GetValue());

    if(this.template.RootNode.HasField('TunnelZPos'))
      this.tunnel.pos.z = THREE.Math.degToRad(this.template.GetFieldByLabel('TunnelZPos').GetValue());

    if(this.template.RootNode.HasField('Models')){
      let models = this.template.GetFieldByLabel('Models').GetChildStructs();
      for(let i = 0; i < models.length; i++){
        let modelStruct = models[i];
        this.modelProps.push({
          model: modelStruct.GetFieldByLabel('Model').GetValue(),
          isRotating: modelStruct.GetFieldByLabel('RotatingModel').GetValue() ? true : false
        });
      }
    }

    if(this.template.RootNode.HasField('Gun_Banks')){
      const gun_banks = this.template.GetFieldByLabel('Gun_Banks').GetChildStructs();
      for(let i = 0; i < gun_banks.length; i++){
        this.gunBanks.push(
          new ModuleMGGunBank(
            GFFObject.FromStruct(gun_banks[i]),
            this,
            true
          )
        );
      }

      this.initialized = true;
    }


    /*if(this.template.RootNode.HasField('CameraRotate'))
      this.cameraRotate = this.template.GetFieldByLabel('CameraRotate').GetValue();

    if(this.template.RootNode.HasField('Hit_Points'))
      this.hit_points = this.template.GetFieldByLabel('Hit_Points').GetValue();

    if(this.template.RootNode.HasField('Invince_Period'))
      this.invince_period = this.template.GetFieldByLabel('Invince_Period').GetValue();

    if(this.template.RootNode.HasField('Max_HPs'))
      this.max_hps = this.template.GetFieldByLabel('Max_HPs').GetValue();

    if(this.template.RootNode.HasField('Maximum_Speed'))
      this.maximum_speed = this.template.GetFieldByLabel('Maximum_Speed').GetValue();*/



  }


}

module.exports = ModuleMGPlayer;