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
    this.model = new THREE.Object3D();
    this.track = new THREE.Object3D();

    this.setTrack(this.track);

    this.gear = -1;
    this.timer = 0;
    this.jumpVelcolity = 0;
    this.boostVelocity = 0;
    this.falling = true;

    //this.model.children[2].rotation.y = .1

  }

  setTrack(model = new THREE.Object3D()){
    console.log('track', model);
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

        if(this.gear > -1){

          this.timer += 1 * delta;
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
          this.camera.poseAnimation('MilSecOne'+Math.floor(milOnes));

          /*
          float float1 = 35.0;
          float float2 = 60.0;
          float float3 = 100.0;
          float float4 = 150.0;
          float float5 = 210.0;
          */

          switch(this.gear){
            case 0:
              this.track.position.y += this.boostVelocity + 35.0 * delta;
            break;
            case 1:
              this.track.position.y += this.boostVelocity + 60.0 * delta;
            break;
            case 2:
              this.track.position.y += this.boostVelocity + 100.0 * delta;
            break;
            case 3: 
              this.track.position.y += this.boostVelocity + 150.0 * delta;
            break;
            case 4: 
              this.track.position.y += this.boostVelocity + 210.0 * delta;
            break;
          }

          
          this.track.position.z += this.jumpVelcolity;

        }


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
    }
    

  }

  Jump(){
    if(this.gear > -1 && !this.falling){
      this.jumpVelcolity = 0.4;
    }else{
      this.jumpVelcolity = 0;
    }
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
      //var intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
      if ( intersects.length > 0 && !this.jumpVelcolity ) {
        if(intersects[ 0 ].distance < 6) { 
          this.track.position.z = intersects[ 0 ].point.z + 5.75;
          this.surfaceId = intersects[0].face.walkIndex;
          this.falling = false;
        }else{
          this.falling = true;
        }
      }else if(!this.jumpVelcolity){
        this.falling = true;
      }

      if(this.falling){
        //console.log('Falling');
        this.track.position.z -= 20*delta;
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

                  if(model.name == this.camera.name)
                    model.visible = false;

                  asyncLoop._Loop();
                }catch(e){
                  console.error(e);
                  asyncLoop._Loop();
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
    loop.Begin(() => {
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
                  asyncLoop._Loop();
                }catch(e){
                  console.error(e);
                  asyncLoop._Loop();
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
    loop.Begin(() => {
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

    //console.log(this);

    if(this.template.RootNode.HasField('OnAccelerate'))
      this.scripts.onAccelerate = this.template.GetFieldByLabel('OnAccelerate').GetValue();
    
    if(this.template.RootNode.HasField('OnAnimEvent'))
      this.scripts.onAnimEvent = this.template.GetFieldByLabel('OnAnimEvent').GetValue();

    if(this.template.RootNode.HasField('OnBrake'))
      this.scripts.onBrake = this.template.GetFieldByLabel('OnBrake').GetValue();

    if(this.template.RootNode.HasField('OnCreate'))
      this.scripts.onCreate = this.template.GetFieldByLabel('OnCreate').GetValue();

    if(this.template.RootNode.HasField('OnDamage'))
      this.scripts.onDamage = this.template.GetFieldByLabel('OnDamage').GetValue();

    if(this.template.RootNode.HasField('OnDeath'))
      this.scripts.onDeath = this.template.GetFieldByLabel('OnDeath').GetValue();

    if(this.template.RootNode.HasField('OnFire'))
      this.scripts.onFire = this.template.GetFieldByLabel('OnFire').GetValue();

    if(this.template.RootNode.HasField('OnHeartbeat'))
      this.scripts.onHeartbeat = this.template.GetFieldByLabel('OnHeartbeat').GetValue();
    
    if(this.template.RootNode.HasField('OnHitBullet'))
      this.scripts.onHitBullet = this.template.GetFieldByLabel('OnHitBullet').GetValue();

    if(this.template.RootNode.HasField('OnHitFollower'))
      this.scripts.onHitFollower = this.template.GetFieldByLabel('OnHitFollower').GetValue();

    if(this.template.RootNode.HasField('OnHitObstacle'))
      this.scripts.onHitObstacle = this.template.GetFieldByLabel('OnHitObstacle').GetValue();

    if(this.template.RootNode.HasField('OnHitWorld'))
      this.scripts.onHitWorld = this.template.GetFieldByLabel('OnHitWorld').GetValue();

    if(this.template.RootNode.HasField('OnTrackLoop'))
      this.scripts.onTrackLoop = this.template.GetFieldByLabel('OnTrackLoop').GetValue();

    let keys = Object.keys(this.scripts);
    let len = keys.length;
    let loadScript = ( onLoad = null, i = 0 ) => {
      
      if(i < len){
        let script = this.scripts[keys[i]];
        if(script != '' && script != undefined){
          ResourceLoader.loadResource(ResourceTypes['ncs'], script, (buffer) => {
            if(buffer.length){
              this.scripts[keys[i]] = new NWScript(buffer);
              this.scripts[keys[i]].name = script;
            }
            loadScript( onLoad, ++i );
          }, () => {
            loadScript( onLoad, ++i );
          });
        }else{
          loadScript( onLoad, ++i );
        }
      }else{
        if(typeof onLoad === 'function')
          onLoad();
      }
  
    };

    loadScript(onLoad, 0);

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



  }


}

module.exports = ModuleMGPlayer;