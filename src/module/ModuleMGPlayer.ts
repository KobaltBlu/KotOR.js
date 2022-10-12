/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleMGPlayer class.
 */

export class ModuleMGPlayer extends ModuleObject {

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
    this.position = new THREE.Vector3();

    this.animationManagers = [];

    this.speed = 0;
    this.speed_min = 0;
    this.speed_max = 0;
    this.accel_secs = 0;
    this.accel_lateral_secs = 0;
    this.lateralForce = 0;
    this.invince = 0;

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

    const geometry = new THREE.SphereGeometry( 1, 16, 16 );
    const material = new THREE.MeshBasicMaterial( { color: 0x0000FF } );
    material.transparent = true;
    material.opacity = 0.15;
    this.sphere_geom = new THREE.Mesh( geometry, material );

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
    //this.position = model.position;
    this.rotation = model.rotation;
    this.quaternion = model.quaternion;

    this.rotation.reorder('YZX');

    this.rotate('x', 0);
    this.rotate('y', 0);
    this.rotate('z', 0);

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

  update(delta: number = 0){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

    //super.update(delta);
    //Process the heartbeat timer
    if(GameState.module){
      this.triggerHeartbeat();
    }

    this.sphere.radius = this.sphere_radius;
    this.model.parent.getWorldPosition(this.position);
    this.sphere.center.copy(this.position);

    this.sphere_geom.scale.setScalar(this.sphere_radius);
    this.sphere_geom.position.copy(this.sphere.center);

    for(let i = 0; i < this.animationManagers.length; i++){
      const aManager = this.animationManagers[i];
      if(
        aManager.currentAnimation.data.loop || 
        ( !aManager.currentAnimation.data.loop && !aManager.currentAnimation.data.elapsedCount )
      ){
        aManager.updateAnimation(aManager.currentAnimation, delta);
      }
    }

    for(let i = 0; i < this.model.children.length; i++){
      const model = this.model.children[i];
      if(model instanceof OdysseyModel3D && model.bonesInitialized && model.visible){
        model.update(delta);
      }
    }

    //this.animationManagers
    this.AxisFront.set(0, 0, 0);

    switch(GameState.module.area.MiniGame.Type){
      case 1:

        if(this.speed_min || this.speed){

          if(this.speed < this.speed_min){
            this.speed = this.speed_min;
          }

          this.speed += (this.accel_secs * delta);

          if(this.speed_max && (this.speed >= this.speed_max)){
            this.speed = this.speed_max;
          }

          this.AxisFront.set( this.lateralForce * delta, this.speed * delta, 0 );

          //this.track.position.y += ;
          //this.model.position.z = this.jumpVelcolity;

        }


        this.track.updateMatrixWorld();
        //this.updateCollision(delta);
        this.track.position.add(this.AxisFront);
        //this.model.box.setFromObject(this.model);

        const enemies = GameState.module.area.MiniGame.Enemies;
        for(let i = 0; i < enemies.length; i++){
          const enemy = enemies[i];
          if(enemy.sphere.containsPoint(this.sphere.center)){
            if(!enemy.collided){
              enemy.collided = true;
              this.onHitFollower(enemy);
            }
          }
        }

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
    
    this.model.parent.getWorldPosition(this.position);

    this.sphere.center.copy(this.position);
    this.sphere_geom.position.copy(this.sphere.center);

    if(this.camera instanceof OdysseyModel3D && this.camera.bonesInitialized && this.camera.visible){
      this.camera.update(delta);
    }else if(!this.camera){
      let camerahook = this.model.getObjectByName('camerahook');
      if(camerahook)
        this.camera = camerahook.parent.parent;
    }
    
  }

  updatePaused(delta){

  }

  damage(damage = 0){
    if(this.alive){
      this.hit_points -= damage;
      for(let i = 0; i < this.model.children.length; i++){
        if(this.model.children[i] instanceof OdysseyModel3D && this.model.children[i].bonesInitialized && this.model.children[i].visible){
          this.model.children[i].playAnimation('damage', false);
        }
      }
      this.onDamage();
    }
  }

  adjustHitPoints(nHP = 0, nAbsolute = 0){
    this.hit_points += nHP;
  }

  startInvulnerability(){
    this.invince = this.invince_period || 0;
  }

  jump(){
    this.jumpVelcolity = 0.4;
    /*if(this.gear > -1 && !this.falling){
      this.jumpVelcolity = 0.4;
    }else{
      this.jumpVelcolity = 0;
    }*/
  }

  fire(){
    if(this.gunBanks.length){
      for(let i = 0; i < this.gunBanks.length; i++){
        this.gunBanks[i].fire();
      }
    }
    this.onFire();
  }

  rotate(axis = 'x', amount = 0){

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

  playAnimation(name = '', bLooping = 0, bQueue = 0, bOverlay = 0){
    const padding = '                                             ';
    //console.log(`play: ${name}${padding}`.substring(0, 20), `bLooping: ${bLooping ? 'true' : 'false'}${padding}`.substring(0, 20), `bQueue: ${bQueue ? 'true' : 'false'}${padding}`.substring(0, 20), `bOverlay: ${bOverlay ? 'true' : 'false'}${padding}`.substring(0, 20));
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      const anim = model.getAnimationByName(name);
      if(anim){

        //Check if this animation has already been applied
        const existingIndex = this.animationManagers.findIndex( am => am?.currentAnimation?.name == name );
        if(existingIndex >= 0){
          this.animationManagers.splice(existingIndex, 1);
        }

        if(bOverlay){
          const animManager = new OdysseyModelAnimationManager(model);
          animManager.currentAnimation = anim;
          anim.data = {
            loop: bLooping ? true : false,
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

  removeAnimation(name = ''){
    const padding = '                                             ';
    //console.log( `remove: ${name}${padding}`.substring(0, 20) );
    const existingIndex = this.animationManagers.findIndex( am => am?.currentAnimation?.name == name );
    if(existingIndex >= 0){
      this.animationManagers.splice(existingIndex, 1);
    }
  }

  updateCollision(delta = 0){

    if(!this.model || !GameState.module || !GameState.module.area)
      return;

    let _axisFront = this.AxisFront.clone();
    let _oPosition = this.position.clone();

    //this.getCurrentRoom();
    const hitdist = this.sphere_radius;
    const hitdist_half = hitdist/2;

    this.box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    this.box.translate(this.position);
    this.box.translate(_axisFront);

    const box = this.box.clone();

    //START Gravity
    GameState.raycaster.far = 10;
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.position.clone().add( ( scratchVec3 ) );
    GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    GameState.raycaster.ray.direction.set(0, 0,-1);

    let obj = undefined;

    if(!this.room) this.getCurrentRoom();

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
              this.attachToRoom(GameState.module.area.rooms[edge.transition]);
              break;
            }
          }
        }

        //update creature position
        this.position.add(this.AxisFront);
        //DETECT: GROUND FACE
        this.lastRoom = this.room;
        this.lastGroundFace = this.groundFace;
        //this.groundFace = undefined;
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
    GameState.raycaster.far = Infinity;
    this.track.updateMatrixWorld();

    this.box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    this.box.translate(this.position);
    this.box.translate(this.AxisFront);

  }

  getCurrentRoom(){
    if(this instanceof ModuleObject){
      this.room = undefined;
      let aabbFaces = [];
      let meshesSearch;// = GameState.octree_walkmesh.search( GameState.raycaster.ray.origin, 10, true, GameState.raycaster.ray.direction );
      let intersects;// = GameState.raycaster.intersectOctreeObjects( meshesSearch );
      const box = this.box.clone();

      this.rooms = [];
      for(let i = 0; i < GameState.module.area.rooms.length; i++){
        let room = GameState.module.area.rooms[i];
        let model = room.model;
        if(model instanceof OdysseyModel3D){
          if(model.box.containsPoint(this.position)){
            this.rooms.push(i);
          }
        }
      }

      if(box){
        for(let j = 0, jl = this.rooms.length; j < jl; j++){
          let room = GameState.module.area.rooms[this.rooms[j]];
          if(room && room.walkmesh && room.walkmesh.aabbNodes.length){
            aabbFaces.push({
              object: room, 
              faces: room.walkmesh.getAABBCollisionFaces(box)
            });
          }
        }
      }
      
      let scratchVec3 = new THREE.Vector3(0, 0, 2);
      let playerFeetRay = this.position.clone().add(scratchVec3);
      GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
      GameState.raycaster.ray.direction.set(0, 0,-1);
      
      for(let j = 0, jl = aabbFaces.length; j < jl; j++){
        let castableFaces = aabbFaces[j];
        intersects = castableFaces.object.walkmesh.raycast(GameState.raycaster, castableFaces.faces) || [];
        
        if(intersects.length){
          if(this == GameState.player){
            //console.log(intersects);
          }
          if(intersects[0].object.moduleObject){
            this.attachToRoom(intersects[0].object.moduleObject);
            return;
          }
        }
      }
      if(this.rooms.length){
        this.attachToRoom(GameState.module.area.rooms[this.rooms[0]]);
        return;
      }
    }else{
      this.findWalkableFace();
    }
  }

  findWalkableFace(){
    let face;
    let room;
    for(let i = 0, il = GameState.module.area.rooms.length; i < il; i++){
      room = GameState.module.area.rooms[i];
      if(room.walkmesh){
        for(let j = 0, jl = room.walkmesh.walkableFaces.length; j < jl; j++){
          face = room.walkmesh.walkableFaces[j];
          if(face.triangle.containsPoint(this.position)){
            this.groundFace = face;
            this.lastGroundFace = this.groundFace;
            this.surfaceId = this.groundFace.walkIndex;
            this.attachToRoom(room);
            face.triangle.closestPointToPoint(this.position, this.wm_c_point);
            this.position.z = this.wm_c_point.z + .005;
          }
        }
      }
    }
    return face;
  }

  Load( onLoad = null ){
    this.InitProperties();
    GameState.scene.add(this.sphere_geom);
    if(onLoad != null)
      onLoad(this.template);
  }

  LoadCamera( onLoad = null ){
    if(this.cameraName){
      GameState.ModelLoader.load({
        file: this.cameraName.replace(/\0[\s\S]*$/g,'').toLowerCase(),
        onLoad: (mdl) => {
          OdysseyModel3D.FromMDL(mdl, {
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
        GameState.ModelLoader.load({
          file: item.model.replace(/\0[\s\S]*$/g,'').toLowerCase(),
          onLoad: (mdl) => {
            OdysseyModel3D.FromMDL(mdl, {
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

  onHitBullet( bullet = undefined ){
    if(this.scripts.onHitBullet instanceof NWScriptInstance){
      const instance = this.scripts.onHitBullet.nwscript.newInstance();
      instance.mgBullet = bullet;
      instance.run(this, 0);
    }
  }

  onHitFollower( follower = undefined ){
    if(this.scripts.onHitFollower instanceof NWScriptInstance){
      const instance = this.scripts.onHitFollower.nwscript.newInstance();
      instance.mgFollower = follower;
      instance.run(this, 0);
    }
  }

  onHitObstacle( obstacle = undefined ){
    if(this.scripts.onHitObstacle instanceof NWScriptInstance){
      const instance = this.scripts.onHitObstacle.nwscript.newInstance();
      instance.mgObstacle = obstacle;
      instance.run(this, 0);
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
