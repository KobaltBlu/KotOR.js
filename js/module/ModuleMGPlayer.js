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

    this.tunnel = {
      neg: {x: 0, y: 0, z: 0},
      pos: {x: 0, y: 0, z: 0}
    }

    this.setTrack(this.track);

    this._heartbeatTimerOffset = -2900;

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

  }

  update(delta){

    super.update(delta);

    if(Game.module){
      if(this === PartyManager.party[0])
        Game.controls.UpdateMiniGameControls(delta);
    }

    if(this.camera instanceof THREE.AuroraModel && this.camera.bonesInitialized && this.camera.visible){
      this.camera.update(delta);
    }else if(!this.camera){
      let camerahook = this.model.getObjectByName('camerahook');
      if(camerahook)
        this.camera = camerahook.parent.parent;
    }

    for(let i = 0; i < this.model.children.length; i++){
      if(this.model.children[i] instanceof THREE.AuroraModel && this.model.children[i].bonesInitialized && this.model.children[i].visible){
        this.model.children[i].update(delta);
      }
    }

    switch(Game.module.area.MiniGame.Type){
      case 1:

        //if(this.gear > -1){

          /*this.timer += 1 * delta;
          //console.log(this.timer);
          let minutes = Math.floor(this.timer / 60);
          let seconds = this.timer - minutes * 60;
          let milSeconds = Math.floor( (seconds - Math.floor(seconds)) * 100);

          let minTens = Math.floor(minutes / 10);
          let minOnes = minutes - minTens * 10;

          let secTens = Math.floor(seconds / 10);
          let secOnes = seconds - secTens * 10;

          let milTens = Math.floor(milSeconds / 10);
          let milOnes = milSeconds - milTens * 10;

          this.camera.poseAnimation('MinTen'+minTens);
          this.camera.poseAnimation('MinOne'+Math.floor(minOnes));

          this.camera.poseAnimation('SecTen'+secTens);
          this.camera.poseAnimation('SecOne'+Math.floor(secOnes));

          this.camera.poseAnimation('MilSecTen'+milTens);
          this.camera.poseAnimation('MilSecOne'+Math.floor(milOnes));*/

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
        

        for(let i = 0; i < this.gunBanks.length; i++){

          let gun = this.gunBanks[i];
          //Update the gun timer
          if(gun.bullet.fire_timer > 0){
            gun.bullet.fire_timer -= 1 * delta;
            if(gun.bullet.fire_timer < 0){
              gun.bullet.fire_timer = 0;
            }
          }else{
            gun.bullet.fire_timer = 0;
          }

          if(gun.model)
            gun.model.update(delta);

        }

        let old_bullet_indexes = [];

        for(let i = 0; i < this.bullets.length; i++){
          let bullet = this.bullets[i];
          bullet.life += 1*delta;

          if(bullet.life >= bullet.lifespan){
            bullet.dispose();

            if(bullet.parent)
              bullet.parent.remove(bullet);

            old_bullet_indexes.push(i);

          }else{
            let velocity = new THREE.Vector3(0, bullet.speed * delta, 0);
            velocity.applyQuaternion(bullet.quaternion);
            bullet.position.add(
              velocity
            );
            bullet.update(delta);
            
            let enemies = Game.module.area.MiniGame.Enemies;

            for(let j = 0; j < enemies.length; j++){
              let enemy = enemies[j];
              if(enemy.box.containsPoint(bullet.position)){
                enemy.damage(bullet.damage);
                //Set the life to Infinity so it will be culled on the next pass
                bullet.life = Infinity;
                break;
              }
            }

          }

        }

        let old_bullets = old_bullet_indexes.length;
        while(old_bullets--){
          let bullet_index = old_bullet_indexes[old_bullets];
          this.bullets.splice(bullet_index, 1);
        }

      break;
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

    if(this.scripts.onAccelerate instanceof NWScriptInstance){
      this.scripts.onAccelerate.run(this, 0, () => {

      });
    }

    if(this.scripts.onFire instanceof NWScriptInstance){
      this.scripts.onFire.run(this, 0, () => {

      });
    }

    if(this.gunBanks.length){
        
      for(let i = 0; i < this.gunBanks.length; i++){
        let gun = this.gunBanks[i];

        if(!gun.bullet.fire_timer){
          gun.bullet.fire_timer = gun.bullet.rate_of_fire;

          if(gun.fire_sound){
            Game.audioEmitter.PlaySound(gun.fire_sound);
          }
          if(gun.model instanceof THREE.AuroraModel){
            gun.model.playAnimation('fire', false);
          }

          if(gun.bullet.model){

            THREE.AuroraModel.FromMDL(gun.bullet.model, {
              onComplete: (bullet_model) => {
                
                bullet_model.life = 0;
                bullet_model.lifespan = gun.bullet.lifespan;
                bullet_model.damage = gun.bullet.damage;
                bullet_model.speed = gun.bullet.speed;

                //TSL speed needs to be increased
                if(bullet_model.speed < 1){
                  bullet_model.speed *= 1000;
                }
                
                let bullet_hook = gun.model.getObjectByName('bullethook0');
                let position = bullet_hook.getWorldPosition();
                let quaternion = bullet_hook.getWorldQuaternion();

                bullet_model.direction = bullet_hook.getWorldDirection();
                bullet_model.position.copy(position);
                bullet_model.quaternion.copy(quaternion);

                Game.group.placeables.add(bullet_model);
                this.bullets.push(bullet_model);

              }
            });

          }


        }

      }

    }
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
    //console.log('anim', name);
    //I think n3 may be loop
    //console.log('PlayAnimation', name, n1, n2, n3);
    for(let i = 0; i < this.models.length; i++){
      let model = this.models[i];
      let anim = model.getAnimationByName(name);
      if(anim){
        if(n3){
          if(model.mgAnims.indexOf(anim) == -1){
            model.mgAnims.push(anim);
          }
        }else{
          model.poseAnimation(anim);
        }
      }

    }

  }

  RemoveAnimation(name = ''){

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

    this.getCurrentRoom();

    //START Gravity

    Game.raycaster.far = 20;
    let meshesSearch, intersects = [];

    let scratchVec3 = new THREE.Vector3(0, 0, .25);
    let playerFeetRay = new THREE.Vector3().copy( this.track.position.clone().add( ( scratchVec3 ) ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    Game.raycaster.ray.direction.set(0, 0,-1);

    //if(!this.jumpVelcolity){
      meshesSearch = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
      intersects = Game.raycaster.intersectOctreeObjects( meshesSearch );
      //let intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
      if ( intersects.length > 0) {
        if(intersects[ 0 ].distance < 6) { 
          this.track.position.z = intersects[ 0 ].point.z + 5.75;
          this.surfaceId = intersects[0].face.walkIndex;
          this.falling = false;
        }else{
          this.falling = true;
        }
      }

      if(this.falling){
        //console.log('Falling');
        //this.track.position.z -= 20*delta;
      }
    /*}else{
      this.falling = true;
    }*/

    //START: PLAYER WORLD COLLISION
    scratchVec3.set(0, 0, 0.25);
    playerFeetRay = new THREE.Vector3().copy( this.track.position.clone().add( ( scratchVec3 ) ) );

    for(let i = 0; i < 360; i += 30) {
      Game.raycaster.ray.direction.set(Math.cos(i), Math.sin(i),-1);
      Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);

      meshesSearch = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
      intersects = Game.raycaster.intersectOctreeObjects( meshesSearch );

      //intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
      if ( intersects.length > 0 ) {
        if(intersects[ 0 ].distance < 5){
          if(intersects[0].face.walkIndex == 7 || intersects[0].face.walkIndex == 2){
            //let pDistance = 0.5 - intersects[ 0 ].distance;
            let pDistance = (5 - intersects[ 0 ].distance) * 0.1;
            scratchVec3.set(pDistance * Math.cos(i), pDistance * Math.sin(i), 0)
            this.track.position.sub( scratchVec3 );
          }
        }
      }
    }

    //END: PLAYER WORLD COLLISION

    //END Gravity
    this.invalidateCollision = false;
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

                  if(model.name == this.camera.name)
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
    //.model.children[1].getObjectByName('gunbank0').add(model)
    let loop = new AsyncLoop({
      array: this.gunBanks,
      onLoop: (gunbank, asyncLoop) => {
        Game.ModelLoader.load({
          file: gunbank.model_name.replace(/\0[\s\S]*$/g,'').toLowerCase(),
          onLoad: (mdl) => {
            THREE.AuroraModel.FromMDL(mdl, {
              onComplete: (model) => {
                try{
                  gunbank.model = model;
                  let gun_hook = this.model.getObjectByName('gunbank'+gunbank.id);
                  if(gun_hook instanceof THREE.Object3D){
                    gun_hook.add(model);
                  }

                  if(gunbank.bullet.model_name){
                    Game.ModelLoader.load({
                      file: gunbank.bullet.model_name.replace(/\0[\s\S]*$/g,'').toLowerCase(),
                      onLoad: (bullet_mdl) => {
                        gunbank.bullet.model = bullet_mdl;
                        asyncLoop.next();
                        /*THREE.AuroraModel.FromMDL(bullet_mdl, {
                          onComplete: (bullet_model) => {
                            
                            asyncLoop.next();
                          }
                        });*/
                      }
                    });
                  }else{
                    asyncLoop.next();
                  }


                  
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
        onLoad();
    });
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
      this.track = this.template.GetFieldByLabel('Track').GetValue();

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
      let gun_banks = this.template.GetFieldByLabel('Gun_Banks').GetChildStructs();
      for(let i = 0; i < gun_banks.length; i++){
        let gunStruct = gun_banks[i];
        let bulletStruct = gunStruct.GetFieldByLabel('Bullet').GetChildStructs()[0];
        let gbObject = {
          id: gunStruct.GetFieldByLabel('BankID').GetValue(),
          fire_sound: gunStruct.GetFieldByLabel('Fire_Sound').GetValue(),
          model_name: gunStruct.GetFieldByLabel('Gun_Model').GetValue(),
          model: null,
          bullet: {
            model_name: '',
            collision_sound: '',
            damage: 0,
            lifespan: 0,
            rate_of_fire: 0,
            fire_timer: 0,
            speed: 0,
            target_type: 0
          }
        };

        if(bulletStruct){
          gbObject.bullet.model_name = bulletStruct.GetFieldByLabel('Bullet_Model').GetValue();
          gbObject.bullet.collision_sound = bulletStruct.GetFieldByLabel('Collision_Sound').GetValue();
          gbObject.bullet.damage = bulletStruct.GetFieldByLabel('Damage').GetValue();
          gbObject.bullet.lifespan = bulletStruct.GetFieldByLabel('Lifespan').GetValue();
          gbObject.bullet.rate_of_fire = bulletStruct.GetFieldByLabel('Rate_Of_Fire').GetValue();
          gbObject.bullet.speed = bulletStruct.GetFieldByLabel('Speed').GetValue();
          gbObject.bullet.target_type = bulletStruct.GetFieldByLabel('Target_Type').GetValue();
        }

        this.gunBanks.push(gbObject);
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