/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModulMGEnemy class.
 */

class ModuleMGEnemy extends ModuleObject {

  constructor(template = null){
    super();
    console.log('ModuleMGEnemy', template, this);
    this.template = template;

    this.gunBanks = [];
    this.models = [];
    this.model = new THREE.Object3D();
    this.track = new THREE.Object3D();

    this.setTrack(this.track);

    this.gear = -1;
    this.timer = 0;
    this.jumpVelcolity = 0;
    this.boostVelocity = 0;

    this.box = new THREE.Box3();

    this.alive = true;

    //this.model.children[2].rotation.y = .1

  }

  setTrack(model = new THREE.Object3D()){
    this.track = model;
    this.position = model.position;
    this.rotation = model.rotation;
    this.quaternion = model.quaternion;
    if(this.model.parent)
      this.model.parent.remove(this.model);

    try{
      this.track.getObjectByName('modelhook').add(this.model);
    }catch(e){

    }

  }

  update(delta){

    for(let i = 0; i < this.model.children.length; i++){
      let child_model = this.model.children[i];
      if(child_model instanceof THREE.AuroraModel && child_model.bonesInitialized && child_model.visible){

        if(this.hit_points > 0){
          if(!child_model.animationManager.currentAnimation || (child_model.animationManager.currentAnimation.name != 'Ready_01' && child_model.animationManager.currentAnimation.name != 'damage')){
            child_model.playAnimation('Ready_01', false);
          }
        }else if(this.alive){
          child_model.playAnimation('die', false);
        }else{
          if(!child_model.animationManager.currentAnimation){
            child_model.visible = false;
          }
        }

        child_model.update(delta);
      }
    }

    if(this.hit_points <= 0 && this.alive){
      this.alive = false;
      console.log('MGEnemy death', this);
      if(this.scripts.onDeath instanceof NWScriptInstance){
        this.scripts.onDeath.run(this);
      }
    }

    this.box.setFromObject(this.model.children[0]);

    if(this.track instanceof THREE.AuroraModel){
      if(!this.track.animationManager.currentAnimation && this.alive){
        this.track.playAnimation(0, true);
      }else if(!this.alive && this.track.animationManager.currentAnimation){
        this.track.stopAnimation();
      }
      this.track.update(delta);
    }

    switch(Game.module.area.MiniGame.Type){
      case 1:

      break;
      case 2:

      break;
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
    }
  }

  PlayAnimation(name = '', n1 = 0, n2 = 0, n3 = 0){
    //console.log('anim', name);
    //I think n3 may be loop
    //console.log('PlayAnimation', name, n1, n2, n3);
    for(let i = 0; i < this.model.children.length; i++){
      let model = this.model.children[i];
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

    for(let i = 0; i < this.model.children.length; i++){
      let model = this.model.children[i];
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
    let falling = true;

    let scratchVec3 = new THREE.Vector3(0, 0, .25);

    let playerFeetRay = new THREE.Vector3().copy( this.track.position.clone().add( ( scratchVec3 ) ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);

    Game.raycaster.ray.direction.set(0, 0,-1);

    let meshesSearch = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
    let intersects = Game.raycaster.intersectOctreeObjects( meshesSearch );
    //let intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
    if ( intersects.length > 0 ) {
      if(intersects[ 0 ].distance < 6) {
        //let faceIdx = intersects[0].faceIndex;
        //let walkableType = intersects[0].object.wok.walkTypes[faceIdx];
        //let pDistance = 0.5 - intersects[ 0 ].distance;
        this.track.position.z = intersects[ 0 ].point.z + 5.75;
        this.surfaceId = intersects[0].face.walkIndex;
        falling = false;
      }
    }

    if(falling){
      //console.log('Falling');
      this.track.position.z -= 20*delta;
    }

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

  LoadModel (onLoad = null){

    let loop = new AsyncLoop({
      array: this.models,
      onLoop: (item, asyncLoop) => {
        Game.ModelLoader.load({
          file: item.model.replace(/\0[\s\S]*$/g,'').toLowerCase(),
          onLoad: (mdl) => {
            THREE.AuroraModel.FromMDL(mdl, {
              onComplete: (model) => {
                try{
                  this.model.add(model);  
                  model.name = item.model;

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
      onLoop: (item, asyncLoop) => {
        Game.ModelLoader.load({
          file: item.model.replace(/\0[\s\S]*$/g,'').toLowerCase(),
          onLoad: (mdl) => {
            THREE.AuroraModel.FromMDL(mdl, {
              onComplete: (model) => {
                try{
                  this.model.getObjectByName('gunbank'+item.id).add(model) 
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
      this.maximum_speed = this.template.GetFieldByLabel('Maximum_Speed').GetValue();

    if(this.template.RootNode.HasField('Minimum_Speed'))
      this.minimum_speed = this.template.GetFieldByLabel('Minimum_Speed').GetValue();

    if(this.template.RootNode.HasField('Num_Loops'))
      this.num_loops = this.template.GetFieldByLabel('Num_Loops').GetValue();

    if(this.template.RootNode.HasField('Sphere_Radius'))
      this.sphere_radius = this.template.GetFieldByLabel('Sphere_Radius').GetValue();

    if(this.template.RootNode.HasField('Track'))
      this.track = this.template.GetFieldByLabel('Track').GetValue();


    if(this.template.RootNode.HasField('Models')){
      let models = this.template.GetFieldByLabel('Models').GetChildStructs();
      for(let i = 0; i < models.length; i++){
        let modelStruct = models[i];
        this.models.push({
          model: modelStruct.GetFieldByLabel('Model').GetValue(),
          isRotating: modelStruct.GetFieldByLabel('RotatingModel').GetValue() ? true : false
        });
      }
    }

    if(this.template.RootNode.HasField('Gun_Banks')){
      let gun_banks = this.template.GetFieldByLabel('Gun_Banks').GetChildStructs();
      for(let i = 0; i < gun_banks.length; i++){
        let gunStruct = gun_banks[i];
        this.gunBanks.push({
          id: gunStruct.GetFieldByLabel('BankID').GetValue(),
          fire_sound: gunStruct.GetFieldByLabel('Fire_Sound').GetValue(),
          model: gunStruct.GetFieldByLabel('Gun_Model').GetValue()
        });
      }
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

    this.initialized = true;

  }


}

module.exports = ModuleMGEnemy;