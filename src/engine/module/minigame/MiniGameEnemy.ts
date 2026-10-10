import { GameObject } from "@engine/module/GameObject";
import { GFFObject } from "@core/resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { GameState } from "@engine/runtime/GameState";
import { getDefaultRuntimeContext } from "@engine/runtime/context";
import { OdysseyModel, OdysseyModelAnimationManager } from "@engine/odyssey";
import { NWScript } from "@engine/nwscript/NWScript";
import { IModelListItem } from "@core/interface/module/minigame/IModelListItem";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { MDLLoader } from "@engine/loaders";
import { MiniGameGunBank } from "@engine/module/minigame/MiniGameGunBank";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { MGTrackFollowerSounds } from "@engine/module/minigame/MGTrackFollowerSounds";
import { MGTrackFollowerAudio } from "@engine/module/minigame/MGTrackFollowerAudio";
import { MiniGameObjectArray } from "@engine/module/minigame/MiniGameObjectArray";
import { MiniGameTrack } from "@engine/module/minigame/MiniGameTrack";
import { miniGameEnemySerializer } from "@engine/module/serialization/MiniGameEnemySerializer";

/**
* MiniGameEnemy class.
*
* Class representing an enemy object found in minigame modules.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file MiniGameEnemy.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class MiniGameEnemy extends GameObject {
  /** ctor — default track playback speed. */
  static readonly DEFAULT_TRACK_SPEED = 100;

  gunBanks: MiniGameGunBank[] = [];
  models: OdysseyModel3D[] = [];
  track: THREE.Object3D;
  /** Sounds + SWMG sound properties. */
  trackFollowerSounds: MGTrackFollowerSounds = new MGTrackFollowerSounds();
  /** Engine loop + death oneshot (Go / Stop / OnDeath). */
  trackFollowerAudio: MGTrackFollowerAudio = new MGTrackFollowerAudio(this.trackFollowerSounds, false);
  animationManagers: OdysseyModelAnimationManager[] = [];
  gun_hook: THREE.Object3D;

  modelProps: IModelListItem[] = [];

  gear: number;
  timer: number;
  jumpVelcolity: number;
  boostVelocity: number;
  invince: number;
  alive: boolean;
  /** Trigger byte @ — SWMG_IsTrigger / IsObstacle fallthrough. */
  isTrigger: boolean = false;
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
  /** Swoop accel ceiling when present in ARE; not the track playback speed. */
  maximum_speed: number = 0;
  minimum_speed: number = 0;
  num_loops: any;
  /** bit0 — Go sets, Stop clears. */
  running: boolean = false;
  /** True when track model was created for this follower. */
  ownsTrack: boolean = false;
  /**
   * ForceSetTrack 3rd arg — AddEnemy always passes 0.
   */
  trackAttachType: number = 0;
  /**
   * ctor — speed = 100.
   * Go / SetSpeed play "track" at speed * 0.01.
   */
  speed: number = 100;
  /** PlayAnimation("track", speed * 0.01). */
  trackAnimRate: number = 0;
  trackName: any;
  /**
   * OnAnimKeyEvent — playEvent on track + models.
   */
  private animPlayEventHandler = (e: { event?: string; target?: { name?: string } }) => {
    this.handleAnimPlayEvent(e);
  };
  private animPlayEventTargets: Array<{ target: THREE.Object3D; handler: typeof this.animPlayEventHandler }> = [];

  collided: boolean = false;
  /** Last HP delta for SWMG_GetLastHPChange / OnDamage. */
  lastHPChange: number = 0;
  /** World pose for sphere / audio — container.position is local under modelhook. */
  private static _worldPos = new THREE.Vector3();

  constructor(template: GFFObject){
    super();
    this.objectType |= GameObjectType.MiniGameEnemy;
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

    //this.model.children[2].rotation.y =.1

    const geometry = new THREE.SphereGeometry( 1, 16, 16 );
    const material = new THREE.MeshBasicMaterial( { color: 0xFF0000 } );
    material.transparent = true;
    material.opacity = 0.15;
    this.sphere_geom = new THREE.Mesh( geometry, material );
    this.sphere_geom.visible = false;

    // →.
    MiniGameObjectArray.register(this);
  }

  setTrack(model: THREE.Object3D = new THREE.Object3D(), ownsTrack: boolean = false, attachType: number = 0){
    if(this.track && this.track !== model){
      this.unbindAnimPlayEvent(this.track);
      if(this.ownsTrack){
        this.track.parent?.remove(this.track);
        (this.track as OdysseyModel3D).dispose?.();
      }
    }

    this.ownsTrack = ownsTrack;
    this.trackAttachType = attachType;
    this.track = model;
    this.running = false;
    this.container.removeFromParent();

    try{
      const hook = this.track.getObjectByName('modelhook');
      if(hook){
        hook.add(this.container);
      }else{
        this.track.add(this.container);
        console.warn('MiniGameEnemy.setTrack: no modelhook on', this.trackName);
      }
    }catch(e){
      console.error(e);
    }
    this.bindAnimPlayEvent(this.track);
  }

  setFollowerSpeed(speed: number){
    this.speed = speed;
    this.trackAnimRate = Math.max(0, speed) * 0.01;
    if(this.running && this.track instanceof OdysseyModel3D){
      this.ensureTrackAnimation();
    }
  }

  ensureTrackAnimation(){
    if(!(this.track instanceof OdysseyModel3D)){ return; }
    const want =
      this.track.odysseyAnimationMap?.get?.('track') ||
      this.track.odysseyAnimations?.[0];
    if(!want){ return; }
    const cur = this.track.animationManager?.currentAnimation;
    if(!cur || cur !== want){
      this.track.playAnimation(want, true);
    }
  }

  /**
   * Sphere + engine audio need world coords. Do not write container.position
   * (local under modelhook) — that would break attach pose.
   */
  syncWorldSphereAndAudio(){
    this.container.updateMatrixWorld?.(true);
    this.container.getWorldPosition(MiniGameEnemy._worldPos);
    this.sphere.center.copy(MiniGameEnemy._worldPos);
    if(this.sphere_geom){
      this.sphere_geom.position.copy(MiniGameEnemy._worldPos);
    }
    this.trackFollowerAudio.updatePosition(
      MiniGameEnemy._worldPos.x,
      MiniGameEnemy._worldPos.y,
      MiniGameEnemy._worldPos.z
    );
  }

  update(delta: number = 0){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

    this.sphere.radius = this.sphere_radius;
    this.syncWorldSphereAndAudio();
    this.sphere_geom.scale.setScalar(this.sphere_radius);

    for(let i = 0; i < this.animationManagers.length; i++){
      const aManager = this.animationManagers[i];
      aManager.updateAnimation(aManager.currentAnimation, aManager.currentAnimationState, delta);
    }

    for(let i = 0; i < this.models.length; i++){
      let child_model = this.models[i];
      if(child_model instanceof OdysseyModel3D && child_model.bonesInitialized && child_model.visible){

        if(this.alive && this.hit_points > 0){
          if(!child_model.animationManager.currentAnimation || (child_model.animationManager.currentAnimation.name != 'Ready_01' && child_model.animationManager.currentAnimation.name != 'damage')){
            child_model.playAnimation('Ready_01', false);
          }
        }

        child_model.update(delta);
      }
    }

    // TrackFollowerPartDie / donedie — purge model when non-looping die ends.
    if(!this.alive && this.died){
      for(let i = this.models.length - 1; i >= 0; i--){
        const child_model = this.models[i];
        if(!(child_model instanceof OdysseyModel3D)){
          this.removeModelAt(i);
          continue;
        }
        const cur = child_model.animationManager?.currentAnimation;
        if(!cur || cur.name?.toLowerCase?.() !== 'die'){
          this.removeModelAt(i);
        }
      }
    }

    if(this.hit_points <= 0 && this.alive){
      this.die();
    }

    if(this.models[0]){
      this.box.setFromObject(this.models[0]);
    }

    if(this.track instanceof OdysseyModel3D){
      if(this.alive && this.running){
        this.ensureTrackAnimation();
        // SetSpeed/Go: rate = speed*0.01 — never fall back to 1 when speed is 0.
        const rate = this.trackAnimRate;
        this.track.update(delta * rate);
      }else if(!this.alive && this.track.animationManager?.currentAnimation){
        this.track.stopAnimation();
      }else if(this.alive && !this.running){
        // Not started yet — still tick idle track pose.
        this.track.update(delta);
      }
    }
        
    for(let i = 0; i < this.gunBanks.length; i++){
      const bank = this.gunBanks[i];
      bank.update(delta);
      if(!this.alive){ continue; }
      const player = getDefaultRuntimeContext().getModule()?.area?.miniGame?.player;
      if(!player?.alive){ continue; }

      // TargettingGunBank: Sensing_Radius gates auto-fire; else forward ray LOS.
      if(bank.isTargetting()){
        if(bank.isPlayerInSensingRange(player)){
          bank.fire();
        }
      }else{
        this.container.getWorldPosition(GameState.raycaster.ray.origin);
        this.container.getWorldDirection(GameState.raycaster.ray.direction);
        if(GameState.raycaster.ray.intersectsSphere(player.sphere)){
          bank.fire();
        }
      }
    }

    // Update — OnHeartbeat every frame.
    if(GameState.module){
      this.triggerHeartbeat();
    }
  }

  updatePaused(delta: number = 0){
    
  }

  damage(damage = 0){
    if(this.alive){
      this.adjustHitPoints(-damage, 0);
    }
  }

  /**
   * AdjustHitPoints — queue hp_adjust then OnDamage(0).
   * SetFollowerHitPoints → SetHitPoints (nAbsolute; only if nHP > 0).
   */
  adjustHitPoints(nHP = 0, nAbsolute = 0){
    if(nAbsolute){
      if(nHP > 0){
        this.hit_points = nHP;
      }
      return;
    }
    this.lastHPChange = nHP;
    this.onDamaged(false);
  }

  /**
   * OnDamage default apply path.
   */
  applyQueuedHitPoints(){
    const adjust = this.lastHPChange;
    let hp = this.hit_points + adjust;
    this.hit_points = hp;
    if(adjust < 0){
      if(hp > 0){
        this.playAnimation('damage', 0, 0, 0);
        this.playAnimation('Ready_01', 0, 0, 1);
      }else if(this.alive){
        this.die(false);
      }
    }else if(this.max_hps > 0 && hp > this.max_hps){
      this.hit_points = this.max_hps;
    }
  }

  startInvulnerability(){
    this.invince = this.invince_period || 0;
  }

  playAnimation(name = '', n1 = 0, n2 = 0, n3 = 0){
    //I think n3 may be loop
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      const anim = model.odysseyAnimationMap.get(name.toLowerCase().trim());
      if(anim){
        if(n3){
          console.log(anim);
          const animManager = new OdysseyModelAnimationManager(model);
          const state = animManager.createAnimationState();
          state.loop = true;
          animManager.setCurrentAnimation(anim, state);
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
        let anim = model.odysseyAnimationMap.get(name.toLowerCase().trim());

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

  async load(){
    this.initProperties();
    this.loadScripts();
    GameState.scene.add(this.sphere_geom);
    void this.trackFollowerAudio.load();
    return this.template;
  }

  async loadModel (){
    for(let i = 0; i < this.modelProps.length; i++){
      const item = this.modelProps[i];
      const resref = item.model.replace(/\0[\s\S]*$/g,'').toLowerCase();
      const mdl = await MDLLoader.loader.load(resref);
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: true,
        receiveShadow: true
      });
      try{
        this.models.push(model);
        this.container.add(model);  
        model.name = item.model;
        this.bindAnimPlayEvent(model);
      }catch(e){
        console.error(e);
      }
    }
  }

  async loadGunBanks(){
    for(let i = 0; i < this.gunBanks.length; i++){
      const gunbank = this.gunBanks[i];
      await gunbank.load();
      let added = 0;
      for(let m = 0; m < this.models.length; m++){
        added += await gunbank.attachGuns(this.models[m]);
      }
      if(!added){
        added += await gunbank.attachGuns(this.container);
      }
      this.gun_hook = gunbank.gunHooks[0] || this.getGunHook(gunbank.bankID);
    }
  }

  getGunHook(bankID: number): THREE.Object3D | undefined {
    const points = MiniGameGunBank.findGunAttachPoints(this.container, bankID);
    if(points.length){ return points[0]; }
    return this.container.getObjectByName('gunbank'+bankID) as THREE.Object3D;
  }

  /**
   * OnAnimKeyEvent stand-in via OdysseyModel3D playEvent.
   */
  handleAnimPlayEvent(e: { event?: string; target?: { name?: string } }){
    const raw = String(e?.event ?? '');
    if(!raw){ return; }
    const lower = raw.toLowerCase();
    const modelName = e?.target?.name || this.models?.[0]?.name || this.name || '';
    const mg = getDefaultRuntimeContext().getModule()?.area?.miniGame;

    if(lower.startsWith('custom_')){
      mg?.recordAnimEvent?.(raw.substring(7), modelName);
      this.onAnimEvent();
      return;
    }
    if(lower === 'loop'){
      if(typeof this.num_loops === 'number' && this.num_loops !== -1){
        this.num_loops = this.num_loops - 1;
        this.setFollowerSpeed(this.speed);
      }
      this.onTrackLoop();
    }
  }

  bindAnimPlayEvent(target: THREE.Object3D | undefined | null){
    if(!target || typeof (target as any).addEventListener !== 'function'){ return; }
    for(let i = 0; i < this.animPlayEventTargets.length; i++){
      if(this.animPlayEventTargets[i].target === target){ return; }
    }
    (target as any).addEventListener('playEvent', this.animPlayEventHandler);
    this.animPlayEventTargets.push({ target, handler: this.animPlayEventHandler });
  }

  unbindAnimPlayEvent(target: THREE.Object3D | undefined | null){
    if(!target){ return; }
    for(let i = this.animPlayEventTargets.length - 1; i >= 0; i--){
      const entry = this.animPlayEventTargets[i];
      if(entry.target !== target){ continue; }
      (entry.target as any).removeEventListener?.('playEvent', entry.handler);
      this.animPlayEventTargets.splice(i, 1);
    }
  }

  unbindAnimPlayEvents(){
    for(let i = 0; i < this.animPlayEventTargets.length; i++){
      const { target, handler } = this.animPlayEventTargets[i];
      (target as any).removeEventListener?.('playEvent', handler);
    }
    this.animPlayEventTargets.length = 0;
  }

  onAnimEvent(){
    const onAnimEvent = this.scripts[ScriptHook.MGEnemyOnAnimEvent];
    if(!onAnimEvent){ return; }
    onAnimEvent.run(this, 0);
  }

  onCreate(){
    this.spawned = true;
    const onCreate = this.scripts[ScriptHook.MGEnemyOnCreate];
    if(!onCreate){ return; }
    onCreate.run(this, 0);
  }

  override triggerHeartbeat(){
    if(!this.canProcessHeartbeat()){ return; }
    const onHeartbeat = this.scripts[ScriptHook.MGEnemyOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  /** Go. */
  go(){
    if(this.running || !this.alive){ return; }

    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(model instanceof OdysseyModel3D && model.bonesInitialized){
        model.playAnimation('Ready_01', false);
      }
    }

    this.setFollowerSpeed(this.speed);
    this.ensureTrackAnimation();
    this.running = true;
    this.syncWorldSphereAndAudio();
    this.trackFollowerAudio.go(
      MiniGameEnemy._worldPos.x,
      MiniGameEnemy._worldPos.y,
      MiniGameEnemy._worldPos.z
    );
  }

  /**
   * OnDeath.
   * skipScript=true = DefaultImpl path (OnDeath(1)).
   */
  die(skipScript: boolean = false){
    if(!this.alive){ return; }

    if(!skipScript){
      const onDeath = this.scripts[ScriptHook.MGEnemyOnDeath];
      if(onDeath){
        onDeath.run(this, 0);
        return;
      }
    }

    this.alive = false;
    this.stopTrack();
    void this.trackFollowerAudio.playDeathSound();

    // Play die on each model; RemoveModel immediately if die missing.
    for(let i = this.models.length - 1; i >= 0; i--){
      const model = this.models[i];
      if(!(model instanceof OdysseyModel3D) || !model.bonesInitialized){
        this.removeModelAt(i);
        continue;
      }
      const dieAnim = model.odysseyAnimationMap?.get?.('die');
      if(!dieAnim){
        this.removeModelAt(i);
        continue;
      }
      model.playAnimation(dieAnim, false);
      this.died = true;
    }

    // OnDeath → each gun bank Die.
    for(let i = 0; i < this.gunBanks.length; i++){
      this.gunBanks[i]?.die?.();
    }

    const mg = getDefaultRuntimeContext().getModule()?.area?.miniGame;
    if(mg){
      mg.removeEnemy(this);
      if(this.models.length){
        mg.noteDyingEnemy(this);
      }else{
        this.disposeFollower();
      }
    }else if(!this.models.length){
      this.disposeFollower();
    }
  }

  /** RemoveModel. */
  removeModelAt(index: number){
    if(index < 0 || index >= this.models.length){ return; }
    const model = this.models[index];
    this.unbindAnimPlayEvent(model);
    model?.parent?.remove(model);
    model?.dispose?.();
    this.models.splice(index, 1);
  }

  /**
   * Stop
   * PlayAnimation("track", 0, flags) then clear running + engine Stop.
   */
  stopTrack(){
    if(this.track instanceof OdysseyModel3D && this.running){
      const want =
        this.track.odysseyAnimationMap?.get?.('track') ||
        this.track.odysseyAnimations?.[0];
      if(want){
        this.track.playAnimation(want, true);
      }
      this.trackAnimRate = 0;
    }
    this.running = false;
    this.trackFollowerAudio.stop();
  }

  disposeFollower(){
    this.stopTrack();
    if(this.track instanceof OdysseyModel3D){
      this.track.stopAnimation?.();
    }
    this.alive = false;
    this.unbindAnimPlayEvents();
    this.trackFollowerAudio.destroy?.();

    for(let i = 0; i < this.gunBanks.length; i++){
      const bank = this.gunBanks[i];
      while(bank.bullets?.length){
        const b = bank.bullets.pop();
        b?.disposeBullet?.();
      }
      bank.removeGunModel?.();
    }
    this.gunBanks.length = 0;

    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      model?.parent?.remove(model);
      model?.dispose?.();
    }
    this.models.length = 0;
    this.container?.removeFromParent?.();
    this.sphere_geom?.parent?.remove(this.sphere_geom);

    if(this.ownsTrack && this.track){
      this.track.parent?.remove(this.track);
      (this.track as OdysseyModel3D).dispose?.();
      this.ownsTrack = false;
    }
    this.track = new THREE.Object3D();
    MiniGameObjectArray.unregister(this);
  }

  /**
   * OnDamage
   * param 0: script if present; else / param 1: apply lastHPChange.
   */
  onDamaged(skipScript: boolean = false){
    if(!skipScript){
      const onDamage = this.scripts[ScriptHook.MGEnemyOnDamage];
      if(onDamage){
        onDamage.run(this, 0);
        return true;
      }
    }
    this.applyQueuedHitPoints();
    return true;
  }

  onFire(){
    const onFire = this.scripts[ScriptHook.MGEnemyOnFire];
    if(!onFire){ return; }
    onFire.run(this, 0);
  }

  onAccelerate(){
    const onAccelerate = this.scripts[ScriptHook.MGEnemyOnAccelerate];
    if(!onAccelerate){ return; }
    onAccelerate.run(this, 0);
  }

  onHitBullet(){
    const onHitBullet = this.scripts[ScriptHook.MGEnemyOnHitBullet];
    if(onHitBullet){
      onHitBullet.run(this, 0);
      return;
    }
  }

  onHitFollower(){
    const onHitFollower = this.scripts[ScriptHook.MGEnemyOnHitFollower];
    if(!onHitFollower){ return; }
    onHitFollower.run(this, 0);
  }

  /**
   * OnHitObstacle — script if set (param 0); else OnDeath(0).
   * skipScript=true = SWMG_OnObstacleHit DefaultImpl (param 1).
   */
  onHitObstacle(skipScript: boolean = false){
    if(!skipScript){
      const onHitObstacle = this.scripts[ScriptHook.MGEnemyOnHitObstacle];
      if(onHitObstacle){
        onHitObstacle.run(this, 0);
        return;
      }
    }
    if(this.alive){
      this.die(false);
    }
  }

  onTrackLoop(){
    const onTrackLoop = this.scripts[ScriptHook.MGEnemyOnTrackLoop];
    if(!onTrackLoop){ return; }
    onTrackLoop.run(this, 0);
  }

  static readonly SCRIPT_KEYS = [
    ScriptHook.MGEnemyOnAccelerate,
    ScriptHook.MGEnemyOnAnimEvent,
    ScriptHook.MGEnemyOnBrake,
    ScriptHook.MGEnemyOnCreate,
    ScriptHook.MGEnemyOnDamage,
    ScriptHook.MGEnemyOnDeath,
    ScriptHook.MGEnemyOnFire,
    ScriptHook.MGEnemyOnHeartbeat,
    ScriptHook.MGEnemyOnHitBullet,
    ScriptHook.MGEnemyOnHitFollower,
    ScriptHook.MGEnemyOnHitObstacle,
    ScriptHook.MGEnemyOnHitWorld,
    ScriptHook.MGEnemyOnTrackLoop,
  ];

  loadScripts (){
    this.bindScriptsFromResRefs(MiniGameEnemy.SCRIPT_KEYS, 'MiniGameEnemy.loadScripts');
  }

  initProperties(){
    miniGameEnemySerializer.deserialize(this, this.template);

    if(this.template.RootNode.hasField('Sounds')){
      this.trackFollowerSounds.loadFromSoundsStruct(
        this.template.getFieldByLabel('Sounds').getFieldStruct()
      );
    }

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
          new MiniGameGunBank(
            GFFObject.FromStruct(gun_banks[i]),
            this,
            false
          )
        );
      }
    }

    this.hydrateScriptResRefsFromStruct(
      this.template.getFieldByLabel('Scripts')?.getFieldStruct(),
      MiniGameEnemy.SCRIPT_KEYS
    );
    this.initialized = true;
  }


}
