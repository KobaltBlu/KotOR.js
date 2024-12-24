import { ModuleObject } from "./ModuleObject";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D } from "../three/odyssey";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GameState } from "../GameState";
import { OdysseyModel, OdysseyModelAnimationManager } from "../odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { NWScript } from "../nwscript/NWScript";
import { IModelListItem } from "../interface/module/minigame/IModelListItem";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { MDLLoader } from "../loaders";
import { ModuleMGGunBank } from "./ModuleMGGunBank";

/**
* ModuleMGEnemy class.
* 
* Class representing an enemy object found in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleMGEnemy.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGEnemy extends ModuleObject {
  gunBanks: ModuleMGGunBank[] = [];
  models: OdysseyModel3D[] = [];
  track: THREE.Object3D;
  animationManagers: OdysseyModelAnimationManager[] = [];
  gun_hook: THREE.Object3D;

  modelProps: IModelListItem[] = [];

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
      this.onDamaged();
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

  load( onLoad?: Function ){
    this.initProperties();
    GameState.scene.add(this.sphere_geom);
    if(onLoad != null)
      onLoad(this.template);
  }

  loadModel (onLoad?: Function){

    let loop = new AsyncLoop({
      array: this.modelProps,
      onLoop: (item: IModelListItem, asyncLoop: AsyncLoop) => {
        const resref = item.model.replace(/\0[\s\S]*$/g,'').toLowerCase();
        MDLLoader.loader.load(resref).then((mdl: OdysseyModel) => {
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

  loadGunBanks(onLoad?: Function){
    let loop = new AsyncLoop({
      array: this.gunBanks,
      onLoop: (gunbank: any, asyncLoop: AsyncLoop) => {
        gunbank.load().then( () => {
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

  onDamaged(){
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

  loadScripts (){
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

    let scriptsNode = this.template.getFieldByLabel('Scripts').getChildStructs()[0];
    if(scriptsNode){

      if(scriptsNode.hasField('OnAccelerate'))
        this.scripts.onAccelerate = scriptsNode.getFieldByLabel('OnAccelerate').getValue();
      
      if(scriptsNode.hasField('OnAnimEvent'))
        this.scripts.onAnimEvent = scriptsNode.getFieldByLabel('OnAnimEvent').getValue();

      if(scriptsNode.hasField('OnBrake'))
        this.scripts.onBrake = scriptsNode.getFieldByLabel('OnBrake').getValue();

      if(scriptsNode.hasField('OnCreate'))
        this.scripts.onCreate = scriptsNode.getFieldByLabel('OnCreate').getValue();

      if(scriptsNode.hasField('OnDamage'))
        this.scripts.onDamage = scriptsNode.getFieldByLabel('OnDamage').getValue();

      if(scriptsNode.hasField('OnDeath'))
        this.scripts.onDeath = scriptsNode.getFieldByLabel('OnDeath').getValue();

      if(scriptsNode.hasField('OnFire'))
        this.scripts.onFire = scriptsNode.getFieldByLabel('OnFire').getValue();

      if(scriptsNode.hasField('OnHeartbeat'))
        this.scripts.onHeartbeat = scriptsNode.getFieldByLabel('OnHeartbeat').getValue();
      
      if(scriptsNode.hasField('OnHitBullet'))
        this.scripts.onHitBullet = scriptsNode.getFieldByLabel('OnHitBullet').getValue();

      if(scriptsNode.hasField('OnHitFollower'))
        this.scripts.onHitFollower = scriptsNode.getFieldByLabel('OnHitFollower').getValue();

      if(scriptsNode.hasField('OnHitObstacle'))
        this.scripts.onHitObstacle = scriptsNode.getFieldByLabel('OnHitObstacle').getValue();

      if(scriptsNode.hasField('OnHitWorld'))
        this.scripts.onHitWorld = scriptsNode.getFieldByLabel('OnHitWorld').getValue();

      if(scriptsNode.hasField('OnTrackLoop'))
        this.scripts.onTrackLoop = scriptsNode.getFieldByLabel('OnTrackLoop').getValue();

    }
    
    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
        this.scripts[key].caller = this;
      }
    }

  }

  initProperties(){
    if(this.template.RootNode.hasField('Accel_Secs'))
      this.accel_secs = this.template.getFieldByLabel('Accel_Secs').getValue();

    if(this.template.RootNode.hasField('Bump_Damage'))
      this.bump_damage = this.template.getFieldByLabel('Bump_Damage').getValue();

    if(this.template.RootNode.hasField('Camera'))
      this.cameraName = this.template.getFieldByLabel('Camera').getValue();

    if(this.template.RootNode.hasField('CameraRotate'))
      this.cameraRotate = this.template.getFieldByLabel('CameraRotate').getValue();

    if(this.template.RootNode.hasField('Hit_Points'))
      this.hit_points = this.template.getFieldByLabel('Hit_Points').getValue();

    if(this.template.RootNode.hasField('Invince_Period'))
      this.invince_period = this.template.getFieldByLabel('Invince_Period').getValue();

    if(this.template.RootNode.hasField('Max_HPs'))
      this.max_hps = this.template.getFieldByLabel('Max_HPs').getValue();

    if(this.template.RootNode.hasField('Maximum_Speed'))
      this.maximum_speed = this.template.getFieldByLabel('Maximum_Speed').getValue();

    if(this.template.RootNode.hasField('Minimum_Speed'))
      this.minimum_speed = this.template.getFieldByLabel('Minimum_Speed').getValue();

    if(this.template.RootNode.hasField('Num_Loops'))
      this.num_loops = this.template.getFieldByLabel('Num_Loops').getValue();

    if(this.template.RootNode.hasField('Sphere_Radius'))
      this.sphere_radius = this.template.getFieldByLabel('Sphere_Radius').getValue();

    if(this.template.RootNode.hasField('Track'))
      this.trackName = this.template.getFieldByLabel('Track').getValue();


    if(this.template.RootNode.hasField('Models')){
      let models = this.template.getFieldByLabel('Models').getChildStructs();
      for(let i = 0; i < models.length; i++){
        let modelStruct = models[i];
        this.modelProps.push({
          model: modelStruct.getFieldByLabel('Model').getValue(),
          rotating: modelStruct.getFieldByLabel('RotatingModel').getValue() ? true : false
        });
      }
    }

    if(this.template.RootNode.hasField('Gun_Banks')){
      const gun_banks = this.template.getFieldByLabel('Gun_Banks').getChildStructs();
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
