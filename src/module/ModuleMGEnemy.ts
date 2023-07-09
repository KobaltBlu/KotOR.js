/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleMGGunBank, ModuleObject } from ".";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D } from "../three/odyssey";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GameState } from "../GameState";
import { OdysseyModel, OdysseyModelAnimationManager } from "../odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { NWScript } from "../nwscript/NWScript";
import { ModelListItem } from "../interface/module/minigame/ModelListItem";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";

/* @file
 * The ModulMGEnemy class.
 */

export class ModuleMGEnemy extends ModuleObject {
  gunBanks: ModuleMGGunBank[] = [];
  models: OdysseyModel3D[] = [];
  track: THREE.Object3D;
  animationManagers: OdysseyModelAnimationManager[] = [];
  gun_hook: THREE.Object3D;

  modelProps: ModelListItem[] = [];

  gear: number;
  timer: number;
  jumpVelcolity: number;
  boostVelocity: number;
  invince: number;
  alive: boolean;
  sphere_geom: THREE.Mesh;
  sphere_radius: number;
  hit_points: number;
  died: any;
  invince_period: number;
  accel_secs: any;
  bump_damage: any;
  cameraName: any;
  cameraRotate: any;
  max_hps: any;
  maximum_speed: any;
  minimum_speed: any;
  num_loops: any;
  trackName: any;

  collided: boolean = false;

  constructor(template: GFFObject){
    super();
    this.objectType |= ModuleObjectType.ModuleMGEnemy;
    this.template = template;

    this.gunBanks = [];
    this.track = new THREE.Object3D();

    this.setTrack(this.track);

    this.gear = -1;
    this.timer = 0;
    this.jumpVelcolity = 0;
    this.boostVelocity = 0;
    this.invince = 0;

    this.box = new THREE.Box3();
    this.model = this.container as any;

    this.alive = true;

    //this.model.children[2].rotation.y = .1

    const geometry = new THREE.SphereGeometry( 1, 16, 16 );
    const material = new THREE.MeshBasicMaterial( { color: 0xFF0000 } );
    material.transparent = true;
    material.opacity = 0.15;
    this.sphere_geom = new THREE.Mesh( geometry, material );
    this.sphere_geom.visible = false;

  }

  setTrack(model = new THREE.Object3D()){
    this.track = model;
    this.container.removeFromParent();

    try{
      this.track.getObjectByName('modelhook').add(this.container);
    }catch(e){

    }

  }

  update(delta: number = 0){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

    this.sphere.radius = this.sphere_radius;
    // this.model.getWorldPosition(this.position);
    this.sphere.center.copy(this.position);

    this.sphere_geom.scale.setScalar(this.sphere_radius);
    this.sphere_geom.position.copy(this.sphere.center);

    for(let i = 0; i < this.animationManagers.length; i++){
      const aManager = this.animationManagers[i];
      aManager.updateAnimation(aManager.currentAnimation, delta);
    }

    for(let i = 0; i < this.models.length; i++){
      let child_model = this.models[i];
      if(child_model instanceof OdysseyModel3D && child_model.bonesInitialized && child_model.visible){

        if(this.hit_points > 0){
          if(!child_model.animationManager.currentAnimation || (child_model.animationManager.currentAnimation.name != 'Ready_01' && child_model.animationManager.currentAnimation.name != 'damage')){
            child_model.playAnimation('Ready_01', false);
          }
        }else if(!this.alive && !this.died){
          child_model.playAnimation('die', false);
          this.died = true;
        }else{
          if(!child_model.animationManager.currentAnimation){
            //child_model.visible = false;
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

    this.box.setFromObject(this.models[0]);

    if(this.track instanceof OdysseyModel3D){
      if(!this.track.animationManager.currentAnimation && this.alive){
        this.track.playAnimation(0, true);
      }else if(!this.alive && this.track.animationManager.currentAnimation){
        this.track.stopAnimation();
      }
      this.track.update(delta);
    }
        
    for(let i = 0; i < this.gunBanks.length; i++){
      this.gunBanks[i].update(delta);
      if(this.alive){
        this.container.getWorldPosition(GameState.raycaster.ray.origin);
        this.container.getWorldDirection(GameState.raycaster.ray.direction);
        if(GameState.raycaster.ray.intersectsSphere(GameState.module.area.miniGame.player.sphere)){
          this.gunBanks[i].fire();
        }
      }
    }

  }

  updatePaused(delta: number = 0){
    
  }

  damage(damage = 0){
    if(this.alive){
      this.hit_points -= damage;
      let model: OdysseyModel3D
      for(let i = 0; i < this.models.length; i++){
        model = this.models[i];
        if(model instanceof OdysseyModel3D){
          if(model.bonesInitialized && model.visible){
            model.playAnimation('damage', false);
          }
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

  playAnimation(name = '', n1 = 0, n2 = 0, n3 = 0){
    //I think n3 may be loop
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      const anim = model.getAnimationByName(name);
      if(anim){
        if(n3){
          console.log(anim);
          const animManager = new OdysseyModelAnimationManager(model);
          animManager.setCurrentAnimation(anim, {
            loop: true,
            // blend: true,
            cFrame: 0,
            elapsed: 0,
            lastTime: 0,
            delta: 0,
            lastEvent: -1,
            events: [],
            callback: undefined
          });
          this.animationManagers.push(animManager);
        }else{
          model.playAnimation(anim, false);
        }
      }
    }
  }

  removeAnimation(name = ''){

    let model: OdysseyModel3D
    for(let i = 0; i < this.models.length; i++){
      model = this.models[i];
      if(model instanceof OdysseyModel3D){
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

  }

  updateCollision(delta = 0){
    this.track.updateMatrixWorld();
  }

  Load( onLoad?: Function ){
    this.initProperties();
    GameState.scene.add(this.sphere_geom);
    if(onLoad != null)
      onLoad(this.template);
  }

  LoadModel (onLoad?: Function){

    let loop = new AsyncLoop({
      array: this.modelProps,
      onLoop: (item: ModelListItem, asyncLoop: AsyncLoop) => {
        const resref = item.model.replace(/\0[\s\S]*$/g,'').toLowerCase();
        GameState.ModelLoader.load(resref).then((mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            onComplete: (model: OdysseyModel3D) => {
              try{
                this.models.push(model);
                this.container.add(model);  
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
        });
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  LoadGunBanks(onLoad?: Function){
    let loop = new AsyncLoop({
      array: this.gunBanks,
      onLoop: (gunbank: any, asyncLoop: AsyncLoop) => {
        gunbank.Load().then( () => {
          this.gun_hook = this.container.getObjectByName('gunbank'+gunbank.bankID);
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
      this.scripts.onAnimEvent.run(this, 0);
    }
  }

  onCreate(){
    if(this.scripts.onCreate instanceof NWScriptInstance){
      this.scripts.onCreate.run(this, 0);
    }
  }

  onDamage(){
    if(this.scripts.onDamage instanceof NWScriptInstance){
      this.scripts.onDamage.run(this, 0);
    }
    return true;
  }

  onFire(){
    if(this.scripts.onFire instanceof NWScriptInstance){
      this.scripts.onFire.run(this, 0);
    }
  }

  onAccelerate(){
    if(this.scripts.onAccelerate instanceof NWScriptInstance){
      this.scripts.onAccelerate.run(this, 0);
    }
  }

  onHitBullet(){
    if(this.scripts.onHitBullet instanceof NWScriptInstance){
      this.scripts.onHitBullet.run(this, 0);
    }
  }

  onHitFollower(){
    if(this.scripts.onHitFollower instanceof NWScriptInstance){
      this.scripts.onHitFollower.run(this, 0);
    }
  }

  onHitObstacle(){
    if(this.scripts.onHitObstacle instanceof NWScriptInstance){
      this.scripts.onHitObstacle.run(this, 0);
    }
  }

  onTrackLoop(){
    if(this.scripts.onTrackLoop instanceof NWScriptInstance){
      this.scripts.onTrackLoop.run(this, 0);
    }
  }

  LoadScripts (){
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
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
      }
    }

  }

  initProperties(){
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
      this.trackName = this.template.GetFieldByLabel('Track').GetValue();


    if(this.template.RootNode.HasField('Models')){
      let models = this.template.GetFieldByLabel('Models').GetChildStructs();
      for(let i = 0; i < models.length; i++){
        let modelStruct = models[i];
        this.modelProps.push({
          model: modelStruct.GetFieldByLabel('Model').GetValue(),
          rotating: modelStruct.GetFieldByLabel('RotatingModel').GetValue() ? true : false
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
            false
          )
        );
      }
    }

    this.initialized = true;

  }


}
